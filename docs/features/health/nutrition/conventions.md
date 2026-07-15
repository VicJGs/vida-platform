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
  food-DB paths carry source + require opt-in (extension-model). `[FACT HC-10]`
- **`entity_type` additions** (`nutrition_ingredient`·`nutrition_dish`·`nutritional_plan`·`daily_meal_plan`·`meal`·
  `shopping_item`) register in the polymorphic enums. `[INTENT HL10]`

## Completion checklist
- [x] platform + Core inheritance · [x] Nutrition specifics · [x] [FACT/INTENT] · [x] no `{{…}}`
