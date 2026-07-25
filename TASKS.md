# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Created | Updated | Status |
|------|---------|---------|---------|--------|
| build-roadmap-resequence (→ **foundation-realignment master campaign**; roadmap resequence = Part 3) | Project Foundation Setup | 2026-07-23 | 2026-07-25 | **✅ PARTS 1 + 2 COMPLETE — both exit gates ACCEPTED (2026-07-25).** Part 1 = docs realignment (34/34 aligned). **Part 2 = repository structure: full double-gate + both exit lenses (independent critic ACCEPT + quality-gate-foundation PASS); `@vida/core` re-derived from docs via ADR-018 (`foundation/` substrate tier + kept `services/` tier; v1 monolith quarantined/unwired; build 8/8 + typecheck 10/10 green; structure only, ADR-017). Commits f63786e/e45a081/56d56c5 on `feat/part-2-repository-structure`.** **NEXT = Part 3 (build roadmap resequence — forward-declared, earns its own gate-1; scenario = Build Roadmap).** |

## 🧭 Next session

**✅ PARTS 1 + 2 COMPLETE — both exit gates ACCEPTED (2026-07-25). NEXT = Part 3 (build roadmap resequence).**
Part 1 (docs realignment, 34/34 aligned) + Part 2 (repository structure — `@vida/core` re-derived from docs per ADR-018;
`foundation/`+`services/` skeleton; v1 monolith quarantined/unwired; build+typecheck green) are both done and accepted.

**FIRST ACTION next session — Part 3.0 planning (its own gate-1):** Part 3 is FORWARD-DECLARED (scenario = Build Roadmap).
Rewrite `docs/roadmap.md` features-first off the realigned docs + the new repo structure: capture build intent (first
deliverable + [RP] + goals), dependency map + cluster decomposition, foundation gate + independent critic, then projectize
+ gated `/track-sync`. Read first on resume: `realignment-master-plan/_index.md` (Part-3 forward-declaration) + ADR-017
(features-first, what Part 3 sequences) + the now-realigned `docs/roadmap.md`.

**Open Q for Part 3.0:** the "RP" abbreviation (first deliverable) — still `[UNKNOWN]`, resolve at Part 3.0.

**Branch:** Part 2 committed on `feat/part-2-repository-structure` (f63786e/e45a081/56d56c5). Merge to `main` when ready.

**FIRST ACTION next session — Part 2.0 planning (its own gate-1):**
Part 2 is FORWARD-DECLARED, not yet detailed — it earns its own gate-1 plan before execution (per the master-plan
umbrella framing). Derive the target repo structure from the now-realigned docs: package boundaries; `core/src` homes
for the 5 substrates (sessions/spaces/capability/measurability/economy); `schema/` organization; a disposition ledger
(keep/migrate/quarantine/delete) for every censused file/dir; execute the reorg (quarantine legacy → `Old/_legacy`,
stand up the correctly-shaped skeleton, unwire the v1 `schema.ts` monolith). **Structure only — no feature code.**
Likely **ADR-018** (retire Phase-0 architecture; re-derive from docs). Full double-gate per unit + exit gate.

**The Part-1/Part-2 boundary is now LIVE:** Part 1 deliberately deferred every code/directory-home call
(`[DEFERRED — Part 2]`) — Part 2 is where those homes get decided. The realigned docs cite conceptual owners (ADRs);
Part 2 places them.

**Read first on resume:** `realignment-master-plan/_index.md` (Part-2 forward-declaration + the umbrella framing)
+ the `current-state-baseline/baseline.md` (the file census Part 2's disposition ledger works from) + `ADR-016`
(storage rebuild — the `schema.ts` monolith unwire) + `ADR-017` (features-first, what Part 3 sequences).

**Deferred open Qs (still open):** "RP" abbreviation (Part 3.0, non-blocking); V1/ADR-007 saved-views dedicated
reframe pass; the noted gamification stale-half-line was fixed this session (no longer open).

**Reusable patterns locked across the campaign** (full per-unit detail in the session-log; kept here as the Part-2 toolkit):
- **Per-unit LITE loop:** ground → read ALL 5 aspects to refine the sweep's single-aspect verdict → **grep the live schema floor FIRST** → persist a PLAN → independent adversarial critique → fix → approve → implement → grep-verify.
- **Two critiques for big work:** a PLAN critique (can't catch execution drift) AND a POST-IMPLEMENTATION critique on the prose (catches stale mechanisms surviving as ordinary English).
- **R6 has two shapes:** recovered-domain (no As-is floor, e.g. health/core) vs live-schema (real floor → two-tier retire, e.g. habits/projects/finance) — grep the schema to tell which.
- **Substrate reframes:** X*/AI* ingest layering · M1/M2 measured framing · S1 sessions reframe · E9 god-table split · pure-gap net-new token-naming.
- **The gate's own lesson (this session):** a sweep "aligned/gap" label scores the *token surface* — a context that is *silent* (names no retired token) can still fail applicable predicates ("aligned by omission"). The whole-corpus exit gate + sibling-doc cross-check is what catches it. Check verdicts against *applicability* (framework §4), not just anti-signal presence.

## 🔴 Blocked

_(none)_

## 📋 Planned

| Task | Profile | Priority |
|------|---------|----------|
| **Storage rebuild — from zero** (v1 schema ~60% stale → author v2 from scratch; `ADR-016` + `storage-build-plan.md` ledger + per-table gating. DB-1/LIF-61 ✅ done.) | Generic Coding Session | ⏸ **PARKED by ADR-017** — sequencing inverted to features-first; schema now authored per-feature, not full-schema-first. Resurfaces (incl. encryption/sync at DB-5/DB-2) in the post-validation hardening pass. |
| Toolkit scan-cascade audit + 6 command migrations | toolkit-development | parked — filed in ~/dev-toolkit/.claude/tasks/ |
| Integrate /task-new ↔ native task panel | toolkit-development | parked — sync gap found 2026-06-08 |
| Global Calendar (cross-module read-only aggregator over `dueIn`) | (feature) | parked platform surface — build when its feeder modules are built |

## ✅ Completed (last 30 days)

| Task | Completed | Sessions |
|------|-----------|----------|
| **storage-master-plan** (ADR-016 + storage-build-plan master ledger; both gates; commit 58dc813) | 2026-07-22 | 1 (2026-07-22) |
| **db-1-schema-primitives** (LIF-61 · P0 storage-rebuild primitives; both gates + review battery + 4 consistency passes) | 2026-07-22 | 1 (2026-07-20→22) |
| **build-roadmap** | 2026-07-20 | 3 (2026-07-20) |
| **documentation-blueprint** | 2026-07-19 | ~20+ (2026-06-08 → 07-19) |
| toolkit-setup | 2026-06-08 | 2 |

---
*To add a task: /task-new [name]*
*To switch tasks: /task-switch [name]*
*To complete a task: /task-complete [name]*
*To see full status: /repo-status*
