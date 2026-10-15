import type { Response } from 'supertest'

export function getResponseBody<T>(response: Response): T {
  const body: unknown = response.body

  return body as T
}
