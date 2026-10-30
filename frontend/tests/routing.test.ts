import assert from 'node:assert/strict'
import test from 'node:test'
import { safeRedirectPath } from '../src/app/redirect.ts'
import { isValidId } from '../src/lib/ids.ts'

test('keeps in-app paths, including the query string', () => {
  assert.equal(safeRedirectPath('/clubs/20001/edit'), '/clubs/20001/edit')
  assert.equal(safeRedirectPath('/clubs/1?tab=2'), '/clubs/1?tab=2')
})

test('falls back to / for anything that could leave the site', () => {
  for (const next of [null, undefined, '', 'clubs/1', 'https://evil.example', '//evil.example', '/\\evil.example', '/a\nb']) {
    assert.equal(safeRedirectPath(next), '/', String(next))
  }
})

test('IDs are positive decimal strings of at most 19 digits', () => {
  for (const id of ['1', '20001', '9223372036854775807']) assert.equal(isValidId(id), true, id)
  for (const id of [undefined, '', '0', '01', '-1', 'abc', '1.5', '12345678901234567890', ' 1']) {
    assert.equal(isValidId(id), false, String(id))
  }
})
