# PLAN — P1 · Full-Intent Backend Service Intake

> **Phase:** P1 of the backend-replan campaign (`docs/roadmap/backend-consolidation-plan.md`, ADR-021).
> **Status:** DRAFT — awaiting its own Approval 1 (§XXVI gate 1). Per ADR-021 §3.6, this phase runs its
> own plan + gates; the campaign approval does not authorize the sweep.
> **Profile:** project-foundation · **Authored:** 2026-09-13
> **Gate history:** method-gate critique 2026-09-13 → REVISE (4 blocking / 6 non-blocking) → this revision.
> **Deliverable of P1:** `docs/specs/foundation/backend-intent/corpus.md` — the unified backend service
> intent corpus that P2 (schema reconcile) and P3 (decomposition) consume.

---

## 1. Goal & the completeness contract

Produce ONE corpus of the **entire backend service intent** — every behavior/capability the `@vida/core`
service tier must provide, across all ~21 modules + the cross-cutting services — such that:

- **C1 · Nothing dropped, and provably so.** Two mechanical guards (§4), not "we read carefully":
  (a) **no deferred-intent flag is orphaned** — every deferral marker in the sources maps to a corpus
  item; (b) **no live derivation/invariant is unaccounted** — every `BR-`/rule id and every
  derive/compute/rollup/aggregate-class verb in the sources is accounted for in Part A. _(C1 does not
  claim magic completeness — it claims these two enumerable surfaces are provably covered; the human
  sweep + corpus gate cover the residue.)_
- **C2 · No guessing:** every corpus item is **FACT** (cited doc line), **INTERPRETATION** (derived,
  reasoning shown), or **UNKNOWN** (flagged) — never invented.
- **C3 · Boundary-drawn:** each item is **service** (this campaign) vs **UI** (P6) per ADR-020; an item
  with both a derivation and a state face is **split** into a service row + a UI row (§3), so neither half
  drops at the boundary.
- **C4 · Cross-cutting surfaced + forced:** every item shared by ≥2 modules or that is an
  aggregation/engine concern is a single Part-B item with N contributors; a post-assembly dedup check
  (§4) rejects any concept appearing in ≥2 modules' Part A that is not promoted to Part B.

C1's mechanical guards are the primary defense — the P4 set-cover is blind to intent that never entered
the corpus, so completeness is guaranteed HERE.

## 2. Sources (the authoritative corpus inputs — exhaustive)

| #       | Source                                | What it contributes                                                                                                                                                                             | Path                                                                        |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| S1      | Per-module 5-aspect docs              | the intent authority (identity/business-rules/contract/structure-data/conventions)                                                                                                              | `docs/features/<module>/*`                                                  |
| S2      | DB-4 intake docs                      | the per-module intent intake                                                                                                                                                                    | `docs/intake/<module>.md`                                                   |
| S3      | m1.1-delivery-plan §9                 | per-module deferred-to-build service scope (4 buckets)                                                                                                                                          | `docs/roadmap/m1.1-delivery-plan.md`                                        |
| S4      | Realignment reruns                    | per-module reframes (R6/measurement/X*/AI*)                                                                                                                                                     | `docs/specs/foundation/realignment-master-plan/part-1.2-reruns/<module>.md` |
| S5      | Cross-cutting ADRs                    | shared-service intent — sessions(004)/review(005)/spaces(006)/views(007)/capability(008)/templates(009)/measurement(011)/economy(012)/notifications(013)/ingestion(014)/AI(015)                 | `docs/core/decisions/ADR-0*.md`                                             |
| S6      | Capability framework                  | ADR-004–015 capabilities + mechanical predicates                                                                                                                                                | `docs/specs/foundation/capability-framework.md`                             |
| S7      | Service layer-doc stubs               | the intended per-module service shape                                                                                                                                                           | `packages/core/src/services/<module>/CLAUDE.md`                             |
| S8      | Product spec                          | the module/feature intent (8 modules + additional domains)                                                                                                                                      | `CLAUDE.md` (project)                                                       |
| S9      | Notes intent (deleted)                | recoverable at `main` HEAD — `docs/features/notes-and-pages/*`, `docs/intake/notes-and-pages.md`, `docs/specs/foundation/db-4-notes-and-pages/*`                                                | `git show main:<path>`                                                      |
| **S10** | **Foundation substrate durable docs** | **the kept-current substrate CONTRACT services must honor + each doc's "Deferred (not in this increment)" forward-intent** (backlinks, economy, measurement, capability, spaces, sync, effects) | `docs/core/<substrate>/current-spec.md` + `current-business-rules.md`       |

**Cross-check input (not a primary source):** `reconstructed-structure.md #31–#48` MOD-\* rows enumerate
per-module capabilities ([[issue-title-lists-capabilities-not-builds]]) — read as a reconciliation check
that no module under-states a capability the decomposition already named, not as an intent source.

**Module roster (~21 + cross-cutting):** notes-and-pages, preferences, sessions-and-scheduling, tasks,
projects, habits, routines, purposes-and-goals, finance (+fiscal-legal), skills, knowledge, books,
learning-education, relationships, check-ins, health (core/nutrition/training), journals, gamification,
notifications, pomodoro (→sessions). **Confirm against `docs/features/README.md` at sweep start.**

**Dissolved/accumulated contexts — explicit disposition (do NOT skip because "not a module"):**

| Context                                                    | Disposition                                                           | Read intent from                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Spaces                                                     | foundation, touches every module, accumulates their needs             | `docs/intake/spaces.md` + `docs/core/spaces/*` (S10)             |
| Languages                                                  | dissolved → Spaces, but live doc set + service stub remain            | `docs/features/languages/*` + `services/languages/CLAUDE.md`     |
| Duties · Dreams/Bucket-List · Commitments · Investigations | dissolved into accumulators (ADR-006 worked-examples / later modules) | their `docs/intake/*` + `docs/features/README.md:52-63` pointers |

## 3. Method

For each source per module + each cross-cutting ADR/substrate:

1. **Extract** every service-level intent item — a behavior the backend must provide: a CRUD op, a
   **derivation/aggregation/rollup**, a **validation/invariant** (every `BR-`/rule id), a facade/delegation,
   a seam. One row per item. (Bias-guard: sweep the derive/compute/rollup/aggregate verbs explicitly, §4b —
   do not let CRUD dominate and drop implicit rules.)
2. **Cite** the source (`file:line`) and label **FACT / INTERPRETATION / UNKNOWN** (C2).
3. **Classify** service vs UI (C3). Tie-break: an item with BOTH a derivation and a state face is **split**
   into a service row (the derivation/logic) + a UI row (the state) — never classified once and half-dropped.
4. **Tag cross-cutting** (C4): module-local-CRUD, or shared (name the contributing modules) / engine.
5. **Home candidate:** provisional only — per-module service, or a named cross-cutting service. (Final
   homing is P3, not here.)

## 4. Mechanical completeness backstop (the C1 proof — flagship guard)

Run over the grep roots **`docs/features/`, `docs/intake/`, `docs/core/`, `docs/specs/foundation/`,
`m1.1-delivery-plan.md`** (every path S1–S10 + S4 reads — not just features/intake, g1-B4/N1):

**4a · Deferred-intent index (no flag orphaned).** grep **word-boundary, case-insensitive** for the
deferral idioms — `INTENDED`, `DEFERRED`, `→ service`, `service-owned`, `derived-in-service`,
`design-pass`/`(design pass)`, `→ M1.4`/`later`/`Part 2` — NOT the glyphed literals (`⚠ INTENDED` catches
195 of 358 `INTENDED`; `[DEFERRED — build phase]` catches 2 of 10+ DEFERRED spellings — g1-B1/B2). Filter
out non-deferral senses ("as intended", "not intended"). Every hit → a **Part C** row:
`flag → source:line → corpus item id`. A flag with no item = a hole → sweep not done.

**4b · Live-intent index (no derivation/invariant unaccounted).** grep the derivation verb family —
`derive|comput|rollup|roll up|aggregat|streak|propagat|recompute|provider|snapshot` — and every `BR-`/rule
id per doc; each → a **Part C2** row mapping it to a Part A item. This closes B3: the mechanical proof
covers **live** service logic (habits streak-recompute, measurement rollups) too, not only deferred rows.

**4c · Cross-cutting dedup check (C4 forcing).** After assembly, cluster Part A rows by normalized
description; any concept in ≥2 modules' Part A that is NOT also a Part B row is a defect the corpus gate
rejects (prevents per-module re-scatter — g1-N3).

**Victor glance:** Parts C/C2 are short enough to eyeball — a 30-second human check that flags/verbs map to
real items.

## 5. Corpus structure (`corpus.md`)

- **Part A — Per-module service intent:** one table per module. Cols: `id · description · source(file:line) ·
FACT/INTERP/UNKNOWN · service|UI · cross-cutting? · candidate home`.
- **Part B — Cross-cutting services register:** the extracted shared services (from C4) — e.g. `summary(date)`
  aggregation, `dueIn(range)`, backlinks/entity-link resolve, search/FTS5, measurement rollups, export,
  effect-rail consumption, notification dispatch — each with contributing modules + source.
- **Part C — Deferred-flag index (§4a):** every deferral flag → its corpus item.
- **Part C2 — Live-intent index (§4b):** every `BR-`id + derivation verb → its Part A item.
- **Part D — Open UNKNOWNs:** each with a **named resolution owner + resolve-by phase** (§8).

## 6. Execution (after Approval — not before)

Fan out the sweep **per-module** (S1–S4/S7/S9 read into the Part A schema) in batches, plus one pass per
cross-cutting ADR/substrate (S5/S6/S10 into Part B). A reader returns structured rows in the corpus schema;
the corpus is assembled + deduped centrally (§4c); then §4a/§4b run. (Heavier multi-agent orchestration
only if requested — default is batched delegated readers, not a Workflow.)

## 7. Gate (P1's own — two points)

1. **Method gate (before the sweep):** `/critique` on THIS plan → Approval 1. _(Done: REVISE→resolved.)_
2. **Corpus gate (after the sweep):** independent adversarial critic on `corpus.md` — spot-check modules for
   dropped intent, verify every Part C/C2 row is homed, no INTERPRETATION smuggled as FACT, dedup (§4c) real
   - the §4a/§4b/§4c checks pass + Victor glance → corpus ratified.

## 8. Acceptance (P1 done when)

- [ ] Every module in the roster + every dissolved context (§2 table) has Part A coverage; notes intent
      restored from `main` HEAD.
- [ ] Part B lists every cross-cutting service candidate with its contributing modules.
- [ ] Part C: every deferred-intent flag (§4a idiom set) is homed to a corpus item (0 orphan flags).
- [ ] Part C2: every `BR-`id + derivation verb (§4b) maps to a Part A item.
- [ ] §4c dedup check passes (no ≥2-module concept missing from Part B).
- [ ] Part D: every UNKNOWN has a named resolution owner + resolve-by phase; **0 UNKNOWN enters P3 unhomed**.
- [ ] 0 un-cited claims; every item FACT/INTERP/UNKNOWN-labeled + service/UI-classified.
- [ ] Corpus gate (§7.2) passes; Victor glance done.

## 9. Out of scope for P1

Deciding the issue list / decomposition axis (P3) · any schema change (P2) · any frontend intent beyond
classifying items as UI (P6) · building anything.
