import assert from 'node:assert/strict'
import test from 'node:test'
import type { ApplicationFormData } from '../src/features/applications/types/applicationForm.ts'
import {
  toApplicationSubmissionPayload,
  validateApplicationForm,
} from '../src/features/applications/utils/applicationValidation.ts'
import type { ApplicationFormQuestion } from '../src/features/applications/services/applicationService.ts'

const questions: ApplicationFormQuestion[] = [
  {
    id: '10',
    type: 'TEXT',
    questionText: 'คำถามที่จำเป็น',
    isRequired: true,
    displayOrder: 1,
    maxLength: 3,
  },
  {
    id: '11',
    type: 'TEXT',
    questionText: 'คำถามเพิ่มเติม',
    isRequired: false,
    displayOrder: 2,
    maxLength: 5,
  },
]

function validForm(overrides: Partial<ApplicationFormData> = {}): ApplicationFormData {
  return {
    motivation: 'สนใจเข้าร่วมชมรม',
    answers: { '10': '😀' },
    links: [],
    ...overrides,
  }
}

test('requires a motivation and answers required questions within Unicode character limits', () => {
  assert.deepEqual(
    validateApplicationForm(
      validForm({
        motivation: ' \n ',
        answers: { '10': '😀😀😀😀' },
      }),
      questions,
    ),
    {
      motivation: 'กรุณาระบุเหตุผลที่สนใจเข้าร่วมชมรมนี้',
      answers: { '10': 'กรุณากรอกคำตอบไม่เกิน 3 ตัวอักษร' },
    },
  )

  assert.deepEqual(validateApplicationForm(validForm(), questions), {})
})

test('validates HTTPS document links and limits attachments to five', () => {
  const invalidLinks = [
    { id: 'bad-scheme', label: 'Portfolio', url: 'http://example.org' },
    { id: 'credentials', label: 'Resume', url: 'https://user:pass@example.org/resume' },
  ]
  const errors = validateApplicationForm(
    validForm({
      links: [
        ...invalidLinks,
        ...Array.from({ length: 4 }, (_, index) => ({
          id: `extra-${index}`,
          label: `Document ${index}`,
          url: 'https://example.org/file',
        })),
      ],
    }),
    questions,
  )

  assert.equal(errors.links?.['bad-scheme'].url?.includes('HTTPS'), true)
  assert.equal(errors.links?.credentials.url?.includes('HTTPS'), true)
  assert.equal(errors.links?.['extra-3'].label, 'แนบเอกสารได้สูงสุด 5 รายการ')
})

test('omits unanswered optional questions and empty links from the API payload', () => {
  const form = validForm({
    motivation: '  อยากเรียนรู้  ',
    answers: { '10': '  คำตอบ  ', '11': '   ' },
    links: [
      { id: '1', label: ' พอร์ตโฟลิโอ ', url: ' https://example.org/work ' },
      { id: '2', label: '', url: '' },
    ],
  })

  assert.deepEqual(toApplicationSubmissionPayload(form, questions), {
    motivation: 'อยากเรียนรู้',
    answers: [{ questionId: '10', answerText: 'คำตอบ' }],
    links: [{ label: 'พอร์ตโฟลิโอ', url: 'https://example.org/work' }],
  })
})
