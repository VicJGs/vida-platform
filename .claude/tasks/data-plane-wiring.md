# Task: data-plane-wiring
# Status: ⏸️ BUILT + UNIT-VERIFIED — HELD (PR #148, draft) until ~Nov 1 for the OPFS E2E acceptance run
#   Build done 2026-10-20 (tsc PASS · eslint · @vida/web 661/661 · zero frontend done-task files touched).
#   Pending ONLY: the OPFS CRUD E2E browser run (data-plane-crud.spec.ts) — macOS 12 can't fetch Chromium +
#   CI Actions budget exhausted → runs at the free ~Nov 1 reset (no subscription needed) OR a Linux DevContainer/Codespace.
#   UNFLAG/MERGE when that E2E is green.
# Linear: pending (guarded create — parallel sessions in flight; mint via track-sync when the tree clears, per the orphan-create guard)
# Profile: Generic Coding Session
# Scenario: (resolved at the planning step)
# Created: 2026-10-20
# Milestone: M1 / M1.1.3 (Depth & Recovered · Backend) — DERIVED, not chosen
# Home-derivation: docs/specs/fixes/home-deferred-substrate-pieces/PLAN.md §1 — first-consumer-pull ("a substrate lands when its first consuming module needs it") + build-order. fe-notes-and-pages (first consumer) is SHIPPED → pull-due NOW; completes AR-2's deferred "Drizzle-write variant" seam (ar-2 _index:24).

## Goal
Build the foundational live data plane so each module's frontend becomes usable with real persistence **as it is built** — a build-once foundation + per-module `register + flip`, giving INCREMENTAL availability (module A live while module B stays an honest-empty stub). Closes the `notes-dataplane-orphan-deferral` drift (this is the real owner the phantom "UI-3/M1.1+" label pointed at).

## Scope — DERIVED FROM EXISTING DOCS (no new design; see docs/specs/fixes/notes-dataplane-orphan-deferral + the 2026-10-20 doc-resolution pass)

**Build ONCE (the foundation):**
**⛔ REVISED 2026-10-20 (Victor): PURELY ADDITIVE — zero already-done-task files modified.** `client.ts` (stub driver) + `client.test.ts`, all `notes/*` + `home/*`, every merged `fe-*` stay UNTOUCHED.

**Build ONCE (the foundation — all NEW code):**
1. **Worker-side Drizzle ops** — ADD `values`/`batch`/`exec` to the worker RPC (`apps/web/src/db/worker.ts`, additive; no test asserts their absence). Shapes per the built contract (`@vida/core adapter.ts:61-85,182`); `batch`→`BEGIN/COMMIT` (`adapter.ts:80,256-260`).
2. **Live driver (NEW file)** — `createLiveDriver(client): SqliteDriver` over the RPC, consuming the S1 ops. Does NOT modify `client.ts`'s throwing stub driver (it + `client.test.ts` stay green); any RPC-channel exposure is additive-only.
3. **Composition root (NEW)** — `createDrizzleProxy(createLiveDriver(client))` after the DB-ready gate; build registries once; construct `createNotesService`/`createJournalsService` (+deps, dep-order per `services/notes/types.ts:20-28`); `deviceId` ← `app_state` (ADR-002 + `uuidv7()`); expose via the EXISTING `ProviderRead`/React-Query convention (`seams/CLAUDE.md` — "do not re-invent"); App.tsx gains ONE additive provider wrapper.

**Per-module go-live (register + flip) is OUT of this unit.** Each module's flip (`registerX*` + `useQuery`, BR-RT-2/4) is a SEPARATE, explicit COMPLETION of that done task, done when Victor chooses. This unit only ENABLES it.

**Proof (this unit):** extend the QA-1 `db` fixture (reserved extension point, `qa-1 _index §1/§2`) — construct the live driver + `createNotesService`, write→reload→read CRUD in a real OPFS worker. **No surface hook flipped.** Do NOT build a new harness.

**OUT OF SCOPE (separate, documented seams — do not fold in):**
- Yjs editor-BODY persistence (`pages.content` CRDT via the `canvas-editor/page-binding` — IR-7). Distinct seam, its own future unit.
- FTS5 search (DB-8 / M1.4).

## Reinvention guard (already built/documented — do NOT rebuild)
`createDrizzleProxy` + SqliteDriver result shapes (`adapter.ts`); write/invalidation convention (BR-RT-2/4); QA-1 `db` fixture; the 001-033 migration registry (migrates notes/journals on boot); service factories + `useXService()` convention; the Yjs body binding.

## Dependencies
- Blocked by: none (all primitives built).
- Blocks: the live usability of every `fe-*` module surface (the swap-ready MVP-1 fleet).

## Homing (ALIAS ONLY — revised 2026-10-20; no done-task file touched)
Record one authoritative alias — "`UI-3/M1.1+` = `data-plane-wiring`" — in `MVP-PATH.md` (the plan doc) + this unit's `_index` + a `.claude/docs/decisions.md` entry. Leave EVERY code/currency-doc phantom ref untouched; they resolve via the alias. (No `db/client.ts`, `notes/*`, etc. edited for homing — honors the additive invariant.)

## Build Steps
_(filled by the IMPLEMENTATION-PLAN after Approval 1 — not yet gated.)_

## Route History
- 2026-10-20 — Minted as a FOUNDATIONAL unit (Victor's directive: wire modules so already-built frontends are usable as more are built; feasibility verified YES/by-design). Scope + home DERIVED entirely from existing docs (two investigation passes + the homing rules); zero open decisions. §XXVI planning gate opening: document-context baseline → PLAN → critique → Approval 1 → IMPLEMENTATION-PLAN → preflight → critique → Approval 2 → build.
