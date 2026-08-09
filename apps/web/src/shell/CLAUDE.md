# apps/web/src/shell — Shell layout / responsive model layer

**Owning issue:** UX-3 Shell layout + responsive (LIF-92) · **Owning ADRs:** ADR-006/007 (Spaces/Views), ADR-018 §3.6 (layer-doc homes).
Authority: `standards/design.md §X/§IV/§V` (responsive · spacing · radius/elevation). Full model: `docs/core/architecture/shell-layout.md`.

## What lives here
The **declarative layout model** of the app shell — the breakpoint + container SSOT and the per-region reflow
behaviour. Central DATA/logic the UI-4 render host + each module's surface read against. No chrome.

- `breakpoints.ts` — `Breakpoint`, `BREAKPOINTS`, `BREAKPOINT_ORDER`, `PRIMARY_TEST_WIDTHS`, `CONTENT_MAX_WIDTH`,
  `SIDE_PADDING`, `TOUCH_TARGET`, `PADDING_SCALE`, `breakpointForWidth()`, `TAMAGUI_MEDIA` (the reserved createMedia seam).
- `regions.ts` — `ShellRegion`, `DockState`, `OverlayMode`, `DOCK_STATE`, `OVERLAY_MODE`, `GLOBAL_BAR_MODE`,
  `REGION_VISIBILITY`, `LAYERING`, `ShellUIStateContract`, the `*At()` predicates, `SHELL_REGIONS`.

## Rules (do not violate)
- **Data, not chrome.** No JSX, no components, no layout rendering. Rendering is UI-4 (LIF-89); this is the model it reads.
- **Apply the standard, never invent.** Breakpoints (`375/768/1440/1920`), containers (1280 centered, 16/24/32),
  touch targets (44×44), padding scale, overlay radius/elevation all come from `design.md §X/§IV/§V`. Do NOT introduce
  a value the standard doesn't set; the **region reflow model** (drawer→rail→sidebar, sheet→centered, Spaces seam) IS
  this layer's own design and is the one thing not in the standard.
- **No `@tamagui` import.** `TAMAGUI_MEDIA` is plain data in the `createMedia` shape. UI-4 registers it into
  `createMedia` when it wires `@vida/ui` into apps/web (the D5 seam) — editing `packages/ui/tamagui.config.ts` is UI-4's,
  out of UX-3's `apps/web/src` Home.
- **Do not modify the store.** `ShellUIStateContract` is the reserved shape (`isSidebarOpen`, `isMobileNavOpen`) UI-4
  implements on `stores/app-shell-ui-store.ts`. The current breakpoint is read via `useMedia()`, never stored.
- **No `MODULE_MAP` import.** The dock RENDERS `nav/module-map.ts` (UI-4's concern); this layout model is orthogonal.
- **No barrel** (`index.ts`) — import specific files (STANDARDS §XX).
- **Mobile-first.** Every rule is base→up; `mobile` is the baseline, larger widths enhance; `wide` is a max-width cap.
