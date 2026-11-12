import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { json, stubFetch, type RecordedRequest } from './helpers.ts'

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

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { MemoryRouter } = await import('react-router')
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { default: AppRoutes } = await import('../src/app/AppRoutes.tsx')

const assignment = {
  clubId: '20001',
  clubName: 'ชมรมอาสาพัฒนาชุมชน',
  permissionRole: 'PRESIDENT',
  positionName: null,
  startsAt: '2026-06-01T00:00:00Z',
  endsAt: null,
}

const user = {
  id: '10001',
  role: 'USER',
  displayName: 'ประธานทดสอบ',
  activeCommitteeAssignments: [assignment],
}

const application = {
  id: '90001',
  roundId: '70001',
  applicant: {
    userId: '10002',
    studentCode: '6600000002',
    displayName: 'ผู้สมัครทดสอบ',
    email: 'applicant@example.org',
    facultyName: 'คณะวิทยาศาสตร์',
    departmentName: 'ภาควิชาคอมพิวเตอร์',
    programName: 'วิทยาการคอมพิวเตอร์',
    studyYear: 2,
  },
  submittedAt: '2026-11-08T09:30:00Z',
  status: 'SUBMITTED',
}

const detail = {
  ...application,
  clubId: '20001',
  motivation: 'อยากร่วมทำกิจกรรมเพื่อสังคม',
  questionsWithAnswers: [
    { questionId: '81001', questionText: 'เล่าประสบการณ์ของคุณ', isRequired: true, displayOrder: 1, answerText: 'เคยจัดกิจกรรมจิตอาสา' },
    { questionId: '81002', questionText: 'มีข้อมูลเพิ่มเติมหรือไม่', isRequired: false, displayOrder: 2, answerText: null },
  ],
  links: [
    { id: '95001', label: 'แฟ้มผลงาน', url: 'https://example.org/portfolio', displayOrder: 1 },
  ],
}

const page = (items: unknown[]) => ({
  items,
  page: { number: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 },
})

function renderApp(respond: (request: RecordedRequest) => Response) {
  const stub = stubFetch((request) =>
    request.url === '/api/v1/auth/me'
      ? json({ user })
      : respond(request),
  )
  render(
    createElement(
      MemoryRouter,
      { initialEntries: ['/clubs/20001/applications'] },
      createElement(AuthProvider, null, createElement(AppRoutes)),
    ),
  )
  return stub
}

test('committee applications are listed, filtered through Review API, and link to details', async () => {
  const stub = renderApp((request) => {
    if (request.url.startsWith('/api/v1/clubs/20001/applications?')) {
      return json(page([application]))
    }
    return json({ message: 'not found' }, 404)
  })

  try {
    await screen.findByText('ผู้สมัครทดสอบ')
    assert.ok(screen.getByText(/6600000002/))
    assert.ok(screen.getAllByText('รอพิจารณา').length > 0)
    assert.equal(screen.getByRole('link', { name: 'ดูใบสมัคร' }).getAttribute('href'), '/clubs/20001/applications/90001')
    assert.ok(stub.requests.some((request) =>
      request.url === '/api/v1/clubs/20001/applications?page=0&size=20' && request.method === 'GET',
    ))

    fireEvent.change(screen.getByLabelText('กรองตามสถานะ'), { target: { value: 'REJECTED' } })
    await waitFor(() => {
      assert.ok(stub.requests.some((request) =>
        request.url === '/api/v1/clubs/20001/applications?page=0&size=20&status=REJECTED',
      ))
    })
  } finally {
    cleanup()
    stub.restore()
  }
})

test('application detail shows answers and safe attachment links; decisions are not falsely saved', async () => {
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/auth/me') return json({ user })
    if (request.url === '/api/v1/clubs/20001/applications/90001') return json(detail)
    return json({ message: 'not found' }, 404)
  })

  try {
    render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/clubs/20001/applications/90001'] },
        createElement(AuthProvider, null, createElement(AppRoutes)),
      ),
    )

    await screen.findByText('เคยจัดกิจกรรมจิตอาสา')
    assert.ok(screen.getByText('อยากร่วมทำกิจกรรมเพื่อสังคม'))
    assert.ok(screen.getByText('ไม่ได้ระบุคำตอบ'))
    const documentLink = screen.getByRole('link', { name: 'ดู / ดาวน์โหลด' })
    assert.equal(documentLink.getAttribute('href'), 'https://example.org/portfolio')
    assert.equal(documentLink.getAttribute('rel'), 'noopener noreferrer')
    const approveButton = screen.getByRole('button', { name: 'อนุมัติ' }) as HTMLButtonElement
    const dismissButton = screen.getByRole('button', { name: 'ไม่อนุมัติ' }) as HTMLButtonElement
    assert.equal(approveButton.disabled, false)
    assert.equal(dismissButton.disabled, false)
    fireEvent.click(approveButton)
    fireEvent.click(dismissButton)
    assert.equal(stub.requests.some((request) => request.method !== 'GET'), false)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('empty and failed application lists have clear Thai states and retry controls', async () => {
  const stub = renderApp((request) => {
    if (request.url.startsWith('/api/v1/clubs/20001/applications?')) return json(page([]))
    return json({ message: 'not found' }, 404)
  })

  try {
    await screen.findByText('ยังไม่มีผู้สมัคร')
  } finally {
    cleanup()
    stub.restore()
  }

  const failed = renderApp((request) => {
    if (request.url.startsWith('/api/v1/clubs/20001/applications?')) {
      return new Response(JSON.stringify({ status: 503, code: 'SERVICE_UNAVAILABLE' }), {
        status: 503,
        headers: { 'Content-Type': 'application/problem+json' },
      })
    }
    return json({ message: 'not found' }, 404)
  })
  try {
    await screen.findByText('โหลดรายชื่อผู้สมัครไม่สำเร็จ')
    assert.ok(screen.getByRole('button', { name: 'ลองใหม่' }))
  } finally {
    cleanup()
    failed.restore()
  }
})
