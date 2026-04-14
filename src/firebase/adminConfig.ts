/**
 * Single admin email. Hardcoded intentionally — this is a small family app
 * and a proper role system would be overkill. The admin can approve new
 * user sign-in requests via the Settings tab.
 *
 * Mirrored in firestore.rules and storage.rules — keep in sync.
 */
export const ADMIN_EMAIL = 'stefan.kummert@gmail.com';

export function isAdminUser(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
