import { defineConfig } from 'drizzle-kit'

import { resolveDatabaseUrl } from './src/config/environment.js'

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: resolveDatabaseUrl() },
  strict: true,
})
