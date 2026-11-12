import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { formatThaiDateTime } from '../src/lib/format.ts'
import { json, stubFetch } from './helpers.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, {
  React, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })

const { cleanup, fireEvent, render, screen, within } = await import('@testing-library/react')
const { MemoryRouter } = await import('react-router')
const { ClubDetailPage } = await import('../src/features/clubs/components/ClubDetailPage.tsx')

const profile = {
  id: '20001',
  name: 'ชมรมตัวอย่าง',
  canEditProfile: false,
  description: 'รายละเอียดชมรม',
  objectives: null,
  contactUrl: null,
  facebookUrl: null,
  instagramUrl: null,
  contactEmail: null,
  affiliationLevel: null,
  affiliationName: null,
  imageUrl: 'https://images.example.org/clubs/20001.png',
  bannerUrl: 'https://images.example.org/clubs/20001-banner.png',
  category: { id: '30001', name: 'วิชาการ' },
  tags: [],
}

const rounds = {
  items: [
    {
      id: '50001',
      name: 'รอบที่ 1',
      description: 'เปิดรับทุกคณะ\nไม่ต้องมีประสบการณ์',
      opensAt: '2026-10-01T00:00:00Z',
      closesAt: '2026-10-31T16:59:59Z',
      resultsScheduledAt: '2026-11-07T09:00:00Z',
    },
    {
      id: '50002',
      name: 'รอบที่ 2',
      description: '',
      opensAt: '2026-10-01T00:00:00Z',
      closesAt: '2026-11-30T16:59:59Z',
      resultsScheduledAt: null,
    },
  ],
  page: { number: 0, size: 20, totalElements: 2, totalPages: 1 },
}

test('club page shows round details and results date, and falls back for broken images', async () => {
  const stub = stubFetch(request => json(request.url.endsWith('/recruitment-rounds') ? rounds : profile))
  const applied: string[] = []
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, {
    clubId: '20001',
    isLoggedIn: true,
    onNavigateToApplication: (roundId: string) => { applied.push(roundId) },
  })))
  try {
    await screen.findByRole('heading', { level: 1, name: 'ชมรมตัวอย่าง' })
    assert.equal(screen.queryByRole('link', { name: 'แก้ไขข้อมูลชมรม' }), null)

    const [first, second] = screen.getAllByRole('article')
    const round = within(first)
    assert.ok(round.getByRole('heading', { level: 3, name: 'รอบที่ 1' }))
    assert.ok(round.getByRole('heading', { level: 4, name: 'รายละเอียด/คุณสมบัติ' }))
    const details = round.getByText(/เปิดรับทุกคณะ/)
    assert.equal(details.textContent, 'เปิดรับทุกคณะ\nไม่ต้องมีประสบการณ์')
    assert.match(details.className, /whitespace-pre-line/)
    assert.match(first.textContent ?? '', /กำหนดประกาศผล:/)
    assert.ok(first.textContent?.includes(formatThaiDateTime('2026-11-07T09:00:00Z')))

    // No results date and no description: neither line is shown.
    assert.doesNotMatch(second.textContent ?? '', /กำหนดประกาศผล|รายละเอียด\/คุณสมบัติ/)

    // Apply still goes to the selected round's form.
    fireEvent.click(within(second).getByRole('button', { name: 'สมัครเข้าร่วมชมรมนี้' }))
    assert.deepEqual(applied, ['50002'])

    // Logo and cover both fall back to local placeholders when the image fails.
    fireEvent.error(screen.getByRole('img', { name: 'โลโก้ ชมรมตัวอย่าง' }))
    assert.ok(screen.queryByRole('img', { name: 'โลโก้ ชมรมตัวอย่าง' }) === null)
    fireEvent.error(screen.getByRole('img', { name: 'ชมรมตัวอย่าง' }))
    assert.ok(screen.queryByRole('img') === null)
    assert.doesNotMatch(document.body.innerHTML, /unsplash|https:\/\/images\.example\.org/)
  } finally { cleanup(); stub.restore() }
})

test('club page without a logo or banner never loads an external placeholder', async () => {
  const stub = stubFetch(request => json(request.url.endsWith('/recruitment-rounds')
    ? { ...rounds, items: [] }
    : { ...profile, imageUrl: null, bannerUrl: null }))
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, { clubId: '20001' })))
  try {
    await screen.findByRole('heading', { level: 1, name: 'ชมรมตัวอย่าง' })
    assert.ok(screen.queryByRole('img') === null)
    assert.doesNotMatch(document.body.innerHTML, /<img|unsplash/)
  } finally { cleanup(); stub.restore() }
})

test('club page shows the edit link only when the profile grants permission', async () => {
  const stub = stubFetch(request => json(request.url.endsWith('/recruitment-rounds')
    ? { ...rounds, items: [] }
    : { ...profile, canEditProfile: true }))
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, { clubId: '20001' })))
  try {
    await screen.findByRole('heading', { level: 1, name: 'ชมรมตัวอย่าง' })
    assert.equal(
      screen.getByRole('link', { name: 'แก้ไขข้อมูลชมรม' }).getAttribute('href'),
      '/clubs/20001/edit',
    )
  } finally { cleanup(); stub.restore() }
})
