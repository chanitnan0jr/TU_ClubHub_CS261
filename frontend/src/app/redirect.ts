/**
 * Returns the in-app path to go to after login. Anything that is not a plain
 * absolute path on this site (another origin, `//host`, `/\host`) becomes `/`.
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  for (const char of next) {
    if (char === '\\' || char.charCodeAt(0) < 0x20) return '/'
  }
  return next
}
