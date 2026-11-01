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
const { cleanup, render, screen, waitFor, act } = await import('@testing-library/react')
const { MemoryRouter, Routes, Route } = await import('react-router')
const { AuthProvider, useAuth } = await import('../src/features/auth/AuthContext.tsx')
const { default: RequireAuth } = await import('../src/app/RequireAuth.tsx')
const { default: LoginPage } = await import('../src/pages/LoginPage.tsx')

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
