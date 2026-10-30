# S1 — `Switch` primitive (@vida/ui) · slice spec

> Entity Delivery Flow ② · slice 1 (shared DS primitive). EC-3. Mirrors the shipped Checkbox recipe
> (`packages/ui/src/components/checkbox.tsx` + `internal/checkbox-styles.ts`). Direct semantic tokens (no sub-theme,
> the fe-codec-theme accent-fix direction). Blocking Visual Gate before S2.

## §1 Context

@vida/ui ships no Switch; the OS System specimen shows pill toggles (`p6-archetypes-design.html:301-302`). Settings
needs a binary on/off affordance for reduce-motion, module show/hide, Feature Atlas, sync-log, notification channels.

## §2 Business rules

- **BR-SW-1** A real `<input type="checkbox" role="switch">` (opacity:0, absolute-filling the track) carries
  role/keyboard(Space)/focus/form participation; a `<label>` wraps track+label so label-click toggles natively.
- **BR-SW-2** State visuals are pure CSS off the input's `:checked`/`:focus-visible` (injected `switch-styles.ts`) — **no
  re-render on toggle** (the Checkbox perf recipe). React sets nothing imperatively (no indeterminate — a switch is binary).
- **BR-SW-3** On = track `var(--colorBrandPrimary)` + knob slid right; off = track `$colorSurfaceSecondary` + `$colorBorderDefault`. Knob = `$colorSurfacePrimary`. Direct semantic tokens (preset-inheriting).
- **BR-SW-4** Knob travel is size-dependent → an inline `--vida-switch-travel` custom prop on the track; the injected
  `:checked` rule does `transform: translateX(var(--vida-switch-travel))` (the toast `--vida-toast-from` precedent).
- **BR-SW-5** Motion B12 — ONLY the knob `transform` transitions (fast/out); track color is an instant swap;
  reduced-motion `@media` drops the transition.
- **BR-SW-6** Hover (§VIII) — track border strengthens to `$colorTextMuted` on hover (the Card/Toast dark-border
  precedent; avoids an overflow-clipped overlay). Disabled → opacity 0.5, `not-allowed`, native `disabled` (off tab order).
- **BR-SW-7** Focus-visible → `outline:2px solid var(--colorFocusRing); outline-offset:2px` on the track.
- **BR-SW-8** An accessible name is REQUIRED — `label`, or `aria-label`/`aria-labelledby`; dev-warn otherwise (Checkbox guard).
- **BR-SW-9** `invalid` → danger border via a Tamagui variant (the Checkbox/Input precedent) + `aria-invalid`.

## §3 API (seam-contract §D)

`SwitchProps` = `Omit<InputHTMLAttributes, 'size'|'onChange'|'checked'|'defaultChecked'|'type'>` +
`checked?` · `defaultChecked?` · `onCheckedChange?(b)` · `disabled?` · `invalid?` · `size?: 'sm'|'md'|'lg'` ·
`label?: ReactNode` · `name?` · `value?`. Controlled when `checked !== undefined`.
Sizes: track 28×16 / 36×20 / 44×24; knob 12/16/20; travel 12/16/20.

## §4 Acceptance

- tsc 0 · eslint 0 · unit tests (controlled+uncontrolled toggle · onCheckedChange · disabled no-fire · a11y role=switch ·
  name-warn · label-click toggles) pass; @vida/ui suite green.
- **Visual Gate (blocking):** 3 presets × light/dark — off/on/hover/focus/disabled(off/on)/invalid; on-track flips per
  preset (editorial blue / reader oxblood / quietDesk olive); knob slides (reduced-motion: instant); AA on label;
  focus ring; 44×44 touch target (lg); axe 0.

## ✅ S1 DONE (2026-10-12)

tsc 0 · eslint clean · **switch 10/10 unit** · **Visual Gate PASS** (Brave, 3 presets × light/dark): ON-track flips
editorial `rgb(37,99,235)` / reader `rgb(178,55,51)` / quietDesk `rgb(95,110,62)` · knob slides 3→19px (16 travel) ·
off=secondary surface · focus ring `2px colorFocusRing` · disabled 0.5 · **invalid `rgb(239,68,68)`** (post-fix) · label
AA = `$colorTextPrimary` primary pairing (dark cells 18.8–20.3) · lg 44×24 · axe 0. **g2 code-review SHIP** (all nits).
**Gate-caught bug fixed:** `invalid` used `$borderError` (a sub-theme key, no `light_Switch` theme) → silent default
border; changed to `$colorSignalDanger` (direct token). tsc + 10 unit tests passed over it; only the Visual Gate exposed it.

## §5 Implementation

Files: `internal/switch-styles.ts` (injected CSS, `ensureSwitchStyles()`, idempotent/browser-only) ·
`components/switch.tsx` (SwitchRoot label · SwitchTrack · SwitchKnob · native input) · `components/switch.stories.tsx`
(Visual-Gate surface) · `components/switch.test.tsx` (jsdom) · barrel `export { Switch, type SwitchProps }`.
