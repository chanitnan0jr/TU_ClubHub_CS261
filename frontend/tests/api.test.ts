import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, apiRequest, describeApiError, resetAuthFailureNotification, subscribeAuthFailures } from '../src/lib/api.ts'
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

test('an aborted request passes its signal to fetch and cannot trigger a stale session failure', async () => {
  const original = globalThis.fetch
  let resolveResponse!: (response: Response) => void
  let seenSignal: AbortSignal | null | undefined
  let notifications = 0
  const response = new Promise<Response>((resolve) => { resolveResponse = resolve })
  globalThis.fetch = (async (_input, init) => { seenSignal = init?.signal; return response }) as typeof fetch
  resetAuthFailureNotification()
  const unsubscribe = subscribeAuthFailures(() => { notifications++ })
  try {
    const controller = new AbortController()
    const request = apiRequest('/api/v1/protected', { signal: controller.signal })
    assert.equal(seenSignal, controller.signal)
    controller.abort()
    resolveResponse(problem(401, 'AUTHENTICATION_REQUIRED', 'expired'))
    await assert.rejects(request)
    assert.equal(notifications, 0)
  } finally {
    unsubscribe()
    resetAuthFailureNotification()
    globalThis.fetch = original
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
      reason: 'SOME_REASON',
    }),
  )
  try {
    await assert.rejects(apiRequest('/api/v1/thing'), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 400)
      assert.equal(error.code, 'VALIDATION_FAILED')
      assert.equal(error.reason, 'SOME_REASON')
      assert.deepEqual(error.fieldErrors, [
        { field: 'questionText', code: 'INVALID', message: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
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

test('describeApiError gives a Thai message per status and hides arbitrary server detail', () => {
  const fallback = 'fallback'

  assert.match(describeApiError(new ApiError(401, ''), fallback), /เข้าสู่ระบบ/)
  assert.match(describeApiError(new ApiError(403, '', 'CSRF_INVALID'), fallback), /CSRF/)
  assert.match(describeApiError(new ApiError(403, '', 'ACCESS_DENIED'), fallback), /ไม่มีสิทธิ์/)
  assert.match(describeApiError(new ApiError(404, ''), fallback), /ไม่พบ/)
  assert.match(describeApiError(new ApiError(409, 'Round was modified'), fallback), /ข้อมูลขัดแย้ง/)
  assert.doesNotMatch(describeApiError(new ApiError(409, 'SECRET SQL detail'), fallback), /SECRET|SQL/)
  assert.equal(
    describeApiError(new ApiError(409, 'conflict', 'RESOURCE_CONFLICT', [], 'ROUND_CLOSED'), fallback),
    'รอบรับสมัครนี้ปิดรับใบสมัครแล้ว',
  )
  assert.match(describeApiError(new ApiError(409, 'conflict', 'RESOURCE_CONFLICT', [], 'UNLISTED'), fallback), /ข้อมูลขัดแย้ง/)
  assert.match(describeApiError(new ApiError(503, ''), fallback), /ไม่พร้อม/)
  assert.equal(describeApiError(new ApiError(500, ''), fallback), fallback)
  assert.match(
    describeApiError(
      new ApiError(400, '', 'VALIDATION_FAILED', [{ field: 'name', code: 'REQUIRED', message: 'required' }]),
      fallback,
    ),
    /name: จำเป็น/,
  )
})

test('describeApiError reports a network failure for fetch TypeErrors', () => {
  assert.match(describeApiError(new TypeError('Failed to fetch'), 'fallback'), /เชื่อมต่อเซิร์ฟเวอร์ไม่ได้/)
  assert.equal(describeApiError(new Error('other'), 'fallback'), 'fallback')
})

for (const status of [400, 403, 404, 409, 500, 503]) {
  test(`HTTP ${status} never displays raw server detail, title, HTML or SQL`, async () => {
    const secret = '<html>SECRET SELECT password FROM private_table java.sql.Exception /private/key</html>'
    const stub = stubFetch(() => problem(status, status === 409 ? 'RESOURCE_CONFLICT' : 'UNKNOWN', secret, { title: secret }))
    try {
      await assert.rejects(apiRequest('/api/v1/resource'), (error: unknown) => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, status)
        assert.doesNotMatch(error.message, /SECRET|SELECT|private_table|<html>/)
        assert.doesNotMatch(describeApiError(error, 'ไม่สามารถดำเนินการได้'), /SECRET|SELECT|private_table|<html>/)
        return true
      })
    } finally { stub.restore() }
  })
}

test('HTTP status is authoritative and traceId is retained for diagnostics', async () => {
  const stub = stubFetch(() => problem(404, 'RESOURCE_NOT_FOUND', 'SECRET', { status: 500, traceId: 'fictional-trace' }))
  try {
    await assert.rejects(apiRequest('/api/v1/resource'), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 404)
      assert.equal(error.traceId, 'fictional-trace')
      assert.equal(describeApiError(error, 'fallback'), 'ไม่พบข้อมูลที่ต้องการ')
      return true
    })
  } finally { stub.restore() }
})

test('malformed error JSON becomes a safe ApiError', async () => {
  const stub = stubFetch(() => new Response('{SECRET', { status: 500, headers: { 'Content-Type': 'application/problem+json' } }))
  try {
    await assert.rejects(apiRequest('/api/v1/resource'), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 500)
      assert.doesNotMatch(error.message, /SECRET/)
      return true
    })
  } finally { stub.restore() }
})

test('invalid success JSON reports a safe client error instead of a raw parser message', async () => {
  const stub = stubFetch(() => new Response('{SECRET', { status: 200 }))
  try { await assert.rejects(apiRequest('/api/v1/resource'), /ไม่สามารถอ่านข้อมูลตอบกลับ/) }
  finally { stub.restore() }
})

test('field paths and codes survive while rejected secrets are not displayed', async () => {
  const stub = stubFetch(() => problem(400, 'VALIDATION_FAILED', 'SECRET', { fieldErrors: [
    { field: 'links[0].url', code: 'INVALID_HTTPS_URL', message: 'SECRET javascript:alert(1)' },
    { field: '<script>SECRET</script>', code: 'INVALID', message: 'SECRET' },
  ] }))
  try {
    await assert.rejects(apiRequest('/api/v1/resource'), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.deepEqual(error.fieldErrors, [{ field: 'links[0].url', code: 'INVALID_HTTPS_URL', message: 'กรุณาระบุลิงก์ HTTPS ที่ถูกต้อง' }])
      assert.doesNotMatch(describeApiError(error, 'fallback'), /SECRET|javascript|script/)
      return true
    })
  } finally { stub.restore() }
})

test('concurrent 401 responses notify AuthProvider once and never create client Toasts', async () => {
  resetAuthFailureNotification()
  const notifications: string[] = []
  const unsubscribe = subscribeAuthFailures(value => notifications.push(value))
  const stub = stubFetch(() => problem(401, 'AUTHENTICATION_REQUIRED', 'SECRET'))
  try {
    const results = await Promise.allSettled([apiRequest('/api/v1/a'), apiRequest('/api/v1/b')])
    assert.equal(results.filter(result => result.status === 'rejected').length, 2)
    assert.deepEqual(notifications, ['session-expired'])
    resetAuthFailureNotification()
    await assert.rejects(apiRequest('/api/v1/c'))
    assert.deepEqual(notifications, ['session-expired', 'session-expired'])
  } finally { unsubscribe(); resetAuthFailureNotification(); stub.restore() }
})

test('RBAC and CSRF denials do not trigger Login flow or automatic write retries', async () => {
  resetAuthFailureNotification()
  const notifications: string[] = []
  const unsubscribe = subscribeAuthFailures(value => notifications.push(value))
  for (const code of ['ACCESS_DENIED', 'CSRF_INVALID']) {
    const stub = stubFetch(request => request.url === '/api/v1/auth/csrf' ? csrfResponse() : problem(403, code, 'SECRET'))
    try {
      await assert.rejects(apiRequest('/api/v1/thing', { method: 'POST', body: {} }), (error: unknown) => {
        assert.ok(error instanceof ApiError); assert.equal(error.code, code); return true
      })
      assert.equal(stub.requests.length, 2)
      assert.deepEqual(notifications, [])
    } finally { stub.restore() }
  }
  unsubscribe(); resetAuthFailureNotification()
})

test('Login rejection does not create a session-expired notification', async () => {
  resetAuthFailureNotification()
  const notices: string[] = []
  const unsubscribe = subscribeAuthFailures(value => notices.push(value))
  const stub = stubFetch(request => request.url === '/api/v1/auth/csrf' ? csrfResponse() : problem(401, 'AUTHENTICATION_FAILED', 'SECRET'))
  try {
    await assert.rejects(apiRequest('/api/v1/auth/login', { method: 'POST', body: {} }), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.match(error.message, /ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง/)
      return true
    })
    assert.deepEqual(notices, [])
  } finally { unsubscribe(); resetAuthFailureNotification(); stub.restore() }
})

test('fetch network errors retain their network-specific UI message', async () => {
  const stub = stubFetch(() => { throw new TypeError('SECRET transport detail') })
  try {
    await assert.rejects(apiRequest('/api/v1/resource'), (error: unknown) => {
      assert.match(describeApiError(error, 'fallback'), /เชื่อมต่อเซิร์ฟเวอร์ไม่ได้/)
      assert.doesNotMatch(describeApiError(error, 'fallback'), /SECRET/)
      return true
    })
  } finally { stub.restore() }
})

test('unknown reason and field codes cannot resolve Object prototype members', async () => {
  for (const reason of ['__proto__', 'constructor', 'toString']) {
    const text = describeApiError(new ApiError(409, 'SECRET', 'RESOURCE_CONFLICT', [], reason), 'fallback')
    assert.equal(typeof text, 'string')
    assert.match(text, /ข้อมูลขัดแย้ง/)
  }
  const stub = stubFetch(() => problem(400, 'VALIDATION_FAILED', 'SECRET', {
    fieldErrors: [{ field: 'name', code: '__proto__', message: 'SECRET' }],
  }))
  try {
    await assert.rejects(apiRequest('/api/v1/resource'), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(typeof error.fieldErrors[0].message, 'string')
      assert.doesNotMatch(error.fieldErrors[0].message, /SECRET|Object/)
      return true
    })
  } finally { stub.restore() }
})

test('500 UI uses only a safe reference ID and never an arbitrary trace string', () => {
  const id = '00000000-0000-4000-8000-000000000080'
  assert.equal(describeApiError(new ApiError(500, 'SECRET', 'INTERNAL_ERROR', [], undefined, id), 'ไม่สามารถดำเนินการได้'),
    `ไม่สามารถดำเนินการได้ (รหัสอ้างอิง: ${id})`)
  assert.equal(describeApiError(new ApiError(500, 'SECRET', 'INTERNAL_ERROR', [], undefined, '<html>SECRET SQL</html>'), 'ไม่สามารถดำเนินการได้'),
    'ไม่สามารถดำเนินการได้')
})
