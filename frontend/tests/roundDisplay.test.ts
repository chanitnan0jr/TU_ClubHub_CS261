import assert from 'node:assert/strict'
import test from 'node:test'
import { roundDisplayStatus, roundTermLabel } from '../src/features/recruitment/utils/roundDisplay.ts'

const opensAt = '2026-11-10T02:00:00Z'
const closesAt = '2026-11-24T16:59:59Z'
const published = { publicationStatus: 'PUBLISHED' as const, opensAt, closesAt, closedAt: null }
const at = (instant: string) => new Date(instant)
const ms = (instant: string, offset: number) => new Date(Date.parse(instant) + offset)

test('drafts and cancelled rounds keep their state whatever the dates', () => {
  for (const now of [ms(opensAt, -1), at(opensAt), ms(closesAt, 1)]) {
    assert.equal(roundDisplayStatus({ ...published, publicationStatus: 'DRAFT' }, now), 'DRAFT')
    assert.equal(roundDisplayStatus({ ...published, publicationStatus: 'CANCELLED' }, now), 'CANCELLED')
  }
})

test('a published round is upcoming before opensAt and open from exactly opensAt', () => {
  assert.equal(roundDisplayStatus(published, ms(opensAt, -1)), 'UPCOMING')
  assert.equal(roundDisplayStatus(published, at(opensAt)), 'OPEN')
  assert.equal(roundDisplayStatus(published, ms(closesAt, -1)), 'OPEN')
})

test('a published round is closed from exactly closesAt, or once closed early', () => {
  assert.equal(roundDisplayStatus(published, at(closesAt)), 'CLOSED')
  assert.equal(roundDisplayStatus(published, ms(closesAt, 1)), 'CLOSED')
  const closedEarly = { ...published, closedAt: '2026-11-12T03:00:00Z' }
  assert.equal(roundDisplayStatus(closedEarly, at('2026-11-12T04:00:00Z')), 'CLOSED')
  // closedAt wins even before opensAt.
  assert.equal(roundDisplayStatus(closedEarly, ms(opensAt, -1)), 'CLOSED')
})

test('the term label shows the semester, or ฤดูร้อน for semester 3, and the year', () => {
  assert.equal(roundTermLabel({ semester: 1, academicYear: 2569 }), '1/2569')
  assert.equal(roundTermLabel({ semester: 3, academicYear: 2569 }), 'ฤดูร้อน/2569')
})
