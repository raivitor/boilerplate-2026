import { z } from 'zod'

const databaseUrlSchema = z.url()

function parseDatabaseUrl(value: string | undefined, variable: string): URL {
  const result = databaseUrlSchema.safeParse(value)
  if (result.success) {
    const url = new URL(result.data)
    if (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      url.hostname &&
      url.pathname.length > 1
    ) {
      return url
    }
  }
  throw new Error(`${variable} must be a valid PostgreSQL URL with a host and database name`)
}

export function assertSafeTestDatabase(env: NodeJS.ProcessEnv = process.env): string {
  if (env.NODE_ENV !== 'test') throw new Error('Integration tests require NODE_ENV=test')
  const testUrl = parseDatabaseUrl(env.TEST_DATABASE_URL, 'TEST_DATABASE_URL')
  if ([...testUrl.searchParams.keys()].some(key => key !== 'sslmode')) {
    throw new Error('Test database URL only accepts the sslmode connection option')
  }
  const databaseName = decodeURIComponent(testUrl.pathname.slice(1))
  if (!databaseName.endsWith('_test')) throw new Error('Test database name must end in _test')
  const appUrl = parseDatabaseUrl(env.DATABASE_URL, 'DATABASE_URL')
  // Reject the same database even when different credentials or host aliases are used.
  if (decodeURIComponent(appUrl.pathname) === decodeURIComponent(testUrl.pathname)) {
    throw new Error('Test database must have a different name from the application database')
  }
  return testUrl.href
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.NODE_ENV === 'test') return assertSafeTestDatabase(env)
  return parseDatabaseUrl(env.DATABASE_URL, 'DATABASE_URL').href
}

export function parseServerEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const result = z
    .object({
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    })
    .safeParse(env)
  if (!result.success) throw new Error('Invalid NODE_ENV or PORT configuration')
  return result.data
}

export function assertSafeReset(env: NodeJS.ProcessEnv, confirmation: string | undefined): string {
  if (env.NODE_ENV === 'production') throw new Error('Database reset is disabled in production')
  const url = parseDatabaseUrl(env.DATABASE_URL, 'DATABASE_URL')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Database reset is only allowed on localhost')
  }
  if (url.search) throw new Error('Database reset does not accept URL connection options')
  if (confirmation !== decodeURIComponent(url.pathname.slice(1))) {
    throw new Error('Confirm the database name: npm run db:reset -- --confirm=DATABASE_NAME')
  }
  return url.href
}
