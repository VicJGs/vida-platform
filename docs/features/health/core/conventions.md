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
- **Derived over stored (the ADR-011 M3 nullable-override slot).** Goal `progress`, Profiles, Role `mastery`, and
  **derived metrics** (1RM·BMR·BEE·LBM·body-fat-mass — declared via the metric's `formula`, computed on-device) are a
  **nullable override slot** (`NULL ⇒ derive`, M3): `progress()`/`deriveMastery()` compute from source data on read;
  stored values are caches, source rows are truth. Role `mastery` is a **per-child weighted rollup** (M4). A pursuable
  goal carries `measurement_kind` × `binding_mode` (M1/M2), **never a bespoke goal-`type` column**.
  `[INTENT HC-3/HC-8/HC-21; ADR-011 M1/M2/M3/M4]`
- **Monitoring groups metrics — it never re-stores them.** Health Domains ⊃ Factors are a grouping layer; a Factor
  result IS a `health_metric_value`. Exams schedule + feed metric values, they don't hold a parallel result store. `[INTENT HC-19/HC-20]`
- **Units canonical + Preferences-displayed.** Store SI-canonical (kg·cm·kcal); display per `user_preferences`
  (kg/lb·cm/in). `[INTENT HC-11]`
- **Modality is a property, not a table — and modality ≠ the measurement axis (C1 guard).** Training focus / dietary
  framework / `physical_roles.type` are enum/tag dimensions — never spawn a table per modality. `physical_roles.type`
  (martial-art/sport/…) and `health_metrics.kind` (body-measure/biomarker/…) are **categories, kept as-is** — they are
  NOT the ADR-011 `measurement_kind` (that is the _goal's_ measure-shape). Only the bespoke `health_goals.type`
  decomposes. `[INTENT "finer levers on one spine"; ADR-011 M1 guard]`
- **Compose the foundations by reference.** Reference Sessions/Knowledge/Purposes/Finance entities by id; never
  duplicate their data. Protocols live in Knowledge; workouts in Sessions; cost in Finance. `[INTENT HC-12/HC-13]`
- **Pillars/Physical-Roles are Spaces; loggers are Blocks.** "Training"/"Nutrition"/"Muay-Thai" surfaces = universal
  tags + saved views (Spaces #8); workout-logger + photo-capture = capability Blocks. `[INTENT]`
- **Extension paths are consent-gated + labeled.** Any field/flow fed by AI/wearable/food-DB/photo/prescription/
  curated-import carries its `source` and is only populated after opt-in consent (extension-model). INPUT is
  **device-mediated (ADR-014 X1)** under `external_in_ok` (X5); AI rides **ADR-015** (on_device/cloud AI1, cloud = egress
  - scope-min AI3, `source=ai` AI6). `[FACT ZK-1; HC-10; ADR-014 X1/X5; ADR-015 AI1/AI3/AI6]`
- **Egress is the sharpest gate (ADR-014 X4).** INPUT integrations ingest into the vault; **OUTPUT to external/medical
  services is data egress** — the **X4 egress guard** (`external_out_ok` + union-of-consents + audit + never-auto-transmit),
  a distinct, stricter gate (data leaves the ZK vault). Intent-only until built. `[INTENT HC-22/R4; ADR-014 X4/X5]`
- **Advisory, never blocking.** Safety flags + Medical-Profile filters **surface, notify, and log** — they never
  gatekeep or forcibly remove. Excluded items are flagged with a reason; the user always proceeds (autonomy-with-
  clarity). Medical data is the most-sensitive class → always encrypted, imported only via the extension-model. `[INTENT HC-14..HC-17]`
- **`entity_type` additions register in the OPEN taggable-type registry** (SP2 — ADR-006 §3.2; **not** a closed
  `entity_type CHECK`). A new Core entity registers its `entity_type` so **`entity_tags`** (SP1, the universal tag
  primitive — `tag_id, entity_type, entity_id`) + `entity_links` + `pages` work uniformly — Health is a **consumer**
  of the ADR-006 registry, never a tag-table owner. `[INTENT HL10; ADR-006 SP1/SP2]`

## Completion checklist

- [x] platform baselines referenced · [x] Health-Core specifics listed · [x] labeled [FACT/INTENT] · [x] no `{{…}}`
