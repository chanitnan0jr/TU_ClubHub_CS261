import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fetchApplicationForm,
  submitApplicationAPI,
} from '../src/features/applications/services/applicationService.ts'
import { csrfResponse, json, stubFetch } from './helpers.ts'

const form = {
  round: {
    id: '70001',
    clubId: '20001',
    title: 'รอบรับสมัครอาสาสมัคร',
    description: 'รายละเอียดรอบสมัคร',
    eligibilityText: null,
    opensAt: '2026-10-20T02:00:00Z',
    closesAt: '2026-11-01T10:00:00Z',
  },
  questions: [
    {
      id: '81001',
      type: 'TEXT',
      questionText: 'เหตุใดจึงสนใจ?',
      isRequired: true,
      displayOrder: 1,
      maxLength: 2000,
    },
  ],
}

test('loads the applicant-facing round form from the primary application API', async () => {
  const stub = stubFetch(() => json(form))
  try {
    assert.deepEqual(await fetchApplicationForm('70001'), form)
    assert.deepEqual(
      stub.requests.map((request) => `${request.method} ${request.url}`),
      ['GET /api/v1/rounds/70001/application-form'],
    )
  } finally {
    stub.restore()
  }
})

test('submits the contract payload to the selected round with a CSRF token', async () => {
  const receipt = {
    id: '90001',
    clubId: '20001',
    roundId: '70001',
    status: 'PENDING',
    submittedAt: '2026-10-30T12:00:00Z',
  }
  const stub = stubFetch((request) =>
    request.url === '/api/v1/auth/csrf' ? csrfResponse() : json(receipt, 201),
  )
  const payload = {
    motivation: 'อยากร่วมกิจกรรม',
    answers: [{ questionId: '81001', answerText: 'ชอบทำกิจกรรม' }],
    links: [{ label: 'Portfolio', url: 'https://example.org/work' }],
  }

  try {
    assert.deepEqual(await submitApplicationAPI('70001', payload), receipt)
    assert.deepEqual(
      stub.requests.map((request) => `${request.method} ${request.url}`),
      [
        'GET /api/v1/auth/csrf',
        'POST /api/v1/rounds/70001/applications',
      ],
    )
    assert.deepEqual(stub.requests[1].body, payload)
    assert.equal(stub.requests[1].headers['X-CSRF-TOKEN'], 'csrf-token')
  } finally {
    stub.restore()
  }
})
