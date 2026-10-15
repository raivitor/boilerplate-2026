import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import { resolveDatabaseUrl } from '../config/environment.js'
import * as schema from './schema.js'

export const pool = new pg.Pool({
  connectionString: resolveDatabaseUrl(),
  connectionTimeoutMillis: 5000,
})

export const db = drizzle(pool, { schema })
