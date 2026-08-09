# IMPLEMENTATION-PLAN — UX-3 Shell Layout + Responsive   (session: 2026-08-09-ux-3-shell-layout-responsive · language: English)
> Human gate 2: read to catch a wrong / missing / destructive step BEFORE code. Self-sufficient build prompt; each
> step cites the PLAN rule + the design.md standard it satisfies. Derived from the APPROVED PLAN Rev 4 (§6 Approval 1,
> 2026-08-09 — no open decisions; direction fully doc-determined). No step imports an unbuilt system; no step edits a
> DS-owned or another-issue's file. FULL variant — the `apps/web/src/shell/` artifact is code.

## 1. Full context
- **Deliverable (2 artifacts, dual home):** (1) a shell-layout **design doc**; (2) a declarative **layout model**
  code artifact. `[FACT: PLAN §2 IN.1/IN.2]`
- **What it is:** the shell frame's region composition + **the responsive reflow model** (dock drawer→rail→sidebar,
  global-bar condense, Spaces seam, content cap, overlay sheet→centered), applying **design.md §X/§IV/§V** for the
  breakpoints/containers/density/radius. `[FACT: PLAN §2a-g]`
- **The standard-application discipline (the whole point):** UX-3 does NOT invent widths/densities — it APPLIES
  design.md §X (breakpoints `375/768/1440/1920` mobile-first; containers 1280 + 16/24/32; touch 44×44), §IV (padding
  scale Compact/Default/Loose/Spacious), §V (modal `lg 12`/drawer `xl 16` radius; Level-3 elevation). The **region
  reflow model** (which region does what at each breakpoint) IS UX-3's novel design content — it is NOT in design.md.
  `[FACT: PLAN §2b-e; design.md §IV/§V/§X]`
- **The seam discipline:** three systems are UNBUILT — the render host (UI-4), the `@vida/ui`+`UIProvider`+`createMedia`
  wiring into apps/web (UI-4's seam), the Spaces-bar content (M1.1). The artifact encodes the breakpoint VALUES + the
  region model as **plain typed data** (no `@tamagui` import, no component) and exports a **reserved createMedia-shaped
  config** UI-4 will feed to Tamagui. Nothing here imports an unbuilt module. `[FACT: PLAN §1 constraint; baseline §3]`
- **Homes (VERIFIED):** doc → `docs/core/architecture/shell-layout.md` (sibling of information-architecture.md /
  command-bar-and-search.md); code → **`apps/web/src/shell/`** — a NEW non-component data dir, sibling of `nav/` and
  `command-bar/`, **NOT** under `components/` (UI-4's render dir) `[FACT: PLAN §2 IN.2; nav/CLAUDE.md "Data, not
  chrome"]`. **Issue Home = `apps/web/src` ONLY** → NO edit to `packages/ui` (D5) `[FACT: m1.0-delivery-plan.md:210]`.
- **Ground-truth floors:** design.md §IV/§V/§X values `[FACT: design.md:158-227]`; the 4pt token scale + z-scale
  `[FACT: tokens.ts:6-9]`; the store is NOT modified — the reserved shape is a typed contract UI-4 implements
  `[FACT: PLAN §2g; app-shell-ui-store.ts]`; **test env = `node` by default, tests are pure → NO jsdom pragma**
  `[FACT: apps/web/vite.config.ts:26-27]`; **no feature barrels** `[FACT: STANDARDS §XX; nav/ precedent]`.

## 2. Scope of changes
**Files touched (all NEW except the one doc-index row):**
1. `docs/core/architecture/shell-layout.md` — NEW doc (IN.1)
2. `docs/core/architecture/README.md` — EDIT: add one index row for the new doc
3. `apps/web/src/shell/breakpoints.ts` + `breakpoints.test.ts` — NEW
4. `apps/web/src/shell/regions.ts` + `regions.test.ts` — NEW
5. `apps/web/src/shell/CLAUDE.md` — NEW layer doc (ADR-018 §3.6)

**NOT done (table):**
| Not done | Why / owner |
|----------|-------------|
| Any rendered React component (dock, sidebar, top-bar, drawer, overlay host) | UI-4 renders the model `[PLAN §3]` |
| Edit `packages/ui/src/tamagui.config.ts` / add `media` / call `createMedia` | DS-4-owned + out of UX-3 Home; UI-4 wires the reserved config (D5) `[m1.0-delivery-plan.md:210]` |
| Modify `stores/app-shell-ui-store.ts` (add `isMobileNavOpen` etc.) | UI-4 extends the store; UX-3 only SPECIFIES the shape `[PLAN §2g]` |
| Wire `@vida/ui` / `UIProvider` into apps/web | UI-4's first step `[baseline §3.2]` |
| Import `MODULE_MAP` / re-list modules | the dock RENDERS it (UI-4); the layout model is orthogonal `[nav/CLAUDE.md]` |
| Build the Spaces bar content | Spaces module, M1.1 — region reserved only `[ia.md:44-47]` |
| Edit `routes.tsx` / register routes | AR-4 owns the tree `[web-runtime:88-89]` |
| A barrel `index.ts` in `shell/` | STANDARDS §XX — import specific files `[nav/ precedent]` |
| The screen/layout Visual Gate render (screenshots at 375/768/1440) | deferred to UI-4 (the renderer) `[FACT: frontend-visual-gate.md:45]` |

## 3. Exact changes

### 3.1 — `apps/web/src/shell/breakpoints.ts` (NEW) — satisfies PLAN §2b/d, applies design.md §X
The breakpoint + container SSOT. Plain data + types, NO `@tamagui` import:
- `export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'`.
- `export const BREAKPOINTS` — mobile-first **min-width** thresholds `[FACT: design.md §X:202-205]`:
  `{ mobile: { minWidth: 0 }, tablet: { minWidth: 768 }, desktop: { minWidth: 1440 }, wide: { minWidth: 1920 } } as const`.
  Doc-comment: `mobile` baseline design/test width = 375; `wide` = max-width containment only, not a distinct layout.
- `export const PRIMARY_TEST_WIDTHS = [375, 768, 1440] as const` — the 3 review widths `[FACT: design.md §X:213-214]`.
- `export const CONTENT_MAX_WIDTH = 1280` (centered) `[FACT: design.md §X:224]`.
- `export const SIDE_PADDING = { mobile: 16, tablet: 24, desktop: 32 } as const` `[FACT: design.md §X:225-227]`.
- `export const TOUCH_TARGET = { minSize: 44, minGap: 8 } as const` `[FACT: design.md §X:218-219]`.
- `export const PADDING_SCALE` — the §IV named density steps (v/h) `[FACT: design.md §IV:159-162]`:
  `{ compact: {v:8,h:12}, default: {v:12,h:16}, loose: {v:16,h:24}, spacious: {v:24,h:32} } as const`.
- `export function breakpointForWidth(width: number): Breakpoint` — pure: returns the largest breakpoint whose
  `minWidth <= width` (mobile-first resolution).
- `export const TAMAGUI_MEDIA` — the **reserved createMedia-shaped config** UI-4 passes to Tamagui (NOT called here):
  `{ mobile: {}, tablet: { minWidth: 768 }, desktop: { minWidth: 1440 }, wide: { minWidth: 1920 } } as const`.
  Doc-comment: "UI-4 registers this into `createMedia` when it wires `@vida/ui` into apps/web (the D5 seam)."
- **Test (pure, node):** `minWidth` strictly increasing across mobile→wide; `breakpointForWidth`: 375→mobile,
  767→mobile, 768→tablet, 1439→tablet, 1440→desktop, 1919→desktop, 1920→wide; `TAMAGUI_MEDIA` keys ≡ `BREAKPOINTS`
  keys and its minWidths match; container/padding constants equal the design.md numbers (guards accidental drift).

### 3.2 — `apps/web/src/shell/regions.ts` (NEW) — satisfies PLAN §2a/c/e/g (UX-3's novel design content)
The declarative region + reflow model. Imports ONLY `./breakpoints` (same dir):
- `export type ShellRegion = 'moduleDock' | 'globalBar' | 'spacesBar' | 'content' | 'overlayHost'`.
- `export type DockState = 'drawer' | 'rail' | 'sidebar'` · `export type OverlayMode = 'sheet' | 'centered'`.
- `export const DOCK_STATE: Record<Breakpoint, DockState>` = `{ mobile:'drawer', tablet:'rail', desktop:'sidebar', wide:'sidebar' }` `[PLAN §2b table]`.
- `export const OVERLAY_MODE: Record<Breakpoint, OverlayMode>` = `{ mobile:'sheet', tablet:'centered', desktop:'centered', wide:'centered' }` `[PLAN §2c]`.
- `export const REGION_VISIBILITY: Record<ShellRegion, Record<Breakpoint, boolean>>` — Spaces bar hidden at `mobile`,
  visible (reserved-empty) `tablet+`; all other regions visible at every breakpoint `[PLAN §2a/c]`.
- `export const GLOBAL_BAR_MODE: Record<Breakpoint, 'condensed' | 'full'>` = `{ mobile:'condensed', tablet:'full', desktop:'full', wide:'full' }` `[PLAN §2c]`.
- `export const LAYERING` — z-token + elevation refs (names, not numbers — resolved by the DS scale) `[FACT: tokens.ts:9]`:
  `{ stickyBars: '$sticky', overlayHost: '$overlay', modalHost: '$modal', overlayRadius: { modal: '$lg', drawer: '$xl' }, elevation: 'level-3' } as const` `[PLAN §2e; design.md §V]`.
- `export interface ShellUIStateContract` — the **reserved store shape UI-4 implements** (types only, no zustand):
  `{ isSidebarOpen: boolean; isMobileNavOpen: boolean }` + doc-comment "current breakpoint is read via Tamagui
  `useMedia()`, NOT stored; UI-4 extends `app-shell-ui-store` with these — UX-3 does not modify the store" `[PLAN §2g]`.
- Pure helpers: `dockStateAt(bp)`, `overlayModeAt(bp)`, `isRegionVisibleAt(region, bp)`, `contentGutterAt(bp)`
  (→ `SIDE_PADDING[bp==='wide'?'desktop':bp]`). **Content max-width is NOT a per-breakpoint helper** — the content
  region always carries `maxWidth: CONTENT_MAX_WIDTH` centered (a CSS no-op below 1280, capping above), per the
  GLOBAL design.md §X:224 rule; a per-bp toggle would be wrong because `tablet` (768–1439) and `desktop` (1440+)
  both cross/exceed 1280. `[preflight-fold F1]`
- **Test (pure, node):** dock drawer@mobile / rail@tablet / sidebar@desktop&wide; overlay sheet@mobile / centered
  else; Spaces hidden@mobile, visible@tablet+; global bar condensed@mobile, full else; `contentGutterAt` resolves
  16/24/32 (wide→32); `CONTENT_MAX_WIDTH === 1280` (global cap constant); every `ShellRegion` has an entry for every
  `Breakpoint` (exhaustiveness guard); `LAYERING` refs are the real token names — assert `stickyBars==='$sticky'`,
  `overlayHost==='$overlay'`, `modalHost==='$modal'`, `overlayRadius.modal==='$lg'`, `overlayRadius.drawer==='$xl'`,
  `elevation==='level-3'` (a wrong literal here is invisible to typecheck — the only drift-guard for these strings).

### 3.3 — `apps/web/src/shell/CLAUDE.md` (NEW layer doc — ADR-018 §3.6)
What lives here (breakpoint SSOT + region/reflow model + reserved createMedia config + reserved store contract, NOT
chrome). Rules: data-not-chrome (rendering is UI-4); **values APPLY design.md §X/§IV/§V — never invent/override**;
no `@tamagui` import (the createMedia config is plain data UI-4 wires); no store modification (UX-3 specifies the
shape); no `MODULE_MAP` import; no barrel; the D5 seam (UI-4 registers `TAMAGUI_MEDIA` into `createMedia`).

### 3.4 — `docs/core/architecture/shell-layout.md` (NEW doc — IN.1) — satisfies PLAN §2a-g
The layout model prose, sibling of the IA + command-bar docs. Sections:
- Intro + audience + governs + **Scope (what this is NOT)** — the UX-3 layout / UX-2 interaction / UI-4 render seam
  `[FACT: ia.md:16-18,153-154]`.
- **§1 Frame anatomy** — the 5 regions (module dock ⇒ **left sidebar**, the region `isSidebarOpen` governs; global
  bar; Spaces-bar seam; content `<Outlet/>`; overlay host) + each region's ownership boundary.
- **§2 Breakpoint model** — design.md §X applied (`375/768/1440/1920`, mobile-first, 3 primary test widths; `wide` =
  max-width cap) — cite the standard; the values live in `breakpoints.ts`.
- **§3 Per-region reflow** — the mobile-first table (dock drawer→rail→sidebar; global-bar condense; Spaces
  hidden→reserved; content gutters 16→24→32 with a GLOBAL 1280 centered max-width that caps once viewport ≥1280
  [desktop+], not a per-bp toggle — F1; overlay sheet→centered); each row keyed to a `regions.ts` export.
- **§4 Density & containers** — design.md §IV/§X (padding scale, 1280 centered, 16/24/32, touch 44×44); chrome uses
  Default/Loose, Compact reserved.
- **§5 Layering & elevation** — the `$zIndex` scale (sticky `$sticky`, overlay `$overlay`/`$modal`) + §V Level-3,
  modal `lg 12`/drawer `xl 16` radius, dark = border+bg.
- **§6 Motion** — dock collapse/drawer = transform/opacity only (B12), `motion.ts` `moderate`, reduced-motion instant.
- **§7 Shell UI state** — the reserved `ShellUIStateContract` (breakpoint via `useMedia`, not stored; UI-4 extends the store).
- **§8 The overlay host** — placement/geometry only (sheet@mobile / centered@tablet+, max-width, z, radius); ⌘K
  behavior is UX-2's, render is UI-4's.
- **§9 Consumption** — UI-4 renders the regions + registers `TAMAGUI_MEDIA` into `createMedia` (the seam); each
  M1.1+ surface renders inside this frame. References.

### 3.5 — `docs/core/architecture/README.md` (EDIT) — add one index row for `shell-layout.md`
Format: `| [shell-layout.md](shell-layout.md) | The shell frame layout + responsive model — 5 regions, breakpoints
(375/768/1440/1920, applied from design.md §X), per-region reflow, density, layering; the experience-track layout (UX-3) |`.

## 4. Build order & done-check
1. `breakpoints.ts`(+test) → 2. `regions.ts`(+test) → 3. `shell/CLAUDE.md` → 4. `shell-layout.md` doc + README row.
**Done = PLAN §4 acceptance:** typecheck + lint green; `pnpm --filter @vida/web test` green (new pure tests pass);
the breakpoint/container/density/radius values equal design.md §X/§IV/§V (guard tests); NO `@tamagui` import, NO
`packages/ui` edit, NO store edit, NO component; doc promoted to `docs/core/architecture/` + README row. Then →
`victor:quality-gate` (router → design/components; screen Visual Gate deferred to UI-4 per frontend-visual-gate.md:45)
→ commit/PR. Currency §XXIX: the doc IS the durable home (no separate current-* for a from-zero shell context).

## 5. Open UNKNOWNs
- none blocking. Sub-detail confirmed at build: `tablet` dock = `rail` (design detail within design.md's frame).
  The exact frecency-style scoring has no analog here — the region model is fully enumerated data, not a formula.
