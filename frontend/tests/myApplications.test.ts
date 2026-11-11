import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { json, problem, stubFetch, type RecordedRequest } from './helpers.ts'

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

const { cleanup, fireEvent, render, screen, within } = await import('@testing-library/react')
const { MemoryRouter } = await import('react-router')
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { default: AppRoutes } = await import('../src/app/AppRoutes.tsx')

const studentUser = {
  id: '10001',
  role: 'USER',
  displayName: 'นักศึกษาทดสอบ',
  activeCommitteeAssignments: [],
}

const summaryItem = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  submittedAt: '2026-10-15T04:00:00Z',
  respondedAt: null,
  applicantVisibleStatus: 'SUBMITTED',
  displayStatusLabel: 'รอพิจารณา',
  canConfirm: false,
  canDecline: false,
  club: {
    id: '20001',
    name: `ชมรมทดสอบ ${id}`,
    imageUrl: null,
  },
  round: {
    id: '50001',
    title: `รอบรับสมัคร ${id}`,
    academicYear: 2569,
    semester: 1,
    opensAt: '2026-10-01T00:00:00Z',
    closesAt: '2026-10-25T16:59:59Z',
    resultsPublishedAt: null,
    confirmationDeadline: null,
  },
  ...overrides,
})

const pageOf = (items: unknown[], number = 0, totalPages = 1, totalElements = items.length) => ({
  items,
  page: { number, size: 20, totalElements, totalPages },
})

const LIST_PATH = '/api/v1/me/applications'

function renderApp(respond: (request: RecordedRequest) => Response, path = '/me/applications') {
  const stub = stubFetch(request =>
    request.url === '/api/v1/auth/me' ? json({ user: studentUser }) : respond(request),
  )
  render(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(AuthProvider, null, createElement(AppRoutes)),
    ),
  )
  return stub
}

const apiRequests = (stub: { requests: RecordedRequest[] }) =>
  stub.requests.filter(request => request.url.startsWith(LIST_PATH)).map(request => request.url)

test('my applications list renders status badges, filters by status, and links to detail and club pages', async () => {
  const stub = renderApp(() =>
    json(
      pageOf([
        summaryItem('90001', {
          applicantVisibleStatus: 'ACCEPTED_PENDING_CONFIRMATION',
          displayStatusLabel: 'ผ่านการคัดเลือก (รอยืนยันสิทธิ์)',
          canConfirm: true,
          canDecline: true,
          round: {
            id: '50001',
            title: 'รอบรับสมัครหลัก 1/2569',
            academicYear: 2569,
            semester: 1,
            opensAt: '2026-10-01T00:00:00Z',
            closesAt: '2026-10-25T16:59:59Z',
            resultsPublishedAt: '2026-10-26T02:00:00Z',
            confirmationDeadline: '2026-11-05T16:59:59Z',
          },
        }),
        summaryItem('90002', {
          applicantVisibleStatus: 'SUBMITTED',
          displayStatusLabel: 'รอพิจารณา',
          club: {
            id: '20002',
            name: 'ชมรมดนตรีสากล',
            imageUrl: 'https://images.example.org/clubs/music.png',
          },
        }),
        summaryItem('90003', {
          applicantVisibleStatus: 'REJECTED',
          displayStatusLabel: 'ไม่ผ่านการคัดเลือก',
          club: {
            id: '20003',
            name: 'ชมรมถ่ายภาพ',
            imageUrl: null,
          },
        }),
      ]),
    ),
  )

  try {
    assert.ok(await screen.findByRole('heading', { level: 1, name: 'ประวัติและสถานะใบสมัคร' }))
    const acceptedCard = await screen.findByRole('article', { name: 'ชมรมทดสอบ 90001' })
    const submittedCard = screen.getByRole('article', { name: 'ชมรมดนตรีสากล' })
    const rejectedCard = screen.getByRole('article', { name: 'ชมรมถ่ายภาพ' })
    assert.deepEqual(apiRequests(stub), [`${LIST_PATH}?page=0&size=20`])

    assert.ok(within(acceptedCard).getByText('ผ่านการคัดเลือก (รอยืนยันสิทธิ์)'))
    assert.equal(
      within(acceptedCard).getByRole('link', { name: 'ดูรายละเอียดใบสมัคร ชมรมทดสอบ 90001' }).getAttribute('href'),
      '/me/applications/90001',
    )
    assert.equal(
      within(acceptedCard).getByRole('link', { name: 'ดูหน้าชมรม ชมรมทดสอบ 90001' }).getAttribute('href'),
      '/clubs/20001',
    )

    assert.ok(within(submittedCard).getByText('รอพิจารณา'))
    assert.ok(within(rejectedCard).getByText('ไม่ผ่านการคัดเลือก'))

    // Filter tabs must not include an unsupported interview tab (T74-D02)
    const filterGroup = screen.getByRole('group', { name: 'กรองตามสถานะใบสมัคร' })
    assert.equal(within(filterGroup).queryByRole('button', { name: /สัมภาษณ์/ }), null)

    fireEvent.click(within(filterGroup).getByRole('button', { name: 'รอพิจารณา' }))
    assert.ok(screen.getByRole('article', { name: 'ชมรมดนตรีสากล' }))
    assert.equal(screen.queryByRole('article', { name: 'ชมรมทดสอบ 90001' }), null)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('my applications list shows empty state when applicant has no applications (TC-04-10)', async () => {
  const stub = renderApp(() => json(pageOf([], 0, 0, 0)))
  try {
    assert.ok(await screen.findByRole('heading', { level: 2, name: 'คุณยังไม่มีประวัติการสมัครชมรม' }))
    assert.equal(screen.getByRole('link', { name: 'ดูรอบที่เปิดรับสมัคร' }).getAttribute('href'), '/open-calls')
    assert.equal(screen.queryByRole('article'), null)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('my applications list shows error state without server SQL text and retries on click (TC-04-11)', async () => {
  let calls = 0
  const stub = renderApp(() =>
    ++calls === 1
      ? problem(500, 'INTERNAL_ERROR', 'SECRET SELECT * FROM applications WHERE applicant_id = 10001')
      : json(pageOf([summaryItem('90001')])),
  )

  try {
    const alert = await screen.findByRole('alert')
    assert.equal(alert.textContent, 'ไม่สามารถโหลดประวัติใบสมัครได้ กรุณาลองใหม่อีกครั้ง')
    assert.doesNotMatch(document.body.textContent ?? '', /SECRET|SELECT/)

    fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }))
    assert.ok(await screen.findByRole('article', { name: 'ชมรมทดสอบ 90001' }))
    assert.equal(screen.queryByRole('alert'), null)
    assert.equal(apiRequests(stub).length, 2)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('my applications list paginates using ?page= query parameter', async () => {
  const stub = renderApp(request => {
    const number = Number(new URL(request.url, 'http://localhost').searchParams.get('page'))
    return json(pageOf([summaryItem(String(90001 + number))], number, 2, 25))
  }, '/me/applications?page=2')

  try {
    await screen.findByRole('article', { name: 'ชมรมทดสอบ 90002' })
    const nav = screen.getByRole('navigation', { name: 'เปลี่ยนหน้ารายการใบสมัคร' })
    assert.ok(within(nav).getByText('หน้า 2 จาก 2'))
    assert.equal(within(nav).getByRole('button', { name: 'ถัดไป' }).hasAttribute('disabled'), true)

    fireEvent.click(within(nav).getByRole('button', { name: 'ก่อนหน้า' }))
    await screen.findByRole('article', { name: 'ชมรมทดสอบ 90001' })
    assert.ok(screen.getByText('หน้า 1 จาก 2'))
    assert.deepEqual(apiRequests(stub), [`${LIST_PATH}?page=1&size=20`, `${LIST_PATH}?page=0&size=20`])
  } finally {
    cleanup()
    stub.restore()
  }
})

test('my application detail page renders status history timeline, answers, and external links', async () => {
  const stub = renderApp(
    () =>
      json({
        ...summaryItem('90001', {
          applicantVisibleStatus: 'ACCEPTED_PENDING_CONFIRMATION',
          displayStatusLabel: 'ผ่านการคัดเลือก (รอยืนยันสิทธิ์)',
          canConfirm: true,
          canDecline: true,
          round: {
            id: '50001',
            title: 'รอบรับสมัครหลัก 1/2569',
            academicYear: 2569,
            semester: 1,
            opensAt: '2026-10-01T00:00:00Z',
            closesAt: '2026-10-25T16:59:59Z',
            resultsPublishedAt: '2026-10-26T02:00:00Z',
            confirmationDeadline: '2026-11-05T16:59:59Z',
          },
        }),
        resultMessage: 'กรุณายืนยันสิทธิ์ภายในวันเวลาที่กำหนด',
        motivation: 'อยากพัฒนาทักษะการทำงานร่วมกับผู้อื่นและสร้างประโยชน์ให้มหาวิทยาลัย',
        questionsWithAnswers: [
          {
            questionId: '70001',
            questionText: 'ประสบการณ์ที่เกี่ยวข้อง',
            isRequired: true,
            displayOrder: 1,
            answerText: 'เคยจัดค่ายอาสาของคณะ',
          },
        ],
        links: [
          {
            label: 'แฟ้มสะสมผลงาน',
            url: 'https://portfolio.example.org/u10001',
            displayOrder: 1,
          },
        ],
        statusHistory: [
          {
            status: 'SUBMITTED',
            displayStatusLabel: 'ส่งใบสมัครแล้ว',
            occurredAt: '2026-10-15T04:00:00Z',
          },
          {
            status: 'ACCEPTED_PENDING_CONFIRMATION',
            displayStatusLabel: 'ประกาศผลคัดเลือก (ผ่านการคัดเลือก)',
            occurredAt: '2026-10-26T02:00:00Z',
          },
        ],
      }),
    '/me/applications/90001',
  )

  try {
    assert.ok(await screen.findByRole('heading', { level: 1, name: 'ชมรมทดสอบ 90001' }))
    assert.deepEqual(apiRequests(stub), ['/api/v1/me/applications/90001'])

    const timeline = screen.getByRole('list', { name: 'ไทม์ไลน์สถานะใบสมัคร' })
    assert.ok(within(timeline).getByText('ส่งใบสมัครแล้ว'))
    assert.ok(within(timeline).getByText('ประกาศผลคัดเลือก (ผ่านการคัดเลือก)'))

    assert.ok(screen.getByText('กรุณายืนยันสิทธิ์ภายในวันเวลาที่กำหนด'))
    assert.ok(screen.getByText('อยากพัฒนาทักษะการทำงานร่วมกับผู้อื่นและสร้างประโยชน์ให้มหาวิทยาลัย'))
    assert.ok(screen.getByText(/ประสบการณ์ที่เกี่ยวข้อง/))
    assert.ok(screen.getByText('เคยจัดค่ายอาสาของคณะ'))

    const portfolioLink = screen.getByRole('link', { name: 'แฟ้มสะสมผลงาน' })
    assert.equal(portfolioLink.getAttribute('href'), 'https://portfolio.example.org/u10001')
    assert.equal(portfolioLink.getAttribute('rel'), 'noopener noreferrer')
  } finally {
    cleanup()
    stub.restore()
  }
})

test('my application detail page shows 403 error message when accessing another student application', async () => {
  const stub = renderApp(
    () => problem(403, 'ACCESS_DENIED', 'Application belongs to user 99999'),
    '/me/applications/90009',
  )

  try {
    const alert = await screen.findByRole('alert')
    assert.equal(alert.textContent, 'คุณไม่มีสิทธิ์ดำเนินการนี้')
    assert.doesNotMatch(document.body.textContent ?? '', /99999/)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('my application detail route rejects non-numeric application IDs without calling the API', async () => {
  const stub = renderApp(() => json({}), '/me/applications/not-an-id')
  try {
    assert.ok(await screen.findByRole('heading', { level: 1, name: 'ไม่พบหน้าที่ต้องการ' }))
    assert.deepEqual(apiRequests(stub), [])
  } finally {
    cleanup()
    stub.restore()
  }
})
