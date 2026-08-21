// ============================================================================
// Domain tables: Relationships (CRM) — DB-4 · group #14 · ADR-002 §5.9
//
// The platform's personal CRM — the PII-heaviest module. The 6 §5.9 owned tables
// (authored fresh in the hand-written ADR-016 model; they lived in the pre-rebuild
// monolith) + 2 net-new network tables (G2). Every shape is doc-determined; zero
// build-decisions, consistent with groups #1–#12.
//
// DDL model (ADR-016 §3.5): CHECK + indexes live in the hand-written SQL migration
// (migrations/025_relationships.ts). These Drizzle objects are the type-safe QUERY mirror.
//
// Shape (spec docs/specs/foundation/db-4-relationships/_index.md):
// - NO cross-table FK — contact_id / reminder_group_id / network_group_id are plain TEXT
//   (no-FK, superseding §5.9's REFERENCES/CASCADE/SET NULL). Cascade/orphan (RL-2) = app/sync-layer.
// - FIXED enums → SQL CHECK from the @vida/types tuple. OPEN vocab (closeness_tier =
//   Preferences-defined, contract.md:31) = plain TEXT, no CHECK ([[open-vocab-columns-take-no-sql-check]]).
// - deleted_at on `contacts` ONLY (§5.9 floor; children/ledgers/groups cascade or use is_active;
//   the habit_completions/routine_completions ledger precedent, HB-11/RT-17).
// - Junctions = synthetic id PK + baseColumns + UNIQUE(pair) + reverse index (the live
//   entity_tags-v2 junction convention, project_habits:29-30 — NOT §5.9's composite PK).
// - Inline contacts.tags RETIRED → entity_tags (G10, SP1); social_links KEPT (typed JSON, C4).
//
// Build-phase amendments authored now (settled intent, intake §Resolution WHOLE):
//   contacts.how_we_met[E] (G8) · contacts.closeness_tier (G4, OPEN) · interactions.energy_given/
//   energy_received (INT, plaintext) + key_takeaways[E] (G8) · contact_reminders.is_snoozed/
//   snoozed_until/priority (G8) · reminder_groups.anchor_type/anchor_days_before (G11) ·
//   network_groups + network_group_contacts (G2).
//
// OUT (owned elsewhere / cite-not-author): notification delivery (N1/N2, Notifications-owned);
// device-import/import_staging (X1/X8, ADR-014 service); health-compute/closeness-banding (service,
// derived — NO measurement_kind/binding_mode, C1); Sigma.js graph; Gamification streak (C2). @vida/types
// interface reconcile → DB-11.
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — EMPTY [E] set in M1.0 (pass-through).
// ============================================================================

import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'
import {
  RELATIONSHIP_TYPE,
  INTERACTION_TYPE,
  SENTIMENT,
  CONTACT_EVENT_TYPE,
  REMINDER_GROUP_ANCHOR,
  FREQUENCY,
  PRIORITY,
} from '@vida/types'
import { baseColumns, enumText, boolInt, calendarDate } from './_shared'

// --- contacts: the person — §5.9 -------------------------------------------
export const contacts = sqliteTable('contacts', {
  ...baseColumns,
  /** @encrypted [E] — PII */
  first_name: text('first_name').notNull(),
  /** @encrypted [E] — PII */
  last_name: text('last_name'),
  /** @encrypted [E] — PII */
  nickname: text('nickname'),
  relationship_type: enumText('relationship_type', RELATIONSHIP_TYPE).default('acquaintance'), // FIXED → SQL CHECK
  /** @encrypted [E] — PII */
  email: text('email'),
  /** @encrypted [E] — PII */
  phone: text('phone'),
  /** @encrypted [E] */
  avatar_url: text('avatar_url'),
  /** @encrypted [E] — PII */
  company: text('company'),
  /** @encrypted [E] — PII */
  job_title: text('job_title'),
  /** @encrypted [E] — PII */
  location: text('location'),
  /** @encrypted [E] — PII, YYYY-MM-DD */
  birthday: calendarDate('birthday'),
  /** @encrypted [E] — NEW (G8) */
  how_we_met: text('how_we_met'),
  /** @encrypted [E] — JSON {linkedin?, twitter?, instagram?, whatsapp?}; KEPT (C4) */
  social_links: text('social_links'),
  closeness_tier: text('closeness_tier'), // NEW (G4); OPEN (Preferences-defined), no CHECK, nullable
  stay_in_touch_frequency: enumText('stay_in_touch_frequency', FREQUENCY), // FIXED → SQL CHECK (nullable)
  stay_in_touch_days: integer('stay_in_touch_days'),
  last_interaction_date: calendarDate('last_interaction_date'), // derived cache (RL-3)
  next_contact_date: calendarDate('next_contact_date'), // derived cache
  interaction_count: integer('interaction_count').notNull().default(0),
  is_favorite: boolInt('is_favorite').notNull().default(false),
  deleted_at: integer('deleted_at'),
  // NOTE: inline `tags` RETIRED → entity_tags (G10, SP1). No tags column. No name index (both [E]).
})

// --- contact_events: dates per person — §5.9 -------------------------------
export const contactEvents = sqliteTable(
  'contact_events',
  {
    ...baseColumns,
    contact_id: text('contact_id').notNull(), // no-FK (was CASCADE); app-layer RL-2
    event_type: enumText('event_type', CONTACT_EVENT_TYPE).notNull().default('custom'), // FIXED → SQL CHECK
    event_date: calendarDate('event_date').notNull(), // YYYY-MM-DD or MM-DD (year-agnostic)
    /** @encrypted [E] */
    title: text('title'),
    /** @encrypted [E] */
    description: text('description'),
    is_recurring: boolInt('is_recurring').notNull().default(true),
    reminder_days: text('reminder_days'), // JSON array [1,3,7]
    // NO deleted_at (child of contact; RL-2 cascade)
  },
  (t) => [index('idx_contact_events_contact').on(t.contact_id)],
)

// --- interactions: the contact log/ledger — §5.9 (+ G8 restored) -----------
export const interactions = sqliteTable(
  'interactions',
  {
    ...baseColumns,
    contact_id: text('contact_id').notNull(), // no-FK (was CASCADE)
    interaction_type: enumText('interaction_type', INTERACTION_TYPE).notNull().default('in_person'), // FIXED → SQL CHECK
    date: calendarDate('date').notNull(),
    duration_minutes: integer('duration_minutes'),
    /** @encrypted [E] */
    summary: text('summary'),
    sentiment: enumText('sentiment', SENTIMENT), // FIXED → SQL CHECK (nullable)
    follow_up_needed: boolInt('follow_up_needed').notNull().default(false),
    follow_up_date: calendarDate('follow_up_date'),
    /** @encrypted [E] */
    follow_up_notes: text('follow_up_notes'),
    energy_given: integer('energy_given'), // NEW (G8); plaintext analytic (sentiment/duration precedent)
    energy_received: integer('energy_received'), // NEW (G8); plaintext analytic
    /** @encrypted [E] — NEW (G8), free text (summary precedent) */
    key_takeaways: text('key_takeaways'),
    // NO deleted_at — the interactions ledger (RL-3); hard-deletes with the contact
    // (habit_completions/routine_completions precedent, HB-11/RT-17).
  },
  (t) => [
    index('idx_interactions_contact').on(t.contact_id),
    index('idx_interactions_date').on(t.date),
  ],
)

// --- contact_reminders: per-person reminders — §5.9 (+ G8 snooze/priority) --
export const contactReminders = sqliteTable('contact_reminders', {
  ...baseColumns,
  contact_id: text('contact_id').notNull(), // no-FK (was CASCADE)
  reminder_group_id: text('reminder_group_id'), // no-FK (was SET NULL); nullable
  /** @encrypted [E] */
  title: text('title').notNull(),
  reminder_date: calendarDate('reminder_date'),
  is_recurring: boolInt('is_recurring').notNull().default(false),
  frequency: enumText('frequency', FREQUENCY), // FIXED → SQL CHECK (nullable)
  is_completed: boolInt('is_completed').notNull().default(false),
  is_snoozed: boolInt('is_snoozed').notNull().default(false), // NEW (G8)
  snoozed_until: calendarDate('snoozed_until'), // NEW (G8); nullable
  priority: enumText('priority', PRIORITY), // NEW (G8); FIXED → SQL CHECK (nullable, no default)
  // NO deleted_at (child of contact; is_completed governs lifecycle)
})

// --- reminder_groups: batch reminders — §5.9 (+ G11 event-anchor) ----------
export const reminderGroups = sqliteTable('reminder_groups', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  /** @encrypted [E] */
  message_template: text('message_template'),
  time_of_day: text('time_of_day'), // HH:MM
  frequency: enumText('frequency', FREQUENCY), // FIXED → SQL CHECK (nullable)
  days_of_week: text('days_of_week'), // JSON array [0-6]
  is_active: boolInt('is_active').notNull().default(true),
  anchor_type: enumText('anchor_type', REMINDER_GROUP_ANCHOR).notNull().default('schedule'), // NEW (G11); FIXED → SQL CHECK
  anchor_days_before: integer('anchor_days_before'), // NEW (G11); days before a member's birthday when anchor_type='birthday'
  // NO deleted_at (is_active governs lifecycle — FACT-floor pattern)
})

// --- reminder_group_contacts: group↔contact junction — §5.9 (RESHAPE v2) ---
export const reminderGroupContacts = sqliteTable(
  'reminder_group_contacts',
  {
    ...baseColumns, // synthetic id PK (project_habits v2 shape — NOT §5.9's composite PK)
    reminder_group_id: text('reminder_group_id').notNull(), // no-FK (was CASCADE)
    contact_id: text('contact_id').notNull(), // no-FK (was CASCADE)
  },
  (t) => [
    unique('uq_reminder_group_contacts').on(t.reminder_group_id, t.contact_id),
    index('idx_reminder_group_contacts_contact').on(t.contact_id), // reverse lookup (group_id covered by the UNIQUE)
  ],
)

// ============================================================================
// --- Networks (net-new — G2) ------------------------------------------------
// A contact belongs to MANY networks (RL-4); each network gets a standalone page
// + derived health. Description → a `pages` row (entity_type='network', G9) — no
// description column. Health derived (RL-5) — no stored column. The neural graph
// draws contact→network membership edges (G3) from network_group_contacts.
// ============================================================================

// --- network_groups: a network of people (net-new — G2) --------------------
export const networkGroups = sqliteTable('network_groups', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  is_active: boolInt('is_active').notNull().default(true),
  // NO deleted_at (mirrors reminder_groups: is_active governs lifecycle)
})

// --- network_group_contacts: network↔contact junction (net-new — G2/RL-4) --
export const networkGroupContacts = sqliteTable(
  'network_group_contacts',
  {
    ...baseColumns, // synthetic id PK (project_habits v2 shape)
    network_group_id: text('network_group_id').notNull(), // no-FK
    contact_id: text('contact_id').notNull(), // no-FK
  },
  (t) => [
    unique('uq_network_group_contacts').on(t.network_group_id, t.contact_id),
    index('idx_network_group_contacts_contact').on(t.contact_id), // reverse lookup
  ],
)

// --- inferred row types ------------------------------------------------------
export type ContactRow = typeof contacts.$inferSelect
export type ContactInsert = typeof contacts.$inferInsert
export type ContactEventRow = typeof contactEvents.$inferSelect
export type ContactEventInsert = typeof contactEvents.$inferInsert
export type InteractionRow = typeof interactions.$inferSelect
export type InteractionInsert = typeof interactions.$inferInsert
export type ContactReminderRow = typeof contactReminders.$inferSelect
export type ContactReminderInsert = typeof contactReminders.$inferInsert
export type ReminderGroupRow = typeof reminderGroups.$inferSelect
export type ReminderGroupInsert = typeof reminderGroups.$inferInsert
export type ReminderGroupContactRow = typeof reminderGroupContacts.$inferSelect
export type ReminderGroupContactInsert = typeof reminderGroupContacts.$inferInsert
export type NetworkGroupRow = typeof networkGroups.$inferSelect
export type NetworkGroupInsert = typeof networkGroups.$inferInsert
export type NetworkGroupContactRow = typeof networkGroupContacts.$inferSelect
export type NetworkGroupContactInsert = typeof networkGroupContacts.$inferInsert
