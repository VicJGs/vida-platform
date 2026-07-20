# Session Plan
# Task: build-roadmap
# Status: done
# 2026-07-20 | build-roadmap
# Profile: Project Foundation Setup → Scenario: build-roadmap
# Goal: Set the BUILDABLE DELIVERABLES for the whole platform — a phased, clustered map
#       (dependency map + roadmap) that mirrors into Linear so progress is visible and
#       enjoyable. This task SETS the deliverables; it does not build them.

## Method (the order matters)
1. **Intent first** — Victor defines the phases + how deliverables organize across the
   five categories: modules · engines · integrations · architecture · applications.
   (CAPTURED below — confirmed 2026-07-20.)
2. **Docs pass second** — read the 15 ADRs + 21 contexts + module-dependency-graph to
   PATCH the intent: fill gaps, verify placement, resolve dependencies, and register the
   integrations whose provider/method is not yet established.
3. Build the dependency map → phase/cluster decomposition → `docs/roadmap.md`.
4. Projectize into Linear (clusters → Projects, deliverables → Issues) — scope **B**
   (all the way to Linear, gated Project approvals via /track-sync).

## Roadmap skeleton — VICTOR'S INTENT (confirmed 2026-07-20)

### Phase 1 — Local dogfood
- Web app on **localhost**, **single-user (Victor)**, built until the product is *complete*
  in that form. Purpose: **show results + start using it as fast as possible.**
- State reached: "I open Vida every day on localhost and run my life in it."
- Architectural note (to verify in docs pass): a single-user localhost app **does not need
  the sync engine or the ZK server** — sync (ADR-003) + relay (ADR-013) are multi-device
  concerns → **defer to Phase 2**. Phase 1 engine load = encryption + local DB + editor +
  module engines.
- ⚠ Phase 1 is large ("complete product" = the modules) → will need **internal sub-phases**
  (spine → first modules → the rest). Slice during the docs pass.

### Phase 2 — Venues (own it across platforms) + first public release
- Three deliverables: **Self-hosted** (full-ownership instance) · **Mobile app** · **Desktop app**.
- Multi-device becomes real here → **sync engine + server + ZK relay land in this phase.**
- First public release: **web-first**, choice of **self-host OR our ZK servers**. ZK-cloud is
  a **heavy perk, NOT the headline** — the app's capabilities outsell it.
- State reached: "Others can run it — web, self-hosted, or our ZK cloud; mobile + desktop exist."

### Phase 3 — Personality (the OS layer)
- With a community established: add **integrations** + the **second level of blocks** (the
  capability layer that gives the OS its "personality").
- Rolling releases of integrations + the app, then onward.
- State reached: "Vida has its character; the community-facing capability layer is live."

## Open — resolve in docs pass
- [ ] Dependency map: engines/architecture → modules → integrations → applications.
- [ ] Phase 1 internal sub-phases (which modules first for daily use).
- [ ] Integration register: which integrations lack a defined provider/method (Victor's flag).
- [ ] Confirm sync/server deferral to Phase 2 against ADR-003/013.

## Docs-pass resolution (2026-07-20) — patched against 15 ADRs + 21 contexts + module-dependency-graph

**Confirmed:** Phase 1 (single-user localhost web) needs NO server + NO sync — web app is
already local-first (apps/web has zero fetch/API refs; OPFS SQLite = source of truth).
Keep `_sync_*` columns + `sync_queue` writes day-one (never flush) so Phase-2 sync bolt-on
is non-structural. Server/SRP/sync-reconcile/mobile/desktop all defer to Phase 2.

**Integration gap (Victor's flag), quantified:** 22 integrations → 6 DEFINED (ICS=ical.js,
MD/PDF/DOCX export, local OS alerts, in-app notifications) · 16 UNDEFINED provider — BY
DESIGN (ADR-014/015 lock the ZK model, punt vendor to build-phase). Near-term unblocked:
Finance CSV/OFX parser (unpicked). → make a **"provider-selection pass"** the head deliverable
of Phase 3.

**Doc-hygiene finds (non-blocking):** docs/platform/{web,mobile,desktop}-app-spec.md +
docs/editor/serialization-spec.md are 0-byte stubs; module-dependency-graph.md is stale
(predates ADR-004–013).

## Phase 1.0 — STRUCTURAL FOUNDATION (Victor's addition 2026-07-20 — laid before any module)
The layers that "usually get tangled" — pulled out as first-class upstream clusters so each
module is ASSEMBLY, not invention. Each ①–⑤ = a Linear Project (cluster); issues deliverable-level.

- **① Database Layer** — ADR-002 §5.20 owed-tables + ADR-004/005/006/008/011/012/013 additions →
  one Drizzle schema (packages/core); migrations; repository (encryptRow/decryptRow, [E]); FTS5 +
  rebuild-on-unlock; `_sync_*` scaffolding (no flush); seed/fixtures.
- **② Architecture Layer** — package topology + Turbo pipeline; DatabaseAdapter + web-adapter
  (wa-sqlite/OPFS/SQLCipher); crypto/vault/key-mgmt + unlock/auto-lock; state (Zustand+RQ) +
  routing (TanStack Router) + forms (TanStack Form+Zod); substrates: Sessions framework, Spaces +
  universal tags, Capability Registry, Measurability, effect rail. (Phase 2 extends this with sync.)
- **③ Design System** — token pipeline (Figma→Tokens Studio→Style Dictionary→CSS vars+Tamagui
  theme); foundations (color/type/spacing/radius/shadow/motion); Tamagui config + dark mode; primitives.
- **④ UI** — @vida/ui primitives→composites; platform views (calendar/gallery/list/neural-graph/
  timeline/pomodoro-widget/export-dialog); @vida/editor (TipTap+toolbar+slash-menu+blocks+serializers);
  app-shell components.
- **⑤ UX** — IA + navigation model; command bar + search UX; shell layout + responsive; state
  conventions (empty/loading/error/skeleton, optimistic, keyboard); vault-unlock/onboarding; daily
  home (Journal dashboard).

Ordering: **Database Layer LEADS** (Victor 2026-07-20). Technical track (①→②) ∥ Experience track
(⑤ IA-design → ③ DS → ④ UI), converge before 1a. Granularity CONFIRMED: cluster = Linear Project,
issues = deliverable-level.

**docs/roadmap.md WRITTEN 2026-07-20** — full decomposition (~43 clusters across 3 phases; DB layer
granular per §5.20). Next: Linear projectization (investigate tracker cluster/issue format → staged push).

## Phase 1 module sub-slices (build on 1.0)
- 1a — Notes&Pages · Preferences · Tasks · Habits · Finance · Relationships  → "I use it daily"
- 1b — Journals · Check-ins + aggregation engines
- 1c — Projects · Books · Knowledge · Education · Routines · Purposes&Goals (capstone) · Gamification · in-app Notifications
- 1d — Health (core/training/nutrition) · Skills · Finance→Commitments · Projects→Investigations  → "product complete locally"

## Resume — NEXT (post-/clear, 2026-07-20)

**✅ DONE 2026-07-20 — TRACKER ENHANCED (path 1).** Ran the full §XXVI gate (spec → 2× critique →
preflight → 2× approval → implement). Toolkit commits: `5cd9562` (3.9 shim clean-up) + `1217af4`
(feat: milestones + descriptions, Phase 5). Spec:
`~/dev-toolkit/docs/specs/features/task-tracker-sync/milestones-and-descriptions.md` (IMPLEMENTED).
- `linear_client`: `ensure_milestone` + `description` on `ensure_project` (read-back change-detection) +
  `milestone_id` on `ensure_issue` (idempotent bind on all paths). Field names live-introspected.
- `tracker_sync`: `# Milestone:` anchor (free-form) + `.claude/tasks/_clusters.md` sidecar (strict
  `### Milestones` + per-cluster description); milestone/desc pass in `do_sync`; map `milestones` store.
- Verified 9/9 via live smoke test on a throwaway initiative (cleaned up). Back-compat proven.

**REMAINING (Step 5 cont.):**
- ✅ **Generated 35 Phase-1.0 task files** from `docs/roadmap.md` (clusters ①-⑤; DB-1..11/AR-1..9/
  DS-1..5/UI-1..4/UX-1..6; `# Cluster:` + `# Milestone:` per issue; `## Goal` = the Linear body;
  blocked-by links) + authored `.claude/tasks/_clusters.md` (5 cluster descriptions + 11 strict
  milestones). **Verified 2026-07-20** via `tracker_sync.py --status`: 5 Projects + 35 issues +
  11 milestones all `[+ create]`, every `◇milestone` matched + every blocked-by resolved, zero warnings.
  Decisions: kebab-slug titles (= filename = blocked-by id); files flat in `.claude/tasks/` (tracker
  is non-recursive), NOT indexed in TASKS.md (backlog, not active sessions).
- ✅ **Gated `/track-sync` — DONE 2026-07-20.** Cluster-first: pushed ① Database Layer, Victor
  verified in Linear, then approved + pushed ②③④⑤. **35 issues (LIF-61…95) · 5 projects · 14
  milestones · ~34 blocks-relations, all BACKLOG.** STRUCTURAL fix mid-push: Linear caps
  `project.description` at 255 chars; the 5 `_clusters.md` blurbs (349–455) failed `projectCreate`
  with INVALID_INPUT → tightened all to ≤255, re-pushed clean. (Toolkit gap filed below.)

**Decision (settled): push Phase 1.0 to Linear via path 1 = ENHANCE THE TRACKER first.** Then generate task
files, then gated push.

**Tracker reality (investigated):** `~/dev-toolkit/scripts/tracker_sync.py` + `linear_client.py`.
One task file = one Linear Issue. Anchors: `# Task:` (title) · `# Status:` · `# Cluster:` (→ Project) ·
`## Goal` (→ issue DESCRIPTION + `toolkit:<slug>` marker) · `## Dependencies` lines "blocked by
`slug`" (→ Linear `blocks` relations). Initiative = `vida-platform` (tracker.json). Cluster gate:
`--approve-cluster NAME` per Project.

**GAP found:** client does Initiative→Project(NAME ONLY)→Issue(title+desc+status)+blocks. NO milestone
method; `projectCreate` sets no description. → Victor's "milestones + descriptive projects" NOT supported.

**Enhancement to build (path 1):**
1. FIRST: commit/clean the toolkit — it has uncommitted changes (flagged at session start). Don't build on dirty.
2. `linear_client.py`: add `ensure_project(... description=)` (projectUpdate to set description) +
   `ensure_milestone(project_id, name, ...)` via `projectMilestoneCreate` + assign issue to milestone
   (`issueUpdate projectMilestoneId`).
3. `tracker_sync.py`: parse `# Milestone:` (per task file) + a per-cluster project-description source
   (e.g. a `_cluster.md` or `## Project:` convention); wire into cmd_sync; keep it backward-compatible +
   best-effort (offline/no-key → skip, R1 contract).
4. Add tests / dry-run; verify with `--status`/`--dry-run` before any live write.

**Then:** generate ~30 Phase-1.0 task files (one per deliverable issue) from `docs/roadmap.md`:
- Clusters (=Projects): `① Database Layer` · `② Architecture Layer` · `③ Design System` · `④ UI` · `⑤ UX`.
- DB issues DB-1…DB-11 (granular, from ADR-002 §5.20); AR-1…9; DS-1…5; UI-1…4; UX-1…6.
- Milestones (intra-project groups), e.g. DB → Schema · Repository & Migrations · Search & Encryption.
- Links: DB blocks ②③④⑤; DB-1 (schema primitives) blocks the domain-schema issues; DS blocks UI.
- Each `## Goal` = concise + descriptive (it IS the Linear issue body).
**Then:** `/track-sync` — relay each `--approve-cluster` to Victor (gated; outward-facing).

## Skills / path (build-roadmap scenario — to formalize via /new-scenario at end)
1. Intake & scope-shaping — victor:planning ✅ (intent captured)
2. Docs pass / dependency map — victor:research ✅
3. Phase decomposition — victor:planning ✅
4. Roadmap doc — /documentation-component → docs/roadmap.md ✅
5. Linear projectization — clusters + issues in task files ~ (IN PROGRESS)
   - 5a. Tracker enhancement (milestones + descriptions) ✅ DONE 2026-07-20 — full §XXVI gate; toolkit
         commits 5cd9562 + 1217af4. See "## Resume — NEXT".
   - 5b. Generate 35 Phase-1.0 task files + author `.claude/tasks/_clusters.md` ✅ DONE 2026-07-20
         (verified via `tracker_sync.py --status`; zero warnings). Step 6 (gated push) NEXT.
6. Sync to Linear — /track-sync (gated Project approvals) ✅ DONE 2026-07-20 (35 issues LIF-61…95;
   cluster-first; 255-char description fix mid-push)
7. Quality gate — victor:quality-gate-foundation + /critique ✅ DONE 2026-07-20 — checklist PASS +
   independent adversarial critic. Verdict **REVISE → fixed → SHIP**. Found+fixed: [BLOCKER] AR-2⟵DB-6
   dependency inverted (adapter is below the repo; adapter.ts owns open→migrate→query→close) → now
   DB-6/DB-7 ⟵ AR-2, AR-2 ⟵ DB-1; [MAJOR] missing crypto edge DB-5 ⟵ AR-3; [MAJOR] "19 structure-data
   docs" → 24 (roadmap DB-4 fixed; ADR-002 §5.20 owed via DB-11); [MINOR] flagged no-flush HLC-encoding
   as F10-coupled + single-track DB→AR critical path. Linear graph re-synced (stale db-6→ar-2 relation
   deleted via UI by Victor; add-only sync created the 4 new edges, verified live). Zero fabricated cites.
8. Formalize scenario + /session-log — scenario ✅ DONE 2026-07-20 (`/new-scenario project-foundation
   build-roadmap`: `claude-profiles/project-foundation/scenarios/build-roadmap.md` created + router
   Scenarios table + Dispatch routing updated; grammar contracts pass — Step 0..8 contiguous, MOLD
   `execute-plan-doc` wired. Encodes gate-BEFORE-push, late-gate mistake logged in Session Origin +
   Anti-Patterns. Run `/toolkit-check` before committing `~/dev-toolkit`.) → /session-log NEXT, then /task-complete.

## Route History (detours this task)
| Step | Detour | Why | Resolved |
|------|--------|-----|----------|
| 5 | Enhance the toolkit tracker (~/dev-toolkit) mid-task | Linear push needed milestones + project descriptions the client lacked | ✅ Phase-5 shipped, live-verified 9/9 (2026-07-20) |
| 6 | 255-char description fix mid-push | Linear caps `project.description` at 255; `_clusters.md` blurbs were 349–455 → `projectCreate` INVALID_INPUT | ✅ Tightened to ≤255, re-pushed clean (2026-07-20) |
| 7 | Gate found BLOCKER dep inversion (AR-2⟵DB-6) → fix + Linear re-sync | Step-7 gate ran AFTER the push (should be before); adapter is below the repo, edge was inverted; add-only sync couldn't prune the stale relation | ✅ Fixed edges (DB-6/7⟵AR-2, DB-5⟵AR-3, AR-2⟵DB-1); stale relation deleted via UI; re-synced clean (2026-07-20) |

## Toolkit follow-up (filed, not yet built)
- **`tracker_sync` relation sync is ADD-ONLY — cannot reconcile a removed/inverted dependency.**
  `linear_client` has `set_blocks` (`issueRelationCreate`) but no `issueRelationDelete`; `tracker_sync`
  (relations loop ~L409) only creates local blocked-by edges, never prunes stale ones. Consequence: when a
  task file's dependency is REMOVED or INVERTED, a re-sync leaves the old Linear relation in place — and if
  the edge was inverted, Linear ends up holding BOTH directions = a cycle. Found 2026-07-20 during the Step-7
  AR-2⟵DB-6 fix; worked around by deleting the stale relation via the Linear UI, then add-only `--sync`.
  Fix (STRUCTURAL, needs §XXVI gate): add `issueRelationDelete` + have `do_sync` diff current Linear
  relations vs local blocked-by and prune the difference (idempotent reconcile, not add-only).
- **`linear_client.ensure_project` uses `description` (255-cap) for the Project blurb.** For richer
  Project overviews, extend it to write the long body into Linear's `content` field (unlimited
  markdown) + keep a ≤255 `description` summary. STRUCTURAL toolkit change → needs the §XXVI gate.
  Deferred 2026-07-20 (Victor chose the ≤255 tighten to unblock). The `_clusters.md` descriptions
  are now the ≤255 summaries; if `content` support lands, they can be re-enriched.
