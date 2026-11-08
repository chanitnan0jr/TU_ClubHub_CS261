import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { csrfResponse, json, problem, stubFetch, type RecordedRequest } from './helpers.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, {
  React, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
dom.window.scrollTo = () => {}

const { cleanup, fireEvent, render, screen, within } = await import('@testing-library/react')
const { MemoryRouter, Route, Routes } = await import('react-router')
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { RoundListPage } = await import('../src/features/recruitment/components/RoundListPage.tsx')
const { default: RoundEditRoutePage } = await import('../src/pages/RoundEditRoutePage.tsx')
const { default: RoundListRoutePage } = await import('../src/pages/RoundListRoutePage.tsx')
const { default: HomePage } = await import('../src/pages/HomePage.tsx')

const DAY = 86_400_000
const iso = (offset: number) => new Date(Date.now() + offset).toISOString()

function makeRound(id: string, title: string, overrides: Record<string, unknown> = {}) {
  return {
    id, clubId: '20001', title, academicYear: 2569, semester: 1, description: 'รายละเอียด',
    eligibilityText: null, opensAt: iso(-DAY), closesAt: iso(10 * DAY), confirmationDeadline: iso(20 * DAY),
    resultsScheduledAt: null, publicationStatus: 'PUBLISHED', closedAt: null, publishedAt: iso(-2 * DAY),
    resultsPublishedAt: null, createdAt: iso(-3 * DAY), updatedAt: iso(-3 * DAY), version: 0, questions: [],
    ...overrides,
  }
}

const rounds = [
  makeRound('1', 'รอบร่าง', { publicationStatus: 'DRAFT', publishedAt: null, opensAt: iso(DAY) }),
  makeRound('2', 'รอบร่างเลยกำหนด', { publicationStatus: 'DRAFT', publishedAt: null, opensAt: iso(-9 * DAY), closesAt: iso(-DAY) }),
  makeRound('3', 'รอบยังไม่เปิด', { opensAt: iso(DAY) }),
  makeRound('4', 'รอบเปิดอยู่'),
  makeRound('5', 'รอบปิดก่อนกำหนด', { closedAt: iso(-60_000) }),
  makeRound('6', 'รอบยกเลิก', { publicationStatus: 'CANCELLED' }),
]
const page = (items: unknown[], extra = {}) =>
  json({ items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0, ...extra })
const LIST_URL = '/api/v1/clubs/20001/rounds?page=0&size=20'

function renderList(respond: (request: RecordedRequest) => Response) {
  const stub = stubFetch(request => request.url === '/api/v1/auth/csrf' ? csrfResponse() : respond(request))
  render(createElement(MemoryRouter, null, createElement(RoundListPage, { clubId: '20001' })))
  return stub
}

// Labels of a table row's links and buttons, without the screen-reader round title.
function rowActions(table: HTMLElement, title: string) {
  const row = within(table).getByRole('rowheader', { name: title }).closest('tr') as HTMLElement
  return {
    row,
    labels: Array.from(row.querySelectorAll('a, button')).map(el => (el.textContent ?? '').replace(title, '').trim()),
  }
}

test('each round shows its status as text and only the actions that status allows', async () => {
  const stub = renderList(() => page(rounds))
  try {
    const table = await screen.findByRole('table')
    const expected: [string, string, string[]][] = [
      ['รอบร่าง', 'ร่าง', ['แก้ไข', 'คำถาม', 'เผยแพร่']],
      ['รอบร่างเลยกำหนด', 'ร่าง', ['แก้ไข', 'คำถาม']],
      ['รอบยังไม่เปิด', 'ยังไม่เปิด', ['คำถาม']],
      ['รอบเปิดอยู่', 'เปิดรับสมัคร', ['คำถาม', 'ปิดรับสมัคร']],
      ['รอบปิดก่อนกำหนด', 'ปิดรับแล้ว', ['คำถาม']],
      ['รอบยกเลิก', 'ยกเลิก', ['คำถาม']],
    ]
    for (const [title, badge, actions] of expected) {
      const { row, labels } = rowActions(table, title)
      assert.deepEqual(labels, actions, title)
      assert.ok(within(row).getByText(badge), title)
    }
    const draft = rowActions(table, 'รอบร่าง').row
    assert.equal(within(draft).getByRole('link', { name: 'แก้ไข รอบร่าง' }).getAttribute('href'), '/clubs/20001/rounds/1/edit')
    assert.equal(within(draft).getByRole('link', { name: 'คำถาม รอบร่าง' }).getAttribute('href'), '/clubs/20001/rounds/1/questions')
    assert.ok(within(rowActions(table, 'รอบร่างเลยกำหนด').row).getByText(/แก้ไขกำหนดการก่อนเผยแพร่/))
    assert.ok(within(rowActions(table, 'รอบปิดก่อนกำหนด').row).getByText(/ปิดก่อนกำหนดเมื่อ/))
    assert.deepEqual(stub.requests.map(r => r.url), [LIST_URL])
  } finally { cleanup(); stub.restore() }
})

test('closing early asks for confirmation, sends CLOSE with the version and updates the row', async () => {
  const stub = renderList(request => request.method === 'PATCH'
    ? json({ ...rounds[3], closedAt: new Date().toISOString(), version: 1 })
    : page(rounds))
  try {
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByRole('button', { name: 'ปิดรับสมัคร รอบเปิดอยู่' }))

    const dialog = screen.getByRole('dialog', { name: 'ปิดรับสมัครก่อนกำหนด' })
    assert.match(dialog.textContent ?? '', /หยุดรับใบสมัครใหม่ทันที/)
    assert.equal(stub.requests.filter(r => r.method === 'PATCH').length, 0)
    fireEvent.click(within(dialog).getByRole('button', { name: 'ปิดรับสมัคร' }))

    assert.match((await screen.findByRole('status')).textContent ?? '', /ปิดรับสมัครแล้ว: รอบเปิดอยู่/)
    const patch = stub.requests.find(r => r.method === 'PATCH')
    assert.equal(patch?.url, '/api/v1/clubs/20001/rounds/4')
    assert.deepEqual(patch?.body, { action: 'CLOSE', version: 0 })
    const { row, labels } = rowActions(table, 'รอบเปิดอยู่')
    assert.deepEqual(labels, ['คำถาม'])
    assert.ok(within(row).getByText('ปิดรับแล้ว'))
    assert.equal(screen.queryByRole('dialog'), null)
  } finally { cleanup(); stub.restore() }
})

test('a version conflict shows the Thai message and loads the list again', async () => {
  const stub = renderList(request => request.method === 'PATCH'
    ? problem(409, 'RESOURCE_CONFLICT', 'Round was modified', { reason: 'VERSION_MISMATCH' })
    : page(rounds))
  try {
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByRole('button', { name: 'เผยแพร่ รอบร่าง' }))
    const dialog = screen.getByRole('dialog', { name: 'เผยแพร่รอบรับสมัคร' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'เผยแพร่' }))

    assert.match((await screen.findByRole('alert')).textContent ?? '', /ข้อมูลถูกแก้ไขแล้ว/)
    await screen.findByRole('table')
    assert.equal(stub.requests.filter(r => r.url === LIST_URL).length, 2)
    assert.deepEqual(stub.requests.find(r => r.method === 'PATCH')?.body, { action: 'PUBLISH', version: 0 })
  } finally { cleanup(); stub.restore() }
})

test('an empty club gets a create link, and a list error offers a retry', async () => {
  let fail = true
  const stub = renderList(request => request.url === LIST_URL && fail
    ? problem(503, 'SERVICE_UNAVAILABLE', 'x')
    : page([]))
  try {
    const alert = await screen.findByRole('alert')
    assert.match(alert.textContent ?? '', /ระบบไม่พร้อมใช้งานชั่วคราว/)
    fail = false
    fireEvent.click(within(alert).getByRole('button', { name: 'ลองใหม่' }))

    assert.ok(await screen.findByRole('heading', { name: 'ยังไม่มีรอบรับสมัคร' }))
    assert.equal(screen.getByRole('link', { name: 'สร้างรอบรับสมัคร' }).getAttribute('href'), '/clubs/20001/rounds/new')
    assert.equal(screen.queryByRole('table'), null)
  } finally { cleanup(); stub.restore() }
})

test('more than one page shows previous and next controls', async () => {
  const stub = renderList(request => request.url.includes('page=1')
    ? json({ items: [rounds[5]], page: 1, size: 20, totalElements: 21, totalPages: 2 })
    : page(rounds, { totalElements: 21, totalPages: 2 }))
  try {
    await screen.findByRole('table')
    const pager = screen.getByRole('navigation', { name: 'เปลี่ยนหน้ารายการรอบรับสมัคร' })
    assert.equal((within(pager).getByRole('button', { name: 'ก่อนหน้า' }) as HTMLButtonElement).disabled, true)
    fireEvent.click(within(pager).getByRole('button', { name: 'ถัดไป' }))

    await screen.findByText('หน้า 2 จาก 2')
    assert.ok(within(await screen.findByRole('table')).getByRole('rowheader', { name: 'รอบยกเลิก' }))
    assert.equal(stub.requests.at(-1)?.url, '/api/v1/clubs/20001/rounds?page=1&size=20')
  } finally { cleanup(); stub.restore() }
})

const assignment = {
  clubId: '20001', clubName: 'ชมรมอาสาพัฒนาชุมชน', permissionRole: 'PRESIDENT',
  positionName: null, startsAt: '2026-06-01T00:00:00Z', endsAt: null,
}
const user = { id: '10001', role: 'USER', displayName: 'ประธานทดสอบ', activeCommitteeAssignments: [assignment] }

function renderEdit(round: Record<string, unknown>, onWrite: (request: RecordedRequest) => Response) {
  const stub = stubFetch(request => {
    if (request.url === '/api/v1/auth/me') return json({ user })
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.method === 'PUT') return onWrite(request)
    if (request.url === '/api/v1/clubs/20001/rounds/1') return json(round)
    return page([round])
  })
  render(createElement(MemoryRouter, { initialEntries: ['/clubs/20001/rounds/1/edit'] },
    createElement(AuthProvider, null,
      createElement(Routes, null,
        createElement(Route, { path: '/clubs/:clubId/rounds/:roundId/edit', element: createElement(RoundEditRoutePage) }),
        createElement(Route, { path: '/clubs/:clubId/rounds', element: createElement(RoundListRoutePage) })))))
  return stub
}

test('the edit page fills the form from the draft and saves it with its version', async () => {
  const draft = makeRound('1', 'รอบร่างเดิม', {
    publicationStatus: 'DRAFT', version: 3, eligibilityText: 'ปี 1-2',
    questions: [{ id: '81', prompt: 'ทำไมจึงสนใจ', required: true, displayOrder: 1, maxLength: 2000 }],
  })
  const stub = renderEdit(draft, request => json({ ...draft, ...(request.body as object), version: 4 }))
  try {
    const title = await screen.findByLabelText(/ชื่อรอบรับสมัคร/) as HTMLInputElement
    assert.equal(title.value, 'รอบร่างเดิม')
    assert.equal(screen.queryByRole('button', { name: 'บันทึกและเผยแพร่' }), null)
    fireEvent.change(title, { target: { value: 'รอบร่างใหม่' } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }))

    // Saving sends the user back to the round list with a success message.
    assert.ok(await screen.findByText('บันทึกการแก้ไขรอบ “รอบร่างใหม่” แล้ว'))
    assert.ok(await screen.findByRole('table'))
    const put = stub.requests.find(r => r.method === 'PUT')
    assert.equal(put?.url, '/api/v1/clubs/20001/rounds/1')
    const body = put?.body as Record<string, unknown>
    assert.equal(body.title, 'รอบร่างใหม่')
    assert.equal(body.version, 3)
    assert.equal(body.eligibilityText, 'ปี 1-2')
    // An untouched date keeps its seconds; only milliseconds are dropped.
    assert.equal(body.opensAt, draft.opensAt.replace(/\.\d{3}Z$/, '.000Z'))
    assert.deepEqual(body.questions, [{ prompt: 'ทำไมจึงสนใจ', required: true, displayOrder: 1, maxLength: 2000 }])
  } finally { cleanup(); stub.restore() }
})

test('the edit page explains why a published round cannot be edited', async () => {
  const stub = renderEdit(makeRound('1', 'รอบเผยแพร่แล้ว'), () => json({}))
  try {
    assert.ok(await screen.findByRole('heading', { name: 'แก้ไขรอบนี้ไม่ได้' }))
    assert.ok(screen.getByText('เปิดรับสมัคร'))
    assert.equal(screen.getByRole('link', { name: 'กลับไปหน้าจัดการรอบรับสมัคร' }).getAttribute('href'), '/clubs/20001/rounds')
    assert.equal(screen.queryByRole('button', { name: 'บันทึกการแก้ไข' }), null)
  } finally { cleanup(); stub.restore() }
})

function renderHome(me: () => Response) {
  const stub = stubFetch(request => request.url === '/api/v1/auth/me' ? me() : json({}, 404))
  render(createElement(MemoryRouter, null, createElement(AuthProvider, null, createElement(HomePage))))
  return stub
}

test('home lists the clubs the user manages and links to the open-call board', async () => {
  const stub = renderHome(() => json({ user }))
  try {
    const section = (await screen.findByRole('heading', { name: 'ชมรมที่ฉันดูแล' })).closest('section') as HTMLElement
    const card = within(section).getByRole('link', { name: /ชมรมอาสาพัฒนาชุมชน/ })
    assert.equal(card.getAttribute('href'), '/clubs/20001/manage')
    assert.match(card.textContent ?? '', /ประธานชมรม/)
    assert.equal(screen.getByRole('link', { name: 'ดูรอบที่เปิดรับสมัคร' }).getAttribute('href'), '/open-calls')
    assert.equal(screen.queryByRole('textbox'), null)
  } finally { cleanup(); stub.restore() }
})

test('home shows the login form and the open-call link to visitors', async () => {
  const stub = renderHome(() => problem(401, 'AUTHENTICATION_REQUIRED', 'x'))
  try {
    assert.ok(await screen.findByRole('heading', { level: 1, name: 'เข้าสู่ระบบ' }))
    assert.equal(screen.getByRole('link', { name: 'ดูรอบที่เปิดรับสมัคร' }).getAttribute('href'), '/open-calls')
    assert.equal(screen.queryByRole('heading', { name: 'ชมรมที่ฉันดูแล' }), null)
  } finally { cleanup(); stub.restore() }
})
