import assert from 'node:assert/strict'
import test from 'node:test'
import { createRound, publishRound } from '../src/features/recruitment/api/roundApi.ts'
import type { RoundWriteRequest } from '../src/features/recruitment/utils/roundRequest.ts'
import { csrfResponse, json, stubFetch } from './helpers.ts'

const request: RoundWriteRequest = {
  title: 'รอบ',
  academicYear: 2569,
  semester: 1,
  description: 'รายละเอียด',
  eligibilityText: null,
  opensAt: '2026-11-01T02:00:00.000Z',
  closesAt: '2026-11-10T10:00:00.000Z',
  confirmationDeadline: '2026-11-20T16:59:59.000Z',
  resultsScheduledAt: null,
  questions: [],
}

test('creates the round under its club and publishes it with the returned version', async () => {
  const stub = stubFetch((r) =>
    r.url === '/api/v1/auth/csrf'
      ? csrfResponse()
      : json({ id: '5', clubId: '20', version: r.method === 'POST' ? 0 : 1, publicationStatus: 'DRAFT' }),
  )
  try {
    const round = await createRound('20', request)
    await publishRound('20', round.id, round.version)

    const writes = stub.requests.filter((r) => r.url !== '/api/v1/auth/csrf')
    assert.deepEqual(writes.map((r) => `${r.method} ${r.url}`), [
      'POST /api/v1/clubs/20/rounds',
      'PATCH /api/v1/clubs/20/rounds/5',
    ])
    assert.deepEqual(writes[0].body, request)
    assert.deepEqual(writes[1].body, { action: 'PUBLISH', version: 0 })
    for (const write of writes) assert.equal(write.headers['X-CSRF-TOKEN'], 'csrf-token')
  } finally {
    stub.restore()
  }
})
