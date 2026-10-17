export function isRequired(value: string): boolean {
  return value.trim().length > 0
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isValidDomeTuEmail(value: string): boolean {
  const parts = value.trim().split('@')
  if (parts.length !== 2 || parts[1].toLowerCase() !== 'dome.tu.ac.th') {
    return false
  }

  const [localPart] = parts
  return isValidEmailLocalPart(localPart)
}

export function isValidClubContactEmail(value: string): boolean {
  const parts = value.trim().split('@')
  if (
    parts.length !== 2 ||
    !['dome.tu.ac.th', 'tu.ac.th', 'gmail.com'].includes(
      parts[1].toLowerCase(),
    )
  ) {
    return false
  }

  const [localPart] = parts
  return isValidEmailLocalPart(localPart)
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
