import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { json, stubFetch } from './helpers.ts'

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
dom.window.scrollTo = () => {}

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { MemoryRouter } = await import('react-router')
const { AuthProvider } = await import('../src/features/auth/AuthContext.tsx')
const { DynamicApplicationForm } = await import('../src/features/applications/components/DynamicApplicationForm.tsx')

test('application text accepts the Unicode limit and reports values above it', async () => {
  const stub = stubFetch((request) => {
    if (request.url === '/api/v1/auth/me') return json({ user: { id: '1', role: 'USER' } })
    if (request.url === '/api/v1/rounds/2/application-form') return json({
      round: { id: '2', clubId: '1', title: 'รอบทดสอบ', description: '', eligibilityText: null,
        opensAt: '2026-01-01T00:00:00Z', closesAt: '2027-01-01T00:00:00Z' },
      questions: [{ id: '3', type: 'TEXT', questionText: 'คำถามทดสอบ', isRequired: true, displayOrder: 1, maxLength: 3 }],
    })
    if (request.url === '/api/v1/public/clubs/1') return json({
      id: '1', name: 'ชมรมทดสอบ', imageUrl: null, category: null, tags: [],
    })
    return json({}, 500)
  })

  try {
    render(createElement(MemoryRouter, null, createElement(AuthProvider, null,
      createElement(DynamicApplicationForm, { clubId: '1', roundId: '2' }))))
    const motivation = await screen.findByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/) as HTMLTextAreaElement
    const answer = screen.getByLabelText(/คำถามทดสอบ/) as HTMLTextAreaElement
    // Native maxlength counts UTF-16 units and silently truncates emoji while typing/pasting.
    assert.equal(motivation.hasAttribute('maxlength'), false)
    assert.equal(answer.hasAttribute('maxlength'), false)

    fireEvent.change(motivation, { target: { value: '😀'.repeat(2000) } })
    fireEvent.change(answer, { target: { value: '😀'.repeat(3) } })
    assert.equal(Array.from(motivation.value).length, 2000)
    assert.equal(Array.from(answer.value).length, 3)
    fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบข้อมูลใบสมัคร' }))
    assert.ok(screen.getByRole('checkbox', { name: /ฉันตรวจสอบข้อมูล/ }))

    fireEvent.click(screen.getByRole('button', { name: 'กลับไปแก้ไข' }))
    fireEvent.change(screen.getByLabelText(/เหตุผลที่สนใจเข้าร่วมชมรมนี้/), { target: { value: '😀'.repeat(2001) } })
    fireEvent.change(screen.getByLabelText(/คำถามทดสอบ/), { target: { value: '😀'.repeat(4) } })
    fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบข้อมูลใบสมัคร' }))
    assert.ok(screen.getByText('กรุณากรอกไม่เกิน 2,000 ตัวอักษร'))
    assert.ok(screen.getByText('กรุณากรอกคำตอบไม่เกิน 3 ตัวอักษร'))
    assert.equal(stub.requests.filter((request) => request.method === 'POST').length, 0)
  } finally {
    cleanup()
    stub.restore()
  }
})
