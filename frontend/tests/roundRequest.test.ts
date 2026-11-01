import assert from 'node:assert/strict'
import test from 'node:test'
import { toRoundWriteRequest } from '../src/features/recruitment/utils/roundRequest.ts'
import type { RecruitmentRoundFormInput } from '../src/features/recruitment/types/recruitment.ts'

const form: RecruitmentRoundFormInput = {
  title: '  รอบรับสมัครตัวอย่าง  ',
  academicYear: 2569,
  semester: 'SUMMER',
  description: ' รายละเอียด ',
  openAt: '2026-11-01T09:00',
  closeAt: '2026-11-10T17:00',
  announcementDate: '',
  confirmationDeadline: '2026-11-20',
  questions: [
    { questionText: ' ข้อแรก ', isRequired: true, orderIndex: 0 },
    { questionText: 'ข้อสอง', isRequired: false, orderIndex: 1 },
  ],
}

// Expected instants use the same local time zone as the mapper, so the test
// passes in any TZ.
const instant = (local: string) => new Date(local).toISOString()

test('maps the form to RoundWrite with trimmed text and numeric semester', () => {
  const request = toRoundWriteRequest(form)
  assert.equal(request.title, 'รอบรับสมัครตัวอย่าง')
  assert.equal(request.description, 'รายละเอียด')
  assert.equal(request.academicYear, 2569)
  assert.equal(request.semester, 3)
  assert.equal(request.eligibilityText, null)
  assert.deepEqual(Object.keys(request).sort(), [
    'academicYear', 'closesAt', 'confirmationDeadline', 'description', 'eligibilityText',
    'opensAt', 'questions', 'resultsScheduledAt', 'semester', 'title',
  ])
})

test('sends UTC instants: the deadline ends its day and the results date starts its day', () => {
  const request = toRoundWriteRequest({ ...form, announcementDate: '2026-11-15' })
  assert.equal(request.opensAt, instant('2026-11-01T09:00'))
  assert.equal(request.closesAt, instant('2026-11-10T17:00'))
  assert.equal(request.confirmationDeadline, instant('2026-11-20T23:59:59'))
  assert.equal(request.resultsScheduledAt, instant('2026-11-15T00:00'))
  assert.match(request.opensAt, /Z$/)
  assert.equal(toRoundWriteRequest(form).resultsScheduledAt, null)
})

test('numbers questions from 1 in form order with the default length limit', () => {
  assert.deepEqual(toRoundWriteRequest(form).questions, [
    { prompt: 'ข้อแรก', required: true, displayOrder: 1, maxLength: 2000 },
    { prompt: 'ข้อสอง', required: false, displayOrder: 2, maxLength: 2000 },
  ])
})
