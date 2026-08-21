// ============================================================================
// DB-4 group #22 — Notifications ("the System's out-loud voice")  (schema/notifications.ts · mirrors migration 032)
// The dead-last observer leaf — a PURE SINK (in-degree = everything, out-degree 0).
// Almost all of it is service / ADR-013: the dispatcher (reminder-engine.ts, 0 bytes),
// the two production paths, derived-until-fire reminders, and the ZK wake-signal delivery
// are NOT schema. This authors the 1 table: notifications — the §5.16 FACT floor + the
// RESOLUTION-N4 build-phase AMENDMENTs (metadata[E] + a 3-flag delivery-audit) + the
// ADR-012 Additive convergence key (effect_event_id + UNIQUE).
//
// Bespoke shape: id + fields + created_at + syncColumns. NO updated_at (v2 dropped it,
// intake L22 — the interface confirms; mutation tracked via read_at/archived_at/_sync_lww_ts).
// NO deleted_at (read→archive→expire→purge lifecycle, NF-13). Nullability = the common.ts
// Notification interface (the $inferSelect oracle).
//
// effect_event_id (nullable) + UNIQUE(effect_event_id): ADR-012 L45/L139 — a surface_notification
// is an Additive output row; the UNIQUE on the row is the cross-device convergence key (the
// device-local applied_effects ledger cannot converge across devices). Nullable: only event-driven
// rows carry it; a time-driven dispatcher fire has no ADR-012 effect id (keyed by its dueIn occurrence
// = dispatcher service). SQLite treats NULLs as distinct, so the many NULL time-driven rows never
// collide. Mirrors the consequence_ledger sibling (economy.ts).
//
// Spec: docs/specs/foundation/db-4-notifications/_index.md §3a.
// ============================================================================

import { sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import { NOTIFICATION_TYPE } from '@vida/types'
import { syncColumns, uuidPk, enumText, boolInt, timestampMs } from './_shared'

// --- notifications: the polymorphic inbox row (a pure sink) — §5.16 -----------
export const notifications = sqliteTable(
  'notifications',
  {
    id: uuidPk(),
    type: enumText('type', NOTIFICATION_TYPE).notNull(), // FIXED → SQL CHECK (6)
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    message: text('message'),
    action_url: text('action_url'),
    /** @encrypted [E] */
    action_label: text('action_label'),
    entity_type: text('entity_type'), // OPEN — registry-validated, no CHECK; the linked subject (NF-10)
    entity_id: text('entity_id'),
    is_read: boolInt('is_read').notNull().default(false),
    read_at: timestampMs('read_at'),
    is_archived: boolInt('is_archived').notNull().default(false),
    archived_at: timestampMs('archived_at'),
    expires_at: timestampMs('expires_at'),
    // --- build-phase AMENDMENTs (RESOLUTION N4) ---
    delivered_in_app: boolInt('delivered_in_app').notNull().default(false), // delivery-audit (P, N4) — which channels a row fired on (multi-device delivery dedup)
    delivered_push: boolInt('delivered_push').notNull().default(false),
    delivered_email: boolInt('delivered_email').notNull().default(false),
    /** @encrypted [E] — optional entity-specific payload JSON */
    metadata: text('metadata'),
    // --- ADR-012 Additive convergence key ---
    effect_event_id: text('effect_event_id'), // nullable (event rows only); UNIQUE → cross-device converge (ADR-012 L45/L139)
    created_at: timestampMs('created_at').notNull(),
    ...syncColumns,
    // NO updated_at (v2 dropped it), NO deleted_at (purge lifecycle, NF-13)
  },
  (t) => [
    // ADR-012 L45/L139: UNIQUE effect_event_id on the output row (cross-device convergence). SQLite NULLs
    // are distinct → time-driven (NULL) rows are unconstrained, event rows converge on their id.
    unique('uq_notifications_event').on(t.effect_event_id),
    // NOTE: idx_notifications_unread(is_read) WHERE is_archived=0 is a PARTIAL index → SQL-migration-only
    // (the idx_pages_journal_unique NP-2 precedent, §5.16 floor's sole index); not expressible in the mirror.
  ],
)

// --- inferred row types ------------------------------------------------------
export type NotificationRow = typeof notifications.$inferSelect
export type NotificationInsert = typeof notifications.$inferInsert
