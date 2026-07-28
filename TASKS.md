# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Created | Updated | Status |
|------|---------|---------|---------|--------|
| ds-1-token-pipeline (LIF-81) | Design System | 2026-07-26 | 2026-07-27 | ⏸ PARKED — complete + green on branch `ds-1-token-pipeline` (out of sequence, -b track); resumes in -b wave |

## 🧭 Next session

**AR-2 DONE + M1.0 -a spine dep-graph RECONCILED (commit ef481c1). Corrected ready-frontier below.**
- **AR-2 recap:** async DatabaseAdapter + web-adapter (wa-sqlite/OPFS + drizzle-orm/sqlite-proxy). 5/7 DoD (contract);
  browser open/persist carried by **LIF-103** (Playwright+OPFS harness). Details: 2026-07-27→28 session-log.
- **Dep-graph reconcile (this session):** the -a spine was inconsistent (plan table vs Linear vs ADRs). Fixed +
  ADR-critiqued + repaired Linear (db-6/ar-9 were batch-TRASHED — restored). See docs/specs/fixes/m1.0-a-spine-dep-reconcile/.
- **CORRECTED READY-FRONTIER** (done = ar-1/db-1/ar-2):
  - **DB-6 (LIF-68) — Repository** ← ar-2 ✅ (spurious db-4 edge REMOVED → now genuinely unblocked). Owns the
    co-transactional sync_queue write + authors the sync_queue fragment. **Strong next head.** Profile: Add Backend Component.
  - **DB-9 (LIF-71) — enums+Zod** ← db-1 ✅ · **DB-7 (LIF-69) — migrations runner** ← ar-2 ✅ (authors app_state). Both ready, parallel.
  - **AR-4 (LIF-75) — state/routing/forms** ← ar-1 ✅ · **UX-1 (LIF-90) — IA** (no blockers). Parallel tracks.
  - Substrates **AR-5/AR-6 ← DB-6, DB-9** (NOT ready until those land) → AR-7 ← AR-5,DB-6,DB-9. **DS-1** built-but-parked (-b wave, unparkable).
- ✅ **FULL-M1.0 GRAPH NOW VALIDATED (2026-07-28, LIF-105, commit 5e36376).** The b/c/d tracks + db-3/4/8/10 + ar-4/8
  + qa-1 were per-edge reconciled across all 3 sources; independent ADR-critique clean; `--verify` 47 live. The
  ready-head→gated-build→next loop is now SAFE to run end-to-end. Key corrections: **db-8 ← db-7** (not db-6 — was an
  illegal M1.0←M3 edge; db-8 now rides db-7); ux-5 ← ux-1 (ar-3/M3 removed); db-10 ← +db-9; ds-4 ← +ds-3; ar-8 ← ar-6.
  Streaming loop settled: db-3/db-4 fold into consumer gates. Rule: graph edges = build-order blockers, not feeds (§5.1.1).
- ✅ **DB-6 DONE (2026-07-28, commit 7f90c9b, LIF-68)** — repository + sync_queue producer landed; unblocks the
  substrate tier (ar-5/6/7) + db-10 seed. See Completed table.
- ✅ **DB-9 DONE (2026-07-28, commit a137a44, LIF-106)** — 81 canonical enum tuples (C2 tuple-as-source) + 81 z.enum
  validators + SQL-CHECK↔tuple parity test; zod added (first in repo). Double-gated + 2 independent critiques; root
  typecheck 10/10 zero consumer edits, 89 tests green. **Substrates AR-5/6/7 now FULLY unblocked** (← db-6 ✅ + db-9 ✅).
- ▶ **READY HEADS NOW** (done = ar-1/db-1/ar-2/**db-6**/**db-9**): **DB-7** (migrations authoring ← ar-2), **AR-4**
  (state/routing/forms ← ar-1), **UX-1** (IA, no blockers) — all parallel; **AR-5/6/7** substrates now ready (← db-6+db-9);
  **DS-1** unparkable for the -b wave. Profile for DB/substrate heads: Add Backend Component.
- ✅ **AR-5 DONE (2026-07-28, commit f045ac1, merged 4956c81, pushed; LIF-107 → Done).** Sessions base substrate
  (Option-1 grain: spine + integration-contract STRUCTURE + 5 enums + thin registry). Effect-firing rail /
  transition engine / scheduler DEFERRED to AR-7/later. Double-gated + 3 independent critiques; typecheck 10/10,
  core 110/110. **CORRECTION to the prior head note:** AR-5 does NOT own the effect rail — that is AR-7
  (`foundation/effects`, ADR-004 §3.2.5 is the spec-OWNER, AR-7 builds it, AR-7 ← AR-5). See
  [[dont-manufacture-forks-from-non-authoritative-notes]].
- 🎯 **NEXT HEAD (done = ar-1/db-1/ar-2/db-6/db-9/ar-5, 6 of 30): AR-6 — Spaces (LIF-77)** OR **AR-7 — Capability
  + measurability + effect rail (LIF-78)**. AR-6 = independent 2nd substrate root (← db-6+db-9, ready now); AR-7
  MUST wait for AR-5 ✅ + **AR-6** (needs both). So **AR-6 is the ready head**; AR-7 unlocks once AR-6 lands.
  Profile: Add Backend Component. AR-8 ← AR-6 + DB-8.
- 🔧 **Dep-graph gap to reconcile (non-blocking):** write the intra-tier edge **AR-7 ← AR-5 + AR-6** into the
  delivery-plan §5 + Linear (the plan encodes only the external ← db-6+db-9). Same class LIF-105 cleaned for the -a spine.
- ⚠ **Manual Linear (Victor):** DB-9 synced as **LIF-106** (new) — reconcile vs roadmap **LIF-71** (dedup: keep one, remap slug).
- **Tracked follow-ups:** LIF-103 (browser E2E harness) · LIF-104 (toolkit: harden tracker visibility) · NIT-3 count()→count(*).
- **Manual Linear (Victor):** archive the 5 empty ①–⑤ shells · db-2 (LIF-64) disposition · confirm old LIF-56–59 gap · **dedup DB-9: LIF-106 (task-synced) vs LIF-71 (roadmap) — keep one, remap the slug.**

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
| **ar-5-sessions-base** (LIF-107 · M1.0 substrate SPINE · Sessions base per ADR-004. Option-1 grain: `sessions` spine + integration-contract STRUCTURE (`session_type_registry` + `session_attachments`) + 5 canonical enums (EFFECT_TYPE=12 incl. ADR-012 amendment) + thin SessionRegistry (register/get/list, BR-3/4/1, user types → db-6 Repository → sync_queue). Effect-firing rail/transition engine/scheduler DEFERRED to AR-7/later. Double-gated + 3 independent critiques [gate-1: EFFECT_TYPE 8→12 subset drift; gate-2: registry PK/Repository mismatch; post-impl: BR-4 effects⊆allowed⊆shipped]. typecheck 10/10, core 110/110. commit f045ac1, merged 4956c81, pushed. Currency §XXIX docs born. Unblocks AR-7. ⚠ LIF-107 dup roadmap LIF-76 — reconcile.) | 2026-07-28 | 1 (2026-07-28) |
| **db-9-enums-zod** (LIF-106 · M1.0-a spine · canonical enums+Zod. 81 @vida/types enums → `as const` tuple + derived union [C2 tuple-as-source = exhaustive, not `satisfies` ⊆] + 81 `z.enum` validators in @vida/core [zod ^4.4.3, first in repo] + SQL-CHECK↔tuple parity test [ADR-002 §2.3, ADR-016 §3.3 assert-only]. Double-gated + 2 independent critiques [PLAN caught buried tuple-location decision + sqlEnumCheck ADR-overreach; IMPL caught stale-dist false-green risk + 2 missed enums]. Verified: root typecheck 10/10 ZERO consumer edits, core 83 + web 6 green, literal-sets byte-identical vs HEAD. commit a137a44. Unblocks substrates AR-5/6/7) | 2026-07-28 | 1 (2026-07-28) |
| **db-6-repository-layer** (LIF-68 · M1.0-a1 spine · reconcile+extend of the v1-carried repository: sync_queue foundation table [ADR-002 §5.1 CHECKs+UNIQUE] + migration 001 registered; co-transactional UPSERT enqueue per mutation [ADR-004 §3.4]; M1.0 pass-through seam = empty [E] set + lazy vault key [ADR-017:20]. Baseline caught it was NOT from-zero. Independent /critique [7 fixed, 3 by source-verify — incl. refuting the "proxy has no .transaction()" risk] + 2nd critique [5 exec fixes incl. UPSERT correctness bug]. 10-case tests; @vida/core 55/55; commit 7f90c9b. Unblocks ar-5/6/7 + db-10) | 2026-07-28 | 1 (2026-07-28) |
| **m1.0-dep-graph-validation** (full-M1.0 dep-graph validated per-edge vs ADR contracts + reconciled across task files/Linear/delivery-plan §5; independent ADR-critique caught db-8←db-6 as illegal M1.0←M3; 9 edges corrected, 7 Linear mutations, --verify clean; streaming loop model settled. commit 5e36376) | 2026-07-28 | 1 (2026-07-28) |
| **ar-2-database-adapter-web** (LIF-73 · M1.0 critical-path ROOT · async DatabaseAdapter + web-adapter over wa-sqlite/OPFS + drizzle-orm/sqlite-proxy. DIRECTION corrected sync→async mid-build [wa-sqlite Factory API async-only] — Rev 3 re-gated. 5/7 DoD [contract]; items 1&2 [browser open/persist] → LIF-103. commit e55010f. Unblocks db-6/7, ar-5/6/8/9) | 2026-07-27 | 1 (2026-07-27) |
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
