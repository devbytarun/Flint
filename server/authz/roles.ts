import type { ProjectRole } from "@/db/schema";

/**
 * Authorization model.
 *
 * Roles are hierarchical: owner ⊃ admin ⊃ member.
 *
 *  - member: read-only access to the whole project (flags, configs,
 *    keys metadata, audit trail).
 *  - admin: manage flags, configurations, environments and API keys.
 *  - owner: everything admins can do, plus archiving the project and
 *    managing members.
 *
 * Checks happen in the service/action layer against database-backed
 * membership rows — never in the UI alone.
 */
const ROLE_RANK: Record<ProjectRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function hasAtLeast(role: ProjectRole, required: ProjectRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}
