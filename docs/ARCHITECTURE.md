# Arquitectura de Dream Library

Documento de referencia. Lee `CLAUDE.md` primero para tener el contexto y las reglas; este archivo entra en el detalle.

## Stack

| Capa                  | Tecnología                                           | Versión  |
| --------------------- | ---------------------------------------------------- | -------- |
| Runtime backend       | Node                                                 | 22 (LTS) |
| Servidor HTTP         | Fastify                                              | 5        |
| ORM                   | Drizzle                                              | 0.45+    |
| Driver DB             | postgres-js (real) o @electric-sql/pglite (embedded) | —        |
| Validación            | zod                                                  | 3        |
| Auth                  | Better Auth                                          | 1.x      |
| Logger                | pino + pino-pretty (dev)                             | 9        |
| Build frontend        | Vite                                                 | 6        |
| UI                    | React                                                | 19       |
| 3D                    | react-three-fiber + @react-three/drei + three        | r170     |
| Estado cliente        | Zustand + TanStack Query                             | 5        |
| Estilos               | Tailwind CSS                                         | 3        |
| Router                | react-router-dom                                     | 6        |
| DB en prod (planeado) | PostgreSQL                                           | 17/18    |
| DB en CI              | servicio Postgres en GitHub Actions                  | 17       |

## Monorepo

```
dream-library/
├── CLAUDE.md                          guía corta para agentes (auto-loaded por Claude Code)
├── README.md                          presentación + quickstart
├── docs/                              docs detallados (este archivo, CONVENTIONS, SETUP)
├── package.json                       workspaces npm (shared, src/backend, src/frontend)
├── .env.example                       plantilla; .env real está en .gitignore
├── .gitignore .gitleaks.toml .editorconfig .nvmrc
├── eslint.config.js .prettierrc.json .lintstagedrc.json commitlint.config.cjs
├── docker-compose.yml Dockerfile.backend Dockerfile.frontend
├── .github/workflows/                 ci.yml + security.yml
├── .husky/                            pre-commit (lint-staged) + commit-msg (commitlint)
├── scripts/
│   ├── init-postgres.ps1              wrapper que pide password y corre psql
│   └── init-postgres.sql              passwords baked-in, gitignored
├── shared/                            workspace @dream-library/shared
│   └── src/
│       ├── index.ts                   re-export de schemas/
│       └── schemas/index.ts           zod compartido: user, book, edition, errors, responses
├── src/backend/                       workspace @dream-library/backend
│   ├── drizzle.config.ts              config drizzle-kit (migraciones)
│   ├── drizzle/migrations/            SQL versionado + meta journal
│   ├── tsconfig.json tsconfig.build.json vitest.config.ts
│   └── src/
│       ├── server.ts                  buildApp() + main(); registra plugins y routes
│       ├── config/env.ts              parsea process.env con zod, requerida BETTER_AUTH_SECRET
│       ├── db/index.ts                drizzle instance; switch por prefijo de DATABASE_URL
│       ├── db/schema.ts               todas las tablas (users, sessions, accounts, books, etc.)
│       ├── auth/
│       │   ├── config.ts              betterAuth({...}) instance
│       │   ├── require-user.ts        preHandler que pone req.user o devuelve 401
│       │   └── auth.test.ts           integration test del flujo sign-up/in
│       ├── plugins/
│       │   ├── auth.ts                catch-all /api/auth/* hacia auth.handler
│       │   ├── cors.ts swagger.ts rate-limit.ts
│       ├── repositories/              **una capa**: queries Drizzle, sin lógica de negocio
│       │   └── books.repository.ts
│       ├── services/                  **una capa**: orquesta repos + APIs externas, mapea a wire
│       │   ├── books.service.ts
│       │   └── books.service.test.ts  unit con mock del repo
│       ├── routes/                    **una capa**: thin handlers, schemas zod, llaman al service
│       │   ├── books.ts books.test.ts
│       │   └── health.ts health.test.ts
│       ├── lib/errors.ts              AppError + factorías NotFound, BadRequest, Conflict, etc.
│       └── test/setup.ts              vitest globalSetup: carga .env, corre migraciones
└── src/frontend/                      workspace @dream-library/frontend
    ├── index.html vite.config.ts vitest.config.ts tailwind.config.ts postcss.config.js nginx.conf
    └── src/
        ├── main.tsx                   bootstrap: QueryClientProvider + BrowserRouter
        ├── App.tsx                    Routes; envuelve la escena 3D en <RequireAuth>
        ├── index.css                  Tailwind base
        ├── api/                       clientes tipados por dominio (books.ts...)
        ├── auth/                      client.ts (better-auth/react), RequireAuth.tsx
        ├── pages/                     SignIn.tsx, SignUp.tsx (más vendrán)
        ├── scene/                     Library.tsx, Bookshelf.tsx (esqueleto 3D r3f)
        ├── components/ hooks/ scanner/ reader/   carpetas reservadas
        ├── store/library.ts           Zustand: vista actual + edición seleccionada
        └── lib/api.ts                 fetch wrapper con credentials: 'include'
```

## Ciclo de vida de una request protegida

```
GET /api/v1/books/by-isbn/:isbn  +  Cookie: dream-library.session_token=...
            │
            ▼
┌──────────────────────────────────┐
│  Fastify (server.ts)             │
│  helmet → rate-limit → cors      │
└─────────────────┬────────────────┘
                  │
                  ▼  matched URL
┌──────────────────────────────────────────────────────┐
│  protectedScope (prefix /api/v1)                     │
│  preHandler: requireUser                             │
│    → auth.api.getSession({ headers })                │
│    → si no hay sesión: reply.code(401) y para        │
│    → si hay: req.user = session.user; sigue          │
└─────────────────────────────┬────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────┐
│  Route (routes/books.ts)                             │
│  - schema.params (zod) valida la URL                 │
│  - llama booksService.findEditionByIsbn(isbn)        │
│  - schema.response (zod) valida la salida            │
└─────────────────────────────┬────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────┐
│  Service (services/books.service.ts)                 │
│  - llama booksRepository.findEditionByIsbn(isbn)     │
│  - si row es undefined: throw NotFound('edition')    │
│  - mapea Date → ISO string para wire shape           │
│  - devuelve { edition, book }                        │
└─────────────────────────────┬────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────┐
│  Repository (repositories/books.repository.ts)       │
│  - db.query.bookEditions.findMany({ where, with })   │
│  - devuelve drizzle row (con Date objects)           │
└──────────────────────────────────────────────────────┘
```

Si en cualquier punto una excepción se propaga, la captura el `errorHandler` en `server.ts`. AppError → mapping a HTTP por `statusCode` + `code`. Cualquier otro error → 500 con mensaje genérico (no se expone stack al cliente).

## Auth

Implementación con [Better Auth](https://www.better-auth.com/) sobre Drizzle.

- **Endpoint catch-all** `/api/auth/*` (ver `plugins/auth.ts`) puentea Fastify → Web Fetch API y delega en `auth.handler`. Better Auth gestiona `sign-up/email`, `sign-in/email`, `sign-out`, `get-session`, etc.
- **Sesiones por cookie** httpOnly. En prod las cookies son `Secure + SameSite=None`; en dev `SameSite=Lax`.
- **Sesiones persistidas en DB** en la tabla `sessions`. Permite revocar (basta con borrar la fila). Cache en memoria de 5 min para rendimiento.
- **Credenciales** en la tabla `accounts` (Better Auth las separa del user; el campo `password` ahí es el hash).
- **`requireUser`** (en `auth/require-user.ts`) es un preHandler que llama `auth.api.getSession({ headers })` y rellena `req.user` / `req.session`. Si no hay sesión → 401. Está enganchado al scope `/api/v1` en `server.ts`.
- **IDs UUID.** Configuramos `advanced.database.generateId: false` para que Postgres genere los IDs vía `gen_random_uuid()` por defecto.
- **No hay verificación de email** ni reset de password todavía (`requireEmailVerification: false`). Cuando se conecte un email provider (Resend, Postmark, SES) se cambia. Hay un hook listo en la config.
- **No hay OAuth** (Google/Apple) ni 2FA todavía. Better Auth tiene plugins para todo eso; se enchufan sin migrar usuarios.
- **Frontend** usa `better-auth/react` (`src/auth/client.ts`). Expone `useSession`, `signIn`, `signUp`, `signOut`. `<RequireAuth>` redirige a `/sign-in` si la sesión no está.
- **Multi-tenant futuro** vía el plugin de organizations cuando llegue B2B.

## Base de datos

### Driver dual

El backend elige driver según el prefijo de `DATABASE_URL` (en `db/index.ts`):

- `postgres://...` o `postgresql://...` → `postgres-js` (driver TCP normal). Para dev real, CI y prod.
- `pglite://...` o `file://...` → `@electric-sql/pglite` (Postgres compilado a WASM, vive en un fichero). Para clones sin Postgres instalado.

Las migraciones SQL son las mismas para ambos. La capa de queries (Drizzle) es idéntica. **El código de la app no sabe contra qué driver corre.**

### Migraciones

- Definición del schema en `src/backend/src/db/schema.ts`.
- Generadas en `src/backend/drizzle/migrations/<NNNN>_<name>.sql` con `npm run db:generate`.
- Drizzle-kit guarda meta en `drizzle/migrations/meta/_journal.json` y `<NNNN>_snapshot.json`. Esos archivos van al repo.
- En **dev** se aplican automáticamente al arrancar el backend (`server.ts` llama `migrateDb()` cuando NODE_ENV ≠ 'production').
- En **CI** las aplica `globalSetup` de vitest (`src/test/setup.ts`) sobre el servicio Postgres.
- En **prod** (futuro) se aplicarán antes del deploy con `npm run db:migrate` (script aún por wirear).

### Tablas

Auth: `users`, `sessions`, `accounts`, `verifications`. (Las de Better Auth.)

Dominio Dream Library:

- `book_series` — sagas (Mistborn, Stormlight, etc.)
- `books` — obras (un título conceptual; varias ediciones lo materializan)
- `book_editions` — ediciones físicas/digitales con ISBN
- `user_library` — qué ediciones posee cada usuario
- `reading_progress` — estado de lectura, página actual, rating, review
- `book_files` — referencia a EPUB/PDF subidos a R2
- `scan_logs` — auditoría de cada escaneo (qué se escaneó, qué se resolvió)

Todas las tablas con datos de usuario tienen FK a `users.id` con `onDelete: 'cascade'`.

### Casing

`drizzle({ schema, casing: 'snake_case' })`. Las propiedades JS son camelCase (`createdAt`, `userId`); los nombres de columna en SQL son snake_case (`created_at`, `user_id`). El mapeo lo hace Drizzle automáticamente.

## Errores

`src/backend/src/lib/errors.ts` exporta:

- Clase `AppError` (extiende `Error`) con `statusCode`, `code`, `message`, `details`.
- Factorías: `NotFound(resource, id?)`, `Unauthorized(msg?)`, `Forbidden(msg?)`, `BadRequest(msg, details?)`, `Conflict(msg)`.

Los services las **lanzan** (`throw NotFound('edition', isbn)`). El `errorHandler` global en `server.ts` las traduce:

```
AppError → reply.code(statusCode).send({ error: code, message, details, requestId })
otro     → reply.code(500).send({ error: 'Error', message: 'Internal server error', requestId })
```

Los errores de validación de zod (request body / params malformados) los emite Fastify antes de llegar al handler; salen como 400 con `error: 'FastifyError'` y un message legible.

**`setErrorHandler` se registra antes de los `app.register(...)` children.** Crítico: Fastify resuelve el handler en tiempo de registro; si lo seteas después, los plugins capturan el handler default y tu AppError nunca se mapea.

## Schemas y wire shape

`@dream-library/shared/src/schemas/index.ts` exporta zod schemas que sirven como **única fuente de verdad** para el contrato de la API:

```
zod schema  ──► validador de request (params/body) en backend (Fastify type provider)
            ──► validador de response en backend
            ──► parser de respuesta en frontend (api/*.ts)
            ──► tipos TS inferidos para handlers y components (z.infer<>)
```

### Drizzle row vs wire shape

Una row de Drizzle tiene `Date` objects, columnas extra (metadata, createdAt internos). El **service** mapea a la wire shape antes de devolver:

```
DB row (Drizzle)    ──[booksService.toWireBook]──►   Book (zod, ISO strings, sin metadata)
```

Beneficio: el cliente nunca recibe un Date object (no existe en JSON), y la wire shape es estable aunque la columna en DB cambie.

## Frontend

### Auth-aware routing

En `App.tsx`:

```tsx
<Routes>
  <Route path="/sign-in" element={<SignIn />} />
  <Route path="/sign-up" element={<SignUp />} />
  <Route
    path="/*"
    element={
      <RequireAuth>
        <LibraryShell />
      </RequireAuth>
    }
  />
</Routes>
```

`<RequireAuth>` consulta `useSession()` de Better Auth client. Si `isPending` muestra splash; si no hay sesión, `<Navigate to="/sign-in">`. Si hay, renderiza el contenido.

### Cliente API tipado por dominio

Cada feature backend tiene su contraparte en `src/frontend/src/api/<feature>.ts`. Ejemplo: `api/books.ts` exporta `listBooks()` y `findEditionByIsbn(isbn)`. Cada función:

1. Llama al wrapper genérico `api()` (en `lib/api.ts`) que pone `credentials: 'include'` y normaliza errores HTTP.
2. Pasa la respuesta cruda por `<schema>.parse(...)` para validar runtime.
3. Devuelve el tipo inferido de zod.

Si en runtime el backend devuelve algo que no encaja con la zod, `parse` lanza y la capa que llamó (TanStack Query, useEffect, etc.) lo trata como error.

### Estado

- **Sesión:** `useSession()` de Better Auth. Internamente usa nanostores; React-friendly.
- **Datos remotos:** TanStack Query (instalado, aún sin uso real porque sólo hay endpoints triviales). Patrón previsto: `useQuery(['books'], listBooks)`.
- **UI local (vista 3D, edición seleccionada):** Zustand (`store/library.ts`).

### 3D

`scene/Library.tsx` y `scene/Bookshelf.tsx` son el esqueleto de la escena. Ahora mismo es decorativo. Cuando lleguen libros reales, la escena los pintará a partir del store + datos de TanStack Query.

## DevOps

### Workflows GitHub Actions

- **`ci.yml`** — corre en cada push/PR a `main`. Job `lint-typecheck-build` con servicio Postgres 17 (env vars `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NODE_ENV=test`): `npm ci && lint && typecheck && build && test`. Job `docker` builds las dos imágenes (sólo en push a main).
- **`security.yml`** — npm audit (prod, level=high) + gitleaks scan completo del working tree. También en cada push/PR + cron semanal.

### Imágenes Docker

`Dockerfile.backend` y `Dockerfile.frontend` (nginx). `docker-compose.yml` con servicio `postgres:17-alpine` para arranque local end-to-end (cuando se quiera).

### Hooks locales

- **pre-commit:** lint-staged corre Prettier + ESLint --fix sobre los staged files.
- **commit-msg:** commitlint exige conventional commits.

### gitleaks

`.gitleaks.toml` extiende reglas default y allowlistea: `.env.example`, `SECURITY.md`, `README.md`, `src/backend/src/test/setup.ts` (fallback de test secret), workflows YAML.

## Decisiones notables (compactas)

- **Better Auth en vez de Clerk/Auth.js/DIY.** TS-native, drizzle-friendly, UI propia (encaja con la estética inmersiva), gratis a cualquier escala, plugins modulares. Detalle del razonamiento: ver historial de la sesión que añadió auth.
- **PGlite como fallback de dev.** Real Postgres en WASM. Permite que un clone arranque sin servidor de DB. El driver se elige en runtime por prefijo de `DATABASE_URL`.
- **`legacy-peer-deps=true` en `.npmrc`.** drizzle-orm 0.45 declara peers opcionales pesados (RN, expo-sqlite). En el monorepo con React 19, npm peer-resolution moderna chocaba; el flag lo destraba sin afectar runtime.
- **Migraciones regeneradas tras cambios en users.** Cuando metimos auth tuvimos que reformatear `users` (drop displayName/passwordHash, add name/emailVerified/image). Como no había DB en prod, regeneramos `0000_*.sql` desde cero en lugar de añadir un `0001_*.sql` con ALTERs. Si en el futuro hay datos en prod, prohíbete regenerar — añade migraciones incrementales.
- **`response: { 200: ..., 404: errorResponseSchema }` en routes.** Documenta en swagger las respuestas de error, y obliga al runtime a respetar la wire shape.
- **CORS con `credentials: true`** y `trustedOrigins` en Better Auth = los `CORS_ORIGINS` del env. Si el frontend cambia de dominio, hay que actualizar las dos cosas.
- **Tests reales con DB en CI** vía servicio Postgres. Implica tiempos algo mayores, pero las regresiones que cazamos lo justifican (cualquier divergencia entre PGlite local y Postgres real se ve aquí).
- **No usamos `any` ni `@ts-ignore`.** El feedback de calidad explícito del proyecto los prohíbe; arregla el problema en su origen.

## Lecturas relacionadas

- **`docs/CONVENTIONS.md`** — recetas concretas para añadir features.
- **`docs/SETUP.md`** — cómo arrancar la app en local.
