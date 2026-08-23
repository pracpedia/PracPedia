/**
 * Gmail address detection — used to block Gmail in registration and login.
 *
 * The developer wants to enforce institutional emails (e.g. @edu.bd, @gmail.com
 * blocked) to reduce spam accounts during the testing phase.
 *
 * Platform owners (defined in PLATFORM_OWNER_EMAILS env var) bypass this check.
 */

const GMAIL_RE = /@gmail\.com$/i;

export function isGmailAddress(email: string): boolean {
  return GMAIL_RE.test(String(email || '').toLowerCase().trim());
}

export const GMAIL_BLOCK_ERROR = 'Gmail addresses are not allowed. Please use your institutional email (e.g. student@edu.bd).';
export const GMAIL_BLOCK_ERROR_BN = 'Gmail ঠিকানা গ্রহণযোগ্য নয়। অনুগ্রহ করে আপনার প্রাতিষ্ঠানিক ইমেইল ব্যবহার করুন।';

/**
 * Check if an email is in the PLATFORM_OWNER_EMAILS allowlist.
 * These emails bypass the Gmail block.
 */
export function isPlatformOwnerEmail(email: string): boolean {
  const owners = (process.env.PLATFORM_OWNER_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return owners.includes(String(email || '').toLowerCase().trim());
}

/**
 * Combined check: returns true if the email should be BLOCKED.
 * Blocks Gmail unless the email is in the platform owner allowlist.
 */
export function shouldBlockEmail(email: string): boolean {
  if (isPlatformOwnerEmail(email)) return false;
  return isGmailAddress(email);
}
