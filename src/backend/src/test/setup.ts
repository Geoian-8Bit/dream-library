import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(process.cwd(), '../../.env') });

if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = 'test-secret-must-be-at-least-32-characters-long';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
// Tests run against DATABASE_URL_TEST when set so they cannot pollute the dev DB.
// In CI the Postgres service is ephemeral, so DATABASE_URL is fine on its own.
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://dream_library:dream_library@localhost:5432/dream_library';
}

export async function setup() {
  const { migrateDb, closeDb } = await import('../db/index.js');
  await migrateDb();
  await closeDb();
}

export async function teardown() {
  // Worker processes own their own DB clients and close them via afterAll hooks.
}
