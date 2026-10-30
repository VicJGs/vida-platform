# Shell Layout & Responsive Model

How the Vida web app's shell frame is composed and how it reflows across screen widths: the persistent regions, the
breakpoints, the per-region responsive behaviour, and the density that keeps it livable all day. This is the
**experience-track layout** (UX-3, LIF-92) — it builds on the navigation model (UX-1) and the command-bar interaction
(UX-2), and is **implemented as app-shell components by UI-4**.

**Audience:** All developers and agents building any web surface. Read after `information-architecture.md`.

**Governs:** the shell frame's region layout + responsive reflow + density. The code artifact is
`apps/web/src/shell/{breakpoints.ts, regions.ts}` (central data; not chrome). Rendering is owned by UI-4.

**Content Source:** `standards/design.md §X` (breakpoints, containers, touch targets), `§IV` (spacing/density scale),
`§V` (radius/elevation) — the authority · `information-architecture.md §5` (the
reserved regions) · the DS token scales (`packages/ui/src/themes/tokens.ts`).

> **Scope (what this is NOT):** not the shell _components_ — dock/sidebar/top-bar/command-bar/modal host (UI-4); not
> the command-bar + search _interaction_ (UX-2 — this doc owns only the overlay host's _placement_); not the nav/module
> data (UX-1's `module-map.ts`); not the Spaces-bar _content_ (Spaces module, M1.1 — the region is reserved here); not
> wiring `@vida/ui`/`UIProvider`/`createMedia` into apps/web (UI-4's first step); not client-state _conventions_ (UX-4);
> not the native mobile shell (@vida/mobile). This doc DESIGNS the layout + responsive model and reserves the shape;
> the surfaces are built by UI-4.

---

## 1. The shell frame — anatomy

The shell composes five persistent regions around the routed content:

| Region           | What it is                                                                                                                    | Ownership boundary                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Module dock**  | primary navigation — rendered as a **left sidebar** on desktop; **the region `isSidebarOpen` governs**. Renders `MODULE_MAP`. | layout here · renders UX-1 data · chrome by UI-4          |
| **Global bar**   | the always-present bar hosting the 6 global surfaces (Home, Calendar, ⌘K search, Notifications, Settings, Graph)              | layout here · chrome by UI-4                              |
| **Spaces bar**   | the cross-cutting nav axis — a **reserved region** (empty in M1.0; content in M1.1)                                           | region reserved here · content by Spaces (M1.1)           |
| **Content**      | the router `<Outlet/>` — where each module's surface renders                                                                  | layout here · surfaces by each module (M1.1+)             |
| **Overlay host** | the layer the ⌘K command bar + modals/dialogs mount into                                                                      | **placement** here · interaction by UX-2 · render by UI-4 |

The code model: `apps/web/src/shell/regions.ts` (`ShellRegion`, `REGION_VISIBILITY`, `SHELL_REGIONS`).

---

## 2. Breakpoint model

The shell reflows on the **standard's** breakpoints — a **mobile-first** min-width ladder `[design.md §X]`:

```
mobile:   baseline (min 0)  — design/test reference width 375
tablet:   ≥ 768px           — md:
desktop:  ≥ 1440px          — lg:/xl:
wide:     ≥ 1920px          — 2xl:, max-width containment ONLY (not a distinct layout state)
```

Every layout is **mobile-first**: `mobile` is the baseline, larger widths are enhancements — never designed
desktop-first and compressed. The **three primary widths reviewed/tested at are 375 / 768 / 1440** `[design.md §X]`.
The values live in `apps/web/src/shell/breakpoints.ts` (`BREAKPOINTS`, `PRIMARY_TEST_WIDTHS`, `breakpointForWidth()`).

---

## 3. Per-region reflow (mobile-first)

Written base → up (each larger breakpoint enhances the one before):

| Region           | `mobile` (base)                             | `tablet` (≥768)         | `desktop` (≥1440)                              | `wide` (≥1920)   |
| ---------------- | ------------------------------------------- | ----------------------- | ---------------------------------------------- | ---------------- |
| **Module dock**  | off-canvas **drawer** (`isMobileNavOpen`)   | collapsed **icon rail** | full **sidebar** (icon+label, `isSidebarOpen`) | full sidebar     |
| **Global bar**   | **condensed** (⌘K → search icon + overflow) | full                    | full                                           | full             |
| **Spaces bar**   | hidden                                      | reserved (empty)        | reserved (empty)                               | reserved (empty) |
| **Content**      | single column, 16px gutters                 | 24px gutters            | 32px gutters                                   | 32px gutters     |
| **Overlay host** | full-screen **sheet**                       | centered overlay        | centered overlay                               | centered overlay |

**Content max-width is a GLOBAL rule**, not a per-breakpoint toggle: content is always `max-width: 1280px` centered
`[design.md §X]` — a no-op below 1280, capping once the viewport crosses it (desktop and wide). Every interactive
region honors **≥44×44px touch targets with ≥8px gaps at all widths** `[design.md §X]`. Each row is keyed to a
`regions.ts` export (`DOCK_STATE`, `GLOBAL_BAR_MODE`, `REGION_VISIBILITY`, `contentGutterAt`, `OVERLAY_MODE`).

---

## 4. Density & containers

All metrics come from `design.md §IV/§X` — the shell invents no spacing values; every value is a DS-2 4pt-grid token,
each pinned to the correct scale (dimensions → `$size`, gaps/padding → `$space`):

- **Container:** content **max-width 1280px, centered**; side padding **16 / 24 / 32** (mobile/tablet/desktop);
  **content vertical inset 24 / 32 / 40** (top+bottom breathing room below the reserved top strip — a shell-owned
  constant, design.md §X specifies only the horizontal gutter; decided 2026-10-15).
- **Region padding** uses the named §IV scale — **Compact 8/12 · Default 12/16 · Loose 16/24 · Spacious 24/32** (v/h).
  M1.0 chrome uses **Default/Loose**; **Compact** is the reserved denser variant (a seam, not built).
- **Touch targets:** every dock item / global-bar action / drawer trigger ≥ **44×44px**, ≥ **8px** apart, at all widths.

Code: `breakpoints.ts` (`CONTENT_MAX_WIDTH`, `SIDE_PADDING`, `CONTENT_V_INSET`, `TOUCH_TARGET`, `PADDING_SCALE`);
`regions.ts` (`contentGutterAt`, `contentVInsetAt`).

---

## 5. Layering & elevation

The frame composes against the existing named z-scale — **the shell invents no z-values**:

```
base 0 · dropdown 1000 · sticky 1100 · overlay 1200 · modal 1300 · toast 1400   [tokens.ts:9]
```

Sticky bars (global bar, dock) sit at `$sticky`; the overlay host at `$overlay`, the modal host at `$modal` — above
the shell chrome and correctly under `$toast`. Elevation follows the 3-level standard `[design.md §V]`: the overlay/
modal host is **Level 3**; overlay radii are **modal `$lg` (12px)**, **drawer `$xl` (16px)**. In dark mode, shadow is
replaced by a subtle border + background elevation `[design.md §V]`. Code: `regions.ts` (`LAYERING`), consistent with
UI-1's Dialog/Popover/Menu/Toast layering.

---

## 6. Motion

Shell transitions animate **transform/opacity only** (B12) — the dock collapse/expand and the mobile drawer slide use
the DS-3 `moderate` duration from `motion.ts`; `prefers-reduced-motion: reduce` → instant (no transition). No shell
transition animates color, background, size, or shadow.

---

## 7. Shell UI state (reserved)

The responsive frame needs ephemeral UI state, held in `stores/app-shell-ui-store.ts` (Zustand, UI-only — BR-RT-6,
never entity data or persisted prefs). UX-3 reserves the shape; **UI-4 extends the store** (UX-3 does not modify it):

```ts
interface ShellUIStateContract {
  isSidebarOpen: boolean // full sidebar (desktop) expanded vs collapsed — the existing field
  isMobileNavOpen: boolean // the mobile off-canvas dock drawer
}
```

The **current breakpoint is read reactively via Tamagui `useMedia()`, NOT stored** — `useMedia()` returns usable keys
once UI-4 registers the breakpoints into `createMedia` (see §9). Code: `regions.ts` (`ShellUIStateContract`).

---

## 8. The overlay host (placement)

UX-3 owns the overlay/modal host's **placement & geometry only** — its _interaction_ is UX-2's (⌘K behavior) and its
_render_ is UI-4's:

- **mobile** → a full-screen **sheet**; **tablet+** → a **centered overlay** with a max-width, offset from the top.
- z-layer `$overlay` (scrim/command bar) / `$modal` (dialogs); radius modal `$lg` / drawer `$xl`; Level-3 elevation.
- It hosts the ⌘K command bar (UX-2's model) and app dialogs; it never defines their behavior.

Code: `regions.ts` (`OVERLAY_MODE`, `LAYERING`).

---

## 9. Consumption

- **UI-4** (app shell) renders the five regions per this model, and **registers `TAMAGUI_MEDIA` into `createMedia`**
  when it wires `@vida/ui` + the `UIProvider` into apps/web — the responsive seam (`useMedia()` becomes live then).
- **UI-4** extends `app-shell-ui-store` with the `ShellUIStateContract` fields.
- **Each M1.1+ module** renders its surface inside the content region; the frame is inherited, not re-designed.
- **Spaces (M1.1)** activates the reserved Spaces-bar region.

---

## References

- `information-architecture.md §5` — the regions this layout composes
- `standards/design.md §X` (responsive), `§IV` (spacing), `§V` (radius/elevation) — the authority
- `apps/web/src/shell/{breakpoints.ts, regions.ts}` — the canonical layout model (code)
- `apps/web/src/shell/CLAUDE.md` — the layer's rules
