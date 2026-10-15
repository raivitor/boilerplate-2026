# Boilerplate API

API em Express 5 + TypeScript + Drizzle + Postgres. Estrutura: rotas → controllers → services →
banco. Zod valida entradas HTTP.

## Configuração

Copie `.env.example` para `.env` no diretório `api` e execute os comandos abaixo a partir dele.

- `NODE_ENV`: development, production ou test.
- `PORT`: porta HTTP, padrão 3001.
- `DATABASE_URL`: URL PostgreSQL com nome de banco.
- `TEST_DATABASE_URL`: banco dedicado com nome terminado em `_test`, diferente do banco da
  aplicação. Na query string da URL de teste, somente `sslmode` é aceito.
- `FRONTEND_URL`: origem permitida, padrão http://localhost:3000. `FRONTEND_URLS` aceita uma lista
  separada por vírgulas e tem prioridade.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`: configuração do Postgres
  local no Docker Compose.

```bash
npm ci
npm run db:migrate
npm run dev
```

`npm run build` compila; `npm start` executa o build e espera variáveis fornecidas pelo ambiente de
hospedagem.

## Endpoints

- `GET /healthcheck` e `/api/healthcheck`: 200 com banco disponível, 503 se indisponível.
- `GET /api/items` e `/api/items/:id`.
- `POST /api/items`, `PUT /api/items/:id` e `DELETE /api/items/:id`.

JSON inválido retorna 400, payload acima do limite padrão de 100 KB retorna 413 e rotas inexistentes
retornam 404 em JSON. Erros inesperados retornam 500 sem detalhes internos.

## Testes e qualidade

```bash
npm run validate
npm run test:integration
npm run test:coverage
```

Unitários não exigem banco nem `.env`. Integrações validam o destino antes de migrar ou truncar
tabelas e fecham o pool ao terminar. Crie previamente o banco dedicado: veja o guia na raiz.
`test:watch` acompanha somente os unitários. O teste de reset é executado apenas em bancos locais
sem opções na URL; em outros destinos ele é explicitamente pulado.

## Migrações e reset local

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:reset -- --confirm=boilerplate
```

Use o nome real do banco na confirmação. Reset apaga os schemas `public` e `drizzle` e reaplica
migrações; todos os dados desses schemas são perdidos. Só aceita localhost, fora de produção, sem
opções adicionais na URL. A remoção dos schemas é transacional; se a migração posterior falhar,
corrija a causa e execute `db:migrate` novamente.
