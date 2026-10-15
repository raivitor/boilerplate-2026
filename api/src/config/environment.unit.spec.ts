import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

import { assertSafeReset, assertSafeTestDatabase, parseServerEnvironment } from './environment.js'

const env = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://user:secret@localhost/app',
  TEST_DATABASE_URL: 'postgres://user:secret@localhost/app_test',
}

test('test database validation requires test environment and dedicated database name', () => {
  assert.ok(assertSafeTestDatabase(env).endsWith('/app_test'))
  for (const overrides of [
    { NODE_ENV: 'production' },
    { TEST_DATABASE_URL: undefined },
    { TEST_DATABASE_URL: 'postgres://test:secret@ci.example.com/app' },
    { TEST_DATABASE_URL: 'postgres://user:secret@localhost/app_spec' },
    { DATABASE_URL: 'postgres://other:password@127.0.0.1/app_test' },
    { TEST_DATABASE_URL: 'not-a-url-secret' },
    { TEST_DATABASE_URL: 'https://user:secret@localhost/app_test' },
    { TEST_DATABASE_URL: 'postgres:///app_test' },
    { TEST_DATABASE_URL: 'postgres://user:secret@localhost/' },
    { TEST_DATABASE_URL: env.TEST_DATABASE_URL + '?database=app' },
    { TEST_DATABASE_URL: env.TEST_DATABASE_URL + '?host=remote' },
  ]) {
    assert.throws(
      () => assertSafeTestDatabase({ ...env, ...overrides }),
      error => {
        assert.ok(error instanceof Error)
        assert.ok(!String(error.stack).includes('secret'))
        assert.ok(!('input' in error))
        assert.ok(!error.message.includes('password'))
        return true
      },
    )
  }
})

test('reset requires a local database and exact confirmation outside production', () => {
  assert.ok(assertSafeReset(env, 'app'))
  assert.throws(() => assertSafeReset(env, undefined))
  assert.throws(() => assertSafeReset(env, 'other'))
  assert.throws(() => assertSafeReset({ ...env, NODE_ENV: 'production' }, 'app'))
  assert.throws(() =>
    assertSafeReset({ ...env, DATABASE_URL: 'postgres://user@remote/app' }, 'app'),
  )
  assert.throws(() =>
    assertSafeReset({ ...env, DATABASE_URL: env.DATABASE_URL + '?host=remote' }, 'app'),
  )
})

test('server config defaults to port 3001 and rejects invalid configuration', () => {
  assert.equal(parseServerEnvironment(env).PORT, 3001)
  for (const PORT of ['0', '65536', 'abc']) {
    assert.throws(() => parseServerEnvironment({ ...env, PORT }))
  }
})

test('integration runner refuses unsafe configuration before starting migrations', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'src/scripts/test-integration.ts'],
    {
      env: {
        ...process.env,
        ...env,
        TEST_DATABASE_URL: 'postgres://test:secret@ci.example.com/app',
      },
      encoding: 'utf8',
      timeout: 10_000,
    },
  )
  assert.equal(result.status, 1)
  assert.ok(result.stderr.includes('Test database name must end in _test'))
  assert.ok(!result.stderr.includes('secret'))
  assert.ok(!result.stdout.includes('Reading config'))
})
