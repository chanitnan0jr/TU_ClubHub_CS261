import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createScreeningQuestion,
  deleteScreeningQuestion,
  fetchScreeningQuestions,
  reorderScreeningQuestions,
  updateScreeningQuestion,
} from '../src/features/recruitment/api/questionApi.ts'
import { csrfResponse, json, stubFetch } from './helpers.ts'

const question = (id: string, order: number) => ({
  id,
  roundId: '10',
  questionText: `q${id}`,
  isRequired: true,
  displayOrder: order,
})

function stubQuestionApi() {
  return stubFetch((request) => {
    if (request.url === '/api/v1/auth/csrf') return csrfResponse()
    if (request.method === 'DELETE') return new Response(null, { status: 204 })
    return json({ items: [question('1', 1), question('2', 2)], ...question('1', 1) })
  })
}

test('questions are read from /api/v1/rounds/{roundId}/questions', async () => {
  const stub = stubQuestionApi()
  try {
    const items = await fetchScreeningQuestions('10')
    assert.equal(items.length, 2)
    assert.equal(stub.requests[0].url, '/api/v1/rounds/10/questions')
    assert.equal(stub.requests[0].method, 'GET')
  } finally {
    stub.restore()
  }
})

test('create, update and delete use the round-scoped paths and send CSRF', async () => {
  const stub = stubQuestionApi()
  try {
    const draft = { questionText: 'Why join?', isRequired: false }
    await createScreeningQuestion('10', draft)
    await updateScreeningQuestion('10', '7', draft)
    assert.equal(await deleteScreeningQuestion('10', '7'), undefined)

    const writes = stub.requests.filter((r) => r.url !== '/api/v1/auth/csrf')
    assert.deepEqual(
      writes.map((r) => `${r.method} ${r.url}`),
      [
        'POST /api/v1/rounds/10/questions',
        'PUT /api/v1/rounds/10/questions/7',
        'DELETE /api/v1/rounds/10/questions/7',
      ],
    )
    assert.deepEqual(writes[0].body, draft)
    assert.deepEqual(writes[1].body, draft)
    for (const write of writes) assert.equal(write.headers['X-CSRF-TOKEN'], 'csrf-token')
  } finally {
    stub.restore()
  }
})

test('reordering sends every question ID to /order and returns the new list', async () => {
  const stub = stubQuestionApi()
  try {
    const items = await reorderScreeningQuestions('10', ['2', '1'])
    const write = stub.requests.find((r) => r.method === 'PUT')

    assert.equal(write?.url, '/api/v1/rounds/10/questions/order')
    assert.deepEqual(write?.body, { questionIds: ['2', '1'] })
    assert.equal(items.length, 2)
  } finally {
    stub.restore()
  }
})
