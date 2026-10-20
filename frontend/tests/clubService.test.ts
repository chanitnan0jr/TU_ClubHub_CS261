import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchClubDetail, toClubDetailData } from '../src/features/clubs/services/clubService.ts'
import { json, problem, stubFetch } from './helpers.ts'

const profile = {
  id: '20001',
  name: 'ชมรมตัวอย่าง',
  description: 'รายละเอียด',
  objectives: null,
  contactUrl: 'https://example.org/contact',
  facebookUrl: null,
  instagramUrl: '',
  contactEmail: 'club@example.org',
  affiliationLevel: null,
  affiliationName: null,
  imageUrl: null,
  bannerUrl: 'https://example.org/banner.png',
  category: { id: '1', name: 'วิชาการ' },
  tags: [{ id: '1', name: 'เขียนโปรแกรม' }],
}

const rounds = {
  items: [{ id: '5', name: 'รอบ 1', opensAt: '2026-10-01T00:00:00Z', closesAt: '2026-11-01T00:00:00Z' }],
  page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
}

test('maps the public profile and rounds without inventing missing fields', () => {
  const club = toClubDetailData(profile, rounds)

  assert.equal(club.category, 'วิชาการ')
  assert.deepEqual(club.tags, ['เขียนโปรแกรม'])
  assert.equal(club.objectives, '')
  assert.equal(club.imageUrl, undefined)
  assert.equal(club.bannerUrl, 'https://example.org/banner.png')
  assert.deepEqual(club.contacts, {
    website: 'https://example.org/contact',
    facebook: undefined,
    instagram: undefined,
    email: 'club@example.org',
  })
  assert.deepEqual(club.rounds, [
    { id: '5', title: 'รอบ 1', opensAt: '2026-10-01T00:00:00Z', closesAt: '2026-11-01T00:00:00Z' },
  ])
  assert.equal(club.roundsUnavailable, false)
})

test('rounds come from items, so an empty page means no open round', () => {
  const club = toClubDetailData(profile, { ...rounds, items: [] })
  assert.deepEqual(club.rounds, [])
  assert.equal(club.roundsUnavailable, false)
})

test('loads the profile and rounds from the public endpoints', async () => {
  const stub = stubFetch((request) =>
    request.url.endsWith('/recruitment-rounds') ? json(rounds) : json(profile),
  )
  try {
    const result = await fetchClubDetail('20001')

    assert.equal(result.status, 'ok')
    assert.deepEqual(stub.requests.map((r) => r.url).sort(), [
      '/api/v1/public/clubs/20001',
      '/api/v1/public/clubs/20001/recruitment-rounds',
    ])
  } finally {
    stub.restore()
  }
})

test('an unknown club is not-found and never falls back to made-up data', async () => {
  const stub = stubFetch(() => problem(404, 'CLUB_NOT_FOUND', 'No club exists for this ID.'))
  try {
    assert.deepEqual(await fetchClubDetail('999'), { status: 'not-found' })
  } finally {
    stub.restore()
  }
})

test('a server failure is reported as an error, not as a club', async () => {
  const stub = stubFetch(() => problem(503, 'SERVICE_UNAVAILABLE', 'down'))
  try {
    const result = await fetchClubDetail('20001')
    assert.equal(result.status, 'error')
  } finally {
    stub.restore()
  }
})

test('the club still loads when only the rounds request fails', async () => {
  const stub = stubFetch((request) =>
    request.url.endsWith('/recruitment-rounds')
      ? problem(503, 'SERVICE_UNAVAILABLE', 'down')
      : json(profile),
  )
  try {
    const result = await fetchClubDetail('20001')

    assert.equal(result.status, 'ok')
    if (result.status === 'ok') {
      assert.equal(result.club.roundsUnavailable, true)
      assert.deepEqual(result.club.rounds, [])
    }
  } finally {
    stub.restore()
  }
})
