// ============================================================================
// Migration 004 — the effect rail (AR-7 Increment 1)
// Hand-written SQL DDL (ADR-016 §3.2 — no drizzle-kit). Shape per F1 §3B
// (composite PK, local-only) + ADR-002 §5.20 owed-ledger. Mirrors
// schema/foundation/effects.ts (query mirror).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// applied_effects is device-local (NOT synced) — no baseColumns/syncColumns, like
// sync_queue. The CHECK list is the same 12-tuple as EFFECT_TYPE (@vida/types);
// enum-parity.test.ts asserts CHECK ≡ tuple.
// ============================================================================

import type { Migration } from '../adapter'

export const migration004Effects: Migration = {
  version: 4,
  name: 'effects',
  up: async (driver) => {
    await driver.run(`
      CREATE TABLE applied_effects (
        effect_event_id TEXT NOT NULL,
        effect_type     TEXT NOT NULL CHECK (effect_type IN (
          'complete_habit_occurrence','log_time','emit_measurement_signal','contribute_purpose_metric',
          'award_xp','surface_journal','surface_calendar','attach_pomodoro',
          'grant_currency','lock_currency','move_money','surface_notification')),
        target_ref      TEXT NOT NULL,
        applied_at      INTEGER NOT NULL,
        PRIMARY KEY (effect_event_id, effect_type, target_ref)
      )
    `)
    await driver.run(`CREATE INDEX idx_applied_effects_event ON applied_effects (effect_event_id)`)
  },
}
