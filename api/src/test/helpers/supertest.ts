import type { Response } from 'supertest'

export function getResponseBody<T>(response: Response): T {
  return response.body as unknown as T
}

export function getSetCookieHeaders(response: Response): string[] {
  const setCookieHeader = response.headers['set-cookie']

  if (!setCookieHeader) {
    return []
  }

  return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
}
