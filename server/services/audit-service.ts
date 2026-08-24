import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";

/** Read model for the audit trail viewer. Append-only table. */
export async function listRecentAuditLogs(
  projectId: string,
  filters: { environmentKey?: string; action?: string; limit?: number } = {},
) {
  const conditions = [eq(auditLogs.projectId, projectId)];

  if (filters.environmentKey) {
    conditions.push(eq(auditLogs.environmentKey, filters.environmentKey));
  }
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }

  return db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters.limit ?? 50);
}

/** Distinct actions present for this project — powers the filter dropdown. */
export async function listDistinctActions(projectId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ action: auditLogs.action })
    .from(auditLogs)
    .where(eq(auditLogs.projectId, projectId));
  return rows.map((row) => row.action).sort();
}
