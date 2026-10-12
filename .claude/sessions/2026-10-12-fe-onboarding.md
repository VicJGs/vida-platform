# Session — 2026-10-12 — fe-onboarding (LIF-216, #26) — UNIT COMPLETE + MERGED

**Task:** fe-onboarding · **Profile:** Add Frontend Component · **Scenario:** default (Entity Delivery Flow ②) ·
**Worktree:** `.claude/worktrees/fe-onboarding` off origin/main @ 5ef0ce7 (Node 24). **PR #130 merged → main `293129f`; LIF-216 → Done.**

## Goal
Continue + complete fe-onboarding — the net-new **optional guided-setup flow** (`ext UX-5`): pick modules + theme,
skippable, copy-honest. Resumed with front matter + S1 already shipped by a prior session (2026-10-11).

## Accomplished (this session: S2 → S3 → S4 → unit complete + merged)
- **S2 — module enable-set picker** (`07e30c8`): `modules.ts` (pure projection mirroring `module-dock.tsx`
  `visibleDockGroups()` — placement:dock + `isFeatureEnabled` fail-closed → 14 modules / 5 groups, gamification +
  empty platform-services drop; `defaultModuleEnableSet()` = all ON = today's behavior, the anti-lie default) +
  `use-module-selection.ts` (in-memory set + `ModuleEnablementWrite` stub, honest no-op commit) + `module-picker.tsx`
  (`ModulePickerView` pure + hook shell; grouped `aria-pressed` chips, decorative aria-hidden ✓, `type="button"`).
- **S3 — theme picker + live preview** (`540a0fb`): `use-theme-selection.ts` (`preview` drives the injected app-owned
  lever; `commit` stub) + `theme-picker.tsx` (`THEME_PRESETS` single-select swatches). Per-preset palette bands resolved
  via a `getComputedStyle` probe under `<html>` in a POST-PAINT effect.
- **S4 — reach + app-mount** (`a57523f`): `guided-setup-store.ts` (none|invited|running phase) + `guided-setup-reach.ts`
  (2 distinct ReachPaths `link`+`contextual` → ≥2 floor) + `guided-setup-entry.tsx` (invitation + slot button) +
  `guided-setup-mount.tsx` (`GuidedSetupTakeover` — lifts selections, maps renderStepBody, live preview, commit→close) +
  `App.tsx` (fixed opt-in overlay over the still-mounted router + minimally stateful selection). `onboarding.tsx` untouched.
- **Gates:** every slice §XXVI double-gate + independent **g2 SHIP** + blocking real-browser Visual Gate. Final:
  tsc 0 · eslint 0 · **onboarding 61/61 · App 6/6 · App.integration 4/4 · full @vida/web 508/508** · **4 Visual Gates
  PASS** (3 presets × L/D × 375/768/1440 incl warm-dark: module AA 4.94–6.03 + state ≥3:1 · theme bands distinct 3/3 +
  live-preview re-root · invitation AA 4.94–17.29 + E2E live preview · 0 overflow). CI Typecheck/Lint/Test/E2E green;
  Format/Workers = the 2 documented pre-existing reds. **PR #130 merged** (plain `--merge`; `--admin` correctly declined
  + unnecessary).

## Decisions / lessons
- **S3 — previewing a NON-active theme preset needs a probe, not nested `<Theme>`.** The active `<body class="t_<preset>">`
  scope `:root.t_<mode> .t_<preset>` (specificity 0,3,0) out-specifies any in-tree wrapper → bands collapse to the active
  preset. Fix: probe a `t_<preset>` div under `document.documentElement` (outside `<body>`) + `getComputedStyle`, in a
  POST-PAINT effect (the provider applies classes in its own layout effect → a render-time read sees undefined vars;
  Visual Gate caught cells=0/0/0 → 4/4/4). New memory [[preview-nonactive-preset-needs-html-probe-postpaint]].
- **The 4 gates each caught a distinct class the code-gates missed:** Visual Gate → S2 accessible-name pollution (the
  ✓ glyph) + S3 blank bands; g2 → S3 probe exception-leak (try/finally) + S4 missing `<App/>`-seam coverage for
  reach-path-(a). tsc/eslint/unit were green through all of them.
- **Reach ≥2 floor dedupes by ReachPath CATEGORY** — two same-category surfaces collapse to 1 and fail; mapped the
  invitation=`link` + slot=`contextual`.
- **Overlay-not-replace** preserves router state + lets the app re-theme live behind the overlay through one shared
  `UIProvider selection`.
- **Extend, don't re-skin, held to the integration:** touched exactly one shared file (`App.tsx`); `onboarding.tsx`
  never edited; the invitation is a store-driven post-completion overlay, not a ready-step button.

## Deferred (homed)
- Live module/theme **persistence** (`commit` stubs) → M1.1 `nav_preferences`/feature-flags + the theme-switcher store.
- `EmptyState.guidedSetup` slot consumption by each real module surface → those surfaces' own units.
- Full Zustand theme-switcher → Settings (App.tsx's local selection = the M1 minimum).

## Next session
- **Next head = `mod-routines`** (backend, M1.1.2 — computed `--next`; highest direct-dependent count). Fresh worktree
  off main; add-backend-component / Entity Delivery Flow ①; Node 24 for @vida/core.
- **Housekeeping:** the `fe-onboarding` worktree still holds a PRIOR session's uncommitted bookkeeping (session-log,
  several task files, TASKS.md) — untouched all session; confirm ownership before removing the worktree. The
  `closeout-fe-onboarding` worktree (this close-out) can be removed after its PR merges.

Task completed.
