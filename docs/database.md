# Database

PostgreSQL (Neon in dev), accessed through Drizzle ORM with the `postgres.js` driver. The client is configured with `prepare: false` because Neon's PgBouncer endpoint uses transaction pooling, which does not support prepared statements.

## Entity relationships

```text
users ──< sessions

users ──< project_members >── projects
                                 │
                                 ├──< environments ──< api_keys
                                 │         │
                                 │         └──< flag_environment_configs >── flags ──> projects
                                 └──< audit_logs
```

- `projects` are **archived** (`archived_at`), never deleted: cascade-deleting a project would destroy audit history.
- `audit_logs.resource_id` is a plain `text` snapshot — deleting a flag leaves its history queryable as a tombstone.

## Tables (highlights)

### users
`email` unique (lowercased at the service layer). `password_hash` holds an Argon2id encoded hash (salt embedded).

### sessions
Primary key is the **SHA-256 hash of the opaque token**; the raw token exists only inside the user's httpOnly cookie. A database dump therefore cannot be replayed as valid sessions.

### projects / project_members
Membership is the authorization source of truth. Unique `(project_id, user_id)` plus an index on `user_id` for "my projects". Roles: enum `owner | admin | member`.

### environments
Unique `(project_id, key)`. `protected` marks production (informational guardrail surfaced in UI and audits).

### flags / flag_environment_configs
Flags hold identity (`key` unique per project, immutable `id`). All mutable behavior lives in one row per `(flag, environment)`:

| Column | Meaning |
| --- | --- |
| `enabled` | Master switch for this environment |
| `rollout_percentage` | Basis points 0–10000 (integer math avoids float drift) |
| `rules` | JSONB array of ordered targeting rules |

Environment isolation is **structural**: evaluation reads one config row scoped by `environment_id`; there is no way to leak another environment's state into an answer.

### api_keys
`key_hash` = SHA-256 of the full token (unique); `display_token` = non-secret prefix used for lookup; `revoked_at` tombstones instead of deleting so audits keep meaning; `last_used_at` is write-throttled to once/hour/key.

### audit_logs
Append-only. Actor email is snapshotted (`actor_email`) alongside `actor_user_id ON DELETE SET NULL`, so history survives account deletion. Indexed `(project_id, created_at DESC)` for the viewer and `(resource_type, resource_id)` for per-resource trails.

## Concurrency & transactions

Multi-step writes run in `db.transaction`: project bootstrap (project + owner membership + 3 environments + audit event), flag creation fan-out, config update + diff capture, key revocation. The audit "before" snapshot is read *inside* the transaction so diffs can't diverge from what was replaced.

Duplicate-key races (two people creating the same flag key) surface as PostgreSQL `23505`; the service unwraps ORM-wrapped errors (`hasPostgresCode`) and throws a domain error (`FlagKeyTakenError`) that actions map to field errors.

## Migrations

Generated SQL lives in `drizzle/` with a journal; `npm run db:migrate` applies pending migrations. Schema changes follow: edit `db/schema.ts` → `npm run db:generate -- --name <change>` → review SQL → migrate.
