# ADR-002: Data Model

**Status:** Accepted
**Date:** 2026-03-13
**Decision Makers:** Victor J.
**Context:** Vida Platform — Complete SQLite schema for local-first, zero-knowledge, multiplatform life management SaaS
**Amended by:** (each entry is the amending ADR's own `Amends:` declaration)
- [ADR-003](ADR-003-sync-protocol.md) — adds `_sync_field_ts` to **every** syncable table (per-field LWW). *Implicit schema edit — ratify formally at consolidation.*
- [ADR-004](ADR-004-session-framework.md) (2026-07-12; **+ F1 §3.2.5, 2026-07-16**) — replaces the Learning-only `study_sessions` + the §5.11 flat planner with the `sessions` spine + per-sub-type extension tables + `planned_blocks` + Integration-Contract tables. **F1 adds:** `applied_effects` (local-only dedup ledger, not synced — like `sync_queue`); a deterministic `effect_event_id` column on effect-triggering rows; a **UNIQUE** `effect_event_id` column on each effect *output* row (the cross-device convergence key).
- [ADR-005](ADR-005-study-method-service-framework.md) (2026-07-12) — retires `flashcard_decks`, `flashcard_reviews`, and the SM-2 columns on `flashcards`; a reviewable becomes a lean content entity scheduled by Knowledge's generic engine.
- [ADR-006](ADR-006-spaces-foundation-universal-tags.md) (2026-07-15) — retires page-only `tags` + `page_tags` for a universal `entity_tags`; adds `parent_tag_id`, `spaces`; opens the `entity_links` `entity_type` CHECK to a registry.
- [ADR-007](ADR-007-saved-views.md) (2026-07-15) — adds `views`; retires the INTENDED `task_views` (Tasks) and the per-module custom-views store (Preferences).
- [ADR-008](ADR-008-capability-block-registry.md) (2026-07-15) — adds the capability registry (definition) + `block_instances`; opens the closed `editor.ts` `BlockType` union. *Exact tables settle at build.*
- [ADR-009](ADR-009-templates-fork-on-instantiate.md) (2026-07-15) — adds a light `templates` store (user-saved bundles).
- [ADR-010](ADR-010-capability-authoring-security.md) (2026-07-15) — adds `capability_grants` (incl. `granted_envelope_hash`).
- [ADR-011](ADR-011-universal-measurability-progress-propagation.md) (2026-07-17) — **cross-cutting measurability**: adds a `measurement_kind` + `binding_mode` pair to pursuable entities across 7+ modules; makes `purposes.progress` / `targets.current_value` **nullable** (`NULL = derive`); relaxes `targets.purpose_id` → nullable (SR-003); adds Purpose-domain `values` · `contributions` (retiring `purpose_habits/routines/projects`) · `purpose_reviews` · `plan_steps`; restores `is_higher_better` / `baseline_value` / `success_criteria` / `measurement_method`.
- [ADR-012](ADR-012-points-economy-consequence-engine.md) (2026-07-19) — **Points Economy & Consequence Engine** (Gamification "the System"): adds `currencies` (multi-currency spine) + `store` (Finance-owned nestable Storage layer) + a `rules` table (headless automation); **generalizes `xp_history` → `consequence_ledger`** (currency-scoped ± earn/lock/spend/distribute; drops `xp_amount`/`action_type`/`level_before`/`level_after`); **splits `user_profile`** by single-writer (System keeps per-currency total + level; `check_in_streak*` → Check-ins; persona/modules/onboarding → Preferences; **PII stays ⚠**); makes `achievements.condition` a measurable predicate (ADR-011 seam + event stream); `level` → derived (no table). **Also extends ADR-004 §3.2.2** with four Additive-class effects (`grant_currency` · `lock_currency` · `move_money` · `surface_notification`) and **ADR-011 §3.7** with consequence-edge cycle detection.

**⚠ Consolidation status (D5 — ratified 2026-07-17, F4-body: D5-a = TRACK).** The schema in the body below is the **pre-amendment v1** and is **stale** against the amendments above. Per D5-a the consolidated re-write is **deferred to its own build-phase schema session** (the true owed set is large — not "~15 tables" but the ADR revise-pass slice **plus** the documented target schema of 19 modules **plus** cross-cutting sync deltas — and much of it is build-phase-deferred in-source) — it is **not** silently pending. The complete, durable **owed-tables ledger** now lives in **§5.20 (Pending Consolidation)** below: Stream (i) (the ADR-004…012 + F1/F6/F7 slice) fully enumerated, Stream (ii) (the 19 `docs/features/*/structure-data.md` docs) named as the build-session input set. Read **§5.20** alongside the body so the divergence stays visible. *(This supersedes the interim pointer to `docs/reviews/2026-07-15-adr-critique-gate.md` § "throughline ①", which remains the decision's audit record.)*

---

## 1. Summary

This document defines the **complete database schema** for the Vida Platform. Every table, column, index, and constraint is specified here. The schema is designed for **SQLite** (not PostgreSQL), runs **locally on the user's device**, and supports **encrypted sync** between devices.

**Key differences from Life OS (Supabase/PostgreSQL):**

| Concern | Life OS | Vida Platform |
|---------|---------|---------------|
| Database | PostgreSQL (Supabase) | SQLite (wa-sqlite/expo-sqlite/Tauri) |
| Multi-tenancy | `user_id` FK on every table | No `user_id` — single-user local DB |
| Primary Keys | UUID via `gen_random_uuid()` | UUIDv7 as TEXT (time-sortable) |
| Timestamps | `TIMESTAMPTZ` | `INTEGER` (Unix milliseconds) |
| Enums | PostgreSQL `CREATE TYPE` | `TEXT` with CHECK constraints (validated by Zod at app layer) |
| Full-text search | `tsvector` + GIN indexes | SQLite FTS5 virtual tables |
| Row-Level Security | RLS policies | Not needed — local DB |
| Triggers/Functions | PL/pgSQL | Application-level logic (packages/core) |
| Encryption at rest | None (Supabase managed) | SQLCipher (full DB) + libsodium (sensitive fields) |
| Sync | Supabase Realtime | LWW blob sync via Hono server |
| Arrays | PostgreSQL `TEXT[]`, `INTEGER[]` | JSON arrays as TEXT |
| JSONB | Native JSONB | JSON stored as TEXT |
| Soft deletes | `deleted_at TIMESTAMPTZ` | `deleted_at INTEGER` |

---

## 2. Schema Conventions

### 2.1 Primary Keys

All tables use **UUIDv7** stored as `TEXT`. UUIDv7 embeds a timestamp, making it time-sortable and globally unique across devices without coordination.

```sql
id TEXT PRIMARY KEY  -- UUIDv7 generated client-side
```

### 2.2 Timestamps

All timestamps are **Unix milliseconds** stored as `INTEGER`. This avoids timezone ambiguity and works natively across all platforms.

```sql
created_at INTEGER NOT NULL,  -- Date.now()
updated_at INTEGER NOT NULL,
deleted_at INTEGER             -- NULL = not deleted (soft delete)
```

### 2.3 Enum Values

No SQL enums. All categorical values use `TEXT` with optional `CHECK` constraints. **Zod schemas** in `packages/core` are the canonical validators.

```sql
status TEXT NOT NULL DEFAULT 'not_started'
  CHECK (status IN ('not_started','in_progress','completed','on_hold','cancelled')),
```

### 2.4 Boolean Values

SQLite has no native boolean. Use `INTEGER` with 0/1.

```sql
is_active INTEGER NOT NULL DEFAULT 1,  -- 0 = false, 1 = true
```

### 2.5 JSON Data

Arrays and nested objects stored as JSON-encoded `TEXT`.

```sql
tags TEXT,           -- '["tag1","tag2"]'
metadata TEXT,       -- '{"key":"value"}'
days_of_week TEXT,   -- '[1,2,3,4,5]' (0=Sun, 6=Sat)
```

### 2.6 Monetary Values

Stored as `INTEGER` in **cents** (or smallest currency unit) to avoid floating-point errors.

```sql
amount INTEGER NOT NULL,  -- $12.50 stored as 1250
```

### 2.7 Entity Notes Convention

No table has an inline `notes TEXT` column. All notes/annotations for any entity are stored as **pages** linked via the polymorphic `entity_type` + `entity_id` pattern on the `pages` table. An entity can have zero or more linked pages.

```sql
-- To find all notes for a task:
SELECT * FROM pages WHERE entity_type = 'task' AND entity_id = ?;

-- To find all notes for a habit completion:
SELECT * FROM pages WHERE entity_type = 'habit_completion' AND entity_id = ?;
```

This ensures all textual content benefits from: full-text search (FTS5), encryption (field-level on `pages.content`), CRDT sync (Yjs for editor content), and cross-domain linking (entity_links, page_links).

### 2.8 Dates (Calendar Dates Without Time)

Stored as `TEXT` in `YYYY-MM-DD` format when only the date matters (no time component).

```sql
due_date TEXT,           -- '2026-03-15'
journal_date TEXT,       -- '2026-03-13'
```

---

## 3. Sync Metadata

Every **syncable** table includes these columns for LWW (Last-Writer-Wins) conflict resolution:

```sql
-- Sync metadata (on every syncable table)
_sync_id        TEXT NOT NULL UNIQUE,  -- UUIDv4, stable sync identifier
_sync_version   INTEGER NOT NULL DEFAULT 1,
_sync_device_id TEXT NOT NULL,         -- Device that last modified this row
_sync_lww_ts    INTEGER NOT NULL,      -- Logical timestamp for LWW: an HLC (hybrid logical clock) stamp, NOT raw Date.now(). Encoding is build-phase (ADR-003 §6.1); INTEGER shown as the interim placeholder.
_sync_status    TEXT NOT NULL DEFAULT 'pending'
                CHECK (_sync_status IN ('pending','synced','conflict')),
_sync_hash      TEXT                   -- SHA-256 of row content for change detection
```

**How sync works:**
1. On write: increment `_sync_version`, set `_sync_lww_ts = hlc.now()` (a **hybrid logical clock** stamp, not raw `Date.now()` — see ADR-003 §6.1; the current code stamps `Date.now()` as the interim v0 until the sync engine lands), set `_sync_status = 'pending'`, compute `_sync_hash`
2. On push: serialize row to JSON, encrypt with Vault Key, send blob to server
3. On pull: decrypt blob, compare `_sync_lww_ts` — **highest HLC stamp wins** (LWW); on an exact tie, the lexicographically-higher `_sync_device_id` wins (deterministic global tie-break, ADR-003 §6.1)
4. On resolve: set `_sync_status = 'synced'`

**Tables that are NOT synced** (device-local only): `sync_queue`, `fts_*` virtual tables, `app_state`.

---

## 4. Encryption Boundaries

### 4.1 Three-Layer Model

| Layer | What it protects | When active | Implementation |
|-------|-----------------|-------------|---------------|
| **L1 — SQLCipher** | Entire `.db` file on disk | At rest (device locked, app closed) | SQLCipher transparent encryption. Key derived from Vault Key |
| **L2 — Field-level** | Individual columns inside SQLite | At rest **and** in memory (fields stay encrypted until explicitly decrypted for display) | libsodium `crypto_secretbox` (XChaCha20-Poly1305). Ciphertext stored as base64 TEXT |
| **L3 — Sync blob** | Rows in transit and on server | In transit + server at rest | Full row → LZ4 compress → libsodium `crypto_secretbox` → base64 blob. Server stores only opaque blobs |

**Key insight:** L1 (SQLCipher) protects everything when the device is locked. L2 adds defense-in-depth for the most sensitive fields — even if SQLCipher is unlocked (app running), these fields remain encrypted in the SQLite file until the app explicitly decrypts them for rendering. L3 ensures the sync server is zero-knowledge.

### 4.2 Classification Rules

Every column falls into one of two categories:

| Classification | Marker | Properties | Rule |
|---------------|--------|-----------|------|
| **P — Plaintext** | (unmarked) | Queryable with `WHERE`/`ORDER BY`/`JOIN`. Indexed. Still encrypted at rest by SQLCipher (L1) and in sync blobs (L3) | Structural identifiers, foreign keys, enums/status values, timestamps, booleans, sort orders, numeric aggregates needed for queries, sync metadata |
| **E — Encrypted** | `-- [E]` | Opaque ciphertext in SQLite (random-nonce XChaCha20-Poly1305 → not comparable/sortable/aggregatable). **Cannot be queried, indexed, sorted, or aggregated with SQL.** Query features run **only in the app after decrypt**: aggregation via **decrypt-in-memory**; equality lookup via an **equality-only blind index** (a keyed-BLAKE2b PRF of the plaintext in a P side column); full-text via a **plaintext-fed standalone FTS5** (rebuilt on unlock). Never SQL over ciphertext. | All user-generated free text, PII, financial amounts, names, titles, descriptions, content, tags, URLs that reveal user activity |

**Numeric aggregates — P vs E by sensitivity (the encryption-vs-query rule, F7/D7).** A number needed for a chart is
**P only when it is non-sensitive** (streaks, word counts, progress, `interaction_count`, measured metric `value`,
`target_value`/`current_value` for progress charts — all correctly P above): these aggregate directly in SQL.
**Sensitive numbers stay E and aggregate via decrypt-in-memory, never SQL `SUM`.** This applies **across the entire
Finance domain** — `accounts` (current_balance, credit_limit, interest_rate), `transactions` (amount), `assets`
(purchase_price, current_value, depreciation_rate), `liabilities` (original_amount, current_balance, interest_rate,
monthly_payment), `investments` (quantity, purchase_price, current_price), `income_streams` (amount), `dreams`
(estimated_cost). Net-worth, portfolio-value, and income charts therefore load the relevant rows, decrypt in memory,
and aggregate in the `analytics` service — the DB never runs `SUM`/`GROUP BY` over these ciphertext columns.

**Always Plaintext (P):**
- `id` (primary key — needed for joins, lookups)
- `*_id` (all foreign keys — needed for joins)
- `created_at`, `updated_at`, `deleted_at` (needed for sort, sync, cleanup)
- `_sync_*` (all sync metadata — needed for sync protocol)
- `type`, `status`, `priority`, `difficulty`, `frequency` (enum-like — needed for filtering)
- `sort_order`, `is_active`, `is_favorite`, `is_archived`, `is_completed` (booleans/ordering)
- `progress`, `current_streak`, `longest_streak`, `total_completions` (numeric aggregates for dashboards)
- `*_date` (calendar dates — needed for scheduling queries: `due_date`, `journal_date`, `completed_date`, etc.)
- `day_of_week`, `start_time`, `end_time` (scheduling structure)
- `color`, `icon` (UI hints, not user content)
- `currency` (structural)

**Always Encrypted (E):**
- All `title` / `name` fields (user-generated names)
- All `description` / `content` / `vision` / `why` / `reflection` fields (free text)
- All `summary` / `key_learnings` / `key_concepts` fields (free text)
- All PII: `first_name`, `last_name`, `email`, `phone`, `nickname`
- All financial amounts: `amount`, `current_balance`, `purchase_price`, `current_value`, `monthly_payment`
- All `tags` fields (user-generated labels reveal interests)
- All user-generated URLs: `url`, `feed_url`, `playlist_url`, `song_url`, `inspiration_url`, `cover_url`
- All `metadata` / `custom_data` / `steps` / `resources` JSON fields (arbitrary user content)
- Vocabulary/flashcard content: `word`, `translation`, `front`, `back`, `hint`
- Blob fields: `encrypted_blob`, `thumbnail_blob`, `audio_blob`

### 4.3 Complete Field Classification by Table

Legend: **E** = field-level encrypted, **P** = plaintext (indexable). Unmarked = plaintext.

---

#### Notes & Pages Domain

**`pages`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `parent_id` | P | PK / FK |
| `type` | P | Filter: journal, note, task_note, etc. |
| `title` | **E** | User-generated |
| `content` | **E** | TipTap JSON document — core user content |
| `entity_type`, `entity_id` | P | Polymorphic FK for queries |
| `journal_date` | P | Calendar queries |
| `is_favorite`, `is_archived`, `has_pomodoro` | P | Booleans for filtering |
| `icon` | P | UI hint |
| `cover_image` | **E** | User-chosen image URL |
| `summary_config` | **E** | JSON config reveals which modules are active |
| `word_count` | P | Numeric aggregate |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`page_links`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `source_page_id`, `target_page_id` | P | PK / FKs |
| `context` | **E** | Text snippet from user content |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

**`entity_links`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `page_id` | P | PK / FK |
| `entity_type`, `entity_id` | P | Polymorphic FK |
| `context` | **E** | Text snippet from user content |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

**`tags`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `name` | **E** | User-generated label |
| `color` | P | UI hint |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`page_tags`** — All P (FKs + sync metadata only)

**`note_attachments`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `page_id` | P | PK / FK |
| `filename` | **E** | User-generated name |
| `mime_type` | P | Structural (needed for rendering) |
| `encrypted_blob` | **E** | File content |
| `thumbnail_blob` | **E** | Image content |
| `size_bytes` | P | Numeric |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

**`pomodoro_sessions`** — All P (structural/numeric only: timers, counts, status, FKs)

---

#### Tasks Domain

**`tasks`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `project_id`, `milestone_id`, `course_id`, `contact_id`, `parent_task_id` | P | PK / FKs |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `status`, `priority`, `difficulty` | P | Enum filters |
| `due_date` | P | Scheduling queries |
| `estimated_minutes`, `actual_minutes` | P | Numeric aggregates |
| `tags` | **E** | User-generated labels |
| `sort_order` | P | Ordering |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`task_time_logs`** — All P (FKs, timestamps, duration — structural)

---

#### Projects Domain

**`projects`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `title` | **E** | User-generated |
| `description`, `vision` | **E** | Free text |
| `scope`, `complexity`, `status`, `priority` | P | Enum filters |
| `progress` | P | Numeric aggregate |
| `start_date`, `target_end_date`, `actual_end_date` | P | Scheduling |
| `estimated_hours`, `actual_hours` | P | Numeric |
| `tags` | **E** | User-generated labels |
| `color`, `icon` | P | UI hints |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`milestones`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `project_id`, `parent_milestone_id` | P | PK / FKs |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `status` | P | Enum filter |
| `progress`, `sort_order` | P | Numeric |
| `due_date` | P | Scheduling |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`project_documents`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `project_id`, `milestone_id` | P | PK / FKs |
| `name` | **E** | User-generated filename |
| `file_type` | P | Structural |
| `file_size` | P | Numeric |
| `encrypted_blob` | **E** | File content |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

---

#### Habits Domain

**`habits`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `name` | **E** | User-generated |
| `description` | **E** | Free text |
| `habit_type`, `frequency`, `time_of_day` | P | Enum filters |
| `days_of_week` | P | Scheduling structure |
| `target_count` | P | Numeric |
| `unit` | **E** | User-defined measurement (e.g., "glasses of water") |
| `times_of_day` | P | Scheduling structure |
| `cue` | **E** | Personal behavioral trigger |
| `reward` | **E** | Personal reward description |
| `domain` | P | Enum filter |
| `tags` | **E** | User-generated labels |
| `current_streak`, `longest_streak`, `total_completions` | P | Numeric aggregates |
| `is_active`, `sort_order` | P | Structural |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`habit_completions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `habit_id` | P | PK / FK |
| `completed_date` | P | Calendar queries |
| `count` | P | Numeric |
| `value` | P | Measured value (needed for charts) |
| `mood_before`, `mood_after`, `ease_rating`, `satisfaction` | P | Numeric ratings (1-5 scale, not free text) |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

---

#### Routines Domain

**`routine_actions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `action_type`, `time_of_day`, `recurrence_frequency` | P | Enum filters |
| `duration_minutes`, `sort_order` | P | Numeric |
| `is_active` | P | Boolean |
| `linked_habit_id`, `linked_task_id` | P | FKs |
| `recurrence_days` | P | Scheduling structure |
| `skip_dates` | P | Scheduling structure |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`routine_completions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `routine_action_id` | P | PK / FK |
| `completed_date`, `completed_at` | P | Calendar / timestamp |
| `skipped` | P | Boolean |
| `skip_reason` | **E** | Free text |
| `actual_duration_minutes` | P | Numeric |
| `_sync_*` | P | Sync protocol |

---

#### Purpose & Goals Domain

**`purposes`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `title` | **E** | User-generated |
| `description`, `vision`, `why` | **E** | Free text — deeply personal |
| `domain`, `status` | P | Enum filters |
| `progress` | P | Numeric |
| `start_date`, `target_date` | P | Scheduling |
| `is_primary`, `sort_order` | P | Structural |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`targets`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `purpose_id` | P | PK / FK |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `target_type`, `status`, `priority` | P | Enum filters |
| `target_value`, `current_value` | P | Numeric (needed for progress charts) |
| `unit` | **E** | User-defined measurement |
| `start_date`, `target_date`, `next_review_date` | P | Scheduling |
| `review_frequency` | P | Enum |
| `sort_order` | P | Structural |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`purpose_metrics`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `purpose_id` | P | PK / FK |
| `name` | **E** | User-generated |
| `description` | **E** | Free text |
| `unit` | **E** | User-defined measurement |
| `target_value`, `current_value` | P | Numeric |
| `calculation_method` | P | Enum |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`purpose_metric_values`** — All P (FK, numeric value, timestamp — structural)

**`target_reviews`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `target_id` | P | PK / FK |
| `progress_rating` | P | Numeric scale |
| `reflection` | **E** | Free text — personal reflection |
| `next_actions` | **E** | Free text — action items |
| `reviewed_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

**`dreams`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `purpose_id` | P | PK / FK |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `domain` | P | Enum filter |
| `target_age` | P | Numeric |
| `estimated_cost` | **E** | Financial amount |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**Junction tables** (`purpose_habits`, `purpose_routines`, `purpose_projects`, `project_habits`) — All P (FKs + sync metadata only)

---

#### Financial Domain

**`accounts`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `name` | **E** | Account name (e.g., "Chase Checking") |
| `account_type` | P | Enum filter |
| `institution` | **E** | Bank/institution name |
| `currency` | P | Structural |
| `current_balance` | **E** | Financial amount |
| `credit_limit` | **E** | Financial amount |
| `interest_rate` | **E** | Financial detail |
| `is_active` | P | Boolean |
| `color`, `icon` | P | UI hints |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`transactions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `account_id`, `transfer_to_account_id` | P | PK / FKs |
| `transaction_type` | P | Enum filter |
| `amount` | **E** | Financial amount |
| `currency` | P | Structural |
| `category` | **E** | User-defined spending category |
| `subcategory` | **E** | User-defined |
| `description` | **E** | Free text |
| `date` | P | Calendar queries |
| `is_recurring` | P | Boolean |
| `recurring_frequency` | P | Enum |
| `tags` | **E** | User-generated labels |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`assets`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `name` | **E** | User-generated |
| `asset_type` | P | Enum filter |
| `purchase_date` | P | Date |
| `purchase_price`, `current_value` | **E** | Financial amounts |
| `depreciation_rate` | **E** | Financial detail |
| `location` | **E** | Physical location |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`liabilities`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `name` | **E** | User-generated |
| `liability_type` | P | Enum filter |
| `original_amount`, `current_balance`, `monthly_payment` | **E** | Financial amounts |
| `interest_rate` | **E** | Financial detail |
| `due_date` | P | Scheduling |
| `lender` | **E** | Institution name |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`investments`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `account_id` | P | PK / FK |
| `name` | **E** | User-generated |
| `investment_type` | P | Enum filter |
| `ticker_symbol` | **E** | Reveals portfolio holdings |
| `quantity` | **E** | Financial detail |
| `purchase_price`, `current_price` | **E** | Financial amounts |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`income_streams`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `name` | **E** | User-generated |
| `income_type`, `work_type` | P | Enum filters |
| `amount` | **E** | Financial amount |
| `frequency` | P | Enum |
| `is_active` | P | Boolean |
| `employer` | **E** | Employer name — PII |
| `start_date`, `end_date` | P | Dates |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

---

#### Relationships / CRM Domain

**`contacts`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `first_name`, `last_name`, `nickname` | **E** | PII |
| `relationship_type` | P | Enum filter |
| `email`, `phone` | **E** | PII |
| `avatar_url` | **E** | URL reveals identity |
| `company`, `job_title`, `location` | **E** | PII |
| `birthday` | **E** | PII |
| `tags` | **E** | User-generated labels |
| `social_links` | **E** | PII — social media handles |
| `stay_in_touch_frequency` | P | Enum |
| `stay_in_touch_days` | P | Numeric |
| `last_interaction_date`, `next_contact_date` | P | Scheduling |
| `interaction_count` | P | Numeric aggregate |
| `is_favorite` | P | Boolean |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`contact_events`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `contact_id` | P | PK / FK |
| `event_type` | P | Enum filter |
| `event_date` | P | Calendar queries |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `is_recurring` | P | Boolean |
| `reminder_days` | P | Scheduling structure |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`interactions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `contact_id` | P | PK / FK |
| `interaction_type` | P | Enum filter |
| `date` | P | Calendar queries |
| `duration_minutes` | P | Numeric |
| `summary` | **E** | Conversation content |
| `sentiment` | P | Enum |
| `follow_up_needed` | P | Boolean |
| `follow_up_date` | P | Scheduling |
| `follow_up_notes` | **E** | Free text |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`contact_reminders`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `contact_id`, `reminder_group_id` | P | PK / FKs |
| `title` | **E** | User-generated |
| `reminder_date` | P | Scheduling |
| `is_recurring`, `is_completed` | P | Booleans |
| `frequency` | P | Enum |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`reminder_groups`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `name` | **E** | User-generated |
| `message_template` | **E** | User-generated message content |
| `time_of_day` | P | Scheduling |
| `frequency` | P | Enum |
| `days_of_week` | P | Scheduling structure |
| `is_active` | P | Boolean |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`reminder_group_contacts`** — All P (FKs + sync metadata only)

---

#### Learning Domain

**`courses`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `provider`, `instructor` | **E** | Reveals learning activity |
| `url` | **E** | URL reveals activity |
| `course_type`, `status` | P | Enum filters |
| `progress`, `total_modules`, `completed_modules` | P | Numeric aggregates |
| `start_date`, `end_date`, `target_completion` | P | Scheduling |
| `estimated_hours` | P | Numeric |
| `rating` | P | Numeric scale |
| `tags` | **E** | User-generated labels |
| `metadata` | **E** | JSON with arbitrary user content |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`books`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `title`, `author` | **E** | Reveals reading habits |
| `isbn` | **E** | Identifies specific books |
| `format`, `status` | P | Enum filters |
| `total_pages`, `current_page`, `progress` | P | Numeric |
| `start_date`, `end_date` | P | Dates |
| `rating` | P | Numeric scale |
| `review` | **E** | Free text — personal opinion |
| `cover_url` | **E** | URL |
| `genre` | **E** | Reveals reading preferences |
| `tags` | **E** | User-generated labels |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`book_chapters`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `book_id` | P | PK / FK |
| `title` | **E** | Chapter name |
| `chapter_number`, `start_page`, `end_page` | P | Numeric |
| `estimated_reading_minutes`, `actual_reading_minutes` | P | Numeric |
| `is_completed` | P | Boolean |
| `completed_at` | P | Timestamp |
| `sort_order` | P | Structural |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`skills`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `parent_skill_id` | P | PK / FK |
| `name` | **E** | User-generated |
| `description` | **E** | Free text |
| `mastery_level` | P | Enum filter |
| `practice_hours`, `proficiency_test_score` | P | Numeric |
| `last_practiced` | P | Timestamp |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`skill_resources`** — All P (FKs + polymorphic refs + sync metadata)

**`study_sessions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `resource_type`, `resource_id` | P | Polymorphic FK |
| `duration_minutes`, `focus_rating`, `energy_level`, `distraction_count` | P | Numeric |
| `pages_read`, `lessons_completed` | P | Numeric |
| `key_learnings` | **E** | Free text — personal notes |
| `started_at`, `ended_at` | P | Timestamps |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

**`study_topics`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `course_id`, `linked_book_id`, `reading_chapter_id` | P | PK / FKs |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `status`, `difficulty` | P | Enum filters |
| `mastery_level`, `study_time_minutes`, `estimated_study_minutes` | P | Numeric |
| `due_date`, `class_date`, `next_review_date` | P | Scheduling |
| `is_exam_topic` | P | Boolean |
| `key_concepts` | **E** | User-generated content |
| `resource_urls` | **E** | URLs reveal activity |
| `sort_order` | P | Structural |
| `easiness_factor`, `repetition_number`, `interval_days` | P | SM-2 algorithm state |
| `last_reviewed_at` | P | Timestamp |
| `reading_start_page`, `reading_end_page` | P | Numeric |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`topic_reviews`** — All P (FK, quality score, response time, timestamp — structural)

**`flashcard_decks`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `resource_type`, `resource_id` | P | Polymorphic FK |
| `new_cards_per_day`, `reviews_per_day` | P | Settings |
| `is_active` | P | Boolean |
| `total_cards`, `mastered_cards` | P | Numeric aggregates |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`flashcards`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `deck_id` | P | PK / FK |
| `front` | **E** | User-generated content |
| `back` | **E** | User-generated content |
| `hint` | **E** | User-generated content |
| `explanation` | **E** | User-generated content |
| `easiness_factor`, `repetitions`, `interval_days` | P | SM-2 state |
| `next_review_date` | P | Scheduling |
| `last_reviewed_at` | P | Timestamp |
| `times_reviewed`, `times_correct` | P | Numeric |
| `is_mastered`, `is_suspended` | P | Booleans |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`flashcard_reviews`** — All P (FK, quality score, response time, interval snapshots — structural)

**`knowledge_notes`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `parent_note_id` | P | PK / FK |
| `resource_type`, `resource_id` | P | Polymorphic FK |
| `title` | **E** | User-generated |
| `content` | **E** | Free text — study content |
| `topic`, `subtopic` | **E** | User-generated categorization |
| `tags` | **E** | User-generated labels |
| `is_pinned`, `is_archived` | P | Booleans |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

---

#### Study Planner Domain

**`study_availability`** — All P (scheduling structure: day_of_week, times, preference scores)

**`availability_exceptions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `exception_date` | P | Date |
| `is_available` | P | Boolean |
| `reason` | **E** | Free text — why unavailable |
| `start_time`, `end_time` | P | Scheduling |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

**`study_plan_batches`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `course_id` | P | PK / FK |
| `name` | **E** | User-generated |
| `status` | P | Enum filter |
| `total_sessions` | P | Numeric |
| `generated_at`, `approved_at` | P | Timestamps |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`scheduled_study_sessions`** — All P (FKs, resource refs, status, dates, duration, urgency — structural)

**`session_templates`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `name` | **E** | User-generated |
| All timing fields | P | Settings/numeric |
| `is_default` | P | Boolean |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

---

#### Language Learning Domain

**`languages`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `language_name`, `language_code`, `flag_emoji` | P | Standard language identifiers — not user-generated |
| All proficiency levels | P | Enum values |
| `status` | P | Enum filter |
| `start_date` | P | Date |
| All goal/streak/count fields | P | Numeric aggregates |
| `current_day_number`, `learning_phase` | P | Progress state |
| `phase_started_at` | P | Timestamp |
| `resources` | **E** | JSON with user-curated links |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`language_practice_sessions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `language_id` | P | PK / FK |
| `skill_type`, `activity_type` | P | Enum filters |
| `duration_minutes`, `new_words_learned`, `accuracy_percentage` | P | Numeric |
| `focus_rating`, `energy_level` | P | Numeric scales |
| `content` | **E** | Free text — practice content |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

**`language_vocabulary`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `language_id` | P | PK / FK |
| `word` | **E** | User content |
| `translation` | **E** | User content |
| `pronunciation` | **E** | User content |
| `part_of_speech` | P | Structural category |
| `example_sentence` | **E** | User-generated |
| `meaning_in_target_language` | **E** | User content |
| `source_activity` | **E** | Reveals learning context |
| `mastery` | P | Enum filter |
| `review_count` | P | Numeric |
| `next_review_date` | P | Scheduling |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`language_daily_sessions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `language_id`, `weekly_plan_id` | P | PK / FKs |
| `session_date` | P | Calendar queries |
| `day_number` | P | Numeric |
| `weekly_topic` | P | Enum |
| All completion flags (`grammar_video` through `vocabulary_journal`) | P | Booleans |
| `grammar_video_url`, `vocabulary_video_url`, `conversation_video_url` | **E** | URLs reveal activity |
| `song_day_number` | P | Numeric |
| `bible_recording_id`, `song_recording_id` | P | FKs |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`language_daily_progress`** — All P (FK, date, per-skill minutes, aggregates — structural)

**`language_recordings`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `language_id`, `compare_with_id`, `weekly_plan_id` | P | PK / FKs |
| `recording_type` | P | Enum filter |
| `title` | **E** | User-generated |
| `audio_blob` | **E** | Audio content |
| `duration_seconds` | P | Numeric |
| `transcript` | **E** | User-generated text |
| `metadata` | **E** | JSON with user content |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

**`language_weekly_plans`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `language_id` | P | PK / FK |
| `week_start_date` | P | Calendar queries |
| `week_number` | P | Numeric |
| `is_planned` | P | Boolean |
| `topic` | P | Enum |
| `song_title`, `song_artist`, `song_url`, `song_lyrics` | **E** | User-curated music content |
| `current_song_day` | P | Numeric |
| `bible_book` | **E** | Religious content selection |
| `bible_chapter`, `bible_verses_start`, `bible_verses_end` | P | Numeric references |
| `planned_videos` | **E** | JSON with user-curated URLs |
| `videos_watched`, `days_completed` | P | Numeric aggregates |
| `weekly_reflection` | **E** | Free text — personal reflection |
| `highlight_moments` | **E** | Free text list |
| `challenges_faced` | **E** | Free text list |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`language_base_words`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `language_id`, `linked_vocabulary_id` | P | PK / FKs |
| `category` | P | Enum filter |
| `english_word` | **E** | Vocabulary content |
| `translation` | **E** | User content |
| `meaning_in_target_language` | **E** | User content |
| `pronunciation` | **E** | User content |
| `is_learned` | P | Boolean |
| `learned_at` | P | Timestamp |
| `display_order` | P | Structural |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

**`language_video_playlists`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `language_id` | P | PK / FK |
| `playlist_url` | **E** | URL reveals activity |
| `title` | **E** | User-generated / video title |
| `total_videos`, `watched_count`, `current_video_index` | P | Numeric |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

---

#### Check-ins Domain

**`daily_check_ins`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `template_id` | P | PK / FK |
| `check_in_date` | P | Calendar queries |
| `check_in_type` | P | Enum filter |
| `mood_score`, `energy_level` | P | Numeric scales (needed for trend charts) |
| `top_intentions` | **E** | User-generated list |
| `wins` | **E** | User-generated list |
| `gratitude` | **E** | User-generated list — deeply personal |
| `challenges` | **E** | User-generated list |
| `tomorrow_focus` | **E** | User-generated list |
| `reflection` | **E** | Free text — deeply personal |
| `custom_data` | **E** | JSON from template questions |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`check_in_templates`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `name` | **E** | User-generated |
| `description` | **E** | Free text |
| `icon` | P | UI hint |
| `is_default`, `is_active` | P | Booleans |
| `schedule_type` | P | Enum |
| `schedule_days` | P | Scheduling structure |
| `preferred_time` | P | Enum |
| `sort_order` | P | Structural |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`check_in_template_questions`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `template_id` | P | PK / FK |
| `field_key` | P | Structural identifier |
| `label` | **E** | User-generated question text |
| `field_type` | P | Enum |
| `placeholder` | **E** | User-generated hint text |
| `is_required` | P | Boolean |
| `min_value`, `max_value` | P | Numeric constraints |
| `sort_order` | P | Structural |
| `_sync_*` | P | Sync protocol |

---

#### Bucket List Domain

**`bucket_list_items`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `purpose_id`, `project_id` | P | PK / FKs |
| `title` | **E** | User-generated |
| `description` | **E** | Free text |
| `category`, `status`, `priority` | P | Enum filters |
| `target_date`, `completed_date` | P | Dates |
| `estimated_cost` | **E** | Financial amount |
| `location` | **E** | Physical location |
| `image_url`, `cover_image_url` | **E** | URLs |
| `tags` | **E** | User-generated labels |
| `progress_percentage` | P | Numeric |
| `steps` | **E** | JSON with user-generated content |
| `inspiration_url` | **E** | URL reveals interests |
| `created_at`, `updated_at`, `deleted_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

---

#### Gamification Domain

**`user_profile`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `persona`, `life_stage` | P | Enum values |
| `focus_areas` | **E** | User-generated life priorities |
| `motivation_style` | P | Enum |
| `display_name` | **E** | User-generated — PII |
| `avatar_url` | **E** | URL to user photo |
| `birth_date` | **E** | PII |
| `timezone` | P | Structural |
| `total_xp`, `current_level` | P | Numeric |
| `check_in_streak`, `longest_check_in_streak` | P | Numeric |
| `last_check_in_date` | P | Date |
| `onboarding_completed` | P | Boolean |
| `skipped_modules`, `active_modules` | P | App config (module keys, not user text) |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`achievements`** — All P (app-defined static content, not user-generated)

**`user_achievements`** — All P (FK, timestamp, progress JSON is just numeric counters)

**`xp_history`** — All P (action type, amounts, timestamps — structural)

---

#### Notifications Domain

**`notifications`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `type` | P | Enum filter |
| `title` | **E** | May contain entity names |
| `message` | **E** | May contain user content |
| `action_url` | P | Internal navigation route |
| `action_label` | **E** | May contain entity names |
| `entity_type`, `entity_id` | P | Polymorphic FK |
| `is_read`, `is_archived` | P | Booleans |
| `read_at`, `archived_at`, `expires_at` | P | Timestamps |
| `created_at` | P | Timestamp |
| `_sync_*` | P | Sync protocol |

---

#### Preferences & Navigation Domain

**`user_preferences`** — All P (settings values: theme, locale, pomodoro config, notification toggles — structural configuration, not user content)

**`nav_preferences`** — All P (dock position, size, nav items — structural UI config)

**`command_bar_history`** — All P (command keys, labels, counts — structural)

---

#### ICS Calendar Sync Domain

**`ics_feed_configs`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id` | P | PK |
| `feed_url` | **E** | URL reveals institutional affiliations |
| `feed_name` | **E** | User-generated |
| `is_active` | P | Boolean |
| `auto_create_sessions` | P | Boolean |
| `default_course_id` | P | FK |
| `sync_interval_hours` | P | Setting |
| `last_synced_at` | P | Timestamp |
| `last_error` | **E** | May contain URL fragments |
| `metadata` | **E** | JSON with feed details |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

**`ics_synced_events`**

| Field | P/E | Rationale |
|-------|-----|-----------|
| `id`, `feed_id`, `matched_course_id` | P | PK / FKs |
| `uid` | P | ICS standard identifier |
| `summary` | **E** | Event title — reveals schedule |
| `description` | **E** | Free text |
| `location` | **E** | Physical location |
| `start_time`, `end_time` | P | Scheduling queries |
| `recurrence_rule` | P | RRULE standard format |
| `created_session_id` | P | FK |
| `is_ignored` | P | Boolean |
| `raw_event` | **E** | Full ICS event data |
| `created_at`, `updated_at` | P | Timestamps |
| `_sync_*` | P | Sync protocol |

---

### 4.4 Encryption Statistics Summary

| Metric | Count |
|--------|-------|
| **Total fields across all tables** | ~520 |
| **Plaintext (P) fields** | ~370 (71%) |
| **Encrypted (E) fields** | ~150 (29%) |
| **Tables with zero E fields** | ~20 (all-structural: pomodoro_sessions, junction tables, time logs, reviews, availability, preferences, achievements, xp_history, etc.) |
| **Tables where majority of fields are E** | contacts, flashcards, language_vocabulary, daily_check_ins, bucket_list_items |

### 4.5 Sync Blob Encryption (L3)

When a row is pushed to the sync server, the **entire row** (both P and E fields) is encrypted as a single opaque blob. The server never sees any plaintext — not even the P fields.

#### Blob Format

```
┌──────────────────────────────────────────────────────────┐
│                    SYNC BLOB STRUCTURE                     │
├──────────┬───────────────────────────────────────────────┤
│ Header   │ Plaintext envelope (server can read)          │
│ (JSON)   │ {                                             │
│          │   "table": "tasks",                           │
│          │   "row_id": "01924f...",                      │
│          │   "sync_version": 3,                          │
│          │   "sync_lww_ts": 1741856400000,               │
│          │   "sync_device_id": "device_abc123",          │
│          │   "operation": "update"                       │
│          │ }                                             │
├──────────┼───────────────────────────────────────────────┤
│ Payload  │ Encrypted (server CANNOT read)                │
│ (binary) │                                               │
│          │ nonce (24 bytes)                               │
│          │ ║                                              │
│          │ ciphertext = XChaCha20-Poly1305(               │
│          │   key   = Vault Key,                          │
│          │   nonce = random 24 bytes,                    │
│          │   data  = LZ4( JSON.stringify(row) )          │
│          │ )                                             │
│          │                                               │
│          │ → base64-encoded for transport                │
└──────────┴───────────────────────────────────────────────┘
```

#### What the Server Knows (by Design)

| Server can see | Server cannot see |
|---------------|-------------------|
| Table name | Any column values (title, description, amount, etc.) |
| Row ID (UUIDv7) | What the row contains |
| Sync version number | Whether a field is P or E — entire row is one blob |
| LWW timestamp | Tags, categories, names, amounts, content |
| Device ID | Relationships between entities (FKs are inside the blob) |
| Operation type (create/update/delete) | |
| Blob size | |

#### Sync Flow

```
PUSH (client → server):
1. Client modifies row
2. Set _sync_version++, _sync_lww_ts = hlc.now() (HLC stamp; interim code stamps Date.now() — ADR-003 §6.1), _sync_status = 'pending'
3. For E fields: they are already encrypted in SQLite — decrypt first
4. Serialize full row to JSON (all fields, plaintext values)
5. Compress with LZ4
6. Encrypt with Vault Key (XChaCha20-Poly1305, random nonce)
7. Compute _sync_hash = SHA-256 of the pre-encryption JSON
8. Send header + encrypted payload to server
9. Server stores blob in R2, indexed by (table, row_id, sync_version)
10. On ACK: set _sync_status = 'synced'

PULL (server → client):
1. Client requests changes since last_sync_timestamp
2. Server returns list of (header + blob) pairs
3. Client decrypts each blob with Vault Key
4. Decompress LZ4
5. Parse JSON → row data
6. Compare _sync_lww_ts: highest timestamp wins (LWW)
7. For E fields: re-encrypt with libsodium before writing to local SQLite
8. Write to local SQLite
9. Set _sync_status = 'synced'

DELETE:
1. Client sets deleted_at = Date.now() (soft delete)
2. Synced as a normal update — server stores the deletion marker blob
3. Periodic cleanup: server garbage-collects blobs where operation = 'delete' after 30 days
```

---

## 5. Complete Schema

### 5.0 App State (Device-Local, Not Synced)

```sql
CREATE TABLE app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Stores: last_sync_at, device_id, schema_version, vault_key_check, etc.
```

### 5.1 Sync Queue (Device-Local, Not Synced)

```sql
CREATE TABLE sync_queue (
  id            TEXT PRIMARY KEY,
  table_name    TEXT NOT NULL,
  row_id        TEXT NOT NULL,
  operation     TEXT NOT NULL CHECK (operation IN ('create','update','delete')),
  payload       TEXT,           -- JSON snapshot of the row at time of change
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_flight','failed')),
  retry_count   INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at    INTEGER NOT NULL,
  UNIQUE(table_name, row_id, operation)
);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
```

---

### 5.2 Notes & Pages (Integration Layer)

Notes are the **unifying interface** across all modules. A single `pages` table with a `type` discriminator handles journals, notes, task notes, class notes, milestone notes, and deliverable notes.

```sql
CREATE TABLE pages (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL DEFAULT 'note'
                 CHECK (type IN (
                   'journal','note','task_note','task_group_note',
                   'milestone_note','deliverable_note'
                 )),
  title          TEXT,                    -- [E]
  content        TEXT,                    -- [E] TipTap JSON document
  parent_id      TEXT REFERENCES pages(id) ON DELETE SET NULL,
  entity_type    TEXT,                    -- What this note is linked to
  entity_id      TEXT,                    -- ID of the linked entity
  journal_date   TEXT,                    -- YYYY-MM-DD (for type='journal')
  is_favorite    INTEGER NOT NULL DEFAULT 0,
  is_archived    INTEGER NOT NULL DEFAULT 0,
  icon           TEXT,
  cover_image    TEXT,                    -- [E]
  summary_config TEXT,                    -- [E] JSON: which summary sections to show (journals)
  has_pomodoro   INTEGER NOT NULL DEFAULT 0,
  word_count     INTEGER NOT NULL DEFAULT 0,

  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  deleted_at     INTEGER,

  -- Sync metadata
  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_pages_type ON pages(type);
CREATE INDEX idx_pages_journal_date ON pages(journal_date);
CREATE INDEX idx_pages_entity ON pages(entity_type, entity_id);
CREATE INDEX idx_pages_deleted ON pages(deleted_at);
CREATE UNIQUE INDEX idx_pages_journal_unique ON pages(journal_date) WHERE type = 'journal' AND deleted_at IS NULL;
```

### Page Links (Wiki-Style Bidirectional Links)

```sql
CREATE TABLE page_links (
  id             TEXT PRIMARY KEY,
  source_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  target_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  context        TEXT,           -- [E] Surrounding text snippet for backlink preview

  created_at     INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(source_page_id, target_page_id)
);

CREATE INDEX idx_page_links_target ON page_links(target_page_id);
```

### Entity Links (Cross-Domain Backlinks)

```sql
CREATE TABLE entity_links (
  id          TEXT PRIMARY KEY,
  page_id     TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'task','task_time_log','project','milestone','contact','interaction',
    'habit','habit_completion','routine_action','course','book','book_chapter',
    'study_session','study_topic','scheduled_study_session','study_plan_batch',
    'flashcard_deck','skill','knowledge_note',
    'language','language_practice_session','language_recording',
    'purpose','target','purpose_metric_value',
    'account','transaction','asset','liability','investment','income_stream',
    'bucket_list_item','daily_check_in','achievement'
  )),
  entity_id   TEXT NOT NULL,
  context     TEXT,              -- [E] Surrounding text for preview

  created_at  INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(page_id, entity_type, entity_id)
);

CREATE INDEX idx_entity_links_entity ON entity_links(entity_type, entity_id);
```

### Note Tags

```sql
CREATE TABLE tags (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,    -- [E]
  color TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE TABLE page_tags (
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  PRIMARY KEY (page_id, tag_id)
);
```

### Note Attachments

```sql
CREATE TABLE note_attachments (
  id             TEXT PRIMARY KEY,
  page_id        TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  filename       TEXT NOT NULL,         -- [E]
  mime_type      TEXT NOT NULL,
  encrypted_blob BLOB NOT NULL,       -- [E] File content
  thumbnail_blob BLOB,                -- [E] Thumbnail for gallery
  size_bytes     INTEGER NOT NULL,

  created_at     INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_attachments_page ON note_attachments(page_id);
```

### Pomodoro Sessions

```sql
CREATE TABLE pomodoro_sessions (
  id                TEXT PRIMARY KEY,
  page_id           TEXT REFERENCES pages(id) ON DELETE SET NULL,
  entity_type       TEXT CHECK (entity_type IN ('task','task_group','class_note','note','study_session')),
  entity_id         TEXT,
  started_at        INTEGER NOT NULL,
  ended_at          INTEGER,
  duration_seconds  INTEGER,
  type              TEXT NOT NULL CHECK (type IN ('focus','short_break','long_break')),
  status            TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','paused','completed','cancelled')),
  completed_count   INTEGER NOT NULL DEFAULT 0,

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_pomodoro_page ON pomodoro_sessions(page_id);
CREATE INDEX idx_pomodoro_entity ON pomodoro_sessions(entity_type, entity_id);
```

---

### 5.3 Tasks Domain

```sql
CREATE TABLE tasks (
  id                TEXT PRIMARY KEY,
  project_id        TEXT REFERENCES projects(id) ON DELETE SET NULL,
  milestone_id      TEXT REFERENCES milestones(id) ON DELETE SET NULL,
  course_id         TEXT REFERENCES courses(id) ON DELETE SET NULL,
  contact_id        TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  parent_task_id    TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,       -- [E]
  description       TEXT,               -- [E]
  status            TEXT NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started','in_progress','completed','on_hold','cancelled')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical','high','medium','low','none')),
  difficulty        TEXT DEFAULT 'medium'
                    CHECK (difficulty IN ('trivial','easy','medium','hard','expert')),
  due_date          TEXT,              -- YYYY-MM-DD
  estimated_minutes INTEGER,
  actual_minutes    INTEGER,
  tags              TEXT,              -- [E] JSON array
  sort_order        INTEGER NOT NULL DEFAULT 0,

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  deleted_at        INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_milestone ON tasks(milestone_id);
CREATE INDEX idx_tasks_course ON tasks(course_id);
CREATE INDEX idx_tasks_contact ON tasks(contact_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE deleted_at IS NULL;
```

### Task Time Logs

```sql
CREATE TABLE task_time_logs (
  id               TEXT PRIMARY KEY,
  task_id          TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  start_time       INTEGER NOT NULL,
  end_time         INTEGER,
  duration_minutes INTEGER,

  created_at       INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_time_logs_task ON task_time_logs(task_id);
```

---

### 5.4 Projects Domain

```sql
CREATE TABLE projects (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,        -- [E]
  description      TEXT,                -- [E]
  vision           TEXT,                -- [E]
  scope            TEXT DEFAULT 'personal'
                   CHECK (scope IN ('personal','professional','academic','community')),
  complexity       TEXT DEFAULT 'moderate'
                   CHECK (complexity IN ('simple','moderate','complex','enterprise')),
  status           TEXT NOT NULL DEFAULT 'not_started'
                   CHECK (status IN ('not_started','in_progress','completed','on_hold','cancelled')),
  priority         TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('critical','high','medium','low','none')),
  progress         INTEGER NOT NULL DEFAULT 0,   -- 0-100
  start_date       TEXT,
  target_end_date  TEXT,
  actual_end_date  TEXT,
  estimated_hours  INTEGER,          -- in minutes (despite name, stored as minutes for precision)
  actual_hours     INTEGER,
  tags             TEXT,             -- [E] JSON array
  color            TEXT,
  icon             TEXT,

  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  deleted_at       INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
```

### Milestones

```sql
CREATE TABLE milestones (
  id                    TEXT PRIMARY KEY,
  project_id            TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_milestone_id   TEXT REFERENCES milestones(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,    -- [E]
  description           TEXT,            -- [E]
  status                TEXT NOT NULL DEFAULT 'not_started'
                        CHECK (status IN ('not_started','in_progress','completed','on_hold','cancelled')),
  progress              INTEGER NOT NULL DEFAULT 0,
  due_date              TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,

  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  deleted_at            INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_milestones_project ON milestones(project_id);
```

### Project Documents

```sql
CREATE TABLE project_documents (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id  TEXT REFERENCES milestones(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,          -- [E]
  file_type     TEXT,
  file_size     INTEGER,
  encrypted_blob BLOB,               -- [E] file content stored locally

  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

---

### 5.5 Habits Domain

```sql
CREATE TABLE habits (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,       -- [E]
  description       TEXT,               -- [E]
  habit_type        TEXT NOT NULL DEFAULT 'build'
                    CHECK (habit_type IN ('build','break')),
  frequency         TEXT NOT NULL DEFAULT 'daily'
                    CHECK (frequency IN ('daily','weekly','biweekly','monthly','custom')),
  days_of_week      TEXT,             -- JSON array [0-6], 0=Sun
  target_count      INTEGER NOT NULL DEFAULT 1,
  unit              TEXT,                -- [E]
  time_of_day       TEXT DEFAULT 'anytime'
                    CHECK (time_of_day IN ('morning','afternoon','evening','anytime','whole_day')),
  times_of_day      TEXT,             -- JSON array for multiple times
  cue               TEXT,               -- [E]
  reward            TEXT,               -- [E]
  domain            TEXT CHECK (domain IN (
                      'health','career','finance','relationships',
                      'personal_growth','spiritual','recreation','environment'
                    )),
  tags              TEXT,             -- [E] JSON array
  current_streak    INTEGER NOT NULL DEFAULT 0,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  deleted_at        INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_habits_active ON habits(is_active) WHERE deleted_at IS NULL;
```

### Habit Completions

```sql
CREATE TABLE habit_completions (
  id               TEXT PRIMARY KEY,
  habit_id         TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_date   TEXT NOT NULL,      -- YYYY-MM-DD
  count            INTEGER NOT NULL DEFAULT 1,
  value            REAL,               -- measured value (e.g., miles run)
  mood_before      INTEGER CHECK (mood_before BETWEEN 1 AND 5),
  mood_after       INTEGER CHECK (mood_after BETWEEN 1 AND 5),
  ease_rating      INTEGER CHECK (ease_rating BETWEEN 1 AND 5),
  satisfaction     INTEGER CHECK (satisfaction BETWEEN 1 AND 5),

  created_at       INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(habit_id, completed_date)
);

CREATE INDEX idx_habit_comp_date ON habit_completions(completed_date);
```

---

### 5.6 Routines Domain

```sql
CREATE TABLE routine_actions (
  id                    TEXT PRIMARY KEY,
  title                 TEXT NOT NULL,    -- [E]
  description           TEXT,            -- [E]
  action_type           TEXT NOT NULL DEFAULT 'task'
                        CHECK (action_type IN ('habit','task','focus')),
  time_of_day           TEXT NOT NULL DEFAULT 'morning'
                        CHECK (time_of_day IN ('morning','afternoon','evening')),
  duration_minutes      INTEGER,
  is_active             INTEGER NOT NULL DEFAULT 1,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  linked_habit_id       TEXT REFERENCES habits(id) ON DELETE SET NULL,
  linked_task_id        TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  recurrence_frequency  TEXT NOT NULL DEFAULT 'daily'
                        CHECK (recurrence_frequency IN ('daily','weekdays','weekends','custom')),
  recurrence_days       TEXT,          -- JSON array [0-6]
  skip_dates            TEXT,          -- JSON array of YYYY-MM-DD strings

  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  deleted_at            INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_routines_time ON routine_actions(time_of_day) WHERE deleted_at IS NULL;
```

### Routine Completions

```sql
CREATE TABLE routine_completions (
  id                     TEXT PRIMARY KEY,
  routine_action_id      TEXT NOT NULL REFERENCES routine_actions(id) ON DELETE CASCADE,
  completed_date         TEXT NOT NULL,     -- YYYY-MM-DD
  completed_at           INTEGER NOT NULL,
  skipped                INTEGER NOT NULL DEFAULT 0,
  skip_reason            TEXT,           -- [E]
  actual_duration_minutes INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(routine_action_id, completed_date)
);

CREATE INDEX idx_routine_comp_date ON routine_completions(completed_date);
```

---

### 5.7 Purpose & Goals Domain

```sql
CREATE TABLE purposes (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,            -- [E]
  description  TEXT,                    -- [E]
  vision       TEXT,                    -- [E]
  why          TEXT,                    -- [E]
  domain       TEXT CHECK (domain IN (
                 'health','career','finance','relationships',
                 'personal_growth','spiritual','recreation','environment'
               )),
  status       TEXT NOT NULL DEFAULT 'in_progress'
               CHECK (status IN ('not_started','in_progress','completed','on_hold','cancelled')),
  progress     INTEGER NOT NULL DEFAULT 0,   -- 0-100
  start_date   TEXT,
  target_date  TEXT,
  is_primary   INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,

  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Targets (Goals)

```sql
CREATE TABLE targets (
  id                TEXT PRIMARY KEY,
  purpose_id        TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,       -- [E]
  description       TEXT,               -- [E]
  target_type       TEXT NOT NULL DEFAULT 'quantitative'
                    CHECK (target_type IN ('quantitative','qualitative','milestone','habit_based')),
  target_value      REAL,
  current_value     REAL,
  unit              TEXT,                -- [E]
  status            TEXT NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started','in_progress','completed','on_hold','cancelled')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical','high','medium','low','none')),
  start_date        TEXT,
  target_date       TEXT,
  review_frequency  TEXT DEFAULT 'weekly'
                    CHECK (review_frequency IN ('daily','weekly','biweekly','monthly','quarterly','yearly')),
  next_review_date  TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  deleted_at        INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_targets_purpose ON targets(purpose_id);
```

### Purpose Metrics

```sql
CREATE TABLE purpose_metrics (
  id                   TEXT PRIMARY KEY,
  purpose_id           TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,    -- [E]
  description          TEXT,            -- [E]
  unit                 TEXT,            -- [E]
  target_value         REAL,
  current_value        REAL,
  calculation_method   TEXT NOT NULL DEFAULT 'latest'
                       CHECK (calculation_method IN ('sum','average','latest','max','min','count')),

  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Purpose Metric Values

```sql
CREATE TABLE purpose_metric_values (
  id          TEXT PRIMARY KEY,
  metric_id   TEXT NOT NULL REFERENCES purpose_metrics(id) ON DELETE CASCADE,
  value       REAL NOT NULL,
  recorded_at INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_metric_values_metric ON purpose_metric_values(metric_id);
```

### Target Reviews

```sql
CREATE TABLE target_reviews (
  id              TEXT PRIMARY KEY,
  target_id       TEXT NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
  progress_rating INTEGER CHECK (progress_rating BETWEEN 1 AND 10),
  reflection      TEXT,                  -- [E]
  next_actions    TEXT,                  -- [E]
  reviewed_at     INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Dreams

```sql
CREATE TABLE dreams (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,        -- [E]
  description     TEXT,                -- [E]
  domain          TEXT CHECK (domain IN (
                    'health','career','finance','relationships',
                    'personal_growth','spiritual','recreation','environment'
                  )),
  target_age      INTEGER,
  estimated_cost  INTEGER,           -- [E] in cents
  purpose_id      TEXT REFERENCES purposes(id) ON DELETE SET NULL,

  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Purpose Junction Tables

```sql
CREATE TABLE purpose_habits (
  purpose_id TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
  habit_id   TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  PRIMARY KEY (purpose_id, habit_id)
);

CREATE TABLE purpose_routines (
  purpose_id        TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
  routine_action_id TEXT NOT NULL REFERENCES routine_actions(id) ON DELETE CASCADE,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  PRIMARY KEY (purpose_id, routine_action_id)
);

CREATE TABLE purpose_projects (
  purpose_id TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  PRIMARY KEY (purpose_id, project_id)
);

CREATE TABLE project_habits (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  habit_id   TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  PRIMARY KEY (project_id, habit_id)
);
```

---

### 5.8 Financial Domain

```sql
CREATE TABLE accounts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,                  -- [E]
  account_type    TEXT NOT NULL
                  CHECK (account_type IN (
                    'checking','savings','credit_card','investment',
                    'cash','digital_wallet','other'
                  )),
  institution     TEXT,                           -- [E]
  currency        TEXT NOT NULL DEFAULT 'USD',
  current_balance INTEGER NOT NULL DEFAULT 0,     -- [E] in cents
  credit_limit    INTEGER,                        -- [E]
  interest_rate   INTEGER,                        -- [E] basis points (2.5% = 250)
  is_active       INTEGER NOT NULL DEFAULT 1,
  color           TEXT,
  icon            TEXT,

  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Transactions

```sql
CREATE TABLE transactions (
  id                    TEXT PRIMARY KEY,
  account_id            TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transfer_to_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  transaction_type      TEXT NOT NULL
                        CHECK (transaction_type IN ('income','expense','transfer')),
  amount                INTEGER NOT NULL,           -- [E] in cents
  currency              TEXT NOT NULL DEFAULT 'USD',
  category              TEXT,                       -- [E]
  subcategory           TEXT,                       -- [E]
  description           TEXT,                       -- [E]
  date                  TEXT NOT NULL,               -- YYYY-MM-DD
  is_recurring          INTEGER NOT NULL DEFAULT 0,
  recurring_frequency   TEXT CHECK (recurring_frequency IN (
                          'daily','weekly','biweekly','monthly','quarterly','yearly'
                        )),
  tags                  TEXT,                        -- [E] JSON array

  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  deleted_at            INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
-- NOTE (F7/D7): NO index on `category` — it is `-- [E]` (random-nonce ciphertext), so a B-tree over it
-- cannot serve equality/range/sort. Category-filter charts use an equality-only BLIND INDEX: a P side column
-- `category_bidx = base64(PRF_k(lower(trim(category))))` where `k` is a DOMAIN-SEPARATED subkey (keyed BLAKE2b
-- `crypto_generichash` + a personalization label, per ADR-001 §Key Model forward-flag — NOT the Vault Key reused).
-- Leak = category equality/frequency to a local-DB reader (never the server; L3 encrypts the whole row blob).
-- The `category_bidx` column + its keyed derivation are build-phase (owed-ledger).
```

### Assets

```sql
CREATE TABLE assets (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,       -- [E]
  asset_type        TEXT NOT NULL
                    CHECK (asset_type IN (
                      'real_estate','vehicle','electronics','jewelry','collectible','other'
                    )),
  purchase_date     TEXT,
  purchase_price    INTEGER,          -- [E] in cents
  current_value     INTEGER,          -- [E] in cents
  depreciation_rate INTEGER,          -- [E] basis points per year
  location          TEXT,              -- [E]

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  deleted_at        INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Liabilities

```sql
CREATE TABLE liabilities (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,        -- [E]
  liability_type   TEXT NOT NULL
                   CHECK (liability_type IN (
                     'mortgage','student_loan','auto_loan','credit_card',
                     'personal_loan','medical','other'
                   )),
  original_amount  INTEGER,           -- [E] in cents
  current_balance  INTEGER,           -- [E] in cents
  interest_rate    INTEGER,           -- [E] basis points
  monthly_payment  INTEGER,           -- [E] in cents
  due_date         TEXT,
  lender           TEXT,               -- [E]

  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  deleted_at       INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Investments

```sql
CREATE TABLE investments (
  id              TEXT PRIMARY KEY,
  account_id      TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,        -- [E]
  investment_type TEXT NOT NULL
                  CHECK (investment_type IN (
                    'stock','bond','mutual_fund','etf','crypto',
                    'real_estate','commodity','other'
                  )),
  ticker_symbol   TEXT,                -- [E]
  quantity        REAL,                -- [E]
  purchase_price  INTEGER,            -- [E] in cents per unit
  current_price   INTEGER,            -- [E] in cents per unit

  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Income Streams

```sql
CREATE TABLE income_streams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,            -- [E]
  income_type TEXT NOT NULL
              CHECK (income_type IN (
                'salary','freelance','investment','rental','business',
                'side_hustle','passive','other'
              )),
  work_type   TEXT CHECK (work_type IN ('full_time','part_time','contract','freelance','passive')),
  amount      INTEGER NOT NULL,       -- [E] in cents
  frequency   TEXT NOT NULL DEFAULT 'monthly'
              CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly','yearly')),
  is_active   INTEGER NOT NULL DEFAULT 1,
  employer    TEXT,                   -- [E]
  start_date  TEXT,
  end_date    TEXT,

  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

---

### 5.9 Relationships / CRM Domain

```sql
CREATE TABLE contacts (
  id                      TEXT PRIMARY KEY,
  first_name              TEXT NOT NULL,       -- [E]
  last_name               TEXT,                -- [E]
  nickname                TEXT,                -- [E]
  relationship_type       TEXT DEFAULT 'acquaintance'
                          CHECK (relationship_type IN (
                            'family','friend','colleague','mentor','mentee',
                            'romantic','professional','acquaintance','other'
                          )),
  email                   TEXT,                -- [E]
  phone                   TEXT,                -- [E]
  avatar_url              TEXT,                -- [E]
  company                 TEXT,                -- [E]
  job_title               TEXT,                -- [E]
  location                TEXT,                -- [E]
  birthday                TEXT,                -- [E] YYYY-MM-DD
  tags                    TEXT,                -- [E] JSON array
  social_links            TEXT,                -- [E] JSON: {linkedin?, twitter?, instagram?, whatsapp?}
  stay_in_touch_frequency TEXT CHECK (stay_in_touch_frequency IN (
                            'daily','weekly','biweekly','monthly','quarterly','yearly'
                          )),
  stay_in_touch_days      INTEGER,
  last_interaction_date   TEXT,
  next_contact_date       TEXT,
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
);

-- NOTE (F7/D7): NO index on `first_name, last_name` — both are `-- [E]` (random-nonce ciphertext), so a B-tree
-- cannot sort or match them. Contact name sort/search is a display concern → decrypt-in-memory sort, or the
-- plaintext-fed FTS5 (§5.19). NO name blind index (names are too sensitive — equality-leak of names is unacceptable).
```

### Contact Events

```sql
CREATE TABLE contact_events (
  id             TEXT PRIMARY KEY,
  contact_id     TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL DEFAULT 'custom'
                 CHECK (event_type IN ('birthday','anniversary','holiday','custom')),
  event_date     TEXT NOT NULL,          -- YYYY-MM-DD (or MM-DD for recurring year-agnostic)
  title          TEXT,                  -- [E]
  description    TEXT,                 -- [E]
  is_recurring   INTEGER NOT NULL DEFAULT 1,
  reminder_days  TEXT,                   -- JSON array: [1, 3, 7] = remind 1, 3, 7 days before

  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_contact_events_contact ON contact_events(contact_id);
```

### Interactions

```sql
CREATE TABLE interactions (
  id                TEXT PRIMARY KEY,
  contact_id        TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  interaction_type  TEXT NOT NULL DEFAULT 'in_person'
                    CHECK (interaction_type IN (
                      'call','text','email','in_person','video_call','social_media','letter','other'
                    )),
  date              TEXT NOT NULL,
  duration_minutes  INTEGER,
  summary           TEXT,              -- [E]
  sentiment         TEXT CHECK (sentiment IN ('positive','neutral','negative')),
  follow_up_needed  INTEGER NOT NULL DEFAULT 0,
  follow_up_date    TEXT,
  follow_up_notes   TEXT,              -- [E]

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_interactions_contact ON interactions(contact_id);
CREATE INDEX idx_interactions_date ON interactions(date);
```

### Contact Reminders

```sql
CREATE TABLE contact_reminders (
  id                TEXT PRIMARY KEY,
  contact_id        TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  reminder_group_id TEXT REFERENCES reminder_groups(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,       -- [E]
  reminder_date     TEXT,
  is_recurring      INTEGER NOT NULL DEFAULT 0,
  frequency         TEXT CHECK (frequency IN (
                      'daily','weekly','biweekly','monthly','quarterly','yearly'
                    )),
  is_completed      INTEGER NOT NULL DEFAULT 0,

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Reminder Groups

```sql
CREATE TABLE reminder_groups (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,       -- [E]
  message_template  TEXT,              -- [E]
  time_of_day       TEXT,              -- HH:MM
  frequency         TEXT CHECK (frequency IN (
                      'daily','weekly','biweekly','monthly','quarterly','yearly'
                    )),
  days_of_week      TEXT,              -- JSON array
  is_active         INTEGER NOT NULL DEFAULT 1,

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE TABLE reminder_group_contacts (
  reminder_group_id TEXT NOT NULL REFERENCES reminder_groups(id) ON DELETE CASCADE,
  contact_id        TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  PRIMARY KEY (reminder_group_id, contact_id)
);
```

---

### 5.10 Learning Domain

```sql
CREATE TABLE courses (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,     -- [E]
  description         TEXT,             -- [E]
  provider            TEXT,             -- [E]
  instructor          TEXT,             -- [E]
  url                 TEXT,             -- [E]
  course_type         TEXT CHECK (course_type IN ('online','in_person','hybrid','self_paced')),
  status              TEXT NOT NULL DEFAULT 'not_started'
                      CHECK (status IN ('not_started','in_progress','completed','dropped')),
  progress            INTEGER NOT NULL DEFAULT 0,   -- 0-100
  total_modules       INTEGER NOT NULL DEFAULT 0,
  completed_modules   INTEGER NOT NULL DEFAULT 0,
  start_date          TEXT,
  end_date            TEXT,
  target_completion   TEXT,
  estimated_hours     INTEGER,           -- in minutes
  rating              INTEGER CHECK (rating BETWEEN 1 AND 5),
  tags                TEXT,              -- [E] JSON array
  metadata            TEXT,              -- [E] JSON: course-specific data (e.g., college class schedule)

  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  deleted_at          INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Books

```sql
CREATE TABLE books (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,       -- [E]
  author            TEXT,               -- [E]
  isbn              TEXT,               -- [E]
  format            TEXT DEFAULT 'physical'
                    CHECK (format IN ('physical','ebook','audiobook')),
  status            TEXT NOT NULL DEFAULT 'want_to_read'
                    CHECK (status IN ('want_to_read','reading','completed','dropped')),
  total_pages       INTEGER NOT NULL DEFAULT 0,
  current_page      INTEGER NOT NULL DEFAULT 0,
  progress          INTEGER NOT NULL DEFAULT 0,   -- 0-100
  start_date        TEXT,
  end_date          TEXT,
  rating            INTEGER CHECK (rating BETWEEN 1 AND 5),
  review            TEXT,               -- [E]
  cover_url         TEXT,               -- [E]
  genre             TEXT,               -- [E]
  tags              TEXT,              -- [E] JSON array

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  deleted_at        INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Book Chapters

```sql
CREATE TABLE book_chapters (
  id                        TEXT PRIMARY KEY,
  book_id                   TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title                     TEXT NOT NULL,  -- [E]
  chapter_number            INTEGER NOT NULL,
  start_page                INTEGER,
  end_page                  INTEGER,
  estimated_reading_minutes INTEGER,
  actual_reading_minutes    INTEGER,
  is_completed              INTEGER NOT NULL DEFAULT 0,
  completed_at              INTEGER,
  sort_order                INTEGER NOT NULL DEFAULT 0,

  created_at                INTEGER NOT NULL,
  updated_at                INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(book_id, chapter_number)
);
```

### Skills

```sql
CREATE TABLE skills (
  id                     TEXT PRIMARY KEY,
  parent_skill_id        TEXT REFERENCES skills(id) ON DELETE SET NULL,
  name                   TEXT NOT NULL,  -- [E]
  description            TEXT,          -- [E]
  mastery_level          TEXT NOT NULL DEFAULT 'novice'
                         CHECK (mastery_level IN (
                           'novice','beginner','intermediate','advanced','expert','master'
                         )),
  practice_hours         INTEGER NOT NULL DEFAULT 0,   -- in minutes
  last_practiced         INTEGER,
  proficiency_test_score INTEGER,

  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL,
  deleted_at             INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Skill Resources (Polymorphic Junction)

```sql
CREATE TABLE skill_resources (
  id            TEXT PRIMARY KEY,
  skill_id      TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('course','book')),
  resource_id   TEXT NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(skill_id, resource_type, resource_id)
);
```

### Study Sessions

```sql
CREATE TABLE study_sessions (
  id                TEXT PRIMARY KEY,
  resource_type     TEXT NOT NULL CHECK (resource_type IN (
                      'course','book','topic','homework','article','video','podcast'
                    )),
  resource_id       TEXT NOT NULL,
  duration_minutes  INTEGER NOT NULL,
  focus_rating      INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
  energy_level      INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  distraction_count INTEGER NOT NULL DEFAULT 0,
  pages_read        INTEGER,
  lessons_completed INTEGER,
  key_learnings     TEXT,               -- [E]
  started_at        INTEGER NOT NULL,
  ended_at          INTEGER,

  created_at        INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_study_sessions_resource ON study_sessions(resource_type, resource_id);
CREATE INDEX idx_study_sessions_date ON study_sessions(started_at);
```

### Study Topics (with SM-2 Spaced Repetition)

```sql
CREATE TABLE study_topics (
  id                       TEXT PRIMARY KEY,
  course_id                TEXT REFERENCES courses(id) ON DELETE SET NULL,
  linked_book_id           TEXT REFERENCES books(id) ON DELETE SET NULL,
  reading_chapter_id       TEXT REFERENCES book_chapters(id) ON DELETE SET NULL,
  title                    TEXT NOT NULL, -- [E]
  description              TEXT,         -- [E]
  status                   TEXT NOT NULL DEFAULT 'not_started'
                           CHECK (status IN ('not_started','in_progress','reviewing','mastered')),
  mastery_level            INTEGER NOT NULL DEFAULT 0,   -- 0-100
  difficulty               TEXT DEFAULT 'medium'
                           CHECK (difficulty IN ('easy','medium','hard','very_hard')),
  due_date                 TEXT,
  is_exam_topic            INTEGER NOT NULL DEFAULT 0,
  study_time_minutes       INTEGER NOT NULL DEFAULT 0,
  estimated_study_minutes  INTEGER NOT NULL DEFAULT 30,
  key_concepts             TEXT,          -- [E] JSON array
  resource_urls            TEXT,          -- [E] JSON array
  sort_order               INTEGER NOT NULL DEFAULT 0,

  -- SM-2 spaced repetition fields
  easiness_factor          REAL NOT NULL DEFAULT 2.5,
  repetition_number        INTEGER NOT NULL DEFAULT 0,
  interval_days            INTEGER NOT NULL DEFAULT 1,
  next_review_date         TEXT,
  last_reviewed_at         INTEGER,

  -- Class context
  class_date               TEXT,
  reading_start_page       INTEGER,
  reading_end_page         INTEGER,

  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL,
  deleted_at               INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_study_topics_course ON study_topics(course_id);
CREATE INDEX idx_study_topics_review ON study_topics(next_review_date) WHERE deleted_at IS NULL;
```

### Topic Reviews

```sql
CREATE TABLE topic_reviews (
  id                    TEXT PRIMARY KEY,
  topic_id              TEXT NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE,
  quality               INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 5),
  response_time_seconds INTEGER,
  reviewed_at           INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Flashcard Decks

```sql
CREATE TABLE flashcard_decks (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,       -- [E]
  description      TEXT,               -- [E]
  resource_type    TEXT CHECK (resource_type IN ('course','book','topic')),
  resource_id      TEXT,
  new_cards_per_day INTEGER NOT NULL DEFAULT 20,
  reviews_per_day  INTEGER NOT NULL DEFAULT 100,
  is_active        INTEGER NOT NULL DEFAULT 1,
  total_cards      INTEGER NOT NULL DEFAULT 0,
  mastered_cards   INTEGER NOT NULL DEFAULT 0,

  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  deleted_at       INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Flashcards (SM-2)

```sql
CREATE TABLE flashcards (
  id               TEXT PRIMARY KEY,
  deck_id          TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front            TEXT NOT NULL,       -- [E]
  back             TEXT NOT NULL,       -- [E]
  hint             TEXT,               -- [E]
  explanation      TEXT,               -- [E]

  -- SM-2 fields
  easiness_factor  REAL NOT NULL DEFAULT 2.5,
  repetitions      INTEGER NOT NULL DEFAULT 0,
  interval_days    INTEGER NOT NULL DEFAULT 1,
  next_review_date TEXT,
  last_reviewed_at INTEGER,
  times_reviewed   INTEGER NOT NULL DEFAULT 0,
  times_correct    INTEGER NOT NULL DEFAULT 0,
  is_mastered      INTEGER NOT NULL DEFAULT 0,
  is_suspended     INTEGER NOT NULL DEFAULT 0,

  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_flashcards_deck ON flashcards(deck_id);
CREATE INDEX idx_flashcards_review ON flashcards(next_review_date) WHERE is_suspended = 0;
```

### Flashcard Reviews

```sql
CREATE TABLE flashcard_reviews (
  id                  TEXT PRIMARY KEY,
  flashcard_id        TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  quality             INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 5),
  response_time_ms    INTEGER,
  previous_interval   INTEGER,
  new_interval        INTEGER,
  previous_easiness   REAL,
  new_easiness        REAL,
  reviewed_at         INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Knowledge Notes

```sql
CREATE TABLE knowledge_notes (
  id              TEXT PRIMARY KEY,
  parent_note_id  TEXT REFERENCES knowledge_notes(id) ON DELETE SET NULL,
  resource_type   TEXT CHECK (resource_type IN ('course','book','topic')),
  resource_id     TEXT,
  title           TEXT NOT NULL,        -- [E]
  content         TEXT,                -- [E]
  topic           TEXT,                -- [E]
  subtopic        TEXT,                -- [E]
  tags            TEXT,              -- [E] JSON array
  is_pinned       INTEGER NOT NULL DEFAULT 0,
  is_archived     INTEGER NOT NULL DEFAULT 0,

  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

---

### 5.11 Study Planner Domain

### Study Availability

```sql
CREATE TABLE study_availability (
  id                  TEXT PRIMARY KEY,
  day_of_week         INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time          TEXT NOT NULL,     -- HH:MM
  end_time            TEXT NOT NULL,     -- HH:MM
  is_available        INTEGER NOT NULL DEFAULT 1,
  preference_score    INTEGER CHECK (preference_score BETWEEN 1 AND 5),
  preset_block        TEXT CHECK (preset_block IN (
                        'early_morning','morning','late_morning','afternoon',
                        'late_afternoon','evening','night'
                      )),
  max_session_minutes INTEGER,

  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Availability Exceptions

```sql
CREATE TABLE availability_exceptions (
  id              TEXT PRIMARY KEY,
  exception_date  TEXT NOT NULL,        -- YYYY-MM-DD
  is_available    INTEGER NOT NULL,
  reason          TEXT,                  -- [E]
  start_time      TEXT,                 -- HH:MM (if partially available)
  end_time        TEXT,

  created_at      INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Study Plan Batches

```sql
CREATE TABLE study_plan_batches (
  id              TEXT PRIMARY KEY,
  course_id       TEXT REFERENCES courses(id) ON DELETE SET NULL,
  name            TEXT,                  -- [E]
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending_approval','approved','active','completed')),
  total_sessions  INTEGER NOT NULL DEFAULT 0,
  generated_at    INTEGER,
  approved_at     INTEGER,

  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Scheduled Study Sessions

```sql
CREATE TABLE scheduled_study_sessions (
  id              TEXT PRIMARY KEY,
  batch_id        TEXT REFERENCES study_plan_batches(id) ON DELETE SET NULL,
  resource_type   TEXT NOT NULL CHECK (resource_type IN (
                    'topic','flashcard_deck','book','course','homework'
                  )),
  resource_id     TEXT NOT NULL,
  session_type    TEXT NOT NULL DEFAULT 'study'
                  CHECK (session_type IN ('study','review','practice','exam_prep','homework')),
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','in_progress','completed','skipped','rescheduled')),
  scheduled_date  TEXT NOT NULL,
  start_time      TEXT,               -- HH:MM
  end_time        TEXT,
  duration_minutes INTEGER,
  urgency_score   REAL,
  start_page      INTEGER,
  end_page        INTEGER,
  chapter_id      TEXT REFERENCES book_chapters(id) ON DELETE SET NULL,

  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_scheduled_sessions_date ON scheduled_study_sessions(scheduled_date);
CREATE INDEX idx_scheduled_sessions_resource ON scheduled_study_sessions(resource_type, resource_id);
```

### Session Templates (Pomodoro Presets)

```sql
CREATE TABLE session_templates (
  id                            TEXT PRIMARY KEY,
  name                          TEXT NOT NULL,  -- [E]
  work_minutes                  INTEGER NOT NULL DEFAULT 25,
  short_break_minutes           INTEGER NOT NULL DEFAULT 5,
  long_break_minutes            INTEGER NOT NULL DEFAULT 15,
  intervals_before_long_break   INTEGER NOT NULL DEFAULT 4,
  auto_start_breaks             INTEGER NOT NULL DEFAULT 1,
  auto_start_work               INTEGER NOT NULL DEFAULT 0,
  is_default                    INTEGER NOT NULL DEFAULT 0,

  created_at                    INTEGER NOT NULL,
  updated_at                    INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

---

### 5.12 Language Learning Domain

```sql
CREATE TABLE languages (
  id                    TEXT PRIMARY KEY,
  language_name         TEXT NOT NULL,
  language_code         TEXT NOT NULL UNIQUE,
  flag_emoji            TEXT,
  target_proficiency    TEXT CHECK (target_proficiency IN ('a1','a2','b1','b2','c1','c2','native')),
  current_proficiency   TEXT CHECK (current_proficiency IN ('a1','a2','b1','b2','c1','c2','native')),
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','completed','dropped')),
  start_date            TEXT,
  -- Per-skill proficiency levels
  listening_level       TEXT CHECK (listening_level IN ('a1','a2','b1','b2','c1','c2','native')),
  speaking_level        TEXT CHECK (speaking_level IN ('a1','a2','b1','b2','c1','c2','native')),
  reading_level         TEXT CHECK (reading_level IN ('a1','a2','b1','b2','c1','c2','native')),
  writing_level         TEXT CHECK (writing_level IN ('a1','a2','b1','b2','c1','c2','native')),
  daily_goal_minutes    INTEGER NOT NULL DEFAULT 30,
  weekly_goal_sessions  INTEGER NOT NULL DEFAULT 5,
  current_streak        INTEGER NOT NULL DEFAULT 0,
  longest_streak        INTEGER NOT NULL DEFAULT 0,
  total_practice_minutes INTEGER NOT NULL DEFAULT 0,
  total_sessions        INTEGER NOT NULL DEFAULT 0,
  vocabulary_count      INTEGER NOT NULL DEFAULT 0,
  current_day_number    INTEGER NOT NULL DEFAULT 1,
  learning_phase        TEXT NOT NULL DEFAULT 'foundation'
                        CHECK (learning_phase IN ('foundation','building','fluency')),
  phase_started_at      INTEGER,
  resources             TEXT,            -- [E] JSON array

  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  deleted_at            INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Language Practice Sessions

```sql
CREATE TABLE language_practice_sessions (
  id                  TEXT PRIMARY KEY,
  language_id         TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  skill_type          TEXT NOT NULL CHECK (skill_type IN (
                        'listening','speaking','reading','writing','vocabulary','grammar'
                      )),
  activity_type       TEXT NOT NULL CHECK (activity_type IN (
                        'flashcards','reading','writing','listening','speaking',
                        'conversation','media','class','app','other'
                      )),
  duration_minutes    INTEGER NOT NULL,
  new_words_learned   INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage INTEGER,
  focus_rating        INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
  energy_level        INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  content             TEXT,              -- [E]

  created_at          INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_practice_language ON language_practice_sessions(language_id);
```

### Language Vocabulary (with SRS)

```sql
CREATE TABLE language_vocabulary (
  id                        TEXT PRIMARY KEY,
  language_id               TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  word                      TEXT NOT NULL,  -- [E]
  translation               TEXT NOT NULL, -- [E]
  pronunciation             TEXT,          -- [E]
  part_of_speech            TEXT,
  example_sentence          TEXT,          -- [E]
  meaning_in_target_language TEXT,          -- [E]
  source_activity           TEXT,          -- [E]
  mastery                   TEXT NOT NULL DEFAULT 'new'
                            CHECK (mastery IN ('new','learning','familiar','proficient','mastered')),
  review_count              INTEGER NOT NULL DEFAULT 0,
  next_review_date          TEXT,

  created_at                INTEGER NOT NULL,
  updated_at                INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_vocab_language ON language_vocabulary(language_id);
CREATE INDEX idx_vocab_review ON language_vocabulary(next_review_date);
```

### Language Daily Sessions

```sql
CREATE TABLE language_daily_sessions (
  id                    TEXT PRIMARY KEY,
  language_id           TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  session_date          TEXT NOT NULL,
  day_number            INTEGER,
  weekly_plan_id        TEXT REFERENCES language_weekly_plans(id) ON DELETE SET NULL,
  weekly_topic          TEXT,

  -- Completion flags
  grammar_video         INTEGER NOT NULL DEFAULT 0,
  vocabulary_video      INTEGER NOT NULL DEFAULT 0,
  conversation_video    INTEGER NOT NULL DEFAULT 0,
  music                 INTEGER NOT NULL DEFAULT 0,
  bible_listening       INTEGER NOT NULL DEFAULT 0,
  bible_recording       INTEGER NOT NULL DEFAULT 0,
  vocabulary_journal    INTEGER NOT NULL DEFAULT 0,

  -- Content references
  grammar_video_url     TEXT,           -- [E]
  vocabulary_video_url  TEXT,           -- [E]
  conversation_video_url TEXT,          -- [E]
  song_day_number       INTEGER,
  bible_recording_id    TEXT,
  song_recording_id     TEXT,

  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(language_id, session_date)
);
```

### Language Daily Progress

```sql
CREATE TABLE language_daily_progress (
  id                TEXT PRIMARY KEY,
  language_id       TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  date              TEXT NOT NULL,
  listening_minutes INTEGER NOT NULL DEFAULT 0,
  speaking_minutes  INTEGER NOT NULL DEFAULT 0,
  reading_minutes   INTEGER NOT NULL DEFAULT 0,
  writing_minutes   INTEGER NOT NULL DEFAULT 0,
  vocabulary_minutes INTEGER NOT NULL DEFAULT 0,
  grammar_minutes   INTEGER NOT NULL DEFAULT 0,
  total_minutes     INTEGER NOT NULL DEFAULT 0,
  sessions_count    INTEGER NOT NULL DEFAULT 0,
  goal_met          INTEGER NOT NULL DEFAULT 0,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(language_id, date)
);
```

### Language Recordings

```sql
CREATE TABLE language_recordings (
  id               TEXT PRIMARY KEY,
  language_id      TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  recording_type   TEXT NOT NULL CHECK (recording_type IN ('bible','song','pronunciation','conversation')),
  title            TEXT NOT NULL,       -- [E]
  audio_blob       BLOB,              -- [E] stored locally
  duration_seconds INTEGER,
  transcript       TEXT,              -- [E]
  compare_with_id  TEXT REFERENCES language_recordings(id) ON DELETE SET NULL,
  weekly_plan_id   TEXT REFERENCES language_weekly_plans(id) ON DELETE SET NULL,
  metadata         TEXT,              -- [E] JSON

  created_at       INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Language Weekly Plans

```sql
CREATE TABLE language_weekly_plans (
  id                  TEXT PRIMARY KEY,
  language_id         TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  week_start_date     TEXT NOT NULL,     -- Always Sunday, YYYY-MM-DD
  week_number         INTEGER NOT NULL,
  is_planned          INTEGER NOT NULL DEFAULT 0,
  topic               TEXT CHECK (topic IN (
                        'greetings_basics','food_cooking','daily_routine','family_relationships',
                        'travel_directions','shopping_money','health_body','hobbies_entertainment'
                      )),
  -- Song
  song_title          TEXT,             -- [E]
  song_artist         TEXT,             -- [E]
  song_url            TEXT,             -- [E]
  song_lyrics         TEXT,             -- [E]
  current_song_day    INTEGER DEFAULT 1,

  -- Bible
  bible_book          TEXT,             -- [E]
  bible_chapter       INTEGER,
  bible_verses_start  INTEGER,
  bible_verses_end    INTEGER,

  -- Content
  planned_videos      TEXT,            -- [E] JSON array
  videos_watched      INTEGER NOT NULL DEFAULT 0,
  days_completed      INTEGER NOT NULL DEFAULT 0,

  -- Reflection
  weekly_reflection   TEXT,            -- [E]
  highlight_moments   TEXT,            -- [E] JSON array
  challenges_faced    TEXT,            -- [E] JSON array

  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(language_id, week_start_date)
);
```

### Language Base Words

```sql
CREATE TABLE language_base_words (
  id                        TEXT PRIMARY KEY,
  language_id               TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  category                  TEXT NOT NULL CHECK (category IN (
                              'greetings','numbers','pronouns','common_verbs','common_nouns',
                              'adjectives','prepositions','conjunctions','question_words','daily_phrases'
                            )),
  english_word              TEXT NOT NULL, -- [E]
  translation               TEXT,         -- [E]
  meaning_in_target_language TEXT,         -- [E]
  pronunciation             TEXT,         -- [E]
  is_learned                INTEGER NOT NULL DEFAULT 0,
  learned_at                INTEGER,
  linked_vocabulary_id      TEXT REFERENCES language_vocabulary(id) ON DELETE SET NULL,
  display_order             INTEGER,

  created_at                INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(language_id, category, english_word)
);
```

### Language Video Playlists

```sql
CREATE TABLE language_video_playlists (
  id                  TEXT PRIMARY KEY,
  language_id         TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  playlist_url        TEXT NOT NULL,     -- [E]
  title               TEXT,              -- [E]
  total_videos        INTEGER NOT NULL DEFAULT 0,
  watched_count       INTEGER NOT NULL DEFAULT 0,
  current_video_index INTEGER NOT NULL DEFAULT 0,

  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

---

### 5.13 Check-ins Domain

```sql
CREATE TABLE daily_check_ins (
  id               TEXT PRIMARY KEY,
  check_in_date    TEXT NOT NULL UNIQUE,  -- YYYY-MM-DD
  check_in_type    TEXT NOT NULL DEFAULT 'morning'
                   CHECK (check_in_type IN ('morning','evening','weekly_review')),
  template_id      TEXT REFERENCES check_in_templates(id) ON DELETE SET NULL,
  mood_score       INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  energy_level     INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  top_intentions   TEXT,               -- [E] JSON array
  wins             TEXT,               -- [E] JSON array
  gratitude        TEXT,               -- [E] JSON array
  challenges       TEXT,               -- [E] JSON array
  tomorrow_focus   TEXT,               -- [E] JSON array
  reflection       TEXT,               -- [E]
  custom_data      TEXT,               -- [E] JSON from template questions

  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Check-in Templates

```sql
CREATE TABLE check_in_templates (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,         -- [E]
  description     TEXT,                 -- [E]
  icon            TEXT DEFAULT 'clipboard-check',
  is_default      INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  schedule_type   TEXT CHECK (schedule_type IN ('daily','weekly','custom')),
  schedule_days   TEXT,               -- JSON array [0-6]
  preferred_time  TEXT CHECK (preferred_time IN ('morning','afternoon','evening','anytime')),
  sort_order      INTEGER NOT NULL DEFAULT 0,

  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Check-in Template Questions

```sql
CREATE TABLE check_in_template_questions (
  id           TEXT PRIMARY KEY,
  template_id  TEXT NOT NULL REFERENCES check_in_templates(id) ON DELETE CASCADE,
  field_key    TEXT NOT NULL,
  label        TEXT NOT NULL,            -- [E]
  field_type   TEXT NOT NULL CHECK (field_type IN (
                 'mood_scale','energy_scale','text_list','text_area','rating','boolean'
               )),
  placeholder  TEXT,                    -- [E]
  is_required  INTEGER NOT NULL DEFAULT 0,
  min_value    INTEGER,
  max_value    INTEGER,
  sort_order   INTEGER NOT NULL DEFAULT 0,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(template_id, field_key)
);
```

---

### 5.14 Bucket List Domain

```sql
CREATE TABLE bucket_list_items (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,     -- [E]
  description         TEXT,             -- [E]
  category            TEXT DEFAULT 'other'
                      CHECK (category IN (
                        'travel','adventure','career','creative','education',
                        'financial','health','relationship','spiritual','other'
                      )),
  status              TEXT NOT NULL DEFAULT 'dream'
                      CHECK (status IN ('dream','planned','in_progress','completed','abandoned')),
  priority            TEXT NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('critical','high','medium','low','none')),
  target_date         TEXT,
  completed_date      TEXT,
  estimated_cost      INTEGER,          -- [E] in cents
  location            TEXT,             -- [E]
  image_url           TEXT,             -- [E]
  cover_image_url     TEXT,             -- [E]
  tags                TEXT,             -- [E] JSON array
  progress_percentage INTEGER NOT NULL DEFAULT 0,   -- 0-100
  steps               TEXT,             -- [E] JSON: [{id, text, completed}]
  purpose_id          TEXT REFERENCES purposes(id) ON DELETE SET NULL,
  project_id          TEXT REFERENCES projects(id) ON DELETE SET NULL,
  inspiration_url     TEXT,             -- [E]

  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  deleted_at          INTEGER,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

---

### 5.15 Gamification Domain

### User Profile

```sql
CREATE TABLE user_profile (
  id                       TEXT PRIMARY KEY,
  persona                  TEXT CHECK (persona IN (
                             'student','professional','entrepreneur','creative','parent','retiree'
                           )),
  life_stage               TEXT,
  focus_areas              TEXT,          -- [E] JSON array
  motivation_style         TEXT,
  display_name             TEXT,          -- [E]
  avatar_url               TEXT,          -- [E]
  birth_date               TEXT,          -- [E]
  timezone                 TEXT DEFAULT 'UTC',
  total_xp                 INTEGER NOT NULL DEFAULT 0,
  current_level            INTEGER NOT NULL DEFAULT 1,
  check_in_streak          INTEGER NOT NULL DEFAULT 0,
  longest_check_in_streak  INTEGER NOT NULL DEFAULT 0,
  last_check_in_date       TEXT,
  onboarding_completed     INTEGER NOT NULL DEFAULT 0,
  skipped_modules          TEXT,          -- JSON array
  active_modules           TEXT,          -- JSON array

  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Achievements

```sql
CREATE TABLE achievements (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL CHECK (category IN (
                'onboarding','habits','learning','projects','financial',
                'social','checkin','purpose','general'
              )),
  tier        TEXT DEFAULT 'bronze'
              CHECK (tier IN ('bronze','silver','gold','platinum')),
  title       TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  xp_reward   INTEGER NOT NULL DEFAULT 0,
  condition   TEXT,                    -- JSON: trigger conditions
  is_secret   INTEGER NOT NULL DEFAULT 0,

  created_at  INTEGER NOT NULL
);
```

### User Achievements

```sql
CREATE TABLE user_achievements (
  id             TEXT PRIMARY KEY,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at      INTEGER NOT NULL,
  progress       TEXT,                 -- JSON: partial progress

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(achievement_id)
);
```

### XP History

```sql
CREATE TABLE xp_history (
  id            TEXT PRIMARY KEY,
  action_type   TEXT NOT NULL,
  xp_amount     INTEGER NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  level_before  INTEGER,
  level_after   INTEGER,
  earned_at     INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_xp_history_date ON xp_history(earned_at);
```

---

### 5.16 Notifications Domain

```sql
CREATE TABLE notifications (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN (
                 'info','success','warning','error','reminder','achievement'
               )),
  title        TEXT NOT NULL,            -- [E]
  message      TEXT,                    -- [E]
  action_url   TEXT,
  action_label TEXT,                    -- [E]
  entity_type  TEXT,
  entity_id    TEXT,
  is_read      INTEGER NOT NULL DEFAULT 0,
  read_at      INTEGER,
  is_archived  INTEGER NOT NULL DEFAULT 0,
  archived_at  INTEGER,
  expires_at   INTEGER,

  created_at   INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_archived = 0;
```

---

### 5.17 Preferences & Navigation

### User Preferences

```sql
CREATE TABLE user_preferences (
  id                          TEXT PRIMARY KEY,
  -- Appearance
  theme                       TEXT NOT NULL DEFAULT 'system'
                              CHECK (theme IN ('light','dark','system')),
  accent_color                TEXT DEFAULT '#6366f1',
  -- Locale
  date_format                 TEXT DEFAULT 'YYYY-MM-DD',
  time_format                 TEXT DEFAULT '24h' CHECK (time_format IN ('12h','24h')),
  week_starts_on              INTEGER DEFAULT 1,   -- 0=Sun, 1=Mon
  currency                    TEXT DEFAULT 'USD',
  -- Dashboard
  dashboard_layout            TEXT,                 -- JSON
  -- Tasks
  show_completed_tasks        INTEGER NOT NULL DEFAULT 1,
  default_task_priority       TEXT DEFAULT 'medium',
  -- Pomodoro
  pomodoro_work_minutes       INTEGER NOT NULL DEFAULT 25,
  pomodoro_break_minutes      INTEGER NOT NULL DEFAULT 5,
  pomodoro_long_break_minutes INTEGER NOT NULL DEFAULT 15,
  pomodoro_sessions_before_long INTEGER NOT NULL DEFAULT 4,
  -- Notifications
  notification_email          INTEGER NOT NULL DEFAULT 1,
  notification_push           INTEGER NOT NULL DEFAULT 1,
  notification_in_app         INTEGER NOT NULL DEFAULT 1,
  quiet_hours_enabled         INTEGER NOT NULL DEFAULT 0,
  quiet_hours_start           TEXT,                 -- HH:MM
  quiet_hours_end             TEXT,                 -- HH:MM
  -- Per-module push toggles
  push_habits                 INTEGER NOT NULL DEFAULT 1,
  push_tasks                  INTEGER NOT NULL DEFAULT 1,
  push_routines               INTEGER NOT NULL DEFAULT 1,
  push_contacts               INTEGER NOT NULL DEFAULT 1,
  push_study                  INTEGER NOT NULL DEFAULT 1,
  -- Features
  feature_gamification        INTEGER NOT NULL DEFAULT 1,

  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Navigation Preferences

```sql
CREATE TABLE nav_preferences (
  id               TEXT PRIMARY KEY,
  dock_position    TEXT NOT NULL DEFAULT 'bottom'
                   CHECK (dock_position IN ('bottom','left','right')),
  dock_auto_hide   INTEGER NOT NULL DEFAULT 0,
  dock_size        TEXT NOT NULL DEFAULT 'medium'
                   CHECK (dock_size IN ('small','medium','large')),
  mobile_nav_items TEXT,               -- JSON array of module keys
  show_labels      INTEGER NOT NULL DEFAULT 1,
  haptic_feedback  INTEGER NOT NULL DEFAULT 1,
  reduce_motion    INTEGER NOT NULL DEFAULT 0,

  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

### Command Bar History

```sql
CREATE TABLE command_bar_history (
  id               TEXT PRIMARY KEY,
  command_key      TEXT NOT NULL UNIQUE,
  command_label    TEXT NOT NULL,
  command_category TEXT,
  use_count        INTEGER NOT NULL DEFAULT 1,
  last_used_at     INTEGER,
  is_pinned        INTEGER NOT NULL DEFAULT 0,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
```

---

### 5.18 ICS Calendar Sync

```sql
CREATE TABLE ics_feed_configs (
  id                    TEXT PRIMARY KEY,
  feed_url              TEXT NOT NULL,   -- [E]
  feed_name             TEXT,           -- [E]
  is_active             INTEGER NOT NULL DEFAULT 1,
  auto_create_sessions  INTEGER NOT NULL DEFAULT 0,
  default_course_id     TEXT REFERENCES courses(id) ON DELETE SET NULL,
  sync_interval_hours   INTEGER NOT NULL DEFAULT 6,
  last_synced_at        INTEGER,
  last_error            TEXT,            -- [E]
  metadata              TEXT,           -- [E] JSON

  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);

CREATE TABLE ics_synced_events (
  id                 TEXT PRIMARY KEY,
  feed_id            TEXT NOT NULL REFERENCES ics_feed_configs(id) ON DELETE CASCADE,
  uid                TEXT NOT NULL,
  summary            TEXT,              -- [E]
  description        TEXT,              -- [E]
  location           TEXT,              -- [E]
  start_time         INTEGER NOT NULL,
  end_time           INTEGER,
  recurrence_rule    TEXT,
  matched_course_id  TEXT REFERENCES courses(id) ON DELETE SET NULL,
  created_session_id TEXT,
  is_ignored         INTEGER NOT NULL DEFAULT 0,
  raw_event          TEXT,              -- [E] JSON

  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,

  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT,

  UNIQUE(feed_id, uid)
);
```

---

### 5.19 Full-Text Search (FTS5 Virtual Tables)

These are **device-local only** (not synced).

**Why standalone, not external-content (F7/D7).** The searchable columns (`pages.content`, `pages.title`,
`tasks.description`, `contacts.first_name/last_name`, …) are all `-- [E]` — random-nonce ciphertext. An
**external-content** FTS5 table (`content='<table>'`) indexes the base table's **stored** values, i.e. the ciphertext
— useless for search — and the earlier schema also referenced **phantom columns** (`content_text` never existed on
`pages`; `contacts` has no `notes` column — notes live in `pages` per the no-inline-notes convention). So the FTS
tables are **standalone content-less** FTS5 (no `content=`), populated from **decrypted plaintext** fed by the app.

**Storage model = FTS-2 (ephemeral, rebuilt on unlock).** The index is built into a **non-persistent** store from
decrypted plaintext when the vault unlocks and **torn down on lock** — so no searchable plaintext tokens are kept in
the app's persistent storage, preserving the E fields' at-rest defense-in-depth. Honestly bounded: this is **not** a
literal "never touches disk" — OS swap/paging of in-memory pages and SQLite temp-spill are residual (the latter
mitigated by `PRAGMA temp_store = MEMORY`; swap is an OS-level residual shared by any decrypt-to-use path). The `id`
maps hits back to the source row.

```sql
-- Notes full-text search (standalone; fed decrypted pages.title + pages.content)
CREATE VIRTUAL TABLE fts_pages USING fts5(
  id UNINDEXED,
  title,          -- fed decrypted (pages.title is [E])
  content_text    -- fed decrypted (from pages.content, which is [E])
);

-- Tasks search (fed decrypted tasks.title + tasks.description)
CREATE VIRTUAL TABLE fts_tasks USING fts5(
  id UNINDEXED,
  title,
  description
);

-- Contacts search (fed decrypted; `notes` pulled from the contact's `pages` note, not a contacts column)
CREATE VIRTUAL TABLE fts_contacts USING fts5(
  id UNINDEXED,
  first_name,
  last_name,
  company,
  notes           -- from the contact's pages-note (no contacts.notes column exists)
);

-- Courses search (fed decrypted course.title + description + provider)
CREATE VIRTUAL TABLE fts_courses USING fts5(
  id UNINDEXED,
  title,
  description,
  provider
);
```

---

### 5.20 Pending Consolidation — the owed-tables ledger (D5, 2026-07-17)

> **Status: D5-a = TRACK (ratified 2026-07-17).** The §5 schema above is the **pre-amendment v1**. Rather than rewrite
> it now (the true owed set is large and much of it is build-phase-deferred — see below), this section is the **durable
> owed-tables ledger**: the single scoped checklist the build-phase schema session (which also writes the Drizzle
> schema in `packages/core`) consolidates into §5. It supersedes the interim pointer to the review-doc ledger. Source
> of the decision: `docs/reviews/2026-07-15-adr-critique-gate.md` (F4/D5) + `docs/specs/adr-revisions/f4-body-d5-adr002-consolidation/PLAN.md`.
>
> ADR-002 owes schema changes from **two streams**: **(i)** the ADR revise pass (ADR-003 §17 + ADR-004…012 `Amends:`
> lines + the F1/F6/F7 build columns) — **fully enumerated below**; and **(ii)** the documentation-blueprint module
> tier — the `[INTENT]`-marked owed amendments in **all 19 `docs/features/*/structure-data.md` docs** (the per-module
> documented target schema) — **named below, not enumerated**, because table-by-table enumeration of the full v2 module
> schema *is* the build-phase session this ledger defers.

**Readiness legend:** ✓ fully-specified (drop-in) · ⏳ build-deferred (shape open in-source) · ↔ to-verify at build.

#### Stream (i) — ADR revise-pass owed set (enumerated)

**RETIRE** (superseded — remove from §5 at the build rewrite; reconcile every remaining reference: index, FK, §7
count, §8 map):

| Retire | Stale §5 location | Superseded by |
|--------|-------------------|---------------|
| flat `study_sessions` (Learning-only) | §5.10 (Study Sessions) | ADR-004 `sessions` spine + `study_sessions` **redefined** as a 1:1 extension |
| §5.11 flat Study Planner (`study_availability`, `availability_exceptions`, `study_plan_batches`, `scheduled_study_sessions`, `session_templates`) | §5.11 | ADR-004 `planned_blocks` + aggregator engine (↔ per-table disposition verified at build — some redefined, not dropped; ADR-004 §3.1) |
| `flashcard_decks` | §5.10 | ADR-005 — reviewable becomes a lean content entity |
| `flashcard_reviews` | §5.10 | ADR-005 — generic review engine (`review_events`) |
| SM-2 columns on `flashcards` *(column-level)* | §5.10 | ADR-005 — scheduled by Knowledge's generic engine |
| SM-2 columns on `study_topics` *(column-level; flag)* | §5.10 | ADR-005 review engine — reconcile (`study_topics` still carries its own SM-2 today) |
| `page_tags` | §5.2 (Note Tags) | ADR-006 `entity_tags` (rows migrate) |
| INTENDED `task_views` + Preferences per-module custom-views store | §5.3 / §5.17 | ADR-007 `views` |
| `purpose_habits`, `purpose_routines`, `purpose_projects` (bare junctions) | §5.7 | ADR-011 first-class `contributions` (weighted edge) |
| `xp_history` (XP-only ledger: `action_type`/`xp_amount`/`level_before`/`level_after`) | §5.15 | ADR-012 `consequence_ledger` (currency-scoped ± ledger; XP = one currency) |

**ADD** (new tables — existence/name decided by the amending ADR; readiness per legend):

| Add | Source | Readiness · shape note |
|-----|--------|------------------------|
| `sessions` (spine) | ADR-004 §3.1 | ⏳ thin base row; shared spine |
| `reading_sessions`, `class_sessions`, `workout_sessions`, `work_sessions`, `study_sessions` (redefined), `focus_sessions` | ADR-004 §3.1 | ⏳ 1:1 extension per sub-type keyed by `session_id`; set left at "…etc." — some settle at build |
| `planned_blocks` | ADR-004 §3.1 | ⏳ aggregator-scheduled blocks |
| `session_attachments` | ADR-004 §3.2.1 | ⏳ Integration-Contract polymorphic attachment |
| `applied_effects` (**local-only, not synced**) | ADR-004 (F1) | ⏳ dedup ledger, like `sync_queue` |
| `review_curves`, `method_bindings`, `review_events` | ADR-005 | ↔ Knowledge review-engine tables (confirm columns vs Knowledge structure-data at build) |
| `entity_tags(tag_id, entity_type, entity_id)` | ADR-006 §3.2 | ✓ universal tag junction (replaces `page_tags`) |
| `spaces` | ADR-006 §3 | ✓ lightweight first-class entity; membership spine = a root tag |
| `space_enabled_blocks` (junction) | ADR-006 §3.4 (F3/D3) | ⏳ Space↔capability-**definition** palette (the *menu*); row-based; storage strategy → **F10** |
| `views` | ADR-007 | ✓ saved views (filter × layout × grouping; `space_id` nullable) |
| capability **registry (definition)** table | ADR-008 §3.1 | ⏳ id·kind·render-targets·bindings·effects·config; `kind` carries `study_method`; "Exact tables settle at build" (ADR-008) |
| `block_instances` | ADR-008 §3.4 | ⏳ standalone **placements** (distinct from the `enabled_blocks` *menu*) |
| `templates` | ADR-009 | ✓ `id · name [E] · serialized bundle [E]` — light store |
| `capability_grants` | ADR-010 | ✓ `capability_def_id · granted_bindings · granted_effects · media_ok · external_in_ok · external_out_ok · consented_sensitive_modules · granted_envelope_hash` |
| `values` | ADR-011 (PG4) | ✓ first-class core-beliefs layer above purposes (`name[E] · description[E] · sort_order`) |
| `contributions` | ADR-011 (PG7/PG10) | ⏳ polymorphic weighted goal-edge (`goal_type · goal_id · contributor_type · contributor_id · contribution_percentage · contribution_notes[E]`); Purpose-domain, **not** a Spaces primitive |
| `purpose_reviews` | ADR-011 (PG3) | ✓ restored alignment/fulfillment loop (`still_aligned · fulfillment_rating · clarity_rating · renewed_commitment · …[E]`) |
| `plan_steps` | ADR-011 (PG5) | ⏳ lightweight DOC layer on task/target (`owner_type · owner_id · title[E] · note[E] · order · is_completed`); not a tracked entity |
| `consequence_ledger` | ADR-012 | ⏳ generalizes `xp_history` (RETIRE above): `currency_id · amount(±) · kind{earn,lock,spend,distribute} · entity_type · entity_id · effect_event_id UNIQUE · at`; the 4 derived quantities recompute from it |
| `currencies` | ADR-012 | ⏳ user-definable resource-currency: `name[E] · backing_kind{real-money,self-granted,measured-time} · unit · icon · pool/to-distribute ceiling config`; XP = one currency |
| `store` (**Finance-owned**) | ADR-012 | ⏳ nestable Storage LAYER: `parent_id(self-nest) · node_kind{group,wrapper} · (wrapper) ref_type{account,investment,asset}/ref_id · name[E] · is_locked · dream_id?/purpose_id? · currency overlay`; canonical single-parent (no double-count); existing Finance entities UNTOUCHED |
| `rules` | ADR-012 | ⏳ headless-automation primitive: ADR-011 binding-ref (condition) + typed-consequence set + (user-authored) ADR-010 grant; **shape open in-source**; NOT an ADR-008 render-Block |

*Not a table (recorded to prevent re-litigation):* `study_methods` = the `kind='study_method'` partition of the ADR-008
registry (F2/D2), **not** a base table — queryable via a kind-partition read / optional view. **Inline** capability
instances = ProseMirror nodes synced in the page's Yjs doc (ADR-008 §3.4) — **no table**.

**AMEND** (column-level changes; F1/F6/F7 build columns stay build-phase but visible):

| Amend | Source | Readiness · disposition |
|-------|--------|-------------------------|
| `_sync_field_ts TEXT` on **every** syncable table | ADR-003 §17 | ⏳ **formally ratified here** (was "implicit schema edit") |
| open `entity_links.entity_type` CHECK enum → registry | ADR-006 §3.2 | ✓ CHECK relaxed to the same registry as `entity_tags` |
| `parent_tag_id` on `tags` | ADR-006 §3.2 | ✓ tag nesting (`#a/b`) |
| `effect_event_id` on effect-**triggering** rows; **UNIQUE** `effect_event_id` on effect-**output** rows | ADR-004 (F1) | ⏳ cross-device convergence key |
| HLC **representation** of `_sync_lww_ts` + `_sync_field_ts` (string / BigInt / two-column) + HLC-state home (`last_l`/`last_c`); `updated_at` stays wall-ms | F6/D4-d | ⏳ build-phase; couples to wire header + `blob_index` → **F10** |
| `category_bidx TEXT` (blind index) + `idx_transactions_category_bidx` | F7/D7 | ⏳ keyed-BLAKE2b domain-separated derivation |
| new-domain FTS5 tables — e.g. `fts_knowledge` (Knowledge K11, "absent today") | Knowledge structure-data | ⏳ §5.19's F7 rewrite covered only the *existing* FTS tables (pages/tasks/contacts/courses); new searchable domains owe their own |
| `measurement_kind` + `binding_mode` pair on **pursuable** entities (Tasks · Habits · Routines · Projects/Deliverables · Dreams · Health · Finance measurables) | ADR-011 §3.1/§3.5 | ⏳ **cross-cutting** — each module's `[INTENT]` note (Stream ii); the contract, not per-table DDL, is locked |
| `purposes.progress` / `targets.current_value` (+ any pursuable's stored progress) → **nullable** (`NULL = derive`); today `NOT NULL DEFAULT 0` | ADR-011 §3.2 | ⏳ override-slot semantics |
| `targets.purpose_id` → **nullable** (SR-003 relaxed; `ON DELETE SET NULL`) | ADR-011 (PG9) | ⏳ standalone targets |
| restore `targets.success_criteria[E]` + `measurement_method`; `purpose_metrics.is_higher_better` + `baseline_value`; provenance `source{manual,auto}` on `purpose_metric_values`; optional per-child **nesting-weight** column | ADR-011 §3.1/§3.3/§3.6 | ⏳ measurement fields |
| `user_profile` **SPLIT** by single-writer: System keeps per-currency total + level (DERIVED); `check_in_streak*` → Check-ins; `persona`/`motivation_style`/`active_modules`/`onboarding_*` → Preferences (receiving amendment owed); **PII (`display_name`/`avatar_url`/`birth_date`) STAYS ⚠** until an account/identity model exists | ADR-012 §3.10 | ⏳ no field ends with two writers |
| `achievements.condition` → **measurable predicate** (evaluated on ADR-011 seam + event stream, not a bespoke checker); `level` → **derived** over a fixed non-linear curve config (**no table**) | ADR-012 §3.7/§3.8 | ⏳ engine-on-measurement |
| **ADR-004 §3.2.2 catalogue** += `grant_currency` · `lock_currency` · `move_money` · `surface_notification` — **all §3.2.5 Additive-class** (deterministic `effect_event_id` + UNIQUE on the output row; no domain natural key). `award_xp` = `grant_currency(XP)` (kept) | ADR-012 §3.1 (extends ADR-004) | ⏳ **also owed to ADR-004's `Amended:` block** at consolidation |
| **ADR-011 §3.7 DAG guard** extended to count **consequence→source→condition** edges (a currency grant moving `net_worth` can feed another rule's `derived-pull`) | ADR-012 §3.1 (extends ADR-011) | ⏳ **also owed to ADR-011 §3.7** at consolidation |

#### Stream (ii) — the module-documentation tier (named, not enumerated)

The full per-module documented target schema. **Enumerating these table-by-table is the build-phase schema session
itself** — this ledger names the complete input set so nothing is silently omitted, and defers the enumeration (D5-a).

**The 19 owed source docs** (`docs/features/<module>/structure-data.md`, unless noted): `books` · `check-ins` ·
`finance` · `habits` · `journals` · `knowledge` (+ `knowledge/flashcards`) · `pomodoro` · `preferences` · `projects` ·
`relationships` · `routines` · `sessions-and-scheduling` · `skills` · `tasks` · `health/core` · `health/nutrition` ·
`health/training` · `learning/education`. **Dissolved modules** (schema landed elsewhere): Bucket List →
`docs/intake/bucket-list.md`; Duties → `docs/intake/duties.md`; Languages content → `docs/features/languages/`.

**Notable confirmed cross-module MOVES** (examples — the full set lives in the docs above):

| Move | Kind | Source | ADR-002 site |
|------|------|--------|--------------|
| `bucket_list_items` → collapse into `dreams` (fields fold in) | RETIRE + AMEND | Bucket List dissolution (PG8) | §5.14 → `dreams` §5.7 |
| `pomodoro_sessions` → re-home Notes → Sessions, keyed by `session_id` | AMEND (move) | Pomodoro reframe | §5.2 → Sessions realm |
| `skill_resources` → `entity_links`; `knowledge_notes` / `resource_urls` superseded | RETIRE | Skills / Knowledge structure-data | §5.10 |

> **Build-session checklist = Stream (i) tables above + every doc in the Stream (ii) list.** Both are inputs; §5 is
> rewritten from them at the build-phase schema session, at which point §7 (count) and §8 (map) are reconciled.

---

## 6. Tables Dropped from Life OS

| Life OS Table | Reason for Drop |
|--------------|-----------------|
| `master_routines` / `routine_sessions` | Replaced by simpler `routine_actions` / `routine_completions` model |
| `master_duties` / `duty_sessions` | No TS types existed; functionality absorbed by tasks |
| `master_obligations` / `obligation_sessions` | No TS types existed; functionality absorbed by tasks + contact reminders |
| `activity_log` | Server-side audit trail — not needed in local-first (app analytics handled differently) |
| `daily_productivity_scores` | Computed on-the-fly in application layer; no need to persist |
| `guidance_tips` / `user_tip_interactions` | Shipped as app config/JSON, not DB rows |
| `xp_action_rewards` | Shipped as app config/constants, not DB rows |
| `onboarding_progress` | Merged into `user_profile.onboarding_completed` + app state |
| `study_planner_sync_queue` | Replaced by the universal `sync_queue` table |
| `user_devices` | Server-side concern — managed by the Hono sync server, not local DB |

---

## 7. Table Count Summary

| Domain | Tables | Syncable |
|--------|--------|----------|
| Infrastructure | 2 (app_state, sync_queue) | No |
| Notes & Pages | 6 (pages, page_links, entity_links, tags, page_tags, note_attachments) | Yes |
| Pomodoro | 1 | Yes |
| Tasks | 2 (tasks, task_time_logs) | Yes |
| Projects | 3 (projects, milestones, project_documents) | Yes |
| Habits | 2 (habits, habit_completions) | Yes |
| Routines | 2 (routine_actions, routine_completions) | Yes |
| Purpose & Goals | 8 (purposes, targets, purpose_metrics, purpose_metric_values, target_reviews, dreams, + 4 junction tables) | Yes |
| Financial | 5 (accounts, transactions, assets, liabilities, investments, income_streams) | Yes |
| Relationships | 6 (contacts, contact_events, interactions, contact_reminders, reminder_groups, reminder_group_contacts) | Yes |
| Learning | 11 (courses, books, book_chapters, skills, skill_resources, study_sessions, study_topics, topic_reviews, knowledge_notes, flashcard_decks, flashcards, flashcard_reviews) | Yes |
| Study Planner | 5 (study_availability, availability_exceptions, study_plan_batches, scheduled_study_sessions, session_templates) | Yes |
| Language Learning | 7 (languages, language_practice_sessions, language_vocabulary, language_daily_sessions, language_daily_progress, language_recordings, language_weekly_plans, language_base_words, language_video_playlists) | Yes |
| Check-ins | 3 (daily_check_ins, check_in_templates, check_in_template_questions) | Yes |
| Bucket List | 1 | Yes |
| Gamification | 4 (user_profile, achievements, user_achievements, xp_history) | Yes |
| Notifications | 1 | Yes |
| Preferences | 3 (user_preferences, nav_preferences, command_bar_history) | Yes |
| ICS Sync | 2 (ics_feed_configs, ics_synced_events) | Yes |
| FTS (virtual) | 4 | No |
| **Total** | **~72 tables** | **~66 syncable** |

> **⚠ This count is the pre-amendment v1 total.** It does **not** include the owed tables tracked in **§5.20**
> (Stream (i) adds/retires + the 19-module Stream (ii) target schema). The consolidated count is reconciled at the
> build-phase schema session.

---

## 8. Cross-Domain Relationship Map

> **⚠ Pre-amendment v1 map.** The new foundation junctions/edges owed to ADR-002 (universal `entity_tags`, `spaces` /
> `space_enabled_blocks`, the `sessions` spine + extensions, `views`, the capability registry / `block_instances`,
> `capability_grants`, `templates`) are **not** drawn here — they are tracked in **§5.20** and integrated into this map
> at the build-phase schema session.

```
                           ┌──────────────┐
                           │   purposes   │
                           └──────┬───────┘
                    ┌─────────────┼──────────────┐
                    │             │              │
              purpose_habits  purpose_routines  purpose_projects
                    │             │              │
              ┌─────┴──────┐ ┌───┴─────────┐ ┌──┴──────────┐
              │   habits    │ │routine_     │ │  projects    │
              │             │ │actions      │ │              │
              └─────┬───────┘ └─────────────┘ └──────┬───────┘
                    │                                 │
              habit_completions              ┌────────┼────────┐
                    │                     milestones  │   project_docs
              project_habits                  │       │
                                       ┌─────┴───────┘
                                       │    tasks     │◄── parent_task_id (self-ref)
                                       └──────┬──────┘
                                              │
                                        task_time_logs

  ┌─────────┐     ┌──────────────┐
  │ courses │────→│ study_topics │──→ topic_reviews
  └────┬────┘     └──────┬───────┘
       │                 │
  ┌────┴────┐    scheduled_study_sessions ──→ pomodoro_sessions
  │  books  │            │
  └────┬────┘    study_plan_batches
       │
  book_chapters

  ┌────────────┐
  │  contacts  │
  └──────┬─────┘
   ┌─────┼──────────┐
   │     │          │
  events interactions reminders ←── reminder_groups
                                        │
                                 reminder_group_contacts

  ┌───────────┐
  │ languages │
  └─────┬─────┘
  ┌─────┼──────────┬──────────────┬─────────────┐
  │     │          │              │             │
  practice  vocabulary  daily_sessions  weekly_plans  base_words
  sessions                   │              │
                        recordings ←────────┘

  ┌───────┐     ┌──────────────┐
  │ pages │────→│  page_links  │ (bidirectional wiki)
  └───┬───┘     └──────────────┘
      │
  entity_links ──→ task | project | milestone | contact | habit | course | book | ...
      │
  page_tags ──→ tags

  ┌──────────────┐      ┌─────────────┐
  │ user_profile │      │ achievements│
  └──────┬───────┘      └──────┬──────┘
         │                     │
    xp_history          user_achievements

  ┌────────────────┐
  │daily_check_ins │──→ check_in_templates ──→ template_questions
  └────────────────┘

  ┌────────────────────┐
  │    accounts        │
  └────────┬───────────┘
     ┌─────┼──────────┐
     │     │          │
 transactions investments income_streams

  assets    liabilities   (standalone)
```

### Polymorphic Reference Points

| Pattern | Used By | Entity Types |
|---------|---------|-------------|
| `entity_type` + `entity_id` | `entity_links` (notes) | task, project, milestone, contact, habit, course, book, language, purpose, bucket_list_item, transaction |
| `entity_type` + `entity_id` | `pages` | Links a note to any entity |
| `resource_type` + `resource_id` | `skill_resources`, `study_sessions`, `flashcard_decks`, `scheduled_study_sessions` | course, book, topic, homework, article, video, podcast |
| `entity_type` + `entity_id` | `notifications`, `xp_history` | Any entity |
| `entity_type` + `entity_id` | `pomodoro_sessions` | task, task_group, class_note, note, study_session |

---

## 9. Migration Strategy

### 9.1 Schema Versioning

```sql
-- Stored in app_state
INSERT INTO app_state (key, value) VALUES ('schema_version', '1');
```

The application checks `schema_version` on startup and runs pending migrations sequentially. Migrations are TypeScript files in `packages/core/src/db/migrations/`.

### 9.2 Migration File Convention

```
packages/core/src/db/migrations/
├── 001_initial_schema.ts
├── 002_add_study_planner.ts
├── 003_add_language_learning.ts
└── ...
```

Each migration exports `up(db)` and `down(db)` functions with raw SQL statements.

---

## 10. Drizzle ORM Schema

The SQL schema defined in this ADR is the **source of truth**. Drizzle schema files in `packages/core/src/db/schema/` mirror these tables using `sqliteTable()` definitions. Drizzle provides:

- Type-safe queries across all platforms
- Automatic TypeScript type inference (no separate type files needed)
- Migration generation via `drizzle-kit`

Schema files are organized by domain:
```
packages/core/src/db/schema/
├── pages.ts
├── tasks.ts
├── projects.ts
├── habits.ts
├── routines.ts
├── purposes.ts
├── finance.ts
├── contacts.ts
├── learning.ts
├── languages.ts
├── study-planner.ts
├── check-ins.ts
├── bucket-list.ts
├── gamification.ts
├── notifications.ts
├── preferences.ts
├── ics-sync.ts
└── index.ts          -- barrel export
```

---

*This ADR is the single source of truth for the Vida Platform data model. Any schema changes require updating this document.*
