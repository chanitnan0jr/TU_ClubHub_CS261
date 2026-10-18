import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateClubProfile,
  type ClubProfileDraft,
} from '../src/utils/clubProfileValidation.ts'

function validDraft(
  overrides: Partial<ClubProfileDraft> = {},
): ClubProfileDraft {
  return {
    name: 'ชมรมตัวอย่าง',
    description: 'รายละเอียดชมรม',
    objectives: '',
    contactUrl: '',
    facebookUrl: '',
    instagramHandle: '',
    contactEmail: '',
    imageUrl: '',
    bannerUrl: '',
    ...overrides,
  }
}

test('requires a non-blank club name and description', () => {
  assert.deepEqual(
    validateClubProfile(validDraft({ name: '  ', description: '\n' })),
    {
      name: 'กรุณากรอกชื่อชมรม',
      description: 'กรุณากรอกรายละเอียดชมรม',
    },
  )
})

test('rejects club names longer than 200 characters', () => {
  assert.deepEqual(
    validateClubProfile(validDraft({ name: 'ก'.repeat(201) })),
    { name: 'ชื่อชมรมต้องมีความยาวไม่เกิน 200 ตัวอักษร' },
  )
})

test('accepts exactly 200 characters for club name', () => {
  assert.deepEqual(validateClubProfile(validDraft({ name: 'ก'.repeat(200) })), {})
})

test('accepts approved contact email domains', () => {
  for (const contactEmail of [
    'contact@tu.ac.th',
    'contact@club.tu.ac.th',
    'club@gmail.com',
  ]) {
    assert.deepEqual(validateClubProfile(validDraft({ contactEmail })), {})
  }
})

test('rejects contact emails outside approved domains and malformed addresses', () => {
  for (const contactEmail of [
    'club@example.com',
    'missing-at-sign',
    'bad..dots@tu.ac.th',
    '@gmail.com',
  ]) {
    assert.equal(
      'contactEmail' in validateClubProfile(validDraft({ contactEmail })),
      true,
      `Expected ${contactEmail} to be invalid`,
    )
  }
})

test('accepts valid Instagram handles and rejects invalid handles', () => {
  assert.deepEqual(
    validateClubProfile(validDraft({ instagramHandle: 'tu.club_01' })),
    {},
  )
  assert.equal(
    'instagramUrl' in
      validateClubProfile(validDraft({ instagramHandle: 'club name' })),
    true,
  )
  assert.equal(
    'instagramUrl' in
      validateClubProfile(validDraft({ instagramHandle: 'a'.repeat(31) })),
    true,
  )
})

test('requires HTTPS URLs and rejects Facebook links on unapproved hosts', () => {
  const errors = validateClubProfile(
    validDraft({
      contactUrl: 'http://club.example.com',
      facebookUrl: 'https://not-facebook.example/club',
      imageUrl: 'https://user:password@images.example.com/club.png',
      bannerUrl: 'not a url',
    }),
  )

  assert.deepEqual(errors, {
    contactUrl: 'กรุณากรอก URL HTTPS ที่ถูกต้อง',
    facebookUrl: 'กรุณาใช้ลิงก์ Facebook ที่ขึ้นต้นด้วย https://',
    imageUrl: 'กรุณากรอก URL HTTPS ที่ถูกต้อง',
    bannerUrl: 'กรุณากรอก URL HTTPS ที่ถูกต้อง',
  })
})

test('accepts valid HTTPS URLs and supported Facebook URLs', () => {
  assert.deepEqual(
    validateClubProfile(
      validDraft({
        contactUrl: 'https://club.example.com/contact',
        facebookUrl: 'https://www.facebook.com/tuclub',
        imageUrl: 'https://images.example.com/club.png',
        bannerUrl: 'https://images.example.com/banner.png',
      }),
    ),
    {},
  )
})
