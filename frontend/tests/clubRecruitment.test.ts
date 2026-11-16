import assert from 'node:assert/strict'
import test from 'node:test'
import { earliestOpenRound, recruitmentCountdown } from '../src/features/clubs/utils/clubRecruitment.ts'
import { json, stubFetch } from './helpers.ts'

test('countdown handles hours, expiry, and crossing a year boundary', () => {
  const now = Date.parse('2026-12-31T12:00:00Z')
  assert.equal(recruitmentCountdown('2026-12-31T13:01:00Z', now), 'ปิดรับสมัครในอีก 2 ชั่วโมง')
  assert.equal(recruitmentCountdown('2027-01-02T12:00:00Z', now), 'ปิดรับสมัครในอีก 2 วัน')
  assert.equal(recruitmentCountdown('2026-12-31T12:00:00Z', now), null)
  assert.equal(recruitmentCountdown('invalid', now), null)
})

test('selects the earliest closing round across all pages', async () => {
  const round = (id: string, closesAt: string) => ({ id, name: id, description: '', opensAt: '2026-01-01T00:00:00Z', closesAt, resultsScheduledAt: null })
  const stub = stubFetch((request) => {
    const page = Number(new URL(request.url, 'http://localhost').searchParams.get('page'))
    return json({ items: page === 0 ? [round('later', '2027-01-05T00:00:00Z')] : [round('earlier', '2027-01-01T00:00:00Z')], page: { number: page, size: 100, totalElements: 101, totalPages: 2 } })
  })
  try {
    assert.equal((await earliestOpenRound('20001', new AbortController().signal))?.id, 'earlier')
    assert.equal(stub.requests.length, 2)
  } finally { stub.restore() }
})
