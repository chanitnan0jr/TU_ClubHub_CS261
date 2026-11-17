import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
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

test('club page shows the current round and falls back for broken images', async () => {
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
    assert.equal(screen.queryByRole('heading', { name: 'รอบรับสมัครที่เปิดรับสมัครในขณะนี้' }), null)
    assert.equal(screen.queryByRole('tabpanel'), null)
    assert.ok(screen.getByText('รอบรับสมัครปัจจุบัน'))
    assert.equal(screen.queryByRole('button', { name: 'ดูรายละเอียดรอบรับสมัคร' }), null)
    fireEvent.click(screen.getByRole('button', { name: 'สมัครเข้าชมรม' }))
    assert.deepEqual(applied, ['50001'])

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

test('contact section shows real location and social links without inventing missing channels', async () => {
  const stub = stubFetch(request => json(request.url.endsWith('/recruitment-rounds')
    ? { ...rounds, items: [] }
    : { ...profile, affiliationName: 'อาคารกิจกรรม ชั้น 2', instagramUrl: 'https://www.instagram.com/example_club/', facebookUrl: 'https://www.facebook.com/exampleclub' }))
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, { clubId: '20001' })))
  try {
    const heading = await screen.findByRole('heading', { name: 'ข้อมูลติดต่อ' })
    const section = within(heading.closest('section') as HTMLElement)
    assert.match(section.getByRole('link', { name: /อาคารกิจกรรม ชั้น 2/ }).getAttribute('href') ?? '', /^https:\/\/www\.google\.com\/maps\/search/)
    const map = screen.getByTitle('แผนที่ อาคารกิจกรรม ชั้น 2')
    assert.match(map.getAttribute('src') ?? '', /^https:\/\/maps\.google\.com\/maps\?q=/)
    assert.equal(section.queryByTitle('แผนที่ อาคารกิจกรรม ชั้น 2'), null)
    fireEvent.click(screen.getByRole('button', { name: 'แสดงแผนที่ธรรมศาสตร์' }))
    assert.ok(screen.getByTitle('แผนที่ มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต'))
    const instagram = section.getByRole('link', { name: '@example_club' })
    assert.equal(instagram.getAttribute('href'), 'https://www.instagram.com/example_club/')
    assert.equal(instagram.getAttribute('rel'), 'noopener noreferrer')
    assert.equal(section.getByRole('link', { name: 'ชมรมตัวอย่าง' }).getAttribute('href'), 'https://www.facebook.com/exampleclub')
    assert.equal(section.queryByText(/LINE/i), null)
  } finally { cleanup(); stub.restore() }
})

test('the map defaults to Thammasat when the club has no location', async () => {
  const stub = stubFetch(request => json(request.url.endsWith('/recruitment-rounds') ? { ...rounds, items: [] } : profile))
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, { clubId: '20001' })))
  try {
    assert.ok(await screen.findByTitle('แผนที่ มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต'))
  } finally { cleanup(); stub.restore() }
})

test('shows club description, benefits, and the available activity image', async () => {
  const stub = stubFetch(request => json(request.url.endsWith('/recruitment-rounds')
    ? { ...rounds, items: [] }
    : { ...profile, objectives: 'ฝึกทักษะ\nทำงานร่วมกัน', bannerUrl: '/images/example.webp' }))
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, { clubId: '20001' })))
  try {
    const about = await screen.findByRole('heading', { name: 'เกี่ยวกับชมรม' })
    assert.ok(within(about.closest('section') as HTMLElement).getByText('รายละเอียดชมรม'))
    assert.ok(screen.getByRole('heading', { name: 'สิ่งที่คุณจะได้' }))
    assert.ok(screen.getByText('ฝึกทักษะ'))
    assert.ok(screen.getByRole('heading', { name: 'ตัวอย่างกิจกรรม' }))
    fireEvent.click(screen.getByRole('button', { name: 'ดูภาพกิจกรรม ชมรมตัวอย่าง (1)' }))
    assert.ok(screen.getByRole('dialog', { name: 'ภาพกิจกรรม ชมรมตัวอย่าง' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    assert.equal(screen.queryByRole('dialog'), null)
    assert.equal(screen.queryByRole('heading', { name: 'รอบรับสมัครที่เปิดรับสมัครในขณะนี้' }), null)
  } finally { cleanup(); stub.restore() }
})

test('demo club gallery displays three labelled illustrative images for the matching club', async () => {
  const stub = stubFetch(request => json(request.url.endsWith('/recruitment-rounds')
    ? { ...rounds, items: [] }
    : { ...profile, bannerUrl: '/images/tu-clubhub-extra-clubs/club-football.webp' }))
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, { clubId: '20001' })))
  try {
    assert.ok(await screen.findByText('ภาพประกอบจำลอง'))
    assert.equal(screen.getAllByRole('button', { name: /ดูภาพกิจกรรม/ }).length, 3)
    const images = screen.getAllByAltText('ภาพประกอบจำลองกิจกรรม ชมรมตัวอย่าง')
    assert.deepEqual(images.map(image => image.getAttribute('src')), [
      '/images/club-activities/football/01.webp', '/images/club-activities/football/02.webp', '/images/club-activities/football/03.webp',
    ])
  } finally { cleanup(); stub.restore() }
})

test('a club without an open round shows a closed card and a disabled apply button', async () => {
  const stub = stubFetch(request => json(request.url.endsWith('/recruitment-rounds') ? { ...rounds, items: [] } : profile))
  const applied: string[] = []
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, { clubId: '20001', onNavigateToApplication: (id: string) => applied.push(id) })))
  try {
    assert.ok(await screen.findByText('ปิดรับสมัคร'))
    assert.ok(screen.getByText('ยังไม่มีรอบที่เปิดรับสมัครในขณะนี้'))
    const button = screen.getByRole('button', { name: 'สมัครเข้าชมรม' }) as HTMLButtonElement
    assert.equal(button.disabled, true)
    fireEvent.click(button)
    assert.deepEqual(applied, [])
  } finally { cleanup(); stub.restore() }
})

test('a recruitment loading error is not labelled as a closed round', async () => {
  const stub = stubFetch(request => request.url.endsWith('/recruitment-rounds') ? json({}, 503) : json(profile))
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, { clubId: '20001' })))
  try {
    assert.ok(await screen.findByText('โหลดข้อมูลไม่สำเร็จ'))
    assert.equal(screen.queryByText('ปิดรับสมัคร'), null)
    assert.equal((screen.getByRole('button', { name: 'สมัครเข้าชมรม' }) as HTMLButtonElement).disabled, true)
    assert.ok(screen.getByRole('button', { name: 'ลองโหลดอีกครั้ง' }))
  } finally { cleanup(); stub.restore() }
})

test('club page lets visitors select any open round and renders more than three objectives', async () => {
  const stub = stubFetch(request => json(request.url.endsWith('/recruitment-rounds')
    ? rounds
    : { ...profile, objectives: 'ข้อ 1\nข้อ 2\nข้อ 3\nข้อ 4\nข้อ 5' }))
  const applied: string[] = []
  render(createElement(MemoryRouter, null, createElement(ClubDetailPage, {
    clubId: '20001',
    isLoggedIn: true,
    onNavigateToApplication: (roundId: string) => { applied.push(roundId) },
  })))
  try {
    await screen.findByRole('heading', { level: 1, name: 'ชมรมตัวอย่าง' })
    for (const item of ['ข้อ 1', 'ข้อ 2', 'ข้อ 3', 'ข้อ 4', 'ข้อ 5']) {
      assert.ok(screen.getByText(item))
    }
    fireEvent.click(screen.getByRole('radio', { name: /รอบที่ 2/ }))
    fireEvent.click(screen.getByRole('button', { name: 'สมัครเข้าชมรม' }))
    assert.deepEqual(applied, ['50002'])
  } finally { cleanup(); stub.restore() }
})
