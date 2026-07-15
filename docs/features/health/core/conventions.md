<!-- Conventions — features/health/core · Phase 2 · sources: docs/intake/health.md + platform conventions
     (CLAUDE.md / ADR-002). Health-Core-specific patterns on top of the platform baseline. -->

# Conventions — Health: Core

Platform baselines apply (UUIDv7 PK · Unix-ms timestamps · `YYYY-MM-DD` dates · money cents · INTEGER booleans ·
`_sync_*` on syncable tables · soft-delete · no inline `notes` columns · enums = SQL CHECK + canonical Zod in
`@vida/core`). Health-Core specifics:

- **Metric is the unit of measurement.** Anything tracked-over-time (body/performance/test/biomarker) is a
  `health_metric` + values — never a bespoke column. New tracked attribute = a new metric row, not a schema change. `[INTENT Fork 1]`
- **Direction is mandatory.** Every metric declares `higher-better` / `lower-better` so progress %/trend is
  computable (no metric without a direction). `[INTENT HC-1]`
- **Derived over stored.** Goal `progress`, Profiles, Role `mastery`, and **derived metrics** (1RM·BMR·BEE·LBM·
  body-fat-mass — declared via the metric's `formula`, computed on-device) are **computed** from source data; stored
  values are caches, source rows are truth. `[INTENT HC-3/HC-8/HC-21]`
- **Monitoring groups metrics — it never re-stores them.** Health Domains ⊃ Factors are a grouping layer; a Factor
  result IS a `health_metric_value`. Exams schedule + feed metric values, they don't hold a parallel result store. `[INTENT HC-19/HC-20]`
- **Units canonical + Preferences-displayed.** Store SI-canonical (kg·cm·kcal); display per `user_preferences`
  (kg/lb·cm/in). `[INTENT HC-11]`
- **Modality is a property, not a table.** Training focus / dietary framework / Physical-Role type are enum/tag
  dimensions — never spawn a table per modality. `[INTENT "finer levers on one spine"]`
- **Compose the foundations by reference.** Reference Sessions/Knowledge/Purposes/Finance entities by id; never
  duplicate their data. Protocols live in Knowledge; workouts in Sessions; cost in Finance. `[INTENT HC-12/HC-13]`
- **Pillars/Physical-Roles are Spaces; loggers are Blocks.** "Training"/"Nutrition"/"Muay-Thai" surfaces = universal
  tags + saved views (Spaces #8); workout-logger + photo-capture = capability Blocks. `[INTENT]`
- **Extension paths are consent-gated + labeled.** Any field/flow fed by AI/wearable/food-DB/photo/prescription/
  curated-import carries its `source` and is only populated after opt-in consent (extension-model). `[FACT ZK-1; HC-10]`
- **Egress is the sharpest gate.** INPUT integrations ingest into the vault; **OUTPUT to external/medical services is
  data egress** — a distinct, stricter consent + egress guard (data leaves the ZK vault). Intent-only until built. `[INTENT HC-22/R4]`
- **Advisory, never blocking.** Safety flags + Medical-Profile filters **surface, notify, and log** — they never
  gatekeep or forcibly remove. Excluded items are flagged with a reason; the user always proceeds (autonomy-with-
  clarity). Medical data is the most-sensitive class → always encrypted, imported only via the extension-model. `[INTENT HC-14..HC-17]`
- **`entity_type` additions** register in the polymorphic enums (see structure-data). New Core entity → add its
  `entity_type` so pages/tags/links work uniformly. `[INTENT HL10]`

## Completion checklist
- [x] platform baselines referenced · [x] Health-Core specifics listed · [x] labeled [FACT/INTENT] · [x] no `{{…}}`
