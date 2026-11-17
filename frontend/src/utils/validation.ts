export function isRequired(value: string): boolean {
  return value.trim().length > 0
}

export function isValidHttpsUrl(value: string): boolean {
  if (
    Array.from(value).length > 2048 ||
    /\s/u.test(value) ||
    Array.from(value, (ch) => ch.codePointAt(0) ?? 0).some(
      (cp) => cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f),
    )
  ) {
    return false
  }
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

export function isValidUrl(value: string): boolean {
  return isValidHttpsUrl(value.trim())
}

export function isValidClubImageUrl(value: string): boolean {
  const trimmed = value.trim()
  if (/^\/images\/[A-Za-z0-9._/-]+$/.test(trimmed) && !trimmed.includes('..') && trimmed.length <= 2048) {
    return true
  }
  return isValidUrl(trimmed)
}

export function isValidFacebookUrl(value: string): boolean {
  return isValidSocialUrl(value, [
    'facebook.com',
    'www.facebook.com',
    'm.facebook.com',
  ])
}

export function isValidInstagramHandle(value: string): boolean {
  return /^[a-zA-Z0-9._]+$/.test(value) && value.length <= 30
}

export function isValidClubContactEmail(value: string): boolean {
  const parts = value.trim().split('@')
  if (parts.length !== 2 || value.trim().length > 254) return false

  const domain = parts[1].toLowerCase()
  const isAllowedDomain =
    domain === 'gmail.com' ||
    domain === 'tu.ac.th' ||
    domain.endsWith('.tu.ac.th')

  return isAllowedDomain && isValidEmailLocalPart(parts[0])
}

function isValidEmailLocalPart(localPart: string): boolean {
  return (
    localPart.length > 0 &&
    localPart.length <= 64 &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart) &&
    !localPart.startsWith('.') &&
    !localPart.endsWith('.') &&
    !localPart.includes('..')
  )
}

function isValidSocialUrl(value: string, allowedHosts: readonly string[]): boolean {
  if (!isValidUrl(value)) return false

  try {
    const url = new URL(value.trim())
    return allowedHosts.includes(url.hostname.toLowerCase()) && !url.port
  } catch {
    return false
  }
}
