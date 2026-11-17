const thaiDateTime = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Bangkok',
})

/** Formats an ISO-8601 instant in Thai, Bangkok time. Empty for invalid input. */
export function formatThaiDateTime(instant: string): string {
  const date = new Date(instant)
  return Number.isNaN(date.getTime()) ? '' : thaiDateTime.format(date)
}

/** Masks middle characters of a student code for display. */
export function maskStudentCode(studentCode: string): string {
  const code = studentCode.trim()
  if (code.length <= 4) return '•'.repeat(code.length)
  return `${code.slice(0, 2)}${'•'.repeat(code.length - 4)}${code.slice(-2)}`
}
