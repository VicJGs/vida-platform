# @vida/ui — Changelog

All notable changes to the Vida shared component library. Follows [Keep a Changelog](https://keepachangelog.com/)
loosely; the package is `private` (workspace-internal), so versions track feature milestones, not npm releases.

## 0.2.0 — 2026-08-10

The **7 UI-2 platform views** (LIF-87) — the reusable cross-module display surfaces — built on `@tamagui/core` + the
UI-1 primitives + React 19. Each shipped through the §XXVI double-gate + a real-browser component Visual Gate (both
themes); the set cleared the consolidated UF gate (design · components · motion · engineering).

### Added — platform views

- **ListView** — the data-view SPINE: generic `items<T>` + `renderItem` + `getKey` + the four rendered terminal states
  (loading skeletons · empty · error · success) with a state-dependent container role (`list`/`status`). Pure
  presentational; `state` is a prop (the package→app boundary); local `ViewState` union (no cross-package edge).
- **GalleryView** — ListView's spine as a responsive flex-wrap grid: `minWidth` tile floor, grow to `[min, 2·min]`,
  wrap (single column at 375); aspect-locked skeleton tiles; gap-via-density.
- **Timeline** — the spine as a **continuous vertical rail** (dot + connecting line, density-as-content-padding;
  4-branch trim, lone item → no line) + an optional temporal label as real content.
- **CalendarView** — a `role="table"` **month grid** (always-42 cells, `date-fns`); **TZ-safe day-keying** (a
  `'YYYY-MM-DD'` string is the key as-is — no UTC round-trip); controlled month + opt-in nav; `maxPerDay` + "+K more";
  375 via horizontal scroll. Diverges from the spine (empty = the grid, not a message).
- **PomodoroWidget** — a drift-free countdown **timer widget** (ref-armed interval, one-way `onComplete` latch, single
  `setStatus` set-both, atomic phase-advance reset) with a **deferred session-engine seam** via lifecycle-intent
  callbacks (ADR-004/ADR-008). `role="timer"` + a polite completion announcement.
- **ExportDialog** — a presentational export modal composing UI-1 `Dialog` (via its `footer` + `description` props) +
  an APG `radiogroup` picker + `Button`; emits `onExport(format)` (serialization is the app's). `busy` → radios
  `tabIndex=-1` + Export `loading`; local `ExportFormat`.
- **NeuralGraph** — a **Sigma.js WebGL** force-directed graph. Content-keyed effect (`graphKey`, not array-refs — no
  per-render WebGL-context churn) + `sigma.kill()` lifecycle, WebGL-guarded (jsdom-safe). §XIV met **in V7** via a
  visually-hidden focusable node-`<button>` list (the accessible equivalent to the `aria-hidden` canvas).

### Added — shared

- **`internal/data-view`** — the shared data-view spine (`ViewState`, `Message`, `resolveDataViewState`,
  `warnMissingName`) extracted at V3 (rule of three); consumed by list/gallery/timeline (+ `warnMissingName` by
  calendar/neural-graph).

### Dependencies

- **date-fns** `^4.4.0` (calendar), **sigma** `3.0.3` + **graphology** `0.26.0` + **graphology-layout-forceatlas2**
  `0.10.1` (neural-graph). ⚠ Consuming apps should **lazy-load the graph route** (WebGL deps are heavy — §XIII budget).

### Tests

- 317 tests (219 UI-1 + 98 UI-2 across the 7 views + the shared spine). WebGL/timer lifecycles tested by mocking
  `sigma`/`forceatlas2` + `vi.useFakeTimers`; calendar TZ bucketing tested under `TZ=America/Sao_Paulo`.

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
