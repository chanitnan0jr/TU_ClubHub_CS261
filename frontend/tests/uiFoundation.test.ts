import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
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
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { default: CommitteeLayout } = await import('../src/components/layout/CommitteeLayout.tsx')
const { ImageUrlField } = await import('../src/components/ui/ImageUrlField.tsx')

const assignment = {
  clubId: '20001',
  clubName: 'ชมรมอาสาพัฒนาชุมชน',
  permissionRole: 'PRESIDENT',
  positionName: null,
  startsAt: '2026-06-01T00:00:00Z',
  endsAt: null,
}

function renderCommitteeLayout(user: Record<string, unknown>) {
  const stub = stubFetch(request => request.url === '/api/v1/auth/me'
    ? json({ user })
    : json({ detail: 'Unexpected request' }, 500))
  render(createElement(MemoryRouter, { initialEntries: ['/clubs/20001/edit'] },
    createElement(AuthProvider, null,
      createElement(CommitteeLayout, {
        clubId: '20001',
        title: 'จัดการข้อมูลโปรไฟล์ชมรม',
        breadcrumbs: [{ label: 'โปรไฟล์ชมรม' }],
      }, createElement('p', null, 'Committee page content')))))
  return stub
}

test('committee layout links to application review from the club menu', async () => {
  const stub = renderCommitteeLayout({
    id: '10001', role: 'USER', displayName: 'ประธานทดสอบ', activeCommitteeAssignments: [assignment],
  })
  try {
    await screen.findByText('ประธานทดสอบ')
    const menu = screen.getByRole('navigation', { name: 'เมนูจัดการชมรม' })
    const link = (name: string) => within(menu).getByRole('link', { name })

    assert.equal(link('ภาพรวม').getAttribute('href'), '/clubs/20001/manage')
    assert.equal(link('โปรไฟล์ชมรม').getAttribute('href'), '/clubs/20001/edit')
    assert.equal(link('โปรไฟล์ชมรม').getAttribute('aria-current'), 'page')
    assert.equal(link('จัดการรอบรับสมัคร').getAttribute('href'), '/clubs/20001/rounds')
    assert.equal(link('จัดการรอบรับสมัคร').getAttribute('aria-current'), null)

    assert.equal(link('ตรวจสอบใบสมัคร').getAttribute('href'), '/clubs/20001/applications')
    assert.equal(link('ตรวจสอบใบสมัคร').getAttribute('aria-current'), null)

    assert.ok(screen.getAllByText('ชมรมอาสาพัฒนาชุมชน').length > 0)
    assert.ok(screen.getByText('ประธานชมรม'))
    assert.ok(screen.getByRole('heading', { level: 1, name: 'จัดการข้อมูลโปรไฟล์ชมรม' }))
    assert.ok(screen.getByRole('button', { name: 'ออกจากระบบ' }))
    assert.ok(screen.getByText('Committee page content'))
  } finally { cleanup(); stub.restore() }
})

for (const [label, assignments] of [
  ['another club', [{ ...assignment, clubId: '30001', clubName: 'ชมรมอื่น' }]],
  ['no club', []],
] as const) {
  test(`committee layout shows a 403 panel instead of the page for ${label}`, async () => {
    const stub = renderCommitteeLayout({ id: '10002', role: 'USER', activeCommitteeAssignments: assignments })
    try {
      assert.ok(await screen.findByRole('heading', { level: 1, name: 'คุณไม่มีสิทธิ์จัดการชมรมนี้' }))
      assert.equal(screen.queryByText('Committee page content'), null)
      assert.equal(screen.queryByRole('navigation', { name: 'เมนูจัดการชมรม' }), null)
      assert.equal(screen.getByRole('link', { name: 'ดูหน้าชมรม' }).getAttribute('href'), '/clubs/20001')
    } finally { cleanup(); stub.restore() }
  })
}

test('committee layout leaves the decision to the backend until /auth/me sends assignments', async () => {
  const stub = renderCommitteeLayout({ id: '10003', role: 'USER', displayName: 'ผู้ใช้เดิม' })
  try {
    await screen.findByText('ผู้ใช้เดิม')
    assert.ok(screen.getByText('Committee page content'))
    assert.equal(screen.queryByRole('heading', { name: 'คุณไม่มีสิทธิ์จัดการชมรมนี้' }), null)
  } finally { cleanup(); stub.restore() }
})

const imageField = (value: string, variant: 'banner' | 'avatar' = 'banner') =>
  createElement(ImageUrlField, { id: 'club-banner', label: 'รูปแบนเนอร์', value, onChange: () => {}, variant })

test('image URL field shows the placeholder for an empty or non-HTTPS URL', () => {
  for (const [value, variant, text] of [
    ['', 'banner', 'ยังไม่มีรูป'],
    ['', 'avatar', 'ยังไม่มีรูป'],
    ['http://example.com/banner.png', 'banner', 'ต้องใช้ https://'],
    ['not a url', 'avatar', 'ต้องใช้ https://'],
  ] as const) {
    const html = renderToString(imageField(value, variant))
    assert.doesNotMatch(html, /<img/, `${variant} "${value}"`)
    assert.match(html, new RegExp(text), `${variant} "${value}"`)
  }
})

test('image URL field previews an HTTPS URL and falls back when the image fails', () => {
  const html = renderToString(imageField('https://example.com/banner.png'))
  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/banner\.png"/)

  try {
    render(imageField('https://example.com/missing.png'))
    fireEvent.error(screen.getByRole('img', { name: 'ตัวอย่างรูปแบนเนอร์' }))
    assert.equal(screen.queryByRole('img'), null)
    assert.ok(screen.getByText('โหลดรูปไม่สำเร็จ'))
    assert.equal(screen.getByLabelText('รูปแบนเนอร์').getAttribute('type'), 'url')
  } finally { cleanup() }
})
