import assert from 'node:assert/strict'
import test from 'node:test'
import {
  closeRound,
  createRound,
  getRound,
  listRounds,
  publishRound,
  updateRound,
} from '../src/features/recruitment/api/roundApi.ts'
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

test('lists a page of the club rounds and reads one round without a CSRF token', async () => {
  const stub = stubFetch(() => json({ items: [], page: 2, size: 5, totalElements: 0, totalPages: 0 }))
  try {
    await listRounds('20', { page: 2, size: 5 })
    await listRounds('20')
    await getRound('20', '5')

    assert.deepEqual(stub.requests.map((r) => `${r.method} ${r.url}`), [
      'GET /api/v1/clubs/20/rounds?page=2&size=5',
      'GET /api/v1/clubs/20/rounds?page=0&size=20',
      'GET /api/v1/clubs/20/rounds/5',
    ])
    for (const read of stub.requests) {
      assert.equal(read.body, undefined)
      assert.equal(read.headers['X-CSRF-TOKEN'], undefined)
    }
  } finally {
    stub.restore()
  }
})

test('replaces a round with its version and closes a round early with a CSRF token', async () => {
  const stub = stubFetch((r) =>
    r.url === '/api/v1/auth/csrf'
      ? csrfResponse()
      : json({ id: '5', clubId: '20', version: 4, publicationStatus: 'PUBLISHED' }),
  )
  try {
    await updateRound('20', '5', { ...request, eligibilityText: 'ปี 1-2', version: 3 })
    await closeRound('20', '5', 4)

    const writes = stub.requests.filter((r) => r.url !== '/api/v1/auth/csrf')
    assert.deepEqual(writes.map((r) => `${r.method} ${r.url}`), [
      'PUT /api/v1/clubs/20/rounds/5',
      'PATCH /api/v1/clubs/20/rounds/5',
    ])
    // RoundReplace is every RoundWrite field plus version; a CLOSE RoundPatch sends no reason.
    assert.deepEqual(writes[0].body, { ...request, eligibilityText: 'ปี 1-2', version: 3 })
    assert.deepEqual(writes[1].body, { action: 'CLOSE', version: 4 })
    for (const write of writes) assert.equal(write.headers['X-CSRF-TOKEN'], 'csrf-token')
  } finally {
    stub.restore()
  }
})
