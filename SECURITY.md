# Security Policy

## Reporting a Vulnerability

If you discover a security issue in Dream Library, please report it privately. Do **not** open a public issue.

- Email: security@example.invalid (replace before going public)
- Expected response: within 72 hours.

## Supported Versions

While the project is in alpha (`0.x`), only the latest commit on `main` is supported.

## Threat Model — current scope

- Personal-use phase: single user, behind authenticated session.
- Files (PDF/EPUB) are uploaded by the owner only and stored in private object storage.
- Backend exposes a REST API; all write endpoints require auth (to be added before exposing publicly).

## Operational hardening checklist

- [ ] All secrets loaded via environment variables (never committed). See `.env.example`.
- [ ] `helmet` enabled in production.
- [ ] CORS origin allowlist configured per environment (`CORS_ORIGINS`).
- [ ] Database connection over TLS in production.
- [ ] Object storage (R2) bucket private; signed URLs for client downloads.
- [ ] Rate limiting on public endpoints (TODO: `@fastify/rate-limit`).
- [ ] Auth: password hashing via argon2id when local accounts are enabled.
- [ ] Dependency audits in CI: `npm audit --audit-level=high`.
- [ ] CodeQL or Semgrep scanning enabled on pull requests (TODO).

## Dependency policy

- Production dependencies pinned to caret ranges; lockfile committed.
- `npm audit` runs in CI; high/critical vulnerabilities block merges.
- Renovate or Dependabot recommended once the repo is hosted.

## Data classification

| Data                             | Classification | Storage                   |
| -------------------------------- | -------------- | ------------------------- |
| Email, displayName               | PII            | PostgreSQL                |
| Password hashes                  | Sensitive      | PostgreSQL (never logged) |
| Book files (PDF/EPUB)            | User content   | R2 private bucket         |
| Reading progress, ratings        | PII            | PostgreSQL                |
| Scan logs (raw barcode payloads) | Low            | PostgreSQL                |
