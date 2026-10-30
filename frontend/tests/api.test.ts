import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, apiRequest, describeApiError } from '../src/lib/api.ts'
import { csrfResponse, json, problem, stubFetch } from './helpers.ts'

test('GET sends no CSRF header and parses the JSON body', async () => {
  const stub = stubFetch(() => json({ ok: true }))
  try {
    assert.deepEqual(await apiRequest('/api/v1/thing'), { ok: true })
    assert.equal(stub.requests.length, 1)
    assert.equal(stub.requests[0].method, 'GET')
  } finally {
    stub.restore()
  }
})

test('writes fetch the CSRF header first and send it with the JSON body', async () => {
  const stub = stubFetch((request) =>
    request.url === '/api/v1/auth/csrf' ? csrfResponse() : json({ id: '1' }, 201),
  )
  try {
    await apiRequest('/api/v1/thing', { method: 'POST', body: { a: 1 } })

    assert.deepEqual(
      stub.requests.map((r) => `${r.method} ${r.url}`),
      ['GET /api/v1/auth/csrf', 'POST /api/v1/thing'],
    )
    assert.equal(stub.requests[1].headers['X-CSRF-TOKEN'], 'csrf-token')
    assert.equal(stub.requests[1].headers['Content-Type'], 'application/json')
    assert.deepEqual(stub.requests[1].body, { a: 1 })
  } finally {
    stub.restore()
  }
})

test('a 204 response resolves to undefined instead of parsing a body', async () => {
  const stub = stubFetch((request) =>
    request.url === '/api/v1/auth/csrf' ? csrfResponse() : new Response(null, { status: 204 }),
  )
  try {
    assert.equal(await apiRequest('/api/v1/thing/1', { method: 'DELETE' }), undefined)
  } finally {
    stub.restore()
  }
})

test('a problem+json response becomes an ApiError with status, code and field errors', async () => {
  const stub = stubFetch(() =>
    problem(400, 'VALIDATION_FAILED', 'bad', {
      fieldErrors: [
        { field: 'questionText', code: 'INVALID', message: 'must not be blank' },
        { nope: true },
      ],
    }),
  )
  try {
    await assert.rejects(apiRequest('/api/v1/thing'), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 400)
      assert.equal(error.code, 'VALIDATION_FAILED')
      assert.deepEqual(error.fieldErrors, [
        { field: 'questionText', code: 'INVALID', message: 'must not be blank' },
      ])
      return true
    })
  } finally {
    stub.restore()
  }
})

test('an error response that is not JSON still becomes an ApiError', async () => {
  const stub = stubFetch(() => new Response('<html>', { status: 502 }))
  try {
    await assert.rejects(apiRequest('/api/v1/thing'), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 502)
      return true
    })
  } finally {
    stub.restore()
  }
})

test('describeApiError gives a Thai message per status and keeps 409 detail', () => {
  const fallback = 'fallback'

  assert.match(describeApiError(new ApiError(401, ''), fallback), /เข้าสู่ระบบ/)
  assert.match(describeApiError(new ApiError(403, '', 'CSRF_INVALID'), fallback), /CSRF/)
  assert.match(describeApiError(new ApiError(403, '', 'ACCESS_DENIED'), fallback), /กรรมการ/)
  assert.match(describeApiError(new ApiError(404, ''), fallback), /ไม่พบ/)
  assert.equal(describeApiError(new ApiError(409, 'Round was modified'), fallback), 'Round was modified')
  assert.match(describeApiError(new ApiError(503, ''), fallback), /ฐานข้อมูล/)
  assert.equal(describeApiError(new ApiError(500, ''), fallback), fallback)
  assert.match(
    describeApiError(
      new ApiError(400, '', 'VALIDATION_FAILED', [{ field: 'name', message: 'required' }]),
      fallback,
    ),
    /name: required/,
  )
})

test('describeApiError reports a network failure for fetch TypeErrors', () => {
  assert.match(describeApiError(new TypeError('Failed to fetch'), 'fallback'), /เชื่อมต่อเซิร์ฟเวอร์ไม่ได้/)
  assert.equal(describeApiError(new Error('other'), 'fallback'), 'fallback')
})
