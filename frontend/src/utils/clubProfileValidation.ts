import type { ClubUpdateRequestDto } from '../features/clubs/types/club'
import {
  isRequired,
  isValidClubContactEmail,
  isValidFacebookUrl,
  isValidInstagramHandle,
  isValidUrl,
} from './validation.ts'

export type ClubProfileDraft = Omit<ClubUpdateRequestDto, 'instagramUrl'> & {
  instagramHandle: string
}

export type ClubProfileFieldErrors = Partial<
  Record<keyof ClubUpdateRequestDto, string>
>

export function validateClubProfile(
  profile: ClubProfileDraft,
): ClubProfileFieldErrors {
  const errors: ClubProfileFieldErrors = {}

  if (!isRequired(profile.name)) {
    errors.name = 'กรุณากรอกชื่อชมรม'
  } else if (profile.name.trim().length > 200) {
    errors.name = 'ชื่อชมรมต้องมีความยาวไม่เกิน 200 ตัวอักษร'
  }
  if (!isRequired(profile.description)) {
    errors.description = 'กรุณากรอกรายละเอียดชมรม'
  }
  if (profile.contactEmail && !isValidClubContactEmail(profile.contactEmail)) {
    errors.contactEmail =
      'กรุณากรอกอีเมลที่ถูกต้อง เช่น contact@club.tu.ac.th'
  }
  if (
    profile.instagramHandle &&
    !isValidInstagramHandle(profile.instagramHandle)
  ) {
    errors.instagramUrl =
      'ใช้ได้เฉพาะตัวอักษร ตัวเลข จุด และขีดล่าง โดยไม่เว้นวรรค'
  }

  const urlFields: Array<{
    field: keyof ClubUpdateRequestDto
    value: string | null | undefined
    isValid: (value: string) => boolean
  }> = [
    { field: 'contactUrl', value: profile.contactUrl, isValid: isValidUrl },
    {
      field: 'facebookUrl',
      value: profile.facebookUrl,
      isValid: isValidFacebookUrl,
    },
    { field: 'imageUrl', value: profile.imageUrl, isValid: isValidUrl },
    { field: 'bannerUrl', value: profile.bannerUrl, isValid: isValidUrl },
  ]

  for (const { field, value, isValid } of urlFields) {
    if (value && !isValid(value)) {
      errors[field] =
        field === 'facebookUrl'
          ? 'กรุณาใช้ลิงก์ Facebook ที่ขึ้นต้นด้วย https://'
          : 'กรุณากรอก URL HTTPS ที่ถูกต้อง'
    }
  }

  return errors
}
