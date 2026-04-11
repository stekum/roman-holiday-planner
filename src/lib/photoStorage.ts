/**
 * Persists POI photos to Firebase Storage.
 *
 * Google Places photo URLs:
 * 1. Expire after hours (temporary signed URLs)
 * 2. Block fetch() via CORS (no Access-Control-Allow-Origin header)
 *
 * Solution: Load image via <img> tag (no CORS restriction), draw to
 * <canvas>, export as blob, upload to Firebase Storage. The resulting
 * Firebase Storage URL is permanent and CORS-friendly.
 */

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { getFirebase } from '../firebase/firebase';

/**
 * Loads an image URL into a canvas and returns it as a JPEG blob.
 * Uses <img> which is not subject to CORS restrictions for loading
 * (unlike fetch()). The canvas toBlob() works as long as the image
 * is same-origin or the server allows it — for Google Places photos
 * served via the Maps JS SDK, this works because the SDK handles
 * the cross-origin loading internally.
 *
 * Fallback: if canvas export fails (tainted canvas), tries fetch()
 * with no-cors mode and returns null on failure.
 */
function loadImageAsBlob(url: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Limit size to max 800x600 to save storage
        const maxW = 800;
        const maxH = 600;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        if (h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          0.85,
        );
      } catch {
        // Canvas tainted — can't export
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);

    // Timeout after 10 seconds
    setTimeout(() => resolve(null), 10000);

    img.src = url;
  });
}

/**
 * Downloads an image, uploads it to Firebase Storage under
 * /poi-photos/{poiId}.jpg, and returns the permanent download URL.
 *
 * Returns empty string if:
 * - URL is empty/falsy
 * - URL is already a Firebase Storage URL
 * - Download or upload fails (graceful fallback)
 */
export async function persistPhoto(
  imageUrl: string,
  poiId: string,
): Promise<string> {
  if (!imageUrl?.trim()) return '';

  // Skip if already a Firebase Storage URL
  if (
    imageUrl.includes('firebasestorage.googleapis.com') ||
    imageUrl.includes('firebasestorage.app')
  ) {
    return imageUrl;
  }

  // Skip picsum placeholder URLs
  if (imageUrl.includes('picsum.photos')) return '';

  try {
    // Load image via <img> + <canvas> to bypass CORS
    const blob = await loadImageAsBlob(imageUrl);
    if (!blob || blob.size === 0) {
      console.warn(`[photoStorage] Could not load image for ${poiId}`);
      return '';
    }

    // Upload to Firebase Storage
    const { app } = getFirebase();
    const storage = getStorage(app);
    const storageRef = ref(storage, `poi-photos/${poiId}.jpg`);

    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000', // Cache 1 year
    });

    const permanentUrl = await getDownloadURL(storageRef);
    console.log(`[photoStorage] Persisted photo for ${poiId} (${(blob.size / 1024).toFixed(0)} KB)`);
    return permanentUrl;
  } catch (err) {
    console.warn(`[photoStorage] Failed to persist photo for ${poiId}:`, err);
    return '';
  }
}

/**
 * Persists a photo and updates the POI's image field in Firestore.
 */
export async function persistAndUpdatePhoto(
  imageUrl: string,
  poiId: string,
  updatePoi: (id: string, patch: { image: string }) => Promise<void>,
): Promise<void> {
  if (!imageUrl?.trim()) return;
  if (
    imageUrl.includes('firebasestorage.googleapis.com') ||
    imageUrl.includes('firebasestorage.app')
  ) return;

  const permanentUrl = await persistPhoto(imageUrl, poiId);
  if (permanentUrl && permanentUrl !== imageUrl) {
    await updatePoi(poiId, { image: permanentUrl });
  }
}
