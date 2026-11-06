import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { csrfResponse, json, stubFetch } from './helpers.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, {
  React, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { MemoryRouter, Route, Routes } = await import('react-router')
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { default: ClubEditRoutePage } = await import('../src/pages/ClubEditRoutePage.tsx')
const { default: ClubProfileForm } = await import('../src/features/clubs/components/ClubProfileForm.tsx')
const { ApiError } = await import('../src/lib/api.ts')

const categories = [{ id: '30001', name: 'วิชาการ' }, { id: '30002', name: 'กีฬา' }]
const tags = Array.from({ length: 11 }, (_, i) => ({ id: String(40001 + i), name: `แท็ก ${i + 1}` }))

const profile = {
  id: '20001',
  name: 'ชมรมอาสาพัฒนาชุมชน',
  description: 'รายละเอียดชมรม',
  objectives: 'ช่วยเหลือชุมชน',
  contactUrl: null,
  facebookUrl: null,
  instagramUrl: null,
  contactEmail: null,
  affiliationLevel: null,
  affiliationName: null,
  imageUrl: null,
  bannerUrl: null,
  category: categories[0],
  tags: [tags[0]],
}

const assignment = {
  clubId: '20001', clubName: profile.name, permissionRole: 'PRESIDENT', positionName: null,
  startsAt: '2026-06-01T00:00:00Z', endsAt: null,
}

const nameInput = () => screen.getByLabelText(/^ชื่อชมรม/) as HTMLInputElement
const saveButton = () => screen.getByRole('button', { name: 'บันทึกข้อมูล' })

function renderForm(overrides: Partial<typeof profile> = {}, onSave: (request: unknown) => Promise<unknown> =
  async () => profile) {
  render(createElement(ClubProfileForm, {
    profile: { ...profile, ...overrides },
    categories,
    tags,
    onSave: onSave as never,
  }))
}

test('the edit page loads the profile and lists, then PUTs category, tags and HTTPS image URLs', async () => {
  let saved: Record<string, unknown> = {}
  const stub = stubFetch(request => {
    if (request.url === '/api/v1/auth/me') return json({ user: { id: '1', role: 'USER', activeCommitteeAssignments: [assignment] } })
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.url === '/api/v1/public/clubs/20001') return json(profile)
    if (request.url === '/api/v1/public/club-categories') return json({ items: categories })
    if (request.url === '/api/v1/public/interest-tags') return json({ items: tags })
    if (request.url === '/api/v1/clubs/20001' && request.method === 'PUT') {
      saved = request.body as Record<string, unknown>
      return json({
        ...profile, ...saved,
        category: categories.find(category => category.id === saved.categoryId),
        tags: tags.filter(tag => (saved.tagIds as string[]).includes(tag.id)),
      })
    }
    return json({ detail: 'Unexpected request' }, 500)
  })
  try {
    render(createElement(MemoryRouter, { initialEntries: ['/clubs/20001/edit'] },
      createElement(AuthProvider, null,
        createElement(Routes, null,
          createElement(Route, { path: '/clubs/:clubId/edit', element: createElement(ClubEditRoutePage) })))))

    await screen.findByLabelText(/^ชื่อชมรม/)
    assert.equal(nameInput().value, profile.name)
    assert.equal(screen.getByRole('link', { name: 'ดูหน้าโปรไฟล์สาธารณะ' }).getAttribute('href'), '/clubs/20001')
    assert.equal((screen.getByLabelText(/^หมวดหมู่ชมรม/) as HTMLSelectElement).value, '30001')
    assert.equal(screen.queryByText('มีสิ่งที่ยังไม่ได้บันทึก'), null)

    fireEvent.change(screen.getByLabelText(/^หมวดหมู่ชมรม/), { target: { value: '30002' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มแท็ก แท็ก 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'ลบแท็ก แท็ก 1' }))
    fireEvent.change(screen.getByLabelText('ภาพแบนเนอร์ชมรม'), { target: { value: 'https://img.example.org/b.png' } })
    fireEvent.change(screen.getByLabelText('รูปโปรไฟล์ชมรม'), { target: { value: 'https://img.example.org/logo.png' } })
    assert.ok(screen.getByText('มีสิ่งที่ยังไม่ได้บันทึก'))

    fireEvent.click(saveButton())
    const notice = await screen.findByText(/บันทึกข้อมูลโปรไฟล์ชมรมเรียบร้อยแล้ว/)
    assert.ok(notice.closest('[role="status"]'), 'success is announced politely')

    assert.equal(saved.categoryId, '30002')
    assert.deepEqual(saved.tagIds, ['40003'])
    assert.equal(saved.bannerUrl, 'https://img.example.org/b.png')
    assert.equal(saved.imageUrl, 'https://img.example.org/logo.png')
    assert.equal(saved.name, profile.name)
    assert.equal(screen.queryByText('มีสิ่งที่ยังไม่ได้บันทึก'), null)
  } finally { cleanup(); stub.restore() }
})

test('an 11th tag is blocked with a message and the count stays at 10/10', () => {
  renderForm({ tags: tags.slice(0, 10) })
  try {
    assert.ok(screen.getByText('เลือกแล้ว 10/10'))
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มแท็ก แท็ก 11' }))
    assert.ok(screen.getByText(/เลือกแท็กได้สูงสุด 10 แท็ก/))
    assert.ok(screen.getByText('เลือกแล้ว 10/10'))
    assert.equal(screen.queryByRole('button', { name: 'ลบแท็ก แท็ก 11' }), null)

    fireEvent.click(screen.getByRole('button', { name: 'ลบแท็ก แท็ก 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มแท็ก แท็ก 11' }))
    assert.ok(screen.getByRole('button', { name: 'ลบแท็ก แท็ก 11' }))
    assert.ok(screen.getByText('เลือกแล้ว 10/10'))
  } finally { cleanup() }
})

test('client validation blocks saving, shows the error under the field and focuses it', () => {
  let calls = 0
  renderForm({}, async () => { calls += 1; return profile })
  try {
    fireEvent.change(nameInput(), { target: { value: '  ' } })
    fireEvent.change(screen.getByLabelText('ภาพแบนเนอร์ชมรม'), { target: { value: 'http://img.example.org/b.png' } })
    fireEvent.click(saveButton())

    assert.equal(calls, 0)
    assert.ok(screen.getByText('กรุณากรอกชื่อชมรม'))
    assert.ok(screen.getByText('กรุณากรอก URL HTTPS ที่ถูกต้อง'))
    assert.equal(nameInput().getAttribute('aria-invalid'), 'true')
    // The banner comes first on the page, so it receives focus.
    assert.equal(document.activeElement, screen.getByLabelText('ภาพแบนเนอร์ชมรม'))
    assert.match(screen.getByRole('alert').textContent ?? '', /พบข้อผิดพลาด 2 จุด/)
  } finally { cleanup() }
})

test('a rejected save keeps the input and shows server field errors', async () => {
  renderForm({}, async () => {
    throw new ApiError(400, 'ข้อมูลไม่ถูกต้อง', 'VALIDATION_FAILED',
      [{ field: 'categoryId', code: 'INVALID', message: 'Category does not exist' }])
  })
  try {
    fireEvent.change(nameInput(), { target: { value: 'ชื่อใหม่' } })
    fireEvent.click(saveButton())

    const alert = await screen.findByRole('alert')
    assert.match(alert.textContent ?? '', /ข้อมูลไม่ถูกต้อง/)
    assert.equal(document.activeElement, alert)
    assert.equal(nameInput().value, 'ชื่อใหม่')
    assert.equal(screen.getByLabelText(/^หมวดหมู่ชมรม/).getAttribute('aria-invalid'), 'true')
    assert.ok(screen.getByText('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'))
    assert.ok(screen.getByText('มีสิ่งที่ยังไม่ได้บันทึก'))
  } finally { cleanup() }
})

test('leaving the page warns only while there are unsaved changes; cancel restores the saved values', async () => {
  renderForm()
  try {
    const leave = () => window.dispatchEvent(new window.Event('beforeunload', { cancelable: true }))
    assert.equal(leave(), true)

    fireEvent.change(nameInput(), { target: { value: 'ชื่อใหม่' } })
    await waitFor(() => assert.equal(leave(), false))

    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    assert.equal(nameInput().value, profile.name)
    await waitFor(() => assert.equal(leave(), true))
  } finally { cleanup() }
})
