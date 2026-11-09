import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { json, problem, stubFetch } from './helpers.ts'
import type { AdminDashboardStatsResponse } from '../src/features/admin-dashboard/types/dashboard.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, {
  React, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })

const { act, cleanup, fireEvent, render, screen, waitFor, within } = await import('@testing-library/react')
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { resetAuthFailureNotification } = await import('../src/lib/api.ts')
const { CentralDashboardPage } = await import('../src/features/admin-dashboard/pages/CentralDashboardPage.tsx')

const categories = { items: [{ id: '1', name: 'เทคโนโลยี' }, { id: '2', name: 'กีฬา' }] }
function dashboard(page: number): AdminDashboardStatsResponse {
  return {
    generatedAt: '2026-11-09T00:00:00Z',
    filters: { academicYear: null, semester: null, categoryId: null, clubStatus: 'ALL' },
    summary: {
      totalClubs: 21, activeClubs: 20, inactiveClubs: 1, clubsCurrentlyRecruiting: 1,
      totalRecruitmentRounds: 1, openRecruitmentRounds: 1, totalApplications: 100,
      uniqueApplicants: 80, confirmedNewMembers: 4, currentActiveMemberships: 10,
      confirmationRatePercent: 40,
      statusBreakdown: { SUBMITTED: 10, UNDER_REVIEW: 25, ACCEPTED: 6, REJECTED: 0, CONFIRMED: 4, DECLINED: 0, WITHDRAWN: 0, EXPIRED: 0 },
    },
    categoryBreakdown: [], topClubs: [],
    clubs: {
      items: [{
        clubId: String(page + 1), clubName: page === 0 ? 'ชมรมหน้าแรก' : 'ชมรมหน้าถัดไป',
        category: { id: '1', name: 'เทคโนโลยี' }, clubStatus: 'ACTIVE', hasOpenRecruitment: true,
        roundCount: 1, totalApplications: 35, submittedCount: 4, underReviewCount: 25,
        acceptedCount: 6, rejectedCount: 0, confirmedCount: 4, declinedCount: 0,
        withdrawnCount: 0, expiredCount: 0, activeMemberCount: 10,
      }],
      page: { number: page, size: 20, totalElements: 21, totalPages: 2 },
    },
  }
}
const renderPage = () => render(createElement(AuthProvider, null, createElement(CentralDashboardPage)))
const statsRequests = (requests: { url: string }[]) => requests.filter(r => r.url.startsWith('/api/v1/admin/dashboard/stats?'))
const pageOf = (url: string) => new URL(url, 'http://localhost').searchParams
function cleanupAfter(restore: () => void) { cleanup(); resetAuthFailureNotification(); restore() }

test('ADMIN sees page zero first and can navigate without losing the first page', async () => {
  const stub = stubFetch(req => {
    if (req.url === '/api/v1/auth/me') return json({ user: { id: '1', role: 'ADMIN' } })
    if (req.url === '/api/v1/public/club-categories') return json(categories)
    if (req.url.startsWith('/api/v1/admin/dashboard/stats?')) return json(dashboard(Number(pageOf(req.url).get('page'))))
    return problem(404, 'NOT_FOUND', 'unexpected')
  })
  try {
    renderPage()
    const first = await screen.findByRole('row', { name: /ชมรมหน้าแรก/ })
    assert.equal(pageOf(statsRequests(stub.requests)[0].url).get('page'), '0')
    assert.equal(within(first).getAllByRole('cell')[5].textContent, '6')
    assert.ok(screen.getByText('สมาชิกภาพใหม่ที่ยืนยันสิทธิ์'))
    assert.ok(screen.getByText('สมาชิกภาพชมรมปัจจุบัน (Active)'))
    assert.equal((screen.getByRole('button', { name: /ก่อนหน้า/ }) as HTMLButtonElement).disabled, true)
    assert.match(screen.getByRole('button', { name: /ก่อนหน้า/ }).parentElement?.textContent ?? '', /หน้า\s*1\s*จาก\s*2/)
    fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }))
    await screen.findByRole('row', { name: /ชมรมหน้าถัดไป/ })
    assert.equal(pageOf(statsRequests(stub.requests).at(-1)!.url).get('page'), '1')
    assert.equal((screen.getByRole('button', { name: /ถัดไป/ }) as HTMLButtonElement).disabled, true)
    fireEvent.click(screen.getByRole('button', { name: /ก่อนหน้า/ }))
    await screen.findByRole('row', { name: /ชมรมหน้าแรก/ })
  } finally { cleanupAfter(stub.restore) }
})

test('USER sees 403 and does not request admin statistics', async () => {
  const stub = stubFetch(req => req.url === '/api/v1/auth/me'
    ? json({ user: { id: '2', role: 'USER' } }) : problem(403, 'ACCESS_DENIED', 'unexpected'))
  try {
    renderPage()
    await screen.findByText(/403 - ไม่สามารถเข้าถึงหน้านี้ได้/)
    assert.equal(statsRequests(stub.requests).length, 0)
    assert.equal(screen.queryByText(/แดชบอร์ดสถิติภาพรวมส่วนกลาง \(Admin Dashboard\)/), null)
  } finally { cleanupAfter(stub.restore) }
})

test('stats API error is shown to an ADMIN without unmounting the page', async () => {
  const stub = stubFetch(req => req.url === '/api/v1/auth/me'
    ? json({ user: { id: '1', role: 'ADMIN' } })
    : req.url === '/api/v1/public/club-categories' ? json(categories)
      : problem(404, 'NOT_FOUND', 'unexpected'))
  try {
    renderPage()
    await screen.findByText('ไม่พบข้อมูลที่ต้องการ')
    assert.ok(screen.getByText(/แดชบอร์ดสถิติภาพรวมส่วนกลาง \(Admin Dashboard\)/))
  } finally { cleanupAfter(stub.restore) }
})

test('expired ADMIN session shows a login prompt instead of 403', async () => {
  let finish!: (response: Response) => void
  const pending = new Promise<Response>(resolve => { finish = resolve })
  const stub = stubFetch(req => req.url === '/api/v1/auth/me'
    ? json({ user: { id: '1', role: 'ADMIN' } })
    : req.url === '/api/v1/public/club-categories' ? json(categories) : pending)
  try {
    renderPage()
    await screen.findByText(/แดชบอร์ดสถิติภาพรวมส่วนกลาง \(Admin Dashboard\)/)
    await act(async () => { finish(problem(401, 'AUTHENTICATION_REQUIRED', 'expired')) })
    await screen.findByText(/เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ/)
    assert.ok(screen.getByRole('link', { name: /เข้าสู่ระบบ/ }))
    assert.equal(screen.queryByText(/403 - ไม่สามารถเข้าถึงหน้านี้ได้/), null)
  } finally { cleanupAfter(stub.restore) }
})

test('category errors are visible and can be retried', async () => {
  let attempts = 0
  const stub = stubFetch(req => {
    if (req.url === '/api/v1/auth/me') return json({ user: { id: '1', role: 'ADMIN' } })
    if (req.url === '/api/v1/public/club-categories') return ++attempts === 1
      ? problem(503, 'SERVICE_UNAVAILABLE', 'unavailable') : json(categories)
    return json(dashboard(0))
  })
  try {
    renderPage()
    await screen.findByText(/โหลดหมวดหมู่ชมรมไม่สำเร็จ/)
    fireEvent.click(screen.getByRole('button', { name: /โหลดหมวดหมู่ใหม่/ }))
    await screen.findByRole('option', { name: 'กีฬา' })
    assert.equal(screen.queryByText(/โหลดหมวดหมู่ชมรมไม่สำเร็จ/), null)
  } finally { cleanupAfter(stub.restore) }
})

test('year and search filters apply arbitrary valid years and clear back to all', async () => {
  const stub = stubFetch(req => {
    if (req.url === '/api/v1/auth/me') return json({ user: { id: '1', role: 'ADMIN' } })
    if (req.url === '/api/v1/public/club-categories') return json(categories)
    return json(dashboard(Number(pageOf(req.url).get('page'))))
  })
  try {
    renderPage()
    await screen.findByRole('row', { name: /ชมรมหน้าแรก/ })
    const year = screen.getByRole('spinbutton', { name: /ปีการศึกษา/ })
    fireEvent.change(year, { target: { value: '2570' } })
    fireEvent.blur(year)
    const search = screen.getByPlaceholderText(/ค้นหาด้วยชื่อชมรม/)
    fireEvent.change(search, { target: { value: 'ดนตรี' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    await waitFor(() => {
      const params = pageOf(statsRequests(stub.requests).at(-1)!.url)
      assert.equal(params.get('academicYear'), '2570')
      assert.equal(params.get('q'), 'ดนตรี')
      assert.equal(params.get('page'), '0')
    })
    fireEvent.click(screen.getByRole('button', { name: /ล้างตัวกรอง/ }))
    await waitFor(() => {
      const params = pageOf(statsRequests(stub.requests).at(-1)!.url)
      assert.equal(params.has('academicYear'), false)
      assert.equal(params.has('q'), false)
      assert.equal(params.has('clubStatus'), false)
      assert.equal(params.get('page'), '0')
    })
    assert.equal((year as HTMLInputElement).value, '')
  } finally { cleanupAfter(stub.restore) }
})

test('invalid academic years are not sent to the API', async () => {
  const stub = stubFetch(req => {
    if (req.url === '/api/v1/auth/me') return json({ user: { id: '1', role: 'ADMIN' } })
    if (req.url === '/api/v1/public/club-categories') return json(categories)
    return json(dashboard(0))
  })
  try {
    renderPage()
    await screen.findByRole('row', { name: /ชมรมหน้าแรก/ })
    const before = statsRequests(stub.requests).length
    const year = screen.getByRole('spinbutton', { name: /ปีการศึกษา/ })
    fireEvent.change(year, { target: { value: '32768' } })
    fireEvent.blur(year)
    assert.ok(screen.getByText(/กรุณาระบุปีการศึกษาเป็นจำนวนเต็ม/))
    assert.equal(statsRequests(stub.requests).length, before)
    fireEvent.change(year, { target: { value: '' } })
    fireEvent.blur(year)
    assert.equal(screen.queryByText(/กรุณาระบุปีการศึกษาเป็นจำนวนเต็ม/), null)
  } finally { cleanupAfter(stub.restore) }
})

test('an obsolete filter request is aborted and its 401 cannot log out the ADMIN', async () => {
  const originalFetch = globalThis.fetch
  let resolveOld!: (response: Response) => void
  const oldResponse = new Promise<Response>(resolve => { resolveOld = resolve })
  let oldSignal: AbortSignal | null | undefined
  globalThis.fetch = (async (input, init) => {
    const url = String(input)
    if (url === '/api/v1/auth/me') return json({ user: { id: '1', role: 'ADMIN' } })
    if (url === '/api/v1/public/club-categories') return json(categories)
    const category = pageOf(url).get('categoryId')
    if (category === '1') { oldSignal = init?.signal; return oldResponse }
    const data = dashboard(0)
    if (category === '2') data.clubs.items[0].clubName = 'ผลตัวกรองล่าสุด'
    return json(data)
  }) as typeof fetch
  try {
    renderPage()
    await screen.findByRole('row', { name: /ชมรมหน้าแรก/ })
    await screen.findByRole('option', { name: 'เทคโนโลยี' })
    const select = screen.getAllByRole('combobox')[0]
    fireEvent.change(select, { target: { value: '1' } })
    await waitFor(() => assert.ok(oldSignal))
    fireEvent.change(select, { target: { value: '2' } })
    await screen.findByRole('row', { name: /ผลตัวกรองล่าสุด/ })
    assert.equal(oldSignal?.aborted, true)
    await act(async () => { resolveOld(problem(401, 'AUTHENTICATION_REQUIRED', 'stale')) })
    assert.ok(screen.getByRole('row', { name: /ผลตัวกรองล่าสุด/ }))
    assert.equal(screen.queryByText(/เซสชันหมดอายุ/), null)
  } finally { cleanupAfter(() => { globalThis.fetch = originalFetch }) }
})

test('an empty result explains that no clubs match the filters', async () => {
  const stub = stubFetch(req => {
    if (req.url === '/api/v1/auth/me') return json({ user: { id: '1', role: 'ADMIN' } })
    if (req.url === '/api/v1/public/club-categories') return json(categories)
    const data = dashboard(0)
    data.clubs.items = []
    data.clubs.page = { number: 0, size: 20, totalElements: 0, totalPages: 0 }
    return json(data)
  })
  try {
    renderPage()
    assert.ok(await screen.findByText('ไม่พบชมรมที่ตรงกับตัวกรอง'))
    assert.equal(screen.queryByRole('button', { name: /ถัดไป/ }), null)
  } finally { cleanupAfter(stub.restore) }
})
