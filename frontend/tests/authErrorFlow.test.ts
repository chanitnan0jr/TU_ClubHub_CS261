import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { apiRequest, resetAuthFailureNotification } from '../src/lib/api.ts'
import { csrfResponse, json, problem, stubFetch } from './helpers.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, {
  React, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
const { cleanup, render, screen, waitFor, act, fireEvent } = await import('@testing-library/react')
const { MemoryRouter, Routes, Route, useLocation, useNavigate } = await import('react-router')
const { AuthProvider, useAuth } = await import('../src/features/auth/AuthContext.tsx')
const { default: RequireAuth } = await import('../src/app/RequireAuth.tsx')
const { default: LoginPage } = await import('../src/pages/LoginPage.tsx')
const { default: App } = await import('../src/App.tsx')

function app() {
  return createElement(MemoryRouter, { initialEntries: ['/protected'] }, createElement(AuthProvider, null,
    createElement(Routes, null,
      createElement(Route, { path: '/protected', element: createElement(RequireAuth, null, createElement('h1', null, 'Protected content')) }),
      createElement(Route, { path: '/login', element: createElement(LoginPage) }),
    )))
}

for (const [status, code, expected] of [
  [401, 'AUTHENTICATION_REQUIRED', /เซสชันหมดอายุ/],
  [403, 'ACCOUNT_NOT_ALLOWED', /บัญชีนี้ไม่ได้รับอนุญาต/],
] as const) {
  test(`${code} clears stale authentication and shows one safe notice on the Login route`, async () => {
    resetAuthFailureNotification()
    const stub = stubFetch(request => request.url === '/api/v1/auth/me'
      ? json({ user: { id: '10001', role: 'USER' } })
      : request.url === '/api/v1/auth/csrf' ? csrfResponse() : problem(status, code, '<html>SECRET SQL</html>'))
    try {
      render(app())
      await waitFor(() => assert.ok(screen.getByRole('heading', { name: 'Protected content' })))
      await act(async () => { await assert.rejects(apiRequest('/api/v1/failing-resource')) })
      await waitFor(() => assert.equal(screen.getAllByText(expected).length, 1))
      assert.equal(screen.getAllByRole('alert').length, 1)
      assert.equal(screen.queryByRole('heading', { name: 'Protected content' }), null)
      assert.doesNotMatch(document.body.textContent ?? '', /SECRET|SQL|<html>/)
    } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
  })
}

test('a permission denial does not log out or navigate an authenticated user', async () => {
  resetAuthFailureNotification()
  const stub = stubFetch(request => request.url === '/api/v1/auth/me'
    ? json({ user: { id: '10001', role: 'USER' } }) : problem(403, 'ACCESS_DENIED', 'SECRET'))
  try {
    render(app())
    await waitFor(() => assert.ok(screen.getByRole('heading', { name: 'Protected content' })))
    await act(async () => { await assert.rejects(apiRequest('/api/v1/failing-resource')) })
    assert.ok(screen.getByRole('heading', { name: 'Protected content' }))
    assert.equal(screen.queryByText(/เซสชันหมดอายุ/), null)
  } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
})

test('a late bootstrap response cannot restore a session invalidated by a concurrent 401', async () => {
  resetAuthFailureNotification()
  let resolveSession!: (response: Response) => void
  const session = new Promise<Response>(resolve => { resolveSession = resolve })
  const stub = stubFetch(request => request.url === '/api/v1/auth/me' ? session : problem(401, 'AUTHENTICATION_REQUIRED', 'SECRET'))
  try {
    render(app())
    await act(async () => {
      await assert.rejects(apiRequest('/api/v1/failing-resource'))
      resolveSession(json({ user: { id: '10001', role: 'USER' } }))
    })
    await waitFor(() => assert.ok(screen.getByText(/เซสชันหมดอายุ/)))
    assert.equal(screen.queryByRole('heading', { name: 'Protected content' }), null)
  } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
})

test('a late failed bootstrap cannot clear a newer successful Login', async () => {
  resetAuthFailureNotification()
  let resolveSession!: (response: Response) => void
  const oldSession = new Promise<Response>(resolve => { resolveSession = resolve })
  let sessionRequests = 0
  let login!: (username: string, password: string) => Promise<void>
  function AuthProbe() {
    const auth = useAuth()
    React.useEffect(() => { login = auth.login }, [auth.login])
    return createElement('h1', null, auth.user?.id ?? 'Anonymous')
  }
  const stub = stubFetch(request => request.url === '/api/v1/auth/csrf' ? csrfResponse()
    : request.url === '/api/v1/auth/me' && ++sessionRequests === 1 ? oldSession
    : json({ user: { id: '10002', role: 'USER' } }))
  try {
    render(createElement(AuthProvider, null, createElement(AuthProbe)))
    await waitFor(() => assert.equal(sessionRequests, 1))
    await act(async () => { await login('fictional-student', 'fictional-password') })
    assert.ok(screen.getByRole('heading', { name: '10002' }))
    await act(async () => { resolveSession(problem(401, 'AUTHENTICATION_REQUIRED', 'SECRET')) })
    assert.ok(screen.getByRole('heading', { name: '10002' }))
  } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
})

const loginSuccessText = 'เข้าสู่ระบบสำเร็จ'
const loadedUser = { id: '10002', role: 'USER', displayName: 'นักศึกษาทดสอบ', activeCommitteeAssignments: [] }
// The current contract has no status/message fields. HTTP 200 + the existing
// user/csrf response followed by /auth/me must be sufficient for this flow.
const loginReceipt = { user: { id: '10002', role: 'USER' }, csrf: { headerName: 'X-CSRF-TOKEN', token: 'fresh-csrf' } }

function LocationProbe() {
  const location = useLocation()
  const navigate = useNavigate()
  return createElement(React.Fragment, null,
    createElement('p', { 'data-testid': 'auth-location' }, location.pathname + location.search + location.hash),
    createElement('button', { onClick: () => navigate('/dashboard?again=1') }, 'Test navigation'))
}

function issue78App(entry = '/login?next=%2Fdashboard%3Ftab%3Dclubs%23summary') {
  // Render the production App, not a test-only copy of the success notification.
  return createElement(MemoryRouter, { initialEntries: [entry] }, createElement(AuthProvider, null,
    createElement(LocationProbe), createElement(App)))
}

async function submitLoginForm() {
  await screen.findByRole('heading', { name: 'เข้าสู่ระบบ', level: 1 })
  fireEvent.change(screen.getByLabelText('รหัสนักศึกษา / TU Great ID'), { target: { value: 'fictional-student' } })
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'fictional-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))
}

function assertNoLoginSuccess() {
  assert.equal(screen.queryByText(loginSuccessText), null)
  assert.equal(screen.queryByRole('button', { name: 'ปิดข้อความเข้าสู่ระบบสำเร็จ' }), null)
}

test('fresh login waits for /auth/me, preserves next query/hash and announces success after navigation', async () => {
  resetAuthFailureNotification()
  let submitted = false
  let resolveSession!: (response: Response) => void
  const session = new Promise<Response>(resolve => { resolveSession = resolve })
  const stub = stubFetch(request => {
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/auth/login') { submitted = true; return json(loginReceipt) }
    if (request.url === '/api/v1/auth/me') return submitted ? session : problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
    throw new Error('Unexpected request: ' + request.url)
  })
  try {
    render(issue78App())
    const region = screen.getByRole('status')
    assertNoLoginSuccess()
    await submitLoginForm()
    await waitFor(() => assert.equal(stub.requests.filter(r => r.url === '/api/v1/auth/me').length, 2))
    assert.ok(screen.getByRole('heading', { name: 'เข้าสู่ระบบ', level: 1 }))
    assertNoLoginSuccess() // Login's HTTP 200 alone is not a fully loaded session.
    await act(async () => { resolveSession(json({ user: loadedUser })) })
    await screen.findByRole('heading', { name: 'สวัสดี นักศึกษาทดสอบ' })
    assert.equal(screen.getByTestId('auth-location').textContent, '/dashboard?tab=clubs#summary')
    const success = screen.getByText(loginSuccessText)
    assert.equal(success.closest('[role="status"]'), region, 'Use a pre-mounted live region so its text update can be announced')
    assert.equal(region.getAttribute('aria-live'), 'polite')
    assert.equal(region.getAttribute('aria-atomic'), 'true')
    assert.equal(screen.getAllByText(loginSuccessText).length, 1)
    assert.equal(screen.queryByRole('alert'), null)
    const post = stub.requests.find(r => r.url === '/api/v1/auth/login')!
    assert.equal(post.headers['X-CSRF-TOKEN'], 'csrf-token')
    assert.deepEqual(post.body, { username: 'fictional-student', password: 'fictional-password' })
    fireEvent.click(screen.getByRole('button', { name: 'ปิดข้อความเข้าสู่ระบบสำเร็จ' }))
    assertNoLoginSuccess()
    fireEvent.click(screen.getByRole('button', { name: 'Test navigation' }))
    await waitFor(() => assert.equal(screen.getByTestId('auth-location').textContent, '/dashboard?again=1'))
    assertNoLoginSuccess()
  } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
})

for (const [status, code, expected] of [
  [401, 'AUTHENTICATION_FAILED', /ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง/],
  [403, 'ACCOUNT_NOT_ALLOWED', /บัญชีนี้ไม่ได้รับอนุญาต/],
  [503, 'AUTH_PROVIDER_UNAVAILABLE', /ระบบไม่พร้อมใช้งาน/],
] as const) {
  test(`login rejection ${status} ${code} never announces success or redirects`, async () => {
    resetAuthFailureNotification()
    const stub = stubFetch(request => request.url === '/api/v1/auth/csrf' ? csrfResponse()
      : request.url === '/api/v1/auth/me' ? problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
      : problem(status, code, 'SECRET SQL'))
    try {
      render(issue78App())
      await submitLoginForm()
      await waitFor(() => assert.match(screen.getByRole('alert').textContent ?? '', expected))
      assertNoLoginSuccess()
      assert.match(screen.getByTestId('auth-location').textContent ?? '', /^\/login\?/)
      assert.equal(stub.requests.filter(r => r.url === '/api/v1/auth/me').length, 1)
      assert.doesNotMatch(document.body.textContent ?? '', /SECRET|SQL/)
    } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
  })
}

for (const scenario of ['unauthorized', 'unavailable', 'null-user', 'missing-user'] as const) {
  test(`login 200 followed by ${scenario} session load never announces success`, async () => {
    resetAuthFailureNotification()
    let submitted = false
    const stub = stubFetch(request => {
      if (request.url === '/api/v1/auth/csrf') return csrfResponse()
      if (request.url === '/api/v1/auth/login') { submitted = true; return json(loginReceipt) }
      if (!submitted) return problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
      if (scenario === 'unauthorized') return problem(401, 'AUTHENTICATION_REQUIRED', 'SECRET SQL')
      if (scenario === 'unavailable') return problem(503, 'SERVICE_UNAVAILABLE', 'SECRET SQL')
      return json(scenario === 'null-user' ? { user: null } : {})
    })
    try {
      render(issue78App())
      await submitLoginForm()
      await waitFor(() => assert.ok(screen.getByRole('alert').textContent))
      assertNoLoginSuccess()
      assert.ok(screen.getByRole('heading', { name: 'เข้าสู่ระบบ', level: 1 }))
      assert.match(screen.getByTestId('auth-location').textContent ?? '', /^\/login\?/)
      assert.doesNotMatch(document.body.textContent ?? '', /SECRET|SQL/)
      assert.equal(stub.requests.filter(r => r.url === '/api/v1/auth/me').length, 2)
    } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
  })
}

test('session restoration and a reload after a fresh login do not replay the success notice', async () => {
  resetAuthFailureNotification()
  let authenticated = true
  const stub = stubFetch(request => {
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/auth/login') { authenticated = true; return json(loginReceipt) }
    return authenticated ? json({ user: loadedUser }) : problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
  })
  try {
    render(issue78App('/dashboard'))
    await screen.findByRole('heading', { name: 'สวัสดี นักศึกษาทดสอบ' })
    assertNoLoginSuccess()
    assert.equal(stub.requests.filter(r => r.url === '/api/v1/auth/login').length, 0)
    cleanup()
    authenticated = false
    render(issue78App())
    await submitLoginForm()
    await screen.findByText(loginSuccessText)
    cleanup() // Fresh provider simulates reloading while the server session survives.
    render(issue78App('/dashboard'))
    await screen.findByRole('heading', { name: 'สวัสดี นักศึกษาทดสอบ' })
    assertNoLoginSuccess()
    assert.equal(stub.requests.filter(r => r.url === '/api/v1/auth/login').length, 1)
  } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
})

test('a session invalidated while the login session load is pending cannot announce stale success', async () => {
  resetAuthFailureNotification()
  let submitted = false
  let resolveSession!: (response: Response) => void
  const session = new Promise<Response>(resolve => { resolveSession = resolve })
  const stub = stubFetch(request => {
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/auth/login') { submitted = true; return json(loginReceipt) }
    if (request.url === '/api/v1/auth/me') return submitted ? session : problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
    return problem(401, 'AUTHENTICATION_REQUIRED', 'Expired')
  })
  try {
    render(issue78App())
    await submitLoginForm()
    await waitFor(() => assert.equal(stub.requests.filter(r => r.url === '/api/v1/auth/me').length, 2))
    await act(async () => {
      await assert.rejects(apiRequest('/api/v1/failing-resource'))
      resolveSession(json({ user: loadedUser }))
    })
    await waitFor(() => assert.ok(screen.getByRole('alert')))
    assertNoLoginSuccess()
    assert.ok(screen.getByRole('heading', { name: 'เข้าสู่ระบบ', level: 1 }))
    assert.match(screen.getByTestId('auth-location').textContent ?? '', /^\/login\?/)
  } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
})

test('a visitor returns to the originally protected page and sees the confirmation there', async () => {
  resetAuthFailureNotification()
  let authenticated = false
  const stub = stubFetch(request => {
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/auth/login') { authenticated = true; return json(loginReceipt) }
    if (request.url === '/api/v1/auth/me') return authenticated
      ? json({ user: loadedUser }) : problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
    if (request.url.startsWith('/api/v1/me/applications?')) return json({
      items: [], page: { number: 1, size: 20, totalElements: 0, totalPages: 0 },
    })
    throw new Error('Unexpected request: ' + request.url)
  })
  try {
    render(issue78App('/profile/applications?page=2'))
    await submitLoginForm()
    await screen.findByRole('heading', { name: 'คุณยังไม่มีประวัติการสมัครชมรม' })
    assert.equal(screen.getByTestId('auth-location').textContent, '/profile/applications?page=2')
    assert.equal(screen.getAllByText(loginSuccessText).length, 1)
  } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
})

for (const entry of ['/login', '/login?next=https%3A%2F%2Fevil.example%2F', '/LOGIN/?next=%2Fdashboard']) {
  test(`login confirmation preserves the redirect policy for ${entry}`, async () => {
    resetAuthFailureNotification()
    let authenticated = false
    const stub = stubFetch(request => {
      if (request.url === '/api/v1/auth/csrf') return csrfResponse()
      if (request.url === '/api/v1/auth/login') { authenticated = true; return json(loginReceipt) }
      if (request.url === '/api/v1/auth/me') return authenticated
        ? json({ user: loadedUser }) : problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
      if (request.url.startsWith('/api/v1/public/')) return json({
        items: [], page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
      })
      throw new Error('Unexpected request: ' + request.url)
    })
    try {
      render(issue78App(entry))
      await submitLoginForm()
      await screen.findByText(loginSuccessText)
      assert.equal(screen.getByTestId('auth-location').textContent, entry.startsWith('/LOGIN/') ? '/dashboard' : '/')
      assert.equal(screen.queryByRole('heading', { name: 'เข้าสู่ระบบ', level: 1 }), null)
    } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
  })
}

test('logout clears the previous confirmation and a subsequent explicit login can announce again', async () => {
  resetAuthFailureNotification()
  let authenticated = false
  const stub = stubFetch(request => {
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/auth/login') { authenticated = true; return json(loginReceipt) }
    if (request.url === '/api/v1/auth/logout') { authenticated = false; return new Response(null, { status: 204 }) }
    if (request.url === '/api/v1/auth/me') return authenticated
      ? json({ user: loadedUser }) : problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
    throw new Error('Unexpected request: ' + request.url)
  })
  try {
    render(issue78App())
    await submitLoginForm()
    await screen.findByText(loginSuccessText)
    fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }))
    await screen.findByRole('heading', { name: 'เข้าสู่ระบบ', level: 1 })
    assertNoLoginSuccess()
    await submitLoginForm()
    await screen.findByText(loginSuccessText)
    assert.equal(screen.getAllByText(loginSuccessText).length, 1)
    assert.equal(stub.requests.filter(r => r.url === '/api/v1/auth/login').length, 2)
  } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
})

for (const stage of ['login', 'session'] as const) {
  test(`a network failure during ${stage} shows a safe error without a success notice`, async () => {
    resetAuthFailureNotification()
    let submitted = false
    const stub = stubFetch(request => {
      if (request.url === '/api/v1/auth/csrf') return csrfResponse()
      if (request.url === '/api/v1/auth/login') {
        if (stage === 'login') throw new TypeError('SECRET transport information')
        submitted = true
        return json(loginReceipt)
      }
      if (submitted) throw new TypeError('SECRET transport information')
      return problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
    })
    try {
      render(issue78App())
      await submitLoginForm()
      await waitFor(() => assert.match(screen.getByRole('alert').textContent ?? '', /เชื่อมต่อเซิร์ฟเวอร์ไม่ได้/))
      assertNoLoginSuccess()
      assert.match(screen.getByTestId('auth-location').textContent ?? '', /^\/login\?/)
      assert.doesNotMatch(document.body.textContent ?? '', /SECRET/)
    } finally { cleanup(); resetAuthFailureNotification(); stub.restore() }
  })
}
