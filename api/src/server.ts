import { once } from 'node:events'

import { sql } from 'drizzle-orm'

import app from './app.js'
import { parseServerEnvironment } from './config/environment.js'
import { db, pool } from './database/client.js'

const { PORT } = parseServerEnvironment()
try {
  await db.execute(sql`SELECT 1`)
  const server = app.listen(PORT)
  await once(server, 'listening')
  console.warn(`Server is running on http://localhost:${PORT}`)

  let closing = false
  const shutdown = async () => {
    if (closing) return
    closing = true
    const timeout = setTimeout(() => {
      console.error('Graceful shutdown timed out')
      process.exit(1)
    }, 10_000)
    timeout.unref()
    try {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()))
      }).finally(() => pool.end())
    } catch (error) {
      console.error('Shutdown failed:', error)
      process.exitCode = 1
    } finally {
      clearTimeout(timeout)
    }
  }
  process.once('SIGTERM', () => {
    void shutdown()
  })
  process.once('SIGINT', () => {
    void shutdown()
  })
} catch (error) {
  await pool.end()
  console.error('Failed to connect to database or start server:', error)
  process.exitCode = 1
}
