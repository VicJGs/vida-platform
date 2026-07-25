<!-- Identity — features/health/nutrition · Phase 2 · sources: docs/intake/health.md (⭐⭐ 18-DB Notion: 9 Nutrition
     DBs) + health/core/*. Health has NO v2 schema (recovered domain). -->

# Identity — Health: Nutrition  (level: Feature / Health pillar 2 of 2)

**What it is.** The **Nutrition pillar** — the *fuel* lever on the body. Composed **libraries** (Ingredients →
Dishes), a strategic **Nutritional Plan**, **Daily Meal Plans**, logged **Meals**, a **Shopping** list, and the
food-side of the Adaptation engine (Experiments, Responses). It computes **what to eat** from the user's Goals and
**recomputes intake dynamically** against training burn. `[INTENT: 9 Nutrition DBs; Victor Vision]`

**The desire behind it.** The user wants nutrition that *serves his training and body goals on a healthy path* —
intake targets derived from goals + calories burned, a personal food/dish library, meals that fit real life
(homemade · restaurant · meal-prep · travel), and the freedom to **test what actually works on his body** (meal
timing, portions, food choices) or follow a **doctor's prescription** and validate it. He thinks about food
**functionally** — by *which body system it serves* (gut · immune · hormonal · cognitive · …) and by *whole-food
type* — and treats **cooking as something he can choose to learn**. Flexible enough to keep tracking while traveling
— including logging a meal by **photo**. `[INTENT: Victor Vision + Notion 1.0 functional axis + CI-3]`

**What it owns.** `[INTENT]`
- **Ingredient library** (`Nutrition Ingredients`) — atomic foods: macros · fiber · micronutrients · category ·
  allergens · **whole-food type** (leafy-greens/cruciferous/roots/bioactive-fruits/nuts-seeds/legumes/whole-grains/
  animal-proteins/spices/functional-beverages) · **functional area** (the 8-system "area of action" — editable starter). `[INTENT CI-3]`
- **Dish library** (`Nutrition Dishes`) — composed dishes: macros/serving · ingredients · **source type**
  (homemade/restaurant/meal-prep/…) · performance benefits · **functional area** · prep · rating · an **optional
  recipe** (a page) and an **optional cooking-skill** track (opt-in — see What it is NOT). `[INTENT CI-3]`
- **Nutritional Plan** (`Nutritional Plan`) — strategy: **caloric strategy** (deficit/surplus/maintenance/cycling)
  · **dietary framework** (omnivore/keto/mediterranean/IF/…) · philosophy · calorie target · **supplement
  protocol** · **adherence target** · `AI Meal Generation`.
- **Daily Meal Plan** (`Daily Meal Plans`) — per-day plan with **generation method** (manual/AI/template/
  goal-optimized/hybrid).
- **Meal** instances (`Meal Assignments`) — logged meals: type · **purpose** · scheduled time · **source**
  (`manual|ai|import` provenance, AI6) · **cost** · satisfaction · tagged via **`entity_tags`** (SP1, not an inline field).
- **Shopping** (`Shopping Cart`) — procurement: item · source · cost · purchase status · storage.

**What it composes (borrows).** `[FACT: reshape §B]`
- **Core** — **Health Goals** (Nutrition Goal phases = body-composition goals) · the **energy loop** (intake
  recomputes vs burn, HC-6) · the **Adaptation engine** (Experiments + Responses, pillar=nutrition).
- **Finance** — meal/shopping **cost**. **Scheduler/`dueIn()`** — planned meals → agenda (a meal is scheduled,
  not a Session). **Knowledge** — dishes/ingredients as a kind. **Spaces** — the photo-food-logger Block.
  **Preferences** — units (kcal/kJ), dietary defaults. **Spaces** also owns the tag primitive **`entity_tags`** (SP1) the
  photo-food-logger Block and all nutrition entities tag through; the Block's photo→macros step is an ADR-015 model call
  (X11 split; AI1 `on_device`-preferred).

**What it is NOT.**
- **Not a Session.** A meal is a **logged/scheduled entity** — no runtime/timer — so it uses the scheduler but is
  not a `workout`-style sub-type. `[INTENT HL6]`
- **Not the goal/metric owner.** Nutrition Goals + macro targets are **Core** (specialize Purposes); Nutrition
  references them. `[INTENT HC-3]`
- **Not the experiment engine.** Experiments/Responses are the **Core Adaptation engine** (pillar=nutrition). `[INTENT HC-7]`
- **Not an external food service.** Food-DB / barcode / **photo analysis** = opt-in extension-model layers on the
  manual Ingredient/Dish core: the food-DB is a **device-mediated** (X1), **`public-reference`** (X2), **whole-set bulk**
  (X3 — "Health food-DB") import under **`external_in_ok`** (X5); a barcode is a lookup against that local copy; photo
  analysis **splits to ADR-015** (X11 — "Health photo"), `on_device`-preferred (AI1). `[FACT HC-10; INTENT: ADR-014 X1/X2/X3/X5/X11; ADR-015 AI1]`
- **Not a forced cooking tracker.** By default a dish is **just documented** (+ an optional recipe page). **Cooking
  becomes a tracked Skill/Knowledge only if the user opts in** — then a dish carries a learn-to-cook status. `[INTENT CI-3]`
- **Not the owner of the functional taxonomy's truth.** The 8-system "area of action" ships as an **editable starter**;
  its scientific shape is **pending research** (may be reshaped). `[INTENT CI-3/R2]`

## Completion checklist
- [x] what/desire/owns/composes/NOT filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}`
