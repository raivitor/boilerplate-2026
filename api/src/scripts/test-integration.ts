import { spawnSync } from 'node:child_process'

import { assertSafeTestDatabase } from '../config/environment.js'

// Validate before invoking the migration CLI or importing the application.
assertSafeTestDatabase()
const coverage = process.argv.includes('--coverage')
const commands = [
  ['./node_modules/drizzle-kit/bin.cjs', 'migrate'],
  [
    '--import',
    'tsx',
    '--test',
    '--test-reporter',
    'spec',
    '--test-concurrency=1',
    ...(coverage ? ['--experimental-test-coverage'] : []),
    coverage ? 'src/**/*.spec.ts' : 'src/**/*.integration.spec.ts',
  ],
]
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1
    break
  }
}
