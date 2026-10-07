/**
 * ID-first identity. Students type Reg No (FUD/2024/001), staff type Staff ID.
 * Login looks up the REAL email via email_for_login() RPC, then signs in normally.
 * Emails are collected at signup and used only for password reset.
 */
export function normalizeId(id: string): string {
  return id.replace(/\s+/g, " ").trim().toUpperCase();
}
