# fe-onboarding — Step 2 DECOMPOSITION · seam-contract

The seams the guided-setup Flow consumes. All M1 stubs follow the **ProviderRead convention** (cold-start default now,
live read/write at first consumer — `shell-prefs.ts`/`spaces-scope.ts` precedent); zero call-site change on live swap.

---

## Seam A — Module-enablement write (deferred)
```ts
// use-module-selection.ts — the enable-set the user picks in Step 1.
export interface ModuleEnablementWrite {
  setEnabled(moduleKey: string, enabled: boolean): void   // M1 stub: in-memory only (no persist)
  commit(enabled: Record<string, boolean>): Promise<void> // M1 stub: resolves no-op; live = nav_preferences/feature-flags write
}
```
- **M1:** in-memory selection; `commit` is a stubbed no-op (honest — no "saved" claim, EC-7). Live backing = M1.1
  Preferences/feature-flags store [FACT: feature-flags.ts:4]. Default enable-set = all dock modules ON (today's behavior).
  ⚠ **S2 build-time check (gate-1 NIT):** `feature-flags.ts` fails *closed* (absent flag → OFF) but gates only
  `visibleWhen` conditional modules; the dock roster ships visible by default. S2 must confirm the picker's stubbed
  default matches the actual shipped dock-visibility so the preview doesn't lie.

## Seam B — Theme-persist write + live preview (deferred persist; live preview now)
```ts
// use-theme-selection.ts
export interface ThemePersistWrite {
  preview(preset: ThemePreset): void                      // live: app-owned UIProvider selection (works in M1, IR4)
  commit(preset: ThemePreset): Promise<void>              // M1 stub: no-op; live = the theme-switcher store
}
```
- **M1:** `preview` drives the app-owned `selection` (real, in-memory); `commit` stubbed. Live backing = the deferred
  switcher Zustand store [FACT: App.tsx:63]. Reuses `THEME_PRESETS`/`ThemePreset`/`UIProvider` (shipped, fe-codec-theme).

## Seam C — Reach registration (ReachabilityRegistry, shipped #2)
- Register the guided-setup entry under ≥2 paths: (1) post-first-run invitation, (2) the `EmptyState.guidedSetup` slot.
  Uses the shipped `ReachabilityRegistry` convention [FACT: fe-codec-patterns/seam-contract.md:86-89]. No new registry.

## Seam D — First-run handoff (shipped, reuse)
- The invitation surfaces AFTER the shipped first-run completes (`useFirstRun().markComplete` → app) OR as an optional
  branch on the `ready` step [FACT: use-first-run.ts]. fe-onboarding does NOT change the first-run gate/marker contract
  (two-signal independence preserved). The guided-setup flow is NOT a second mandatory boot gate (IR2).

## Consumed shipped primitives (no edit — BR-1)
- `@vida/ui`: `Button`, `Card`, `EmptyState` (+ its `guidedSetup` slot), `useReducedMotion`, `THEME_PRESETS`,
  `ThemePreset`, `UIProvider`. [FACT: packages/ui/src/index.ts]
- `apps/web` conventions (exact paths, verified): 8-state = `apps/web/src/state-conventions/interaction-state.ts` ·
  `FOCUS_CONTRACT`/`OVERLAY_DISMISS` = `state-conventions/keyboard.ts` · `ProviderRead` = `providers/provider-read.ts` ·
  `VOICE`/`lintCopy` = `voice/voice-copy.ts` · `ReachabilityRegistry` = `reach/reachability-registry.ts`.
- Local (new, fe-onboarding-owned): `StepRail` (left stepper), `guided-setup` shell, the pickers — Tamagui + tokens only.

## NOT consumed (grounded)
- `FlowSessionView` #11 — session-affordance misfit + layout mismatch (slice-map Scene-F resolution). Dep honored as
  build-order blocked-by.
