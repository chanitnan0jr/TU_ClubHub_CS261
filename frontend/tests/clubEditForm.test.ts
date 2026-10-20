import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EMPTY_CLUB_EDIT_FORM,
  toClubEditFormValues,
  toClubUpdateRequest,
  validateClubEditForm,
  type ClubEditFormValues,
} from '../src/features/clubs/utils/clubEditForm.ts'

const valid = (overrides: Partial<ClubEditFormValues> = {}): ClubEditFormValues => ({
  ...EMPTY_CLUB_EDIT_FORM,
  name: 'ชมรมตัวอย่าง',
  description: 'รายละเอียด',
  ...overrides,
})

test('blank optional fields are sent as null, never as empty strings', () => {
  assert.deepEqual(toClubUpdateRequest(valid({ objectives: '  ', facebookUrl: '' })), {
    name: 'ชมรมตัวอย่าง',
    description: 'รายละเอียด',
    objectives: null,
    contactUrl: null,
    facebookUrl: null,
    instagramUrl: null,
    contactEmail: null,
    imageUrl: null,
    bannerUrl: null,
  })
})

test('the request carries only the nine fields PUT accepts', () => {
  const request = toClubUpdateRequest(
    valid({ imageUrl: ' https://example.org/a.png ', contactEmail: 'club@example.org' }),
  )

  assert.deepEqual(Object.keys(request).sort(), [
    'bannerUrl',
    'contactEmail',
    'contactUrl',
    'description',
    'facebookUrl',
    'imageUrl',
    'instagramUrl',
    'name',
    'objectives',
  ])
  assert.equal(request.imageUrl, 'https://example.org/a.png')
})

test('requires a name and description and limits the name to 200 characters', () => {
  assert.deepEqual(Object.keys(validateClubEditForm(valid({ name: ' ', description: '' }))).sort(), [
    'description',
    'name',
  ])
  assert.ok(validateClubEditForm(valid({ name: 'ก'.repeat(201) })).name)
  assert.deepEqual(validateClubEditForm(valid({ name: 'ก'.repeat(200) })), {})
})

test('rejects URLs that are not HTTPS or not on the expected social host', () => {
  const errors = validateClubEditForm(
    valid({
      contactUrl: 'http://example.org',
      facebookUrl: 'https://example.org/page',
      instagramUrl: 'https://facebook.com/page',
      imageUrl: 'not a url',
      bannerUrl: 'https://example.org/banner.png',
    }),
  )

  assert.deepEqual(Object.keys(errors).sort(), [
    'contactUrl',
    'facebookUrl',
    'imageUrl',
    'instagramUrl',
  ])
  assert.deepEqual(
    validateClubEditForm(
      valid({
        facebookUrl: 'https://www.facebook.com/club',
        instagramUrl: 'https://instagram.com/club',
      }),
    ),
    {},
  )
})

test('loading a profile fills missing optional fields with empty strings', () => {
  const values = toClubEditFormValues({
    id: '1',
    name: 'ชมรม',
    description: 'รายละเอียด',
    instagramUrl: null,
    tags: [],
    facebookUrl: 'https://facebook.com/club',
  })

  assert.equal(values.objectives, '')
  assert.equal(values.instagramUrl, '')
  assert.equal(values.facebookUrl, 'https://facebook.com/club')
})
