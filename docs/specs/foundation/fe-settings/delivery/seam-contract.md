# fe-settings — Seam Contract (Decomposition Gate · Step 2)

> The interfaces fe-settings consumes/exposes. All backend methods are SHIPPED on `mod-preferences` ①
> `[FACT: packages/core/src/services/preferences/service.ts:208]`. No new service method, no schema change.

## A. mod-preferences service (consumed via ProviderRead / React-Query)

```ts
// reads (useQuery({ queryFn })) — never touch tables directly (ProviderRead convention)
getMergedPreferences(): Promise<MergedPreferences>        // read-or-DEFAULT, never undefined (BR-P2)
getNavPreferences(): Promise<MergedNavPreferences>        // reduce_motion lives here
getModuleVisibility(): Promise<Record<string, boolean>>   // {} if unset

// writes (optimistic + revert-on-error, BR-P5) — partial patches, Zod-validated
updatePreferences(patch: Partial<MergedPreferences>): Promise<MergedPreferences>
updateNavPreferences(patch: Partial<MergedNavPreferences>): Promise<MergedNavPreferences>
setModuleVisibility(moduleKey: string, visible: boolean): Promise<void>   // throws InvalidModuleError on bad key (D3)
```

`MergedPreferences` = `Omit<UserPreferences, keyof SyncableEntity>` `[FACT: @vida/types entities/user.ts:195]`.
Malformed JSON falls back to default, never crashes `[FACT: business-rules.md:26]`.

## B. Control → preference field mapping (the build-phase storage resolution, R-2)

| Control | Field | Write call |
|---|---|---|
| Theme preset | `theme` is scheme only — **preset/density are app-store state** persisted alongside; preset has no dedicated column → carried in `dashboard_layout.theme` sub-key (open JSON) + the live store | `updatePreferences({ dashboard_layout })` + store |
| Mode (light/dark/system) | `user_preferences.theme` enum `[FACT: preferences.ts:45]` | `updatePreferences({ theme })` + store |
| Density (comfortable/compact) | `user_preferences.compact_mode` bool `[FACT: :47]` | `updatePreferences({ compact_mode })` + store |
| Reduce motion | `nav_preferences.reduce_motion` bool `[FACT: :100]` | `updateNavPreferences({ reduce_motion })` |
| Home arrangement | `dashboard_layout.arrangement` (`'journalFirst'｜'dashboardFirst'`) — `contract.md:39` homes Dashboard/Home → `dashboard_layout` | `updatePreferences({ dashboard_layout })` |
| Module show/hide | `module_visibility` map `[FACT: validators/user.ts:48]` | `setModuleVisibility(key, visible)` |
| Module rename | `dashboard_layout.moduleNames` (`Record<moduleKey,string>`) — open JSON (module_visibility is bool-only) | `updatePreferences({ dashboard_layout })` |
| Feature Atlas on/off | `module_visibility['features']` (surface show/hide) | `setModuleVisibility('features', on)` |
| Sync-log visibility | `module_visibility['sync']` | `setModuleVisibility('sync', on)` |
| Locale (date/time/week) | `date_format` · `time_format` · `week_starts_on` (existing) | `updatePreferences({…})` |
| Notifications | `notification_in_app/push/email` · `quiet_hours_*` (existing) | `updatePreferences({…})` |

> **⚠ HARD INVARIANT (gate-1 #2) — `dashboard_layout` writes are read-modify-write.** `updatePreferences` does a
> WHOLE-COLUMN replace (`JSON.stringify` of whatever object you pass, `[FACT: service.ts:159-161]`), so a naive
> `updatePreferences({ dashboard_layout: { arrangement } })` **WIPES** the sibling `theme`/`moduleNames` sub-keys.
> THREE controls share this one column across TWO slices (S3: `theme`, `arrangement`; S5: `moduleNames`). Every write
> MUST read the current `dashboard_layout` first, spread it, then patch (the `setModuleVisibility` precedent does exactly
> this for the sibling `module_visibility` map, `[FACT: service.ts:279-280]`). A tiny `patchDashboardLayout(patch)`
> helper (read-merge-write) is the single write path for both slices. **Visual-Gate MUST (S5):** change preset → rename
> a module → reload → the preset survives. The three sub-keys are an app-layer shape; a future ① amendment can promote
> any to a dedicated column with zero UI-signature change.

## C. App theme store (S2 — the EC-5 keystone, `apps/web`)

```ts
// a Zustand store the APP owns (AR-4: @vida/ui holds NO theme state)
interface ThemeStore {
  selection: ThemeSelection                 // { preset, mode, density } — feeds <UIProvider selection>
  setPreset(p: ThemePreset): void           // each setter: optimistic store update + persist (B) + revert on error
  setMode(m: ThemeMode): void
  setDensity(d: ThemeDensity): void
  hydrate(p: MergedPreferences): void        // cold-boot: map prefs → selection (fallback THEME_DEFAULT)
}
// App.tsx: <UIProvider selection={useThemeStore(s => s.selection)}>  // replaces selection={THEME_DEFAULT}
```
`ThemeSelection`/`ThemePreset`/`ThemeMode`/`ThemeDensity`/`THEME_DEFAULT` imported from `@vida/ui`
`[FACT: packages/ui/src/theme-resolution.ts:25]`.

**Home-arrangement read-seam activation (gate-1 #1 — S3 also owns this).** `useHomeArrangement()` is currently a
hardcoded `return 'journalFirst'` `[FACT: apps/web/src/home/home-surface.tsx:23]`, so the C4 WRITE is inert until the
READ is wired. fe-settings owns the consumer-activation of the pref it introduces (the S2 `App.tsx` rewire precedent):
S3 rewires `useHomeArrangement()` to read `getMergedPreferences().dashboard_layout?.arrangement` (fallback
`'journalFirst'`, via React-Query so Home re-renders on change). Without this the arrangement toggle persists but does
nothing — EC-4 "wired" would overstate. (A ~2-line touch in `home/home-surface.tsx`, the only fe-home file S3 edits.)

## D. `Switch` primitive contract (S1 — net-new `@vida/ui`, EC-3)

```ts
export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'|'onChange'|'checked'|'defaultChecked'|'type'> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void   // mirrors CheckboxProps
  disabled?: boolean
  size?: SwitchSize                               // 'md' default
  label?: ReactNode                               // associates natively; when omitted an aria-label is REQUIRED
  name?: string
  value?: string
}
```
- **APG `role="switch"`** (`aria-checked`), native `<input type="checkbox" role="switch">` wrapper (the Checkbox
  recipe `[FACT: packages/ui/src/components/checkbox.tsx:99]`) → keyboard/focus/label for free.
- Pill track + knob; **state machine off `:checked`/`:focus-visible`** via `internal/switch-styles.ts` (the
  checkbox-styles.ts precedent); on = `$colorBrandPrimary` track (preset-inheriting direct token).
- **Motion B12** — knob translate via transform only, reduced-motion `@media` (the DS convention).
- 8 states: off/on/hover/focus/active/disabled(off)/disabled(on)/invalid; Visual Gate 3 presets × light/dark.

## E. Reachability / route (EC-8)

- `/settings` — lazy route in `apps/web/src/routes.tsx` (BR-RT-8 `lazyRouteComponent`).
- Reached from the shell Bar-1 system panel AND ⌘K (registration is fe-cmdk/UI-4's; S3 only ensures the entry exists).
- **Escape hatch (gate-1 #3 — UI-enforced, NOT service):** `setModuleVisibility` validates only a non-empty key and
  will happily persist `module_visibility.preferences = false` `[FACT: service.ts:275]`; `business-rules.md:27` tags the
  rule `[INTERP: terminal/empty state]`. So S5 must EXCLUDE `preferences` (and `home`) from the hideable list IN THE
  SETTINGS UI — the service offers no guard. The hideable-module list is sourced from `apps/web/src/nav/module-map.ts`.
