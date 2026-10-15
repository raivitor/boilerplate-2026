# Boilerplate Web

Frontend em Next.js 16 + React 19, com App Router e React Compiler. Use Node 24.

```bash
npm ci
npm run dev
```

Abra http://localhost:3000. Os fontes ficam em `src`; o alias `@/*` aponta para `src/*`.

```bash
npm run validate
npm run build
npm start
```

A validação verifica formatação, lint e tipos. Ainda não existem testes automatizados de frontend.

Para publicar na Vercel, selecione `web` como diretório raiz. Para outro serviço, use `npm ci`,
`npm run build` e `npm start`. A página inicial não depende da API; configure a URL e a estratégia
de chamadas quando adicionar funcionalidades. Variáveis `NEXT_PUBLIC_*` são públicas e incorporadas
ao build, portanto não devem conter segredos.
