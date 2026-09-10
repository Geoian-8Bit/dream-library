# Dream Library

Biblioteca personal para libros físicos y digitales. La idea: fotografiar el código de barras de un libro, identificarlo contra Google Books / Open Library y colocarlo en una estantería que se pueda recorrer, abrirlo si existe el archivo (EPUB/PDF) y saber cuándo sale el siguiente tomo de la saga.

> **Estado: en desarrollo, no usable todavía.** El esqueleto está montado —monorepo, base de datos, autenticación, API, navegación y sistema visual—, pero las funcionalidades que definen el producto (escaneo, escena 3D y lector) aún no están implementadas. El detalle está justo debajo, sin adornos.

## Qué funciona hoy

- **Monorepo** con workspaces `shared` / `backend` / `frontend`, tipos Zod compartidos cliente↔servidor y CI en GitHub Actions (lint, typecheck, tests, build de imágenes Docker).
- **Base de datos** completa en Drizzle: `books`, `book_editions`, `book_series`, `user_library`, `reading_progress`, `book_files`, `scan_logs`, más las tablas de sesión.
- **Autenticación** con better-auth (registro, login, sesión por cookie) y pantallas de alta y acceso.
- **API Fastify** con validación Zod, Swagger en `/docs`, `/health` y las rutas de lectura de libros (`GET /api/v1/books`, `GET /api/v1/books/by-isbn/:isbn`), con el patrón route → service → repository y sus tests.
- **Frontend** con navegación completa (estantería, detalle, favoritos, estadísticas, alta), sistema de temas con materiales intercambiables y una **ilustración 2D** de la estantería.

## Qué falta

- **Escaneo del código de barras.** Las dependencias (`@zxing/browser`) están, la pantalla de alta también, pero todavía no lee nada: el formulario no persiste.
- **Escena 3D.** `three`, `@react-three/fiber` y `drei` están instalados y sin usar. La estantería que se ve hoy es una ilustración 2D en DOM y CSS, no una escena.
- **Lector EPUB/PDF** y subida de archivos a R2.
- **Conectar el frontend a la API.** Las pantallas se pintan hoy con datos de ejemplo (`lib/sampleBooks`), no con la base de datos.
- **Fechas de próximos tomos** de una saga.

## Capturas

<!-- TODO: captura de la estantería 2D actual con un tema aplicado. Guardar en docs/media/estanteria.png -->
<!-- TODO: captura del cambio de tema/material. Guardar en docs/media/temas.png -->
<!-- TODO: cuando exista la escena 3D, GIF de la estantería girando. Guardar en docs/media/estanteria-3d.gif -->

## Stack

- **Frontend** Vite + React 18 + TypeScript + Tailwind + Zustand + TanStack Query + Better Auth client (react-three-fiber y drei ya instalados, todavía sin usar)
- **Backend** Node.js 22 + Fastify 5 + TypeScript + Drizzle ORM + Zod + pino
- **DB** PostgreSQL 17 (Docker en local; Neon / Supabase / VPS en producción)
- **Storage** Cloudflare R2 (portadas, EPUBs, PDFs)

## Estructura

```
dream-library/
├── shared/         tipos zod compartidos cliente↔servidor
├── src/
│   ├── frontend/   app web (Vite)
│   └── backend/    API REST (Fastify)
├── docker-compose.yml
└── .github/workflows/
```

## Arranque rápido

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:push
npm run dev
```

- Frontend en `http://localhost:5173`
- API en `http://localhost:4000`
- Swagger en `http://localhost:4000/docs`
- Health en `http://localhost:4000/health`

## Scripts raíz

| Script                | Acción                                     |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Frontend y backend en paralelo             |
| `npm run build`       | Build de todos los workspaces              |
| `npm run lint`        | ESLint en todo el repo                     |
| `npm run format`      | Prettier write                             |
| `npm run typecheck`   | tsc --noEmit en cada workspace             |
| `npm run db:generate` | Genera migraciones desde el schema Drizzle |
| `npm run db:push`     | Aplica el schema directamente (desarrollo) |
| `npm run db:studio`   | Drizzle Studio (UI de la DB)               |

## Desarrollo asistido por agentes

Este repo está preparado para que el trabajo lo ejecuten agentes de código y siga siendo revisable por una persona. La documentación no es decorativa: es el contrato que lee el agente antes de escribir.

- [`CLAUDE.md`](CLAUDE.md) se carga solo en cada sesión de Claude Code. Lista las reglas no negociables —todo `/api/v1/*` detrás de `requireUser`, patrón estricto route → service → repository, schemas Zod compartidas sin duplicar, suite completa (`lint`, `typecheck`, `build`, `test`) antes de dar nada por hecho— y los comandos habituales, para que el agente no tenga que inferirlos.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) fijan ese patrón con código copiable y la receta paso a paso de cómo se añade una feature. Un agente que la sigue produce código indistinguible del que ya hay, en vez de inventarse una estructura nueva en cada archivo.
- Las barreras las pone el repo, no la confianza: husky con lint-staged y commitlint en cada commit, y ESLint, typecheck, build, tests contra Postgres real, `npm audit` y gitleaks en CI. Lo que no pasa esas puertas no entra, lo haya escrito un agente o yo.
- `.agents/skills` y `skills-lock.json` fijan con su hash las skills externas que carga el agente (las de Three.js, para la escena pendiente), de forma que el contexto sea reproducible entre sesiones.

## Documentación

Antes de tocar código:

- [`CLAUDE.md`](CLAUDE.md) — guía corta para agentes (auto-loaded por Claude Code) con las reglas no-negociables y los comandos comunes.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, monorepo, ciclo de vida de una request, auth, DB, errores, decisiones notables.
- [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) — recetas paso a paso para añadir features siguiendo el patrón route → service → repository.
- [`docs/SETUP.md`](docs/SETUP.md) — setup local detallado (Postgres real, PGlite, Docker), reset de DB, troubleshooting.
