import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { test } from 'node:test'

import { createItemFixture } from '../test/fixtures/factories.js'
import { api, integrationDescribe, prepareIntegrationSuite } from '../test/setup/integration.js'

integrationDescribe('Database reset and server lifecycle', () => {
  test('migrate, CRUD, reset, migrate, CRUD works with existing migration history', async t => {
    const databaseUrl = process.env.TEST_DATABASE_URL!
    const url = new URL(databaseUrl)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.search) {
      t.skip('Reset requires a local database without URL options')
      return
    }
    await prepareIntegrationSuite()
    await createItemFixture({ name: 'Before reset' })
    const name = decodeURIComponent(url.pathname.slice(1))
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'src/scripts/reset-db.ts', `--confirm=${name}`],
      {
        env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: databaseUrl },
        encoding: 'utf8',
        timeout: 30_000,
      },
    )
    assert.equal(result.status, 0, result.stderr)
    const list = await api.get('/api/items')
    assert.equal(list.status, 200)
    assert.deepEqual(list.body, { items: [] })
    const item = await createItemFixture({ name: 'After reset' })
    assert.equal((await api.get(`/api/items/${item.id}`)).status, 200)
    assert.equal((await api.delete(`/api/items/${item.id}`)).status, 200)
  })

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    test(
      `server closes connections and exits cleanly on ${signal}`,
      { timeout: 20_000 },
      async t => {
        const socket = createServer()
        socket.listen(0, '127.0.0.1')
        await once(socket, 'listening')
        const address = socket.address()
        assert.ok(address && typeof address === 'object')
        await new Promise<void>(resolve => socket.close(() => resolve()))
        const child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
          env: { ...process.env, PORT: String(address.port) },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        t.after(() => {
          if (child.exitCode === null) child.kill('SIGKILL')
        })
        let output = ''
        await new Promise<void>((resolve, reject) => {
          child.once('error', reject)
          child.once('exit', () => reject(new Error(`Server exited before startup: ${output}`)))
          const onData = (data: Buffer) => {
            output += data.toString()
            if (output.includes('Server is running')) resolve()
          }
          child.stdout.on('data', onData)
          child.stderr.on('data', onData)
        })
        const exited = new Promise<[number | null, NodeJS.Signals | null]>(resolve => {
          child.once('exit', (code, signal) => resolve([code, signal]))
        })
        child.kill(signal)
        const [code, exitSignal] = await exited
        assert.equal(code, 0)
        assert.equal(exitSignal, null)
      },
    )
  }
})
