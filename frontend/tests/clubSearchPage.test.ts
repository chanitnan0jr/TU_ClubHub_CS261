import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { problem, stubFetch } from './helpers.ts'
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

test('search controls update the selected criteria and can be cleared', async () => {
  const stub = stubFetch(() => problem(401, 'AUTHENTICATION_REQUIRED', 'No active session'))
  try {
    render(createElement(MemoryRouter, null,
      createElement(AuthProvider, null, createElement(ClubSearchPage))))

    const search = await screen.findByRole('searchbox', { name: 'ค้นหาชมรม' })
    const category = screen.getByRole('combobox', { name: 'หมวดหมู่ชมรม' })
    const recruitment = screen.getByRole('checkbox', { name: 'เปิดรับสมัครอยู่' })

    fireEvent.change(search, { target: { value: 'ดนตรี' } })
    fireEvent.change(category, { target: { value: 'ศิลปะและวัฒนธรรม' } })
    fireEvent.click(recruitment)

    assert.equal((search as HTMLInputElement).value, 'ดนตรี')
    assert.equal((category as HTMLSelectElement).value, 'ศิลปะและวัฒนธรรม')
    assert.equal((recruitment as HTMLInputElement).checked, true)
    assert.ok(screen.getByRole('heading', { name: 'ไม่พบชมรม' }))
    const activeFilters = screen.getByRole('group', { name: 'ตัวกรองที่เลือก' })
    assert.ok(activeFilters.textContent?.includes('ค้นหาชมรม: ดนตรี'))
    assert.ok(activeFilters.textContent?.includes('ศิลปะและวัฒนธรรม'))
    assert.ok(activeFilters.textContent?.includes('เปิดรับสมัครอยู่'))
    assert.match(activeFilters.querySelector('span')?.className ?? '', /bg-blue-50.*text-blue-700/)
    assert.match(activeFilters.querySelectorAll('span')[1]?.className ?? '', /bg-rose-50.*text-rose-800/)
    assert.match(activeFilters.querySelectorAll('span')[2]?.className ?? '', /bg-emerald-50.*text-emerald-700/)
    assert.equal(stub.requests.some((request) => request.url.includes('/api/v1/public/clubs?')), false)

    fireEvent.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }))
    await waitFor(() => assert.equal((search as HTMLInputElement).value, ''))
    assert.equal((category as HTMLSelectElement).value, '')
    assert.equal((recruitment as HTMLInputElement).checked, false)
  } finally {
    cleanup()
    stub.restore()
  }
})

test('renders matching club cards and filters them using the selected controls', async () => {
  const stub = stubFetch(() => problem(401, 'AUTHENTICATION_REQUIRED', 'No active session'))
  try {
    render(createElement(MemoryRouter, null,
      createElement(AuthProvider, null, createElement(ClubSearchPage, { clubs: [club] }))))

    assert.ok(await screen.findByRole('link', { name: /ชมรมดนตรีสากล/ }))
    const search = screen.getByRole('searchbox', { name: 'ค้นหาชมรม' })
    fireEvent.change(search, { target: { value: 'ฟุตบอล' } })
    assert.ok(screen.getByRole('heading', { name: 'ไม่พบชมรม' }))

    fireEvent.change(search, { target: { value: 'ดนตรี' } })
    assert.ok(screen.getByRole('link', { name: /ชมรมดนตรีสากล/ }))
    assert.equal(stub.requests.some((request) => request.url.includes('/api/v1/public/clubs?')), false)
  } finally {
    cleanup()
    stub.restore()
  }
})
