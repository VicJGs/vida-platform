# fe-onboarding — S2 PLAN · Step 1 module enable-set picker (EC-4)

**Unit:** fe-onboarding (LIF-216) · ② Frontend · M1.2.1 · slice S2 of 4.
**Covers:** EC-4 (the `MODULE_MAP` dock roster as grouped `aria-pressed` toggles; an enable-set, optional).
**Plane:** frontend. **Gate:** §XXVI double-gate + blocking real-browser Visual Gate before S3.
**Inputs:** slice-map.md §S2 · seam-contract.md Seam A · envision.md EC-4/EC-7/EC-8/EC-9 · the S1 frame (`guided-setup.tsx` `renderStepBody` seam).

---

## Grounding (verified vs source)

- **Roster:** `MODULE_MAP` [FACT: apps/web/src/nav/module-map.ts:66-111]. The picker's candidate list = the **visible dock
  roster**, mirroring `visibleDockGroups()` [FACT: apps/web/src/shell/module-dock.tsx:39-54]: `placement === 'dock'`, then
  the `visibleWhen`/`isFeatureEnabled` fail-closed gate [FACT: module-dock.tsx:44; feature-flags.ts:10 returns false].
  → M1.0 visible set = **14 modules / 5 groups** (gamification's `feature_gamification` is OFF → excluded, its now-empty
  `platform-services` group drops — S2-BR-a2). Honest by construction: every listed module IS dock-visible today.
- **Default enable-set = all visible-dock ON** — matches today's behavior (no default-OFF mechanism exists; the only
  hidden module is the flag-gated gamification, which the picker also omits). Resolves the seam-contract gate-1 NIT: the
  preview can't lie because the default == the real dock-visibility.
- **Group labels are chrome's, by design** [FACT: module-dock.ts:17-18 "the module-map holds the group KEY; the human
  label is chrome's"]. The picker (a 2nd chrome surface) owns a local `GROUP_LABELS` mirror (IA §3), NOT a module-map
  export — honoring the documented key-vs-label split. 6 stable IA entries; mirror-commented.
- **Enable-set ≠ nav placement** (EC-4): the picker writes _which modules the user wants on_, not dock ordering. The live
  backing is M1.1 `nav_preferences`/feature-flags [FACT: feature-flags.ts:4] — **deferred, stubbed no-op commit** (EC-7
  honesty: no "saved" claim at M1).
- **Toggle semantics:** approved slice-map mandates `aria-pressed` toggles (§S2:46). Local `ModuleToggle` =
  `styled(View, { render: 'button' })` + `focusVisibleStyle` (§VIII) + `aria-pressed` + a StepRail-Marker-style on/off
  indicator. fe-onboarding-owned, Tamagui + tokens only (BR-1 — no `@vida/ui`/`packages/ui` edit; `module-dock.tsx` is
  NOT edited either — read-only mirror).

## Files (3 + test — all `apps/web/src/onboarding/`)

1. **`modules.ts`** — pure projection. `DockModule {key,label}` · `DockModuleGroup {group,label,modules}` ·
   `getDockModuleGroups()` (mirrors the dock filter+group) · `defaultModuleEnableSet()` (every visible-dock key → true).
   Local `GROUP_LABELS` mirror. No React.
2. **`use-module-selection.ts`** — the in-memory selection + Seam A stub. `useModuleSelection()` → `{ enabled, toggle,
setEnabled, commit }`; init = `defaultModuleEnableSet()`; `commit` = `Promise.resolve()` no-op (honest stub, EC-7).
   Implements `ModuleEnablementWrite` (seam-contract A).
3. **`module-picker.tsx`** — `ModulePickerView` (PURE, state-as-prop: `{groups, enabled, onToggle}`) renders grouped
   headings + `ModuleToggle` rows; `ModulePicker` (thin hook shell wiring `useModuleSelection`) = what S1's
   `renderStepBody` mounts for the `modules` step + the Visual-Gate harness. Local `ModuleToggle`.
4. **`module-picker.test.tsx`** — jsdom + `UIProvider`; mirrors `guided-setup.test.tsx`.

## State lifecycle (slice boundary)

S2 ships the **pure `ModulePickerView` + a thin hook shell**. Cross-step selection persistence + commit-into-completion =
**S4 app-mount** (lift state to the flow / read the live seam). The flow is forward-only (footer has Continue/Skip/
Skip-all, no Back — `guided-setup.tsx:97-112`), so the picker does not remount-back mid-flow; in-step state is sufficient
for S2's deliverable + its Visual Gate. Noted for S4.

## Build order (Step 7)

types (`modules.ts`) → `use-module-selection.ts` → `ModuleToggle` → `ModulePickerView` (all states) → `ModulePicker`
shell → dark/responsive are token-driven (inherited) → test. No motion in this slice (EC-10 feel rides the live gate; a
toggle is an instant state swap, B12).

## Visual Gate MUST (before S3)

Grouped toggles render (5 groups · 14 modules) · on↔off `aria-pressed` + indicator state · keyboard oper(Tab/Enter/Space,
focus ring §VIII) · AA full matrix (3 presets × light/dark incl. warm-dark: labels, group headings, the on/off indicator
≥ 3:1 non-text) · 375 reflow (no overflow) → 768 → 1440 · copy lintCopy-clean (EC-7).

## Test checklist

- [ ] `getDockModuleGroups()` == the visible-dock set (same keys as a `visibleDockGroups`-equivalent filter; excludes
      gamification + empty platform-services) — the honesty guard.
- [ ] `defaultModuleEnableSet()` has every visible-dock key true; no hidden/non-dock key.
- [ ] `ModulePickerView` renders a group heading per group + a toggle per module; `aria-pressed` reflects `enabled`.
- [ ] `onToggle` fires with the module key; toggling flips `aria-pressed`.
- [ ] `useModuleSelection` inits to the default set; `toggle` flips one key; `commit` resolves (no throw).
- [ ] all rendered labels (modules + groups) are `lintCopy`-clean.
