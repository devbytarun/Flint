# Deployment

Target: **Vercel + Neon** (both free tiers are sufficient for a demo deployment).

## One-time setup

1. **Database**: create a Neon project → copy the *pooled* connection string.
2. **Vercel**: import the GitHub repository (`devbytarun/Flint`). Framework preset: Next.js; no build overrides needed (Turbopack is the default).
3. **Environment variable** in Vercel → Project → Settings:
   - `DATABASE_URL` = the Neon pooled string (`sslmode=require` included).
4. **Migrate** the production database from your machine against the production URL:

   ```bash
   DATABASE_URL="<neon-pooled-url>" npm run db:migrate
   ```

5. Deploy. First registration through the UI creates your account.

## Why this stack deploys cleanly

- Single Next.js app: no CORS/cookie domain juggling between services.
- All routes are Node-runtime server code; `@node-rs/argon2` native bindings stay external via `serverExternalPackages`.
- `postgres.js` with `prepare: false` is PgBouncer-safe — required for Neon's pooler and harmless otherwise.
- No build-time database access: pages are dynamic, so builds never need credentials beyond what actions use at runtime.

## Operational notes

| Concern | Approach |
| --- | --- |
| Migrations | Manual, deliberate, applied via drizzle-kit. Migration SQL files are committed, so history is reviewable |
| Secrets | Only `DATABASE_URL`; rotate via Neon dashboard if leaked |
| Scaling reads | Control-plane traffic is low; Neon autoscales compute. Evaluation endpoints do one indexed query per request |
| Multi-region | Documented as future work (see technical-decisions); single-region is correct for v1 consistency |

## Self-hosting alternative

Any Node 20+ host works: `npm run build && npm start` behind a TLS proxy. Provide a real PostgreSQL instance (not PgBouncer-less connection hammering) and set `DATABASE_URL`. The security headers and cookies already assume HTTPS.
