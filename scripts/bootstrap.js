#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const ROOT_DIR = path.resolve(__dirname, '..')

const parseCliArgs = argv => {
  const positionals = []
  let projectName = null
  let dryRun = false
  let help = false

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      help = true
      continue
    }

    if (arg.startsWith('--name=')) {
      if (projectName !== null) throw new Error('Informe apenas um nome de projeto.')
      projectName = arg.slice('--name='.length)
      continue
    }

    if (arg.startsWith('-')) throw new Error(`Opcao desconhecida: ${arg}`)

    positionals.push(arg)
  }

  if (projectName !== null && positionals.length > 0) {
    throw new Error('Use o nome posicional ou --name, sem combinar os dois.')
  }

  if (projectName === null && positionals.length > 0) {
    projectName = positionals.join(' ')
  }

  return { dryRun, help, projectName }
}

const slugifyProjectName = value =>
  value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')

const humanizeProjectName = value =>
  value
    .split('-')
    .filter(Boolean)
    .map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')

const updateJsonFile = (filePath, updater, updates, dryRun, baseDir = ROOT_DIR) => {
  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const next = updater(current)
  const nextContent = `${JSON.stringify(next, null, 2)}\n`
  writeFileIfChanged(filePath, nextContent, updates, dryRun, baseDir)
}

const updateTextFile = (filePath, updater, updates, dryRun, baseDir = ROOT_DIR) => {
  const current = fs.readFileSync(filePath, 'utf8')
  const next = updater(current)
  writeFileIfChanged(filePath, next, updates, dryRun, baseDir)
}

const writeFileIfChanged = (filePath, nextContent, updates, dryRun, baseDir = ROOT_DIR) => {
  const current = fs.readFileSync(filePath, 'utf8')

  if (current === nextContent) {
    return
  }

  updates.push(path.relative(baseDir, filePath))

  if (!dryRun) {
    fs.writeFileSync(filePath, nextContent)
  }
}

const renderReadme = (rootDir, relativePath, title) => {
  const content = fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
  return content.replace(/^# .+$/m, `# ${title}`)
}

const bootstrapProject = ({ rawProjectName, rootDir = ROOT_DIR, dryRun = false }) => {
  const projectSlug = slugifyProjectName(rawProjectName)

  if (!projectSlug) {
    throw new Error('Informe um nome de projeto valido.')
  }

  const displayName = humanizeProjectName(projectSlug)
  const apiPackageName = `${projectSlug}-api`
  const webPackageName = `${projectSlug}-web`
  const databaseName = projectSlug.replaceAll('-', '_')
  const updates = []

  updateJsonFile(
    path.join(rootDir, 'package.json'),
    packageJson => ({
      ...packageJson,
      name: projectSlug,
    }),
    updates,
    dryRun,
    rootDir,
  )

  updateJsonFile(
    path.join(rootDir, 'api', 'package.json'),
    packageJson => ({
      ...packageJson,
      name: apiPackageName,
      description: `${displayName} API built with Express + TypeScript + Drizzle + Postgres.`,
    }),
    updates,
    dryRun,
    rootDir,
  )

  updateJsonFile(
    path.join(rootDir, 'web', 'package.json'),
    packageJson => ({
      ...packageJson,
      name: webPackageName,
    }),
    updates,
    dryRun,
    rootDir,
  )

  for (const [directory, name] of [
    ['api', apiPackageName],
    ['web', webPackageName],
  ]) {
    updateJsonFile(
      path.join(rootDir, directory, 'package-lock.json'),
      lock => {
        lock.name = name
        lock.packages[''].name = name
        return lock
      },
      updates,
      dryRun,
      rootDir,
    )
  }

  updateTextFile(
    path.join(rootDir, 'api', '.env.example'),
    content =>
      content
        .replace(/^POSTGRES_DB=.*$/m, `POSTGRES_DB=${databaseName}`)
        .replace(
          /^DATABASE_URL=.*$/m,
          `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${databaseName}`,
        )
        .replace(
          /^TEST_DATABASE_URL=.*$/m,
          `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${databaseName}_test`,
        ),
    updates,
    dryRun,
    rootDir,
  )

  updateTextFile(
    path.join(rootDir, 'api', 'docker-compose.yml'),
    content => content.replaceAll(/\$\{POSTGRES_DB:-[^}]+\}/g, `\${POSTGRES_DB:-${databaseName}}`),
    updates,
    dryRun,
    rootDir,
  )

  writeFileIfChanged(
    path.join(rootDir, 'README.md'),
    renderReadme(rootDir, 'README.md', displayName),
    updates,
    dryRun,
    rootDir,
  )

  writeFileIfChanged(
    path.join(rootDir, 'api', 'README.md'),
    renderReadme(rootDir, 'api/README.md', `${displayName} API`),
    updates,
    dryRun,
    rootDir,
  )

  writeFileIfChanged(
    path.join(rootDir, 'web', 'README.md'),
    renderReadme(rootDir, 'web/README.md', `${displayName} Web`),
    updates,
    dryRun,
    rootDir,
  )

  return {
    databaseName,
    displayName,
    dryRun,
    projectSlug,
    updates,
    webPackageName,
  }
}

const printUsage = () => {
  console.log(`Uso:

  npm run bootstrap -- meu-projeto
  npm run bootstrap -- --name=meu-projeto

Opcoes:

  --dry-run    Mostra o que seria alterado sem escrever arquivos
  --help       Exibe esta ajuda
`)
}

const main = () => {
  try {
    const { dryRun, help, projectName } = parseCliArgs(process.argv.slice(2))

    if (help) {
      printUsage()
      return
    }

    if (!projectName) {
      printUsage()
      process.exitCode = 1
      return
    }

    const result = bootstrapProject({ rawProjectName: projectName, dryRun })

    if (result.updates.length === 0) {
      console.log(
        `Nenhuma alteracao necessaria. Projeto ja esta configurado como "${result.projectSlug}".`,
      )
      return
    }

    const action = dryRun ? 'seriam alterados' : 'foram alterados'
    console.log(`Projeto configurado como "${result.displayName}" (${result.projectSlug}).`)
    console.log(`Arquivos que ${action}:`)

    for (const file of result.updates) {
      console.log(`- ${file}`)
    }

    if (!dryRun) {
      console.log('')
      console.log('Proximos passos:')
      console.log('- cp api/.env.example api/.env')
      console.log('- nvm use')
      console.log('- npm ci --prefix api')
      console.log('- npm ci --prefix web')
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  bootstrapProject,
  parseCliArgs,
  slugifyProjectName,
}
