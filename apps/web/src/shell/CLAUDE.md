# apps/web/src/shell — Shell layout model (UX-3) + app-shell chrome (UI-4)

**Owning issues:** UX-3 Shell layout + responsive (LIF-92) — the MODEL · UI-4 App shell components (LIF-89) — the
CHROME. **Owning ADRs:** ADR-006/007 (Spaces/Views), ADR-018 §3.6 (layer-doc homes).
Authority: `standards/design.md §X/§IV/§V` (responsive · spacing · radius/elevation) + §XIV (a11y). Full model:
`docs/core/architecture/shell-layout.md` · nav model: `information-architecture.md`.

## What lives here
Two concerns coexist: the UX-3 **layout model** (data) and the UI-4 **chrome** (the React components that render it).

**Model (UX-3 — data/logic only, no JSX):**
- `breakpoints.ts` — `Breakpoint`, `BREAKPOINTS`, `BREAKPOINT_ORDER`, `PRIMARY_TEST_WIDTHS`, `CONTENT_MAX_WIDTH`,
  `SIDE_PADDING`, `TOUCH_TARGET`, `PADDING_SCALE`, `breakpointForWidth()`, `TAMAGUI_MEDIA` (the reserved createMedia seam).
- `regions.ts` — `ShellRegion`, `DockState`, `OverlayMode`, `DOCK_STATE`, `OVERLAY_MODE`, `GLOBAL_BAR_MODE`,
  `REGION_VISIBILITY`, `LAYERING`, `ShellUIStateContract`, the `*At()` predicates, `SHELL_REGIONS`.

**Chrome (UI-4 — the rendered app shell):**
- `app-shell.tsx` (S1) — the `AppShell` frame: 5 regions in the responsive layout, `useMedia()` breakpoint resolution,
  the bounded-viewport frame (`height:100vh`+`overflow:hidden`; dock & content scroll independently), the mobile
  drawer's open-transform + scrim. Mounted in `routes.tsx` `RootComponent` wrapping `<Outlet/>`.
- `module-dock.tsx` (S2) — the dock content: `MODULE_MAP` grouped, drawer/rail/sidebar forms, empty-group skip,
  collapse toggle. `global-bar.tsx` (S2) — `GLOBAL_SURFACES` condensed/full + ⌘K→`commandBar.open()` + overflow Menu.
- `nav-link.tsx` (S2) — a `createLink`-styled SPA anchor (one `ShellRoute` widening + `shellNavigate`; exact
  `aria-current`; `currentColor` icon tint). `nav-icons.ts` — key→`lucide-react` glyph (+ fallback).
  `feature-flags.ts` — `isFeatureEnabled` (M1.0 fail-closed stub). `use-nav-drawer.ts` — drawer focus/Esc/`inert`.
- `test-router.tsx` — test-only memory-router render helper (not shipped).

## Rules (do not violate)
- **The MODEL files (`breakpoints.ts`, `regions.ts`) are data, not chrome.** No JSX, no components. The CHROME files
  render them. Do not import `@tamagui`/JSX into the model files; do not put layout constants the model owns into the chrome.
- **Chrome composes UI-1, never rebuilds it.** The shell adds NO `@vida/ui` component (rule-of-three unmet — one
  consumer); it composes UI-1 primitives (`Button`/`Menu`/…) + `lucide-react` icons. Icon LIBRARY is ADR-001-fixed
  (`lucide-react` web); the icon MAP is rendering data. Every value is a DS token (no hex, no invented z/spacing).
- **Nav degrades, never crashes.** Links target `routePath` via TanStack `to` (SPA) — never `href` (reload);
  unregistered routes render `NotFoundComponent` (BR-4). The `ShellRoute` widening is confined to `nav-link.tsx`.
- **Apply the standard, never invent.** Breakpoints (`375/768/1440/1920`), containers (1280 centered, 16/24/32),
  touch targets (44×44), padding scale, overlay radius/elevation all come from `design.md §X/§IV/§V`. Do NOT introduce
  a value the standard doesn't set; the **region reflow model** (drawer→rail→sidebar, sheet→centered, Spaces seam) IS
  this layer's own design and is the one thing not in the standard.
- **No `@tamagui` import.** `TAMAGUI_MEDIA` is plain data in the `createMedia` shape. UI-4 registers it into
  `createMedia` when it wires `@vida/ui` into apps/web (the D5 seam) — editing `packages/ui/tamagui.config.ts` is UI-4's,
  out of UX-3's `apps/web/src` Home.
- **Store: the MODEL only reserves the shape; the CHROME consumes it.** `ShellUIStateContract` (`isSidebarOpen`,
  `isMobileNavOpen`) lives on `stores/app-shell-ui-store.ts`; the chrome reads/toggles it, the model never touches it.
  The current breakpoint is read via `useMedia()`, never stored.
- **`MODULE_MAP` import: the CHROME renders it (dock/global bar); the MODEL must not** — the layout model is
  orthogonal to the nav data. `module-dock.tsx`/`global-bar.tsx` are the renderers.
- **No barrel** (`index.ts`) — import specific files (STANDARDS §XX).
- **Mobile-first.** Every rule is base→up; `mobile` is the baseline, larger widths enhance; `wide` is a max-width cap.
