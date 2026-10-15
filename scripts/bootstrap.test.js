const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const { bootstrapProject, parseCliArgs } = require('./bootstrap.js')

test('bootstrap supports dry run, repeated execution and renaming without stale lock names', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-'))
  try {
    for (const file of [
      'package.json',
      'README.md',
      'api/package.json',
      'api/package-lock.json',
      'api/README.md',
      'api/.env.example',
      'api/docker-compose.yml',
      'web/package.json',
      'web/package-lock.json',
      'web/README.md',
    ]) {
      const target = path.join(rootDir, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(path.join(__dirname, '..', file), target)
    }
    const options = { rootDir, rawProjectName: 'Projeto Novo' }
    const before = fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
    assert.ok(bootstrapProject({ ...options, dryRun: true }).updates.length)
    assert.equal(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'), before)
    bootstrapProject(options)
    assert.deepEqual(bootstrapProject(options).updates, [])
    bootstrapProject({ ...options, rawProjectName: 'Outro Nome' })
    for (const directory of ['api', 'web']) {
      const lock = JSON.parse(fs.readFileSync(path.join(rootDir, directory, 'package-lock.json')))
      assert.equal(lock.name, `outro-nome-${directory}`)
      assert.equal(lock.packages[''].name, lock.name)
    }
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true })
  }
})

test('bootstrap rejects unknown flags instead of treating them as a project name', () => {
  assert.throws(() => parseCliArgs(['--unknown']))
  assert.throws(() => parseCliArgs(['first', '--name=second']))
  assert.throws(() => parseCliArgs(['--name=first', '--name=second']))
  assert.equal(parseCliArgs(['--name=meu-projeto']).projectName, 'meu-projeto')
  assert.equal(parseCliArgs(['meu-projeto', '--dry-run']).dryRun, true)
})
