# Backend Consolidation Plan — Full-Intent Service Layer (+ Schema Reconcile)

> **Status:** DRAFT — awaiting Approval 1 (§XXVI gate 1). **To be ratified by ADR-021** (methodology
> reversal, authored in P0).
> **Authored:** 2026-09-11 · **Owner:** Victor · **Profile:** project-foundation / milestone-delivery-planning
> **Supersedes (backend/service tier only):** `m1.1-delivery-plan.md §2` (the per-module ①/② grain) +
> `§9` (per-module deferred-to-build scope) + the Entity Delivery Flow vertical fork. The frontend (②)
> tier is unaffected here — it splits into its own later track (P6).
> **Gate history:** g1 adversarial critique 2026-09-11 → REVISE (6 blocking / 5 non-blocking) → this revision.

---

## 1. Why — the problem this reverses

The M1.1+ delivery model builds each module as a **vertical slice**: ① a `@vida/core` service, then ②
its UI, one module at a time (`m1.1-delivery-plan §2`). The concern (Victor, 2026-09-11): **building the
service tier module-by-module leaves cross-cutting intent undone** — each module plans its backend in
isolation, so shared/cross-module service concerns (aggregation engines, `dueIn`, backlinks, `summary(date)`,
measurement rollups) get pulled ad-hoc by whichever module hits them first, or deferred into "the consumer
module will do it."

**Evidence it is real, not hypothetical:**

- The notes teardown (2026-09-11) found `POMODORO_TYPE`/`POMODORO_STATUS` — _sessions_-domain vocab —
  physically filed inside the _notes_ **types** module (`@vida/types/note.ts`, now deleted; the canonical
  copy lives in `session.ts:73-76`), because notes was "the module being built that day."
- The service tier is almost entirely **un-built**: every `services/<module>/` is an empty layer-doc stub;
  only notes ① existed (now deleted). So service-tier fragmentation is a **future risk we can still design
  out**, before a line of it is written.

**Where fragmentation reaches (corrected after g1-B1/B2):** it is **not service-tier-only.** The pomodoro
evidence proves it reached `@vida/types` (the types tier); by [[db4-types-may-be-colocated-grep-name-before-net-new]]
this colocation is a known recurring class in this repo, so the **per-domain schema + `@vida/types` +
validators tiers cannot be assumed clean.** What _is_ genuinely built-holistically is narrower than first
stated:

- **Built once, holistically (consume as-is):** the `foundation/` **substrates** with real engines —
  sessions, spaces, views, capability, measurement, economy, effects (AR-5/6/7).
- **NOT built (do not assume):** the `review` substrate — `foundation/review/` is a **0-LOC stub**
  (only `CLAUDE.md`); DB-3 authored the review _schema tables_ (`review_curves`/`method_bindings`/
  `review_events`) but the engine is unbuilt, and its first consumer is `MOD-knowledge` (#43, **M1.2**) —
  a forward substrate-pull, out of this campaign's scope unless the intake surfaces earlier need.
- **Built holistically at the DDL level, but audit for intent-fidelity (not assume):** the 117 DB-4
  tables cleared a per-domain No-Decisions Gate, so their _shape_ is doc-determined — but a full-intent
  re-intake can still surface `⚠ INTENDED`/`measurement_kind`-AMEND/vocab-placement gaps the per-domain
  gate deferred (`schema-foundation-build-flow.md:191`).

So the campaign **primarily targets the service tier**, and **reconciles** the schema + types + validators
against the unified intent (not a wholesale 18-domain redo).

## 2. The decision

Reverse the backend grain: **intake the whole backend service intent first, decompose it horizontally,
then build — with the frontend separated out.**

1. **Full-intent service intake** — one consolidated pass over the ENTIRE backend service/logic intent
   (all ~21 modules + the cross-cutting services), producing a unified backend-intent **corpus** before any
   service is carved into an issue. Each item is service-vs-UI-classified (per ADR-020 state ownership) so
   the P6 frontend boundary is drawn from the corpus, not assumed.
2. **Schema + types reconcile (not wholesale redo)** — audit DB-4 + `@vida/types` + validators against the
   corpus; **targeted fixes** where the corpus proves a gap; **rebuild the notes hub** (`pages`/`page_links`/
   `note_attachments`, torn down); the other gated tables stand.
3. **Horizontal decomposition** — carve the corpus into proper Linear issues that cover 100% of the intent,
   with cross-cutting services first-class (built first), not smuggled into a module.
4. **Coverage gate** — an independent adversarial critic proves ⋃(issues) ⊇ corpus (0 unhomed) _before_
   building, backstopped by a mechanical intake check (§5 P1/P4).
5. **Frontend split** — the ② UI tier is scoped as its own later track (P6), decoupled from the service build.

**Reconciliation with ADR-019 §3.5 (added per g1-B3).** ADR-019 §3.5 forbids "substrate-first regardless" —
a `foundation/` substrate is built only when its first M1 consumer needs it. This plan's "cross-cutting
services first" does **not** violate it: the cross-cutting **services** targeted here (`dueIn`, `summary(date)`,
backlinks, measurement rollups) are **application services in `services/`, not `foundation/` substrates** —
they each already _have_ a first consumer within M1.1 (Journals/Sessions/Notes), so building them first is
consumer-pull, not speculative substrate-first. Any genuine `foundation/` substrate the intake surfaces as
unbuilt (e.g. `review`) stays governed by §3.5 (built at its first consumer, which may be a later milestone).
ADR-021 records this as an ADR-019-compatible clarification, not an amendment.

## 3. Scope

**IN:** all ~21 module backend services · the cross-cutting **application** services (aggregation/`summary(date)`,
`dueIn`, backlinks, search, measurement rollups, export, any other shared engine the intake surfaces) · a
DB-4 + `@vida/types` + validators reconcile with targeted fixes · the notes hub rebuild · the Linear reorg
for the backend tier.

**OUT (consumed / deferred, not re-planned here):** the already-gated `foundation/*` **substrates with
engines** (consumed as-is) · the unbuilt `review` substrate (M1.2 consumer, forward-pull) · the frontend ②
surfaces (own track, P6) · wholesale schema redo of the 18 non-notes domains (reconcile only) · M2
integrations · M3 encryption · M4 sync/venues (all remain seam-only).

## 4. What it supersedes

| Superseded                                                             | By                                                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `m1.1-delivery-plan §2` — per-module ①/② vertical grain (backend half) | horizontal service-first decomposition (this plan §2)                              |
| `m1.1-delivery-plan §9` — per-module deferred-to-build scope           | the unified intent corpus (P1) — one home for all deferred service intent          |
| Entity Delivery Flow — the ①/② fork, per-entity                        | applies to the **frontend** track only (P6); the backend runs this horizontal flow |
| `reconstructed-structure.md #31–#48` — module-vertical ① issues        | reshaped into layered backend issues (P5), with `#` edges re-derived               |

**NOT superseded (operate within):** ADR-016 (per-table gating), ADR-017 (features-first), ADR-018 (foundation

- services homes), ADR-019 (M1→M4 sequencing + §3.5 substrate-pull — see §2 reconciliation), Model B schema
  philosophy, and the `#` global-build-order **methodology** (P5 re-derives the concrete edge set + re-proves
  acyclicity for the reshaped issues; the M1.4 `⊕agg`/HARD-_ `← every MOD-_` deps are re-homed onto the new
  decomposition — g1-N2).

## 5. Campaign phases (each gated per §XXVI)

| Phase                               | Deliverable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Gate                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **P0 · Ratify**                     | this plan + **ADR-021** (grain reversal + ADR-019 §3.5 reconciliation)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `/critique` → Approval 1                                                  |
| **P1 · Full-intent service intake** | `docs/specs/foundation/backend-intent/corpus.md` — every backend service intent item from all module 5-aspect docs + `docs/intake/` + `m1.1-delivery-plan §9` + cross-cutting ADRs, tagged by module/layer/capability, **service-vs-UI classified** (ADR-020), FACT/INTERPRETATION/UNKNOWN-labeled (No-Guessing). **Mechanical backstop (g1-N1):** grep EVERY `⚠ INTENDED`/`[DEFERRED — build phase]`/"→ service"/"design-pass" flag across `docs/features/*` + `docs/intake/*` into the corpus with a cite each; + a Victor glance — not resting on P4's downstream set-cover, which is blind to intake omissions. **Notes input:** the deleted notes intent docs are recoverable at `main` HEAD (`docs/features/notes-and-pages/*`, `docs/intake/notes-and-pages.md`, `docs/specs/foundation/db-4-notes-and-pages/*`) — restore as reference or re-derive fresh. | independent critic: exhaustive, nothing dropped + mechanical-check passes |
| **P2 · Schema + types reconcile**   | DB-4 audit report (table-by-table vs corpus) + `@vida/types` colocation/CHECK-vocab audit ([[open-vocab-columns-take-no-sql-check]]) + targeted fixes + **notes hub rebuilt** (`pages`/`page_links`/`note_attachments` re-authored; migration **appended** — forward-only runner, NOT re-using slot 012 — + re-registered in `runner.ts`; blast-radius sub-deliverable: re-validate `entity_links`/`entity_tags`/`_registry` vocab + the ~10 polymorphic `entity_type='page'` consumers against the rebuilt shape). **Exit sweep (g1-N4):** grep for dangling imports of every deleted notes symbol across apps + packages, not just `tsc`.                                                                                                                                                                                                                        | `/critique` + DDL-introspection parity + deleted-symbol sweep clean       |
| **P3 · Horizontal decomposition**   | the issue set — cross-cutting services first (own issues), then per-module CRUD against the unified intent + built cross-cutting services; acyclic dep edges                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Decomposition Gate (well-formed, nothing smuggled)                        |
| **P4 · Coverage gate**              | intent→issue traceability matrix; assert ⋃(issues) ⊇ corpus · 0 UNHOMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **independent adversarial critic (flagship gate)**                        |
| **P5 · Linear reorg**               | Linear projects/milestones/issues created + the module-vertical ① issues (#31–#48) retired/reshaped + `#` edges re-derived + `⊕agg`/HARD-\* deps re-homed; `mod-notes` LIF-131 disposition resolved. **Order (g1-N5):** reshape task files → `track-sync --status` clean → live write (a partially-built-then-torn-down issue like LIF-131 reports its reshape, not a phantom Done).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `/track-sync` + reconcile TASKS.md / reconstructed-structure              |
| **P6 · Frontend track scoping**     | the separated ② UI plan (consumes the finished service tier)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | later; own gate                                                           |

## 6. Decomposition principle (P3 — provisional, intake confirms)

Extract the **cross-cutting application services as first-class issues built FIRST** (the fragmentation
source), then per-module CRUD services against a unified intent + the already-built cross-cutting services.
Per-module CRUD is genuinely module-local and safe to keep per-module — the fix is that its cross-cutting
dependencies now exist and are planned, not smuggled. Exact carving is fixed at P3, grounded in the P1
corpus. (This is consumer-pull, not substrate-first — see §2 ADR-019 reconciliation.)

## 7. Open questions

- **P3:** the exact decomposition axis (cross-cutting-first vs pure-layer) — resolve from the corpus, not up front.
- **P5:** disposition of the existing module-vertical issues (#31–#48) + `mod-notes` LIF-131 (retire vs reshape).

## 8. Operational state (as of this draft)

- Branch `backend-replan` off `main`. Notes teardown is **staged, not committed** (25 deletes + 9
  reconciliations; typecheck 11/11 green; migration chain now has a **gap at slot 012** — P2 appends a new
  migration rather than refilling 012). `main` is untouched and clean. `mod-notes-rebuild` abandoned (reflog).
- Commit the teardown as a checkpoint before/at P2 (Victor's call).
