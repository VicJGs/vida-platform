# PLAN — fe-shell S3 · Docked panel (A)

> Entity Delivery Flow ② · per-slice §XXVI gate (ratify-extended). The front matter (`interpretation.md` ·
> `envision.md` M1–M7 / EC-1…EC-12 · `slice-map.md` · `seam-contract.md`) is GATED+APPROVED; this PLAN refines the
> S3 row into a buildable spec + the `ShellPanel` contract. **No `@vida/core` / `@vida/types` change.** Home:
> `apps/web/src/shell`. Every claim [FACT: path:line] or labeled INTERPRETATION. No-Guessing Principle binds.

## §1. Context (ground truth)

- **Frame (S2, shipped):** `app-shell.tsx` is a bounded-viewport **column** — reserved top strip (`<header>`/banner,
  `reservedTopInset(bp)` 52/56) → full-bleed Content `<main>` (1280-centered + gutters, independent scroll) → overlay
  host. It reads the store `placement` + `togglePanel`; the **System/Modules toggles carry `aria-pressed`←`placement[id].open`**
  but open nothing yet. `[FACT: shell/app-shell.tsx:48-137]`
- **Model (S1, shipped):** `shell/regions.ts` — `PanelId`/`PanelMode`/`PanelEdge`/`PanelPlacement`/`ShellPlacement` ·
  `DEFAULT_PLACEMENT` (both closed, dock/left) · `PANEL_IDS` · `panelAxis(edge)` (L/R=vertical, T/B=horizontal) ·
  `isOverlay(p)` (float⇒overlay) · `reservedTopInset(bp)`. `[FACT: shell/regions.ts:116-163]`
- **Store (S1, shipped):** `app-shell-ui-store` — `placement` + `togglePanel`/`setPanelMode`/`setPanelEdge`/`setPlacement`
  (app-owned, ephemeral UI per BR-RT-6). `[FACT: stores/app-shell-ui-store.ts:42-46]`
- **Pattern (3 read):** shell chrome is presentational, reads the store, composes `@vida/ui` `Button`/`Menu` +
  `lucide-react`; state-as-prop (BR-2). Semantic landmark via `styled(View,{render:'<tag>'})`. One consumer ⇒ the
  component stays in `apps/web/src/shell`, NOT `@vida/ui` (ui-4 BR-1). `[FACT: shell/module-dock.tsx, shell/global-bar.tsx, shell/app-shell.tsx:19-20]`

## §2. What S3 builds (scope) + the one scope decision

S3 covers **EC-1 · EC-2 · EC-4 · EC-5 (docked)** `[FACT: slice-map.md:20,27-31]`.

1. **NEW `shell/shell-panel.tsx` — `ShellPanel` (docked render).** The seam-contract §B component, DOCKED mode only:
   inline-flush frame, content-fit body **slot** (`children`), + the **two-row contained header**
   (row 1: ⠿ grip + `title` + ✕ close · row 2: `▣ Dock | ⧉ Float` mode control + `◧ ⬒ ◨ ⬓` four-edge picker).
   `[FACT: seam-contract.md:24-40; envision.md EC-1/2/4/5]`
   **Edge control is LIVE in S3 (B3):** app-shell wires `onSetEdge`→`setPanelEdge` (the store action shipped in S1) so
   the docked panel actually appears at each edge — required to prove EC-4's "rearrangeable to any edge" **render** at
   the S3 gate (symmetric with the mode toggle, which BR-S3-7 wires live). \*\*S5 adds only the `nav_preferences` PERSIST
   - dock-together + full reflow** — so §7's "rearrange → S5" means *persist*, not *wiring*. `[FACT: slice-map.md:22,30; regions.ts; store:45]`
     **⠿ grip (N4):** a **decorative, `aria-hidden`\*\* affordance only — it signals repositionable (EC-12 `feel`); the
     rearrange MECHANISM is the edge-picker buttons (`onSetEdge`), NOT drag. No drag handler is wired in any slice.
2. **`app-shell.tsx` — docked composition (the scope decision, resolved from the docs).** For each **open + docked**
   panel, render `ShellPanel` **flush at its edge with Content beside it**. The region below the top strip becomes a
   flex row/column arranged per the panel's `panelAxis`: left ⇒ `[panel | content]`, right ⇒ `[content | panel]`,
   top ⇒ `[panel / content]`, bottom ⇒ `[content / panel]`.
   - **Why this is in S3, not deferred:** `slice-map.md:28` assigns **EC-2 "docked inline, content beside"** to S3, and
     envision **M2** requires content-beside — **provable only in the frame**. The S3 home column under-lists app-shell
     (S4 re-lists it for the _floating_ host); the docked composition is S3's by EC ownership. INTERPRETATION grounded
     in `slice-map.md:28` + `envision.md:44` — NOT manufactured scope, NOT a deferral to cut scope.

**Panel BODY in #14 = empty-but-functional slot (DEFERRED real bodies).** `envision L4`: "#14 ships the panels as
**empty-but-functional containers + slots**; Bar 1 content→#15, Session HUD→#16." `[FACT: envision.md:35-36]` So in
app-shell the docked `ShellPanel` body is a minimal **placeholder** (`system`/`modules` alike). The real bodies — the
grouped module nav + the #15 global surfaces — are the re-home follow-up ("`module-dock.tsx`/`global-bar.tsx` … re-homed
as panel bodies / #15 content in S3+" `[FACT: shell/CLAUDE.md]`), NOT S3. The Visual-Gate story passes a representative
stub body so **content-fit (EC-5) is provable**.

**Float-mode boundary.** S3 builds the DOCKED render. The `▣/⧉` control is PRESENT (EC-1) and emits `onSetMode('float')`,
but the floating **overlay render** (scrim + Level-3 elevation + dismiss/focus) is **S4** (EC-3/EC-6). In S3, app-shell
mounts only `mode==='dock' && open` panels; toggling a panel to Float sets state and the panel leaves the docked slot
until S4 wires the overlay. Documented interim, clean slice boundary `[FACT: slice-map.md:20-21]`.

## §3. `ShellPanel` contract (seam-contract §B, refined)

```ts
interface ShellPanelProps {
  id: PanelId // 'system' | 'modules'
  title: ReactNode // 'System' | 'Modules'
  placement: PanelPlacement // {mode,edge,open} from the store (BR-2 state-as-prop)
  children: ReactNode // the panel BODY slot (empty-but-functional in #14)
  onSetMode?: (m: PanelMode) => void // Dock ⇄ Float — intent only (R5/IR-5); undefined ⇒ control omitted
  onSetEdge?: (e: PanelEdge) => void // rearrange to an edge — intent only
  onClose?: () => void // ✕ / toggle-off — intent only
}
```

- **Docked** (`mode:'dock'`): inline flush, **no scrim, no elevation**; content beside (EC-2). `[FACT: seam-contract.md:36]`
- **Content-fit** (EC-5): sizes to `children` — **vertical stack on L/R, horizontal on T/B** via `panelAxis(edge)`;
  reaches the viewport edge only when content needs it (no forced full-span). `[FACT: envision.md:47; regions.ts:148-150]`
- **Two-row header, CONTAINED — no overflow** (EC-4/EC-7): the mode control + 4-edge picker sit in a tidy second row,
  never bleeding into content. Edge picker = 4 icon-only `Button`s (`aria-label` each), the active edge `aria-pressed`.
  Mode control = `▣ Dock` / `⧉ Float` two-state (active `aria-pressed`). `[FACT: envision.md:46,60; seam-contract.md:39]`
- **A11y:** the panel is a labeled landmark — `modules` ⇒ `<nav aria-label="Modules">`, `system` ⇒
  `<aside aria-label="System">` (INTERPRETATION: modules is navigation, system is complementary chrome). Header controls
  carry ARIA states; icon-only Buttons carry `aria-label` (Button dev-warns otherwise `[FACT: button.tsx:171-180]`).
  **Edge picker (N1):** 4 icon-only `Button`s using lucide `PanelLeft`/`PanelRight`/`PanelTop`/`PanelBottom` (the
  `module-dock.tsx` `PanelLeftClose/Open` precedent — same family, no improvised glyphs); active edge `aria-pressed`.
  **Docked ✕-close focus (N2):** closing a docked panel via ✕ returns focus to the originating bar toggle (§XIV focus
  management) so focus is never lost to `<body>` — app-shell passes a focusing `onClose`.
- **app-shell always passes the intents (N3):** `onSetMode`/`onSetEdge`/`onClose` are optional on the contract (other
  consumers), but app-shell **always** supplies them so the `▣/⧉` control + edge picker are present — EC-1 holds.
- **Bar-toggle upgrade (g2 S2 forward-note):** now a docked panel renders with a real id, upgrade the app-shell
  System/Modules toggles from `aria-pressed` → **`aria-expanded` + `aria-controls={panelDomId}`** (the toggle now
  controls a disclosed region). `[FACT: .claude/tasks/fe-shell.md:44]`

## §4. Business rules (BR-S3-n)

- **BR-S3-1** `ShellPanel` is presentational + state-as-prop; it emits intents, never touches the store/DB (BR-2/R5).
- **BR-S3-2** Docked = **no scrim, no elevation** (the calm grouped look); scrim/elevation are float-only (S4). [EC-2]
- **BR-S3-3** Content-fit: panel sizes to `children`; axis from `panelAxis(edge)`; never a forced full-span. [EC-5]
- **BR-S3-4** The two-row header is **contained** — zero overflow into content at every bp/edge. [EC-4/EC-7]
- **BR-S3-5** app-shell arranges `[panel|content]` per edge for every open+docked panel; **content keeps the 1280
  centered cap + gutters** within its remaining area. [EC-2/EC-9]
- **BR-S3-6** Every metric a DS token (spacing §IV · radius/elevation §V · a11y §XIV); no hex, no invented z/spacing. [EC-10]
- **BR-S3-7** ~~Float toggled in S3 ⇒ state set, docked slot vacated; overlay render deferred to S4.~~ **DEVIATION
  (§XXVIII, g2 S3 findings 1+2):** the live Float toggle created a reachable UX dead-end (floated panel unmounts; its
  only Dock/Float control went with it; the bar toggle flips only `open`) + a dishonest `aria-expanded="true"` on a
  toggle controlling nothing. **Revised:** Float is **DISABLED in S3** (overlay render = S4), so the ▣/⧉ control is still
  SHOWN (EC-1) but the float state is unreachable via the UI; and the bar toggle's `aria-expanded={dockedOpen}` reflects
  the actually-rendered region. S4 removes `disabled` + widens the disclosure when the float overlay renders.
- **BR-S3-8** Panel body in #14 = empty-but-functional slot; real nav/#15 bodies deferred (envision L4).
- **BR-S3-9** The below-strip region flips row↔column by edge; Content stays `flex={1} minWidth/minHeight={0}` and the
  panel is `flexGrow:0 flexShrink:0` (content-fit) — the RNW flex-collapse guard (B2). [EC-2/EC-9]
- **BR-S3-10** Docked-at-375 = panel beside a shrinking Content, **no horizontal overflow**; the mobile near-full-sheet
  collapse is S5 (B1). [EC-5/EC-9]
- **BR-S3-11** The edge picker is **live in S3** (`onSetEdge`→`setPanelEdge`, store from S1) so the docked panel renders
  at each edge; only PERSIST + dock-together + full reflow are S5 (B3). The ⠿ grip is decorative/`aria-hidden` — rearrange
  is via the picker buttons, never drag (N4). [EC-4]

## §5. Implementation order (types → states → dark → responsive → motion)

1. **Types** — `ShellPanelProps` (local to `shell/shell-panel.tsx`; imports `PanelId/PanelMode/PanelEdge/PanelPlacement`
   from `./regions`). No `@vida/types` edge (the ViewLayout-local precedent).
2. **`ShellPanel` docked render** — landmark frame (`styled(View,{render:'nav'|'aside'})`) + two-row header + body slot;
   content-fit via `panelAxis`. All 8 applicable visual states on the header controls (`Button` carries them).
3. **Dark mode** — direct semantic tokens (preset-inheriting); docked border = `$colorBorderDefault` (no shadow). Verify
   both modes in the gate.
4. **app-shell docked composition** — below-strip region → flex row/column per each open+docked panel's axis; Content
   beside; upgrade the bar toggles to `aria-expanded`/`aria-controls`.
   **⚠ RNW flex-collapse guard (B2):** this region flips between `flexDirection:row` (L/R edges) and `column` (T/B
   edges) — the exact trigger for the repo failure [[flex1-child-collapses-to-height-0-in-column-under-rnw]] (a
   Tamagui/RNW `flex:1` child collapses to height 0 under `flexDirection:column`, RNW default `minHeight:0`). The
   Content `<main>` MUST keep `flex={1} minHeight={0} minWidth={0}` and the panel must NOT grow — set the panel's
   `flexGrow:0 flexShrink:0` (content-fit) so Content owns the free space on BOTH axes. Diagnose at the live gate via
   `getBoundingClientRect`/`getComputedStyle` if a pane reads 0.
5. **Responsive — docked at 375 (B1, resolved):** the SAME component at **375/768/1440**. S3 pins the docked-at-375
   behavior: a content-fit docked panel renders beside Content with **Content shrinking** into the remaining area
   (`flex={1} minWidth/minHeight={0}`), and the S3 gate **proves no horizontal overflow at 375** for a single open
   docked panel per edge. The panel's content-fit min (row-2 header ≈ the mode control + 4-edge picker) is the floor;
   at 375 a left/right panel leaves a narrow-but-non-overflowing Content column (acceptable interim — the mobile
   **near-full-sheet** collapse + dock-together + the full-matrix reflow are **S5/EC-9**; S3 does NOT rearrange). This
   makes §6's 375 gate well-defined. [EC-5/EC-9 partial]
6. **Motion** — none required in S3 (dock/float + edge transitions animate transform/opacity in S4/S5, EC-12 `feel`).
7. **Tests** — `shell/shell-panel.test.tsx` (render per edge/mode, header controls emit intents, a11y roles/labels) +
   extend `shell/app-shell.test.tsx` (open+docked ⇒ panel mounts beside content; toggle `aria-expanded`/`aria-controls`).

## §6. Acceptance (§4 of the gate — the blocking Visual Gate musts)

tsc 0 · eslint 0 · `@vida/web` green · **blocking Visual Gate PASS** (Brave real app via onboarding→shell, 3 presets ×
light/dark × 375/768/1440):

- **EC-1** each panel shows the `▣/⧉` control; toggling reflects state.
- **EC-2** docked panel is flush at its edge with **Content beside it**, no scrim/elevation.
- **EC-4** the two-row header (mode + 4-edge picker) is **contained — no overflow** into content, at every edge.
- **EC-5** the panel **sizes to its content** (vertical L/R, horizontal T/B), not a forced full-span.
- **EC-10** every value a DS token; **text AA full-matrix incl. warm-dark** (greybox floor 4.52); axe 0.
- EC-11/EC-12 (`feel`) observed at the live gate.

## §7. Out of scope (homed)

Floating overlay render + scrim/elevation/dismiss/focus (**S4**) · edge-rearrange **PERSIST** to `nav_preferences` +
dock-together + full reflow + full-matrix gate + Verification (**S5** — the in-session edge _wiring_ IS S3, BR-S3-11) ·
real panel bodies (module nav / #15 global surfaces) + live `nav_preferences` (first-consumer follow-up) · PR (**at
S5**). `[FACT: slice-map.md:21-22,30,47]`
