import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { closingHint } from '../src/features/openCalls/utils/closingHint.ts'
import { json, problem, stubFetch, type RecordedRequest } from './helpers.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, {
  React, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })

const { cleanup, fireEvent, render, screen, within } = await import('@testing-library/react')
const { MemoryRouter } = await import('react-router')
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { default: OpenCallsPage } = await import('../src/pages/OpenCallsPage.tsx')

const at = (iso: string) => new Date(iso).getTime()

test('closing hint counts Bangkok calendar days, not hours', () => {
  const cases = [
    // 10:00 → 23:59:59 the same Bangkok day.
    ['2026-10-31T03:00:00Z', '2026-10-31T16:59:59Z', 0, 'ปิดรับวันนี้'],
    // closesAt is exclusive: closing at Bangkok midnight still closes "today".
    ['2026-10-31T03:00:00Z', '2026-10-31T17:00:00Z', 0, 'ปิดรับวันนี้'],
    // 00:30 → 23:59 on 1 Nov in Bangkok, although the UTC dates differ.
    ['2026-10-31T17:30:00Z', '2026-11-01T16:59:59Z', 0, 'ปิดรับวันนี้'],
    // 23:00 → 00:30 next Bangkok day: only 90 minutes left, but it is tomorrow.
    ['2026-10-31T16:00:00Z', '2026-10-31T17:30:00Z', 1, 'ปิดรับในอีก 1 วัน'],
    ['2026-10-25T03:00:00Z', '2026-10-31T16:59:59Z', 6, 'ปิดรับในอีก 6 วัน'],
  ] as const
  for (const [now, closesAt, days, label] of cases) {
    assert.deepEqual(closingHint(closesAt, at(now)), { days, label }, `${now} → ${closesAt}`)
  }
})

test('closing hint is empty once the round has closed or the date is invalid', () => {
  const now = at('2026-10-31T03:00:00Z')
  assert.equal(closingHint('2026-10-31T03:00:00Z', now), null)
  assert.equal(closingHint('2026-10-30T03:00:00Z', now), null)
  assert.equal(closingHint('not a date', now), null)
})

const DAY = 24 * 60 * 60 * 1000
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString()

const call = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `รอบรับสมัคร ${id}`,
  description: 'เปิดรับทุกคณะ\nไม่ต้องมีประสบการณ์',
  opensAt: inDays(-3),
  closesAt: inDays(2),
  resultsScheduledAt: null,
  club: { id: '20001', name: 'ชมรมถ่ายภาพ', imageUrl: null, category: { id: '30001', name: 'ศิลปะ' } },
  ...overrides,
})

const pageOf = (items: unknown[], number = 0, totalPages = 1, totalElements = items.length) => ({
  items, page: { number, size: 12, totalElements, totalPages },
})

const BOARD_PATH = '/api/v1/public/recruitment-rounds'

function renderBoard(respond: (request: RecordedRequest) => Response, path = '/open-calls') {
  const stub = stubFetch(request => request.url === '/api/v1/auth/me'
    ? problem(401, 'AUTHENTICATION_REQUIRED', 'Login required.')
    : respond(request))
  render(createElement(MemoryRouter, { initialEntries: [path] },
    createElement(AuthProvider, null, createElement(OpenCallsPage))))
  return stub
}

const boardRequests = (stub: { requests: RecordedRequest[] }) =>
  stub.requests.filter(request => request.url.startsWith(BOARD_PATH)).map(request => request.url)

test('open call board shows each open round with links to apply and to the club', async () => {
  const stub = renderBoard(() => json(pageOf([
    call('50001'),
    call('50002', {
      closesAt: inDays(10),
      resultsScheduledAt: '2026-11-07T09:00:00Z',
      club: {
        id: '20002', name: 'ชมรมคอมพิวเตอร์', imageUrl: 'https://images.example.org/clubs/20002.png',
        category: { id: '30002', name: 'วิชาการ' },
      },
    }),
  ])))
  try {
    assert.ok(screen.getByRole('heading', { level: 1, name: 'รอบที่เปิดรับสมัคร' }))
    const first = await screen.findByRole('article', { name: 'รอบรับสมัคร 50001' })
    const second = screen.getByRole('article', { name: 'รอบรับสมัคร 50002' })
    assert.deepEqual(boardRequests(stub), [`${BOARD_PATH}?page=0&size=12`])

    const card = within(first)
    assert.equal(card.getByRole('link', { name: 'สมัคร รอบรับสมัคร 50001' }).getAttribute('href'),
      '/clubs/20001/rounds/50001/apply')
    assert.equal(card.getByRole('link', { name: 'ดูรายละเอียดชมรม ชมรมถ่ายภาพ' }).getAttribute('href'),
      '/clubs/20001')
    assert.ok(card.getByText('ชมรมถ่ายภาพ'))
    assert.ok(card.getByText('ศิลปะ'))
    assert.ok(card.getByText('เปิดรับสมัคร'))
    assert.match(first.textContent ?? '', /ปิดรับในอีก 2 วัน/)
    assert.ok(card.queryByText('ประกาศผล') === null)
    // No logo URL: placeholder only, never a broken image.
    assert.ok(card.queryByRole('img') === null)

    const other = within(second)
    assert.equal(other.getByRole('link', { name: 'สมัคร รอบรับสมัคร 50002' }).getAttribute('href'),
      '/clubs/20002/rounds/50002/apply')
    assert.equal(other.getByRole('link', { name: 'ดูรายละเอียดชมรม ชมรมคอมพิวเตอร์' }).getAttribute('href'),
      '/clubs/20002')
    assert.ok(other.getByText('ประกาศผล'))
    const logo = other.getByRole('img', { name: 'โลโก้ ชมรมคอมพิวเตอร์' })
    fireEvent.error(logo)
    assert.ok(other.queryByRole('img') === null)

    assert.ok(screen.queryByRole('navigation', { name: 'เปลี่ยนหน้ารายการรอบรับสมัคร' }) === null)
  } finally { cleanup(); stub.restore() }
})

test('open call board shows an empty state when no round is open', async () => {
  const stub = renderBoard(() => json(pageOf([], 0, 0)))
  try {
    assert.ok(await screen.findByRole('heading', { level: 2, name: 'ยังไม่มีรอบที่เปิดรับสมัครในขณะนี้' }))
    assert.ok(screen.queryByRole('article') === null)
    assert.ok(screen.queryByRole('list') === null)
  } finally { cleanup(); stub.restore() }
})

test('open call board reports a failure without server text and retries', async () => {
  let calls = 0
  const stub = renderBoard(() => ++calls === 1
    ? problem(500, 'INTERNAL_ERROR', 'SECRET SELECT * FROM recruitment_rounds')
    : json(pageOf([call('50001')])))
  try {
    const alert = await screen.findByRole('alert')
    assert.equal(alert.textContent, 'ไม่สามารถโหลดรอบที่เปิดรับสมัครได้ กรุณาลองใหม่อีกครั้ง')
    assert.doesNotMatch(document.body.textContent ?? '', /SECRET|SELECT/)

    fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }))
    assert.ok(await screen.findByRole('article', { name: 'รอบรับสมัคร 50001' }))
    assert.ok(screen.queryByRole('alert') === null)
    assert.equal(boardRequests(stub).length, 2)
  } finally { cleanup(); stub.restore() }
})

test('open call board pages through results 12 at a time from the ?page= query', async () => {
  const stub = renderBoard(request => {
    const number = Number(new URL(request.url, 'http://localhost').searchParams.get('page'))
    return json(pageOf([call(String(50001 + number))], number, 3, 30))
  }, '/open-calls?page=2')
  try {
    await screen.findByRole('article', { name: 'รอบรับสมัคร 50002' })
    const nav = screen.getByRole('navigation', { name: 'เปลี่ยนหน้ารายการรอบรับสมัคร' })
    assert.ok(within(nav).getByText('หน้า 2 จาก 3'))
    assert.equal(within(nav).getByRole('button', { name: 'ก่อนหน้า' }).hasAttribute('disabled'), false)

    fireEvent.click(within(nav).getByRole('button', { name: 'ถัดไป' }))
    await screen.findByRole('article', { name: 'รอบรับสมัคร 50003' })
    assert.ok(screen.getByText('หน้า 3 จาก 3'))
    assert.equal(screen.getByRole('button', { name: 'ถัดไป' }).hasAttribute('disabled'), true)
    assert.ok(document.activeElement === screen.getByRole('heading', { level: 1 }))
    assert.deepEqual(boardRequests(stub), [`${BOARD_PATH}?page=1&size=12`, `${BOARD_PATH}?page=2&size=12`])
  } finally { cleanup(); stub.restore() }
})
