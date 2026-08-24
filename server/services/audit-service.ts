import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";

/** Read model for the audit trail viewer. Append-only table; no filters v1 beyond recency. */
export async function listRecentAuditLogs(projectId: string, limit = 50) {
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.projectId, projectId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
