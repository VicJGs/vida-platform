# Task: fe-gamification
# Status: in_review — COMPLETE (G0 + S1–S5, 5/5 modes); PR #140 open (2026-10-14). Merge when CI green → Done.
# Linear: LIF-181
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.2 — Feature Modules · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #32 — #32 Gamification — System Dash · rule-authoring Flow (conditional).
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for gamification — the UI/UX tier over the finished ① service (`mod-gamification`), 7 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-dashboard` ✅ (LIF-208 Done)
- blocked by `fe-codec-flow-session` ✅ (LIF-210 Done)

## Register architecture — DOC-RESOLVED (GM-16; interpretation.md §7)
Dual, user-adaptive register (game for students/teens · calm for adults). **`game` is a GLOBAL preset**
(built in G0), applied via the Preferences/Onboarding theme picker (GM-16 — the System does NOT own theming);
persona → suggest-`game`-at-onboarding is Onboarding's hand-off. The System reads persona only for **reward
COPY** (EC-10). D-REG-1 (the game preset) is **RESOLVED in-unit (G0)**; D-REG-2 (`motivation_style` setter) =
`fe-settings` (LIF-193, in progress) — this unit reads it deny-safe (absent ⇒ neutral framing).

## Build Steps (slice log)
- **G0 · Game global preset ✅ DONE** (`3a7d525` + `0306eb0`) — the manhwa-"System" register: `color.game` ramp
  (cool-violet accent + slate neutral) + `fontFamily.game` (geometric sans) + `semantic.game(.dark).json`
  overlays + `build-tokens.mjs` PRESETS + `theme-resolution.ts`/`provider.tsx` extended; regenerated themes.ts
  (8 base) + fonts.ts. **tsc 0 · @vida/ui 526/526 · B10 AA matrix includes game · Visual Gate PASS** (Brave,
  measured: surface/accent resolve to game ramp both modes · sans voice swaps · AA muted-light 4.88 / body
  16.91 / accent-on-tinted 6.32–8.38 ≥ 4.5 · danger preset-invariant). §XXIX currency updated. EC-1, EC-2.
- **S1 · Multi-mode shell + Overview + wiring ✅ DONE** (uncommitted — awaiting Victor's commit) — EC-3, EC-4, EC-10.
  `apps/web/src/gamification/`: `use-gamification` (Overview data seam — type-correct vs the shipped `GamificationService`,
  data STUBBED IR-G1, `?sample`/`?force`) · `use-active-preset` (reads the provider's `t_<preset>` body class + MutationObserver)
  · `use-persona` (deny-safe → register, absent⇒neutral) · `reward-copy` (EC-10, Rules↔Quests/Reward↔Loot, copy only) ·
  `xp-hero` (EC-4 — `HonestProgress` **bar** for calm presets, SVG **ring** for `game`, keyed to the active preset;
  ring via `useVidaTheme().get('web')`, aria-hidden + SR caption) · `gamification-overview` (EC-4 over `DashboardView`:
  Level · balances · recent unlocks, per-block state, honest block-empties no dead actions) · `gamification-surface`
  (title-hero + 5-mode ui-1 `Tabs` switcher + Overview + 4× honest `EmptyState` for the not-yet-built modes — the
  governed 8-state guideline, ADR-007 §3.6, NOT ad-hoc placeholders) · tests · `CLAUDE.md`. Wiring: `/gamification`
  lazy route (notifications precedent); `feature_gamification` dock gate already module-map-owned.
  **In-issue fixes forced by G0 (kept green):** `provider.tsx` `PRESET_CLASSES += 'game'` (G0 omitted it → stale
  `t_game` on switch-away); `onboarding/theme-picker.tsx` (+test) `game` label (picker iterates `THEME_PRESETS`; game
  is pickable per GM-16). **Responsive root-fix:** `@vida/ui` `Tabs` `TabList` now scrolls (overflowX:auto + Tab
  flexShrink:0) — gamification is the first 5-tab consumer and the strip overflowed 375; backwards-compatible
  (2-tab consumers never trigger it). **Gates:** tsc 0 (@vida/ui + @vida/web) · eslint 0 · **@vida/web 523/523 ·
  @vida/ui 526/526** · g2 independent review **SHIP** (2 NITs folded: static caption role=status→plain; persona-table
  doc note) · g1 /critique SHIP · **Visual Gate PASS** (Brave, 4 presets × light/dark × {desktop,375}: AA 4.88–6.53
  incl. warm game-dark · ring-for-game/bar-for-calm · EC-10 Quests · no page overflow at 375 [Tabs strip scrolls,
  indicator tracks] · honest EmptyState no dead action · axe-structure clean). Throwaway VG harness removed.
  **⚠ Worktree:** apps/web's `@vida/ui` symlink canonicalizes to MAIN (no `game`) — re-pointed to the worktree +
  rebuilt dist for the gates; a `pnpm install` reverts it (see `apps/web/src/gamification/CLAUDE.md`).
- **S2 · Currencies mode ✅ DONE** (uncommitted — awaiting commit) — EC-5. `apps/web/src/gamification/`:
  `use-currencies` (data seam — `listCurrencies`×`getBalances` join, STUBBED IR-G1; honest M1 default = the shipped
  XP currency; paginated 50/page; optimistic-local `create`; `?sample`/`?big`/`?force=loading|error|empty`) ·
  `currencies-mode` (the mandated `CollectionView` shell — title/count/8-state — + a grouped `ListView` `sections`,
  one per backing kind [Real money · Measured time · Self-granted], each row = name + current + 🔒 **Lucide** Lock +
  locked + the balance-composition "ledger snippet" [no per-currency ledger op in the seam — S5 owns the ledger];
  a `Pager` + the `+ New currency` optimistic-local inline create live in the BODY — NOT `onNewView` [SavedView-
  semantic, hardcoded "New view"]). Wired into `gamification-surface` (replaced the Currencies `EmptyState`).
  **Gates:** tsc 0 · eslint 0 · **@vida/web 530/530** (+7) · **Visual Gate PASS** (Brave, Currencies tab, 3 presets ×
  light/dark × {desktop,375}: AA 4.94/6.50/5.76 incl. warm game-dark · grouped 3 kinds · Lucide lock · pager "1–50 of
  120" multi-page at `?big` · optimistic-local create form at 375 no-overflow · honest empty [shell EmptyState + create
  still reachable]). §XXVIII note: `CollectionView` with `layouts=['list']` shows a lone "List" switcher — accepted
  (the slice-map mandates `CollectionView`; proposing `ListView`-direct was drift, Victor-corrected).
- **S3 · Achievements mode ✅ DONE** (uncommitted — awaiting commit) — EC-6. `apps/web/src/gamification/`:
  `use-achievements` (data seam — `listAchievements`×`getUserAchievements` join; honest M1 default = EMPTY [nothing
  seeded until app init]; `progress`-toward-locked NORMALIZED {current,target} deny-safe [the raw Record + condition
  target is a later backend slice, current-business-rules.md:96]; grouped by category; `?sample`/`?force`) ·
  `achievements-mode` (the FIRST genuine 2-layout `CollectionView` — **calm = list · game = trophy wall**; default
  layout PRESET-keyed [game→gallery, else list — the S1 ring idiom] + switcher override; list = `ListView` sections by
  category; gallery = `GalleryView` tiles = ringed **Lucide Medal** [brand accent earned / muted locked] + title +
  tier label + earned/progress; tier conveyed by LABEL [not a bronze/silver/gold palette — none exists, EC-11 token-
  purity; a Figma/M4 concern]). Wired into `gamification-surface` (replaced the Achievements `EmptyState`).
  **Gates:** tsc 0 · eslint 0 · **@vida/web 532/535** (+5; the 3 reds = known shell-integration flakes under
  parallel load — **127/127 shell in isolation**, fe-notes lesson) · **Visual Gate PASS** (Brave, 3 presets ×
  light/dark × {desktop,375}: calm list grouped-by-category [editorial 4.94] · game trophy-wall gallery [light 4.88 /
  dark@375 6.5] · **earned medal ring 5.38 light / 6.58 dark ≥3:1** · locked ring = decorative border, state via text ·
  progress bars · honest empty [shell EmptyState, count —] · no 375 overflow).
- **S4 · Rules mode + Rule-authoring Flow ✅ DONE** (uncommitted — awaiting commit) — EC-7, EC-9. `apps/web/src/
  gamification/`: `use-rules` (data seam — `listRules` stubbed, honest M1 default EMPTY [user-authored]; enable/
  disable/delete/create optimistic-local; the Flow's three reads grounded: `availableMeasures` EMPTY [the ADR-011
  §3.6 registry ships empty + exposes only query(key), no enumeration → honest empty-seam EC-9] · `rewardCurrencies`
  [listCurrencies] · `dreams` EMPTY [deny-safe Purposes read, GM-7]) · `rules-mode` (CollectionView list + per-rule
  condition/consequence summary + Enabled/Disabled toggle + delete + `+ New <rule>`; register-aware EC-10 Rules↔Quests)
  · `rule-authoring-flow` (the novel wizard over `FlowSessionView`: 3 stages condition→reward→review, renderStage
  forms + own Back/Next/Create; condition = honest empty-seam measures + an event_trigger; reward = grant/lock a
  currency [money·allowance·time] + deny-safe Dream earmark; review → optimistic-local `createRule`). Wired into
  `gamification-surface` (replaced the Rules `EmptyState`).
  **@vida/ui root-fix (the fix-the-root precedent, like S1 Tabs):** `FlowSessionView` rendered its standardized
  affordances (Mark done · Require proof · Attach Document/Photo/Audio) UNCONDITIONALLY for the current stage →
  dead no-op buttons in a create-wizard. Now **render-when-handler** (per-affordance, the DS `onFilter != null`
  idiom): a deliverable flow passing handlers is unchanged; a wizard passing none gets a clean frame. +1 @vida/ui test.
  **Gates:** tsc 0 (@vida/ui + @vida/web) · eslint 0 · **@vida/web 540/540 · @vida/ui 527/527** · **Visual Gate PASS**
  (Brave, editorial/light + game/dark@375: rules list EC-7 · the 3-stage Flow EC-9 [honest empty-seam measures ·
  reward money/allowance/time · deny-safe Dream · done-stage collapsed proof] · **NO dead affordances** · AA 4.94/6.5 ·
  no 375 overflow).
- S5 Activity — pending (the last mode).
- NB: worktree consumes @vida/ui via node_modules symlinks → main; the Visual Gate aliased @vida/ui → worktree
  src via a throwaway `vite.vg.config.ts` (deleted). Commit with explicit paths (never stage the symlinks).
