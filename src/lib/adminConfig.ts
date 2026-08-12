export const ADMIN_EMAILS = [
  'etouli142@outlook.com',
  'matteosicard8@gmail.com',
] as const;

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email && ADMIN_EMAILS.includes(email.trim().toLowerCase() as (typeof ADMIN_EMAILS)[number]));
}
