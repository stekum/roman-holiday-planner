/**
 * Cloud Functions for Roman Holiday Planner:
 *  - persistPoiPhoto: persist Google Places photos to Firebase Storage
 *  - notifyAccessRequest (#133): email admin when a new user signs up
 *    with status='pending' and waits for approval.
 *  - syncWorkspaceMembers (#228): mirror workspaces.memberIds → users.workspaceIds
 *    so the trip-switcher UI knows which workspaces a user belongs to.
 */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
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

/**
 * #228: Mirror workspaces.memberIds onto users.{uid}.workspaceIds.
 *
 * Trigger fires on every workspace doc write. We diff before/after memberIds
 * and:
 *   - For each newly-added uid:    arrayUnion(workspaceId)  on users/{uid}
 *   - For each newly-removed uid:  arrayRemove(workspaceId) on users/{uid}
 *   - On workspace deletion:       arrayRemove from every previous member
 *
 * users.workspaceIds is the read-cache used by the trip-switcher UI. The
 * authoritative access check runs against workspaces.memberIds via Firestore
 * Rules — even if this mirror drifts, no user can access a workspace they
 * aren't a member of. The mirror is best-effort.
 *
 * Idempotent: arrayUnion/arrayRemove are no-ops when the value is already
 * (not) present. Safe to retry on transient failures.
 */
exports.syncWorkspaceMembers = onDocumentWritten(
  {
    document: "workspaces/{workspaceId}",
    region: "europe-west1",
  },
  async (event) => {
    const workspaceId = event.params.workspaceId;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    const beforeMembers = Array.isArray(before?.memberIds)
      ? before.memberIds
      : [];
    const afterMembers = Array.isArray(after?.memberIds)
      ? after.memberIds
      : [];

    const beforeSet = new Set(beforeMembers);
    const afterSet = new Set(afterMembers);

    const added = afterMembers.filter((uid) => !beforeSet.has(uid));
    const removed = beforeMembers.filter((uid) => !afterSet.has(uid));

    if (added.length === 0 && removed.length === 0) return;

    const ops = [
      ...added.map((uid) =>
        db
          .collection("users")
          .doc(uid)
          .set(
            { workspaceIds: FieldValue.arrayUnion(workspaceId) },
            { merge: true },
          ),
      ),
      ...removed.map((uid) =>
        db
          .collection("users")
          .doc(uid)
          .set(
            { workspaceIds: FieldValue.arrayRemove(workspaceId) },
            { merge: true },
          ),
      ),
    ];

    const results = await Promise.allSettled(ops);
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error(
        `[syncWorkspaceMembers] ${failed.length}/${results.length} mirror writes failed for workspace ${workspaceId}:`,
        failed.map((f) => f.reason?.message ?? String(f.reason)),
      );
    } else {
      console.log(
        `[syncWorkspaceMembers] ${workspaceId}: +${added.length} -${removed.length} mirrored`,
      );
    }
  },
);

/**
 * #228: Redeem a workspace invite token.
 *
 * Callable from the client. Atomically:
 *   1. Validates token exists, not used, not expired
 *   2. Adds caller's uid to workspaces/{wsId}.memberIds (arrayUnion)
 *   3. Marks invite as used + records redeemedBy/redeemedAt
 *
 * Caller's uid comes from request.auth (Firebase auth), not from any
 * client-supplied field — cannot be spoofed.
 *
 * Errors:
 *   - unauthenticated   : not signed in
 *   - failed-precondition: caller is not approved (status !== 'approved')
 *   - not-found         : token doesn't exist
 *   - already-exists    : token already used
 *   - deadline-exceeded : token expired
 *   - failed-precondition: workspace doesn't exist (data inconsistency)
 *
 * Returns: { workspaceId } on success, so the client can switch to it.
 */
exports.redeemInvite = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const token = request.data?.token;
    if (!token || typeof token !== "string") {
      throw new HttpsError("invalid-argument", "Token is required.");
    }

    // Verify caller is approved (mirrors the rules' isApproved/isAdmin check)
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists || userSnap.data()?.status !== "approved") {
      throw new HttpsError(
        "failed-precondition",
        "Your account is not yet approved.",
      );
    }

    const inviteRef = db.collection("invites").doc(token);

    // Transaction: read invite, validate, add member, mark used.
    const result = await db.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteRef);
      if (!inviteSnap.exists) {
        throw new HttpsError("not-found", "Invite not found.");
      }
      const invite = inviteSnap.data();

      if (invite.used) {
        throw new HttpsError("already-exists", "Invite already used.");
      }

      const expiresMs = invite.expiresAt?.toMillis?.() ?? 0;
      if (Date.now() > expiresMs) {
        throw new HttpsError("deadline-exceeded", "Invite has expired.");
      }

      const workspaceId = invite.workspaceId;
      const workspaceRef = db.collection("workspaces").doc(workspaceId);
      const workspaceSnap = await tx.get(workspaceRef);
      if (!workspaceSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          "Workspace no longer exists.",
        );
      }

      tx.update(workspaceRef, {
        memberIds: FieldValue.arrayUnion(uid),
      });
      tx.update(inviteRef, {
        used: true,
        redeemedBy: uid,
        redeemedAt: Timestamp.now(),
      });

      return { workspaceId };
    });

    console.log(`[redeemInvite] ${uid} joined ${result.workspaceId} via ${token}`);
    return result;
  },
);
