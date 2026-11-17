import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { json, problem, stubFetch } from './helpers.ts'
import type { PublicClubSearchItem } from '../src/features/clubs/types/publicClubSearch.ts'

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
const { default: ClubSearchPage } = await import('../src/pages/ClubSearchPage.tsx')

const club: PublicClubSearchItem = {
  id: '20001',
  name: 'ชมรมดนตรีสากล',
  description: 'ฝึกซ้อมดนตรีและทำกิจกรรมการแสดง',
  affiliationLevel: 'มหาวิทยาลัย',
  affiliationName: 'มหาวิทยาลัยธรรมศาสตร์',
  imageUrl: null,
  category: { id: '1', name: 'ศิลปะและวัฒนธรรม' },
  tags: [{ id: '1', name: 'ดนตรี' }],
  hasOpenRecruitment: true,
}

const categories = {
  items: [
    { id: '30001', name: 'เทคโนโลยีและนวัตกรรม' },
    { id: '30002', name: 'กีฬาและสุขภาพ' },
    { id: '30003', name: 'ศิลปะและวัฒนธรรม' },
    { id: '30004', name: 'จิตอาสาและสิ่งแวดล้อม' },
  ],
}

const page = (items: PublicClubSearchItem[] = []) => ({
  items,
  page: { number: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 },
})

test('search controls update the selected criteria and can be cleared', async () => {
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/public/club-categories') return json(categories)
    if (request.url.startsWith('/api/v1/public/clubs?')) return json(page())
    return problem(401, 'AUTHENTICATION_REQUIRED', 'No active session')
  })
  try {
    render(createElement(MemoryRouter, null,
      createElement(AuthProvider, null, createElement(ClubSearchPage))))

    const search = await screen.findByRole('searchbox', { name: 'ค้นหาชมรม' })
    const category = await screen.findByRole('combobox', { name: 'หมวดหมู่ชมรม' })
    const recruitment = screen.getByRole('checkbox', { name: 'เปิดรับสมัครอยู่' })

    fireEvent.change(search, { target: { value: 'ดนตรี' } })
    fireEvent.change(category, { target: { value: '30003' } })
    fireEvent.click(recruitment)

    assert.equal((search as HTMLInputElement).value, 'ดนตรี')
    assert.equal((category as HTMLSelectElement).value, '30003')
    assert.equal((recruitment as HTMLInputElement).checked, true)
    assert.ok(await screen.findByRole('heading', { name: 'ไม่พบชมรม' }))
    assert.equal(screen.queryByRole('group', { name: 'ตัวกรองที่เลือก' }), null)
    await waitFor(() => {
      assert.ok(stub.requests.some((request) => {
        const url = new URL(request.url, 'http://localhost')
        return url.pathname === '/api/v1/public/clubs'
          && url.searchParams.get('q') === 'ดนตรี'
          && url.searchParams.get('categoryId') === '30003'
          && url.searchParams.get('recruitmentStatus') === 'OPEN'
      }))
    })

    fireEvent.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }))
    await waitFor(() => {
      assert.equal((search as HTMLInputElement).value, '')
      assert.ok(stub.requests.some((request) => {
        const url = new URL(request.url, 'http://localhost')
        return url.pathname === '/api/v1/public/clubs'
          && !url.searchParams.has('q')
          && !url.searchParams.has('categoryId')
          && !url.searchParams.has('recruitmentStatus')
      }))
    })
    assert.equal((category as HTMLSelectElement).value, '')
    assert.equal((recruitment as HTMLInputElement).checked, false)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('renders clubs returned by the public search endpoint and updates filtered results', async () => {
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/public/club-categories') return json(categories)
    if (request.url.startsWith('/api/v1/public/clubs?')) {
      const url = new URL(request.url, 'http://localhost')
      return json(page(url.searchParams.get('q') === 'ฟุตบอล' ? [] : [club]))
    }
    return problem(401, 'AUTHENTICATION_REQUIRED', 'No active session')
  })
  try {
    render(createElement(MemoryRouter, null,
      createElement(AuthProvider, null, createElement(ClubSearchPage))))

    assert.ok(await screen.findByRole('link', { name: 'ชมรมดนตรีสากล' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'ค้นหาชมรม' }), {
      target: { value: 'ฟุตบอล' },
    })
    assert.ok(await screen.findByRole('heading', { name: 'ไม่พบชมรม' }))
    assert.ok(stub.requests.some((request) => {
      const url = new URL(request.url, 'http://localhost')
      return url.pathname === '/api/v1/public/clubs' && url.searchParams.get('q') === 'ฟุตบอล'
    }))
  } finally {
    cleanup()
    stub.restore()
  }
})

test('shows server search results even when the query matches neither name nor description', async () => {
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/public/club-categories') return json(categories)
    if (request.url.startsWith('/api/v1/public/clubs?')) return json(page([club]))
    return problem(401, 'AUTHENTICATION_REQUIRED', 'No active session')
  })
  try {
    render(createElement(MemoryRouter, null,
      createElement(AuthProvider, null, createElement(ClubSearchPage))))
    await screen.findByRole('link', { name: 'ชมรมดนตรีสากล' })
    fireEvent.change(screen.getByRole('searchbox', { name: 'ค้นหาชมรม' }), {
      target: { value: 'คำที่เซิร์ฟเวอร์จับคู่' },
    })
    await waitFor(() => assert.ok(stub.requests.some((request) =>
      new URL(request.url, 'http://localhost').searchParams.get('q') === 'คำที่เซิร์ฟเวอร์จับคู่')))
    assert.ok(await screen.findByRole('link', { name: 'ชมรมดนตรีสากล' }))
  } finally { cleanup(); stub.restore() }
})

test('renders matching club cards and filters them using the selected controls', async () => {
  const stub = stubFetch(() => problem(401, 'AUTHENTICATION_REQUIRED', 'No active session'))
  try {
    render(createElement(MemoryRouter, null,
      createElement(AuthProvider, null, createElement(ClubSearchPage, { clubs: [club] }))))

    assert.ok(await screen.findByRole('link', { name: 'ชมรมดนตรีสากล' }))
    const search = screen.getByRole('searchbox', { name: 'ค้นหาชมรม' })
    fireEvent.change(search, { target: { value: 'ฟุตบอล' } })
    assert.ok(screen.getByRole('heading', { name: 'ไม่พบชมรม' }))

    fireEvent.change(search, { target: { value: 'ดนตรี' } })
    assert.ok(screen.getByRole('link', { name: 'ชมรมดนตรีสากล' }))
    assert.equal(stub.requests.some((request) => request.url.includes('/api/v1/public/clubs?')), false)
  } finally {
    cleanup()
    stub.restore()
  }
})


test('shows the open round belonging to each club with its own application link', async () => {
  const round = { id: '42', name: 'รอบดนตรี', description: 'ร่วมเล่นดนตรี', opensAt: '2026-01-01T00:00:00Z', closesAt: '2099-01-01T00:00:00Z', resultsScheduledAt: null }
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/public/club-categories') return json(categories)
    if (request.url.startsWith('/api/v1/public/clubs?')) return json(page([club]))
    if (request.url === '/api/v1/public/clubs/20001/recruitment-rounds?page=0&size=100') return json({ items: [round], page: { number: 0, size: 1, totalElements: 1, totalPages: 1 } })
    return problem(401, 'AUTHENTICATION_REQUIRED', 'No active session')
  })
  try {
    render(createElement(MemoryRouter, null, createElement(AuthProvider, null, createElement(ClubSearchPage))))
    assert.ok(await screen.findByText(/ปิดรับสมัครในอีก/))
    assert.equal(screen.queryByText('ร่วมเล่นดนตรี'), null)
    assert.equal(screen.getByRole('link', { name: 'สมัคร รอบดนตรี' }).getAttribute('href'), '/clubs/20001/rounds/42/apply')
    assert.equal(screen.getByRole('link', { name: 'ดูรายละเอียดชมรม ชมรมดนตรีสากล' }).getAttribute('href'), '/clubs/20001')
  } finally { cleanup(); stub.restore() }
})

test('keeps the club link available when recruitment details cannot be loaded', async () => {
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/public/club-categories') return json(categories)
    if (request.url.startsWith('/api/v1/public/clubs?')) return json(page([club]))
    if (request.url.includes('/recruitment-rounds')) return problem(503, 'SERVICE_UNAVAILABLE', 'unavailable')
    return problem(401, 'AUTHENTICATION_REQUIRED', 'No active session')
  })
  try {
    render(createElement(MemoryRouter, null, createElement(AuthProvider, null, createElement(ClubSearchPage))))
    assert.ok(await screen.findByText('โหลดรอบรับสมัครไม่สำเร็จ'))
    assert.ok(screen.getByRole('link', { name: 'ดูรายละเอียดชมรม ชมรมดนตรีสากล' }))
    assert.equal(screen.queryByRole('link', { name: /^สมัคร / }), null)
  } finally { cleanup(); stub.restore() }
})

test('shows a closed state and no apply link when the club has no open rounds', async () => {
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/public/club-categories') return json(categories)
    if (request.url.startsWith('/api/v1/public/clubs?')) return json(page([club]))
    if (request.url.includes('/recruitment-rounds')) return json({ items: [], page: { number: 0, size: 1, totalElements: 0, totalPages: 0 } })
    return problem(401, 'AUTHENTICATION_REQUIRED', 'No active session')
  })
  try {
    render(createElement(MemoryRouter, null, createElement(AuthProvider, null, createElement(ClubSearchPage))))
    assert.ok(await screen.findByText('ยังไม่เปิดรับสมัคร'))
    assert.equal(screen.queryByText(/ปิดรับสมัครเมื่อ/), null)
    assert.equal(screen.queryByRole('link', { name: /^สมัคร / }), null)
    assert.ok(screen.getByRole('link', { name: 'ดูรายละเอียดชมรม ชมรมดนตรีสากล' }))
  } finally { cleanup(); stub.restore() }
})

test('shows the most recent closing date and time only when the backend provides it', async () => {
  const closedClub = { ...club, hasOpenRecruitment: false, lastRecruitmentClosedAt: '2020-01-05T12:30:00Z' }
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/public/club-categories') return json(categories)
    if (request.url.startsWith('/api/v1/public/clubs?')) return json(page([closedClub]))
    return problem(401, 'AUTHENTICATION_REQUIRED', 'No active session')
  })
  try {
    render(createElement(MemoryRouter, null, createElement(AuthProvider, null, createElement(ClubSearchPage))))
    const closedAt = await screen.findByText(/19:30 น\./)
    assert.match(closedAt.textContent ?? '', /ปิดรับสมัครเมื่อ/)
    assert.equal(screen.queryByRole('link', { name: /^สมัคร / }), null)
  } finally { cleanup(); stub.restore() }
})
