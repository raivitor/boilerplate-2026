import assert from 'node:assert/strict'
import { test } from 'node:test'

import { itemService } from '../services/itemService.js'
import { api, integrationDescribe } from '../test/setup/integration.js'

integrationDescribe('HTTP error handling', () => {
  test('malformed JSON returns 400', async () => {
    const response = await api.post('/api/items').type('json').send('{broken')
    assert.equal(response.status, 400)
    assert.deepEqual(response.body, { error: 'Invalid JSON' })
  })
  test('oversized JSON returns 413', async () => {
    const response = await api.post('/api/items').send({ name: 'x'.repeat(110_000) })
    assert.equal(response.status, 413)
  })
  test('unknown route returns JSON 404', async () => {
    const response = await api.get('/missing')
    assert.equal(response.status, 404)
    assert.deepEqual(response.body, { error: 'Not Found' })
  })
  test('unexpected thrown values return JSON 500 without internal details', async t => {
    t.mock.method(console, 'error', () => {})
    t.mock.method(itemService, 'listItems', () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercise untyped errors
      throw 'internal failure'
    })
    const response = await api.get('/api/items')
    assert.equal(response.status, 500)
    assert.deepEqual(response.body, { error: 'Internal Server Error' })
  })
})
