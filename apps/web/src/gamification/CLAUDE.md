# apps/web/src/gamification — "the System" surface (fe-gamification ② · LIF-181)

The `/gamification` route: a **multi-mode top view** (IA §4 · `hasMultiModeTopView`, no routed detail pages — content
lives in the modes) over the finished `mod-gamification` ① service. ② UI/UX only — **no `@vida/core`/`@vida/types`
change**; the UI renders the seam's shapes and holds no business logic (IR-G3). Delivery:
`docs/specs/foundation/fe-gamification/delivery/`.

## Files (S1)
- **`use-gamification.ts`** — the Overview DATA seam. TYPE-correct against the shipped `GamificationService`
  (seam-contract.md), data **STUBBED** at M1 (IR-G1 — the fe-notes data-plane gap). M1 default = a fresh System
  (level 1, no currencies/unlocks) → `success` (the hero always renders; the hub is never a blank "empty").
  `?sample` = a populated System for the Visual Gate; `?force=loading|error` reaches the two terminal states the
  honest seam can't. Live swap = React Query over `svc.getProfile/getLevel/getBalances/listCurrencies/getUserAchievements`
  (documented in-file) — one binding change at the first composition root.
- **`use-active-preset.ts`** — reads the globally-active preset from the provider-applied `t_<preset>` `<body>`
  class (the authoritative signal; no global preset STORE yet — the Zustand switcher is deferred to Settings), live
  via a `MutationObserver`. The System **reads** the preset, never sets it (GM-16).
- **`use-persona.ts`** — the deny-safe Preferences `persona` read → reward REGISTER. Absent ⇒ `neutral` (M1 has no
  live persona; the setter is `fe-settings` LIF-193). `?persona=game|neutral` DEV gate override.
- **`reward-copy.ts`** — the register COPY map (EC-10). ONLY the documented pairs (Rules↔Quests, Reward↔Loot);
  copy only, never theming (GM-16). No invented terms (No-Guessing).
- **`xp-hero.tsx`** — the level + XP-to-next hero (EC-4). Bar (`HonestProgress`) under the calm presets, SVG **ring**
  under the `game` preset (keyed to `useActivePreset`). Ring colors via `useVidaTheme().get('web')` (the pomodoro-ring
  SVG pattern; a `$token` attr renders colorless); ring is `aria-hidden`, the caption carries the progress for SR.
- **`gamification-overview.tsx`** — the Overview mode over `@vida/ui` `DashboardView` (the home-dashboard precedent):
  Level · Currencies (balances) · Recent achievements. Each block threads its OWN state (BR-2); block-empties are
  honest teaching lines, **NO action buttons** (each mode's working entry points arrive with its slice).
- **`gamification-surface.tsx`** — the route (default export): title-hero + the 5-mode `Tabs` switcher (EC-3) +
  the Overview panel (its 8-state) + the not-yet-built mode(s) as honest `EmptyState` (the governed guideline —
  ADR-007 §3.6 / 8-state canon, NOT an ad-hoc placeholder). S5 replaces Activity.
- **`use-rules.ts` + `rules-mode.tsx` + `rule-authoring-flow.tsx`** (S4 · EC-7/EC-9) — the Rules mode + authoring Flow.
  Rules mode = `CollectionView` list + per-rule condition/consequence summary + Enabled/Disabled toggle + delete +
  `+ New <rule>` (register-aware EC-10 Rules↔Quests). The Flow = the novel wizard over `FlowSessionView`: 3 stages
  condition→reward→review, `renderStage` forms + own Back/Next/Create. Condition = the honest empty-seam measures
  (the ADR-011 §3.6 registry ships empty + has no enumeration API → no measures to pick at M1, EC-9) + an
  event_trigger; reward = grant/lock a currency (money·allowance·time) + a deny-safe Dream earmark (GM-7, empty at
  M1); review → optimistic-local `createRule`. Data stubbed (IR-G1). **NB:** the Flow passes NO `FlowSessionView`
  affordance handlers (it owns its own Back/Next/Create) — which required the `@vida/ui` render-when-handler fix.
- **`use-achievements.ts` + `achievements-mode.tsx`** (S3 · EC-6) — the Achievements mode, the FIRST genuine
  2-layout `CollectionView`: **calm = list · game = trophy wall**, the default PRESET-keyed (game→gallery, else list —
  the S1 ring idiom via `useActivePreset`) + the switcher lets the user override. Data = `listAchievements`×
  `getUserAchievements` join (honest M1 default EMPTY — nothing seeded yet); progress-toward-locked NORMALIZED
  {current,target}, deny-safe (the raw Record + condition target is a later backend slice). Tier = a LABEL +
  a ringed **Lucide Medal** (brand accent earned / muted locked); NO bronze/silver/gold palette (EC-11 token-purity;
  a Figma/M4 concern). List groups by category (`ListView` sections); gallery is flat medal tiles (`GalleryView`).
- **`use-currencies.ts` + `currencies-mode.tsx`** (S2 · EC-5) — the Currencies mode. Data seam = `listCurrencies`×
  `getBalances` join, STUBBED (honest M1 default = the shipped XP currency), paginated 50/page, optimistic-local
  `create`. The mode = the mandated `CollectionView` shell (title/count/8-state) + a grouped `ListView` `sections`
  (one per backing kind), each row = name + current + 🔒 **Lucide** Lock + locked + the balance-composition snippet
  (no per-currency ledger op in the seam — S5 owns the ledger). The `Pager` + the `+ New currency` optimistic-local
  create live in the BODY, NOT `onNewView` (that `+` is SavedView-semantic, hardcoded "New view").

## Key invariants (why, not what)
- **The switcher is `Tabs` (role=tablist), not a toolbar.** The modes are DIFFERENT content (the entity-view
  precedent) — the INVERSE of the collection-view toolbar, which swaps layouts of the SAME data. Only the active
  panel mounts.
- **An unpopulated mode = the 8-state `EmptyState`, with no dead affordances.** A mode's working entry point
  (`+ New currency`, `+ New rule`) ships with that mode's slice; S1 never renders a button that no-ops.
- **The ring is delivered IN this issue, not deferred.** EC-4's game-preset ring is S1 scope (all 5 slices ship in
  LIF-181; G0 built the preset). It reads the active preset — reading ≠ owning theming (GM-16).
- **No business logic / no level math (IR-G3).** The XP-to-next band (`nextLevelAt`/`fraction`) is the CURVE's
  (`requiredXpForLevel`), carried as seam DATA — the UI renders it, never computes it. No stored balances.
- **persona touches ONLY copy (EC-10 / GM-16).** The whole effect of persona is a few noun swaps in `reward-copy.ts`.

## G0-consequence changes outside this dir (keep green)
G0 added `game` to `@vida/ui` `ThemePreset`/`THEME_PRESETS`. Once apps/web resolves the branch's `@vida/ui`, every
`Record<ThemePreset, …>` must include `game`:
- `packages/ui/src/provider.tsx` — `PRESET_CLASSES` gained `'game'` (it was omitted in G0 → `t_game` stuck stale on
  `<body>` after switching away, which the XP-ring preset read would mis-report).
- `apps/web/src/onboarding/theme-picker.tsx` + `theme-picker.test.tsx` — the `game` label (the picker iterates
  `THEME_PRESETS`; game is meant to be pickable here per GM-16).

## Verify
- Node 24 (the worktree standard; better-sqlite3 ABI).
- **⚠ Worktree `@vida/ui` resolution:** apps/web's `node_modules/@vida/ui` symlink canonicalizes to **main's**
  `packages/ui` (no `game`). For any gate that must see the branch's `@vida/ui` (this unit changed it), re-point it:
  `ln -sfn "$PWD/packages/ui" apps/web/node_modules/@vida/ui`, then `pnpm --filter @vida/ui build` (dist). A
  `pnpm install` reverts the symlink — re-point after.
- Unit: `pnpm --filter @vida/web test -- --run gamification`. Typecheck: `pnpm --filter @vida/web typecheck`.
- Visual Gate: Brave over the real surface (`/gamification?sample`, `?persona=game`, preset×mode) — the apps/web
  real-app preset×mode switch is `t_light/t_dark` on `<html>` + `t_<preset>` on `<body>` (provider.tsx).
