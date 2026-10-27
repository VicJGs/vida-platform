// ============================================================================
// Migration 025 — Relationships (CRM)  (DB-4 · group #14 · ADR-002 §5.9)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The 14th DB-4 Stream (ii)
// domain migration. Mirrors schema/relationships.ts. Authors the 6 §5.9 tables
// (fresh — they lived in the pre-rebuild monolith) + 2 net-new network tables (G2).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-relationships/_index.md §P3.
// 8 tables: contacts · contact_events · interactions · contact_reminders ·
//           reminder_groups · reminder_group_contacts · network_groups · network_group_contacts
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*). deleted_at on
// `contacts` ONLY (§5.9 floor; children/ledgers/groups cascade or use is_active; the
// habit_completions/routine_completions ledger precedent). NO cross-table FK — contact_id/
// reminder_group_id/network_group_id are plain TEXT (no-FK, superseding §5.9's REFERENCES/
// CASCADE/SET NULL; cascade/orphan = app-layer RL-2). FIXED enums → SQL CHECK from the tuple.
// OPEN vocab (closeness_tier = Preferences-defined) = plain TEXT, no CHECK. Inline contacts.tags
// RETIRED → entity_tags (G10); social_links KEPT (typed JSON, C4). Junctions = synthetic id PK +
// UNIQUE(pair) + reverse index (project_habits v2 shape — NOT §5.9's composite PK).
// ============================================================================

import type { Migration } from '../adapter'

export const migration025Relationships: Migration = {
  version: 25,
  name: 'relationships',
  up: async (driver) => {
    // --- contacts: the person ---
    await driver.run(`
      CREATE TABLE contacts (
        id                      TEXT PRIMARY KEY,
        first_name              TEXT NOT NULL,   -- [E] PII
        last_name               TEXT,            -- [E] PII
        nickname                TEXT,            -- [E] PII
        relationship_type       TEXT DEFAULT 'acquaintance'
                                CHECK (relationship_type IN (
                                  'family', 'friend', 'colleague', 'mentor', 'mentee',
                                  'romantic', 'professional', 'acquaintance', 'other'
                                )),
        email                   TEXT,            -- [E] PII
        phone                   TEXT,            -- [E] PII
        avatar_url              TEXT,            -- [E]
        company                 TEXT,            -- [E] PII
        job_title               TEXT,            -- [E] PII
        location                TEXT,            -- [E] PII
        birthday                TEXT,            -- [E] PII, YYYY-MM-DD
        how_we_met              TEXT,            -- [E] NEW (G8)
        social_links            TEXT,            -- [E] JSON {linkedin?, twitter?, instagram?, whatsapp?}; KEPT (C4)
        closeness_tier          TEXT,            -- NEW (G4); OPEN (Preferences-defined), no CHECK
        stay_in_touch_frequency TEXT
                                CHECK (stay_in_touch_frequency IN (
                                  'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
                                )),
        stay_in_touch_days      INTEGER,
        last_interaction_date   TEXT,            -- derived cache (RL-3)
        next_contact_date       TEXT,            -- derived cache
        interaction_count       INTEGER NOT NULL DEFAULT 0,
        is_favorite             INTEGER NOT NULL DEFAULT 0,
        created_at              INTEGER NOT NULL,
        updated_at              INTEGER NOT NULL,
        deleted_at              INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    // NOTE: no name index — first_name/last_name are [E] ciphertext (§5.9 F7/D7). Inline `tags` retired → entity_tags.

    // --- contact_events: dates per person ---
    await driver.run(`
      CREATE TABLE contact_events (
        id             TEXT PRIMARY KEY,
        contact_id     TEXT NOT NULL,   -- no FK (was CASCADE); app-layer RL-2
        event_type     TEXT NOT NULL DEFAULT 'custom'
                       CHECK (event_type IN ('birthday', 'anniversary', 'holiday', 'custom')),
        event_date     TEXT NOT NULL,   -- YYYY-MM-DD or MM-DD (year-agnostic)
        title          TEXT,            -- [E]
        description    TEXT,            -- [E]
        is_recurring   INTEGER NOT NULL DEFAULT 1,
        reminder_days  TEXT,            -- JSON array [1,3,7]
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_contact_events_contact ON contact_events(contact_id)`)

    // --- interactions: the contact log/ledger (+ G8 restored) ---
    await driver.run(`
      CREATE TABLE interactions (
        id                TEXT PRIMARY KEY,
        contact_id        TEXT NOT NULL,   -- no FK (was CASCADE)
        interaction_type  TEXT NOT NULL DEFAULT 'in_person'
                          CHECK (interaction_type IN (
                            'call', 'text', 'email', 'in_person', 'video_call', 'social_media', 'letter', 'other'
                          )),
        date              TEXT NOT NULL,
        duration_minutes  INTEGER,
        summary           TEXT,            -- [E]
        sentiment         TEXT
                          CHECK (sentiment IN ('positive', 'neutral', 'negative')),
        follow_up_needed  INTEGER NOT NULL DEFAULT 0,
        follow_up_date    TEXT,
        follow_up_notes   TEXT,            -- [E]
        energy_given      INTEGER,         -- NEW (G8); plaintext analytic
        energy_received   INTEGER,         -- NEW (G8); plaintext analytic
        key_takeaways     TEXT,            -- [E] NEW (G8), free text
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    // NO deleted_at — the interactions ledger (RL-3); hard-deletes with the contact (HB-11/RT-17 precedent).
    await driver.run(`CREATE INDEX idx_interactions_contact ON interactions(contact_id)`)
    await driver.run(`CREATE INDEX idx_interactions_date ON interactions(date)`)

    // --- contact_reminders: per-person reminders (+ G8 snooze/priority) ---
    await driver.run(`
      CREATE TABLE contact_reminders (
        id                TEXT PRIMARY KEY,
        contact_id        TEXT NOT NULL,   -- no FK (was CASCADE)
        reminder_group_id TEXT,            -- no FK (was SET NULL); nullable
        title             TEXT NOT NULL,   -- [E]
        reminder_date     TEXT,
        is_recurring      INTEGER NOT NULL DEFAULT 0,
        frequency         TEXT
                          CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
        is_completed      INTEGER NOT NULL DEFAULT 0,
        is_snoozed        INTEGER NOT NULL DEFAULT 0,   -- NEW (G8)
        snoozed_until     TEXT,            -- NEW (G8); nullable
        priority          TEXT             -- NEW (G8); nullable
                          CHECK (priority IN ('critical', 'high', 'medium', 'low', 'none')),
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- reminder_groups: batch reminders (+ G11 event-anchor) ---
    await driver.run(`
      CREATE TABLE reminder_groups (
        id                 TEXT PRIMARY KEY,
        name               TEXT NOT NULL,   -- [E]
        message_template   TEXT,            -- [E]
        time_of_day        TEXT,            -- HH:MM
        frequency          TEXT
                           CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
        days_of_week       TEXT,            -- JSON array [0-6]
        is_active          INTEGER NOT NULL DEFAULT 1,
        anchor_type        TEXT NOT NULL DEFAULT 'schedule'   -- NEW (G11)
                           CHECK (anchor_type IN ('schedule', 'birthday')),
        anchor_days_before INTEGER,         -- NEW (G11); days before a member's birthday when anchor_type='birthday'
        created_at         INTEGER NOT NULL,
        updated_at         INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- reminder_group_contacts: group↔contact junction (RESHAPE v2 — project_habits shape) ---
    await driver.run(`
      CREATE TABLE reminder_group_contacts (
        id                TEXT PRIMARY KEY,
        reminder_group_id TEXT NOT NULL,   -- no FK (was CASCADE)
        contact_id        TEXT NOT NULL,   -- no FK (was CASCADE)
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(
      `CREATE UNIQUE INDEX uq_reminder_group_contacts ON reminder_group_contacts(reminder_group_id, contact_id)`,
    )
    await driver.run(`CREATE INDEX idx_reminder_group_contacts_contact ON reminder_group_contacts(contact_id)`)

    // --- network_groups: a network of people (net-new — G2) ---
    await driver.run(`
      CREATE TABLE network_groups (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,   -- [E]
        is_active         INTEGER NOT NULL DEFAULT 1,
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- network_group_contacts: network↔contact junction (net-new — G2/RL-4) ---
    await driver.run(`
      CREATE TABLE network_group_contacts (
        id                TEXT PRIMARY KEY,
        network_group_id  TEXT NOT NULL,   -- no FK
        contact_id        TEXT NOT NULL,   -- no FK
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(
      `CREATE UNIQUE INDEX uq_network_group_contacts ON network_group_contacts(network_group_id, contact_id)`,
    )
    await driver.run(`CREATE INDEX idx_network_group_contacts_contact ON network_group_contacts(contact_id)`)
  },
}
