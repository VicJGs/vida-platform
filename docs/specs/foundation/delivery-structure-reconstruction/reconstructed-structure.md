# Reconstructed Delivery Structure — Vida (Initiative → Project → Milestone → Issue)

> **Phase V of `delivery-structure-model` (LIF-110).** Re-organizes the malformed structure to the model the toolkit work
> (T0 realign-cluster-to-project + T1 ADR-016) established, from `intent-and-provenance-harvest.md`.
>
> **THE ONE CANONICAL STRUCTURE** (golive-replan G3 part 2, 2026-10-21 — `golive-replan/g3-order.md` §4). The frontend
> 42-unit order (frontend-replan G5, `frontend-replan/reconstructed-structure.md`) is now merged in here (M1.2.1–M1.2.3,
> #72–113) and that doc is a pointer. Also added: the `data-plane-wiring` row (#59) and Milestone **M1.2.4 — Live
> Close** (#60–66 + #115). `#` renumbered contiguously 1→143 (the old `#64`/`#65` collision is gone). Status glyphs
> refreshed from the merged-PR oracle (`git log origin/main`, through PR #151) > Linear > the task file's `# Status:` line
> (`MVP-PATH.md:205`).

## 1. The 4 tracked levels (Linear entities — ADR-007:54,101 + ADR-016)
| Level | = Linear | Definition | In Vida |
|-------|----------|-----------|---------|
| **INITIATIVE** | Initiative | logical product / repo (ADR-007:16,36) | **Vida** (1) |
| **PROJECT** | Project | a **build TIER** — a horizontal front (ADR-016) | **M1 · M2 · M3 · M4** (the 4 intents) |
| **MILESTONE** | ProjectMilestone | a **delivery-SLICE** of a tier — showcase-able (ADR-016) | **M1.0 · M1.1.1–M1.1.3 · M1.2.1–M1.2.4 · M1.4**, M2.0, M3.0, M4.0 |
| **ISSUE** | Issue | a **sprint** = one deliverable; names homes + dep edges (ADR-016 db-10-proof) | `AR-1`, `DB-1`, `MOD-notes`… |

## 2. Naming convention + glossary (nothing undefined)
- **Initiative** — `Vida`.
- **Project** — id `M<n>` (n = tier build-order 1–4). Title `M<n> — <Tier Name>`. Description = intent + Done-when.
- **Milestone** — id `M<n>.<m>` (m = slice order in the tier). Title `M<n>.<m> — <Slice Name>`. *(The dotted number IS the hierarchy: `M1` = Project, `M1.0` = a Milestone under it.)*
- **Issue** — **existing issues keep their established slug + LIF id** (no renames). New issues take a descriptive slug. Every Issue has a reliable imperative title + all columns below.
- **Slug prefixes in use** (descriptive, established — NOT a rename mandate): `AR` Architecture&Runtime · `DB` Database&Storage (`DB-8b` blind-index) · `DS` Design System · `UI` UI · `UX` UX&IA (`UX-5b` vault-unlock) · `MOD` Feature Module *(new — DF-4)* · `P3` External-Integration phase (M2) · `M3-pass` encryption release-gate · `P2` Venue phase (M4, `AR-9b` sync-activation) · `QA` Testing · `HARD` Integration-Hardening *(new)* · `MIG` Migration/Retire *(new)* · `CAP` Capability-authoring *(new — post-core extensibility, DF-12)*.
- **Column glossary:**
  - **`#`** = the **global build order** — the topological sequence across the WHOLE initiative. Do issues in `#` order and every dependency is already done (fail-proof). `#` runs **1→143** continuously down this doc. Ranges: M1.0 #1–30 · M1.1.1 #31–41 · M1.1.2 #42–58 · M1.1.3 #59 + #67–71 (split around the debt, EX-5) · **M1.2.4 #60–66** (+ its sub-issue #115) · M1.2.1 #72–96 · M1.2.2 #97–103 · M1.2.3 #104–113 · M1.4 #114–122 · M2.0 #123–129 · M3.0 #130–134 · M4.0 #135–143. *History:* P6 inserted 24 `FE-*` rows at #64–87 (colliding with MOD-routines/MOD-tasks at #64/#65); golive-replan G3 (2026-10-21) replaced them with the 42-unit surface order, added data-plane + M1.2.4, and renumbered contiguously.
  - **Doc order = `#` order, not milestone-number order.** M1.2.4 sits right after the data plane (#59) and before the rest of M1.1.3 and all of M1.2.1 (`golive-replan/g3-order.md` §1; routing basis in §4); its sub-issue sits inside the M1.4 block (EX-1).
  - **`←` Blocked-by** = the issues this one depends on (must be done first). `root` = no blockers. **`~X`** = soft edge (recorded for order; not a blocker).
  - **`→` Blocks** = the issues this one unblocks (are waiting on it). `leaf` = blocks nothing.
  - **Profile** (fixed): **Backend**=Add Backend Component · **Design-Sys**=Design System · **Generic**=Generic Coding Session · **Foundation**=Project Foundation Setup · **Add Frontend Component** (the ② surfaces) · **Add Frontend Component → `entity-rescope`** (the M1.2.4 debt units, closing on the ELC, `golive-replan/process.md` §2).
  - **Status:** ✅ shipped(merged) · ◧ built+parked off-sequence (NOT merged) · ⏳ ready/next or in flight · ⏸ blocked · ◻ not-started · ⊘ dissolved/never minted (no live issue) · 〰 stream (authored incrementally at each consumer's build) · ⚠ UNDEFINED/EMERGING (scoping deliverable — define before build).
    > **⚠ Glyphs are a point-in-time SNAPSHOT and may lag.** The authoritative live done-status and the
    > *computed next head* are owned by `TASKS.md → ## 🧭 Delivery Routing` (walk `#` ascending; first not-done,
    > non-`〰`, all-blockers-done issue). The `#` column (build ORDER) is stable and authoritative; the glyphs are not.
  - **⊕split** = a heavy unit that fans into sub-issues (frontend-replan G5 §0); `journals-rescope-dashboard` (#115) is one, held at its own `#`.
  - **DF** = **Structural Defect** — a flaw in the OLD structure (from the harvest's Defect Register, §3) that this reconstruction fixes.
  - **⊕agg** = the **all-module aggregators** {HARD-1, DB-10, DB-11, MIG-1, DB-5} — each depends on the FULL M1.1.1–M1.1.3 `MOD-*` set, so every `MOD-*` blocks them (written `→ …, ⊕agg` to avoid repeating five ids per module).
  - **`⊞N`** = an **Outcome-cell** marker (orthogonal to Status): the issue authors N independent substrates and is delivered in **N gated build-step increments** — one full §XXVI double-gate per substrate, in dependency order (the multi-substrate rule, `delivery-plan §2`; DF-11). Absent = single increment. Folds (Views→AR-6) and coupled multi-layer deliverables (DB-9) are NOT marked.

## 3. Structural Defects (DF) resolved
| DF | Defect in the OLD structure | Resolution here |
|----|-----------------------------|-----------------|
| **DF-1** | db-10 mis-homed to the spine; real "needs every module's tables" dep unencoded | `DB-10` → M1.4 (#120); Blocked-by enumerates **every M1.1.x `MOD-*`** — its `#` is late, never an M1.0 head |
| **DF-2** | `DB-8` (FTS5) latent same-shape | `DB-8` → M1.4 (#118); ← DB-4, DB-7 |
| **DF-3** | stale/illegal upstream edges | all removed; every `←` points to a LOWER `#` (proven in §5) |
| **DF-4** | ~25 modules were prose, never Issues | every module is a first-class `MOD-*` Issue |
| **DF-5** | M1-as-Milestone vs M1.0-as-Project grain-collapse | fixed at root: `M1`=Project, `M1.0`=Milestone |
| **DF-6** | off-sequence build (DS-1) | `DS-1` = ✅-built/parked, kept in `#` order |
| **DF-7** | home shorthand ≠ real path | every Home is a real ADR-018 path |
| **DF-8** | profile per Issue unstable | every Issue has a fixed Profile |
| **DF-9** | v1 retire-at-parity untracked | new Issue `MIG-1` (#121) |
| **DF-10** *(this session)* | **no global build order** — issues had layers but no first→last sequence | the **`#` column** = a full topological order; §5 proves it acyclic |
| **DF-11** *(this session)* | multi-substrate issue had no per-increment gating spec — the delivery-plan's per-issue flow (§2) assumed issue = one build-context (true only of the single-substrate issues it was written against, AR-5/AR-6) | per-substrate **increment rule** + **enforced gate precondition** written into `delivery-plan §2/§3`; issues authoring >1 independent substrate marked `⊞N` in Outcome (AR-7 ⊞4, AR-8 ⊞≥2); folds/coupled/integration stay 1 gate (Views→AR-6, DB-9, HARD-2) |
| **DF-12** *(this session)* | AR-7's cited deferrals had no proven issue HOMES (orphan-deferral risk, db-10-shaped) | homed by the docs' first-consumer-pull rule: registry-runtime → MOD-notes-and-pages `#40` / UI-3 `#29` (its live remainder → notes-rescope `#61`); `capability_grants` external-semantics → P3-boundary `#129` (M2); **new** `#143 CAP-authoring` for the ADR-010/SP4 safe-authoring runtime (its only un-homed consumer). `CAP-` slug (not `MOD-`) so the unscoped "all `MOD-*`" aggregators don't pull a `#143` backward-edge |
| **DF-13** *(golive-replan, 2026-10-21)* | **go-live drift** — FE units closed without ENTITY CLOSE (stubbed data legs marked Done); the data plane was unhomed (no `#` row); go-lives were minted outside the `#` order; two structures (this doc + the frontend G5 order) never reconciled, with a `#64`/`#65` collision | resolved by golive-replan: the ELC written into the flow (`golive-replan/process.md`) + **M1.2.4 Live Close** (#60–66 + #115, `debt-plan.md`) + the `data-plane-wiring` row (#59) + this single contiguous structure (1→143) |

---

# PROJECT M1 — Whole Manual OS   *(tier · build-order 1)*
Intent (INT-1): the entire OS, every module operable by hand, unified by the internal connective layer, localhost,
encryption/sync/auth off. **Done-when:** *every module manually operable AND the OS internally coherent* `[roadmap:76-78]`.

## Milestone M1.0 — Boot & Connective Base
| # | ID | Title | Home (ADR) | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----------|--------------|----------|------|---------|
| 1 | ✅AR-1 | Monorepo topology | repo root (001/018) | root | DB-1, AR-2, AR-4 | Backend | workspace builds all packages |
| 2 | ✅DB-1 | Schema primitives | `core/src/db/schema/` (002/016) | ← AR-1 | AR-2, DB-9, DB-3, DB-4, DB-11, MIG-1, DB-2 | Backend | primitive helpers for every schema |
| 3 | ✅AR-2 | DatabaseAdapter + web-adapter | `apps/web/src/db`, `core/db/adapter.ts` (001/002/016) | ← AR-1, DB-1 | DB-6, DB-7, QA-1, data-plane-wiring | Backend | async adapter over wa-sqlite/OPFS |
| 4 | ✅DB-9 | Canonical enums + Zod | `packages/types/src`, `core/validators` (002) | ← DB-1 | AR-5, AR-6, MOD-notes, DB-10 | Backend | 81 enum tuples + validators |
| 5 | ✅AR-4 | Client runtime (state/routing/forms + worker DB binding) | `apps/web/src/{stores,routes,hooks,lib,db}` (001/020) | ← AR-1 | UI-3, data-plane-wiring | Generic | runtime boots; DB reachable main-thread |
| 6 | ✅DB-6 | Repository (encrypt/decrypt seam) | `core/src/db/repository.ts` (002/016/017) | ← AR-2 | AR-5, AR-6, AR-9, MOD-notes, DB-10 | Backend | CRUD + co-transactional sync_queue |
| 7 | ✅DB-7 | Migrations runner + app_state | `core/src/db/migrations/` (016/002) | ← AR-2 | DB-8, DB-10 | Backend | forward-only migrations at boot |
| 8 | ✅QA-1 | Playwright + OPFS E2E harness | `apps/web/e2e/` (AR-2 audit) | ← AR-2 | leaf | Backend | browser open/reopen/persist proven |
| 9 | ✅DB-3 | Stream-(i) substrate schema — **gated HEAD (Model B)** | `core/src/db/schema/<substrate>` (002 §5.20, 016) | ← DB-1 | DB-4 | Backend | **DONE+MERGED 2026-08-18** (LIF-65, PR #31) — 11 Stream (i) ADD tables authored (migrations 007–011); flow: `roadmap/schema-foundation-build-flow.md` |
| 10 | ✅DB-4 | Stream-(ii) per-domain schema — **gated HEAD (Model B, ← DB-3)** | `core/src/db/schema/<domain>` (002 §5.20, 016) | ← DB-1, DB-3 | DB-8 | Backend | **DONE+MERGED 2026-08-21** (LIF-66, PR #32) — all 21 active domain groups authored (migrations 012–032, v32); #13 Languages dissolved → Spaces |
| 11 | ✅AR-5 | Sessions base | `core/src/foundation/sessions` (004) | ← DB-6, DB-9 | AR-7, MOD-sessions | Backend | sessions spine + registry + effect enums |
| 12 | ✅AR-6 | Spaces + tags/links + Views | `core/src/foundation/{spaces,views}` (006/007) | ← DB-6, DB-9 | AR-7, AR-8, MOD-notes, MOD-spaces ⊘ (LIF-141 canceled — dissolved into Spaces), HARD-3 | Backend | spaces/tags/entity_links + view engine |
| 13 | ✅AR-7 | Capability + measurability + effect rail | `core/src/foundation/{capability,measurement,economy,effects}` (011/012/004) | ← AR-5, AR-6 | MOD-purposes, MOD-gamification, HARD-2, CAP-authoring | Backend | ⊞4 · capability registry + measurability + effects |
| 14 | ✅AR-8 | Foundation services (backlink/export/graph-prep) | `core/src/services/{search,export}` (002/001) | ← AR-6 | HARD-3 | Backend | ⊞≥2 (pin at AR-8's turn) · backlink/export/graph-prep (search sub-part → DB-8) — **DONE 2026-08-05** (LIF-79) |
| 15 | ✅AR-9 | Sync scaffolding (no-flush) | `core/src/sync` (003/017) | ← DB-6 | AR-9b | Backend | queue accrues writes; activation → M4 — **DONE 2026-08-05** (LIF-80): no-flush stub skeleton, all seams throw `SyncNotActivated`; core 183/183 |
| 16 | ✅DS-1 | Token pipeline (Style Dictionary → CSS/Tamagui) | `packages/ui/src/themes` (001) | root | DS-2 | Design-Sys | design tokens emitted — **re-landed onto main 2026-08-03** (ab5966c; DF-6 resolved), LIF-81 Done; DS-2 now ready |
| 17 | ✅DS-2 | Foundations (color/space/type scales) | `packages/ui/src/themes` | ← DS-1 | DS-3, fe-codec-theme | Design-Sys | **DONE 2026-08-03** (LIF-82) — real values + aux namespaces + dark overlay; ⚠ placeholder palette (not brand); @vida/ui 20/20; branch `ds-2-foundations` (715687b, not merged). DS-3 now ready |
| 18 | ✅DS-3 | Motion foundation | `packages/ui/src/themes` | ← DS-2 | DS-4 | Design-Sys | motion tokens/primitives |
| 19 | ✅DS-4 | Tamagui config + dark mode | `packages/ui/src` (001) | ← DS-3 | DS-5, fe-codec-theme | Design-Sys | themed Tamagui config |
| 20 | ✅DS-5 | Primitive contracts | `packages/ui/src/components` | ← DS-4 | UI-1 | Design-Sys | primitive component contracts — **DELIVERED+MERGED 2026-08-05** (LIF-85, PR #7 `19cda21`): 10 contracts + full `component.json` token set. LIF-85 held *In Progress* only for the component **Visual Gate, which is deferred to UI-1 by the render table** — no buildable work remains here, so ✅ for `#`-order routing. |
| 21 | ✅UX-1 | Information architecture | `docs/core/architecture`, `apps/web/src` (001) | root | UX-2, UX-3, UX-4, UX-5 | Generic | IA + nav model |
| 22 | ✅UX-2 | Command bar + search | `apps/web/src` | ← UX-1 | leaf | Generic | command bar — **DONE+MERGED 2026-08-09** (LIF-91, PR #9) |
| 23 | ✅UX-3 | Shell layout (responsive) | `apps/web/src` | ← UX-1 | UX-6, UI-4, fe-shell | Generic | responsive shell layout — **DONE+MERGED 2026-08-09** (LIF-92, PR #10) |
| 24 | ✅UX-4 | State conventions | `apps/web/src` | ← UX-1 | fe-codec-patterns | Generic | client-state conventions — **DONE+MERGED 2026-08-09** (LIF-93, PR #11) |
| 25 | ✅UX-5 | Vault-unlock onboarding (surface) | `apps/web/src` | ← UX-1 | UX-5b, fe-onboarding | Generic | onboarding surface — **DONE+MERGED 2026-08-09** (LIF-94, PR #12) |
| 26 | ✅UX-6 | Home = Journal dashboard | `apps/web/src` | ← UX-3 | fe-home | Generic | Home renders the daily journal — **DONE+MERGED 2026-08-17** (LIF-95) — completes the M1.0 `-d` UX wave → **build HEADS #1–30 done**. ✅ M1.0 schema foundation now COMPLETE (DB-3 #9 + DB-4 #10 done 2026-08-21) → **M1.0 CLOSED 2026-08-21**; M1.1 opens next (correction cycle 2026-08-18 → closed 2026-08-21) |
| 27 | ✅UI-1 | Vida UI primitives | `packages/ui/src/components` | ← DS-5 | UI-2, UI-3, UI-4 | Design-Sys | primitive component library — **DONE+MERGED 2026-08-09** (LIF-86, PR #8) |
| 28 | ✅UI-2 | Platform views (calendar/gallery/list/graph/timeline) | `packages/ui/src/components` | ← UI-1 | HARD-3, fe-codec-viewmodes, fe-codec-collection, fe-codec-canvas-graph | Design-Sys | shared platform views — **DONE+MERGED 2026-08-11** (LIF-87, PR #13) |
| 29 | ✅UI-3 | Vida editor (@vida/editor, TipTap) | `packages/editor/src` | ← UI-1, AR-4 | fe-codec-canvas-editor, CAP-authoring | Design-Sys | block editor + serializers — **DONE+MERGED 2026-08-16** (LIF-88, PR #24) |
| 30 | ✅UI-4 | App shell components | `apps/web/src` | ← UI-1, UX-3 | fe-shell | Generic | app shell composed — **DONE+MERGED 2026-08-17** (LIF-89, PR #29) |


## Milestone M1.1.1 — Hub & Foundation · Backend   *(BACKEND · `core/src/{foundation,services}` · done-when: service tier complete + coverage-gated (tests green, P4 set-cover), NOT a showcase — ADR-021. Incl. 6 cross-cutting XS substrates, no frontend twin.)*

| # | Issue | ← Build-deps (→XS / seam-owner MOD) — full set: `decomposition.md` | → Blocks | Status |
|---|---|---|---|---|
| 31 | ✅XS-capability | — | XS-templates, MOD-gamification | PR #33 |
| 32 | ✅XS-effect-rail | — | XS-measurement-engine, MOD-sessions, MOD-check-ins, MOD-gamification, MOD-notifications | PR #34 |
| 33 | ✅XS-measurement-engine | XS-effect-rail | MOD-sessions, MOD-journals, MOD-gamification | PR #35 |
| 34 | ✅XS-spaces-tags-links | — | XS-templates, MOD-notes-and-pages | PR #40 |
| 35 | ✅XS-views | — | XS-templates, MOD-notes-and-pages, MOD-gamification | PR #42 |
| 36 | ✅XS-templates | XS-capability, XS-spaces-tags-links, XS-views | MOD-notes-and-pages | PR #43 |
| 37 | ✅MOD-preferences | — | fe-settings, ⊕agg | PR #44 |
| 38 | ✅MOD-sessions | AR-5, XS-effect-rail, XS-measurement-engine | MOD-journals, MOD-finance, MOD-knowledge, MOD-books, MOD-learning-education, MOD-notifications, MOD-projects, MOD-purposes-and-goals, MOD-relationships, MOD-routines, MOD-tasks, MOD-health-core, MOD-health-nutrition, MOD-health-training, MOD-languages, MOD-skills, fe-sessions, ⊕agg | PR #39 |
| 39 | ✅MOD-journals | MOD-sessions, XS-measurement-engine | MOD-notes-and-pages, MOD-check-ins, MOD-finance, MOD-gamification, MOD-books, MOD-learning-education, MOD-projects, MOD-purposes-and-goals, MOD-relationships, MOD-routines, MOD-health-core, MOD-health-nutrition, MOD-languages, MOD-skills, fe-home, ⊕agg | PR #46 |
| 40 | ✅MOD-notes-and-pages | DB-6, DB-9, AR-6, MOD-journals, XS-{spaces,templates,views} | MOD-check-ins, MOD-finance, MOD-habits, MOD-knowledge, MOD-books, MOD-learning-education, MOD-projects, MOD-purposes-and-goals, MOD-relationships, MOD-routines, MOD-tasks, MOD-health-core, MOD-languages, MOD-skills, fe-notes-and-pages, ⊕agg | PR #48 |
| 41 | ✅MOD-check-ins | MOD-journals, MOD-notes-and-pages, XS-effect-rail | fe-check-ins, ⊕agg | PR #51 |

## Milestone M1.1.2 — Feature Modules · Backend

| # | Issue | ← Build-deps (→XS / seam-owner MOD) — full set: `decomposition.md` | → Blocks | Status |
|---|---|---|---|---|
| 42 | ✅XS-backlinks-search-export | — | leaf | PR #53 |
| 43 | ✅XS-egress-guard | — | XS-ai | PR #55 |
| 44 | ✅XS-ingestion | — | XS-ai | PR #57 |
| 45 | ✅XS-ai | XS-egress-guard, XS-ingestion | leaf | PR #60 |
| 46 | ✅XS-notifications-delivery | — | MOD-gamification, MOD-notifications | PR #63 |
| 47 | ✅MOD-finance | MOD-{journals,notes,sessions}, XS-×8 | fe-finance, P3-2, P3-5, ⊕agg | PR #66 |
| 48 | ✅MOD-gamification | AR-7, MOD-journals, XS-{capability,effect,measurement,notif,views} | fe-gamification, HARD-2, ⊕agg | PR #67 |
| 49 | ✅MOD-habits | MOD-notes-and-pages, XS-×4 | fe-habits, ⊕agg | PR #68 |
| 50 | ✅MOD-knowledge | MOD-notes-and-pages, MOD-sessions, XS-×6 | MOD-books, MOD-routines, MOD-health-core, MOD-languages, MOD-skills, fe-knowledge, ⊕agg | PR #69 |
| 51 | ✅MOD-books | MOD-knowledge, MOD-{journals,notes,sessions}, XS-×4 | fe-books, ⊕agg | PR #70 |
| 52 | ✅MOD-learning-education | MOD-{journals,notes,sessions}, XS-×5 | fe-learning-education, P3-6, ⊕agg | PR #77 |
| 53 | ✅MOD-notifications | MOD-sessions, XS-effect-rail, XS-notifications-delivery | fe-notifications, ⊕agg | PR #83 |
| 54 | ✅MOD-projects | MOD-{journals,notes,sessions}, XS-×5 | fe-projects, ⊕agg | PR #85 |
| 55 | ✅MOD-purposes-and-goals | AR-7, MOD-{journals,notes,sessions}, XS-×4 | fe-purposes-and-goals, HARD-2, ⊕agg | PR #98 |
| 56 | ✅MOD-relationships | MOD-{journals,notes,sessions}, XS-×4 | fe-relationships, ⊕agg | PR #107 |
| 57 | ⏳MOD-routines | MOD-knowledge, MOD-{journals,notes,sessions}, XS-×4 | fe-routines, ⊕agg | in progress (① track; no PR yet) |
| 58 | ✅MOD-tasks | MOD-notes-and-pages, MOD-sessions, XS-×6 | fe-tasks, ⊕agg | PR #145 |

## Milestone M1.1.3 — Depth & Recovered · Backend   *(+ `data-plane-wiring` #59: the shared live root — the AR-4-reserved Drizzle seam + the composition root; homed M1.1.3 per its own header, DERIVED by first-consumer-pull. **This block is split around M1.2.4 (EX-5):** #59 here, the M1.1.3 `MOD-*` at #67–71 after the debt.)*

| # | Issue | ← Build-deps (→XS / seam-owner MOD) — full set: `decomposition.md` | → Blocks | Status |
|---|---|---|---|---|
| 59 | ✅data-plane-wiring | AR-2, AR-4 (M1.0) | preferences-rescope, notes-rescope, sessions-rescope, gamification-rescope, shell-rescope, notifications-rescope, journals-rescope | PR #148 · LIF-237 |

## Milestone M1.2.4 — Live Close: shipped-surface debt   *(NEW — golive-replan G3, 2026-10-21. A showcase-able slice: "every shipped surface usable live" (ADR-016 Milestone = delivery-slice). 7 debt units = one entity each run through the `entity-rescope` scenario, closing on the ELC (`golive-replan/process.md` §2); scope by census id in `golive-replan/debt-plan.md` §1. **Placed by `#`, not by milestone number:** right after the data plane (#59) and before the remaining M1.1.3 backend (#67–71) and the unbuilt surfaces it blocks (fe-tasks #99 · fe-projects #101 · fe-sessions #105), `g3-order.md` §1–§2. Waves: L1 = #60–62 (parallel) · L2 = #63–66. The ⊕split sub-issue **journals-rescope-dashboard** (← HARD-1) is row **#115**, inside the M1.4 block (EX-1). `~X` = soft edge (order-only, not a blocker).)*

| # | ID · LIF | Title | Home | ← Blocked-by | → Blocks | Prof | Status / Outcome |
|---|----|-------|------|--------------|----------|------|---------|
| 60 | ◻preferences-rescope · pending — minted at G4 | Rescope Preferences live: Settings persist (6 STUB legs) · theme persist · Home arrangement · locale readers · persona setter · onboarding writes | `apps/web/src/{settings,stores,onboarding}` · `apps/web/src/db/composition-root.ts` · ledger `docs/features/preferences/delivery/` | ← data-plane-wiring | ~notes-rescope, gamification-rescope, shell-rescope, ~notifications-rescope, journals-rescope, HARD-4 | Add Frontend Component → `entity-rescope` | L1 — the hub |
| 61 | ◻notes-rescope · pending — minted at G4 | Rescope Notes & Pages live: fe-notes STUB/PARTIAL legs + the registry-runtime/UI-3 root (integration-block bodies · palette · `[[` trigger; debt-plan calls it the "#31/ui-3 root", a pre-G3 `#`) + templates/view-field backend slices | `packages/core/src/foundation/{templates,views}` · `apps/web/src/{notes,entity,canvas-editor}` · `packages/ui` · `packages/editor` · ledger `docs/features/notes-and-pages/delivery/` | ← data-plane-wiring, ~preferences-rescope | journals-rescope, fe-tasks, fe-projects, journals-rescope-dashboard, HARD-4 | Add Frontend Component → `entity-rescope` | L1 |
| 62 | ◻sessions-rescope · pending — minted at G4 | Rescope Sessions (debt slices only): register `sessions` · HUD + runtime legs · flow-session attach · backend `findActiveSession` + applied-effects read | `packages/core/src/{services/sessions,foundation/effects}` · `apps/web/src/{session-hud,session-runtime}` · ledger `docs/features/sessions-and-scheduling/delivery/` | ← data-plane-wiring | notifications-rescope, fe-sessions, HARD-4 | Add Frontend Component → `entity-rescope` | L1 — the ENTITY CLOSE stays with fe-sessions |
| 63 | ◻gamification-rescope · pending — minted at G4 | Rescope Gamification live: register `gamification` · 7 STUB legs · ⌘K reachability flag · backend `listConsequences` | `packages/core/src/services/gamification` · `apps/web/src/gamification` · ledger `docs/features/gamification/delivery/` | ← data-plane-wiring, preferences-rescope | HARD-4 | Add Frontend Component → `entity-rescope` | L2 |
| 64 | ◻shell-rescope · pending — minted at G4 | Rescope the shell (X-CUT): mount `ModuleDock` + read prefs · placement hydrate · Modules panel · the P6 `FE-shell-integration-wiring` orphans BSE-15/19–22 (search-provider swap, MD/PDF/DOCX serializers, export dialog) | `apps/web/src/{shell,command-bar}` · `packages/editor/src/serializers/` · `packages/ui/src/components/export-dialog.tsx` · ledger `docs/specs/foundation/fe-shell/delivery/` | ← data-plane-wiring, preferences-rescope | HARD-4 | Add Frontend Component → `entity-rescope` | L2 · search done-when = the SearchProvider seam swap + an honest `search-unavailable` state; live FTS completes at DB-8 (soft), whose close re-verifies ⌘K/notes search live (GAP-1) |
| 65 | ◻notifications-rescope · pending — minted at G4 | Rescope Notifications live: construct the built XS-notifications-delivery engine (#46, LIF-174) + register `notifications` · 3 STUB legs · quiet-hours inputs | `apps/web/src/notifications` · `apps/web/src/db/composition-root.ts` · ledger `docs/features/notifications/delivery/` | ← data-plane-wiring, sessions-rescope, ~preferences-rescope | HARD-4 | Add Frontend Component → `entity-rescope` | L2 |
| 66 | ◻journals-rescope · pending — minted at G4 | Rescope Journals (Home journal surface) live: EC-3 inline blocks · fake-success states · widget-selection storage + placement-edit Capability (slices before the dashboard) | `apps/web/src/{home,dashboard}` · `packages/ui/src/components/dashboard-view.tsx` · ledger `docs/features/journals/delivery/` | ← data-plane-wiring, notes-rescope, preferences-rescope | journals-rescope-dashboard, HARD-4 | Add Frontend Component → `entity-rescope` | L2 (dashboard = ⊕split sub-issue, late) |

*Repair ≠ blocked-by:* a debt unit repairs surfaces that are already ✅ merged (fe-settings #95 · fe-onboarding #96 · fe-shell/-scope #85/#86 · fe-session-hud/-runtime #87/#94 · fe-home #89 · fe-notifications #97 · fe-notes-and-pages #98 · fe-gamification #103), so it carries **no `←` edge to them** and its lower `#` is safe (they exist). *Downstream, outside the `#` order:* `note-open-behavior-preference` (LIF-238, milestone DERIVED later) gains `← preferences-rescope` — EX-3.

## Milestone M1.1.3 (cont.) — Depth & Recovered · Backend   *(the remaining M1.1.3 `MOD-*`, after the debt: `_projects.md` lists M1.2.4 right after M1.1.2, so `tracker_sync` routes M1.1.2 → M1.2.4 → M1.1.3 — EX-5)*

| # | Issue | ← Build-deps (→XS / seam-owner MOD) — full set: `decomposition.md` | → Blocks | Status |
|---|---|---|---|---|
| 67 | ◻MOD-health-core | MOD-knowledge, MOD-{journals,notes,sessions}, XS-×8 | fe-health, P3-3, ⊕agg |  |
| 68 | ◻MOD-health-nutrition | MOD-{journals,sessions}, XS-×5 | fe-health, ⊕agg |  |
| 69 | ◻MOD-health-training | MOD-sessions, XS-×6 | fe-health, ⊕agg |  |
| 70 | ◻MOD-languages | MOD-knowledge, MOD-{journals,notes,sessions}, XS-×5 | ⊕agg |  |
| 71 | ◻MOD-skills | MOD-knowledge, MOD-{journals,notes,sessions}, XS-×8 | fe-skills, ⊕agg |  |

## Milestone M1.2.1 — Hub & Foundation · Frontend

*(FRONTEND · the ② surface tier, **42-unit order** (frontend-replan G5) as reshaped in Linear at G6 (2026-10-02, `frontend-replan/g6-edge-ledger.md` §6). Supersedes the 24 P6 `FE-*` rows. Milestone homing = each task file's `# Milestone:` line (the truth in Linear): **M1.2.1** = codec + shell + cross-cutting (G5 #1–24, #26) · **M1.2.2** = floor-ready modules (G5 #27–32) **+ fe-notifications (G5 #25)** · **M1.2.3** = schema-gated modules (G5 #33–42). The campaign issue `frontend-track` (LIF-202) sits in the separate Linear milestone **"M1.2+ (frontend surface tier — cross-milestone)"**, which holds no surface unit. `[G5 #n]` = the unit's number in the G5 doc. ⊘ = dissolved (never minted, no LIF). ← carries the codec edges from the task files' `## Dependencies`, the shipped ancestor a codec unit extends (g6-edge-ledger §2), and the ① backend twin carried from the P6 rows.)*

| # | ID · LIF | Title | Home | ← Blocked-by | → Blocks | Prof | Status / Outcome |
|---|----|-------|------|--------------|----------|------|---------|
| 72 | ✅fe-codec-theme · LIF-213 `[G5 #1]` | ThemeProvider — N theme presets × density | `packages/ui/src/themes` | ← DS-2, DS-4 | fe-codec-patterns, fe-codec-viewmodes, fe-codec-canvas-graph, fe-settings | Add Frontend Component | PR #74 |
| 73 | ✅fe-codec-patterns · LIF-211 `[G5 #2]` | Pattern-kit primitives + the 8-state machine | `packages/ui/src/components` · `apps/web/src/{state-conventions,reach,voice}` | ← UX-4, fe-codec-theme | fe-codec-viewmodes, fe-codec-dashboard, fe-codec-entity-facet, fe-codec-canvas-editor, fe-codec-canvas-graph, fe-codec-canvas-reader, fe-codec-canvas-board, fe-codec-flow-session, fe-codec-system, fe-shell, fe-sync-log, fe-onboarding | Add Frontend Component | PR #75 |
| 74 | ✅fe-codec-viewmodes · LIF-214 `[G5 #3]` | View-mode renderers (add table + board) | `packages/ui/src/components/{table,board}-view.tsx` | ← UI-2, fe-codec-theme, fe-codec-patterns | fe-codec-collection, fe-codec-canvas-board, fe-codec-seams | Add Frontend Component | PR #76 |
| 75 | ✅fe-codec-collection · LIF-207 `[G5 #4]` | Collection shell | `packages/ui/src/components/collection-view.tsx` · `apps/web/src/collection` | ← UI-2, fe-codec-viewmodes | fe-codec-entity-facet, fe-codec-seams, fe-spaces-page, fe-sync-log, fe-notifications, fe-notes-and-pages, fe-tasks, fe-habits, fe-check-ins, fe-routines, fe-sessions, fe-learning-education, fe-books, fe-knowledge, fe-skills, fe-health | Add Frontend Component | PR #78 |
| 76 | ✅fe-codec-dashboard · LIF-208 `[G5 #5]` | Dashboard shell | `packages/ui/src/components/dashboard-view.tsx` · `apps/web/src/dashboard` | ← fe-codec-patterns | fe-home, fe-feature-atlas, fe-habits, fe-projects, fe-gamification, fe-purposes-and-goals, fe-health, fe-finance, fe-relationships | Add Frontend Component | PR #104 |
| 77 | ✅fe-codec-entity-facet · LIF-209 `[G5 #6]` | Entity shell + Layout/Editor facet | `packages/ui/src/components/entity-view.tsx` · `apps/web/src/entity` | ← fe-codec-patterns, fe-codec-collection | fe-codec-flow-session, fe-home, fe-notes-and-pages, fe-tasks, fe-habits, fe-projects, fe-routines, fe-learning-education, fe-books, fe-purposes-and-goals, fe-health, fe-finance, fe-relationships | Add Frontend Component | PR #105 |
| 78 | ✅fe-codec-canvas-editor · LIF-234 `[G5 #7]` | Canvas: Editor (block canvas) | `apps/web/src/canvas-editor` · `packages/editor/src` | ← UI-3, fe-codec-patterns | fe-codec-seams, ~fe-home | Add Frontend Component | PR #123 (issue minted late — reshape gap) |
| 79 | ✅fe-codec-canvas-graph · LIF-205 `[G5 #8]` | Canvas: Graph — editorial ink voice | `packages/ui/src/components/neural-graph.tsx` | ← UI-2, fe-codec-theme, fe-codec-patterns | fe-feature-atlas, fe-notes-and-pages, fe-knowledge, fe-skills, fe-finance, fe-relationships | Add Frontend Component | PR #112 |
| 80 | ✅fe-codec-canvas-reader · LIF-206 `[G5 #9]` | Canvas: Reader (read·listen·annotate) | `packages/ui/src/components/canvas-reader.tsx` · `apps/web/src/reader` | ← fe-codec-patterns | fe-books | Add Frontend Component | PR #117 |
| 81 | ✅fe-codec-canvas-board · LIF-204 `[G5 #10]` | Canvas: Vision-board + Calendar-grid | `packages/ui/src/components/{board-view,calendar-view,canvas-view}.tsx` · `apps/web/src/canvas` | ← fe-codec-patterns, fe-codec-viewmodes | fe-calendar, fe-purposes-and-goals | Add Frontend Component | PR #116 |
| 82 | ✅fe-codec-flow-session · LIF-210 `[G5 #11]` | Flow/Session shell — deliverable·attach·proof·log | `packages/ui/src/components/flow-session-view.tsx` · `apps/web/src/flow` | ← fe-codec-patterns, fe-codec-entity-facet | fe-session-hud, fe-session-runtime, fe-onboarding, fe-check-ins, fe-gamification | Add Frontend Component | PR #109 + #111 |
| 83 | ⊘fe-codec-system · — `[G5 #12]` | System shell (reuse UI-4) — **dissolved, never minted** | — (System surfaces compose the shell directly) | ← fe-codec-patterns | fe-cmdk | Add Frontend Component | ratified-by-consumption: every System consumer shipped through its own gates (TASKS.md:11) |
| 84 | ✅fe-codec-seams · LIF-212 `[G5 #13]` | Composition seams (SavedView·Capability·Template·Spaces) | `apps/web/src/seams` | ← fe-codec-viewmodes, fe-codec-collection, fe-codec-canvas-editor | fe-calendar, fe-spaces-page | Add Frontend Component | PR #119 |
| 85 | ✅fe-shell · LIF-199 `[G5 #14]` | Shell frame — two positionable content-fit panels + regions (**split** of fe-shell-integration-wiring) | `apps/web/src/shell` | ← UI-4, UX-3, fe-codec-patterns | fe-shell-scope, fe-session-hud, HARD-4 | Add Frontend Component | PR #118 · its wiring legs → shell-rescope |
| 86 | ✅fe-shell-scope · LIF-219 `[G5 #15]` | Bar 1 + Spaces scope selector + 6 global surfaces (split of LIF-199) | `apps/web/src/shell` | ← fe-shell | fe-cmdk, HARD-4 | Add Frontend Component | PR #125 |
| 87 | ✅fe-session-hud · LIF-217 `[G5 #16]` | Session HUD (region 6) (split of LIF-198/199) | `apps/web/src/session-hud` | ← fe-codec-flow-session, fe-shell | fe-sessions, HARD-4 | Add Frontend Component | PR #144 |
| 88 | ⊘fe-cmdk · — `[G5 #17]` | ⌘K command bar (reuse UI-4/UX-2) — **dissolved, never minted** | `apps/web/src/command-bar` (UI-4 `CommandBar`) | ← fe-codec-system, fe-shell-scope | leaf | Add Frontend Component | shipped via UI-4/UX-2 reuse (debt-census:50); residual BSE-15 → shell-rescope |
| 89 | ✅fe-home · LIF-187 `[G5 #18]` | Home — 4-region + arrangement + journal facet (**split** of fe-journals, renamed) | `apps/web/src/home` | ← UX-6, MOD-journals, fe-codec-dashboard, fe-codec-entity-facet, ~fe-codec-canvas-editor | HARD-4 | Add Frontend Component | PR #121 (+ go-live #151) |
| 90 | ⏳fe-calendar · LIF-203 `[G5 #19]` | Global Calendar — dueIn cross-module lane | `apps/web/src` calendar route · `packages/ui/src/components/calendar-view.tsx` | ← fe-codec-canvas-board, fe-codec-seams | HARD-4 | Add Frontend Component | in flight (S5–S7; S7 closes under the ELC) |
| 91 | ◻fe-spaces-page · LIF-220 `[G5 #20]` | Spaces page + create/edit (absorbs shell-scope debt + backend `listSpaces`, debt-plan §2) | `apps/web/src` spaces route · `packages/core/src/foundation/spaces` | ← fe-codec-collection, fe-codec-seams | HARD-4 | Add Frontend Component |  |
| 92 | ◻fe-sync-log · LIF-221 `[G5 #21]` | Sync & Activity Log `/sync` | `apps/web/src` sync route | ← fe-codec-collection, fe-codec-patterns | HARD-4 | Add Frontend Component |  |
| 93 | ◻fe-feature-atlas · LIF-215 `[G5 #22]` | Feature Atlas `/features` | `apps/web/src` features route | ← fe-codec-canvas-graph, fe-codec-dashboard | HARD-4 | Add Frontend Component |  |
| 94 | ✅fe-session-runtime · LIF-218 `[G5 #23]` | Session runtime page (split of LIF-198) | `apps/web/src/session-runtime` | ← fe-codec-flow-session | fe-sessions, HARD-4 | Add Frontend Component | PR #143 |
| 95 | ✅fe-settings · LIF-193 `[G5 #24]` | Settings — net-new controls + searchable index (**split** of fe-preferences, renamed) | `apps/web/src/settings` | ← MOD-preferences, fe-codec-theme | HARD-4 | Add Frontend Component | PR #137 |
| 96 | ✅fe-onboarding · LIF-216 `[G5 #26]` | Onboarding + guided setup (ext UX-5) | `apps/web/src/onboarding` | ← UX-5, fe-codec-flow-session, fe-codec-patterns | HARD-4 | Add Frontend Component | PR #130 |

## Milestone M1.2.2 — Feature Modules · Frontend

| # | ID · LIF | Title | Home | ← Blocked-by | → Blocks | Prof | Status / Outcome |
|---|----|-------|------|--------------|----------|------|---------|
| 97 | ✅fe-notifications · LIF-192 `[G5 #25]` | Notifications inbox + channel matrix (wave-1 unit; homed M1.2.2 in Linear) | `apps/web/src/notifications` | ← MOD-notifications, fe-codec-collection | HARD-4 | Add Frontend Component | PR #132 |
| 98 | ✅fe-notes-and-pages · LIF-191 `[G5 #27]` | Notes surfaces (Collection+Graph · Note Entity · /summary) | `apps/web/src/notes` | ← MOD-notes-and-pages, fe-codec-collection, fe-codec-canvas-graph, fe-codec-entity-facet | HARD-4 | Add Frontend Component | PR #128/#129 (+ go-live #149, #150) |
| 99 | ◻fe-tasks · LIF-201 `[G5 #28]` | Tasks ⊕split (12-layout · Entity facets · All-Tasks) | `apps/web/src/tasks` | ← MOD-tasks, fe-codec-collection, fe-codec-entity-facet, notes-rescope | HARD-4 | Add Frontend Component |  |
| 100 | ◻fe-habits · LIF-182 `[G5 #29]` | Habits (Dash+Collection · per-habit Entity) | `apps/web/src/habits` | ← MOD-habits, fe-codec-dashboard, fe-codec-collection, fe-codec-entity-facet | HARD-4 | Add Frontend Component |  |
| 101 | ◻fe-projects · LIF-194 `[G5 #30]` | Projects (Dash+Collection · project Entity · milestones) | `apps/web/src/projects` | ← MOD-projects, fe-codec-dashboard, fe-codec-entity-facet, notes-rescope | HARD-4 | Add Frontend Component |  |
| 102 | ◻fe-check-ins · LIF-179 `[G5 #31]` | Check-ins (entry Flow · history/trends · Journal widget) | `apps/web/src/check-ins` | ← MOD-check-ins, fe-codec-flow-session, fe-codec-collection | HARD-4 | Add Frontend Component |  |
| 103 | ✅fe-gamification · LIF-181 `[G5 #32]` | Gamification (System Dash · rule-authoring Flow) | `apps/web/src/gamification` | ← MOD-gamification, fe-codec-dashboard, fe-codec-flow-session | HARD-4 | Add Frontend Component | PR #140 |

## Milestone M1.2.3 — Depth & Recovered · Frontend

*(⛔ = schema-amendment gate from G5 (`surface-map.md §6.4`), carried as text: no amendment issue was minted at G6 — GAP-2.)*

| # | ID · LIF | Title | Home | ← Blocked-by | → Blocks | Prof | Status / Outcome |
|---|----|-------|------|--------------|----------|------|---------|
| 104 | ◻fe-routines · LIF-197 `[G5 #33]` | Routines (Collection · routine Entity · run-flow) ⛔v2 service | `apps/web/src/routines` | ← MOD-routines, fe-codec-collection, fe-codec-entity-facet | HARD-4 | Add Frontend Component |  |
| 105 | ◻fe-sessions · LIF-198 `[G5 #34]` | Sessions ⊕split (Agenda · Availability · config · templates) — holds the sessions **ENTITY CLOSE** | `apps/web/src/sessions` | ← MOD-sessions, sessions-rescope, fe-codec-collection, fe-session-runtime, fe-session-hud | HARD-4 | Add Frontend Component |  |
| 106 | ◻fe-learning-education · LIF-190 `[G5 #35]` | Learning ⊕split (hub · subject · grading · assessments) | `apps/web/src/learning` | ← MOD-learning-education, fe-codec-collection, fe-codec-entity-facet | HARD-4 | Add Frontend Component |  |
| 107 | ◻fe-books · LIF-178 `[G5 #36]` | Books ⊕split (Bookshelf · Hub · Reader · Plans · wizards) | `apps/web/src/books` | ← MOD-books, fe-codec-collection, fe-codec-canvas-reader, fe-codec-entity-facet | HARD-4 | Add Frontend Component |  |
| 108 | ◻fe-knowledge · LIF-188 `[G5 #37]` | Knowledge ⊕split (Catalog · Lab · Topic · Flashcards · FTS) | `apps/web/src/knowledge` | ← MOD-knowledge, fe-codec-collection, fe-codec-canvas-graph | HARD-4 | Add Frontend Component |  |
| 109 | ◻fe-skills · LIF-200 `[G5 #38]` | Skills (landing · Skill Entity · Skill Graph · Def Library) | `apps/web/src/skills` | ← MOD-skills, fe-codec-collection, fe-codec-canvas-graph | HARD-4 | Add Frontend Component |  |
| 110 | ◻fe-purposes-and-goals · LIF-195 `[G5 #39]` | Purposes ⊕split (Purpose/Target/Value/Dream · board · Contributions · Reviews) ⛔ | `apps/web/src/purposes` | ← MOD-purposes-and-goals, fe-codec-dashboard, fe-codec-entity-facet, fe-codec-canvas-board | HARD-4 | Add Frontend Component |  |
| 111 | ◻fe-health · LIF-183 `[G5 #40]` | Health ⊕split umbrella (Core · Training · Nutrition) ⛔ — **fold** (LIF-184/185 retired) | `apps/web/src/health` | ← MOD-health-core, MOD-health-nutrition, MOD-health-training, fe-codec-dashboard, fe-codec-collection, fe-codec-entity-facet | HARD-4 | Add Frontend Component |  |
| 112 | ◻fe-finance · LIF-180 `[G5 #41]` | Finance ⊕split (Dash · account · All-* · Chart · Store · Commitments · Import) ⛔ | `apps/web/src/finance` | ← MOD-finance, fe-codec-dashboard, fe-codec-entity-facet, fe-codec-canvas-graph | HARD-4 | Add Frontend Component |  |
| 113 | ◻fe-relationships · LIF-196 `[G5 #42]` | Relationships (Dash⇄Graph⇄Contacts · contact Entity · Network · Reminders) ⛔ | `apps/web/src/relationships` | ← MOD-relationships, fe-codec-dashboard, fe-codec-canvas-graph, fe-codec-entity-facet | HARD-4 | Add Frontend Component |  |

**Retired at G6 (no `#`, Linear → Canceled):** LIF-189 fe-languages (→ Spaces) · LIF-186 fe-integrations-ai-surfaces (→ M2 / capability blocks) · LIF-184 fe-health-nutrition + LIF-185 fe-health-training (→ folded into fe-health #111).
**Off-order units (✅ merged, outside the `#` order — enhancement/fix units, no dependents):** fe-codec-primitives-refinement (LIF-230, PRs #88/#96/#97/#99/#101) · fe-codec-controls-refinement (LIF-231, PRs #90–95) · fix-entity-view-header (LIF-233, PR #110) · the three go-lives (PR #149 fe-notes-golive · #150 notes-entity-usability LIF-239 · #151 home-journal-go-live, no LIF) — their remaining debt is re-homed into M1.2.4 (golive-replan F4).

## Milestone M1.4 — Internal-Integration Hardening

*(FLAT cross-track CLOSER — Victor's cut `part-3-build-roadmap/_index.md:130`; summary+rollups=backend, graph/backlinks/polish=UI. **M1 done = operable + coherent + live REQUIRES BOTH TRACKS AND THE DEBT**: HARD-4 ← every live M1.2.1–M1.2.3 surface + every M1.2.4 debt issue — cannot close on backend alone, ADR-019 §3.2. Now #114–122 [was #88–95]. Row #115 is the M1.2.4 dashboard sub-issue, ordered here because it is ← HARD-1 (EX-1).)*

| # | ID · LIF | Title | Home | ← Blocked-by | → Blocks | Prof | Status / Outcome |
|---|----|-------|------|--------------|----------|------|---------|
| 114 | ◻HARD-1 · LIF-112 | `summary(date)` provider registry | `services/journals` (002) | ← every `MOD-*` | journals-rescope-dashboard, HARD-4 | Backend | journal summary aggregates all modules (the data for the dashboard sub-issue) |
| 115 | ◻journals-rescope-dashboard · pending — minted at G4 **(M1.2.4)** | ⊕split sub-issue of journals-rescope: EC-4 personalized grid + the 11 standalone widget bodies from HARD-1 providers + the **journals ENTITY CLOSE** (ELC-9) | `apps/web/src/{home,dashboard}` · ledger `docs/features/journals/delivery/` | ← journals-rescope, HARD-1, notes-rescope | HARD-4 | Add Frontend Component → `entity-rescope` | Home dashboard live; journals entity closed |
| 116 | ◻HARD-2 · LIF-113 | Measurability + economy rollups live | `foundation/{measurement,economy}` (011/012) | ← AR-7, MOD-purposes, MOD-gamification | HARD-4 | Backend | end-to-end measurability/economy (integration-class — 1 gate, DF-11) |
| 117 | ◻HARD-3 · LIF-114 | Neural-graph + backlinks complete | `foundation/spaces` + `services` + UI-2 (006) | ← AR-6, AR-8, UI-2 | HARD-4 | Backend | working backlinks + neural graph (absorbs notes backlinks · BSE-23 · 10K-node perf, debt-plan §2) |
| 118 | ◻DB-8 · LIF-70 | FTS5 tables + search population | `core/src/db`, `services/search` (002) | ← DB-4, DB-7 | HARD-4, DB-8b | Backend | full-text search over real content (DF-2); its close re-verifies ⌘K/notes search live (soft link to shell-rescope) |
| 119 | ◻DB-11 · LIF-63 | ADR-002 §5/§7/§8 reconciliation | `core/src/db` (002) | ← DB-1, **all `MOD-*`** | HARD-4 | Backend | schema doc reconciled |
| 120 | ⏸DB-10 · LIF-62 | Dogfood seed vault | `packages/core/src/db/seed/` (016; +ADR-009 seed-bundle / 019 dogfood — ⚠ UNCITED, resolve at build) | ← DB-6, DB-7, DB-9, **all M1.1.x `MOD-*`** | HARD-4 | Backend | localhost vault seeded with a full manual OS (DF-1) |
| 121 | ◻MIG-1 · LIF-116 | v1 retire-at-parity (DF-9) | `db/_legacy/*`, `Old/*`, `docs/_legacy/*` (016/018) | ← DB-1, **all `MOD-*` schemas** | HARD-4 | Backend | quarantined v1 residue (code + Old/ + legacy docs) deleted at parity |
| 122 | ◻HARD-4 · LIF-115 | Polish → M1 done | distributed **[GATE — no file home]** (+ low CODEC polish, debt-plan §2) | ← HARD-1, HARD-2, HARD-3, DB-8, DB-10, DB-11, MIG-1, **the 28 `fe-*` surfaces of `hard-4-polish.md` (every live M1.2.1–M1.2.3 row #85–113 except ⊘ #88; NO `fe-codec-*` — CODEC is met through its consumers, `golive-replan/process.md` §5)**, **all 8 M1.2.4 debt issues (#60–66 + #115)** | P3-1, AR-3, P2-3, P2-4 | Generic | **M1 done: operable + coherent + every shipped surface LIVE (both tracks + the debt)** |


---

# PROJECT M2 — External Integrations & Security Boundary   *(tier · build-order 2)*
Intent (INT-2): working external integrations for localhost dogfood, pre-encryption, against the seam + ADR-014/015 guard `[roadmap:110-125]`.

## Milestone M2.0 — Integrations & Boundary
| # | ID | Title | ADR | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----|--------------|----------|------|---------|
| 123 | ◻P3-1 | Provider-selection pass (head — the ~16 UNDEFINED of 22; 6 already defined) | 014/015 | ← HARD-4 | P3-2, P3-3, P3-4, P3-5, P3-6 | Foundation | all 22 integrations (6 defined + 16 chosen) have providers |
| 124 | ◻P3-2 | Financial (CSV/OFX, aggregator, prices/FX) | 014 | ← P3-1, MOD-finance | P3-boundary | Backend | bank import + price feeds |
| 125 | ◻P3-3 | Health & Wearables (Apple/Google Health, BLE) | 014 | ← P3-1, MOD-health | P3-boundary | Backend | wearable/health ingestion |
| 126 | ◻P3-4 | AI/LLM (askModel, on-device, BYO-cloud, OCR/TTS) | 015 | ← P3-1 | P3-boundary | Backend | askModel runtime for modules |
| 127 | ◻P3-5 | Fiscal rule-packs | 014 | ← P3-1, MOD-finance | P3-boundary | Backend | fiscal rule packs |
| 128 | ◻P3-6 | Calendar & Extraction (live ICS, syllabus, webhooks) | 014 | ← P3-1, MOD-learning | P3-boundary | Backend | live ICS feed |
| 129 | ◻P3-boundary | Security boundary (ingestion/egress guard) | 014/015 | ← P3-2, P3-3, P3-4, P3-5, P3-6 | M3-pass | Backend | verified ingestion/egress guard |

---

# PROJECT M3 — Whole-OS Encryption Pass   *(tier · build-order 3)*
Intent (INT-3): L1 SQLCipher + L2 field-`[E]` across ALL data; release gate `[ADR-019:22]`.

## Milestone M3.0 — Encryption Pass
| # | ID | Title | Home (ADR) | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----------|--------------|----------|------|---------|
| 130 | ◻AR-3 | Crypto / vault / key-mgmt | `core/src/encryption` (001/002) | ← HARD-4 | DB-5, DB-8b, UX-5b, M3-pass, AR-9b | Backend | vault key model (Argon2id→MK→VK), SRP |
| 131 | ◻DB-5 | Encryption boundary map (`[E]`/SQLCipher) | `core/src/db` (002 §4) | ← AR-3, **all `MOD-*` schemas** | M3-pass | Backend | every `[E]` field mapped |
| 132 | ◻DB-8b | Blind index (keyed BLAKE2b) | `core/src/db` (002) | ← AR-3, DB-8 | leaf | Backend | searchable encrypted fields |
| 133 | ◻UX-5b | Vault-unlock flow | `apps/web/src` (017) | ← AR-3, UX-5 | leaf | Generic | unlock UX (auth-coupled) |
| 134 | ◻M3-pass | SQLCipher activation + guard re-verify + release gate | cross-cutting **[GATE — no file home]** (019 §3.4) | ← AR-3, DB-5, P3-boundary | leaf | Backend | encryption on end-to-end; release gate |

---

# PROJECT M4 — Venues / Multi-Device   *(tier · build-order 4)*
Intent (INT-4): sync → auth → desktop/mobile → self-host → ZK-cloud; needs a 2nd device `[ADR-019:23]`.

## Milestone M4.0 — Venues
| # | ID | Title | ADR | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----|--------------|----------|------|---------|
| 135 | ◻DB-2 | `_sync_*` metadata columns + HLC | 002/003 | ← DB-1 | AR-9b | Backend | sync columns + HLC on syncable tables |
| 136 | ◻AR-9b | Sync engine activation (flush queue; LWW/HLC/Yjs) | 003 | ← AR-9, DB-2, AR-3 | P2-1 | Backend | queue flushes; cross-device merge |
| 137 | ◻P2-1 | Sync / server (Hono/CF Workers, R2 relay) | 003 | ← AR-9b | P2-2, P2-5, P2-6 | Backend | ZK blob relay live · **owns the `@vida/server` test setup** — its vitest currently has 0 test files, so CI's `test` job fails `@vida/server#test` ("No test files found"); P2-1 lands the server + its tests and turns that green *(flagged by QA-1, 2026-08-04)* |
| 138 | ◻P2-2 | ZK notifications Tier-3 | 013 | ← P2-1 | leaf | Backend | push without server-visible content |
| 139 | ◻P2-5 | Self-host | 003 | ← P2-1 | leaf | Backend | self-hostable server |
| 140 | ◻P2-3 | Desktop (Tauri) | 001 | ← HARD-4 | leaf | Generic | desktop shares web codebase |
| 141 | ◻P2-4 | Mobile (Expo) | 001 | ← HARD-4 | leaf | Generic | mobile app + native chrome |
| 142 | ◻P2-6 | ZK-cloud + billing | 003 | ← P2-1 | leaf | Backend | managed ZK cloud + billing |
| 143 | ◻⚠CAP-authoring | User-authored capability safe-authoring surface — sandbox runtime · authoring DSL/UI · grant enforce/re-grant/revoke. ⚠ INTENDED-later: no M1–M4 consumer (first-consumer-pull) → deferred to the tail; the per-platform sandbox rides each venue's pass (ADR-010 §3.6, not a hard blocker) | `core/src/foundation/capability` + per-app sandbox (010/008 · SP4) | ← AR-7, UI-3 | leaf | Backend | user-authored Blocks run sandboxed; grants enforced; consumes `capability_grants` |

---

## 4. The global build order (first → last, fail-proof)
Do issues in ascending `#` (contiguous **1→143**; doc order = `#` order). **Every `←` blocker has a strictly lower `#`
and every `→` block a strictly higher `#`** (proven in §5, **no forward-ref remains**) — so nothing is ever started
before its dependencies exist; a lower `#` is always safe to start. Independent tracks (DB/AR spine · Design-System
DS→UI · UX · the ② surface tier · the M1.2.4 debt) run in parallel — the `#` is one valid linearization, not a claim
that #k must finish before #k+1 begins.

**Routing basis (what `tracker_sync --next` actually walks):** `tracker_sync` orders ready issues by the **milestone
index in `.claude/tasks/_projects.md`**, not by this `#`. At G4, `_projects.md` lists **M1.2.4 right after M1.1.2**,
so routing runs: MOD-routines #57 ⏳ (the last open M1.1.2 issue) finishes first → then the debt, L1 **#60–62**
(preferences-rescope · notes-rescope · sessions-rescope, parallel) and L2 **#63–66** → then the rest of M1.1.3
(#67–71). fe-calendar #90 ⏳ keeps running in parallel (`golive-replan/g3-order.md` §2). The `#` here is laid out to
agree with that walk (EX-5).

**Critical path (a longest chain, the minimum schedule):**
AR-1→DB-1→AR-2→DB-6→AR-5→MOD-sessions→MOD-journals→MOD-notes-and-pages→MOD-knowledge→MOD-books→HARD-1→journals-rescope-dashboard→HARD-4→AR-3→DB-5→M3-pass
(#1→2→3→6→11→38→39→40→50→51→114→115→122→130→131→134; every hop is an encoded edge — MOD-books→HARD-1 via ⊕agg).
**Debt chain:** data-plane-wiring #59 → preferences-rescope #60 / notes-rescope #61 → journals-rescope #66 →
journals-rescope-dashboard #115 (also ← HARD-1 #114, ← notes-rescope #61) → HARD-4 #122; and sessions-rescope #62 →
notifications-rescope #65 / fe-sessions #105. The longest debt chain is 2 units after the data plane; only the dashboard
sub-issue is late, bounded by HARD-1 (`g3-order.md` §3).

**Documented exceptions (explicit, never silent):**
- **GAP-1 — re-homed, no forward-ref.** The old forward-ref `FE-shell-integration-wiring ← DB-8` (old #69 ← #91) is gone.
  That row was split at frontend-replan G6: the chrome shipped as fe-shell #85 / fe-shell-scope #86, and the live-search
  seam swap (BSE-15) is now owned by **shell-rescope #64**. Its **search done-when = the SearchProvider seam swap + an honest
  `search-unavailable` state; live FTS completes at DB-8 (#118, soft), whose close re-verifies ⌘K/notes search live**.
  The DB-8 relation is soft and NOT encoded as an edge (`golive-replan/debt-plan.md` §1/§2).
- **EX-1 — milestone-block exception.** `journals-rescope-dashboard` belongs to M1.2.4 but sits at **#115** inside the M1.4
  block, because it is ← HARD-1 #114 (`g3-order.md` §2: encoded as a ⊕split sub-issue so journals-rescope's early slices
  aren't held at the tail).
- **EX-2 — repair ≠ blocked-by.** The debt block (#60–66) precedes the surfaces it repairs (M1.2.1 #72+). Debt units carry
  **no `←` edge to the surfaces they repair**: all of them are ✅ merged, so a lower `#` is safe (`g3-order.md` §1).
- **EX-3 — downstream issue outside the order.** `note-open-behavior-preference` (LIF-238) gains `← preferences-rescope`
  (#60) but has no `#`: its milestone is DERIVED later (it also waits on the IA tab-workspace decision). When homed, its
  `#` must be **> 60**.
- **EX-4 — dissolved slots.** `fe-codec-system` (#83) and `fe-cmdk` (#88) keep their G5 slot for traceability but were
  never minted (⊘, no LIF): fe-codec-system was ratified by consumption (`TASKS.md:11`); fe-cmdk shipped via the UI-4/UX-2
  reuse, its residual BSE-15 is in shell-rescope (`golive-replan/debt-census.md:50`). The same holds for AR-6's stale
  `→ MOD-spaces` (LIF-141 canceled; dissolved into Spaces).
- **EX-5 — M1.1.3 block split.** M1.1.3 appears twice: data-plane-wiring #59, then (after M1.2.4) MOD-health-core ·
  -nutrition · -training · MOD-languages · MOD-skills #67–71. Basis: the routing walk above (M1.1.2 → M1.2.4 → M1.1.3);
  the debt needs only the data plane, and no M1.1.3 `MOD-*` is ← any debt unit.
- **GAP-2 — unminted schema-amendment gates.** The `⛔` gates on fe-routines #104 · fe-purposes-and-goals #110 ·
  fe-health #111 · fe-finance #112 · fe-relationships #113 are carried as text (G5 `surface-map.md §6.4`). G6 never minted
  amendment issues (`g6-edge-ledger.md` §3 said to; §6 shows none created). Each unit verifies at its Interpretation Gate
  whether its ① twin already closed the amendment; if not, the amendment is homed then (lower `#` than the unit).

## 5. Verification (self-check before the Step-6 gate)
Re-proven mechanically on 2026-10-21 (G3 critique rev) by parsing every table row of this doc (`#`, then each id token
in `←`/`→`), **both directions plus reciprocity**: each explicit `X → Y` has `X` in Y's `←`, and vice versa. Shorthand
sets are checked by the generator: `MOD-{journals,notes,sessions}`, "every/all `MOD-*`" ⇄ `⊕agg`, and HARD-4's 28
surfaces.
- **Levels unambiguous:** 1 Initiative · 4 Projects · Milestones (M1: M1.0 · M1.1.1–M1.1.3 · M1.2.1–M1.2.4 · M1.4;
  M2/M3/M4: one each) · every Issue under one Milestone. ✅
- **Counts:** **143 rows**, `#` contiguous 1→143, 0 duplicates. M1.0 30 · M1.1.x 34 (11 + 17 + 6, incl. data-plane) ·
  M1.2.4 8 (7 units + the #115 sub-issue) · M1.2.1–M1.2.3 **42** (25 + 7 + 10; 40 live + 2 ⊘) · M1.4 8 · M2 7 · M3 5 ·
  M4 9. Live issues = 141 (143 − 2 ⊘). ✅
- **Every Issue has `#` · id · ← · → · status.** M1.0, M1.2.x, M1.4, M2–M4 rows also carry title · home · profile ·
  outcome. M1.1.x rows are the condensed backend form (`#` · id · ← · → · status). Their full scope lives in
  `decomposition.md` and each task file. ✅
- **Acyclic + no upstream edges (both directions checked, reciprocal):** every `←` id has a strictly lower `#` than its
  row and every `→` id a strictly higher `#` — **0 violations, 0 forward-refs, 0 missing reciprocals**. The 10
  pre-existing one-sided edges are now two-sided. Six were M1.0 → MOD: MOD-sessions ← AR-5; MOD-notes-and-pages ← DB-6,
  DB-9, AR-6; MOD-purposes-and-goals ← AR-7; MOD-gamification ← AR-7. Four were MOD → P3: MOD-finance → P3-2, P3-5;
  MOD-health-core → P3-3; MOD-learning-education → P3-6. Each live M1.2.x surface ← its ① twin (all M1.1.x) and its codec
  deps. The M1.2.4 units ← data-plane #59 and each other only (#60–66). fe-tasks #99 · fe-projects #101 ← notes-rescope
  #61, and fe-sessions #105 ← sessions-rescope #62. AR-8's `←DB-8` stays removed. No M1←M3 edge. Only unresolved tokens:
  `MOD-spaces` / `LIF-141` (⊘, EX-4). ✅
- **db-10-proof:** DB-10 (#120) ← DB-6, DB-7, DB-9 + all `MOD-*` (last is MOD-skills #71), after every surface (last
  #113) and every debt unit (last #115). Every M1.2.4 unit names its file homes + real `←` edges (debt-plan §1 rule 3). ✅
- **M1-done-both-tracks + debt:** HARD-4 (#122) ← **exactly `hard-4-polish.md`'s 35 blockers**: 28 `fe-*` surfaces + 7
  hardening (HARD-1/2/3 · DB-8 · DB-10 · DB-11 · MIG-1). It is also ← **the 8 M1.2.4 issues** (#60–66 + #115). No
  `fe-codec-*` is a HARD-4 blocker: CODEC is met through its consumers (`golive-replan/process.md` §5). M1 can't close on
  the backend alone, nor before the debt (ADR-019 §3.2; `debt-plan.md` §5 G4 action). ✅
- **Status oracle:** glyphs from merged PRs through #151. All M1.1.1 ✅. M1.1.2 ✅ except MOD-routines ⏳. M1.1.3:
  data-plane ✅ (#148), the rest ◻. Of the 42 surfaces: 22 ✅ · 1 ⏳ (fe-calendar) · 17 ◻ · 2 ⊘. Linear lag is noted but
  not adopted: LIF-207/205/217 aren't Done in the map and LIF-237/239 are BACKLOG, yet their PRs are merged. ✅
- **Every DF resolved** incl. DF-5 (grain), DF-8 (profile column), DF-10 (the `#` order), **DF-13** (go-live drift). ✅

## 6. Re-organization plan for Step 7 projectize (identities preserved — no re-tier, no rename)
This is a **re-organization** of the existing tracker into the correct hierarchy, NOT a re-creation. Nothing that
already exists changes identity:
- **LIF ids: unchanged.** They are the foundation. Every existing issue keeps its LIF number and its established
  slug (AR-*, DB-*, DS-*, UI-*, UX-*, P2-*, P3-*, QA-1, DB-8b, UX-5b, AR-9b). Only the **Project/Milestone homing** is
  corrected. New issues (the `MOD-*` modules, `HARD-*`, `MIG-1`) are the only additions.
- **Re-home, don't recreate:** author `_projects.md` with `## M1..M4` (tier sections, ordered) + their `### Milestones`
  (M1.0…M1.4, M2.0, M3.0, M4.0); set each existing issue's `# Project:` + `# Milestone:` headers to its correct home.
  The 9 shipped issues stay shipped, keep their LIF, and just gain the correct `# Project: M1` / `# Milestone: M1.0`.
- **Task files updated in lockstep:** each `.claude/tasks/*` (+ `archive/*`) gets its `# Project:`/`# Milestone:`
  headers set to the new home so `tracker_sync` resolves every blocker (slug ↔ LIF preserved). Then `tracker_sync --status` must be clean before any live write.
- **Already-tracked hygiene (not new decisions):** the LIF-107/76 AR-5 dedup + archiving the empty ①–⑤ Project shells
  are existing manual-Linear items Victor owns in the Linear UI — carried forward, not re-decided here.
- **Gate:** project-first, relayed approvals (one Project verified in Linear before the next), per the scenario.
