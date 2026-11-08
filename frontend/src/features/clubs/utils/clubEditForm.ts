import type { ProblemFieldError } from '../../../lib/api.ts'
import { validateClubProfile } from '../../../utils/clubProfileValidation.ts'
import { isRequired } from '../../../utils/validation.ts'
import type { ClubResponseDto, ClubUpdateRequestDto } from '../types/club.ts'

/** Form state of the club profile editor (US-06); every text field is a string. */
export interface ClubEditFormValues {
  bannerUrl: string
  imageUrl: string
  name: string
  objectives: string
  description: string
  categoryId: string
  tagIds: string[]
  facebookUrl: string
  instagramHandle: string
  contactEmail: string
  contactUrl: string
}

export type ClubEditFormErrors = Partial<Record<keyof ClubEditFormValues, string>>

/** The API accepts at most this many interest tags per club. */
export const MAX_CLUB_TAGS = 10

export const EMPTY_CLUB_EDIT_FORM: ClubEditFormValues = {
  bannerUrl: '',
  imageUrl: '',
  name: '',
  objectives: '',
  description: '',
  categoryId: '',
  tagIds: [],
  facebookUrl: '',
  instagramHandle: '',
  contactEmail: '',
  contactUrl: '',
}

const INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com']

/** The account name of an instagram.com URL; any other value is kept so validation can flag it. */
export function instagramHandleFromUrl(instagramUrl: string | null | undefined): string {
  if (!instagramUrl) return ''
  try {
    const url = new URL(instagramUrl)
    if (!INSTAGRAM_HOSTS.includes(url.hostname)) return instagramUrl
    return url.pathname.split('/').filter(Boolean)[0] ?? ''
  } catch {
    return instagramUrl
  }
}

// Users may type the account name with its leading "@".
const normalizeHandle = (value: string) => value.trim().replace(/^@/, '')

/** Prefills the form from the public profile or the PUT response. */
export function toClubEditFormValues(profile: ClubResponseDto): ClubEditFormValues {
  return {
    bannerUrl: profile.bannerUrl ?? '',
    imageUrl: profile.imageUrl ?? '',
    name: profile.name ?? '',
    objectives: profile.objectives ?? '',
    description: profile.description ?? '',
    categoryId: profile.category?.id ?? profile.categoryId ?? '',
    tagIds: (profile.tags ?? []).map((tag: { id: string }) => tag.id),
    facebookUrl: profile.facebookUrl ?? '',
    instagramHandle: instagramHandleFromUrl(profile.instagramUrl),
    contactEmail: profile.contactEmail ?? '',
    contactUrl: profile.contactUrl ?? '',
  }
}

export function validateClubEditForm(values: ClubEditFormValues): ClubEditFormErrors {
  const { instagramUrl, ...textErrors } = validateClubProfile({
    name: values.name,
    description: values.description,
    objectives: values.objectives,
    contactUrl: values.contactUrl.trim(),
    facebookUrl: values.facebookUrl.trim(),
    instagramHandle: normalizeHandle(values.instagramHandle),
    contactEmail: values.contactEmail.trim(),
    imageUrl: values.imageUrl.trim(),
    bannerUrl: values.bannerUrl.trim(),
  })
  const errors: ClubEditFormErrors = { ...textErrors }
  if (instagramUrl) errors.instagramHandle = instagramUrl

  // Required on this page by the UC-06 wireframe, although the API allows null.
  if (!isRequired(values.objectives)) errors.objectives = 'กรุณากรอกวัตถุประสงค์ชมรม'
  if (!values.categoryId) errors.categoryId = 'กรุณาเลือกหมวดหมู่ชมรม'
  if (values.tagIds.length > MAX_CLUB_TAGS) {
    errors.tagIds = `เลือกแท็กได้สูงสุด ${MAX_CLUB_TAGS} แท็ก`
  }

  return errors
}

// The API clears an optional field when it receives null, and rejects an empty
// string for the HTTPS URL fields, so blank optional values are sent as null.
const nullIfBlank = (value: string): string | null => value.trim() || null

export function toClubUpdateRequest(values: ClubEditFormValues): ClubUpdateRequestDto {
  const handle = normalizeHandle(values.instagramHandle)
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    objectives: nullIfBlank(values.objectives),
    contactUrl: nullIfBlank(values.contactUrl),
    facebookUrl: nullIfBlank(values.facebookUrl),
    instagramUrl: handle ? `https://www.instagram.com/${handle}/` : null,
    contactEmail: nullIfBlank(values.contactEmail),
    imageUrl: nullIfBlank(values.imageUrl),
    bannerUrl: nullIfBlank(values.bannerUrl),
    categoryId: values.categoryId,
    tagIds: [...values.tagIds],
  }
}

/** True when two form states would send the same request; tag order does not matter. */
export function isSameClubEditForm(a: ClubEditFormValues, b: ClubEditFormValues): boolean {
  const normalized = (values: ClubEditFormValues) =>
    JSON.stringify({ ...values, tagIds: [...values.tagIds].sort() })
  return normalized(a) === normalized(b)
}

const SERVER_FIELDS: Partial<Record<string, keyof ClubEditFormValues>> = {
  instagramUrl: 'instagramHandle',
}

/** Places API field errors (already reduced to safe Thai text) under the matching form field. */
export function fromServerFieldErrors(fieldErrors: ProblemFieldError[]): ClubEditFormErrors {
  const errors: ClubEditFormErrors = {}
  for (const { field, message } of fieldErrors) {
    const name = field.startsWith('tagIds') ? 'tagIds' : SERVER_FIELDS[field] ?? field
    if (Object.hasOwn(EMPTY_CLUB_EDIT_FORM, name)) {
      errors[name as keyof ClubEditFormValues] ??= message
    }
  }
  return errors
}
