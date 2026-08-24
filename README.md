# Flint

**Feature flags and controlled rollouts for developers.**

Flint lets teams control feature availability remotely: flip features on/off per environment, roll them out to a deterministic percentage of users, or target specific segments — without redeploying.

```text
new_dashboard → ON
ai_assistant  → OFF
new_checkout  → 10% rollout
```

## Core capabilities

| Area | What it does |
| --- | --- |
| **Projects & environments** | Isolated workspaces with `development`, `staging`, and `production` provisioned automatically |
| **Feature flags** | Per-environment configuration: enable state, rollout percentage, ordered targeting rules |
| **Deterministic rollout** | SHA-256 bucketing guarantees a user gets the same result for as long as the config is unchanged |
| **Targeting rules** | Attribute matching (`equals`, `in`, `exists`, …), first match wins, overrides rollout |
| **Developer API** | `POST /api/v1/evaluate` and `GET /api/v1/flags` with environment-scoped keys, rate limiting, CORS |
| **API keys** | Shown once, stored hashed, revocable, scoped to one environment |
| **Audit log** | Append-only record of every configuration change with structured before/after diffs |
| **Authorization** | Owner/admin/member roles enforced server-side on every mutation |

## Stack

Next.js 16 (App Router) · TypeScript strict · PostgreSQL · Drizzle ORM · Tailwind CSS v4 · Zod · Vitest · Argon2id sessions

## Quickstart

```bash
git clone https://github.com/devbytarun/Flint.git
cd Flint
npm install

# 1. Provide a PostgreSQL connection string (Neon free tier works well)
cp .env.example .env.local   # then edit DATABASE_URL

# 2. Create tables
npm run db:migrate

# 3. Run
npm run dev                  # http://localhost:3000
```

Create an account → create a project → create a flag → create an API key for your environment. Then evaluate from any app:

```bash
curl -X POST https://your-flint-host/api/v1/evaluate \
  -H "Authorization: Bearer flint.production.xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"context": {"targetingKey": "user_123", "attributes": {"plan": "pro"}}}'
```

```json
{
  "evaluations": {
    "new_checkout": { "enabled": true, "reason": "ROLLOUT_INCLUDED" }
  }
}
```

A zero-dependency TypeScript client lives at [`sdk/flint.ts`](sdk/flint.ts).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js lifecycle |
| `npm test` | Unit + integration suites (Vitest) |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:generate` / `db:migrate` | Drizzle migrations |

## Documentation

Everything is documented under [`docs/`](docs):

[Architecture](docs/architecture.md) · [Database](docs/database.md) · [API](docs/api.md) · [Authentication](docs/authentication.md) · [Authorization](docs/authorization.md) · [Feature evaluation](docs/feature-evaluation.md) · [Rollout](docs/rollout.md) · [Security](docs/security.md) · [Testing](docs/testing.md) · [Deployment](docs/deployment.md) · [Technical decisions](docs/technical-decisions.md) · [Interview preparation](docs/interview-preparation.md)

## Status

Built as a production-shaped reference implementation: real auth, real authorization boundaries, append-only auditing, and a fully tested evaluation core. Known limitations are documented honestly rather than hidden — start with [technical decisions](docs/technical-decisions.md).
