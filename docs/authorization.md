# Authorization

Authorization is **membership-based, hierarchical, and enforced server-side** at every mutation and read path.

## Roles

| Role | Can do |
| --- | --- |
| `member` | Read everything in the project (flags, configs, keys metadata, audit trail) |
| `admin` | + create/edit/delete flags and environment configs; manage API keys; edit project details |
| `owner` | + archive the project |

`server/authz/roles.ts` encodes this as a rank comparison (`hasAtLeast(role, required)`), so adding a role later is a one-line change.

## How access is resolved

Every project-scoped entry point calls:

```ts
const context = await getProjectContext(slug, user.id);
// → { project, role, canManage: role≥admin, canAdminister: role=owner } | null
```

The membership check happens **in the same SQL join** that fetches the project — there is no "fetch project by id" path that skips authorization. Non-members (and unknown slugs) both get `null`, rendered as a 404: project existence is not disclosed to outsiders.

## Enforcement points

| Surface | Mechanism |
| --- | --- |
| Page rendering | `(app)` layout requires a session; project layout resolves context once for nested routes |
| Server Actions | Each action independently re-runs `getCurrentUser()` + `getProjectContext()` + role gate before validation. Actions are reachable via forged direct POSTs, so nothing about the caller can be assumed |
| Public API | Key row carries `project_id` + `environment_id`; every query filters by both. A key can never read another project/environment |

## Design rules

1. **UI hiding is UX, not security.** Members see disabled controls; the server rejects the request anyway if tampered.
2. **No client-supplied trust anchors.** Flag lookups take `(projectId from membership, flagKey)`; API queries take `(projectId, environmentId from the key row)`.
3. **Fail closed.** Missing/ambiguous permission = deny.
4. **404 over 403** for cross-tenant reads to avoid existence oracles.

## Known limitation

Members cannot be invited yet through the UI (the data model and checks fully support it); projects are single-owner-plus-you in practice for v1. Membership management is the first planned v2 feature — see [technical decisions](technical-decisions.md).
