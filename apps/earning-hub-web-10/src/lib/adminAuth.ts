import { ZiteError } from 'zitejs/backend';

/**
 * Returns the admin password configured for this deployment.
 *
 * Fails closed: if `ZITE_ADMIN_PASSWORD` is missing or empty, every admin
 * endpoint rejects the request instead of falling back to a built-in default.
 * Never commit a real password to source control — set it as a server-side
 * environment variable (Zite project settings → Environment variables).
 */
export function getAdminPassword(): string {
  const password = process.env.ZITE_ADMIN_PASSWORD;
  if (!password) {
    throw new ZiteError({
      code: 'INTERNAL_ERROR',
      message: 'Admin access is not configured: set the ZITE_ADMIN_PASSWORD environment variable.',
    });
  }
  return password;
}
