# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Created | Updated | Status |
|------|---------|---------|---------|--------|
| ar-2-database-adapter-web (LIF-73, Boot & DB spine) | Add Backend Component | 2026-07-27 | 2026-07-27 | **IMPLEMENTED + green** (async proxy; 10/10 tc · 6/6 tests · post-impl SHIP) — **UNCOMMITTED**; browser/OPFS path verification-deferred; §6 repo-CRUD re-scoped→DB-6 |
| ds-1-token-pipeline (LIF-81) | Design System | 2026-07-26 | 2026-07-27 | ⏸ PARKED — complete + green on branch `ds-1-token-pipeline` (out of sequence, -b track); resumes in -b wave |

## 🧭 Next session

**AR-2 IS BUILT + GREEN (LIF-73 · critical-path root). Close it out: COMMIT → /task-complete → LIF-73 Done.**
- **DIRECTION was corrected mid-build:** wa-sqlite@1.0.0 Factory API is async-only → sync driver IMPOSSIBLE →
  adopted the delivery-plan's **async Drizzle proxy** (`drizzle-orm/sqlite-proxy`). Rev 3 re-gated (both critiques);
  Victor confirmed. Deleted Rev-2's C6 custom-session risk. Details in the 2026-07-27 session-log entry.
- **State:** implemented A1–A5·R1·R2·W1–W5; full typecheck 10/10; AR-2 tests 6/6; post-impl critic SHIP (0 blocking).
  Currency docs refreshed + `apps/web/src/db/CLAUDE.md`. **19 files UNCOMMITTED on main** (code + docs + task files).
- **FIRST ACTION:** decide commit target (short-lived branch vs main) → commit **code + docs together** (§XXIX) →
  `/task-complete ar-2` → flip **LIF-73 → Done**. Then AR-2 unblocks **db-6/db-7/ar-5/ar-6/ar-8/ar-9** (db-6 next head).
- ⚠ **AUDIT CAVEATS before calling it "done-done":** (1) the real wa-sqlite path (web-driver/web-adapter/worker) is
  **typecheck-only — no executed test**; the 6 tests use a better-sqlite3 stand-in (`:memory:`). BR6 OPFS persistence
  is **verification-deferred** to a Playwright smoke that does NOT exist yet. (2) §6 "createRepository create→read-back"
  was **re-scoped to DB-6** (needs vault unlock = M3) — needs Victor's acceptance.
- **Tracked follow-ups:** Playwright OPFS/worker smoke · repo-CRUD e2e w/ vault-unlock in DB-6 · NIT-3 count()→count(*).

**PARKED — DS-1 token pipeline** (branch `ds-1-token-pipeline` @ fd9f144): complete + green but out of sequence
(M1.0-b, not the -a critical path); LIF-81 → Backlog. Resumes when the -b wave's turn comes. (This session built
DS-1 first, then course-corrected to the -a spine head AR-2 per the milestone order.)

**Linear hygiene done:** LIF-72 (ar-1) + LIF-61 (db-1) → Done (were lagging Backlog). LIF-73 (ar-2) → In Progress.

---
<details><summary>✅ FOUNDATION-REALIGNMENT CAMPAIGN COMPLETE (2026-07-25) — prior context</summary>

Part 1 (docs realignment, 34/34 aligned) + Part 2 (repo structure, ADR-018) + Part 3 (roadmap resequence, ADR-019)
done; docs + structure + roadmap coherent (ADRs 001–019). Linear mirrors M1→M4 (M1.0 = 30 issues). M1.0 build is
now underway (AR-2 above).</details>

**Standing follow-ons (create-at-gate, not tasks yet):** net-new module/integration/venue Linear issues are created as
each M-phase begins. **Manual:** archive the 5 empty ①–⑤ Linear Projects in the Linear UI (tracker can't delete Projects).

**Git:** `main` is ~60 commits ahead of `origin/main` — unpushed (push on request).

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
| **qa-1-e2e-harness-opfs** (Playwright + OPFS/worker E2E harness; proves AR-2 items 1&2 — browser open/reopen/persist. Blocked-by ar-2. Net-new shared infra from the AR-2 audit) | Add Backend Component | M1.0 — after AR-2 |
| **Storage rebuild — from zero** (v1 schema ~60% stale → author v2 from scratch; `ADR-016` + `storage-build-plan.md` ledger + per-table gating. DB-1/LIF-61 ✅ done.) | Generic Coding Session | ⏸ **PARKED by ADR-017** — sequencing inverted to features-first; schema now authored per-feature, not full-schema-first. Resurfaces (incl. encryption/sync at DB-5/DB-2) in the post-validation hardening pass. |
| Toolkit scan-cascade audit + 6 command migrations | toolkit-development | parked — filed in ~/dev-toolkit/.claude/tasks/ |
| Integrate /task-new ↔ native task panel | toolkit-development | parked — sync gap found 2026-06-08 |
| Global Calendar (cross-module read-only aggregator over `dueIn`) | (feature) | parked platform surface — build when its feeder modules are built |

## ✅ Completed (last 30 days)

| Task | Completed | Sessions |
|------|-----------|----------|
| **m1.0-delivery-plan** (Milestone Delivery Planning — new scenario crystallized. docs/roadmap/m1.0-delivery-plan.md: 30 M1.0 issues bound 1:1 to entity·ADR-018 home·intent·profile·flow·DOC spine·deps·gate; critic SHIP after 1 fix; grain+dep reconcile caught fold/split + inversion + 2 stale Linear edges [cleaned both sides]. Strategy meta-task, not a Linear issue) | 2026-07-26 | 1 (2026-07-26) |
| **linear-projectize** (U3 — re-scoped LIF-61…95 onto the roadmap M1→M4: created M1.0/M1.4/M2/M3/M4 Projects, moved 33 existing issues to final homes, created split/head issues LIF-98…101, old ①–⑤ emptied; LIF-97 Done) | 2026-07-26 | 1 (2026-07-25→26) |
| **build-roadmap-resequence** (→ foundation-realignment campaign: P1 docs realignment + P2 repo structure [ADR-018] + P3 roadmap resequence [ADR-019]; all exit gates accepted; docs+structure+roadmap coherent, derived from ADRs 001–019; LIF-96 Done) | 2026-07-25 | many (2026-07-23 → 07-25) |
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
