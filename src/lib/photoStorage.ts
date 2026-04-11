/**
 * Persists POI photos to Firebase Storage.
 *
 * Google Places photo URLs expire after hours. This module downloads
 * the photo and uploads it to Firebase Storage, returning a permanent
 * download URL that never expires.
 */

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { getFirebase } from '../firebase/firebase';

/**
 * Downloads an image from a URL (typically a Google Places photo URL),
 * uploads it to Firebase Storage under /poi-photos/{poiId}.jpg,
 * and returns the permanent download URL.
 *
 * Returns the original URL unchanged if:
 * - URL is empty/falsy
 * - URL is already a Firebase Storage URL
 * - Download or upload fails (graceful fallback)
 */
export async function persistPhoto(
  imageUrl: string,
  poiId: string,
): Promise<string> {
  // Skip if no URL
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
    // Download the image as a blob
    const response = await fetch(imageUrl, {
      mode: 'cors',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) return '';

    const blob = await response.blob();
    if (blob.size === 0 || blob.size > 5 * 1024 * 1024) return ''; // Skip empty or >5MB

    // Determine file extension from content type
    const contentType = blob.type || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png'
      : contentType.includes('webp') ? 'webp'
      : 'jpg';

    // Upload to Firebase Storage
    const { app } = getFirebase();
    const storage = getStorage(app);
    const storageRef = ref(storage, `poi-photos/${poiId}.${ext}`);

    await uploadBytes(storageRef, blob, {
      contentType,
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
    });

    // Get permanent download URL
    const permanentUrl = await getDownloadURL(storageRef);
    return permanentUrl;
  } catch (err) {
    console.warn(`[photoStorage] Failed to persist photo for ${poiId}:`, err);
    return ''; // Graceful fallback — will show gradient placeholder
  }
}

/**
 * Persists a photo and updates the POI's image field in Firestore.
 * Convenience wrapper for use after POI creation.
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
