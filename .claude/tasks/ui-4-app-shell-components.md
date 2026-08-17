# Task: ui-4-app-shell-components
# Profile: New Feature
# Scenario: Default
# Spec: docs/specs/features/ui-4-app-shell-components/_index.md
# Created: 2026-08-16
# Status: in-progress
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Order: #30 (reconstructed-structure.md global build order)
# Linear: LIF-89
# Source: docs/roadmap/m1.0-delivery-plan.md → M1.0-c (UI wave, tile 4/4)

## Goal
Compose the web app-shell chrome — module dock / sidebar · global top-bar · command-bar host ·
content `<Outlet/>` · modal & overlay host — in `apps/web/src`, rendering and wiring the UX-2
(command bar), UX-3 (shell layout + responsive), and UX-5 (first-run onboarding) design models on
UI-1 primitives; the last tile of the `-c` UI wave, and the shell that unblocks the `-d` UX wave (UX-6).

## Dependencies
- Blocked by: `ui-1-vida-ui-primitives` (✅ done, LIF-86) · `ux-3-shell-layout-responsive` (✅ done, LIF-92)
  - Renders/wires (design models, all shipped, not hard blockers): `ux-2-command-bar-search` (LIF-91) ·
    `ux-5-vault-unlock-onboarding` (LIF-94) · `ux-1-information-architecture` nav model (LIF-90)
- Blocks: `ux-6-home-journal-dashboard` (#26 — gated behind the `-c` wave; renders in this shell)
  `reconstructed-structure.md:87` marks UI-4 a leaf on per-issue edges, but the sub-wave gate
  (`delivery-plan:141`, `-d needs -c`) makes UI-4 the release of the whole UX wave.

## Context
Profile: New Feature (single-path → scenario `Default`, document-first build)
Home: `apps/web/src` (+ `packages/ui` chrome only where a shell primitive is genuinely shared)
Files involved:
- `apps/web/src/shell/*` — UX-3 already shipped `breakpoints.ts` + `regions.ts` (the model this renders)
- `apps/web/src/App.tsx` + router (TanStack Router) — the shell composes around the content `<Outlet/>`
- `apps/web/src/command-bar/*` — UX-2 model (registry/providers/frecency/ui-store) → mount the host
- `apps/web/src/onboarding/*` — UX-5 model (`ONBOARDING_STEPS` + `FIRST_RUN_BRANCH`) → render the screens
- `apps/web/src/nav/module-map.ts` — UX-1 nav model → dock/sidebar entries
- `@vida/ui` chrome — reuse UI-1 primitives (Menu/Dialog/Popover/Button…) + UI-2 views; add a shared
  chrome component ONLY at the rule-of-three, not by default
Integration seams to design against (verify built-vs-model at Step 0 baseline):
- UI-1 primitives + UI-2 views — ✅ built (`@vida/ui` v0.2.0)
- UX-2/UX-3/UX-5 models — ✅ shipped as typed artifacts + docs (design-against; render here)
- ⚠ Graph route — lazy-load (heavy WebGL: sigma/graphology) so it stays out of the initial bundle

## Open Questions
_None open. Every gap the task listed is resolved by the documentation (baseline.md §3 + §4) — no decisions to
escalate. The build is fully doc-determined; the spec cites the sources, it does not re-litigate them._
- ✅ Build in `packages/ui` vs compose → **compose in `apps/web/src`** (only `packages/ui` edit = D5 `createMedia`).
- ✅ Onboarding → **render the four screens now** (onboarding.md:102). ✅ Command-bar → **full launcher overlay**
  (command-bar.md:78; search shows `search-unavailable` until DB-8).
- ✅ Nav to unbuilt routes → full dock + existing `NotFoundComponent` (IA.md:152 + UX-4 degrade-never-crash).
  ✅ `/graph` lazy-split (FACT). ✅ Unit split → DERIVED from the doc-enumerated surfaces, not a choice (baseline §4).

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Head selection | UI-4 (`#30`) | verified `#`-walk (git-confirmed done-status) + sub-wave gate + `--next` all converge; UX-6 gated behind `-c` | 2026-08-16 |
| Profile | New Feature | delivery-plan:140 row (authoritative per-issue) over reconstructed-structure's coarse "Generic" | 2026-08-16 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — `docs/specs/features/ui-4-app-shell-components/baseline.md` (3 parallel sweeps: apps/web · @vida/ui · architecture docs; 3 UNKNOWNs resolved; gate class = FULL §XXVI + Visual Gate)
- [ ] Forward spec written + Per-Step Build Gate cleared (§XXVI) before any implementation
- [ ] /read-project new-feature — relevant codebase areas mapped
- [ ] /integration-check — risks identified before any code (shell wires 4 shipped models)
- [ ] /victor-impact-scan if it touches shared code — call-sites enumerated, zero untreated impact
- [ ] Security decided explicitly — M1.0 boundary (auth OFF, ADR-017:22); no default-open action
- [ ] Change table (today/changes/result) reviewed before implementing
- [ ] /contract per any NEW shared chrome component (existing UI-1/UI-2 referenced only)
- [ ] Business logic / composition implemented
- [ ] /adr-new recorded for significant architectural choices
- [ ] /critique on all new and changed files
- [ ] Manual regression on all areas this shell touches
- [ ] Currency Rule (§XXIX) — CURRENT-SPEC + CURRENT-BUSINESS-RULES refreshed for every context touched

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; filled when spec §5 is approved. -->
- [x] **S1 · Shell scaffold** — SHIP (Visual Gate passed). `packages/ui/tamagui.config.ts` media object (+barrel) ·
  `apps/web/{shell/app-shell.tsx, shell/media-parity.test.ts, shell/app-shell.test.tsx, stores/app-shell-ui-store.ts,
  App.tsx, routes.tsx, index.html shim, index.css, test-setup.ts, vite.config.ts}` + `@vida/ui`/`@tamagui/core` deps.
  Visual Gate caught+fixed 2 real bugs (process shim; viewport fill). web typecheck + 96 tests + lint0 + build · ui 317.
- [x] **S2 · Nav chrome** — SHIP (Visual Gate passed). `apps/web/src/shell/{nav-icons.ts, feature-flags.ts,
  nav-link.tsx, module-dock.tsx, global-bar.tsx, use-nav-drawer.ts, test-router.tsx, app-shell.tsx}` + `lucide-react`
  dep. Module dock (14 modules grouped, drawer/rail/sidebar, empty-group skip, collapse toggle) · global bar
  (condensed/full, ⌘K→open, overflow Menu) · NavLink (createLink SPA anchor, ShellRoute widening, currentColor tint) ·
  mobile drawer (focus/Esc/inert). §XXVI double-gate (gate-1 REVISE 3 blockers+4 material folded · preflight PASSED
  5 folds · gate-2 clean) + Visual Gate SHIP (caught the bounded-frame/region-scroll fix — dock modules below fold).
  web typecheck + 115 tests + lint0 + build · packages/ui untouched.
- [ ] S3 · Command-bar overlay (⌘K launcher + router injection)
- [ ] S4 · Onboarding (4 first-run screens + App.tsx branch)
- [ ] S5 · Integration (compose + `/graph` lazy-split + regression + Currency)

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE). UI-4 is FULL-class → spec-driven, this stays empty. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-08-16 | initialized task (superseded the Aug-1 planned stub) + scaffolded spec stub; head + profile verified from the docs (`#`-walk + sub-wave gate + delivery-plan row) | Step 0 baseline |
| 2026-08-16 | Step 0 BASELINE (baseline.md, 3 parallel sweeps); 3 UNKNOWNs + 3 manufactured "decisions" all resolved from docs (Victor: no decisions — every gap already solved); umbrella spec authored (BR-1..7 + S1–S5 roster) + S1 detailed spec; **gate-1 critique REVISE → 7 findings folded (Rev 2)**: 2 BLOCKERs (F1 `createMedia` is a removed v1 API → plain `media` object; F2 AppShell mounts in `routes.tsx` `RootComponent` wrapping `<Outlet/>`, not above `RouterProvider`) + 3 material + 2 minor | Approval 1 |
| 2026-08-16 | **Approval 1 ✅**. Step 5: **/preflight PASSED (2 folds)** — FOLD-1 Visual Gate = running app (`pnpm dev` render-table:45) not Storybook (`apps/web` has none); FOLD-2 jsdom docblock — both folded (Rev 3). **gate-2** clean → scrubbed 2 residual `createMedia` mentions; no new material. | Approval 2 |
| 2026-08-16 | **Approval 2 ✅ → S1 IMPLEMENTED on branch `ui-4-s1-shell-scaffold`.** 8 steps built; apps/web = first `@vida/ui` consumer. **Visual Gate (real Brave) SHIP** — caught+fixed 2 bugs jsdom missed: `process is not defined` blank page (UI-1-U0 index.html shim) + viewport-fill (`minHeight:100vh`+index.css). Barrel sigma-WebGL crash → setupFiles stub. Green: web typecheck·96 tests·lint0·build · ui 317. **Victor: SHIP.** | commit + PR ✅ |
| 2026-08-16 | Committed `57aef4f` + pushed; **PR #25 MERGED** → main (`f0fff60`, --merge); branch deleted. | **Next: S2 (nav chrome)** off clean main, §XXVI gate |
| 2026-08-16 | **S2 (nav chrome) built + SHIPPED** on branch `ui-4-s2-nav-chrome`. Step 0–2 (baseline current · integration-check 5 risks resolved · security M1.0 fail-closed). Spec `s2-nav-chrome.md` §XXVI double-gate: gate-1 independent critique REVISE (3 blockers: router `to`-not-`href`+ShellRoute widening · empty-group skip · closed-drawer inert; +4 material) → Approval 1; preflight PASSED (5 folds) → Approval 2. Killed a manufactured icon-lib "decision" (ADR-001 fixes lucide-react). Built 8 files + app-shell rewire; **Visual Gate SHIP** (caught bounded-frame/region-scroll — modules below fold). Green: web typecheck·115 tests·lint0·build. | commit + PR off main |

## Notes
- Head verified 2026-08-16 by an independent `#`-order walk against git-confirmed done-status (not just
  memory/TASKS.md, per Victor's steer). Doc `#`-order, the `-d needs -c` sub-wave gate, and `tracker --next`
  all converge on UI-4. Verification also surfaced+fixed UX-2's missing archive/index bookkeeping.
- ⚠ App note carried across handoffs: lazy-load the neural-graph route (heavy WebGL deps).
- At UI-4 pickup, two parked items un-gate (NOT this task): `db-10` (M1.4) · `tsconfig-strict-index-access`.
- ⚠ `tracker --sync` regenerates task files from map state — re-apply enrichment AFTER any `--sync`, or sync last.
