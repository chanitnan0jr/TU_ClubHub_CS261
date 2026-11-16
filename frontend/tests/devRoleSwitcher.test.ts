import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { resetAuthFailureNotification } from '../src/lib/api.ts'
import { csrfResponse, json, problem, stubFetch } from './helpers.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, {
  React,
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })

const { cleanup, render, screen, waitFor, fireEvent } = await import('@testing-library/react')
const { MemoryRouter, useLocation } = await import('react-router')
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { default: DevRoleSwitcherPill } = await import('../src/features/auth/DevRoleSwitcherPill.tsx')

const DEV_ACCOUNTS = [
  { role: 'USER', username: 'applicant-demo', displayName: 'Demo Applicant', label: 'นักศึกษาทั่วไป' },
  { role: 'ADMIN', username: 'admin-demo', displayName: 'Demo Admin', label: 'ผู้ดูแลระบบ' },
  { role: 'COMMITTEE', username: 'committee-demo', displayName: 'Demo Committee', label: 'กรรมการชมรม' },
  { role: 'PRESIDENT', username: 'student-demo', displayName: 'Demo Student', label: 'ประธานชมรม' },
]

function LocationProbe() {
  const location = useLocation()
  return createElement('p', { 'data-testid': 'location' }, location.pathname)
}

function renderPill(initialEntry = '/login') {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [initialEntry] },
      createElement(
        AuthProvider,
        { devSwitcherProbe: true },
        createElement(LocationProbe),
        createElement(DevRoleSwitcherPill),
      ),
    ),
  )
}

test('stays hidden when /api/v1/auth/dev/accounts returns 404', async () => {
  resetAuthFailureNotification()
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/auth/me') return problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
    if (request.url === '/api/v1/auth/dev/accounts') return problem(404, 'NOT_FOUND', 'Disabled')
    throw new Error('Unexpected request: ' + request.url)
  })
  try {
    renderPill('/')
    await waitFor(() => assert.ok(stub.requests.some((r) => r.url === '/api/v1/auth/dev/accounts')))
    assert.equal(screen.queryByRole('complementary', { name: 'Dev Role Switcher' }), null)
  } finally {
    cleanup()
    resetAuthFailureNotification()
    stub.restore()
  }
})

test('switches across USER, ADMIN, COMMITTEE, PRESIDENT and navigates to role landing routes', async () => {
  resetAuthFailureNotification()
  const usersByRole = {
    USER: { id: '1', role: 'USER', displayName: 'Demo Applicant', activeCommitteeAssignments: [] },
    ADMIN: { id: '2', role: 'ADMIN', displayName: 'Demo Admin', activeCommitteeAssignments: [] },
    COMMITTEE: {
      id: '3',
      role: 'USER',
      displayName: 'Demo Committee',
      activeCommitteeAssignments: [{
        clubId: '10',
        clubName: 'ชมรมเขียนโปรแกรม',
        permissionRole: 'COMMITTEE',
        positionName: 'กรรมการชมรม (dev)',
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2027-01-01T00:00:00Z',
      }],
    },
    PRESIDENT: {
      id: '4',
      role: 'USER',
      displayName: 'Demo Student',
      activeCommitteeAssignments: [{
        clubId: '10',
        clubName: 'ชมรมเขียนโปรแกรม',
        permissionRole: 'PRESIDENT',
        positionName: 'ประธานชมรม (dev)',
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2027-01-01T00:00:00Z',
      }],
    },
  } as const

  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/auth/me') return problem(401, 'AUTHENTICATION_REQUIRED', 'Anonymous')
    if (request.url === '/api/v1/auth/dev/accounts') return json({ accounts: DEV_ACCOUNTS })
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/auth/dev/switch') {
      const role = (request.body as { role: keyof typeof usersByRole }).role
      return json({ user: usersByRole[role] })
    }
    throw new Error('Unexpected request: ' + request.url)
  })

  try {
    renderPill('/login')
    await screen.findByRole('complementary', { name: 'Dev Role Switcher' })

    fireEvent.click(screen.getByRole('button', { name: 'ADMIN' }))
    await waitFor(() => assert.equal(screen.getByTestId('location').textContent, '/admin/dashboard'))
    assert.equal(screen.getByRole('button', { name: 'ADMIN' }).getAttribute('aria-pressed'), 'true')

    fireEvent.click(screen.getByRole('button', { name: 'COMMITTEE' }))
    await waitFor(() => assert.equal(screen.getByTestId('location').textContent, '/clubs/10/manage'))
    assert.equal(screen.getByRole('button', { name: 'COMMITTEE' }).getAttribute('aria-pressed'), 'true')

    fireEvent.click(screen.getByRole('button', { name: 'PRESIDENT' }))
    await waitFor(() => assert.equal(screen.getByTestId('location').textContent, '/clubs/10/manage'))
    assert.equal(screen.getByRole('button', { name: 'PRESIDENT' }).getAttribute('aria-pressed'), 'true')

    fireEvent.click(screen.getByRole('button', { name: 'USER' }))
    await waitFor(() => assert.equal(screen.getByTestId('location').textContent, '/'))
    assert.equal(screen.getByRole('button', { name: 'USER' }).getAttribute('aria-pressed'), 'true')

    // Collapse and expand
    fireEvent.click(screen.getByRole('button', { name: 'ซ่อนแถบสลับบทบาท Dev' }))
    assert.ok(screen.getByRole('button', { name: 'เปิดแถบสลับบทบาท Dev' }))
    fireEvent.click(screen.getByRole('button', { name: 'เปิดแถบสลับบทบาท Dev' }))
    assert.ok(screen.getByRole('button', { name: 'USER' }))

    const switchRequests = stub.requests.filter((r) => r.url === '/api/v1/auth/dev/switch')
    assert.equal(switchRequests.length, 4)
    assert.equal(switchRequests[0].headers['X-CSRF-TOKEN'], 'csrf-token')
  } finally {
    cleanup()
    resetAuthFailureNotification()
    stub.restore()
  }
})
