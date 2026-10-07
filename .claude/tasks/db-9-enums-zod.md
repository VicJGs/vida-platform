# Task: db-9-enums-zod
# Status: completed (2026-07-28 · commit a137a44 · LIF-106)
# Profile: Add Backend Component
# Scenario: default
# Spec: docs/specs/foundation/db-9-enums-zod/_index.md
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap/m1.0-delivery-plan.md → DB-9 (roadmap issue LIF-71)
# Linear: LIF-222
# Created: 2026-07-28
# Activated: 2026-07-28 (M1.0 delivery campaign — ready head off DB-1; strong next after DB-6)

## Goal
Author the **canonical enum sets** for the M1.0 domains as a single source of truth, expressed in two
parity-locked forms per ADR-002: TEXT + `CHECK` constraints in the SQL schema, and canonical **Zod
validators in `@vida/core`**, with the enum literal types surfaced in `@vida/types`. Landing this opens
the substrate wave (AR-5/6/7 ← DB-6 ✅ + DB-9).

## Context
Profile: Add Backend Component
Files involved: `packages/types/src/` (enum literal types per domain), `packages/core/src/` (canonical Zod
validators), `packages/core/src/db/schema/` (SQL `CHECK` constraints — the parity partner).
ADR home: ADR-002 (enums = TEXT with CHECK in SQL, canonical Zod validators in `@vida/core`).
Integration points: SQL `CHECK` ↔ Zod parity is the load-bearing invariant; DB-10 seed rows must satisfy
the enum CHECKs (DB-9 owns them); substrates AR-5/6/7 consume the validators.

## Dependencies
- blocked by `db-1-schema-primitives` — ✅ DONE (LIF-61, commit b234e85)
<!-- ready head: DB-1 landed the schema primitives DB-9's enums attach to. No other build-time gate. -->

## Open Questions
- [ ] Which enum sets are in-scope for M1.0 vs deferred to their feature's build phase (DB-9 authors the
      canonical set; per-domain schema DB-4 is streaming — resolve the grain in the PLAN gate).
- [ ] Parity-enforcement mechanism: generate CHECK from Zod, Zod from CHECK, or a test asserting both match?

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Scope grain | (A) Comprehensive — all string-literal-union enums | validators are pure mirrors of committed types; zero-risk, avoids splitting the pattern | 2026-07-28 |
| Canonical tuple home | (C2) tuple-as-source in @vida/types, union derived, core imports | guarantees tuple = union (exhaustive); C1 `satisfies` only guarantees ⊆; matches delivery-plan file list | 2026-07-28 |
| CHECK enforcement | (ii) assert-only (hand-author from const + parity test) | ADR-016 §3.3 consistent; no new mechanism/amendment; parity test fails loud on drift | 2026-07-28 |
| @vida/types identity | update CLAUDE.md:6 to document enum-tuple runtime arrays | C2 introduces first substantial runtime code (no zod) — disclosed, not drift | 2026-07-28 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — floor captured (§ Baseline below); validators context is from-zero (D6 birth)
- [ ] Forward spec written + Per-Step Build Gate cleared (§XXVI) before any implementation
- [x] Read 3 existing enum/Zod implementations — state the pattern found (see § Baseline "PATTERN IN USE")
- [ ] Validator contract approved before any code (§XXVI gate 1)
- [ ] /adr-check validates approach against ADR-002
- [ ] TypeScript enum literal types written first
- [ ] Canonical Zod validators implemented in @vida/core
- [ ] SQL CHECK ↔ Zod parity wired + enforced
- [ ] tsc --noEmit passes — zero errors
- [ ] Unit tests: every validator (accept valid, reject invalid) — 100% business-logic coverage
- [ ] /critique → SHIP verdict
- [ ] Currency Rule (§XXIX) — CURRENT- docs refreshed for every context touched

## Build Steps
<!-- UNIT-level — mirrors IMPLEMENTATION-PLAN §B; what victor:execute-plan-code works. Approved 2026-07-28 (Approval 2). -->
- [x] B1 — added `zod@^4.4.3` to @vida/core; pnpm install (+1). z.enum readonly verified (zod 4.4.3).
- [x] B2 — @vida/types: **81** categorical enums → `as const` tuple + derived type across 14 files (sync.ts first).
- [x] B3 — @vida/core/src/validators/: 15 files, **81 `<Type>Schema = z.enum(TUPLE)`** + barrel + re-export from index (index.ts:59).
- [x] B4 — sync-queue.ts imports canonical SYNC_OPERATION/SYNC_QUEUE_STATUS (dropped local `satisfies` tuples).
- [x] B5 — enum-parity.test.ts (SQL-level, non-empty guard, drift negative — 4 tests) + enums.test.ts (accept/reject §XIX — 24 tests).
- [x] B6 — updated packages/types/src/CLAUDE.md (enum-tuple identity + runtime-footprint note).
- [x] B7 — VERIFIED: @vida/types built · @vida/core typecheck 0 err + 83 tests · @vida/web 6 · root typecheck 10/10, **zero consumer edits** · literal-sets identical HEAD↔working (no member drift).

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE). DB-9 is a full double-gated build → uses the spec, not this. -->

## Route History
| Step | Detour | Why | Resolved |
|------|--------|-----|----------|
| Baseline | none — floor as-expected | DB-9 straddles 3 contexts (see below) | validators context is genuinely from-zero → D6 births its docs |
| PLAN critique | REVISE, 3 must-fix | buried tuple-location decision (C); sqlEnumCheck exceeded ADR-016; auto-grow overclaim | surfaced (C); reframed to (ii) assert-only; downgraded to explicit parity fixture |
| Impl critique | REVISE, 2 must-fix + 3 nits | B7 typecheck resolved stale @vida/types dist (false-green risk); 2 enums missed (FieldClassification, VaultState) | B7 rebuilds dist first + root pass authoritative; enums added → 81 total |
| B7 verify | 1 ISOLATED tsc error | parity-test driver omitted SqliteDriver.batch | added batch() (harness pattern); typecheck clean |

## Baseline (Step 0 — 2026-07-28)
Read-only survey (Explore agent) of the enum/validator/CHECK surface. All FACTS `path:line`-cited.

**Three contexts DB-9 touches, with their current floor:**
1. **`@vida/types` enum surface — EXISTS (the source of truth to formalize).** ~90+ enumerated sets across
   ~14 domain files, expressed as **TS string-literal unions** (`'income' | 'expense'`), **never** TS `enum`.
   Shared sets in `common.ts` (`Status`, `Priority`, `Frequency`, `LifeDomain`, `NotificationType`); the rest
   scattered per-domain (`finance.ts`, `learning.ts`, `knowledge.ts`, `entities/user.ts`, `sync.ts`, `editor.ts`, …).
   No central registry. [FACT: packages/types/src/common.ts:32-57, finance.ts:13-61, learning.ts:13-94, sync.ts:12-82]
2. **`@vida/core` canonical Zod validators — DO NOT EXIST (from-zero).** `zod` is NOT a dependency of core or
   types [FACT: packages/core/package.json, packages/types/package.json]. `_shared.ts` `enumText<T>` helper
   carries an explicit forward-ref: *"TS union over TEXT (SQL CHECK authored in the migration; Zod validates —
   DB-9)"* [FACT: packages/core/src/db/schema/_shared.ts:20-21]. Const tuples exist as Drizzle query-mirrors
   (`OPERATIONS/STATUSES ... as const satisfies readonly SyncOperation[]`) but are NOT Zod schemas
   [FACT: db/schema/foundation/sync-queue.ts:20-21].
3. **`database-layer` (CHECK constraints) — EXISTS, has current-\* docs.** Hand-written SQL `CHECK (col IN (...))`
   in migrations (Drizzle never generates DDL — query-mirror only, no drizzle-kit) [FACT: db/migrations/001_sync_queue.ts:14-31;
   db/schema/_shared.ts:7-10]. `ENTITY_TYPES` registry seeded with 5 core types, appended per-feature
   [FACT: db/schema/_registry.ts:1-15]. Baseline docs: `docs/infrastructure/database-layer/current-{spec,business-rules}.md`.

**Stated convention (the target this task realizes):** *"Enums: TEXT with CHECK constraints in SQL, canonical
Zod validators in `@vida/core`"* [FACT: CLAUDE.md:213; packages/types/src/CLAUDE.md:8-11].

**v1 legacy = anti-pattern to avoid:** `_legacy/schema.v1.ts` used plain `text()` with no CHECK and no validators
[FACT: db/_legacy/schema.v1.ts:170-172] — the exact gap DB-9 closes.

**PATTERN IN USE →** enum *literals* live as string-unions in `@vida/types` (keep as source of truth); the
canonical *validator* layer is genuinely NEW in `@vida/core` (add `zod` dep + a validators module); the SQL
`CHECK IN (...)` pattern already exists and is the DB-side parity partner. The load-bearing invariant DB-9 owns:
**@vida/types union ≡ @vida/core z.enum ≡ SQL CHECK set** — three expressions, one canonical set, must never diverge.

## Knowledge Loaded
- Baseline survey (above) — `path:line`-cited enum/validator/CHECK floor
- ADR-002 (enums = TEXT+CHECK in SQL, canonical Zod in @vida/core) — the governing contract
- packages/types/src/CLAUDE.md:8-11, packages/core/src/db/CLAUDE.md, CLAUDE.md:213 — stated conventions
- docs/infrastructure/database-layer/current-{spec,business-rules}.md — the DB-side parity context

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-28 | initialized task + scaffolded spec stub | Step 0 baseline → PLAN (/documentation-component) → critique → preflight |
| 2026-07-28 | FULL double-gated build DONE. 81 enum tuples (C2) + 81 z.enum validators + parity test; both gates + 2 independent critiques; 89 tests green, root typecheck 10/10 zero consumer edits; commit a137a44; LIF-106 → Done. | Next M1.0 head: DB-7 / AR-4 / UX-1 (substrates AR-5/6/7 now fully unblocked ← db-6+db-9). |

## Notes
