# fe-onboarding — S3 PLAN · Step 2 theme picker + live preview (EC-5)

**Unit:** fe-onboarding (LIF-216) · ② Frontend · M1.2.1 · slice S3 of 4.
**Covers:** EC-5 (THEME_PRESETS as selectable swatches; selection live-previews).
**Inputs:** slice-map §S3 · seam-contract Seam B · envision EC-5 · the S1 frame `renderStepBody` seam · fe-codec-theme (THEME_PRESETS/UIProvider/the body-class preset mechanism).

---

## Grounding (verified vs source)

- **Presets:** the shipped `THEME_PRESETS = ['reader','editorial','quietDesk']` + `ThemePreset` [FACT: packages/ui/src/theme-resolution.ts:30]. No new theme state — reuse fe-codec-theme.
- **Live preview is REAL in M1 (IR4):** selecting a preset drives the **app-owned** `UIProvider selection` lever. App.tsx passes a FIXED `THEME_DEFAULT` today [FACT: apps/web/src/App.tsx:72; the Zustand switcher store is deferred] — so the lever is INJECTED from above as `onPreview`; the flow's app-mount wires it to real app selection state at **S4**. `commit` is the deferred persist (M1 stub no-op).
- **Preset palette scope** [FACT: packages/ui/src/provider.tsx:124-131]: the preset rides a `<body class="t_<preset>">` DESCENDANT class; Tamagui emits its vars under `:root.t_<mode> .t_<preset>`. editorial = the bare scheme base (no class).

## Files (2 + test — all `apps/web/src/onboarding/`)

1. **`use-theme-selection.ts`** — `useThemeSelection({initial,onPreview})` → `{selected, preview, commit}`. `preview(p)` sets
   `selected` + fires `onPreview` (the live lever); `commit` = `Promise.resolve()` (honest stub, Seam B). Implements `ThemePersistWrite`.
2. **`theme-picker.tsx`** — `ThemePickerView` (PURE, state-as-prop: `{presets,selected,mode,onSelect}`) = a labelled group of
   `aria-pressed` swatch cards; `ThemePicker` (thin hook shell, `onPreview` lever) = the S1 `renderStepBody` mount. Each
   swatch shows a 4-token palette band (`PaletteBand`) + the preset label + a selected ring/✓.
3. **`theme-picker.test.tsx`** — jsdom + UIProvider; mirrors module-picker.test.tsx.

## The palette-band probe (the load-bearing mechanism — §XXVIII deviation, Visual-Gate-proven)

Showing all three presets' palettes AT ONCE while ONE is globally active cannot use nested `<Theme>`: the active
`:root.t_<mode> .t_<preset>` body-scope selector (specificity 0,3,0) out-specifies any in-tree wrapper → a non-active
preset's band leaks the active colors (measured: editorial band collapsed to the active preset). **Resolution:** a
throwaway probe (`resolvePresetPalette`) appends a `<div class="t_<preset>">` (editorial = bare) to `document.documentElement`
— OUTSIDE `<body>`, so the active body-preset never leaks — with cells styled `background-color: var(--colorSurface…)`;
`getComputedStyle` yields each preset's CONCRETE colors; the probe is removed. The `[[webgl-canvas-color-needs-getcomputedstyle-probe]]`
pattern — no hardcoded color. Run in a **POST-PAINT `useEffect`** keyed `[preset,mode]` (NOT `useMemo`): the provider applies
the html/body theme classes in its OWN layout effect, so a render-time read sees undefined vars → jsdom/SSR + first-paint
fall back to a neutral band, then the effect fills concrete colors. `mode` in deps re-resolves if the scheme flips.

## Visual Gate MUST (before S4)

swatches render (3) · each band DISTINCT per preset (proves the probe, not the active-theme ×3) · **live preview** —
selecting re-roots the whole surface (body/html theme class changes) · single-select (exactly one `aria-pressed`) · AA
(labels) + selected ring ≥3:1 · 375/768/1440 reflow. [DONE — PASS, 3 presets × L/D: distinct=3/3, label AA 13.0–15.7,
ring 5.93–7.31, live-preview class change + Reader pressed, 0 overflow.]

## Deferred (homed)

- Live-preview wiring into the REAL app selection (the app-owned setter) + cross-step persistence → **S4 app-mount**.
- `commit` live backing (theme-switcher store) → M1.1 (stub no-op now).
