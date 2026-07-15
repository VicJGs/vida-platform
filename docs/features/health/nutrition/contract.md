<!-- Contract — features/health/nutrition · Phase 2 · sources: intake/health.md §C + core/contract.md.
     ⚠ DESIGNED interface — no @vida/core code yet (recovered domain). -->

# Contract — Health: Nutrition

Nutrition's services + seams. **Designed — not yet coded** (`@vida/core/services/health/nutrition/`).

## Exposed services (Nutrition-owned)
- **Libraries** — `upsertIngredient({macros, category, allergens})` · `upsertDish({ingredients[], source_type})`
  (macros auto-sum, HN-1). `[INTENT]`
- **Plan** — `buildPlan({caloric_strategy, framework, target})` (manual) · `aiGenerateMealPlan(goal)` (opt-in) ·
  `importPlan(prescription|library)` (extension). `deriveIntakeTarget(goal, burn)` → dynamic (HN-3). `[INTENT]`
- **Daily plan / Meals** — `generateDailyPlan(method)` · `logMeal({type, dishes[], source, cost, when})` ·
  `logMealByPhoto(photo)` (opt-in Block, HN-9) · `sumMacros(day)`. `[INTENT]`
- **Shopping** — `buildShoppingList(period)` (from meal plans) · `markPurchased(item)` → Finance cost event. `[INTENT HN-7]`

## PROVIDES →
- **Core** — calories consumed (energy loop) · Nutrition Goal progress · nutrition Experiments/Responses (Adaptation). `[INTENT]`
- **Journal** — meals + macros logged per date. **Finance** — meal/shopping cost. **Gamification** — adherence/goal.
  **Notifications** — meal reminders. **Scheduler/`dueIn()`** — planned meals → agenda (not a Session). `[INTENT §C; HN-2]`

## CONSUMES ←
- **Core** — Health Goals (intake target source) · energy loop (burn input) · Adaptation engine (experiments/
  responses) · Health Metrics (weight/body-comp for target recompute) · **Medical Profile** (allergy/condition/
  prescription filter via Allergens — advisory). `[INTENT HC-3/HC-6/HC-7/HC-16]`
- **Finance** — budget context for cost. **Knowledge** — dishes/ingredients as a kind (optional). **Spaces** —
  photo-food-logger Block (#8 stub). **Preferences** — units (kcal/kJ) + dietary defaults. **AI/external ADRs** —
  food-DB/barcode/photo/prescription import (opt-in). `[INTENT]`

## Terminal states (per capability)
- **Plan:** planning · active · on-hold · completed. **Daily plan:** planning · assigned · in-progress · completed · modified.
- **Meal:** planned · confirmed · completed · **skipped/substituted**. **Photo log:** analyzing · **fail→manual**.
- **Shopping:** needed · ordered · purchased · **cancelled/substituted**. **AI-gen:** generating · **fail→manual**.

## Completion checklist
- [x] provides/consumes · [x] terminal states · [x] designed-not-coded · [x] no `{{…}}`
