import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../server.js';
import { closeDb } from '../db/index.js';

let app: FastifyInstance;
let cookies: string;

function uniqueEmail() {
  return `test+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@dream-library.test`;
}

function extractCookies(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) return '';
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return headers.map((h) => h.split(';')[0]).join('; ');
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const signUpRes = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: { 'content-type': 'application/json' },
    payload: { email: uniqueEmail(), password: 'super-secret-pw', name: 'Books Test User' },
  });
  cookies = extractCookies(signUpRes.headers['set-cookie']);
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

describe('GET /api/v1/books', () => {
  it('rejects without session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/books' });
    expect(res.statusCode).toBe(401);
  });

  it('returns an empty catalog for a fresh DB', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/books',
      headers: { cookie: cookies },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('books');
    expect(Array.isArray(body.books)).toBe(true);
  });
});

describe('GET /api/v1/books/by-isbn/:isbn', () => {
  it('returns 400 when ISBN is malformed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/books/by-isbn/abc',
      headers: { cookie: cookies },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when no edition matches', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/books/by-isbn/9999999999999',
      headers: { cookie: cookies },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'not_found' });
  });
});
