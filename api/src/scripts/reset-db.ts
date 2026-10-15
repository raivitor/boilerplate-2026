import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

import { assertSafeReset } from '../config/environment.js'

const confirmation = process.argv
  .find(arg => arg.startsWith('--confirm='))
  ?.slice('--confirm='.length)
const connectionString = assertSafeReset(process.env, confirmation)
const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 })
try {
  const db = drizzle(pool)
  await db.transaction(async tx => {
    await tx.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`)
    await tx.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`)
    await tx.execute(sql`CREATE SCHEMA public`)
  })
  await migrate(db, { migrationsFolder: './drizzle' })
  console.warn('Database reset and migrations complete.')
} finally {
  await pool.end()
}
