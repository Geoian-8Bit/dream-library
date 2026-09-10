# Convenciones de Dream Library

Cómo añadir cosas. Si añades una feature nueva, sigue **al pie de la letra** las recetas de este archivo. Si te encuentras escribiendo código que no encaja con ninguna receta, para y discútelo en chat antes de seguir.

## Receta: añadir una feature backend de cero

Vas a tocar 4 ó 5 archivos en este orden:

1. **schema** (si la feature toca DB nueva): `shared/src/schemas/index.ts` y `src/backend/src/db/schema.ts`. Genera migración con `npm run db:generate --workspace=@dream-library/backend`.
2. **repository**: `src/backend/src/repositories/<feature>.repository.ts` — sólo queries.
3. **service**: `src/backend/src/services/<feature>.service.ts` — orquesta y mapea a wire.
4. **route**: `src/backend/src/routes/<feature>.ts` — thin handler con schemas zod.
5. **register** la route en `src/backend/src/server.ts` dentro del scope adecuado (protegido o público).

Después de las 5: `tests` y, si el frontend la consume, su `api/<feature>.ts`.

A continuación, cada paso con código copiable. El ejemplo es `series` (sagas), inventado para la receta — no implementes esto, sólo sigue el patrón.

### 1. Schema

#### shared/src/schemas/index.ts

```ts
export const seriesSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  totalPlanned: z.number().int().nullable(),
});

export const listSeriesResponseSchema = z.object({
  series: z.array(seriesSchema),
});

export type Series = z.infer<typeof seriesSchema>;
export type ListSeriesResponse = z.infer<typeof listSeriesResponseSchema>;
```

Reglas:

- **Una zod por entidad.** Tipos derivados con `z.infer`.
- **Una `*ResponseSchema`** por endpoint que envuelva el payload (siempre objeto, nunca array al primer nivel — facilita añadir paginación luego).
- Todos los `Date` se exponen como `z.string().datetime().nullable()` — el service los convierte a ISO antes de devolver.

#### src/backend/src/db/schema.ts

Si necesitas tabla nueva, añádela y regenera la migración:

```bash
npm run db:generate --workspace=@dream-library/backend
```

Drizzle-kit puede pedir prompts interactivos si interpreta cambios como rename. Si estás fuera de TTY, edita `schema.ts` para que no haya ambigüedad (renombra primero, añade después en commits separados) o aplica las ALTERs a mano y copia el snapshot.

### 2. Repository

```ts
// src/backend/src/repositories/series.repository.ts
import { db, schema, type Database } from '../db/index.js';

export type SeriesRow = typeof schema.bookSeries.$inferSelect;

type Executor = Database;

export const seriesRepository = {
  async listAll(opts?: { limit?: number; tx?: Executor }): Promise<SeriesRow[]> {
    const exec = opts?.tx ?? db;
    return exec
      .select()
      .from(schema.bookSeries)
      .limit(opts?.limit ?? 50);
  },

  async findById(id: string, opts?: { tx?: Executor }): Promise<SeriesRow | undefined> {
    const exec = opts?.tx ?? db;
    const rows = await exec
      .select()
      .from(schema.bookSeries)
      .where(eq(schema.bookSeries.id, id))
      .limit(1);
    return rows[0];
  },
};
```

Reglas:

- **Sólo queries.** Cero lógica de negocio, cero mapping a wire, cero throws de HTTP.
- **Acepta `tx?` opcional** para que un service pueda envolver varias operaciones en transacción (`db.transaction(async (tx) => { ... })`).
- **Devuelve drizzle types** (`$inferSelect` o `$inferInsert`). El consumidor (service) los mapea.
- **Una sola export const** con métodos. No funciones sueltas. Facilita mockear.

### 3. Service

```ts
// src/backend/src/services/series.service.ts
import type { Series } from '@dream-library/shared';
import { seriesRepository, type SeriesRow } from '../repositories/series.repository.js';
import { NotFound } from '../lib/errors.js';

function toWireSeries(row: SeriesRow): Series {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    totalPlanned: row.totalPlanned,
  };
}

export const seriesService = {
  async listAll(): Promise<Series[]> {
    const rows = await seriesRepository.listAll();
    return rows.map(toWireSeries);
  },

  async findById(id: string): Promise<Series> {
    const row = await seriesRepository.findById(id);
    if (!row) throw NotFound('series', id);
    return toWireSeries(row);
  },
};
```

Reglas:

- **Throw errores de dominio**, no devuelvas null/undefined a la route. Usa las factorías de `lib/errors.ts`.
- **Mapper `toWireX(row)`** convierte Date → ISO string y elimina campos internos (metadata, createdAt si no se exponen).
- **Si la feature llama a APIs externas** (Google Books, R2), aquí vive ese código. Inyecta el cliente en el constructor o como módulo importado (que sea fácil mockear en tests).
- **El service no conoce HTTP.** No recibe `req`/`reply`. Recibe argumentos planos.
- **userId** viene como argumento explícito desde la route: `serviceFn(userId, ...args)`.

### 4. Route

```ts
// src/backend/src/routes/series.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { listSeriesResponseSchema, seriesSchema, errorResponseSchema } from '@dream-library/shared';
import { seriesService } from '../services/series.service.js';

const idParam = z.object({ id: z.string().uuid() });

export const seriesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/series', {
    schema: {
      tags: ['series'],
      summary: 'List all known series',
      response: { 200: listSeriesResponseSchema },
    },
    handler: async () => {
      const series = await seriesService.listAll();
      return { series };
    },
  });

  app.get('/series/:id', {
    schema: {
      tags: ['series'],
      summary: 'Get a series by id',
      params: idParam,
      response: { 200: seriesSchema, 404: errorResponseSchema },
    },
    handler: async (req) => seriesService.findById(req.params.id),
  });
};
```

Reglas:

- **`FastifyPluginAsyncZod`** como tipo del export para que `req.params`, `req.body`, etc. queden inferidos desde los schemas.
- **`schema.params`, `schema.body`, `schema.querystring`** con zod — Fastify valida y rechaza con 400 antes de llegar al handler.
- **`schema.response`** con un schema por status code que esperas devolver. Mínimo el 200; añade 404, 409, etc. cuando aplique.
- **Handler `async`**, usa `await`/`return` directamente. No envuelvas en try/catch — los errores propagan al `errorHandler`.
- **No accedas a `db` ni a Drizzle aquí.** Si te ves importando `db`, has tomado el camino equivocado.

### 5. Registro en server.ts

Si es protegida (lo común para `/api/v1/*`):

```ts
await app.register(
  async (protectedScope) => {
    protectedScope.addHook('preHandler', requireUser);
    await protectedScope.register(bookRoutes);
    await protectedScope.register(seriesRoutes); // <-- aquí
  },
  { prefix: '/api/v1' },
);
```

Si es pública (rara — `/health` ya está; auth la maneja Better Auth):

```ts
await app.register(myPublicRoutes);
```

## Receta: tests por capa

### Service (unit, repo mockeado)

```ts
// src/backend/src/services/series.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/series.repository.js', () => ({
  seriesRepository: { listAll: vi.fn(), findById: vi.fn() },
}));

import { seriesService } from './series.service.js';
import { seriesRepository } from '../repositories/series.repository.js';
import { AppError } from '../lib/errors.js';

const repoMock = vi.mocked(seriesRepository);

describe('seriesService.findById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 when missing', async () => {
    repoMock.findById.mockResolvedValueOnce(undefined);
    await expect(() => seriesService.findById('uuid-x')).rejects.toMatchObject({
      statusCode: 404,
      code: 'not_found',
    });
  });

  it('maps drizzle row to wire shape', async () => {
    repoMock.findById.mockResolvedValueOnce({
      id: 'uuid-x',
      name: 'Mistborn',
      description: null,
      totalPlanned: 16,
      metadata: null,
      createdAt: new Date(),
    });
    const result = await seriesService.findById('uuid-x');
    expect(result).toEqual({
      id: 'uuid-x',
      name: 'Mistborn',
      description: null,
      totalPlanned: 16,
    });
  });
});
```

Reglas:

- **`vi.mock` ANTES de los imports** (vitest la hoistea, pero es buen estilo).
- Cada caso testea **una transformación**: mapeo, throw, branching.
- **No testees el repo** desde aquí (eso lo cubre el integration test de la route).
- **Siempre `beforeEach(vi.clearAllMocks)`** para que un test no contamine al siguiente.

### Route (integration, DB real, auth real)

```ts
// src/backend/src/routes/series.test.ts
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
  const signUp = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: { 'content-type': 'application/json' },
    payload: { email: uniqueEmail(), password: 'super-secret-pw', name: 'Series Test' },
  });
  cookies = extractCookies(signUp.headers['set-cookie']);
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

describe('GET /api/v1/series', () => {
  it('rejects without session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/series' });
    expect(res.statusCode).toBe(401);
  });

  it('returns an empty list for a fresh DB', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/series',
      headers: { cookie: cookies },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().series).toEqual([]);
  });
});
```

Reglas:

- **`buildApp()` por test file**, no global. Cada file tiene su propia Fastify instance.
- **DB real** vía global setup (`src/test/setup.ts`). En CI hay servicio Postgres; en local apunta a tu Postgres dev.
- **Sign-up de un user único** por test file (timestamp + random) y reutiliza la cookie en el `it` que la necesita. Evita colisiones de email.
- **Asserciones por código y por shape clave**, no por payload completo. Los detalles los cubre el unit test del service.

### Frontend

```tsx
// src/frontend/src/App.test.tsx — unit test, no DB
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
```

(Aún no escrito — la actual `App.test.tsx` es un placeholder. Cuando llegue, usa @testing-library/react. Hay que añadir esa dep.)

## Receta: añadir el cliente API frontend

```ts
// src/frontend/src/api/series.ts
import {
  listSeriesResponseSchema,
  seriesSchema,
  type ListSeriesResponse,
  type Series,
} from '@dream-library/shared';
import { api } from '../lib/api';

export async function listSeries(): Promise<ListSeriesResponse> {
  return listSeriesResponseSchema.parse(await api<unknown>('/api/v1/series'));
}

export async function findSeries(id: string): Promise<Series> {
  return seriesSchema.parse(await api<unknown>(`/api/v1/series/${encodeURIComponent(id)}`));
}
```

Reglas:

- **Una función por endpoint** con el mismo nombre conceptual que en el service backend.
- **Re-parsea con zod en runtime.** Si el backend rompe el contrato, lo cazas en el cliente con un error explícito.
- **`encodeURIComponent` en path params** siempre.
- Para usar desde un componente, envuelve con TanStack Query: `useQuery({ queryKey: ['series'], queryFn: listSeries })`.

## Errores

| Necesitas...                          | Lánzalo en service                                     | Cliente recibe                                                   |
| ------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| 404 recurso no existe                 | `throw NotFound('series', id)`                         | 404 `{ error: 'not_found', message: "series uuid-x not found" }` |
| 400 datos malformados / regla violada | `throw BadRequest('reason', { details })`              | 400 `{ error: 'bad_request', message, details }`                 |
| 401 sesión inválida                   | (no lo lances; lo emite `requireUser` automáticamente) | 401 `{ error: 'unauthorized', message }`                         |
| 403 sesión OK pero permiso denegado   | `throw Forbidden('msg')`                               | 403 `{ error: 'forbidden', message }`                            |
| 409 conflicto (duplicado, race)       | `throw Conflict('msg')`                                | 409 `{ error: 'conflict', message }`                             |
| 500 inesperado                        | déjalo propagar (no lo captures)                       | 500 `{ error: 'Error', message: 'Internal server error' }`       |

## Naming

- **Archivos:** kebab-case si necesitas separar palabras (`require-user.ts`); las features singulares quedan en una palabra (`books.service.ts`).
- **Tipos:** `PascalCase`. Inferidos cuando es posible (`type Book = z.infer<typeof bookSchema>`).
- **Variables/funciones:** `camelCase`.
- **DB columnas:** `snake_case` (Drizzle lo hace por la opción `casing`).
- **Endpoints REST:** `kebab-case` y plural (`/api/v1/books`, `/api/v1/series`, `/api/v1/users/:id/library`). Sub-recursos con prefijo: `/api/v1/books/by-isbn/:isbn`.
- **Schema names:** `xxxxSchema` para el zod, `XxxxResponseSchema` para envoltorios de respuesta.
- **Repos / services:** `xxxxRepository`, `xxxxService` (objeto exportado con métodos).

## Estilo

- **Sin `any`, sin `@ts-ignore`, sin `eslint-disable` sin justificación documentada.** Si un type system te bloquea, refactoriza el dato real, no silencies el aviso.
- **Sin comentarios que repitan el código** (`// loop over books` arriba de un map). Sí comenta el _por qué_ cuando no es obvio. La regla del CLAUDE.md raíz: si quitar el comentario no confundiría a nadie, no lo escribas.
- **Sin `console.log` de debug en código commitado.** Si necesitas trazas, usa `app.log` / `req.log` (pino) para que aparezcan estructuradas y se filtren por nivel.
- **Sin imports relativos profundos**. Si te ves escribiendo `../../../foo`, mueve el archivo o crea un alias en el tsconfig.
- **Sin abstracciones prematuras.** Tres similar es mejor que un wrapper genérico que sólo se usa dos veces.
- **Sin error handling defensivo de cosas que no pueden pasar** (entrada que ya validó zod, resultados de queries cuyas FKs garantizan presencia).

## Anti-patrones (lo que NO se hace)

- ❌ Llamar `db.select()` desde una route. Va al repository.
- ❌ Devolver `Date` o `null/undefined` desde el service para "indicar" un 404. Throw `NotFound`.
- ❌ Catch + ignorar errores en services (`catch { return null }`). Deja propagar; el errorHandler decide.
- ❌ Schemas zod duplicados en backend y frontend. Vive en `@dream-library/shared`.
- ❌ `userId` derivado de un body no validado. Viene SIEMPRE de `req.user.id` (que pone `requireUser`).
- ❌ Endpoints sin `response.<status>: schema`. La validación de respuesta cazó al menos un bug grave en este proyecto (errorHandler no firaba); úsala.
- ❌ Hardcodear `http://localhost:4000` en el frontend. Va por `import.meta.env.VITE_API_URL` (en el wrapper `api()`).
- ❌ Commitear `.env`, `local.pgdata/`, `scripts/init-postgres.sql` o cualquier secreto.
- ❌ Saltarse hooks de git (`--no-verify`, `--no-gpg-sign`). Si un hook falla, arregla la causa.

## Suite de verificación tras implementar

```
npm run lint
npm run typecheck
npm run build
npm test
```

Si alguno falla:

- Arréglalo (no `// @ts-ignore`, no `eslint-disable` sin razón documentada, no skip de tests).
- Re-ejecuta el comando que falló.
- Continúa con los siguientes.

Sólo cuando los cuatro pasen, reportar la tarea como completada.

Si la verificación necesita servicios externos (DB, etc.), arranca lo necesario antes (`docker compose up -d postgres` o tu Postgres local) o documenta explícitamente lo que no se pudo verificar y por qué.
