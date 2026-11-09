import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { csrfResponse, json, stubFetch } from './helpers.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
})

Object.assign(globalThis, {
  React,
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: dom.window.navigator,
})
dom.window.scrollTo = () => {}

const { cleanup, fireEvent, render, screen, waitFor } = await import(
  '@testing-library/react'
)
const { MemoryRouter, Route, Routes, useLocation } = await import('react-router')
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { DynamicApplicationForm } = await import(
  '../src/features/applications/components/DynamicApplicationForm.tsx'
)
const { default: ApplicationResultRoutePage } = await import(
  '../src/pages/ApplicationResultRoutePage.tsx'
)

function CurrentPath() {
  return createElement('output', { 'data-testid': 'current-path' }, useLocation().pathname)
}

const applicationForm = {
  round: {
    id: '70001',
    clubId: '20001',
    title: 'รอบรับสมัครอาสาสมัคร',
    description: 'รายละเอียดรอบสมัคร',
    eligibilityText: null,
    opensAt: '2026-10-20T02:00:00Z',
    closesAt: '2026-11-01T10:00:00Z',
  },
  questions: [
    {
      id: '81001',
      type: 'TEXT',
      questionText: 'เหตุใดจึงสนใจเข้าร่วมกิจกรรมของชมรม?',
      isRequired: true,
      displayOrder: 1,
      maxLength: 1000,
    },
  ],
}

const club = {
  id: '20001',
  name: 'ชมรมอาสาพัฒนาชุมชน',
  description: 'ร่วมทำกิจกรรมเพื่อสังคม',
  objectives: null,
  contactUrl: null,
  facebookUrl: null,
  instagramUrl: null,
  contactEmail: null,
  affiliationLevel: null,
  affiliationName: null,
  imageUrl: null,
  bannerUrl: null,
  category: null,
  tags: [],
}

function applicationApiStub(
  postDelay = 0,
  authUser = { id: 'user-001', role: 'STUDENT' },
) {
  let submissions = 0
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/auth/me') return json({ user: authUser })
    if (request.url === '/api/v1/rounds/70001/application-form') {
      return json(applicationForm)
    }
    if (request.url === '/api/v1/public/clubs/20001') return json(club)
    if (request.method === 'POST' && request.url === '/api/v1/rounds/70001/applications') {
      submissions += 1
      return new Promise((resolve) => {
        setTimeout(
          () =>
            resolve(
              json(
                {
                  id: '90001',
                  clubId: '20001',
                  roundId: '70001',
                  status: 'PENDING',
                  submittedAt: '2026-10-30T12:00:00Z',
                },
                201,
              ),
            ),
          postDelay,
        )
      })
    }
    return json({ detail: 'Unexpected request' }, 500)
  })

  return { ...stub, getSubmissionCount: () => submissions }
}

const renderApplication = () =>
  render(
    createElement(
      MemoryRouter,
      { initialEntries: ['/clubs/20001/rounds/70001/apply'] },
      createElement(
        AuthProvider,
        null,
        createElement(
          React.Fragment,
          null,
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: '/clubs/:clubId/rounds/:roundId/apply',
              element: createElement(DynamicApplicationForm, {
                clubId: '20001',
                roundId: '70001',
              }),
            }),
            createElement(Route, {
              path: '/clubs/:clubId/rounds/:roundId/apply/result',
              element: createElement(ApplicationResultRoutePage),
            }),
          ),
          createElement(CurrentPath),
        ),
      ),
    ),
  )

test('application form loads dynamic questions and validates required fields', async () => {
  const stub = applicationApiStub()
  try {
    renderApplication()
    assert.ok(
      await screen.findByLabelText(/เหตุใดจึงสนใจเข้าร่วมกิจกรรมของชมรม/),
    )
    assert.equal(screen.getAllByRole('textbox').length, 2)
    assert.ok(screen.getByRole('heading', { name: 'ข้อมูลผู้สมัคร' }))

    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))
    assert.match(
      screen.getByRole('alert').textContent ?? '',
      /กรุณาตรวจสอบข้อมูลที่จำเป็น/,
    )
    assert.ok(
      screen.getByRole('link', { name: 'เหตุผลที่สนใจเข้าร่วมชมรม' }),
    )
    assert.ok(screen.getByRole('link', { name: 'คำถามข้อ 1' }))
    assert.equal(stub.getSubmissionCount(), 0)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('invalid document URLs show the application form validation message', async () => {
  const stub = applicationApiStub()
  try {
    renderApplication()
    fireEvent.change(
      await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/),
      { target: { value: 'อยากร่วมทำกิจกรรมอาสา' } },
    )
    fireEvent.change(
      screen.getByLabelText(/เหตุใดจึงสนใจเข้าร่วมกิจกรรมของชมรม/),
      { target: { value: 'อยากช่วยพัฒนาชุมชน' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /เพิ่มลิงก์เอกสาร/ }))
    fireEvent.change(screen.getByLabelText(/ชื่อ\/คำอธิบายเอกสาร/), {
      target: { value: 'ผลงาน' },
    })
    fireEvent.change(screen.getByLabelText(/URL ลิงก์เอกสาร/), {
      target: { value: 'not-a-url' },
    })
    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))

    assert.match(
      screen.getByText(/กรุณาระบุ URL HTTPS ที่ถูกต้อง/).textContent ?? '',
      /URL HTTPS/,
    )
    assert.equal(screen.getByLabelText(/URL ลิงก์เอกสาร/).getAttribute('aria-invalid'), 'true')
    assert.equal(stub.getSubmissionCount(), 0)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('successful submission shows spinner, prevents duplicate submit, and displays the receipt', async () => {
  const stub = applicationApiStub(200)
  try {
    renderApplication()
    fireEvent.change(
      await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/),
      { target: { value: 'อยากร่วมทำกิจกรรมอาสา' } },
    )
    fireEvent.change(
      screen.getByLabelText(/เหตุใดจึงสนใจเข้าร่วมกิจกรรมของชมรม/),
      { target: { value: 'อยากช่วยพัฒนาชุมชน' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))
    fireEvent.click(screen.getByRole('checkbox'))

    const submitButton = screen.getByRole('button', {
      name: 'ยืนยันและส่งใบสมัคร',
    })
    fireEvent.click(submitButton)
    assert.equal(submitButton.hasAttribute('disabled'), true)
    assert.ok(screen.getByText('กำลังส่งใบสมัคร...'))

    await waitFor(() => {
      assert.ok(screen.getByRole('heading', { name: 'ผลการส่งใบสมัคร' }))
    })
    assert.equal(
      screen.getByTestId('current-path').textContent,
      '/clubs/20001/rounds/70001/apply/result',
    )
    assert.ok(screen.getByRole('heading', { name: 'ส่งใบสมัครสำเร็จเรียบร้อยแล้ว!' }))
    assert.ok(screen.getByText(/เลขที่ใบสมัคร 90001/))
    assert.equal(
      screen.getByRole('link', { name: 'ไปยังประวัติการสมัคร' }).getAttribute('href'),
      '/profile/applications',
    )
    assert.equal(stub.getSubmissionCount(), 1)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('review shows missing profile fields without inventing applicant data', async () => {
  const stub = applicationApiStub()
  try {
    renderApplication()
    fireEvent.change(
      await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/),
      { target: { value: 'อยากร่วมทำกิจกรรมอาสา' } },
    )
    fireEvent.change(
      screen.getByLabelText(/เหตุใดจึงสนใจเข้าร่วมกิจกรรมของชมรม/),
      { target: { value: 'อยากช่วยพัฒนาชุมชน' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))

    assert.ok(screen.getByRole('heading', { name: 'ข้อมูลผู้สมัคร' }))
    assert.equal(screen.getAllByText('ยังไม่มีข้อมูลจากระบบ').length, 4)
    assert.ok(screen.getByText('ยืนยันตัวตนผ่านบัญชีที่เข้าสู่ระบบแล้ว'))
    assert.ok(screen.getByRole('checkbox'))
    assert.equal(
      screen.getByRole('button', { name: 'ยืนยันและส่งใบสมัคร' }).hasAttribute('disabled'),
      true,
    )
  } finally {
    cleanup()
    stub.restore()
  }
})

test('review uses available profile data and masks the student code', async () => {
  const stub = applicationApiStub(0, {
    id: 'user-002',
    role: 'STUDENT',
    displayName: 'ผู้สมัครทดสอบ',
    studentCode: '6601234567',
    email: 'student@example.edu',
    facultyName: 'คณะทดสอบ',
  })
  try {
    renderApplication()
    fireEvent.change(
      await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/),
      { target: { value: 'อยากร่วมทำกิจกรรมอาสา' } },
    )
    fireEvent.change(
      screen.getByLabelText(/เหตุใดจึงสนใจเข้าร่วมกิจกรรมของชมรม/),
      { target: { value: 'อยากช่วยพัฒนาชุมชน' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))

    // The account name in the top bar now comes from PublicLayout, outside this component.
    assert.equal(screen.getAllByText('ผู้สมัครทดสอบ').length, 1)
    assert.ok(screen.getByText('66••••••67'))
    assert.ok(screen.getByText('student@example.edu'))
    assert.ok(screen.getByText('คณะทดสอบ'))
  } finally {
    cleanup()
    stub.restore()
  }
})

test('round closing while filling the form shows the conflict alert and stays on the review step', async () => {
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/auth/me') return json({ user: { id: 'user-001', role: 'STUDENT' } })
    if (request.url === '/api/v1/rounds/70001/application-form') return json(applicationForm)
    if (request.url === '/api/v1/public/clubs/20001') return json(club)
    if (request.method === 'POST' && request.url === '/api/v1/rounds/70001/applications') {
      return json(
        {
          code: 'RESOURCE_CONFLICT',
          reason: 'ROUND_CLOSED',
          detail: 'The recruitment round is closed.',
        },
        409,
        { 'Content-Type': 'application/problem+json' },
      )
    }
    return json({ detail: 'Unexpected request' }, 500)
  })
  try {
    renderApplication()
    fireEvent.change(
      await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/),
      { target: { value: 'อยากร่วมทำกิจกรรมอาสา' } },
    )
    fireEvent.change(
      screen.getByLabelText(/เหตุใดจึงสนใจเข้าร่วมกิจกรรมของชมรม/),
      { target: { value: 'อยากช่วยพัฒนาชุมชน' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันและส่งใบสมัคร' }))

    const alert = await screen.findByRole('alert')
    assert.match(alert.textContent ?? '', /รอบรับสมัครนี้ปิดรับใบสมัครแล้ว/)
    assert.equal(
      screen.getByTestId('current-path').textContent,
      '/clubs/20001/rounds/70001/apply',
    )
  } finally {
    cleanup()
    stub.restore()
  }
})

test('special characters submit intact with SUBMITTED receipt and duplicate submit shows conflict alert', async () => {
  let attempt = 0
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/auth/me') return json({ user: { id: 'user-001', role: 'STUDENT' } })
    if (request.url === '/api/v1/rounds/70001/application-form') return json(applicationForm)
    if (request.url === '/api/v1/public/clubs/20001') return json(club)
    if (request.method === 'POST' && request.url === '/api/v1/rounds/70001/applications') {
      attempt += 1
      if (attempt === 1) {
        return json(
          {
            code: 'RESOURCE_CONFLICT',
            reason: 'APPLICATION_ALREADY_EXISTS',
            detail: 'Duplicate application.',
          },
          409,
          { 'Content-Type': 'application/problem+json' },
        )
      }
      return json(
        {
          id: '90002',
          clubId: '20001',
          roundId: '70001',
          status: 'SUBMITTED',
          submittedAt: '2026-10-30T12:00:00Z',
        },
        201,
      )
    }
    return json({ detail: 'Unexpected request' }, 500)
  })
  const specialMotivation = 'สนใจ <script>alert("xss")</script> & \' "-- 🚀 100%'
  const specialAnswer = 'คำตอบพิเศษ: "C++ / C#" & SQL \'OR 1=1\' 🌱'
  try {
    renderApplication()
    fireEvent.change(
      await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/),
      { target: { value: `  ${specialMotivation}  ` } },
    )
    fireEvent.change(
      screen.getByLabelText(/เหตุใดจึงสนใจเข้าร่วมกิจกรรมของชมรม/),
      { target: { value: `  ${specialAnswer}  ` } },
    )
    fireEvent.click(screen.getByRole('button', { name: /เพิ่มลิงก์เอกสาร/ }))
    fireEvent.change(screen.getByLabelText(/ชื่อ\/คำอธิบายเอกสาร/), {
      target: { value: '  พอร์ตโฟลิโอ & ผลงาน  ' },
    })
    fireEvent.change(screen.getByLabelText(/URL ลิงก์เอกสาร/), {
      target: { value: '  https://example.edu/portfolio?tag=a&b=1  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))
    fireEvent.click(screen.getByRole('checkbox'))

    // First attempt simulates concurrent/existing application conflict (409 APPLICATION_ALREADY_EXISTS)
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันและส่งใบสมัคร' }))
    const conflictAlert = await screen.findByRole('alert')
    assert.match(conflictAlert.textContent ?? '', /คุณได้ส่งใบสมัครในรอบรับสมัครนี้ไปแล้ว/)

    // Second attempt succeeds and navigates to the SUBMITTED receipt
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันและส่งใบสมัคร' }))
    await waitFor(() => {
      assert.ok(screen.getByRole('heading', { name: 'ผลการส่งใบสมัคร' }))
    })
    assert.ok(screen.getByText(/เลขที่ใบสมัคร 90002 · SUBMITTED/))
    const postReq = stub.requests.find((r) => r.method === 'POST')
    assert.deepEqual(postReq?.body, {
      motivation: specialMotivation,
      answers: [{ questionId: '81001', answerText: specialAnswer }],
      links: [{ label: 'พอร์ตโฟลิโอ & ผลงาน', url: 'https://example.edu/portfolio?tag=a&b=1' }],
    })
  } finally {
    cleanup()
    stub.restore()
  }
})
