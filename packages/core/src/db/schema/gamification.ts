// ============================================================================
// DB-4 group #21 — Gamification ("the System")  (schema/gamification.ts · mirrors migration 031)
// The heaviest INTENDED reframe (ADR-012 "Points Economy & Consequence Engine"),
// but almost none of it is schema: the economy spine (currencies · consequence_ledger
// · store · rules) is already-authored DB-3 substrate (foundation/economy.ts), and the
// rule→consequence engine / typed effects / multi-currency derivation are service logic
// (M1.1+). This authors the 3 surviving §5.15 FACT-floor tables (xp_history RETIRED →
// consequence_ledger). Nullability = the entities/user.ts interface (the $inferSelect
// oracle), NOT the stale §5.15 DDL body.
//
// - user_profile (singleton): the ADR-012 §3.10 post-split residual — System-owned XP/level
//   caches + PII + the fields no sibling took. Drops persona/motivation_style/active_modules/
//   onboarding_completed (→ Preferences #2) + check_in_streak* (→ Check-ins #16, DERIVED).
// - achievements: app-defined STATIC SEED — the FIRST non-syncable table (no _sync_*/updated_at/
//   deleted_at; the Achievement interface extends neither Syncable nor SyncMetadata). Seeded,
//   NOT written via the sync Repository (an M1.1 seeding-path concern).
// - user_achievements: the earned-join (SyncMetadata: id + syncColumns, no created_at/updated_at),
//   UNIQUE(achievement_id), no-FK.
//
// Spec: docs/specs/foundation/db-4-gamification/_index.md §3.
// ============================================================================

import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'
import { ACHIEVEMENT_CATEGORY, ACHIEVEMENT_TIER } from '@vida/types'
import { baseColumns, syncColumns, uuidPk, enumText, boolInt, timestampMs } from './_shared'

// --- user_profile: singleton; the ADR-012 §3.10 post-split residual -----------
export const userProfile = sqliteTable('user_profile', {
  ...baseColumns,
  life_stage: text('life_stage'), // nullable (interface string|null); stays by elimination
  /** @encrypted [E] — JSON array */
  focus_areas: text('focus_areas').notNull().default('[]'), // interface string[] → NOT NULL
  /** @encrypted [E] PII — stays until an account/identity entity exists (§3.10) */
  display_name: text('display_name'),
  /** @encrypted [E] PII */
  avatar_url: text('avatar_url'),
  /** @encrypted [E] PII — YYYY-MM-DD */
  birth_date: text('birth_date'),
  timezone: text('timezone').notNull().default('UTC'), // interface string → NOT NULL
  total_xp: integer('total_xp').notNull().default(0), // cache (GM-4); derived from consequence_ledger
  current_level: integer('current_level').notNull().default(1), // cache (GM-4)
  skipped_modules: text('skipped_modules').notNull().default('[]'), // interface string[] → NOT NULL, JSON array
  // NO persona/motivation_style/active_modules/onboarding_completed (→ Preferences #2)
  // NO check_in_streak*/last_check_in_date (→ Check-ins #16, DERIVED)
  // NO deleted_at (§5.15 floor; singleton)
})

// --- achievements: app-defined STATIC SEED (non-syncable) — §5.15 -------------
// The FIRST non-syncable table: id + fields + created_at ONLY (no _sync_*, no
// updated_at, no deleted_at — the Achievement interface extends neither Syncable
// nor SyncMetadata, user.ts:67-79). Seeded app content, not written via the sync Repository.
export const achievements = sqliteTable('achievements', {
  id: uuidPk(),
  key: text('key').notNull().unique(),
  category: enumText('category', ACHIEVEMENT_CATEGORY).notNull(), // FIXED → SQL CHECK (9)
  tier: enumText('tier', ACHIEVEMENT_TIER).notNull().default('bronze'), // FIXED → SQL CHECK (4); interface non-null
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon'),
  xp_reward: integer('xp_reward').notNull().default(0),
  condition: text('condition'), // JSON: trigger conditions (GM-13 predicate; evaluated by service)
  is_secret: boolInt('is_secret').notNull().default(false),
  created_at: timestampMs('created_at').notNull(),
})

// --- user_achievements: the earned-join (SyncMetadata) — §5.15 ----------------
// id + syncColumns ONLY (NO created_at/updated_at — UserAchievement extends
// SyncMetadata, user.ts:81-86). No deleted_at.
export const userAchievements = sqliteTable(
  'user_achievements',
  {
    id: uuidPk(),
    achievement_id: text('achievement_id').notNull(), // no-FK (was CASCADE); app-layer
    earned_at: timestampMs('earned_at').notNull(),
    progress: text('progress'), // JSON: partial progress
    ...syncColumns,
  },
  (t) => [unique('uq_user_achievements_achievement').on(t.achievement_id)],
)

// --- inferred row types ------------------------------------------------------
export type UserProfileRow = typeof userProfile.$inferSelect
export type UserProfileInsert = typeof userProfile.$inferInsert
export type AchievementRow = typeof achievements.$inferSelect
export type AchievementInsert = typeof achievements.$inferInsert
export type UserAchievementRow = typeof userAchievements.$inferSelect
export type UserAchievementInsert = typeof userAchievements.$inferInsert
