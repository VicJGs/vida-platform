# @vida/ui — Changelog

All notable changes to the Vida shared component library. Follows [Keep a Changelog](https://keepachangelog.com/)
loosely; the package is `private` (workspace-internal), so versions track feature milestones, not npm releases.

## 0.1.0 — 2026-08-09

First real content: the **10 UI-1 primitives** (LIF-86), built on `@tamagui/core` + React 19 against the DS-5
contracts (`docs/specs/components/ds-5-primitive-contracts/`). Each shipped through the §XXVI double-gate + a
real-browser component Visual Gate (both themes); the whole set cleared the consolidated UF gate (design ·
components · motion · engineering).

### Added — primitives
- **Button** — `render:'button'`; 4 intents; hover/press overlay opacity (B12); loading (spinner + `aria-busy`) / disabled.
- **Input** — frame + inner `render:'input'`; leading/trailing slots; `forwardRef<HTMLInputElement>`; `:focus-visible` via `.frame:has(...)`.
- **Checkbox** — native `<input>` + CSS pseudo-class state machine; tri-state `aria-checked="mixed"`.
- **Select** — `role=combobox` + portalled listbox; `aria-activedescendant`; flip-up + type-ahead; `zIndex.dropdown`.
- **Card** — slot composition (header/body/footer/actions); elevation = raised-shadow overlay opacity (self-cancels in dark).
- **Tabs** — roving tabindex + automatic activation; indicator `transform` animates while width resize is an instant swap; `Tabs.Panel` slots.
- **Menu** — WAI-ARIA menu-button; roving DOM focus; `cloneElement` trigger slot; 4 placements.
- **Dialog** — modal: focus **trap** + scrim + background `inert` + focus-return; `zIndex.overlay`/`modal`.
- **Popover** — non-modal `role=dialog`; axis-split 8 placements; arrow toward anchor; `zIndex.overlay`.
- **Toast** — the only **imperative** primitive: `toast(options)→id` via a module external store + `useSyncExternalStore`; `ToastProvider` with two live regions (status/polite · alert/assertive); store-enforced evict-oldest cap; `zIndex.toast`.

### Added — foundation
- Registered all 9 new `light_/dark_<Comp>` sub-themes in `tamagui.config.ts` (Button…Toast).
- `shadow.ts` typed export (elevation box-shadow literals for injected component CSS — DEF-U5-e).
- Per-primitive injected stylesheets in `internal/` for motion/state a Tamagui `styled()` can't express across a portal.

### Fixed (DS-wide, surfaced by the per-component Visual Gates)
- **DEF-U4-e** — `createFont` `lineHeight` ratio→px conversion at the Tamagui boundary (a font ratio was rendering a 1.5px line box that clipped every primitive's text).
- **DEF-U8-h** — dimension props (`borderRadius`/`space`) read the **token scale** (`$md`/`$lg`), not the inert component sub-theme key (was 0px square corners on every primitive).

### Notes
- The DS-2 palette (indigo/slate/emerald + Space Grotesk/Inter) is a **provisional placeholder** — the architecture is final; a brand pass swaps values only and re-runs the Visual Gate.
- Deferred contract gaps are tracked in `docs/specs/components/ui-1-vida-ui-primitives/DEF-register.md` (DEF-U3-a … U10-f) for the next DS-5 pass.
