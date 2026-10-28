# Slice Map — fe-shell (CODEC #14)

> Entity Delivery Flow ② · Step 2 (Decomposition Gate). All slices `frontend`. Home: `apps/web/src/shell` (chrome)
> composing `@vida/ui` (one-way boundary; only non-component `packages/ui` config if forced — the ui-4 precedent).
> Drives from the LOCKED model `delivery/envision.md` M1–M7 + EC-1…EC-12. **No `@vida/core` change.** Reshapes the
> shipped ui-4/ux-3 shell into the dock⇄float inspector model; composes the shipped CODEC primitives, builds no new view.

## Scope line (what #14 builds vs delegates)

- **Builds:** the two-panel **dock⇄float** frame mechanism · Content region (`<Outlet/>` full-bleed, 1280-centered) ·
  Overlay host mount · the placement model/state · reserved top strip · responsive reflow.
- **Delegates (slots, not built here):** Bar 1 content (scope selector + 6 global surfaces) → **#15** · Session HUD →
  **#16** · ⌘K command/search registry → **#17**. #14 ships them as **empty-but-functional slots**.

## Slices (each: §XXVI double-gate + blocking Visual Gate; PR at S5)

| #      | Slice                                                                                                                                                                                                                                                                                                                                                                                                                                 | Home                                                                       | Covers (structural EC)               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| **S1** | **Placement model + shell state** — extend `regions.ts`/`breakpoints.ts` with `PanelId` (`system\|modules`), `PanelPlacement {mode:'dock'\|'float', edge:'left'\|'right'\|'top'\|'bottom', open}`, content-fit rules, reserved-top-strip metrics, panel `*At()` predicates; extend `app-shell-ui-store` with per-panel placement (app-owned, R5) + a `nav_preferences` `ProviderRead` **stub→default** (L5). Data/logic only, no JSX. | `shell/regions.ts`, `shell/breakpoints.ts`, `stores/app-shell-ui-store.ts` | EC-1, EC-4, EC-5, EC-9 (model layer) |
| **S2** | **Frame + Content + Overlay host + reserved strip** — reshape `AppShell`: persistent bar (serif wordmark · `System`/`Modules` toggles · ⌘K slot · HUD slot) · Content `<Outlet/>` **full-bleed**, 1280-centered + gutters · **Overlay host** mount (⌘K/modals, sheet↔centered) · **reserved top strip** inset · bounded viewport.                                                                                                     | `shell/app-shell.tsx`                                                      | EC-7, EC-8, EC-9 (frame)             |
| **S3** | **Docked panel (A)** — a `ShellPanel` rendered **inline flush** at its edge, **content-fit**, body **slot** + the **two-row header** (`▣ Dock\|⧉ Float` + `◧⬒◨⬓` edge picker, **contained — no overflow**); content sits **beside** it.                                                                                                                                                                                               | `shell/shell-panel.tsx` (new, apps/web)                                    | EC-1, EC-2, EC-4, EC-5 (docked)      |
| **S4** | **Floating panel (B)** — the same `ShellPanel` as an **overlay**: **scrim + Level-3 elevation**, edge-positioned, **dismiss** (Esc / click-scrim / re-toggle) + **focus-return** + motion (transform/opacity, reduced-motion).                                                                                                                                                                                                        | `shell/shell-panel.tsx`, `shell/app-shell.tsx`                             | EC-1, EC-3, EC-6 (+ EC-12 feel)      |
| **S5** | **Rearrange + dock-together + responsive + full gate** — wire edge/placement rearrange → store → `nav_prefs` stub; **dock-together** cluster; **375/768/1440 reflow** (content-fit → near-full sheet, no overflow); full **a11y + AA Visual Gate** (3 presets × light/dark); Verification Gate.                                                                                                                                       | `shell/*`, stories                                                         | EC-4 (dock-together), EC-9, EC-10    |

## Coverage check (every `structural` EC → ≥1 slice)

| EC                                                          | Slice(s)                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| EC-1 Dock⇄Float per panel                                   | S1 (model) · S3 (docked render) · S4 (floating render)                             |
| EC-2 Docked inline, content beside                          | S3                                                                                 |
| EC-3 Floating overlay (scrim + elevation)                   | S4                                                                                 |
| EC-4 Rearrange any edge + dock-together + contained control | S1 (model) · S3/S4 (edge render + contained header) · S5 (dock-together + persist) |
| EC-5 Content-fit                                            | S1 (rules) · S3/S4 (render)                                                        |
| EC-6 Dismiss + focus                                        | S4                                                                                 |
| EC-7 Reserved top strip                                     | S2                                                                                 |
| EC-8 Overlay host                                           | S2                                                                                 |
| EC-9 One responsive model, no overflow                      | S1 (bp model) · S2 (frame) · S5 (reflow + gate)                                    |
| EC-10 DS tokens + AA full-matrix                            | every slice's Visual Gate (S5 = full matrix)                                       |
| EC-11 preset identity _(feel)_                              | live Visual Gate (S2–S5)                                                           |
| EC-12 effect/motion _(feel)_                                | live Visual Gate (S4–S5)                                                           |

**Holds:** EC-1…EC-10 each map to ≥1 slice; EC-11/EC-12 `feel` defer to the live per-slice Visual Gate. No unhomed EC.

## Notes

- **rule-of-three:** `ShellPanel` has one consumer (the shell) → it stays in `apps/web/src/shell`, **not** a new `@vida/ui`
  component (ui-4 BR-1). It composes `@vida/ui` primitives (`Button`/`Menu`) + tokens.
- **No `@vida/core` / `@vida/types` change.** Placement types are local to `apps/web/src/shell` (the viewmodes
  `ViewLayout`-local precedent).
- **Deferred by design:** live `nav_preferences` persistence = first real consumer (L5 stub now); #15/#16/#17 contents.
