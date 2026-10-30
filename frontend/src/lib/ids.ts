// Resource IDs are decimal strings for a positive 64-bit database BIGINT
// (API contract), so they never go through Number().
const RESOURCE_ID = /^[1-9][0-9]{0,18}$/

export function isValidId(value: string | undefined): value is string {
  return value !== undefined && RESOURCE_ID.test(value)
}
