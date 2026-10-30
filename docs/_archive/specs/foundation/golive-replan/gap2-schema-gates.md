# GAP-2 — schema-amendment gates (research pass, 2026-10-21)

> Scope: every item in `frontend-replan/surface-map.md §6.4` (G2, 2026-10-01), checked against the live code on
> `golive-g4` (= main + docs). Answers GAP-2 in `delivery-structure-reconstruction/reconstructed-structure.md:342-345`
> and `golive-replan/g4-edge-ledger.md:136-139`. **Research only: every edit in §4 is a PROPOSAL, not applied.**

## 0. Homing rules applied (cited, not chosen)

- **R1 first-consumer-pull.** A deferred substrate lands when its first consuming unit needs it
  (`fixes/home-deferred-substrate-pieces/PLAN.md` §1, roadmap.md:46-53). For GAP-2 specifically, each gate
  "lands with its surface's own build" (`g4-edge-ledger.md:137-139`). The unit checks at its Interpretation Gate
  whether its ① twin closed the amendment. If the twin did not, the amendment is homed at that point, ahead of
  the surface slices (`reconstructed-structure.md:344-345`).
- **R2 no consumer means a tail deferral.** A piece with no consumer is parked as `⚠ INTENDED-later` at the tail.
  That tail position is the deferral itself, not a forced edge (`home-deferred-substrate-pieces/PLAN.md` §2).
- **R3 schema is owned by the M1 foundation.** DB-3 (foundation substrate) and DB-4 (per-domain) authored the
  tables. `MOD-*` units build services over them. Interface drift goes to DB-11 (memory rule; e.g.
  `schema/finance.ts:29`, `schema/relationships.ts:32`).
- **R4 a backend slice may run inside a surface unit.** A surface unit can carry a backend-tagged slice through
  the Service Build Flow. Precedent: fe-spaces-page `listSpaces` (`golive-replan/debt-plan.md:39`).
- **R5 a gated home outranks.** Part D (`backend-intent/corpus.md` Part D) and `schema-audit-deferred-homes.md`
  homes outrank re-homing (`backend-intent/PLAN-p3-decomposition.md:62`).

**Headline finding.** §6.4 is stale. DB-3 and DB-4 landed **every** listed table: all of Purposes, Health and
Relationships, the Routines v2 tables, and Finance `store`. What is still open is **service** work, plus three
Finance pieces that are not schema at all.

---

## 1. Per-module tables

### 1.1 Purposes — fe-purposes-and-goals #110 (LIF-195)

| Item                                    | Landed?    | Owner                                | Derived home | Evidence                                                                                                                                                                                        |
| --------------------------------------- | ---------- | ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `values`                                | **LANDED** | DB-3 (done)                          | —            | `schema/foundation/purpose.ts:22` · `migrations/007_purpose.ts:19`                                                                                                                              |
| `contributions` (rename of 3 junctions) | **LANDED** | DB-3 (done)                          | —            | `foundation/purpose.ts:33` · `007_purpose.ts:38`. The old `purpose_habits/routines/projects` exist only in `db/_legacy/schema.v1.ts:413-429`, with the retirement note at `schema/habits.ts:23` |
| `purpose_reviews`                       | **LANDED** | DB-3 (done)                          | —            | `foundation/purpose.ts:53` · `007_purpose.ts:64`                                                                                                                                                |
| `plan_steps`                            | **LANDED** | DB-3 (done)                          | —            | `foundation/purpose.ts:78` · `007_purpose.ts:92`                                                                                                                                                |
| entity-type registry `+value`, `+dream` | **LANDED** | DB-3 / DB-4 #8 (done)                | —            | `schema/_registry.ts:13` (`value`) and `:52` (`dream`)                                                                                                                                          |
| _(service over all of the above)_       | **LANDED** | MOD-purposes-and-goals #55 ✅ PR #98 | —            | `services/purposes/service.ts:21-40` (imports all 4 substrate tables plus Dream, Contribution, PurposeReview and PlanStep schemas)                                                              |

### 1.2 Health — fe-health #111 (LIF-183)

| Item                                        | Landed?                            | Owner                                                             | Derived home | Evidence                                                                                                           |
| ------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| ~12 Core tables ("schema 0%")               | **LANDED (12/12)**                 | DB-4 #17 (done)                                                   | —            | `schema/health-core.ts:59-267` (13 `sqliteTable`, header :5-8) · `migrations/027_health_core.ts:46-250`            |
| Training (`workout_sessions`…)              | **LANDED (5/5)**                   | DB-4 (done)                                                       | —            | `schema/health-training.ts:33-126` · `029_health_training.ts:42-130`                                               |
| Nutrition (`meals`, `nutritional_plans`…)   | **LANDED (6/6)**                   | DB-4 (done)                                                       | —            | `schema/health-nutrition.ts:35-151` · `028_health_nutrition.ts:43-154`                                             |
| residual: `nutrition_ingredients.name_bidx` | ABSENT                             | **OWNED-BY MOD-health-nutrition** #68                             | —            | `schema-audit-deferred-homes.md:12-15` ("Home: nutrition module build"). Barcode scan only, so it gates no surface |
| _(services)_                                | **ABSENT** (no `services/health*`) | **OWNED-BY MOD-health-core #67 · -nutrition #68 · -training #69** | —            | `reconstructed-structure.md:162-164`. All three are already `←` of #111 (:225)                                     |

### 1.3 Finance — fe-finance #112 (LIF-180)

| Item                                                                                | Landed?                                                                                                | Owner                                                                                                                                                                                                                                                                                                                                | Derived home                                                                                                                                                                                                                                                                                                                                             | Evidence                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store` **table**                                                                   | **LANDED**                                                                                             | DB-3 (done)                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                                                                                                                                                                        | `schema/foundation/economy.ts:61` · `migrations/009_economy_store_rules.ts:19`                                                                                                                                 |
| `store` **service** (FIN-23 CRUD · FIN-24 lockBox · FIN-18 net-worth over the tree) | **ABSENT**. Today a deny-safe `StoreLockPort` stands in, and net worth is the FN-7 simple sum          | **ORPHAN**. Owner of record is MOD-finance (`docs/core/economy/current-business-rules.md:22`; gamification IR-13 `features/gamification/delivery/interpretation.md:102,119`). MOD-finance ✅ deferred it to "DB-3 store layer" (`finance/delivery/slice-map.md:26-28`; `traceability.md:157,167,169`), but DB-3 shipped only the DDL | **fe-finance #112, as a leading backend-tagged slice** (R1 + R4). This is the first consumer: the Store-tree surface (FIN-18/23/24 ui → P6, `traceability.md:158,168,170`). Swaps the deny-safe `StoreLockPort` for the real one, which also un-denies the gamification penalty branch                                                                   | as cited                                                                                                                                                                                                       |
| `import_staging`                                                                    | ABSENT (M1 uses the in-memory staging port)                                                            | **OWNED-BY P3-2 #124** (M2)                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                                                                                                                                                                        | `schema-audit-deferred-homes.md:59-60` ("M2 ADR-014 ingestion-service"); `finance/delivery/slice-map.md:37` ("durable table = M2"); `foundation/ingestion/types.ts:179-180`; `services/finance/service.ts:184` |
| Commitments (derived, FIN-36)                                                       | **ABSENT** (no `listCommitments`)                                                                      | **ORPHAN**. MOD-finance deferred it to the "Commitments/liability design-pass (Part D)" (`slice-map.md:29`; `corpus.md:461` → "build"). The ① build is closed. No table is needed (`features/finance/structure-data.md:38-43`)                                                                                                       | **fe-finance #112, backend-tagged slice** (R1 + R4 + R5: Part D says "build", and the only finance build still open is #112). The derive is doc-fixed: it lists from existing entities and progress-to-total is derived. The optional "is-a-commitment" marker and the lending representation stay at that slice's design-pass (`business-rules.md:134`) |
| liability-payment actual tracking (FIN-39)                                          | ABSENT                                                                                                 | **ORPHAN** (same Part D design-pass, `corpus.md:460`)                                                                                                                                                                                                                                                                                | **fe-finance #112 Interpretation Gate runs the Part D design-pass.** Its **mechanism is UNKNOWN**: a transaction link or a `liability_payments` ledger. The docs leave this undecided (`traceability.md` FIN-39 row = UNKNOWN; `structure-data.md:37`). The schedule half is not blocked, because the G9 fields landed (`schema/finance.ts` liabilities) |
| budgeting (FIN-38)                                                                  | ABSENT (no data model)                                                                                 | **ORPHAN** (Part D: "Finance mini-intake + design-pass + candidate ADR — later/build", `corpus.md:459`)                                                                                                                                                                                                                              | **`⚠ INTENDED-later` tail** (R2). No M1 surface consumes it: G6's #41 split has no Budgets surface (`frontend-replan/g6-reshape-runbook.md:83`), and decomposition marks Budgets as ⛔ (`decomposition.md:101`). Identity says it is "Not a budgeting tool _yet_" (`identity.md:55`). Milestone **UNKNOWN**: the docs say "later" and fix no milestone   |
| multi-currency: per-holding `currency`                                              | **LANDED**                                                                                             | DB-4 #9 (done)                                                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                                                                                                                                                                        | `schema/finance.ts:57,83` · `020_finance.ts:44,74`                                                                                                                                                             |
| multi-currency: base/display currency                                               | **LANDED** (field)                                                                                     | MOD-preferences ✅                                                                                                                                                                                                                                                                                                                   | —                                                                                                                                                                                                                                                                                                                                                        | `schema/preferences.ts:53` (`currency`)                                                                                                                                                                        |
| multi-currency: FX-rate store (FIN-21 store half)                                   | **PARTIAL**. The conversion and `FxRateMissingError` are built, and rates go through an in-memory port | **ORPHAN** (home "Preferences domain (Part B) / FX design-pass", `schema-audit-deferred-homes.md:71-72`. MOD-preferences ✅ never built it. preferences-rescope #60's scope has no FX)                                                                                                                                               | **fe-finance #112, backend-tagged slice** (R1: the first consumer is the "rate needed" prompt, FIN-21 ui → P6, `traceability.md:164`). It persists through the Preferences store that `config-seams.ts` points to. Not blocking, because the typed "rate needed" state is honest today                                                                   |

### 1.4 Relationships — fe-relationships #113 (LIF-196)

| Item                                                                                                                                                                 | Landed?                 | Owner                            | Derived home | Evidence                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `network_groups`                                                                                                                                                     | **LANDED**              | DB-4 #14 (done)                  | —            | `schema/relationships.ts:192` · `025_relationships.ts:209`                                                                                                                                                                                 |
| `network_group_contacts`                                                                                                                                             | **LANDED**              | DB-4 #14                         | —            | `relationships.ts:201` · `025:226`                                                                                                                                                                                                         |
| `contacts.closeness_tier`                                                                                                                                            | **LANDED** (OPEN vocab) | DB-4 #14                         | —            | `relationships.ts:77` · `025:51`                                                                                                                                                                                                           |
| restored fields (G8 `how_we_met`, `energy_given/received`, `key_takeaways`, reminder `is_snoozed/snoozed_until/priority`, plus G11 `anchor_type/anchor_days_before`) | **LANDED**              | DB-4 #14                         | —            | `relationships.ts:74,123-126,147-149,164-165` · `025:49,115-117,144-145,170-172` (G8 list per `features/relationships/structure-data.md:26-27`)                                                                                            |
| _(service: networks · contact and network health band)_                                                                                                              | **LANDED**              | MOD-relationships #56 ✅ PR #107 | —            | `services/relationships/service.ts:157-158,567-579` (networks), `:218-251,613-617` (health engine). The closeness weight derives from `relationship_type` plus `is_favorite`, which `structure-data.md:24-25` leaves as a build-phase call |

### 1.5 Routines — fe-routines #104 (LIF-197)

| Item           | Landed?                                                                                                                                                   | Owner                                                                | Derived home | Evidence                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| v2 schema      | **LANDED**                                                                                                                                                | DB-4 (done)                                                          | —            | `schema/routines.ts:47,70,92` · `migrations/018_routines.ts:40,72,100` |
| v2 **service** | **ABSENT on main** (`services/routines/` = `CLAUDE.md` only). PARTIAL off-main: S3/9 in worktree `.claude/worktrees/mod-routines` @ `1a61189`, not pushed | **OWNED-BY MOD-routines #57** ⏳ (`.claude/tasks/mod-routines.md:2`) | —            | already `←` of #104 (`reconstructed-structure.md:218`)                 |

---

## 2. Gate verdict

| Surface                        | ⛔ status                   | Why                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **fe-purposes-and-goals #110** | **VOID**                    | All 5 items are LANDED, and the service is built (#55 ✅)                                                                                                                                                                                                                                                                                                            |
| **fe-relationships #113**      | **VOID**                    | All 4 items are LANDED, and the service is built (#56 ✅)                                                                                                                                                                                                                                                                                                            |
| **fe-health #111**             | **VOID as a schema gate**   | The 23 tables have LANDED. What remains is the services, and those are already the `← MOD-health-*` edges (#67-69), so the ⛔ only duplicates them. The task-file text "schema 0%" is factually wrong                                                                                                                                                                |
| **fe-routines #104**           | **VOID as a separate gate** | The "v2 service" is exactly MOD-routines #57, already a `←` edge. The ⛔ duplicates it                                                                                                                                                                                                                                                                               |
| **fe-finance #112**            | **STILL REAL, narrowed**    | (a) the store service, (b) the Commitments derive, and (c) the FX-rate persistence are ORPHANS, homed into #112 as leading backend-tagged slices. (d) Import is not a gate: the M1 wizard runs over the in-memory staging port, and the durable table is P3-2 #124 (M2). (e) Budgets and FIN-39 actual tracking go to the ⚠ INTENDED-later / design-pass tails above |

**ORPHANS (5, all Finance):**

1. store service (FIN-18/23/24) → #112 backend slice
2. Commitments derive (FIN-36) → #112 backend slice
3. FX-rate store (FIN-21) → #112 backend slice
4. liability-payment tracking (FIN-39) → #112 Interpretation-Gate design-pass. The mechanism is UNKNOWN
5. budgeting (FIN-38) → `⚠ INTENDED-later` tail, milestone UNKNOWN

---

## 3. Note on R1 versus "lower `#`"

`reconstructed-structure.md:345` says an un-closed amendment is "homed then (lower `#` than the unit)".
`g4-edge-ledger.md:138` says each gate "lands with its surface's own build". For items 1-3 the **backend-tagged
slice inside #112** (R4) satisfies both: the slice runs before any surface slice, and it needs no renumber.
Minting a separate `mod-finance-store` issue just below #112 would also comply, but it costs a 143-row renumber
and has no other consumer. Gamification's penalty branch is also deny-safe today, so it gains no earlier `#`.

---

## 4. Proposed edits (NOT applied)

### 4.1 `reconstructed-structure.md`

- **:214 note** → `*(⛔ = schema-amendment gate from G5 (surface-map.md §6.4). GAP-2 resolved 2026-10-21 (golive-replan/gap2-schema-gates.md): every §6.4 table has landed (DB-3/DB-4). Only fe-finance keeps a ⛔, for 3 orphan services homed as its leading backend slices.)*`
- **#104 :218** Title `… run-flow) ⛔v2 service` → `… run-flow)`. The service is already the `← MOD-routines` edge.
- **#110 :224** drop the trailing ` ⛔`.
- **#111 :225** `… Nutrition) ⛔ — **fold**` → `… Nutrition) — **fold**`.
- **#112 :226** Title → `Finance ⊕split (Dash · account · All-* · Chart · Store · Commitments · Import) ⛔→ leading backend slices: store svc (FIN-18/23/24) · Commitments derive (FIN-36) · FX-rate store (FIN-21); Part D liability-payment design-pass (FIN-39); Budgets = ⚠ INTENDED-later (FIN-38); import_staging durable = P3-2 #124 (M2)`.
- **#113 :227** drop the trailing ` ⛔`.
- **GAP-2 :342-345** append: `**Resolved 2026-10-21** (gap2-schema-gates.md): 4 of 5 gates void (all tables landed; residual services are existing ← edges); fe-finance absorbs 3 orphan services as leading backend-tagged slices (R1 first-consumer-pull + debt-plan.md:39 precedent); FIN-38 budgeting → ⚠ INTENDED-later tail.`
- **§5 / counts:** no change. No rows are added or renumbered.

### 4.2 Task files (`.claude/tasks/`)

- **fe-routines.md:9** `⛔ blocked on routines v2 service.` → `(gate = the ← mod-routines edge; schema landed, 018_routines.ts)`. Under Dependencies add `- blocked by \`mod-routines\``. It is missing, although structure :218 has it.
- **fe-purposes-and-goals.md:9** replace `⛔ blocked on values·contributions·purpose_reviews·plan_steps schema.` with `(schema landed: 007_purpose.ts; ① done PR #98)`.
- **fe-health.md:9 and :13** replace `⛔ blocked on the ~12 Health Core … (0%)` with `schema landed (027/028/029, 23 tables); gate = the ← mod-health-* services`. Under Dependencies add `- blocked by \`mod-health-core\``, `mod-health-nutrition`and`mod-health-training`. All three are missing, although structure :225 has them.
- **fe-relationships.md:9** replace `⛔ blocked on network_groups·closeness_tier schema.` with `(schema landed: 025_relationships.ts; ① done PR #107)`.
- **fe-finance.md:9** replace `⛔ blocked on store·import_staging·budget·multi-currency schema.` with `Leading backend-tagged slices (GAP-2): store service FIN-18/23/24 (real StoreLockPort) · Commitments derive FIN-36 · FX-rate store FIN-21; Part D liability-payment design-pass FIN-39 at the Interpretation Gate; Budgets FIN-38 = ⚠ INTENDED-later (out of #112); import_staging durable = p3-2 (M2), wizard runs over the M1 in-memory staging port.` In the Goal, append `+ the 3 GAP-2 backend slices above.`
- **mod-health-nutrition.md** Goal: append `incl. nutrition_ingredients.name_bidx (deferred-homes P2 defer-add #2)`. This only makes the ownership explicit; the item is already homed there.

### 4.3 `frontend-replan/surface-map.md` §6.4

This is a G2 historical record, so leave it as written. Add one line under the table:
`> **Status 2026-10-21:** superseded by golive-replan/gap2-schema-gates.md — all tables landed; only Finance services remain.`

### 4.4 Budgeting (FIN-38): superseded by the Resolution below

Homed at fe-finance #112's front matter (design pass + ADR, `structure-data.md:90`); no tail row is minted.

## Resolution of the two UNKNOWNs (grounded in the finance docs, 2026-10-21; nothing left for Victor)

- **Liability-payment tracking (FIN-39):** "the liability slice of the Commitments view" `[FACT: docs/features/finance/business-rules.md:135]`.
  **Home = fe-finance #112's leading backend slice, together with Commitments (FIN-36).** Its mechanism (transactions→liability link vs a
  `liability_payments` ledger) is resolved at that unit's Interpretation Gate: the FN-13 design-pass venue `[:53,:70]`.
- **Budgeting (FIN-38):** "design pass + ADR" `[FACT: structure-data.md:90]`; the budgeting screen is one of fe-finance's ⚠ INTENDED screens `[:65]`.
  **Home = fe-finance #112's front matter (Envision + Interpretation gates = the design pass), and the ADR is authored there.** If the design pass
  splits it off ("may become its own feature", `business-rules.md:131`), it is minted at that point with real edges. Not an INTENDED-later tail.
- **Net:** 0 ORPHAN. GAP-2 closes as: 4 gates void (#104 · #110 · #111 · #113) + #112's gate re-described as a **service** gate (store · Commitments
  - liability slice · FX store as a leading backend slice; budgeting design pass + ADR in its front matter) + the missing blocked-by lines on
    fe-health (← mod-health-core/nutrition/training) and fe-routines (← mod-routines).
