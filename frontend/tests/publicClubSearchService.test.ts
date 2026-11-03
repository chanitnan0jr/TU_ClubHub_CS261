import assert from 'node:assert/strict'
import test from 'node:test'
import { searchPublicClubs } from '../src/features/clubs/services/publicClubSearchService.ts'
import { json, problem, stubFetch } from './helpers.ts'

const page = {
  items: [],
  page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
}

test('searches the public club endpoint with trimmed text and selected filters', async () => {
  const stub = stubFetch(() => json(page))
  try {
    assert.deepEqual(await searchPublicClubs({
      query: '  ชมรม coding  ',
      categoryId: '30001',
      recruitmentOpen: true,
      page: 2,
    }), page)

    const url = new URL(stub.requests[0].url, 'http://localhost')
    assert.equal(url.pathname, '/api/v1/public/clubs')
    assert.equal(url.searchParams.get('q'), 'ชมรม coding')
    assert.equal(url.searchParams.get('categoryId'), '30001')
    assert.equal(url.searchParams.get('recruitmentStatus'), 'OPEN')
    assert.equal(url.searchParams.get('page'), '2')
    assert.equal(url.searchParams.get('size'), '20')
    assert.equal(url.searchParams.get('sort'), 'name,asc')
  } finally {
    stub.restore()
  }
})

test('omits empty filters and presents API failures as safe UI messages', async () => {
  const stub = stubFetch(() => problem(503, 'SERVICE_UNAVAILABLE', 'private server detail'))
  try {
    await assert.rejects(
      searchPublicClubs({ query: '  ', categoryId: '', recruitmentOpen: false, page: 0 }),
      /ระบบไม่พร้อมใช้งานชั่วคราว/,
    )
    const url = new URL(stub.requests[0].url, 'http://localhost')
    assert.equal(url.searchParams.has('q'), false)
    assert.equal(url.searchParams.has('categoryId'), false)
    assert.equal(url.searchParams.has('recruitmentStatus'), false)
  } finally {
    stub.restore()
  }
})
