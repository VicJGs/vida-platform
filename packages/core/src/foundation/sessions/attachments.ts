// ============================================================================
// foundation/sessions — attachment resolution (XS-effect-rail #32 · XCU-10)
//
// The read-side of the polymorphic session→entity links (`session_attachments`,
// AR-5 dim1). Given a session, produce the target set the lifecycle engine (S3)
// scopes each fired effect to. Pure read: no write, no tx, no crypto seam
// (the table has no [E] fields) and NO soft-delete filter — `session_attachments`
// carries no `deleted_at` (baseColumns excludes it; the base session owns
// lifecycle, attachments are hard-deleted).
// ============================================================================

import { eq } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { sessionAttachments } from '../../db/schema/foundation/sessions'

/** A resolved attachment target. `level` distinguishes type-level defaults
 *  ("always attached to a habit") from instance-level ("this session is about Topic X"). */
export interface ResolvedTarget {
  entityType: string
  entityId: string
  level: 'type' | 'instance'
}

/**
 * Resolve every attachment for a session (both levels), in no guaranteed order.
 * A session with no attachments returns `[]` — legal, never an error; an unknown
 * `sessionId` is indistinguishable from "no attachments" and also returns `[]`.
 * (XCU-10 · ADR-004 §3.2.1.)
 */
export async function resolveTargets(db: DrizzleDb, sessionId: string): Promise<ResolvedTarget[]> {
  const rows = await db
    .select()
    .from(sessionAttachments)
    .where(eq(sessionAttachments.session_id, sessionId))
    .all()

  return rows.map((r) => ({
    entityType: r.entity_type,
    entityId: r.entity_id,
    level: r.level,
  }))
}
