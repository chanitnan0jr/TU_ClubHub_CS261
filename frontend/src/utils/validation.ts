export function isRequired(value: string): boolean {
  return value.trim().length > 0
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return (
      value.trim().length <= 2048 &&
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

export function isValidFacebookUrl(value: string): boolean {
  return isValidSocialUrl(value, [
    'facebook.com',
    'www.facebook.com',
    'm.facebook.com',
  ])
}

export function isValidInstagramUrl(value: string): boolean {
  return isValidSocialUrl(value, ['instagram.com', 'www.instagram.com'])
}

export function isValidDomeTuEmail(value: string): boolean {
  return hasAllowedEmailDomain(value, ['dome.tu.ac.th'])
}

export function isValidClubContactEmail(value: string): boolean {
  return (
    value.trim().length <= 254 &&
    hasAllowedEmailDomain(value, [
      'dome.tu.ac.th',
      'tu.ac.th',
      'gmail.com',
    ])
  )
}

function hasAllowedEmailDomain(
  value: string,
  allowedDomains: readonly string[],
): boolean {
  const parts = value.trim().split('@')
  if (
    parts.length !== 2 ||
    !isValidEmailLocalPart(parts[0]) ||
    !allowedDomains.includes(parts[1].toLowerCase())
  ) {
    return false
  }

  return true
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
