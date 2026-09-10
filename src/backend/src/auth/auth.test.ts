import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../server.js';
import { closeDb } from '../db/index.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

function uniqueEmail() {
  return `test+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@dream-library.test`;
}

function extractCookies(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) return '';
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return headers.map((h) => h.split(';')[0]).join('; ');
}

describe('auth happy path', () => {
  it('rejects protected route without session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/books' });
    expect(res.statusCode).toBe(401);
  });

  it('signs up, receives session cookie, and reaches protected route', async () => {
    const email = uniqueEmail();
    const password = 'super-secret-pw';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Test User' },
    });
    expect(signUpRes.statusCode).toBe(200);

    const cookies = extractCookies(signUpRes.headers['set-cookie']);
    expect(cookies.length).toBeGreaterThan(0);

    const protectedRes = await app.inject({
      method: 'GET',
      url: '/api/v1/books',
      headers: { cookie: cookies },
    });
    expect(protectedRes.statusCode).toBe(200);
    const body = protectedRes.json();
    expect(body).toHaveProperty('books');
    expect(Array.isArray(body.books)).toBe(true);
  });

  it('signs in with existing credentials', async () => {
    const email = uniqueEmail();
    const password = 'super-secret-pw';

    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Returning User' },
    });

    const signInRes = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password },
    });
    expect(signInRes.statusCode).toBe(200);
    const cookies = extractCookies(signInRes.headers['set-cookie']);
    expect(cookies.length).toBeGreaterThan(0);
  });
});
