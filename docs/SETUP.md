# Setup local

Cómo poner Dream Library a correr en tu máquina. Probado en Windows 11; lo equivalente en macOS/Linux es directo (sólo cambian los comandos de servicio Postgres).

## Prerequisitos

| Cosa                                | Versión     | Notas                                                        |
| ----------------------------------- | ----------- | ------------------------------------------------------------ |
| Node.js                             | 22.x        | Hay un `.nvmrc`. Con `nvm use` lo deja correcto.             |
| npm                                 | 10+         | viene con Node 22                                            |
| git                                 | reciente    |                                                              |
| **Una de las tres opciones de DB:** |             | Elige según tu situación                                     |
| → PostgreSQL nativo                 | 16, 17 o 18 | Recomendado si la vas a usar siempre                         |
| → Docker Desktop                    | 4+          | Si ya lo tienes; el `docker-compose.yml` levanta Postgres 17 |
| → Nada                              | —           | Cae en PGlite (Postgres en WASM) sin instalar nada           |

Para la opción "nada", saltas a [Setup con PGlite](#setup-con-pglite). Para Postgres real (recomendado para paridad con prod), [Setup con Postgres real](#setup-con-postgres-real).

## Setup con Postgres real

### Una vez (la primera): crear los roles y la DB

Necesitas el password del superusuario `postgres` que pusiste al instalar PostgreSQL. Ejecuta el script desde la raíz del repo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/init-postgres.ps1
```

Te pedirá tu password. El script crea (idempotente):

- Rol **`dream_library`** — el user de la app, password generado, sin permisos de superuser.
- Rol **`dream_library_admin`** — superuser, password generado. Para administrar desde pgAdmin / DBeaver.
- DB **`dream_library`** propiedad de `dream_library`.

El script imprime los passwords en consola. **Guárdalos en tu password manager.** Los del rol `dream_library` van también a `.env`.

> El SQL ejecutado vive en `scripts/init-postgres.sql` con los passwords baked-in. Está en `.gitignore` para que no salga del repo. Si necesitas regenerar passwords, edita ese archivo y vuelve a correr el `.ps1`.

### Crear `.env`

```bash
cp .env.example .env
```

Edita `.env` y ajusta:

```
DATABASE_URL=postgres://dream_library:<el-password-generado>@localhost:5432/dream_library
BETTER_AUTH_SECRET=<32-caracteres-random>
BETTER_AUTH_URL=http://localhost:4000
```

Para generar un `BETTER_AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Instalar deps y arrancar

```bash
npm install
npm run dev
```

`npm run dev` levanta backend en `:4000` y frontend en `:5173` en paralelo. **El backend aplica las migraciones automáticamente** al arrancar (sólo en dev — en producción se aplican antes del deploy).

Abre **http://localhost:5173**. Te redirige a `/sign-up`. Crea tu cuenta. Estás dentro.

## Setup con PGlite (sin Postgres ni Docker)

Si no tienes Postgres ni quieres instalarlo. PGlite es Postgres compilado a WASM que vive en un fichero local. No tiene servidor.

### `.env`

```bash
cp .env.example .env
```

Edita:

```
DATABASE_URL=pglite://./local.pgdata
BETTER_AUTH_SECRET=<32-caracteres-random>
BETTER_AUTH_URL=http://localhost:4000
```

### Arrancar

```bash
npm install
npm run dev
```

`local.pgdata/` se crea en `src/backend/` la primera vez. Los datos persisten entre arranques. Si quieres empezar limpio: `Remove-Item -Recurse -Force src/backend/local.pgdata` (o `rm -rf src/backend/local.pgdata`).

`local.pgdata` está en `.gitignore`, no se commitea.

## Setup con Docker

```bash
docker compose up -d postgres
cp .env.example .env
# editar .env: DATABASE_URL=postgres://dream_library:dream_library@localhost:5432/dream_library
#               BETTER_AUTH_SECRET=<32 chars>
npm install
npm run dev
```

El servicio docker `postgres` viene con user `dream_library` / password `dream_library` / db `dream_library` por defecto (ver `docker-compose.yml`). Ojo: ese password es trivial; sólo úsalo en local detrás del firewall.

## Verificar que va

Endpoints rápidos:

```bash
curl http://localhost:4000/health/ready
# {"status":"ready","deps":{"database":"ok"}}

curl -i http://localhost:4000/api/v1/books
# HTTP/1.1 401 Unauthorized
```

Frontend: http://localhost:5173.

## Reset de la DB

### Postgres real

Borrar las tablas y dejar la DB lista para que las migraciones del backend la repueblen:

```powershell
$env:PGPASSWORD = '<password de dream_library>'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U dream_library -h localhost -d dream_library `
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public AUTHORIZATION dream_library;"
```

Reinicia el backend (`npm run dev`) — las migraciones corren automáticamente.

### PGlite

```powershell
Remove-Item -Recurse -Force src/backend/local.pgdata
```

(o `rm -rf` en bash). Reinicia el backend.

## Cambiar de driver de DB

Sólo cambia `DATABASE_URL` en `.env`. El backend detecta el driver por prefijo:

- `postgres://` o `postgresql://` → driver TCP normal
- `pglite://` o `file://` → embedded WASM

Reinicia `npm run dev` para que coja el cambio (el `.env` se lee al boot, no en watch).

## Correr tests en local

Backend tests requieren Postgres alcanzable. Por defecto usan `DATABASE_URL_TEST` si está definido en `.env`; si no, caen en `DATABASE_URL`. El `init-postgres.ps1` ya crea la DB `dream_library_test` para el rol `dream_library`, así que basta con:

```bash
npm test
```

Frontend tests no necesitan DB.

Si sólo quieres uno:

```bash
npm test --workspace=@dream-library/backend
npm test --workspace=@dream-library/frontend
```

> Los tests crean users de prueba (`test+<timestamp>@dream-library.test`) que se acumulan. Como van a `dream_library_test` y no a `dream_library`, no contaminan el dev DB. Si en algún momento quieres limpiar el test DB, igual que el dev: `DROP SCHEMA public CASCADE; ...` apuntando a `dream_library_test`.

> En CI no hay DB de tests separada — el servicio Postgres es efímero (se descarta al terminar el job), así que reutiliza la misma DB. Por eso el workflow no setea `DATABASE_URL_TEST`.

## Detener todo

Si `npm run dev` está en foreground: Ctrl+C en su terminal.

Si quedan procesos zombie escuchando en :4000 o :5173:

```powershell
Get-NetTCPConnection -LocalPort 4000, 5173 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

O con npx: `npx kill-port 4000 5173`.

## Problemas frecuentes

### `password authentication failed for user "dream_library"`

`.env` tiene un `DATABASE_URL` con password incorrecto. Comprueba que coincide con el que generó `init-postgres.ps1`. Si lo perdiste, edita `scripts/init-postgres.sql`, pon nuevos passwords, reejecuta el `.ps1`, y actualiza `.env`.

### `BETTER_AUTH_SECRET must be at least 32 characters`

Falta o es corto en `.env`. Genera uno:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### `Port 4000 is in use, trying another one...` (Vite) o `EADDRINUSE` (Fastify)

Procesos viejos zombi. Mátalos (ver "Detener todo").

### CI verde pero local rojo

Los tests pasan en CI con servicio Postgres limpio. Si fallan en local, suele ser estado contaminado de la DB. Resetea (ver "Reset de la DB") y reintenta.

### `relación «X» ya existe` al arrancar

Tu DB tiene tablas de un setup previo pero no la tabla de tracking de Drizzle, así que las migraciones intentan crear todo desde cero y chocan. Reset (ver arriba).

### El frontend pide login al recargar

Comprueba que el backend devuelve la cookie con `Secure=false` en dev. Mira la pestaña Network en DevTools: la response del `/api/auth/sign-up/email` debe traer `Set-Cookie` y la siguiente request debe enviarla en `Cookie:`. Si no, problema de CORS — `CORS_ORIGINS` en `.env` debe incluir `http://localhost:5173`.

## Herramientas recomendadas

- **pgAdmin** o **DBeaver** para inspeccionar la DB en local (con el rol `dream_library_admin`).
- **VS Code** con extensiones: ESLint, Prettier, Tailwind CSS IntelliSense.
- **Drizzle Studio**: `npm run db:studio --workspace=@dream-library/backend` abre una UI web para los datos.
- **Postman / Bruno / HTTPie** para probar endpoints. Recuerda enviar la cookie de sesión (curl: `-b "<copiada del navegador>"`).

## Lecturas siguientes

- **`docs/ARCHITECTURE.md`** para entender por qué está montado así.
- **`docs/CONVENTIONS.md`** antes de añadir features.
