/**
 * Test mode env gate.
 *
 * When PRACPEDIA_TEST_PASSWORDS_VISIBLE=true, the /api/credentials endpoint
 * returns all users' plaintext passwords to super admins. When false, the
 * endpoint returns 404 (effectively doesn't exist).
 *
 * This is for local development / testing only. NEVER enable in production.
 */
export function isTestPasswordModeEnabled(): boolean {
  return process.env.PRACPEDIA_TEST_PASSWORDS_VISIBLE === 'true';
}

/**
 * Whether the app is running in production.
 * Used to hard-block test-mode features even if the env flag is accidentally set.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Combined check: test mode is enabled AND we're not in production.
 * In production, test mode is always OFF regardless of the env flag.
 */
export function isTestModeSafe(): boolean {
  return isTestPasswordModeEnabled() && !isProduction();
}
