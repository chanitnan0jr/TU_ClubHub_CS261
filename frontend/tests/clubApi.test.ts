import assert from 'node:assert/strict'
import test from 'node:test'
import { getClubProfile, updateClubProfile } from '../src/features/clubs/api/clubApi.ts'
import { ApiError, describeApiError } from '../src/lib/api.ts'
import { csrfResponse, json, problem, stubFetch } from './helpers.ts'

test('legacy club API delegates GET to the shared client and preserves response data', async () => {
  const stub = stubFetch(() => json({ id: '20001', name: 'Fictional' }))
  try {
    assert.deepEqual(await getClubProfile('20001'), { id: '20001', name: 'Fictional' })
    assert.equal(stub.requests[0].url, '/api/v1/public/clubs/20001')
  } finally { stub.restore() }
})

test('legacy club writes use the shared CSRF flow exactly once', async () => {
  const stub = stubFetch(request => request.url === '/api/v1/auth/csrf' ? csrfResponse() : json({ id: '20001' }))
  try {
    await updateClubProfile('20001', { name: 'Fictional', description: 'Fictional club' })
    assert.equal(stub.requests.length, 2)
    assert.equal(stub.requests[1].method, 'PUT')
    assert.equal(stub.requests[1].headers['X-CSRF-TOKEN'], 'csrf-token')
    assert.equal(stub.requests[1].url, '/api/v1/clubs/20001')
  } finally { stub.restore() }
})

test('legacy club errors cannot bypass shared safe error handling', async () => {
  const stub = stubFetch(() => problem(500, 'INTERNAL_ERROR', 'SECRET SELECT password FROM private_table'))
  try {
    await assert.rejects(getClubProfile('20001'), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 500)
      assert.doesNotMatch(error.message, /SECRET|SELECT|private_table/)
      assert.equal(describeApiError(error, 'ไม่สามารถโหลดข้อมูลได้'), 'ไม่สามารถโหลดข้อมูลได้')
      return true
    })
  } finally { stub.restore() }
})
