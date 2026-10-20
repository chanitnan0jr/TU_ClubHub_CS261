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
