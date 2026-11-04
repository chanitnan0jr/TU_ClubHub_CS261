import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createElement } from 'react'
import { csrfResponse, json, problem, stubFetch } from './helpers.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, {
  React, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
const { cleanup, render, screen, fireEvent, waitFor } = await import('@testing-library/react')
const { MemoryRouter } = await import('react-router')
const { QuestionManagementPage } = await import('../src/features/recruitment/components/QuestionManagementPage.tsx')
const question = { id: '40', roundId: '10', questionText: 'Original question', isRequired: false, displayOrder: 1 }
const answeredMessage = 'ไม่สามารถแก้ไขหรือลบคำถามนี้ได้ เนื่องจากมีผู้สมัครตอบคำถามแล้ว'

function app() {
  return createElement(MemoryRouter, null, createElement(QuestionManagementPage, { clubId: '20', roundId: '10' }))
}

async function confirm(action: 'edit' | 'delete') {
  fireEvent.click(screen.getByRole('button', { name: action === 'edit' ? 'แก้ไขคำถามที่ 1' : 'ลบคำถามที่ 1' }))
  if (action === 'edit') {
    fireEvent.change(screen.getByLabelText('คำถามใหม่ (ที่จะเปลี่ยน)'), { target: { value: 'Changed question' } })
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันการแก้ไข' }))
  } else {
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบคำถาม' }))
  }
}

for (const action of ['edit', 'delete'] as const) {
  for (const reason of ['QUESTION_HAS_ANSWERS', 'VERSION_MISMATCH', undefined]) {
    test(`${action}: 409 ${reason ?? 'without reason'} shows the correct alert and preserves the question`, async () => {
      const stub = stubFetch(request => request.url === '/api/v1/auth/csrf' ? csrfResponse()
        : request.method === 'GET' ? json({ items: [question] })
        : problem(409, 'RESOURCE_CONFLICT', 'Untrusted server detail', reason ? { reason } : {}))
      try {
        render(app())
        await waitFor(() => assert.ok(screen.getByText('Original question')))
        await confirm(action)
        await waitFor(() => assert.ok(screen.getByRole('alert')))
        const alert = screen.getByRole('alert').textContent ?? ''
        if (reason === 'QUESTION_HAS_ANSWERS') assert.ok(alert.includes(answeredMessage))
        else {
          assert.ok(!alert.includes(answeredMessage))
          assert.ok(alert.includes('ไม่สามารถแก้ไขคำถามได้ในสถานะปัจจุบัน:'))
        }
        assert.ok(screen.getByText('Original question', { selector: 'p' }))
        assert.ok(screen.getByRole('button', { name: 'แก้ไขคำถามที่ 1' }))
        assert.ok(screen.getByRole('heading', { name: action === 'edit' ? 'ยืนยันการแก้ไขคำถามคัดเลือก?' : 'ยืนยันการลบคำถามคัดเลือก?' }))
        assert.equal(screen.queryByRole('status'), null)
        assert.equal(stub.requests.filter(r => r.method === (action === 'edit' ? 'PUT' : 'DELETE')).length, 1)
      } finally { cleanup(); stub.restore() }
    })
  }
}

test('a rejected delete clears an earlier success toast and keeps the edited question', async () => {
  const stub = stubFetch(request => request.url === '/api/v1/auth/csrf' ? csrfResponse()
    : request.method === 'GET' ? json({ items: [question] })
    : request.method === 'PUT' ? json({ ...question, questionText: 'Changed question' })
    : problem(409, 'RESOURCE_CONFLICT', 'Safe conflict', { reason: 'QUESTION_HAS_ANSWERS' }))
  try {
    render(app())
    await waitFor(() => assert.ok(screen.getByText('Original question')))
    await confirm('edit')
    await waitFor(() => assert.ok(screen.getByRole('status')))
    await confirm('delete')
    await waitFor(() => assert.ok(screen.getByRole('alert').textContent?.includes(answeredMessage)))
    assert.ok(screen.getByText('Changed question'))
    assert.equal(screen.queryByRole('status'), null)
  } finally { cleanup(); stub.restore() }
})
