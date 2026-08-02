# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Created | Updated | Status |
|------|---------|---------|---------|--------|
| **ar-7-capability-registry (LIF-78)** | Add Backend Component | 2026-08-01 | 2026-08-02 | 🔨 IN PROGRESS — the computed M1.0 head. **Now ⊞4** (DF-11 increment rule): ships as **4 gated increments** under LIF-78, order **effects → capability → measurement → economy**, each a full §XXVI double-gate; closes when census aligns all 4. → `core/src/foundation/{capability,measurement,economy,effects}` (ADRs 008/011/012/004). All 4 blockers ✅. Phase 1 (gate realignment, DF-11) shipped @ 403d25f — un-blocked. NEXT: Increment 1 (effects) §XXVI g1. |
| **delivery-structure-reconstruction** | Project Foundation | 2026-07-31 | 2026-08-01 | ✅ DONE (2026-08-01) — reconstructed to ADR-016 (Initiative→Project→Milestone→Issue) + re-organized LIVE Linear project-first: **M1–M4, 91 issues, 0 deferred edges**, LIF ids preserved, db-10 ← all 26 modules. Output: `docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md`. Remaining = Victor-owned Linear hygiene (move 5 archived DONE, close dups, archive old shells) + Foundation-project decision. |
| db-10-seed-and-fixtures (LIF-62) | Add Backend Component | 2026-07-31 | 2026-08-01 | ⏸ PARKED — now correctly homed at **M1 / M1.4** with its REAL dependency (← all 26 modules) encoded in Linear (DF-1 fixed). Un-parks when its milestone (M1.4) is reached in the build order. |
| ds-1-token-pipeline (LIF-81) | Design System | 2026-07-26 | 2026-07-27 | ⏸ PARKED — complete + green on branch `ds-1-token-pipeline` (out of sequence, -b track); resumes in -b wave |

## 🧭 Next session

**▶ CURRENT (2026-08-02) — UX-1 (IA) DONE + merged/pushed to main (f5a863b); LIF-90 → Done.**
UX-1 shipped the co-primary dual-axis IA (`docs/core/architecture/information-architecture.md` + `apps/web/src/nav/module-map.ts`).
Unblocks UX-2/UX-3/UX-4/UX-5. **NEXT: recompute the head via `tracker_sync --next`** (do not hand-read) — UX-1's dependents
are now ready. Watch: the ADR-007:88 amendment is owed to the future Spaces ADR (M1.1); the map's route slugs are M1.1-adjustable.

<details><summary>(prior) 2026-08-01 — delivery structure reconstructed + live</summary>

**DELIVERY STRUCTURE RECONSTRUCTED + LIVE; BACK TO THE BUILD LOOP.**
The reconstruction is DONE (Phase V): Linear is re-organized to ADR-016 (Initiative→Project M1–M4→Milestone→Issue),
91 issues, 0 deferred edges, db-10 fixed (← all 26 modules). Committed on branch `phase-v-delivery-reconstruction`
(ff35a6f) — merge to main + push when ready. Toolkit Phase-T @ ~/dev-toolkit (4b31176 + 02ab9ea).
- **The loop is LIVE:** `tracker_sync --next` → **`ux-1-information-architecture`** (M1/M1.0 root, 9 ready · 66 blocked).
  Trust `--next` — the frontier is real again.
- **FIRST STEP next session (2-min, before trusting `--census`):** retire/replace the stale `docs/roadmap/m1.0-delivery-plan.md`
  with `reconstructed-structure.md` as the census home-source (else `--census` shows old milestone names like "Substrates";
  `--next` is unaffected). Then resume the per-issue build gate on the computed head.
- Db-10 un-parks when its milestone (M1.4) is reached in build order. Manual Linear hygiene: DONE (Victor, 2026-08-01).

<details><summary>(prior) 2026-07-31 — reconstruction kickoff context</summary>

**DELIVERY STRUCTURE UNDER RECONSTRUCTION.** The db-10 triage escalated STRUCTURAL: the
whole **Project > Milestone > Issue** setup is malformed at its core (db-10 is a symptom — mis-homed to M1.0 with an
unencoded "needs the whole OS" dep; see the harvest DF register). We STOPPED building and switched to **Project
Foundation** (NEW scenario `delivery-structure-reconstruction`). **Step 1 (harvest draft) is DONE:**
`docs/specs/foundation/delivery-structure-reconstruction/intent-and-provenance-harvest.md` — the grounded,
fully-cited organization of PROJECT → MILESTONES M1–M4 → all deliverables (repo-home + ADR + docs + relationship
layer) + legacy/migration provenance + DF-1…DF-9.
- **NEXT:** /begin → resume the reconstruction. Victor confirms (1) milestone framing INT-1..4→M1..4, (2) module-row
  granularity → then RECONSTRUCT the real structure (granular issues, file-deliverables matching repo/architecture/
  docs, corrected relationships + outcomes, no orphans).
- **⚠ DO NOT trust `--next` / build any M1.0 head until the reconstruction lands** — the delivery-plan/tracker encode
  the malformed structure (that is what surfaced db-10 wrongly). The loop is sound; its input graph is not.
- db-10 PARKED (un-parks when re-homed). The 9 built units + 20 ADRs are immutable/preserved.
</details>
</details>

---

**▶ (prior) CURRENT (2026-07-30).** Done = ar-1/db-1/ar-2/db-6/db-9/ar-5/ar-6/db-7/**ar-4** (9 of 30). ar-4 committed on
branch `ar-4-state-routing-forms` @ 955a255 (NOT merged/pushed yet). Prior spine pushed to origin/main @ 60a0a60.

**▶ NEXT — RE-COMPUTE the head via `tracker_sync.py --next`** (do not hand-read). After ar-4, the parallel-ready
alts flagged were **db-10** (dogfood seed ← db-6/db-7/db-9 — now all ✅) and **qa-1** (Playwright+OPFS E2E ← ar-2).
AR-4 unblocks UI-3 (editor, ← ui-1+ar-4) and UI-4 (app shell) once their other blockers land. Profile per head.
⚠ First `/begin` next session: merge/push the `ar-4-state-routing-forms` branch, then run `--next`.

✅ **Item 1 DONE — the delivery-planning loop is built + merged** (in `~/dev-toolkit`, ADR-015): the `--next` re-plan
grew into the legacy-aware, hierarchical, file-traceable loop — `tracker_sync --census` / `--next` / `--plan <scope>`
+ begin/delivery-plan/§XXX wiring. 4 units, 6 independent critiques, 25 tests, live-verified (`--next`→db-7). The
loop now COMPUTES the frontier from this plan (dep-graph + `_clusters.md` milestones + statuses) with a per-node
progress + legacy digest — hand-deriving the frontier is retired. See the delivery-plan §4 Consumption Rule.
✅ **Branch cleanup DONE** (merged branches deleted incl. `fix-tracker-sync-dedup-guard`).

**✅ ar-4 DONE (2026-07-30, LIF-75).** Was the computed head off db-7; built as generic-coding (profile switched).
apps/web client runtime + the D5 main↔worker binding + ADR-020. Details in the Completed table + session-log.
Homes landed at `apps/web/src/{stores,routes.tsx,hooks,lib,db}` (architecture homes, NOT the §149 `{stores,router,forms}`
shorthand — §149 cell is a flagged hygiene follow-up).
> **AR-7 is NOT the head** — READY (blockers all ✅) but in the *later* `Substrates` sub-wave. Boot & DB spine
> drains first (ar-4 · db-10 · qa-1). Always trust `--next`, never hand-read a prose "next".

**🔎 DELIVERY-LOOP AUDIT (2026-07-29) — VERIFIED SOUND.** The loop (ADR-015) resolves correctly: `--verify` 47/47
live · map complete (47 issues, all 38 active nodes ⊆ map) · 0 duplicate active nodes · **0 dangling blockers**
(nothing falsely suppressed) · all frontier waits legitimate. The db-7-vs-AR-7 "disagreement" was sub-wave
ordering working as designed, not a bug. Robustness comes from `parse_tasks` globbing active-only + `is_done`
file-wins-then-map. Details: [[delivery-loop-verified-sound]].

**✅ AR-7 edge reconcile DONE (this session):** added the intra-tier `AR-7 ← AR-6` blocker (was missing from both
the task file and delivery-plan §5) + wrote `AR-5, AR-6, DB-6, DB-9` into §5 row 165 + §4 model. Confirmed `--next`
unchanged (graph-honesty, not a re-route). NB: `ar-5-sessions-framework` (LIF-76) is CANONICAL — not a stale slug.

**🧹 Hygiene follow-ups:**
- ✅ RESOLVED 2026-07-30 (Phase A re-org): Delivery-plan §5 AR-6 Home `{spaces,views,effects}` → `{spaces,views}`
  (`effects/` is AR-7's home).
- ✅ RESOLVED 2026-07-30 (Phase A re-org): purged the one true dedup residue `ar-6-spaces-and-tags` (a keyless /
  `# Linear:`-less duplicate of `ar-6-spaces` LIF-77). The other 3 files the earlier note lumped in —
  `ar-5-sessions-base`, `ar-6-spaces`, `db-9-enums-and-zod-validators` — are CANONICAL archived-done tasks, NOT
  residue; kept. (Now that the loop reads `archive/`, the "inert" assumption no longer holds — hence the correction.)

**⚠ Manual-Linear (Victor, Linear UI only):** **NEW → LIF-78 (AR-7) blocked-by LIF-76 (AR-5) + LIF-77 (AR-6)**
(the tracker writes identity, not blocker relations); archive the 5 empty ①–⑤ Project shells; db-2 (LIF-64) disposition.

Full detail in `.claude/session-log.md`. Historical AR-*-era notes below (kept for reference):

---

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

**Git:** `main` pushed to `origin/main` through `3c2adb7` (AR-5 merged + closed out, 2026-07-28). In sync.

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
| **ux-1-information-architecture** (LIF-90 · M1/M1.0 experience-track ROOT · computed head via `--next`. The web app's IA + **co-primary dual-axis nav model** — module dock (content home) + Spaces bar (cross-cutting overlays); amends ADR-007:88, ADR-006 §3.4 cover; Spaces bar = seam live M1.1. Deliverables: `docs/core/architecture/information-architecture.md` + `apps/web/src/nav/module-map.ts` (23 modules placed) + layer-doc. Grain: design/spec issue that also emits a declarative code artifact (dual home). 4 gates (PLAN critique+preflight, map critique — 3 REVISE all fixed) + **Victor primary-doc audit** caught Routines misclassified (harvest read the cockpit as inside-Sessions). Placements: Routines→dock, Check-ins→secondary, Gamification→conditional dock, Sessions→dock, Pomodoro/Flashcards→non-nav, Languages/Bucket-List→spaces-only. Homes verified vs ADR-018 (per-app, not shared pkg). typecheck 0, lint 0-err, routes.tsx untouched. Currency: BR-NAV-1..4 promoted. commit f5a863b → merged+pushed to main. Unblocks UX-2/3/4/5.) | 2026-08-02 | 1 (2026-08-01→02) |
| **ar-4-state-routing-forms** (LIF-75 · M1.0 Boot & DB spine · COMPUTED head via `--next` off db-7. apps/web client runtime: Zustand + React Query v5 + TanStack Router + TanStack Form/Zod, **+ the main↔worker DB binding AR-2 assigned to AR-4** (D5: `db/client.ts` SqliteDriver proxy over the worker RPC w/ timeout+crash handling; extended `worker.ts` protocol; `boot.ts` DB-ready gate). Grain = mechanism + 1 reference/plane; values/batch = deferred seam. **ADR-020** resolves the long-deferred ADR-001:286 (Zustand placement = per-app hooks). Profile switched → Generic Coding Session. Full §XXVI double-gate + §XXX: 2 plan critiques + preflight (surfaced the missing D5 layer) + post-impl critique (happy-path-only error handling → RPC timeout/onerror + worker default + boot memo-clear + App error/retry) + engineering gate PASS. typecheck 10/10, @vida/web 21/21, build green. commit 955a255 on branch `ar-4-state-routing-forms`. Victor corrected 2 manufactured forks (grain + binding ownership both already in docs). §XXIX docs at docs/infrastructure/web-client-runtime/.) | 2026-07-30 | 1 (2026-07-29→30) |
| **db-7-migrations-runner** (LIF-69 · M1.0 Boot & DB spine · COMPUTED head via `--next`. Reconcile+extend of the existing runner: authored the `app_state` infra table (`schema/foundation/app-state.ts`, ADR-002 §5.0) + `ensureInfra` pre-loop bootstrap + dev-only `resetDev`. **Closed a latent boot bug** — engine assumed `app_state` but no production migration created it → `migrate()` threw at real web boot (`worker.ts:23`), masked by 4 test fixtures (retired). Engine untouched; forward-only preserved (no `down()`, inherited §9.2 divergence → DB-11). Full §XXVI double-gate + 3 independent critiques (all SHIP; gate-1 caught a 4th fixture + BR-5 mechanism). typecheck 10/10, @vida/core 131/131, @vida/web 6/6. §XXIX docs shipped together. commit d7aa1e0. Also this session: manufactured-fork correction (memory [[read-architecture-before-implementing]]) + delivery-loop audited sound + AR-7 edge reconcile.) | 2026-07-29 | 1 (2026-07-29) |
| **ar-6-spaces** (LIF-77 · M1.0 substrate spine · Spaces per ADR-006 (SP1–SP7) + ADR-007 (V1–V5). 6 tables (`tags`·`entity_tags`·`entity_links`·`spaces`·`space_enabled_blocks`·`views`, migration 003) + `TaggableTypeRegistry` (SP2 open) + `SpacesService` (BR-14 idempotent junctions, BR-15 resolve-then-soft-delete, BR-3/5 cycle guards, BR-13 M1.0 empty-[E] pass-through) + `ViewsService` + `ViewProviderRegistry` (empty V4/R7 seam) + `ViewEngine` (V3/V4/V5). Deferred: capability registry/block_instances→AR-7, backlink resolver→AR-8, effect rail→AR-7, DSL/layout/resolution-surface→build-time. Double-gated + 3 independent critiques [g1×2: scope-drift + link_type-in-prompt; g2: 3 executability defects vs real repository.ts; post-impl: missing spaces cycle-guard]. §2.1 gather-protocol born after a triage. typecheck 10/10, spaces 14/14, parity 7/7. commit e2a170d → merged fad233b. Currency §XXIX docs at docs/core/spaces/. Unblocks AR-7. LIF-77 canonical (Facet A reconciled the LIF-108 dup).) | 2026-07-29 | 1 (2026-07-28→29) |
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

---
*To add a task: /task-new [name]*
*To switch tasks: /task-switch [name]*
*To complete a task: /task-complete [name]*
*To see full status: /repo-status*
