import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EMPTY_CLUB_EDIT_FORM,
  MAX_CLUB_TAGS,
  fromServerFieldErrors,
  isSameClubEditForm,
  toClubEditFormValues,
  toClubUpdateRequest,
  validateClubEditForm,
  type ClubEditFormValues,
} from '../src/features/clubs/utils/clubEditForm.ts'

const valid = (overrides: Partial<ClubEditFormValues> = {}): ClubEditFormValues => ({
  ...EMPTY_CLUB_EDIT_FORM,
  name: 'ชมรมตัวอย่าง',
  objectives: 'วัตถุประสงค์',
  description: 'รายละเอียด',
  categoryId: '30001',
  ...overrides,
})

const tagIds = (count: number) => Array.from({ length: count }, (_, i) => String(40001 + i))

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
    categoryId: '30001',
    tagIds: [],
  })
})

test('the request carries exactly the fields PUT accepts, with category, tags and HTTPS images', () => {
  const request = toClubUpdateRequest(
    valid({
      imageUrl: ' https://example.org/a.png ',
      bannerUrl: 'https://example.org/banner.png',
      contactEmail: 'club@tu.ac.th',
      instagramHandle: '@tu_club',
      tagIds: ['40002', '40001'],
    }),
  )

  assert.deepEqual(Object.keys(request).sort(), [
    'bannerUrl',
    'categoryId',
    'contactEmail',
    'contactUrl',
    'description',
    'facebookUrl',
    'imageUrl',
    'instagramUrl',
    'name',
    'objectives',
    'tagIds',
  ])
  assert.equal(request.imageUrl, 'https://example.org/a.png')
  assert.equal(request.bannerUrl, 'https://example.org/banner.png')
  assert.equal(request.instagramUrl, 'https://www.instagram.com/tu_club/')
  assert.equal(request.categoryId, '30001')
  assert.deepEqual(request.tagIds, ['40002', '40001'])
})

test('requires name, objectives, description and category, and limits the name to 200 characters', () => {
  assert.deepEqual(
    Object.keys(
      validateClubEditForm(valid({ name: ' ', objectives: '\n', description: '', categoryId: '' })),
    ).sort(),
    ['categoryId', 'description', 'name', 'objectives'],
  )
  assert.ok(validateClubEditForm(valid({ name: 'ก'.repeat(201) })).name)
  assert.deepEqual(validateClubEditForm(valid({ name: 'ก'.repeat(200) })), {})
})

test(`allows up to ${MAX_CLUB_TAGS} tags and blocks more`, () => {
  assert.deepEqual(validateClubEditForm(valid({ tagIds: tagIds(MAX_CLUB_TAGS) })), {})
  assert.equal(
    validateClubEditForm(valid({ tagIds: tagIds(MAX_CLUB_TAGS + 1) })).tagIds,
    'เลือกแท็กได้สูงสุด 10 แท็ก',
  )
})

test('rejects URLs that are not HTTPS, Facebook links on other hosts and invalid Instagram names', () => {
  const errors = validateClubEditForm(
    valid({
      contactUrl: 'http://example.org',
      facebookUrl: 'https://example.org/page',
      instagramHandle: 'not a handle',
      imageUrl: 'not a url',
      bannerUrl: 'http://example.org/banner.png',
    }),
  )

  assert.deepEqual(Object.keys(errors).sort(), [
    'bannerUrl',
    'contactUrl',
    'facebookUrl',
    'imageUrl',
    'instagramHandle',
  ])
  assert.deepEqual(
    validateClubEditForm(
      valid({ facebookUrl: 'https://www.facebook.com/club', instagramHandle: '@club.tu' }),
    ),
    {},
  )
})

test('loading a profile fills missing optional fields and reads category, tags and Instagram name', () => {
  const values = toClubEditFormValues({
    id: '1',
    name: 'ชมรม',
    description: 'รายละเอียด',
    instagramUrl: 'https://www.instagram.com/tu_club/',
    facebookUrl: 'https://facebook.com/club',
    category: { id: '30002', name: 'กีฬา' },
    tags: [{ id: '40003', name: 'ดนตรี' }, { id: '40001', name: 'AI' }],
  })

  assert.equal(values.objectives, '')
  assert.equal(values.imageUrl, '')
  assert.equal(values.instagramHandle, 'tu_club')
  assert.equal(values.facebookUrl, 'https://facebook.com/club')
  assert.equal(values.categoryId, '30002')
  assert.deepEqual(values.tagIds, ['40003', '40001'])
})

test('tag order alone does not make the form dirty', () => {
  assert.ok(isSameClubEditForm(valid({ tagIds: ['1', '2'] }), valid({ tagIds: ['2', '1'] })))
  assert.ok(!isSameClubEditForm(valid({ tagIds: ['1'] }), valid({ tagIds: ['1', '2'] })))
  assert.ok(!isSameClubEditForm(valid(), valid({ name: 'ชื่อใหม่' })))
})

test('server field errors land under the matching form field', () => {
  assert.deepEqual(
    fromServerFieldErrors([
      { field: 'categoryId', message: 'หมวดหมู่ไม่ถูกต้อง' },
      { field: 'tagIds[2]', message: 'แท็กไม่ถูกต้อง' },
      { field: 'tagIds[3]', message: 'ซ้ำ' },
      { field: 'instagramUrl', message: 'Instagram ไม่ถูกต้อง' },
      { field: 'request', message: 'ignored' },
    ]),
    {
      categoryId: 'หมวดหมู่ไม่ถูกต้อง',
      tagIds: 'แท็กไม่ถูกต้อง',
      instagramHandle: 'Instagram ไม่ถูกต้อง',
    },
  )
})
