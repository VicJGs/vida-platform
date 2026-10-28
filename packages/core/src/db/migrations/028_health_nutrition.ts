// ============================================================================
// Migration 028 — Health: Nutrition  (DB-4 · group #18 · ADR-002 additions)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The 17th DB-4 Stream (ii)
// domain migration. Mirrors schema/health-nutrition.ts. Authors 6 net-new tables (fresh —
// recovered domain, no v2 schema).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-health-nutrition/_index.md §3/§6.
// 6 tables: nutrition_ingredients · nutrition_dishes · nutritional_plans ·
// daily_meal_plans · meals · shopping_items
//
// Conventions:
// - All 6 = full baseColumns (id·created_at·updated_at·6 _sync_*). NO cross-table FK.
// - deleted_at on `nutritional_plans` ONLY (the floor, structure-data.md:22).
// - 3 FIXED enums → SQL CHECK: MEAL_SOURCE (meals.source) · MEAL_GENERATION_METHOD
//   (daily_meal_plans.generation_method) · FREQUENCY (nutritional_plans.review_frequency).
//   OPEN columns (modality/editable-starter/status) take NO CHECK.
// - money [E] = INTEGER cents (cost, estimated_cost). photo_blob = BLOB [E].
// - NO inline meals.tags (→ entity_tags, SP1). source incl. `ai` (AI6).
// ============================================================================

import type { Migration } from '../adapter'

// Shared baseColumns SQL tail (id·created_at·updated_at·6 _sync_*) — matches _shared.baseColumns.
const BASE = `
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT`

export const migration028HealthNutrition: Migration = {
  version: 28,
  name: 'health_nutrition',
  up: async (driver) => {
    // --- nutrition_ingredients: atomic foods (whole_food_type/functional_area = editable starters, OPEN C5) ---
    await driver.run(`
      CREATE TABLE nutrition_ingredients (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,   -- [E]
        category        TEXT,            -- OPEN no-CHECK
        whole_food_type TEXT,            -- OPEN no-CHECK (editable starter, C5)
        functional_area TEXT,            -- JSON (editable-starter 8-system, C5)
        serving_size    TEXT,            -- [E]
        calories        REAL,
        protein         REAL,
        carbs           REAL,
        fat             REAL,
        fiber           REAL,
        micronutrients  TEXT,            -- [E] JSON
        allergens       TEXT,            -- JSON
        ${BASE}
      )
    `)

    // --- nutrition_dishes: composed dishes ---
    await driver.run(`
      CREATE TABLE nutrition_dishes (
        id                   TEXT PRIMARY KEY,
        name                 TEXT NOT NULL,   -- [E]
        dish_category        TEXT,            -- OPEN no-CHECK
        calories             REAL,            -- per-serving
        protein              REAL,
        carbs                REAL,
        fat                  REAL,
        main_ingredients     TEXT,            -- [E]
        ingredient_refs      TEXT,            -- JSON → ingredients
        functional_area      TEXT,            -- JSON (C5)
        recipe_page_id       TEXT,            -- no-FK; nullable
        cooking_skill_id     TEXT,            -- no-FK; nullable (opt-in, C6)
        source_type          TEXT,            -- OPEN no-CHECK
        performance_benefits TEXT,            -- JSON
        prep_time            INTEGER,         -- minutes
        allergens            TEXT,            -- JSON
        rating               INTEGER,         -- 1-5
        ${BASE}
      )
    `)

    // --- nutritional_plans: strategy — the ONLY soft-deleted table (floor L22) ---
    await driver.run(`
      CREATE TABLE nutritional_plans (
        id                   TEXT PRIMARY KEY,
        name                 TEXT NOT NULL,   -- [E]
        caloric_strategy     TEXT,            -- OPEN no-CHECK (modality)
        dietary_framework    TEXT,            -- OPEN no-CHECK (modality)
        philosophy           TEXT,            -- OPEN no-CHECK (modality)
        daily_calorie_target INTEGER,         -- kcal; nullable
        supplement_protocol  TEXT,            -- JSON
        adherence_target     TEXT,            -- OPEN band text; nullable
        ai_meal_generation   INTEGER NOT NULL DEFAULT 0,   -- 0/1
        review_frequency     TEXT CHECK (review_frequency IN (
                               'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
                             )),
        start_date           TEXT,            -- YYYY-MM-DD; nullable
        end_date             TEXT,            -- YYYY-MM-DD; nullable
        status               TEXT,            -- OPEN no-CHECK
        goal_id              TEXT,            -- no-FK; nullable → Core health_goal (C1)
        deleted_at           INTEGER,         -- the documented floor — nutritional_plans ONLY
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_nutritional_plans_status ON nutritional_plans (status) WHERE deleted_at IS NULL`)

    // --- daily_meal_plans: per-day ---
    await driver.run(`
      CREATE TABLE daily_meal_plans (
        id                  TEXT PRIMARY KEY,
        plan_id             TEXT NOT NULL,   -- no-FK; within-module required parent
        plan_date           TEXT,            -- YYYY-MM-DD
        plan_type           TEXT,            -- OPEN no-CHECK
        generation_method   TEXT NOT NULL DEFAULT 'manual' CHECK (generation_method IN (
                              'manual', 'ai', 'template', 'goal-optimized', 'hybrid'
                            )),
        calorie_target      INTEGER,         -- kcal; nullable
        included_meal_types TEXT,            -- JSON
        completion_rate     REAL,            -- nullable
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_daily_meal_plans_plan ON daily_meal_plans (plan_id)`)

    // --- meals: logged meal instances (NOT a session, C3) ---
    await driver.run(`
      CREATE TABLE meals (
        id              TEXT PRIMARY KEY,
        daily_plan_id   TEXT,            -- no-FK; nullable
        meal_type       TEXT,            -- OPEN no-CHECK
        purpose         TEXT,            -- JSON
        dish_refs       TEXT,            -- JSON → dishes
        scheduled_at    INTEGER,         -- Unix ms; nullable
        source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'import')),
        status          TEXT,            -- OPEN no-CHECK
        target_calories INTEGER,         -- kcal; nullable
        cost            INTEGER,         -- [E] cents; nullable
        satisfaction    INTEGER,         -- 1-10; nullable
        photo_blob      BLOB,            -- [E] inline encrypted binary; nullable
        notes           TEXT,            -- [E]; nullable
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_meals_daily_plan ON meals (daily_plan_id)`)
    await driver.run(`CREATE INDEX idx_meals_scheduled ON meals (scheduled_at)`)

    // --- shopping_items: procurement ---
    await driver.run(`
      CREATE TABLE shopping_items (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,   -- [E]
        item_category   TEXT,            -- OPEN no-CHECK
        item_type       TEXT,            -- OPEN no-CHECK
        source          TEXT,            -- OPEN no-CHECK (procurement, NOT provenance)
        quantity        REAL,            -- nullable
        unit            TEXT,            -- OPEN; nullable
        estimated_cost  INTEGER,         -- [E] cents; nullable
        purchase_status TEXT,            -- OPEN no-CHECK
        storage         TEXT,            -- JSON
        needed_by       TEXT,            -- YYYY-MM-DD; nullable
        meal_ref        TEXT,            -- no-FK; nullable
        ${BASE}
      )
    `)
  },
}
