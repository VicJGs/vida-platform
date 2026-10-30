<!-- Contract — features/health/nutrition · Phase 2 · sources: core/contract.md.
     ⚠ DESIGNED interface — no @vida/core code yet (recovered domain). -->

# Contract — Health: Nutrition

Nutrition's services + seams. **Designed — not yet coded** (`@vida/core/services/health/nutrition/`).

## Exposed services (Nutrition-owned)

- **Libraries** — `upsertIngredient({macros, category, allergens})` · `upsertDish({ingredients[], source_type})`
  (macros auto-sum, HN-1). `[INTENT]`
- **Plan** — `buildPlan({caloric_strategy, framework, target})` (manual, `source=manual`) · `aiGenerateMealPlan(goal)`
  (opt-in — an ADR-015 model call, AI1 `on_device`/`cloud`, AI3 cloud egress+scope-min, X11 split; returns `source=ai`,
  AI6) · `importPlan(prescription|library)` (X1 device-mediated ingest under `external_in_ok`, X5; `source=import`).
  `deriveIntakeTarget(goal, burn)` → dynamic (HN-3). `[INTENT; ADR-014 X1/X5/X11; ADR-015 AI1/AI3/AI6]`
- **Daily plan / Meals** — `generateDailyPlan(method)` (an `ai`/`hybrid` method = an ADR-015 call, `source=ai`, AI6) ·
  `logMeal({type, dishes[], source, cost, when})` · `logMealByPhoto(photo)` (opt-in Block, HN-9 — the photo→macros
  inference splits to ADR-015, X11 "Health photo", AI1 `on_device`-preferred / AI3 cloud, AI5 provenance, `source=ai`
  AI6) · `sumMacros(day)`. `[INTENT; ADR-014 X11; ADR-015 AI1/AI3/AI5/AI6]`
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
  photo-food-logger Block (#8 stub) + the **`entity_tags`** tag primitive (SP1) all nutrition entities tag through.
  **Preferences** — units (kcal/kJ) + dietary defaults. **AI layer** — `ai_connections` (AI2, `mode·provider·encrypted_key
[L2/L3, mediator custody]`, key never in sandbox — consumed, not owned). **External ADRs** — food-DB (X2
  `public-reference`, X3 whole-set) / barcode / photo / prescription import under `external_in_ok`/`external_out_ok`
  (X5, opt-in). `[INTENT; ADR-006 SP1; ADR-015 AI2; ADR-014 X2/X3/X5]`

## Terminal states (per capability)

- **Plan:** planning · active · on-hold · completed. **Daily plan:** planning · assigned · in-progress · completed · modified.
- **Meal:** planned · confirmed · completed · **skipped/substituted**. **Photo log:** analyzing · **fail→manual** (the
  AI1/AI3 model call is isolated — a model/cloud failure never blocks the manual library path).
- **Shopping:** needed · ordered · purchased · **cancelled/substituted**. **AI-gen:** generating · **fail→manual**.
- **External grant:** `ExternalGrantMissing` — a food-DB fetch without `external_in_ok` (or a cloud call without
  `external_out_ok`) **fails closed** (X5); no fetch, no egress, no fabrication.

## Completion checklist

- [x] provides/consumes · [x] terminal states · [x] designed-not-coded · [x] no `{{…}}`
