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

const evaluationSnapshot = {
  ...detail,
  resultMessage: null,
  decidedBy: null,
  decidedAt: null,
  respondedAt: null,
  version: 0,
  reviews: [],
  statusHistory: [],
}

const draftRound = {
  id: '70001',
  clubId: '20001',
  title: 'รอบรับสมัคร 1/2569',
  academicYear: 2569,
  semester: 1,
  description: 'รายละเอียดรอบ',
  eligibilityText: null,
  opensAt: '2026-10-01T00:00:00Z',
  closesAt: '2026-10-31T16:59:59Z',
  confirmationDeadline: '2026-11-20T16:59:59Z',
  resultsScheduledAt: null,
  publicationStatus: 'PUBLISHED',
  closedAt: '2026-10-31T16:59:59Z',
  publishedAt: '2026-10-01T00:00:00Z',
  resultsPublishedAt: null,
  createdAt: '2026-09-20T00:00:00Z',
  updatedAt: '2026-10-31T16:59:59Z',
  version: 1,
  questions: [],
}

const page = (items: unknown[]) => ({
  items,
  page: { number: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 },
})

function renderApp(respond: (request: RecordedRequest) => Response, initialPath = '/clubs/20001/applications') {
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/auth/me') return json({ user })
    if (request.url === '/api/v1/auth/csrf') return json({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' })
    return respond(request)
  })
  render(
    createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      createElement(AuthProvider, null, createElement(AppRoutes)),
    ),
  )
  return stub
}

test('committee applications are listed, filtered through Review API, and link to details', async () => {
  const stub = renderApp((request) => {
    if (request.url.startsWith('/api/v1/clubs/20001/rounds?')) {
      return json({ items: [draftRound], page: 0, size: 100, totalElements: 1, totalPages: 1 })
    }
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

test('evaluation form saves decision with notes and shows draft/published status with confirmation modal', async () => {
  let currentStatus = 'SUBMITTED'
  let roundPublishedAt: string | null = null

  const stub = renderApp((request) => {
    if (request.url === '/api/v1/clubs/20001/applications/90001') {
      return json({ ...detail, status: currentStatus })
    }
    if (request.url === '/api/v1/rounds/70001/applications/90001/decision' && request.method === 'GET') {
      return json({ ...evaluationSnapshot, status: currentStatus })
    }
    if (request.url === '/api/v1/clubs/20001/rounds/70001') {
      return json({ ...draftRound, resultsPublishedAt: roundPublishedAt })
    }
    if (request.url === '/api/v1/rounds/70001/applications/90001/decision' && request.method === 'PUT') {
      currentStatus = 'ACCEPTED'
      return json({
        ...evaluationSnapshot,
        status: 'ACCEPTED',
        resultMessage: 'ยินดีต้อนรับเข้าสู่ชมรม',
        version: 1,
        reviews: [
          {
            id: '97001',
            reviewerId: '10001',
            reviewerDisplayName: 'ประธานทดสอบ',
            recommendation: 'ACCEPT',
            internalComment: 'ประวัติกิจกรรมโดดเด่น',
            createdAt: '2026-11-10T10:00:00Z',
            updatedAt: '2026-11-10T10:00:00Z',
            version: 0,
          },
        ],
      })
    }
    if (request.url === '/api/v1/rounds/70001/publish-results' && request.method === 'POST') {
      roundPublishedAt = '2026-11-10T12:00:00Z'
      return json({
        roundId: '70001',
        clubId: '20001',
        resultsPublishedAt: roundPublishedAt,
        confirmationDeadline: '2026-11-20T16:59:59Z',
        acceptedCount: 1,
        rejectedCount: 0,
        roundVersion: 2,
      })
    }
    return json({ message: 'not found' }, 404)
  }, '/clubs/20001/applications/90001')

  try {
    await screen.findByText('เคยจัดกิจกรรมจิตอาสา')
    await screen.findByText('ฉบับร่าง (Draft)')

    fireEvent.click(screen.getByRole('radio', { name: 'ผ่านการคัดเลือก (อนุมัติ)' }))
    fireEvent.change(screen.getByLabelText('ข้อความแจ้งผู้สมัคร (แสดงหลังประกาศผล)'), {
      target: { value: 'ยินดีต้อนรับเข้าสู่ชมรม' },
    })
    fireEvent.change(screen.getByLabelText('หมายเหตุภายในกรรมการ (ผู้สมัครไม่เห็น)'), {
      target: { value: 'ประวัติกิจกรรมโดดเด่น' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'บันทึกผลการประเมิน' }))
    await screen.findByText(/บันทึกผลการประเมินและหมายเหตุเรียบร้อยแล้ว/)

    const saveReq = stub.requests.find(
      (req) => req.url === '/api/v1/rounds/70001/applications/90001/decision' && req.method === 'PUT',
    )
    assert.ok(saveReq)

    const publishTrigger = await screen.findByRole('button', { name: 'ประกาศผลการคัดเลือก' })
    fireEvent.click(publishTrigger)

    await screen.findByText('ยืนยันการประกาศผลการคัดเลือก')
    const confirmCheckbox = screen.getByRole('checkbox') as HTMLInputElement
    const confirmPublishBtn = screen.getByRole('button', { name: 'ยืนยันประกาศผลการคัดเลือก' }) as HTMLButtonElement
    assert.equal(confirmPublishBtn.disabled, true)

    fireEvent.click(confirmCheckbox)
    assert.equal(confirmPublishBtn.disabled, false)
    fireEvent.click(confirmPublishBtn)

    await screen.findByText('ประกาศผลแล้ว (Published)')
    assert.ok(screen.getByText(/ประกาศผลการคัดเลือกเรียบร้อยแล้ว/))
  } finally {
    cleanup()
    stub.restore()
  }
})

test('committee list batch quick-evaluation preserves existing resultMessage and snapshot version', async () => {
  let batchRequestBody: unknown = null

  const stub = renderApp((request) => {
    if (request.url.startsWith('/api/v1/clubs/20001/rounds?')) {
      return json({ items: [draftRound], page: 0, size: 100, totalElements: 1, totalPages: 1 })
    }
    if (request.url.startsWith('/api/v1/clubs/20001/applications?')) {
      return json(page([application]))
    }
    if (request.url === '/api/v1/rounds/70001/applications/90001/decision' && request.method === 'GET') {
      return json({
        ...evaluationSnapshot,
        resultMessage: 'ข้อความแจ้งผู้สมัครเดิม',
        version: 3,
      })
    }
    if (request.url === '/api/v1/rounds/70001/application-decisions' && request.method === 'PUT') {
      batchRequestBody = request.body ?? null
      return json({
        items: [
          {
            ...evaluationSnapshot,
            status: 'ACCEPTED',
            resultMessage: 'ข้อความแจ้งผู้สมัครเดิม',
            version: 4,
          },
        ],
      })
    }
    return json({ message: 'not found' }, 404)
  })

  try {
    await screen.findByText('ผู้สมัครทดสอบ')
    fireEvent.change(screen.getByLabelText('รอบรับสมัคร'), { target: { value: '70001' } })

    const quickSelect = await screen.findByLabelText('เลือกผลการคัดเลือกของ ผู้สมัครทดสอบ')
    fireEvent.change(quickSelect, { target: { value: 'ACCEPTED' } })

    fireEvent.change(screen.getByLabelText('หมายเหตุภายในกรรมการสำหรับรายการที่เลือก (ถ้ามี)'), {
      target: { value: 'ผ่านเกณฑ์สัมภาษณ์' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'บันทึกผลที่เลือก' }))
    await screen.findByText('บันทึกผลการคัดเลือกฉบับร่างจำนวน 1 รายการเรียบร้อยแล้ว')

    assert.deepEqual(batchRequestBody, {
      decisions: [
        {
          applicationId: '90001',
          decision: 'ACCEPTED',
          resultMessage: 'ข้อความแจ้งผู้สมัครเดิม',
          internalNote: 'ผ่านเกณฑ์สัมภาษณ์',
          version: 3,
        },
      ],
    })
  } finally {
    cleanup()
    stub.restore()
  }
})

test('empty and failed application lists have clear Thai states and retry controls', async () => {
  const stub = renderApp((request) => {
    if (request.url.startsWith('/api/v1/clubs/20001/rounds?')) {
      return json({ items: [], page: 0, size: 100, totalElements: 0, totalPages: 0 })
    }
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
    if (request.url.startsWith('/api/v1/clubs/20001/rounds?')) {
      return json({ items: [], page: 0, size: 100, totalElements: 0, totalPages: 0 })
    }
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