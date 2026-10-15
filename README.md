# Boilerplate 2026

Base pessoal para aplicações pequenas: Next.js 16 + React 19 no `web`, Express + TypeScript +
Drizzle + Postgres na `api`.

## Criar um projeto

Use Node 24 e npm 11 ou superior.

```bash
nvm use
npm run bootstrap -- meu-projeto
# Para visualizar as alterações:
npm run bootstrap -- meu-projeto --dry-run
cp api/.env.example api/.env
npm ci --prefix api
npm ci --prefix web
```

O bootstrap atualiza nomes dos pacotes, lockfiles, títulos dos guias e defaults do banco. Aceita
também `--name=meu-projeto`. Não altera o `.env` existente; ajuste-o ao renomear um projeto.

## Desenvolvimento

```bash
docker compose -f api/docker-compose.yml up -d --wait
npm run db:migrate --prefix api
npm run dev --prefix api
# Em outro terminal:
npm run dev --prefix web
```

Frontend: http://localhost:3000. API: http://localhost:3001. O frontend inicial é mínimo; configure
a comunicação com a API conforme o projeto precisar.

## Validação

```bash
npm run ci:simulate
npm run format:all
```

A validação rápida verifica bootstrap, formatação, lint, tipos e testes unitários da API. O frontend
ainda não possui testes automatizados.

Crie uma vez o banco dedicado de testes (use o nome do seu projeto):

```bash
docker compose -f api/docker-compose.yml exec db sh -c 'createdb -U "$POSTGRES_USER" "${POSTGRES_DB}_test"'
npm run validate:full
```

Configure `TEST_DATABASE_URL` em `api/.env`. A validação completa executa também integrações HTTP
com migrações e builds das duas aplicações. Integrações limpam os dados do banco de testes; seu nome
deve terminar em `_test` e ser diferente do banco da aplicação.

## Deploy em serviços gerenciados

- Web: diretório raiz `web`, instalação `npm ci`, build `npm run build`, start `npm start` quando
  necessário. Pode ser publicado na Vercel.
- API: diretório raiz `api`, instalação `npm ci`, build `npm run build`, start `npm start`.
  Configure `NODE_ENV=production`, `DATABASE_URL`, `FRONTEND_URL` e a porta fornecida pelo serviço.
- Execute `npm run db:migrate` como etapa anterior ao início da API, com as variáveis de produção
  disponíveis. Não execute reset nem testes de integração no banco da aplicação.
- `/healthcheck` ou `/api/healthcheck` verifica a conexão com Postgres. A API fecha servidor e
  conexões ao receber SIGTERM/SIGINT.

As migrações e o build usam ferramentas de desenvolvimento; a API mantém essas dependências durante
a instalação. Atualize dependências e lockfiles periodicamente, verificando `npm outdated` e
`npm audit` em cada pacote.

## Pendências conhecidas de dependências

Na revisão de 15/10/2026, após atualizar os lockfiles:

- API: quatro alertas moderados na cadeia `drizzle-kit → @esbuild-kit → esbuild`.
- Web: cinco alertas altos na cadeia `eslint-config-next → fast-glob → micromatch → braces`.

São dependências de ferramentas de desenvolvimento. As atualizações disponíveis nas majors adotadas
não eliminam esses alertas. O `npm audit fix --force` sugere versões antigas e incompatíveis de
Drizzle Kit e da configuração do Next; não aplique esse downgrade automaticamente. Reavalie os
alertas nas próximas atualizações. Não restaram alertas críticos nessa verificação.
