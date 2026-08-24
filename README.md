# Flint

Feature flags and controlled rollouts for developers — flip features per environment, ramp them to a deterministic percentage of users, or target exact segments without redeploying.

## Overview

Deploying code and releasing features are different risks. Flint separates them: a merge no longer ships to 100% of users instantly. Teams define flags once, then control availability remotely — enable per environment (development / staging / production are provisioned automatically), roll out gradually to a stable cohort of users, or target segments by attributes like plan or country. Every configuration change is recorded in an append-only audit log.

Consuming applications evaluate flags through one HTTP call or the bundled zero-dependency TypeScript client.

## Features

- **Projects with isolated environments** — development, staging, and production created transactionally with each project
- **Feature flags** — immutable keys, per-environment enable state, rollout percentage, and ordered targeting rules
- **Deterministic percentage rollouts** — SHA-256 bucketing over environment id + flag id + targeting key; the same user always gets the same answer while config is unchanged
- **Targeting rules** — `equals`, `in`, `notIn`, `exists` and more, first match wins, overriding rollout
- **Developer API v1** — `POST /api/v1/evaluate`, `GET /api/v1/flags`; JSON error envelopes, rate-limit headers, CORS
- **Environment-scoped API keys** — shown once, stored as SHA-256 hashes, constant-time verification, instant revocation
- **Append-only audit logs** — actor, environment, structured before/after diffs for every change
- **Role-based access** — owner/admin/member enforced server-side on every mutation
- **Session auth** — Argon2id passwords, hashed opaque session tokens, httpOnly cookies, rate-limited sign-in

## Architecture

```text
UI (app/, components/)            Server Components + client islands
  ↓
Server Actions / Route Handlers   server/actions/, app/api/v1/  ← trust boundary
  ↓                               (authn, zod validation)
Services                          server/services/               business logic
  ↓
Data access                       db/ (Drizzle schema + postgres.js)
  ↓
PostgreSQL
```

The evaluation engine (`lib/evaluation/`) is pure — no database, clock, or randomness — and is shared verbatim by the dashboard playground and the public API.

See [docs/architecture.md](docs/architecture.md).

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript (strict) |
| Database | PostgreSQL (Neon in dev/prod docs) |
| ORM | Drizzle ORM + postgres.js |
| Styling | Tailwind CSS v4 (tokens in `app/globals.css`, spec in `DESIGN.md`) |
| UI primitives | Radix UI (dialog, dropdown-menu), Lucide icons, Motion |
| Validation | Zod |
| Auth | Argon2id (`@node-rs/argon2`) + opaque sessions |
| Testing | Vitest |

## Project structure

```text
app/
  (auth)/                  login/register routes (split layout)
  (app)/                   authenticated shell: projects + project workspace
    project/[slug]/        overview, flags, keys, audit, settings
  api/v1/                  public API route handlers
components/
  ui/                      design-system primitives (button, dialog, …)
  …                        feature-specific components (flags, projects, auth)
server/
  actions/                 server actions (thin: authn → authz → validate → service)
  services/                business logic (projects, flags, api keys, audit)
  api/                     public-API plumbing (http envelope, evaluation loader)
  auth/                    password hashing, sessions, current user
  authz/                   role hierarchy
lib/
  evaluation/              PURE evaluation engine (unit-tested, golden-locked)
  validation/              zod schemas shared by actions and API
db/                        Drizzle client + full database schema
drizzle/                   generated SQL migrations + journal
sdk/flint.ts               zero-dependency TypeScript client
tests/                     Vitest unit + integration suites
```

## Getting started

Prerequisites: Node.js 20.9+, npm, and a PostgreSQL database (Neon free tier works well).

```bash
git clone https://github.com/devbytarun/Flint.git
cd Flint
npm install
cp .env.example .env.local     # then set DATABASE_URL
npm run db:migrate
npm run dev                    # http://localhost:3000
```

Full walkthrough including first flag and first API call: [docs/getting-started.md](docs/getting-started.md)

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (`sslmode=require` recommended). `.env.local` for local dev; never committed |

## Database

Schema lives in `db/schema.ts`; migrations are generated SQL under `drizzle/`.

```bash
npm run db:generate   # generate SQL from schema changes
npm run db:migrate    # apply pending migrations
```

Design details — relationships, constraints, transactions, audit integrity: [docs/database.md](docs/database.md)

## Testing

```bash
npm test              # all suites (unit + integration against DATABASE_URL)
```

The integration suites run against the real development database and clean up their fixtures. Coverage strategy and what is deliberately tested: [docs/testing.md](docs/testing.md)

## Development

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # Vitest
npm run build         # production build
npm run format        # Prettier write
npm run format:check  # Prettier check (CI-style gate)
```

## Deployment

Configured targets and step-by-step instructions (Vercel + Neon, plus self-hosting notes): [docs/deployment.md](docs/deployment.md)

## API

Two endpoints under `/api/v1` with bearer-key authentication:

```bash
curl -X POST https://your-flint-host/api/v1/evaluate \
  -H "Authorization: Bearer flint.production.xxxx…" \
  -H "Content-Type: application/json" \
  -d '{"context":{"targetingKey":"user_123","attributes":{"plan":"pro"}},"flagKeys":["new_checkout"]}'
```

Full reference including errors, rate limits, and CORS: [docs/api.md](docs/api.md). A zero-dependency client is available at [`sdk/flint.ts`](sdk/flint.ts).

## Security

Implemented measures include Argon2id password hashing, session tokens stored only as SHA-256 hashes, generic authentication errors with timing smoothing, per-IP/per-email login throttling, membership-based authorization resolved in SQL joins, hashed API keys verified in constant time, parameterized SQL throughout, security headers, and an append-only audit trail.

Details and the review findings list: [docs/security.md](docs/security.md)

## Documentation

- [Getting started](docs/getting-started.md) — setup to first evaluation
- [Architecture](docs/architecture.md) — layers, request flows, module map
- [Database](docs/database.md) — schema, constraints, transactions
- [API reference](docs/api.md) — endpoints, auth, errors, rate limits
- [Authentication & authorization](docs/authentication.md) — sessions, roles, enforcement
- [Feature flags](docs/feature-flags.md) — model, targeting, evaluation pipeline
- [Rollout engine](docs/rollout-engine.md) — deterministic bucketing deep dive
- [Security](docs/security.md) — measures, review findings, hardening checklist
- [Testing](docs/testing.md) — suite strategy and coverage decisions
- [Deployment](docs/deployment.md) — Vercel/Neon and self-hosting
- [Technical decisions](docs/technical-decisions.md) — trade-offs, rejections, mistakes
- [Interview preparation](docs/interview-preparation.md) — questions mapped to the codebase
- [DESIGN.md](DESIGN.md) — UI design system specification

## AI-assisted development

Flint was developed using an AI-augmented engineering workflow. AI tools were used for implementation assistance, debugging, architectural exploration, testing, refactoring, and documentation, with the resulting work reviewed and validated throughout development.
