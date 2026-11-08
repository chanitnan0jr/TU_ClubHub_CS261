import assert from 'node:assert/strict'
import test from 'node:test'
import { toRoundFormInput, toRoundWriteRequest } from '../src/features/recruitment/utils/roundRequest.ts'
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

// A saved round as the API returns it, built from a request plus question IDs.
const savedRound = (request: ReturnType<typeof toRoundWriteRequest>) => ({
  ...request,
  questions: request.questions.map((question, index) => ({ ...question, id: String(81001 + index) })),
})

test('a form saved and loaded again gives back the same form values', () => {
  const clean: RecruitmentRoundFormInput = {
    ...form,
    title: 'รอบรับสมัครตัวอย่าง',
    description: 'รายละเอียด',
    announcementDate: '2026-11-15',
    questions: [
      { questionText: 'ข้อแรก', isRequired: true, orderIndex: 0 },
      { questionText: 'ข้อสอง', isRequired: false, orderIndex: 1 },
    ],
  }
  assert.deepEqual(toRoundFormInput(savedRound(toRoundWriteRequest(clean))), {
    ...clean,
    questions: clean.questions.map((question, index) => ({ ...question, id: String(81001 + index) })),
  })
  assert.equal(toRoundFormInput(savedRound(toRoundWriteRequest(form))).announcementDate, '')
})

test('a loaded round saved without changes sends the same instants, seconds included', () => {
  const round = {
    title: 'รอบ',
    academicYear: 2569,
    semester: 1,
    description: 'รายละเอียด',
    opensAt: instant('2026-11-10T09:00'),
    closesAt: instant('2026-11-24T23:59:59'),
    confirmationDeadline: instant('2026-12-08T23:59:59'),
    resultsScheduledAt: instant('2026-12-01T00:00'),
    questions: [],
  }
  const values = toRoundFormInput(round)
  assert.equal(values.openAt, '2026-11-10T09:00')
  assert.equal(values.closeAt, '2026-11-24T23:59:59')
  assert.equal(values.confirmationDeadline, '2026-12-08')
  assert.equal(values.announcementDate, '2026-12-01')

  const request = toRoundWriteRequest(values)
  for (const field of ['opensAt', 'closesAt', 'confirmationDeadline', 'resultsScheduledAt'] as const) {
    assert.equal(request[field], round[field], field)
  }
})

test('loads questions in display order and maps semester numbers back', () => {
  const values = toRoundFormInput({
    ...savedRound(toRoundWriteRequest(form)),
    semester: 3,
    questions: [
      { id: '82', prompt: 'ข้อสอง', required: false, displayOrder: 2, maxLength: 2000 },
      { id: '81', prompt: 'ข้อแรก', required: true, displayOrder: 1, maxLength: 2000 },
    ],
  })
  assert.equal(values.semester, 'SUMMER')
  assert.deepEqual(values.questions, [
    { id: '81', questionText: 'ข้อแรก', isRequired: true, orderIndex: 0 },
    { id: '82', questionText: 'ข้อสอง', isRequired: false, orderIndex: 1 },
  ])
  assert.equal(toRoundFormInput({ ...savedRound(toRoundWriteRequest(form)), semester: 9 }).semester, '')
})
