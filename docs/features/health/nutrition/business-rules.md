<!-- Business rules — features/health/nutrition · Phase 2 · sources: intake/health.md (9 Nutrition DBs) + core/* +
     v1 CR-006. Prefix: HN- (Health Nutrition). -->

# Business Rules — Health: Nutrition

Invariants for the Nutrition pillar. Inherits all Core rules (HC-*). Mostly `[INTENT]` (recovered domain, no v2 code).

- **HN-1 — Compositional macros.** Ingredients hold atomic macros; a Dish's macros = sum of its ingredients; a
  Meal's macros = its dishes/items. **Calories = protein×4 + carbs×4 + fat×9** (CR-006); day total = sum of meals. `[FACT CR-006]`
- **HN-2 — A meal is a logged entity, not a Session.** Meals have a scheduled time + status but no runtime/timer;
  planned meals surface via the scheduler/`dueIn()`, not as `workout`-style sessions. `[INTENT HL6]`
- **HN-3 — Intake is goal-driven and dynamic.** The Nutritional Plan derives a calorie/macro target from the user's
  **Health Goals** (via Nutrition Goal phases) and **recomputes dynamically against each day's burn** (training day
  → eat more) — the Core energy loop. `[INTENT HC-6/HL13]`
- **HN-4 — Nutrition Goals are Core Goals.** A Nutrition Goal phase (fat-loss/muscle-gain/recomp/event-prep) is a
  **Core Health Goal** of type body-composition; Nutrition references it, doesn't own a parallel goal system. `[INTENT HC-3]`
- **HN-5 — Experiments/Responses are Core Adaptation.** Meal-timing/portion/food-choice A/B tests and food-response
  logs are the **Core Adaptation engine** (pillar=nutrition), feeding the derived Profile. `[INTENT HC-7/HC-8]`
- **HN-6 — Authoring triad (with `source` provenance).** A plan / daily-meal-plan is built **by hand** (`source=manual`),
  **by AI** (`AI Meal Generation` / generation-method — an ADR-015 model call in `on_device`/`cloud` modes [AI1], a cloud
  run scope-minimized [AI3], the model call split from the data move [X11]; the row carries `source=ai`, AI6), or
  **imported** — including a **doctor prescription** — as a **device-mediated** ingest (X1) under `external_in_ok` (X5),
  `source=import`, then validated via an Experiment. Manual is always sufficient. `[INTENT HL12/HL14; ADR-014 X1/X5/X11; ADR-015 AI1/AI3/AI6; FACT Notion flags]`
- **HN-7 — Shopping bridges to Finance.** Shopping items + meal costs are **cost events to Finance** (budget); the
  shopping list derives from the day's/period's meal plan. `[INTENT reshape §B]`
- **HN-8 — Life-context aware.** Meals/responses carry a life-context (normal/training/rest/**travel**/social/sick),
  making intake and analysis schedule- and travel-aware. `[INTENT; FACT Notion Life Context]`
- **HN-9 — Photo logging is an opt-in Block (ADR-014/015-layered).** A meal may be logged by photo → an analysis
  capability infers macros. The food-DB behind the libraries is a device-mediated (X1) `public-reference` (X2) whole-set
  bulk import (X3 — "Health food-DB") under `external_in_ok` (X5); the **photo→macros inference splits to ADR-015** (X11 —
  "Health photo"), `on_device`-preferred (AI1; a `cloud` run rides X4 egress + AI3 scope-min), the photo being
  untrusted-origin content whose provenance travels into the prompt (AI5), the inferred row carrying `source=ai` (AI6).
  Manual entry via the libraries is always available (fail→manual). `[INTENT HL14; ADR-014 X1/X2/X3/X5/X11; ADR-015 AI1/AI3/AI5/AI6; FACT HC-10]`
- **HN-10 — Provider seams.** Logged meals + macros + calories consumed → Journal + the Core energy loop;
  adherence/goal progress → Gamification; meal reminders → Notifications. `[INTENT reshape §C]`
- **HN-11 — Medical Profile filters, advisory.** Allergies/intolerances from the Core Medical Profile filter foods
  & plans (using ingredient/dish **Allergens**); conditions + **doctor prescriptions** inform intake targets and
  supplement protocol. Filtering **advises** — flagged with a reason, never forcibly removed; a prescription may
  spawn an Experiment (HC-18). An **imported prescription** is a device-mediated ingest (X1) under `external_in_ok` (X5);
  if a model extracts it, that call splits to ADR-015 (X11) and the untrusted text carries provenance into the prompt
  (AI5). `[INTENT HC-16/HC-18; ADR-014 X1/X5/X11; ADR-015 AI5; FACT Notion Allergens]`
- **HN-12 — Functional axis (system-targeted nutrition).** Ingredients & dishes carry a **`functional_area`** — the
  8-system "area of action" (Digestive & Gut · Immune & Inflammation · Antioxidant & Detox · Cell Repair &
  Mitochondria · Hormonal & Metabolic · Muscular & Structural · Neurological & Cognitive · Systemic Resilience) —
  enabling meals/plans built to serve a body system. Taggable via **`entity_tags`** (SP1, Spaces universal tags). **Ships
  as an editable starter; the taxonomy is pending validation research (R2)** — never hard-coded as truth. `[INTENT CI-3/R2; ADR-006 SP1; FACT Notion 1.0]`
- **HN-13 — Whole-food type.** Ingredients carry a **`whole_food_type`** (leafy-greens/cruciferous/roots/
  bioactive-fruits/nuts-seeds/legumes/whole-grains/animal-proteins/spices/functional-beverages) — a whole-food
  classification for grouping/filtering. Editable starter. `[INTENT CI-3; FACT Notion 1.0]`
- **HN-14 — Cooking-as-skill is OPT-IN.** By default a dish is documented data (+ an optional recipe **page**). If
  the user **enables cooking tracking**, a dish gains a learn-to-cook status modeled as a **Skill/Knowledge object**
  (#2) — otherwise cooking is untracked. Never forced. `[INTENT CI-3]`
- **HN-15 — External + AI + tag paths are ADR-014/015/006-layered (the mechanical contract).** The food-DB/barcode is a
  device-mediated `public-reference` whole-set bulk ingest (X1/X2/X3, "Health food-DB") under **`external_in_ok`**; AI
  meal-generation + photo analysis are ADR-015 model calls (X11, "Health photo") in `on_device`/`cloud` modes (AI1,
  server-blind), a `cloud` run = X4 egress + AI3 scope-min, untrusted photo/import content carrying provenance into any
  prompt (AI5); every AI-generated row carries `source=ai` (AI6); all nutrition entities tag via **`entity_tags`** (SP1),
  never an inline column. **No AI4 agent envelope** — generation/analysis is a scoped, fail→manual model call, not a
  tool-wielding actor; **no new grant column/table** — `external_*_ok` are existing ADR-010 fields (X5). `[INTENT: ADR-014 X1/X2/X3/X4/X5/X9/X11; ADR-015 AI1/AI3/AI5/AI6; ADR-006 SP1; AI4 N/A]`

## Terminal states
Ingredient/Dish library (empty) · Plan (planning · active · on-hold · completed) · Daily plan (planning · assigned ·
in-progress · completed · **modified**) · Meal (planned · confirmed · completed · **skipped/substituted**) · Shopping
(needed · ordered · purchased · **cancelled/substituted**) · AI-generation (**fail→manual**) · Photo (analyzing · **fail→manual**).

## Completion checklist
- [x] rules + [FACT/INTENT] · [x] terminal states · [x] Core inheritance · [x] no `{{…}}`
