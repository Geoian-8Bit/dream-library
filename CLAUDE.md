# Dream Library — guía para agentes

Dream Library es una **biblioteca virtual personal inmersiva**: el usuario fotografía un libro, se identifica por ISBN, y aparece en una escena 3D (Three.js / r3f). Mobile-first, web app, multi-tenant desde el día uno con vista a comercializar.

Este archivo lo lee Claude Code automáticamente. Mantenlo corto. La sustancia vive en `docs/`.

## Antes de tocar código, lee

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, monorepo, data flow, auth, DB, devops, decisiones notables.
2. [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) — el patrón route → service → repository con código copiable. **Indispensable** antes de añadir cualquier feature.
3. [`docs/SETUP.md`](docs/SETUP.md) — cómo arrancar la app en local (Postgres, `.env`, dev servers, reset de DB).

## Reglas no-negociables

1. **`/api/v1/*` siempre va detrás de `requireUser`.** Si añades un endpoint nuevo, asegúrate de que cuelga del scope protegido en `server.ts`. Endpoints públicos van fuera de ese prefix.
2. **Patrón estricto route → service → repository.** Las rutas no tocan Drizzle. Los repositorios no lanzan errores HTTP. Los services hacen el mapeo de Drizzle (Date) a wire (ISO string). Detalles en `CONVENTIONS.md`.
3. **Errores de dominio vía las factorías de `lib/errors.ts`** (`NotFound`, `BadRequest`, `Conflict`, `Forbidden`, `Unauthorized`). Las throw en el service; el `errorHandler` global las traduce a HTTP.
4. **`setErrorHandler` antes de los `register`.** Fastify resuelve el handler en tiempo de registro; si lo seteas después, los children plugins capturan el handler default y nunca llega tu AppError → 404. Nos pasó.
5. **Schemas zod compartidas en `@dream-library/shared`.** El backend valida request+response con la misma; el frontend re-parsea la respuesta con la misma. **No dupliques.** Si añades un endpoint, añade su `*ResponseSchema` ahí.
6. **Tests reales contra Postgres, no mocks.** El mock está permitido para tests unitarios de service (mockear el repo). Para tests de route, DB real (la testea CI con servicio Postgres).
7. **Suite de verificación obligatoria tras implementar:** `npm run lint && npm run typecheck && npm run build && npm test`. Arregla todo antes de reportar la tarea como hecha. El pre-commit hook corre lint-staged + Prettier por ti, pero la suite completa es responsabilidad del agente.
8. **Nunca commitear secretos.** `.env`, `scripts/init-postgres.sql` (passwords baked in) y `local.pgdata/` están en `.gitignore`. Si vas a añadir una API key, va en `.env` (nunca en código). Si vas a añadir un fallback de test secret, allowlistea el path en `.gitleaks.toml`.
9. **Conventional commits.** El hook `commitlint` rechaza otros formatos. Tipos típicos: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`. Usa scope cuando ayude (`feat(auth): ...`).
10. **NO añadir `Co-Authored-By: Claude ...`** en commits — un hook del usuario lo bloquea.

## Comandos comunes

| Comando                                           | Qué hace                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`                                     | Backend (Fastify, :4000) + Frontend (Vite, :5173) en paralelo. Auto-migra la DB en boot.         |
| `npm run lint`                                    | ESLint sobre todo el repo.                                                                       |
| `npm run typecheck`                               | tsc --noEmit en `shared`, `backend`, `frontend`.                                                 |
| `npm run build`                                   | Build de producción de los tres workspaces.                                                      |
| `npm test`                                        | Vitest en todos los workspaces. Backend necesita Postgres alcanzable por `DATABASE_URL`.         |
| `npm run db:generate --workspace=@dream-library/backend` | Genera migración Drizzle desde el schema actual. **Interactivo** — fuera de TTY hay que ajustar. |
| `npm run db:push --workspace=@dream-library/backend`     | Aplica el schema a la DB sin migración (sólo dev).                                               |
| `gh run list --repo Geoian-8Bit/dream-library --limit 3` | Estado de los workflows CI / Security en GitHub.                                                 |

## Stack rápido

- **Frontend:** Vite + React 19 + TS + react-three-fiber + drei + Tailwind + Zustand + TanStack Query + Better Auth client. Router con react-router-dom v6.
- **Backend:** Node 22 + Fastify 5 + TS + Drizzle ORM (postgres-js o pglite según DATABASE_URL) + Better Auth + zod + fastify-type-provider-zod + pino.
- **Shared:** zod schemas exportadas como `@dream-library/shared`.
- **DB:** PostgreSQL 17/18. En CI un servicio Postgres 17. En local del autor, Postgres 18 nativo. Fallback PGlite para clones sin DB.
- **Auth:** Better Auth con cookies de sesión, drizzleAdapter, email + password (sin verificación de email todavía, sin OAuth todavía).
- **Storage** (futuro): Cloudflare R2 para portadas, EPUB, PDF.
- **DevOps:** Docker (Dockerfile.backend, Dockerfile.frontend), docker-compose, GitHub Actions (CI + Security), husky + lint-staged + commitlint, gitleaks, ESLint flat + Prettier.

## Estado de la app

Hecho hasta hoy: bootstrap del monorepo, auth completa (sign-up + sign-in + sesión + endpoint protegido), refactor a route/service/repository con `books` como ejemplo canónico, cliente API tipado en frontend, tests reales con DB en CI.

No hay roadmap fijo: el usuario decide qué feature toca según le apetezca. Espera a que te diga qué implementar.
