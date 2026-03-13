export const APP_HOME_PATH = "/";
export const AUTH_CALLBACK_PATH = "/auth/callback";

/**
 * Build the OAuth callback URL from the current origin and a fixed internal path.
 * This intentionally does not accept arbitrary redirect targets.
 */
export function buildAuthCallbackUrl(origin: string): string {
  return new URL(AUTH_CALLBACK_PATH, origin).toString();
}
