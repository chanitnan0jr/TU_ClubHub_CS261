import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'

/**
 * Reproducible Frontend -> Backend HTTP API -> PostgreSQL E2E verification for Task54 (APP-03).
 *
 * Prerequisites (isolated test database, never production/demo):
 *   1. Create and seed `tu_clubhub_test` with V1..V3 migrations (including V2__seed_test_data.sql).
 *   2. Start backend on port 18080 pointing to `tu_clubhub_test` with `SPRING_PROFILES_ACTIVE=dev` and `TU_AUTH_MODE=mock`.
 *   3. Run from `frontend/`:
 *      APP_URL=http://127.0.0.1:18080 npx tsx --test scripts/verify-task54-e2e.ts
 */

const baseUrl = (process.env.APP_URL ?? 'http://127.0.0.1:18080').replace(/\/$/, '')
const nativeFetch = globalThis.fetch.bind(globalThis)

class HttpCookieSession {
  private cookies = new Map<string, string>()

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    const targetUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`
    const headers = new Headers(init?.headers)
    if (this.cookies.size > 0) {
      headers.set(
        'Cookie',
        Array.from(this.cookies.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join('; '),
      )
    }
    const response = await nativeFetch(targetUrl, { ...init, headers, redirect: 'manual' })
    const setCookies = response.headers.getSetCookie?.() ?? []
    for (const raw of setCookies) {
      const [pair] = raw.split(';')
      const eq = pair.indexOf('=')
      if (eq > 0) {
        const name = pair.slice(0, eq).trim()
        const value = pair.slice(eq + 1).trim()
        if (value) this.cookies.set(name, value)
        else this.cookies.delete(name)
      }
    }
    return response
  }

  async jsonRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (method !== 'GET') {
      const csrfRes = await this.fetch('/api/v1/auth/csrf')
      assert.equal(csrfRes.status, 200, `CSRF fetch failed with ${csrfRes.status}`)
      const csrf = (await csrfRes.json()) as { token: string; headerName: string }
      headers[csrf.headerName] = csrf.token
      headers['Content-Type'] = 'application/json'
    }
    const res = await this.fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    assert.ok(
      res.status >= 200 && res.status < 300,
      `${method} ${path} failed (${res.status}): ${text}`,
    )
    return (text ? JSON.parse(text) : undefined) as T
  }
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: `${baseUrl}/`,
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
const { MyApplicationsPage } = await import(
  '../src/features/applications/pages/MyApplicationsPage.tsx'
)

import type {
  ApplicantApplicationDetail,
  ApplicantApplicationPage,
} from '../src/features/applications/types/application.ts'

function CurrentPath() {
  return createElement('output', { 'data-testid': 'current-path' }, useLocation().pathname)
}

function renderLiveFlow(clubId: string, roundId: string) {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [`/clubs/${clubId}/rounds/${roundId}/apply`] },
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
              element: createElement(DynamicApplicationForm, { clubId, roundId }),
            }),
            createElement(Route, {
              path: '/clubs/:clubId/rounds/:roundId/apply/result',
              element: createElement(ApplicationResultRoutePage),
            }),
            createElement(Route, {
              path: '/profile/applications',
              element: createElement(MyApplicationsPage),
            }),
          ),
          createElement(CurrentPath),
        ),
      ),
    ),
  )
}

interface RoundSummary {
  id: string
  clubId: string
  version: number
  publicationStatus: string
}

async function createAndPublishOpenRound(
  president: HttpCookieSession,
  clubId: string,
  titleSuffix: string,
): Promise<RoundSummary> {
  const now = Date.now()
  const opensAt = new Date(now - 3600_000).toISOString()
  const closesAt = new Date(now + 7 * 86400_000).toISOString()
  const resultsScheduledAt = new Date(now + 10 * 86400_000).toISOString()
  const confirmationDeadline = new Date(now + 14 * 86400_000).toISOString()

  const draft = await president.jsonRequest<RoundSummary>(
    `/api/v1/clubs/${clubId}/rounds`,
    'POST',
    {
      title: `รอบทดสอบ E2E Task54 (${titleSuffix})`,
      academicYear: 2569,
      semester: 1,
      description: 'รอบรับสมัครสำหรับการตรวจรับ E2E Task54',
      eligibilityText: 'นักศึกษาปัจจุบัน มธ.',
      opensAt,
      closesAt,
      resultsScheduledAt,
      confirmationDeadline,
      questions: [
        {
          prompt: 'เหตุใดจึงสนใจสมัครชมรมเขียนโปรแกรมในรอบนี้?',
          required: true,
          displayOrder: 1,
          maxLength: 1000,
        },
        {
          prompt: 'ทักษะหรือภาษาโปรแกรมที่ถนัด (ถ้ามี)',
          required: false,
          displayOrder: 2,
          maxLength: 1000,
        },
      ],
    },
  )

  return president.jsonRequest<RoundSummary>(
    `/api/v1/clubs/${clubId}/rounds/${draft.id}`,
    'PATCH',
    { action: 'PUBLISH', version: draft.version },
  )
}

test('Task54 Live E2E: happy path submission, duplicate conflict (201 -> 409), and round closed while filling form (409)', async () => {
  const presidentSession = new HttpCookieSession()
  const applicantSession = new HttpCookieSession()

  // 1. Authenticate committee president (student-demo, president of club 3) and applicant (applicant-demo)
  await presidentSession.jsonRequest('/api/v1/auth/login', 'POST', {
    username: 'student-demo',
    password: 'tu-clubhub-demo',
  })
  await applicantSession.jsonRequest('/api/v1/auth/login', 'POST', {
    username: 'applicant-demo',
    password: 'tu-clubhub-demo',
  })

  // Create two fresh open rounds under Club 3 (ชมรมเขียนโปรแกรม) so every run is repeatable
  const roundA = await createAndPublishOpenRound(presidentSession, '3', `HappyAndDup-${Date.now()}`)
  const roundB = await createAndPublishOpenRound(presidentSession, '3', `CloseMidForm-${Date.now()}`)

  // Bind global fetch in JSDOM to the authenticated applicant session talking to the live backend
  globalThis.fetch = applicantSession.fetch.bind(applicantSession) as typeof fetch

  const specialMotivation = 'สนใจ <script>alert("xss")</script> & \' "-- 🚀 100%'
  const specialAnswer = 'คำตอบพิเศษ: "TypeScript / Java" & SQL \'OR 1=1\' 🌱'
  const trimmedUrl = 'https://example.edu/portfolio?task=54&check=1'

  try {
    // =========================================================================
    // Scenario 1: Happy Path E2E (UI Form -> Live HTTP POST -> PostgreSQL -> Receipt -> My Applications)
    // =========================================================================
    renderLiveFlow('3', roundA.id)

    const motivationInput = await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/)
    fireEvent.change(motivationInput, {
      target: { value: `  ${specialMotivation}  ` },
    })
    fireEvent.change(
      screen.getByLabelText(/เหตุใดจึงสนใจสมัครชมรมเขียนโปรแกรมในรอบนี้/),
      { target: { value: `  ${specialAnswer}  ` } },
    )
    fireEvent.click(screen.getByRole('button', { name: /เพิ่มลิงก์เอกสาร/ }))
    fireEvent.change(screen.getByLabelText(/ชื่อ\/คำอธิบายเอกสาร/), {
      target: { value: '  พอร์ตโฟลิโอ E2E  ' },
    })
    fireEvent.change(screen.getByLabelText(/URL ลิงก์เอกสาร/), {
      target: { value: `  ${trimmedUrl}  ` },
    })

    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันและส่งใบสมัคร' }))

    await waitFor(() => {
      assert.ok(screen.getByRole('heading', { name: 'ผลการส่งใบสมัคร' }))
    })
    assert.equal(
      screen.getByTestId('current-path').textContent,
      `/clubs/3/rounds/${roundA.id}/apply/result`,
    )
    const receiptBadge = screen.getByText(/เลขที่ใบสมัคร \d+ · SUBMITTED/)
    const match = receiptBadge.textContent?.match(/เลขที่ใบสมัคร (\d+) · SUBMITTED/)
    assert.ok(match, `Expected receipt ID in "${receiptBadge.textContent}"`)
    const applicationId = match[1]

    // Navigate from Receipt to My Applications (/profile/applications) and verify persisted data
    fireEvent.click(screen.getByRole('link', { name: 'ไปยังประวัติการสมัคร' }))
    await waitFor(() => {
      assert.equal(screen.getByTestId('current-path').textContent, '/profile/applications')
      assert.ok(screen.getAllByText('รอพิจารณา').length >= 1)
    })

    // Verify full persisted record via live GET /api/v1/me/applications/{id}
    const detail = await applicantSession.jsonRequest<ApplicantApplicationDetail>(
      `/api/v1/me/applications/${applicationId}`,
    )

    assert.equal(detail.id, applicationId)
    assert.equal(detail.club.id, '3')
    assert.equal(detail.round.id, roundA.id)
    assert.equal(detail.applicantVisibleStatus, 'SUBMITTED')
    assert.equal(detail.motivation, specialMotivation)
    assert.equal(detail.questionsWithAnswers.length, 2)
    assert.equal(detail.questionsWithAnswers[0].answerText, specialAnswer)
    assert.equal(detail.questionsWithAnswers[1].answerText, null)
    assert.deepEqual(detail.links, [
      { label: 'พอร์ตโฟลิโอ E2E', url: trimmedUrl, displayOrder: 1 },
    ])
    assert.equal(detail.statusHistory.length, 1)
    assert.equal(detail.statusHistory[0].status, 'SUBMITTED')
    cleanup()

    // =========================================================================
    // Scenario 2: Duplicate Submission to Same Round (201 -> 409 APPLICATION_ALREADY_EXISTS)
    // =========================================================================
    renderLiveFlow('3', roundA.id)
    fireEvent.change(
      await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/),
      { target: { value: 'พยายามส่งซ้ำในรอบเดิม' } },
    )
    fireEvent.change(
      screen.getByLabelText(/เหตุใดจึงสนใจสมัครชมรมเขียนโปรแกรมในรอบนี้/),
      { target: { value: 'คำตอบส่งซ้ำ' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันและส่งใบสมัคร' }))

    const duplicateAlert = await screen.findByRole('alert')
    assert.match(duplicateAlert.textContent ?? '', /คุณได้ส่งใบสมัครในรอบรับสมัครนี้ไปแล้ว/)
    assert.equal(
      screen.getByTestId('current-path').textContent,
      `/clubs/3/rounds/${roundA.id}/apply`,
    )
    cleanup()

    // =========================================================================
    // Scenario 3: Round Closed While Applicant is Filling Form (409 ROUND_CLOSED)
    // =========================================================================
    renderLiveFlow('3', roundB.id)
    fireEvent.change(
      await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/),
      { target: { value: 'กรอกค้างไว้ก่อนกรรมการปิดรอบ' } },
    )
    fireEvent.change(
      screen.getByLabelText(/เหตุใดจึงสนใจสมัครชมรมเขียนโปรแกรมในรอบนี้/),
      { target: { value: 'คำตอบก่อนปิดรอบ' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /ตรวจสอบข้อมูลใบสมัคร/ }))

    // President closes roundB while applicant has the Review step open
    const closedRound = await presidentSession.jsonRequest<RoundSummary>(
      `/api/v1/clubs/3/rounds/${roundB.id}`,
      'PATCH',
      { action: 'CLOSE', version: roundB.version },
    )
    assert.equal(closedRound.publicationStatus, 'PUBLISHED')

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันและส่งใบสมัคร' }))

    const closedAlert = await screen.findByRole('alert')
    assert.match(closedAlert.textContent ?? '', /รอบรับสมัครนี้ปิดรับใบสมัครแล้ว/)
    assert.equal(
      screen.getByTestId('current-path').textContent,
      `/clubs/3/rounds/${roundB.id}/apply`,
    )

    // Confirm in PostgreSQL via API that roundA has 1 application and roundB has 0 applications
    const myApps = await applicantSession.jsonRequest<ApplicantApplicationPage>(
      '/api/v1/me/applications?page=0&size=50',
    )
    assert.equal(
      myApps.items.filter((item) => item.round.id === roundA.id).length,
      1,
      'roundA must have exactly 1 persisted application',
    )
    assert.equal(
      myApps.items.filter((item) => item.round.id === roundB.id).length,
      0,
      'roundB must have 0 persisted applications after closing',
    )
  } finally {
    cleanup()
    globalThis.fetch = nativeFetch
  }
})
