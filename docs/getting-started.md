# Getting started

## Prerequisites

- **Node.js 20.9+** (LTS)
- **npm 10+**
- A **PostgreSQL 14+** database. Any of these work:
  - [Neon](https://neon.tech) free tier (recommended — serverless, pooled)
  - Local PostgreSQL
  - Docker: `docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16`

## Installation

```bash
git clone https://github.com/devbytarun/Flint.git
cd Flint
npm install
```

## Environment setup

```bash
cp .env.example .env.local
```

Then edit `.env.local` and provide your connection string:

```text
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

With Neon, copy the **pooled** connection string. The app connects with
`prepare: false` (PgBouncer-safe), so pooled endpoints work unchanged.

`.env.local` is git-ignored; never commit real credentials.

## Database setup

Migrations are plain SQL files under `drizzle/` with a committed journal:

```bash
npm run db:migrate      # applies pending migrations
```

That creates all nine tables. Future schema changes follow the same flow:
edit `db/schema.ts` → `npm run db:generate -- --name describe_change` →
review the generated SQL → migrate.

## Run the app

```bash
npm run dev             # http://localhost:3000
```

## First-run walkthrough

1. Open `http://localhost:3000` and create an account.
2. Create a project — Development/Staging/Production environments are
   provisioned automatically.
3. Create a flag (it starts disabled everywhere).
4. Open the flag, enable it in Development, add a targeting rule or raise
   the rollout.
5. Project → **API keys**: create a key for the environment you want to
   evaluate against and copy the token (shown exactly once).
6. Evaluate from any client:

```bash
curl -X POST http://localhost:3000/api/v1/evaluate \
  -H "Authorization: Bearer flint.development.xxxxxxxx…" \
  -H "Content-Type: application/json" \
  -d '{"context":{"targetingKey":"user_123"}}'
```
