/**
 * Single admin email. Hardcoded intentionally — this is a small family app
 * and a proper role system would be overkill. The admin can approve new
 * user sign-in requests via the Settings tab.
 *
 * Mirrored in firestore.rules and storage.rules — keep in sync.
 */
export const ADMIN_EMAIL = 'stefan.kummert@gmail.com';

/**
 * Pre-approved email allowlist. Users signing in with any of these addresses
 * are auto-approved on first login and don't go through the pending queue.
 *
 * Mirrored in firestore.rules — keep in sync.
 */
export const PRE_APPROVED_EMAILS: readonly string[] = [
  'sandkumm@gmail.com',
];

export function isAdminUser(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

export function isPreApprovedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return PRE_APPROVED_EMAILS.includes(email.toLowerCase());
}
