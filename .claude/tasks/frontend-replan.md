# Task: frontend-replan (G0–G6) — surface-first frontend re-plan

# Profile: Project Foundation Setup
# Scenario: Milestone Delivery Planning
# Linear: (create at G6 reshape — supersedes the 24 fe-* LIF-178…201)
# Created: 2026-09-30
# Worktree: .claude/worktrees/frontend-track (branch worktree-frontend-track, off main)

## Goal
Execute the frontend re-plan established 2026-09-30 in
`docs/specs/foundation/frontend-replan/_index.md` — surface-first, coverage-gated — via the
G0→G6 gate sequence, then run per-surface builds (3-lens audit → build → Visual Gate → PR → merge).

## Dependencies
Blocked by: none (all M1.2.1 foundation backend twins merged to main).

## Gate sequence (from _index.md §5)
- [x] G0 — Lock the process (§2) as the Tier-1 flow doc → `frontend-replan/process.md` ✅ 2026-09-30 (`8472053`; critic REVISE→resolved; Victor-approved)
- [x] G1 — Quality-Bar gate → `frontend-quality-bar/_index.md` ✅ 2026-10-01 (critic REVISE→2 must-fix+3 should-fix folded→SHIP)
- [x] G2 ✅ Surface harvest → `frontend-replan/surface-map.md` — PASS 1 + PASS 2 (4 parallel cluster auditors a9e1/aa3e/a59d/a350) done 2026-10-01. ~30 DISCOVERED surfaces (roster §6.2); 8 confirmed SYSTEMIC findings (empty-state·sync-status·reduced-motion·theme-ability·Editor/Layout-facet·voice/honesty·≥2-paths·provider-reads §6.1); SCHEMA-BLOCKER map per module (§6.4); BUILD-SHAPE insight (§6.3) = codec-first → shell+7 cross-cutting surfaces → schema-gated per-module. Surface-map = DESIGN inventory (modules are schema-floor + 0 service/surface lines; dominant lens = MISSING).
- [x] G3 ✅ Composition map → `decomposition.md` (surfaces → codec units: 7 view-modes · 6 archetype shells · Layout/Editor facet · 8-pattern kit · composition primitives; 3 build tiers codec→shell+cross-cutting→schema-gated modules) + `traceability.md` (every surface←intent; orphan check PASS: no un-homed surface, no un-realized P1–P6; owed ADR-amendments flagged). 2026-10-01.
- [x] G4 ✅ Coverage gate → `coverage-report.md` + `tools/frontend-intent/{set-cover.py,capabilities.json}` — ≥2-paths RATIFIED (open-decision #4 resolved, hard-floor+soft-signal); run: pass1 REVISE (7 single-path contextual-only) → ReachabilityRegistry remediation (+⌘K) → pass2 PASS 59/59. 2026-10-01.
- [ ] G5 — Order → surface `#` sequence into `reconstructed-structure.md`
- [ ] G6 — Linear reshape (⚠ semi-destructive, Victor-approval-gated) → `g6-edge-ledger.md`
- [ ] builds — per-surface 3-lens audit → build → Visual Gate → PR → merge

## Open decisions carried into G0/G1 (from _index.md §7)
1. Aesthetic & density direction (power-tool vs calm) — Victor input at G0/G1.
2. Spaces bar timing — build seam now or defer (PARKED→M1.1)?
3. Standards-bar home — repo-level extending global (recommended; confirm G1).
4. ✅ RESOLVED (G4) — ≥2-paths RATIFIED as the coverage criterion (hard floor + soft signal); enforced by tools/frontend-intent set-cover.
5. Sketch-gaps to hunt in G1 — perf budgets, reduced-motion, i18n/RTL, empty/error copy, dark-mode, focus, offline/optimistic, responsive.

## Build Steps
- G0 ✅ — process.md written → independent critic REVISE (§XXVI misorder + 3 should-fix) → folded → Victor-approved → `8472053`.
- G1 ⏳ IN PROGRESS — Quality-Bar gate. ▸ P1–P6 experience capture COMPLETE (specimens p1–p6 + org-map + archetypes); Quality Bar DRAFTED → `frontend-quality-bar/_index.md` (consolidates §2 ADDs · §3 P1–P6 feel · §4 org/composition/portability/archetypes/sessions · §5 open seams); independent adversarial critic DISPATCHED (afab76fd). Next: fold findings → SHIP → G2.
  - Dedupe inventory done (global STANDARDS cover topics 1–8; genuine ADDs = microcopy, i18n/RTL, IA/surfacing, Gestalt enrichment, offline/local-first, ZK copy-honesty + optimistic/offline/partial states; WCAG 2.1→2.2 pin).
  - Sketch bar extracted (ISO 9241-210 · Five Planes · WCAG 2.2 POUR · 8-state · Gestalt · dual IA · error-matrix).
  - OS structure baseline persisted → `frontend-replan/os-structure-baseline.md` (hierarchy + pagination map + IA/interaction/state, all cited; G2 grounding).
  - ⛔ BLOCKED on Victor's experience/feel vision (the Surface plane) — aesthetic/density (_index §7 #1), motion-between-modules, trust/reversibility language, Home 4-region reshape. G1 "feel" sections cannot draft until captured.
  - Captured unannounced intent: Home 4 regions (schedule·stats·day-actions[must/can]·quick-actions) → holding for G2/Home.
  - ▸ G1 EXPERIENCE CAPTURE LOOP (recovered from crashed session `9a0446fa`, approved 2026-10-01):
    Loop = (1) list missing big-picture experience → (2) phase it → (3) per phase I bring info+gaps+a way to
    visualize → (4) Victor brings his mental image. Victor rejected page-level mockups → stay GLOBAL/Surface plane,
    do NOT run into DEVELOPMENT/pages.
    APPROVED 6-phase plan (foundation-first):
    - P1 Identity & Feel — ✅ RESOLVED 2026-10-01 (specimen: `frontend-replan/p1-identity-specimen.html`):
      A1 = book / living journal. A2 = adaptive → **user-controlled density** (a user setting, not an imposed global).
      A3 = **editorial, THEMEABLE** — ship 3 named presets the user chooses: *The Reader* (Fraunces+Newsreader,
      warm ivory, oxblood) · *The Editorial* (Spectral+Inter, cool paper, ink-blue) · *The Quiet Desk*
      (Source Serif 4+IBM Plex Sans, warm gray, olive). A4 = light primary (all presets daylight/paper).
      ▸ IMPLICATIONS (carry to build): (1) ds-2/ds-4 token arch must support N swappable theme FAMILIES incl.
      font-family (Tamagui sub-themes; perf line = serving ~5 font families + live type-ramp swap) — upgrades
      ds-2's placeholder-palette note to "architect for N themes"; switcher UI → fe-preferences; density →
      user_preferences. (2) DEFAULT = **B The Editorial + calm density** (cold-start E2) ✅ CONFIRMED 2026-10-01.
    - P2 Space & Motion — ✅ RESOLVED 2026-10-01 (specimen: `frontend-replan/p2-space-motion-specimen.html`, interactive).
      B1 = **user-selectable transition** (Page-turn · Cross-fade · Slide · None/Instant), like themes; carries the
      book metaphor into motion; B3 "truly invisible" = the `None` option. B2 = **Soft & organic** — ONE coherent OS
      motion voice (spring/overshoot). B3 = settle by default + None/Instant user option; slow async ops (FTS rebuild,
      sync, export, vault unlock) ALWAYS show honest progress ("no spinner" = don't fake waiting, not hide real waiting).
      ▸ BUILD WATCH: organic is upper-budget (~440ms + overshoot) → scale spring down / allow interrupt on rapid nav;
      reduced-motion strips the spring (required alt).
    - P3 The Day — ✅ RESOLVED 2026-10-01 (specimen: `frontend-replan/p3-home-the-day-specimen.html`, arrangement toggle).
      D4 = Home arrangement (**Journal-first / Dashboard-first**) is a USER CHOICE (like theme+motion); entry-placement
      is the load-bearing var. Reconciliation: documented UX-6 3 sections (summary/agenda/entry) → Victor's 4 regions =
      agenda SPLITS into ① schedule (timed) + ③ day-actions (untimed, must/can tiers); summary→② stats glance+gateway;
      ④ quick-actions = net-new (global quick-capture gap). Backend contribution-registry already renders registered regions.
      D3 = momentum OPTIONAL & QUIET (gamification opt-in, Home calm).
      D1 = ✅ DOC-VERIFIED (Victor asked to check): check-ins are USER-SCHEDULED via check_in_templates
      (schedule_type{daily,weekly,custom} · schedule_days · preferred_time{morning,afternoon,evening,anytime} — a
      day-PART not clock-time) `[types/entities/user.ts:113-163]`; surface as (a) reminder notification per template
      schedule `[cross-module-integration.md:53,375; notifications.type=reminder]` + (b) a dayparted agenda item via the
      shared `dueIn(today)` primitive that ALSO feeds Sessions + Global Calendar `[journals/business-rules.md:23-24]`.
      ▸ SEQUENCING: schedule config = M1; reminder FIRE = M1.2 Notifications (CK-8); check-in→agenda wiring = J8 deferred.
      ▸ BUILD NOTE: schedule region must render BOTH precise-timed + dayparted items (a check-in bridges ①/③).
    - P4 Trust & Reversibility — ✅ RESOLVED 2026-10-01 (specimen: `frontend-replan/p4-trust-reversibility-specimen.html`).
      C1 = sync indicator is the entry to a **Sync & Activity Log** ("OS's honest memory of itself"): this device's change
      log (from `sync_queue` + per-row `_sync_*` provenance `[ADR-003:84-85,434]`) + multi-device COMPARE when synced
      (server Device registry + Blob index). PRESENTATION user-controlled: always-chip · `/sync` page · on-state-change ·
      hidden. ▸ STAGING: M1 = local-only/honest (sync deferred ADR-017); multi-device compare = M3+; local log earlier.
      ▸ IA: `/sync` is NET-NEW vs the 6 documented global-bar surfaces (harvest G2); pairs w/ Settings→Devices (register/revoke
      in security-model). C2 = folds into C1 (writes instantly real locally, no Saving-spinner). C3/C4 = undo-by-default
      (soft-delete→undo toast) + visible Trash restore + hard danger-confirm ONLY for irreversible (design-system types
      intent:'danger'+confirmLabel). C5 = stage-honest voice (M1.0 local-first vs M3 zero-knowledge; copy-honesty contract).
      ▸ EMERGENT PRINCIPLE: theme(P1)·motion(P2)·Home arrangement(P3)·sync visibility(P4) ALL user-controlled →
      **"the user controls their own surfaces"** = Vida's defining personalization spine → carries into P5.
    - P5 Discover & Own — ✅ RESOLVED 2026-10-01 (specimen: `frontend-replan/p5-discover-own-specimen.html`, 4 tabs E1/E2/E3/Atlas).
      E1 = ≥2-reachable-paths = **HARD floor** (1-path feature FAILS the G4 coverage gate) + **SOFT signal** above (more paths = advice).
      E2 = teaching-invitation empty states by DEFAULT + OPTIONAL guided setup (skippable). E1↔E3: enable/disable safe only because ≥2 paths. E2 = onboarding
      4-step (copy-honest) + inviting/teaching empty states (never blank). E3 = personalization at THREE GRAINS:
      ① configure (theme/density/motion/dock) ② compose (Home arrangement+regions+quick-actions · ⌘K pins · Spaces
      saved-views) ③ enable/disable (modules=active_modules · nav=module_visibility · gamification=feature_gamification ·
      sync page · Feature Atlas). Stored in Preferences singletons (PR-3), instant-apply (PR-5 Zustand), ZK per-vault,
      honest defaults (E2). NET-NEW schema fields (⚠ INTENDED → ADR-002 §5.17 amendment): theme-preset, density, motion,
      Home arrangement, sync visibility. ▸ E1↔E3 COUPLING: enable/disable safe ONLY because ≥2 paths (no orphaned capability).
      ▸ NEW SURFACE (Victor 2026-10-01) — **Feature Atlas / "Explore"** (net-new global surface, G2 harvest; enable/disable-able):
      (1) feature-interconnection GRAPH for onboarding+discovery — reuses Sigma.js (Neural Graph engine), data = user-facing
      translation of module-dependency-graph.md + cross-module-integration.md; (2) per-feature USAGE stats dashboard —
      a DEDICATED VISIBLE on-page SECTION (Victor 2026-10-01, "bring stats in a part of the page"): headline figures
      (actions logged · modules in use · streak · most-used · quietest) + a ranked per-feature usage list (ink bars),
      SAME data as the map (node size == bar); extends command_bar_history frecency (use_count/last_used_at) + @vida/core
      analytics, **ZK-LOCAL** (your eyes only, never telemetry); (3) data-driven HELP/suggestions over the interconnection graph.
      STAGING: graph M1.1+ (modules live) · usage-log early · suggestions M2+. All ZK-local. E4 = IA-discoverability = standards-bar ADD (G1 output).
    - P6 Voice & Coherence — ⏳ IN PROGRESS (specimen: `frontend-replan/p6-voice-coherence-specimen.html`, 4 tabs).
      F1 = ✅ Vida VOICE codified (6 principles: plain·calm·honest·warm·yours·sentence-case) — standards-bar ADD.
      F2 = ✅ honest copy (overclaims→staged · blames→teaches · dead-end→anti-lost; ZK copy-honesty = WRONG if overclaims).
      F5 = ✅ ship BOTH English + pt-BR in M1 (Victor 2026-10-01); architecture i18n-ready (strings externalized, locale-aware
      dates/numbers/currency via existing locale/number_format/time_format; logical-property layout for later RTL); more langs = translation pass.
      F3 = ⏳ screen-archetype catalog — REFRAMED by Victor 2026-10-01 (3 corrections): (1) view-modes SHAPE-SHIFT &
      COMBINE (not single-select — user blends list+calendar, board-of-galleries); (2) a view-mode is a PORTABLE unit =
      embedded BLOCK in a note/page (editor /tasks·/events·/habits·/timeline·/chart integration blocks) OR a standalone
      PAGE — same renderer, inline or full; (3) catalog of isolated screens MISSES the HIERARCHY + whole ORGANIZATION
      (the navigable tree + how the user MANIPULATES it to see content "the right way"). → deliverable shifts from
      archetype-gallery to ORGANIZATION MAP: dual-axis (Module dock content-home × Spaces cross-cutting lens, IA §1) +
      global surfaces + depth tree (Shell→surface→top-view[shape-shift modes]→entity→section→block[embedded view-mode])
      + manipulation (switch/combine modes · group/filter · save-as-view→Space · embed-as-block · drill · [[cross-link]] · graph).
      Archetypes/view-modes are LEAVES of this tree, not the structure. Specimen: `frontend-replan/p6-archetypes-design.html` (v1, too flat).
      ▸ ORG-MAP v1 (`p6-organization-map.html`) REJECTED by Victor (nav not responsive/intuitive; nesting wrong at base; portability NOT per docs).
      ▸ DOC-TRUE MODEL (research agent, cited 2026-10-01) — correct these:
        NAV = adaptive ⌘K-first shell: dock drawer(mob)→rail(≥768)→sidebar(≥1440); global bar condenses; Spaces hidden mobile
        `[shell-layout.md:33,45-56]`; ⌘K = "jump anywhere + do anything + search, from any screen" = the spine `[command-bar-and-search.md:11-14]`.
        NESTING = COMPOSITION not nav-ladder: page = EditorDocument (TipTap JSON) of BLOCKS — 11 standard + 11 integration
        `[editor.ts:12-24; e5-block-registry.md]`; nav hierarchy (routes→surface→entity) is SEPARATE from composition (page=blocks).
        PORTABILITY = TWO distinct primitives (I wrongly merged): (a) Saved View ADR-007 = filter×layout×grouping lens, space_id
        nullable (NULL=global cloneable), provider-read pattern, layouts list/table/board/gallery/calendar/graph/timeline — PASSIVE;
        (b) Capability/Block ADR-008 = declares render_targets{inline=page doc/Yjs · standalone=block_instances row on Space}, user
        picks per-instance — INTERACTIVE. Spaces: enabled_blocks(palette)≠block_instances(placements). Templates ADR-009 = portable bundle, fork-on-instantiate.
      ▸ VICTOR-DECIDABLE OPEN SEAMS (his intent extends docs): (1) COMBINABLE/shape-shift layouts (ADR-007 = one layout/view today);
        (2) Saved-View embeddable as a page BLOCK (ADR-007 §3.4:125-126 = open "no widget-placement slot today, not asserted").
      ▸ TWO ARTIFACTS SET + CONSISTENT (2026-10-01) as the enter→organize→meet walk for Victor's full narration:
        `p6-organization-map.html` (= corrected v2 model: ⌘K-first adaptive nav · pages=blocks · 2 primitives · 2 seams) +
        `p6-archetypes-design.html` (re-set: §0 renderer=Saved-View 7 layouts+combine+page/block/lens; each archetype has
        composed-of/hosts/reached/used-by; Dashboard=page of integration blocks; Canvas names Editor=the block canvas).
        AWAITING Victor's full walkthrough (enter→nav→surface→blocks) + his edits to mark his mental model.
      F4 = Gestalt/cross-module coherence — delivered BY F3 (archetype reuse = structural consistency, not policed).
    - ▶ RESUME POINT: execute P1 (bring info+gaps+visualize for A1–A4 → hand to Victor). This never ran before the crash.

## Route History
- 2026-09-30 — session start; profile Project Foundation / Milestone Delivery Planning; G0 begun.
- 2026-09-30 — G0 SHIP (`8472053`). Opening G1 (Quality-Bar gate), carrying open-decision #1 (aesthetic/density) as first input.
- 2026-10-01 — G1 advanced in session `9a0446fa`: Home 4-region intent captured, OS baseline gathered + persisted, experience capture loop + 6-phase plan APPROVED. Session crashed before P1 ran. Recovered + persisted here in a fresh session; resuming at P1 — Identity & Feel.

## P6/F3 — Victor's composition vision + Spaces frontend model (2026-10-01)
PRINCIPLE: every surface = a COMPOSED surface (Views + Blocks), personalized per surface-TYPE + remembered per INSTANCE.
Spaces engine (root tag · Views · enabled Blocks · Template) = the universal composition substrate — generalized from
user-Spaces to Home/module-landing/entity-page/task-page/session-runtime. Grounded: intake/spaces.md ("foundation that
lets a user assemble his own module-like surfaces", replaces v1 bespoke Hub pages) + ADR-006 §3.4 (spaces entity,
enabled_blocks palette≠block_instances placements) + ADR-007 (views space_id?) + ADR-008 (render_targets) + ADR-009 (fork)
+ SP4 (USER-AUTHORED capabilities, sandboxed). EXTENDS docs (design-intent): entity-page composition + session-runtime
composition + per-instance memory + module rename (ADR-006 leaves entity-page compose + resolution internals to build-pass).
SPACES FRONTEND (4 axes) delivered to Victor: Navigation (co-primary Spaces bar, nestable nav-addressable, per-Space
visibility, tag⇄link resolution user-switch, mobile→⌘K); Composition (Space={tag·Views·enabledBlocks·name}; palette vs
placements vs views; open registry + user-authored blocks; same kit composes every surface, default+remembered-override);
Portability (View space_id null=global cloneable provider-read · Capability render_targets inline/standalone per-instance ·
Template fork-on-instantiate · 2 seams combinable-layouts + view-as-block); Archetypes (archetype=shell, Views+Blocks=fill;
entity-pages + session-runtimes become composed archetypes).
COMPONENT SPECS delivered (archetype·slots·choice·persists·primitive): Home · Graph · quick-commands(create/open/edit,pinned) ·
Journal(template bullet/descriptive) · module-landing(composable+rename) · project-page(composable,per-type memory) ·
milestone/task views(combinable layout+group-by-milestone+sort priority/stage+nested) · task-page(2 compositions, per-INSTANCE
memory: work-canvas[note+side-toggle tasks+output+docs+people+deliverable] vs lean[info+start-session]) ·
session-runtime(3 modes: staged-editor+realtime-feedback / timer / stage-by-stage-note-deliverables) · stage-deliverable.
AWAITING: Victor's next description (he said "I will describe you after you process this").

## P6/F3 — Victor's full nav/composition/portability/archetype vision + 2 refinements (2026-10-01)
NAV: TWO user-POSITIONABLE bars (T/B/L/R each; dislike topbar+sidebar → place freely). Bar1=System/account (account·prefs·
notifications·⌘K search·… personalizable) + a **Spaces SCOPE selector** ("Spaces: …" all+none) that globally scopes the WHOLE
OS to the selected Space (none=unscoped) + a dedicated **Spaces page**. Bar2=Content (modules by default · or user's choice).
▸ REFINES shell-layout: Spaces = global SCOPE selector in Bar1 + Spaces page, NOT a persistent sidebar strip; both bars positionable.
COMPOSITION: page schema (normal + entity, same) = Title · bio/info · summary block · dashboard · views/content; mode = free-reorder
OR tabbed (Dashboard|Views|Contents); built from blocks + widgets.
▸ REFINEMENT (Victor pinpoint): entity surface has TWO FACETS — a composed LAYOUT + an optional EDITOR (the entity's linked `pages`
row, polymorphic entity_type/entity_id); user composes relationship {MERGED one surface | TABBED: Home=layout · Content=editor}.
A note IS editor AND page (entity scoped as one). NOT "pages aren't editors" — editor is a facet, user-placed. Rides `pages` pattern (grounded).
PORTABILITY: (1) normal VIEW = classic Saved View (ADR-007), one pattern, no transforms, read-only lens; (2) capability BLOCK =
interactive MIXTURE/combined patterns (ADR-008). ▸ RESOLVES seam#1: mixing/combinable = a CAPABILITY, not a multi-layout view → no ADR-007 change.
ARCHETYPES: all configurable/shapeable with a default settled. FLOW/SESSIONS = a type that lets the user give ENTITIES (some, not all)
user-defined STAGES + DELIVERABLES vs the entity's progress; starting a session = working the entity through its stages, LOGGING
time/deliverables/stage-completion BACK onto the entity (user is "part of the progress", nothing lost). PERSISTENT TIMER HUD follows
the user everywhere (class/gym/library). 3 runtime modes: staged-editor+realtime-feedback / plain timer / stage-by-stage note-deliverables.
▸ NEW persistent shell element (Session HUD) beyond the 5 regions. ▸ EXTENDS docs: user-defined stages+deliverables on arbitrary
entities + session-logs-to-entity (docs specify for projects/milestones). Powered by ADR-004 Sessions + progress/deliverable + task_time_logs.
VICTOR'S SHELL (net) = Bar1 (positionable, +Space-scope) · Bar2 (positionable, modules default) · Content · Overlay host · persistent Session HUD; Spaces = global scope not strip.

## P6/F3 — Victor refinements round 2 (2026-10-01) — pending research afeb7c60
1. NAV BARS = responsive CONTENT-FITTING PANELS (like macOS/iPadOS inspector/edit panels), positionable TOGETHER on any
   side or apart; either extend to viewport edge OR size to contents; laid out 2–3 columns or 1–4 rows (or both). NOT fixed full-length rails. (UX, no doc needed.)
2. EDITOR FACET is NOT universal — some entities CANNOT have a page/editor by default per docs. Must find the page-able
   entity_type registry (pages polymorphic) + which entities are excluded. [research Topic 1]
3. FLOW/SESSION runtime = a PAGE: entity title + summary · current STAGE · stage DELIVERABLE + a DESCRIPTION of what the
   deliverable should be · a way to ATTACH it (document/photo/audio/…) · MARK-DONE or require PROOF-of-deliverable. Session
   types = assessment · study session · task · exercise session · … fully personalizable. The staged-list+HUD view is ONE
   face; the deliverable-attachment page is the core. User MUST attach a deliverable OR mark done (optional proof). [research Topic 2 — ADR-004]
→ Rebuild both maps again once research lands; then close F3.

## P6/F3 — round-2 corrections GROUNDED + applied (research afeb7c60, 2026-10-01)
#2 EDITOR = REGISTRY-GATED not universal: pages.entity_type validated vs OPEN registry (schema/_registry.ts, ADR-006 SP2);
   entity becomes page-able by REGISTERING; no "cannot" list — no editor by DEFAULT unless registered [note.ts:33-35]. → maps: Editor facet = page-able entities only.
#3 SESSIONS grounded vs extension: sub-types OPEN/user-extensible (study·class·focus·reading·practice·daily·review·workout·work + long-tail
   e.g. assessment) [session.ts:13-30; ADR-004 §3.3]; sessions ATTACH to entity, COMPLETE, LOG via effect rail (log_time→task_time_logs,
   measurement, xp) [sessions/contract.md:20,47-55]; file attach=note_attachments; deliverable_note=real PAGE TYPE [note.ts:23-30].
   EXTENSION (unspecified→Victor defines): per-STAGE deliverables (docs have planned_blocks+completion, not staged deliverables),
   deliverable object(description+doc/photo/audio attach), proof/must-attach, the runtime PAGE (unspecified beyond Pomodoro). Rides deliverable_note+note_attachments+effect-rail.
#1 NAV panels = content-fit responsive (together on any side, 2-3 col / 1-4 rows) — applied as note.
MAPS UPDATED: org-map §1 responsive-panels note + §2 editor registry-gated; archetypes §2 editor page-able-only + §5 rebuilt = deliverable-attachment
page (type·deliverable+description·attach doc/photo/audio·mark-done/proof·logs via effect rail·HUD). F3 near-closable pending Victor confirm.

## G1 ✅ SHIP (2026-10-01)
Quality Bar `frontend-quality-bar/_index.md` drafted → independent adversarial critic (afab76fd) REVISE: 2 must-fix (schema-present quiet_hours mislabeled net-new; field list inflated 5→9) + 3 should-fix (page-ability cite→schema/_registry.ts; Bar1 dropped 3/6 global surfaces; optimistic=none=P4 decision) → ALL FOLDED → verdict SHIP. P1–P6 feel + org/composition/portability/archetype/session model = CAPTURED. Next head: G2 — Surface harvest (3-lens audit vs this bar → surface-map.md).
