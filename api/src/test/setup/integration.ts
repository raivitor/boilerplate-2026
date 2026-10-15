import { after } from 'node:test'

import { sql } from 'drizzle-orm'
import request from 'supertest'

import app from '../../app.js'
import { assertSafeTestDatabase } from '../../config/environment.js'
import { db, pool } from '../../database/client.js'

export { describe as integrationDescribe } from 'node:test'

// Supertest gerencia o servidor HTTP durante as requisições.
export const api = request(app)

after(async () => {
  await pool.end()
})

export async function prepareIntegrationSuite(): Promise<void> {
  assertSafeTestDatabase()
  await db.execute(sql`SELECT 1`)
}

export async function resetDatabase(): Promise<void> {
  assertSafeTestDatabase()
  await db.execute(sql`TRUNCATE TABLE "items" RESTART IDENTITY CASCADE`)
}
