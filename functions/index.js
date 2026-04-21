/**
 * Cloud Functions for Roman Holiday Planner:
 *  - persistPoiPhoto: persist Google Places photos to Firebase Storage
 *  - notifyAccessRequest (#133): email admin when a new user signs up
 *    with status='pending' and waits for approval.
 */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const fetch = require("node-fetch");

initializeApp();

// #133 params — set via Firebase console / CLI. API key is secret, from/to
// can be public (overridable per deploy).
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const NOTIFY_FROM_EMAIL = defineString("NOTIFY_FROM_EMAIL", {
  default: "onboarding@resend.dev",
});
const NOTIFY_TO_EMAIL = defineString("NOTIFY_TO_EMAIL", {
  default: "stefan.kummert@gmail.com",
});

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

/**
 * #133: notifyAccessRequest
 *
 * Fires when a new user document appears with status='pending' — either
 * freshly created via auth gate, or transitioned from another state.
 * Sends one email per transition to NOTIFY_TO_EMAIL via Resend API.
 *
 * Setup (one-time, Stefan):
 *   1. Create Resend account + API key → https://resend.com
 *   2. firebase functions:secrets:set RESEND_API_KEY
 *   3. (optional) firebase functions:config override NOTIFY_FROM_EMAIL
 *      and NOTIFY_TO_EMAIL via deploy-time env
 *
 * Graceful fallback: if RESEND_API_KEY is missing, logs a warning and
 * returns — never blocks user signup.
 */
exports.notifyAccessRequest = onDocumentWritten(
  {
    document: "users/{uid}",
    region: "europe-west1",
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return; // deleted — nothing to notify about

    const wasPendingBefore = before?.status === "pending";
    const isPendingNow = after.status === "pending";
    if (!isPendingNow || wasPendingBefore) return;

    const uid = event.params.uid;
    const email = after.email || "(unbekannt)";
    const displayName = after.displayName || "Unbekannt";

    const apiKey = RESEND_API_KEY.value();
    if (!apiKey) {
      console.warn(
        "[notifyAccessRequest] RESEND_API_KEY not set — skipping email for",
        uid
      );
      return;
    }

    const from = NOTIFY_FROM_EMAIL.value();
    const to = NOTIFY_TO_EMAIL.value();

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Roman Holiday Planner <${from}>`,
          to,
          subject: `Zugriffsanfrage: ${displayName}`,
          html: `
            <h2>Neue Zugriffsanfrage</h2>
            <p><strong>${displayName}</strong> (${email}) möchte Zugang zur App.</p>
            <p>UID: <code>${uid}</code></p>
            <p>Admin-UI öffnen und Zugriff freigeben:<br>
               <a href="https://stekum.github.io/roman-holiday-planner/">stekum.github.io/roman-holiday-planner/</a></p>
          `,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(
          `[notifyAccessRequest] Resend HTTP ${res.status} for ${uid}:`,
          body.slice(0, 300)
        );
        return;
      }
      console.log(`[notifyAccessRequest] ✓ email sent for ${uid}`);
    } catch (err) {
      console.error(`[notifyAccessRequest] failed for ${uid}:`, err.message);
    }
  }
);
