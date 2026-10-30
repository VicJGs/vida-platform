<!-- Conventions — features/health/training · Phase 2 · sources: core/conventions.md +
     platform baselines. Training-specific patterns on top of Core + platform. -->

# Conventions — Health: Training

Inherits platform baselines + Core conventions (`../core/conventions.md`). Training specifics:

- **A workout is a Session, extended.** Model performed workouts as a `workout` sub-type row in `sessions` +
  a `workout_sessions` extension (ADR-004 table-per-type) — never a standalone workout table. `[FACT ADR-004]`
- **Catalog vs instance naming.** Definitions: `exercises` · `exercise_plans` · `workout_templates`. Instances:
  `workout_sessions` · `workout_sets`. Keep the template↔instance boundary explicit. `[INTENT]`
- **Performance is Core, not local.** Emit 1RM/volume/PR as `health_metric_values` (source=derived); never keep a
  parallel Training KPI store. `[INTENT HC-1/HT-5]`
- **Technique + protocols by reference.** Exercise technique → a Knowledge object; Testing/Recovery protocols →
  Knowledge (kind=`protocol`). Reference by id. `[INTENT HC-12]`
- **Modality = enum/tag.** Training focus · workout type · movement pattern · set structure · exercise category are
  properties; add a value, not a table. `[INTENT HT-7]`
- **Units canonical, Preferences-displayed** (kg/lb). Weight/distance stored SI. `[INTENT HC-11]`
- **AI/import fields carry `ai_generated`/source + consent.** Generated or imported plans/templates are labeled and
  opt-in (extension-model). `[FACT HC-10]`
- **`entity_type` additions** (`exercise`·`exercise_plan`·`workout_session`·`workout_set`) register in the
  polymorphic enums so pages/tags/links work uniformly. `[INTENT HL10]`

## Completion checklist

- [x] platform + Core inheritance noted · [x] Training specifics · [x] [FACT/INTENT] · [x] no `{{…}}`
