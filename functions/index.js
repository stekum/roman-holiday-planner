/**
 * Cloud Function: persistPoiPhoto
 *
 * Triggered when a POI document is created or updated in Firestore.
 * If the POI has an image URL pointing to Google (not yet persisted
 * to Firebase Storage), downloads the image server-side (no CORS
 * restrictions on the server), uploads it to Firebase Storage, and
 * writes the permanent download URL back to the POI document.
 */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const fetch = require("node-fetch");

initializeApp();

const BUCKET = getStorage().bucket();
const db = getFirestore();

/**
 * Checks if a URL is a Google Places photo that needs persisting.
 */
function needsPersisting(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) return false;
  // Already persisted
  if (imageUrl.includes("firebasestorage.googleapis.com")) return false;
  if (imageUrl.includes("firebasestorage.app")) return false;
  // Placeholder
  if (imageUrl.includes("picsum.photos")) return false;
  // Google photo URLs that need persisting
  return (
    imageUrl.includes("googleapis.com") ||
    imageUrl.includes("googleusercontent.com") ||
    imageUrl.includes("ggpht.com")
  );
}

exports.persistPoiPhoto = onDocumentWritten(
  {
    document: "workspaces/{workspaceId}/pois/{poiId}",
    region: "europe-west1",
  },
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return; // Document deleted

    const imageUrl = after.image;
    if (!needsPersisting(imageUrl)) return;

    const { workspaceId, poiId } = event.params;
    const storagePath = `poi-photos/${workspaceId}/${poiId}.jpg`;

    console.log(`[persistPoiPhoto] Downloading photo for ${poiId}...`);

    try {
      // Download the image server-side (no CORS restrictions here!)
      const response = await fetch(imageUrl, {
        timeout: 15000,
        headers: {
          // Pretend to be a browser to avoid Google blocking
          "User-Agent":
            "Mozilla/5.0 (compatible; RHP-PhotoPersist/1.0)",
          Referer: "https://stekum.github.io/roman-holiday-planner/",
        },
      });

      if (!response.ok) {
        console.warn(`[persistPoiPhoto] HTTP ${response.status} for ${poiId}`);
        return;
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) {
        console.warn(`[persistPoiPhoto] Not an image (${contentType}) for ${poiId}`);
        return;
      }

      const buffer = await response.buffer();
      if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
        console.warn(`[persistPoiPhoto] Invalid size (${buffer.length} bytes) for ${poiId}`);
        return;
      }

      // Upload to Firebase Storage
      const file = BUCKET.file(storagePath);
      await file.save(buffer, {
        metadata: {
          contentType,
          cacheControl: "public, max-age=31536000",
        },
      });

      // Make the file publicly readable
      await file.makePublic();

      // Get the permanent public URL
      const permanentUrl = `https://storage.googleapis.com/${BUCKET.name}/${storagePath}`;

      // Update the POI document with the permanent URL
      const docRef = db.doc(`workspaces/${workspaceId}/pois/${poiId}`);
      await docRef.update({ image: permanentUrl });

      console.log(
        `[persistPoiPhoto] ✓ Persisted photo for ${poiId} (${(buffer.length / 1024).toFixed(0)} KB)`
      );
    } catch (err) {
      console.error(`[persistPoiPhoto] Failed for ${poiId}:`, err.message);
      // Don't throw — we don't want the function to retry on transient errors
      // The photo will still display from the Google URL until it expires
    }
  }
);
