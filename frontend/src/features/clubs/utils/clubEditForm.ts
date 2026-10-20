import {
  isRequired,
  isValidFacebookUrl,
  isValidInstagramUrl,
  isValidUrl,
} from '../../../utils/validation.ts'
import type { ClubResponseDto, ClubUpdateRequestDto } from '../types/club.ts'

export interface ClubEditFormValues {
  name: string
  description: string
  objectives: string
  contactUrl: string
  facebookUrl: string
  instagramUrl: string
  contactEmail: string
  imageUrl: string
  bannerUrl: string
}

export type ClubEditFormErrors = Partial<Record<keyof ClubEditFormValues, string>>

export const EMPTY_CLUB_EDIT_FORM: ClubEditFormValues = {
  name: '',
  description: '',
  objectives: '',
  contactUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  contactEmail: '',
  imageUrl: '',
  bannerUrl: '',
}

const MAX_NAME_LENGTH = 200

export function toClubEditFormValues(profile: ClubResponseDto): ClubEditFormValues {
  return {
    name: profile.name ?? '',
    description: profile.description ?? '',
    objectives: profile.objectives ?? '',
    contactUrl: profile.contactUrl ?? '',
    facebookUrl: profile.facebookUrl ?? '',
    instagramUrl: profile.instagramUrl ?? '',
    contactEmail: profile.contactEmail ?? '',
    imageUrl: profile.imageUrl ?? '',
    bannerUrl: profile.bannerUrl ?? '',
  }
}

export function validateClubEditForm(values: ClubEditFormValues): ClubEditFormErrors {
  const errors: ClubEditFormErrors = {}

  if (!isRequired(values.name)) {
    errors.name = 'กรุณากรอกชื่อชมรม'
  } else if (values.name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `ชื่อชมรมต้องมีความยาวไม่เกิน ${MAX_NAME_LENGTH} ตัวอักษร`
  }

  if (!isRequired(values.description)) {
    errors.description = 'กรุณากรอกคำอธิบายชมรม'
  }

  const urlChecks: Array<{
    field: keyof ClubEditFormValues
    isValid: (value: string) => boolean
    message: string
  }> = [
    { field: 'contactUrl', isValid: isValidUrl, message: 'กรุณากรอก URL HTTPS ที่ถูกต้อง' },
    {
      field: 'facebookUrl',
      isValid: isValidFacebookUrl,
      message: 'กรุณาใช้ลิงก์ Facebook ที่ขึ้นต้นด้วย https://',
    },
    {
      field: 'instagramUrl',
      isValid: isValidInstagramUrl,
      message: 'กรุณาใช้ลิงก์ Instagram ที่ขึ้นต้นด้วย https://',
    },
    { field: 'imageUrl', isValid: isValidUrl, message: 'กรุณากรอก URL HTTPS ที่ถูกต้อง' },
    { field: 'bannerUrl', isValid: isValidUrl, message: 'กรุณากรอก URL HTTPS ที่ถูกต้อง' },
  ]

  for (const { field, isValid, message } of urlChecks) {
    const value = values[field]
    if (value.trim() && !isValid(value)) errors[field] = message
  }

  return errors
}

// The API clears an optional field when it receives null, and rejects an empty
// string for the HTTPS URL fields, so blank optional values are sent as null.
const nullIfBlank = (value: string): string | null => value.trim() || null

export function toClubUpdateRequest(values: ClubEditFormValues): ClubUpdateRequestDto {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    objectives: nullIfBlank(values.objectives),
    contactUrl: nullIfBlank(values.contactUrl),
    facebookUrl: nullIfBlank(values.facebookUrl),
    instagramUrl: nullIfBlank(values.instagramUrl),
    contactEmail: nullIfBlank(values.contactEmail),
    imageUrl: nullIfBlank(values.imageUrl),
    bannerUrl: nullIfBlank(values.bannerUrl),
  }
}
