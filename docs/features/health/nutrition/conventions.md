<!-- Conventions — features/health/nutrition · Phase 2 · sources: intake/health.md + core/conventions.md +
     platform baselines. Nutrition-specific patterns on top of Core + platform. -->

# Conventions — Health: Nutrition

Inherits platform baselines + Core conventions (`../core/conventions.md`). Nutrition specifics:

- **Compositional macro chain.** Ingredient (atomic) → Dish (sum of ingredients) → Meal (sum of dishes). Store
  atomic macros once; compute upward — never denormalize a dish's macros as source truth. `[INTENT HN-1]`
- **A meal is logged, not a session.** Meals are scheduled log entities (use `dueIn()` for planning) — do NOT model
  as a `workout`-style session sub-type. `[INTENT HN-2]`
- **Money in cents.** `cost` / `estimated_cost` are INTEGER cents (platform money rule), encrypted; surfaced to
  **Finance** as cost events. `[INTENT HN-7]`
- **Goals/experiments live in Core.** Nutrition Goal phases → `health_goals`; A/B tests + food responses → the Core
  Adaptation engine (pillar=nutrition). Reference by id; no parallel stores. `[INTENT HN-4/HN-5]`
- **Intake target is derived + dynamic.** Compute from Goals + burn each day (HC-6); the stored target is a cache. `[INTENT HN-3]`
- **Modality = enum/tag.** Caloric strategy · dietary framework · philosophy · meal type · source are properties. `[INTENT]`
- **Extension fields labeled + consent-gated.** `ai_meal_generation`, photo-`photo_blob`, imported-prescription and
  food-DB paths carry source + require opt-in (extension-model): food-DB = X1 device-mediated / X2 `public-reference` /
  X3 whole-set under `external_in_ok` (X5, X9 revocation); AI meal-gen + photo = ADR-015 model calls (AI1 `on_device`/
  `cloud`, AI3 cloud egress+scope-min, X11 split); every AI-generated row = `source=ai` (AI6, the `manual|ai|import`
  triad — the model leg accepts `ai`/`llm`, don't normalize); imported = `source=import`. `[FACT HC-10; INTENT: ADR-014 X1/X2/X3/X5/X9/X11; ADR-015 AI1/AI3/AI6]`
- **Tags ride `entity_tags`, never an inline column.** All nutrition entities tag via the Spaces `entity_tags` primitive
  (SP1); the `entity_type` additions (`nutrition_ingredient`·`nutrition_dish`·`nutritional_plan`·`daily_meal_plan`·`meal`·
  `shopping_item`) **register** in the SP2 **open** `entity_type` registry (no `CHECK` enum). `[INTENT HL10; ADR-006 SP1/SP2]`

## Pitfalls / local "never do"
- **Never route the food-DB fetch or the AI call through the server** — device-mediated / BYO-key, server-blind (X1 / AI1).
- **Never auto-transmit a cloud photo/generation** — it is a user-consented X4 egress under `external_out_ok` (X5); **never send more than the scope-minimized slice** (AI3).
- **Never model a meal as a session** — a meal is a scheduled/logged entity via `dueIn()` (HN-2), not a `workout` sub-type.
- **Never build an agentic AI actor here** — meal-gen/photo analysis is a scoped, fail→manual model call, not an AI4 tool-envelope agent (the agentic-actor contract is Projects').
- **Never hard-code the functional / whole-food taxonomy as truth** — both ship as editable starters, pending research (R2).
- **Never tag via an inline column** — all tags ride `entity_tags` (SP1); `entity_type` registers in the open SP2 registry.

## Completion checklist
- [x] platform + Core inheritance · [x] Nutrition specifics · [x] [FACT/INTENT] · [x] no `{{…}}` · [x] pitfalls (X1/AI1/X4/AI3/SP1 landmines)
