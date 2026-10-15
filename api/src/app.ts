import cors from 'cors'
import { sql } from 'drizzle-orm'
import type { Application, NextFunction, Request, Response } from 'express'
import express from 'express'

import { createCorsOptions } from './config/cors.js'
import { db } from './database/client.js'
import router from './routes/routes.js'

const app: Application = express()

app.use(cors(createCorsOptions()))
app.use(express.json())

app.use('/api', router)

app.get(['/healthcheck', '/api/healthcheck'], async (_req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`)
    return res.status(200).json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch {
    return res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
    })
  }
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' })
})

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return _next(err)
  const type = err && typeof err === 'object' && 'type' in err ? err.type : undefined
  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON' })
    return
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ error: 'Payload Too Large' })
    return
  }
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

export default app
