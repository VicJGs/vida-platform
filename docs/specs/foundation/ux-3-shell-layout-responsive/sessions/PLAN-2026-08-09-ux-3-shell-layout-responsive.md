# PLAN — UX-3 Shell Layout + Responsive   (session: 2026-08-09-ux-3-shell-layout-responsive · language: English)
> Systems-analyst executive summary: read to approve the DIRECTION (Approval 1). Two audiences — the client
> understands what/why; the developer absorbs enough to build it. No build detail. No-Guessing: every claim is
> [FACT: src] / [INTERP: from fact] / [UNKNOWN: needs X].
> Class: **design/spec issue** (dep-graph) that ALSO emits a declarative code artifact (the UX-1/UX-2 precedent) →
> §XXVI **FULL** gate `[FACT: baseline §5; reconstructed-structure.md:80]`. Profile: **add-frontend-component
> (design-led)**, authority **design.md (responsive)** `[FACT: m1.0-delivery-plan.md:210]`; gate at close =
> `quality-gate-design/-components`. Grounding: [`baseline.md`](../baseline.md).
> **Rev 4** — two drift-catches (Victor). Rev 1/2 (under mislabeled `Generic` profile) invented a breakpoint set
> contradicting design.md §X → Rev 3 aligned D1/D3/D4 to the standard. Rev 4: D2 + D5 were ALSO manufactured forks —
> the two-sibling deliverable pattern (UX-1/UX-2 = doc+artifact) + the issue's `apps/web/src`-only Home already fix
> them. **Net result: the direction is fully determined by the docs — NO open decisions remain** (see §6). UX-3
> *applies* design.md §X/§IV/§V + the IA scope boundary + the sibling pattern; it invents nothing.

## 1. Context & demand
The Vida web app has no real frame yet. `apps/web/src/routes.tsx` renders an explicit **placeholder** — a bare
`<nav>` + `<Outlet/>` marked *"Minimal shell only — the real app layout/IA is UX-3 / UI-4"* `[FACT: routes.tsx:22-31]`.
UX-1 reserved *what* surfaces exist (module dock, Spaces bar, global bar) and handed their **layout** to UX-3
`[FACT: ia.md:153]` and their **rendering** to UI-4 `[FACT: ia.md:10; web-runtime:101]`. UX-3 is the layer that
decides how those regions **compose into one frame** and how that frame **reflows** from a phone-width browser to a
wide desktop, at a **density** that stays livable across an all-day session.

**Why now, why once:** the shell is the container every module renders inside. Without a fixed layout + responsive
model, each module's M1.1+ wave would invent its own frame assumptions and the app would fragment (the v1 failure
pattern — `[FACT: [[v1-failure-lessons]]]`). UX-3 sets the frame model ONCE; UI-4 builds it; every module inherits it.

**The defining constraint** `[FACT: baseline §3]`: the systems the frame *appears* to need are unbuilt — the
rendering host (UI-4), the `@vida/ui`+`UIProvider` wiring into apps/web (UI-4's seam), and the Spaces-bar content
(M1.1). The breakpoint system is **not wired** — DS-4's `tamagui.config.ts` composes `{tokens, themes, animations}`
with **no `media` key** `[FACT: tamagui.config.ts:80-107]` — **but the breakpoint VALUES are already fixed by the
standard** `[FACT: design.md §X]` (375/768/1440/1920, mobile-first). So UX-3 does NOT invent the responsive system;
it **applies design.md §X to the shell regions** + expresses it in the Tamagui mechanism, as a **layout model +
typed layout contract** designed *against* the unbuilt systems without *coding against* them. Same class as UX-1
(`module-map.ts` + IA doc) and UX-2 (`command-bar/` contract + interaction doc).

## 2. What changes and why (the deliverables)
UX-3's home is **dual** (design doc + declarative artifact), mirroring UX-1/UX-2 `[INTERP: baseline §5]`:

### IN.1 — Shell-layout design doc → `docs/core/architecture/shell-layout.md`
A sibling of `information-architecture.md` / `command-bar-and-search.md`. It specifies:

**(a) The shell frame anatomy — the persistent regions.** One frame composing:
- **Module dock** (primary nav) — rendered as a **left sidebar** on wide widths; **this is the region the existing
  `app-shell-ui-store.isSidebarOpen` governs** `[FACT: app-shell-ui-store.ts; command-bar registry seed "Toggle
  sidebar"]` (the dock ⇒ the collapsible left sidebar; UX-3 states this mapping explicitly to close the
  dock-vs-sidebar ambiguity). Reads `MODULE_MAP` — never re-lists modules `[FACT: nav/CLAUDE.md]`.
- **Global bar** — the always-present top bar hosting the 6 global surfaces (Home, Calendar, ⌘K search entry,
  Notifications, Settings, Graph) `[FACT: ia.md:98-107]`.
- **Spaces bar** — a **reserved region** (the cross-cutting axis); empty seam in M1.0, content lands M1.1
  `[FACT: ia.md:44-47]`.
- **Content region** — the router `<Outlet/>` `[FACT: routes.tsx]`.
- **Overlay host** — the layer the ⌘K command bar + modals/dialogs mount into (placement only; interaction is
  UX-2's, render is UI-4's).

**(b) The breakpoint model (D1) — APPLIES design.md §X, does not invent.** The named breakpoints are the
**standard's**, mobile-first min-width ladder `[FACT: design.md §X:201-214]`:
| Name | Threshold | Role | Shell reflow (mobile-first — base is `mobile`, larger widths enhance) |
|------|-----------|------|----------------------------------------------------------------------|
| `mobile` | base `<768` | baseline (mobile-first) | single column; dock = **drawer/bottom-nav** (off-canvas via `isMobileNavOpen`); global bar condensed (⌘K → search icon + overflow); overlay host = **full-screen sheet** |
| `tablet` | `≥768` (`md`) | enhancement | dock = **icon rail** (collapsed, no labels; 44×44 targets); content beside rail; overlay host = **centered overlay** |
| `desktop` | `≥1440` (`lg`) | enhancement | dock = **full sidebar** (icon+label, `isSidebarOpen`); Spaces-bar region visible |
| `wide` | `≥1920` (`2xl`) | **max-width containment only** `[FACT: design.md §X:205]` | not a distinct layout state — only enforces the content **max-width cap** |
**3 primary breakpoints to review/test at: 375 / 768 / 1440** `[FACT: design.md §X:211-214]`. Mobile-first is
mandated ("Desktop is an enhancement… never design desktop first and compress" `[FACT: design.md §X:208-209]`) — the
region rules above are written base→up. `[INTERP]` The dock's three distinct states (drawer/rail/full sidebar) map
onto the three primary breakpoints; `wide` is a cap, not a fourth layout.

**(c) Per-region reflow (mobile-first — the §2(b) table is the source; this is the prose companion).** Written
base→up: `mobile` is the baseline (dock=drawer, global bar condensed, single-column content full-bleed with 16px
gutters, overlay=sheet); `tablet` (≥768) enhances (dock=rail, 24px gutters, overlay=centered); `desktop` (≥1440)
enhances (dock=full sidebar, 32px gutters, Spaces-bar region shown); `wide` (≥1920) only caps content at 1280
centered. Every interactive region honors **44×44 touch targets at all widths** `[FACT: design.md §X:216]`.
Reduced-motion + full keyboard reachability preserved at every width `[FACT: engineering §XIV; STANDARDS §XXII]`.

**(d) Density & containers (D3) — APPLIES design.md §IV/§X.** No invented values:
- **Container** `[FACT: design.md §X:222-227]`: content **max-width 1280px, centered**; side padding **16 (mobile) /
  24 (tablet) / 32 (desktop)**.
- **Region padding** maps to the §IV named scale `[FACT: design.md §IV:158-162]` — **Compact 8/12 · Default 12/16 ·
  Loose 16/24 · Spacious 24/32** (v/h). M1.0 shell uses **Default/Loose** for chrome regions; a **Compact** density
  is the reserved seam (the §IV scale IS the density system — UX-3 does not invent a parallel one).
- **Touch targets** `[FACT: design.md §X:216-220]`: every interactive shell element (dock item, global-bar action,
  drawer trigger) **≥44×44px**, **≥8px** between adjacent targets — enforced at ALL widths, not just mobile.
- All values are DS-2 4pt-grid tokens `[FACT: tokens.ts:6-7]`, each pinned to the **correct scale** (heights/dims →
  `$size`; gaps/padding → `$space` — the DEF-U8-h rule `[[tamagui-dimension-props-read-token-scale-not-theme]]`).

**(e) Layering & elevation.** The frame composes against the **existing named z-scale**
`base:0 · dropdown:1000 · sticky:1100 · overlay:1200 · modal:1300 · toast:1400` `[FACT: tokens.ts:9]` — sticky bars
at `$sticky`, the overlay host at `$overlay`/`$modal`, above the shell chrome and correctly under `$toast`. The
shell **invents no z-values**. Elevation follows the **3-level standard** `[FACT: design.md §V:181-193]` (Level 3 =
overlay, for the modal/command-bar host); overlay-host **radius** from the standard scale — **modal `lg 12`**,
**drawer `xl 16`** `[FACT: design.md §V:168-176]`; dark mode replaces shadow with border+bg elevation
`[FACT: design.md §V:193]`. Consistent with UI-1's Dialog/Popover/Menu/Toast layering.

**(f) Motion of shell transitions.** Dock collapse/expand + mobile drawer slide = **transform/opacity only** (B12),
`moderate` duration from `motion.ts`, reduced-motion → instant `[FACT: DS-3 motion.ts; standards/motion.md]`.

**(g) Shell UI state the store must reserve.** UX-3 specifies what `app-shell-ui-store` must hold for the responsive
frame (the current width/breakpoint is read reactively via Tamagui `useMedia()`, **not** stored — noting `useMedia()`
returns usable keys only once UI-4 registers the breakpoints into `createMedia`, the D5 seam; the `breakpoints.ts`
artifact is the SSOT and is testable independent of that wiring); the store reserves dock-collapsed + `isMobileNavOpen`.
UI-4 extends the store — UX-3 does not modify store code, only specifies it.

### IN.2 — Declarative layout artifact → `apps/web/src/shell/`
A **new non-component data dir, sibling of `nav/` and `command-bar/`, explicitly NOT under `components/`** (the UX-1
`nav/module-map.ts` precedent; `components/` is UI-4's render dir) `[FACT: baseline §1; nav/CLAUDE.md]`. The typed
source of truth the UI-4 host renders against:
- `breakpoints.ts` — the named breakpoint set (name→min/max px) as the **single source of truth** for the widths,
  ordered, with an invariant test (monotonic, non-overlapping, covers 0→∞);
- `regions.ts` — a declarative **region model**: each region's identity + its reflow rule per breakpoint (visible /
  variant), pure and testable now (no unbuilt dep);
- layer `CLAUDE.md` (data-not-chrome rules, mirroring `nav/CLAUDE.md`).
- **NOT** a rendered React component (UI-4), **NOT** an edit to `packages/ui/src/tamagui.config.ts` (DS-4-owned;
  see D5), **NOT** Spaces content (M1.1).

## 3. Scope boundary (what this is NOT)
Not the rendered shell components / dock / top-bar / modal host (UI-4) · not the command-bar/search *interaction*
(UX-2 — UX-3 owns only overlay *placement/geometry*) · not the nav/module data (UX-1 `module-map.ts`, read-only) ·
not the Spaces-bar *content* (M1.1 — region reserved only) · not wiring `@vida/ui`/`UIProvider` into apps/web (UI-4) ·
not client-state *conventions* (UX-4; UX-3 only *specifies* the store shape, per the AR-4 pattern) · not the native
mobile shell (@vida/mobile track) · not onboarding (UX-5) · not the <80 KB bundle gate (a UI-4/shell-era gate
`[FACT: web-runtime:82]`, though UX-3's layout is designed to fit it).

## 4. Acceptance (functional DoD — full detail promoted to spec §4)
- [ ] The shell frame anatomy is documented: dock (⇒ left sidebar, `isSidebarOpen`), global bar, Spaces-bar seam,
      content `<Outlet/>`, overlay host — each with its ownership boundary (UX-3 layout vs UI-4 render vs UX-2 interaction).
- [ ] **Breakpoint model** = **design.md §X** (`375/768/1440/1920`, mobile-first; `wide`=max-width cap only), with the
      mobile-first reflow of **every** region at **every** breakpoint (dock drawer→rail→sidebar; global bar condense;
      Spaces hidden/reserved; content 1280 cap; overlay sheet→centered) — **verified at the 3 primary widths 375/768/1440**.
- [ ] **Density/containers** = **design.md §IV/§X** (padding scale Compact/Default/Loose/Spacious; content max 1280
      centered; side padding 16/24/32; **touch targets ≥44×44, ≥8px gap** at all widths), on the 4pt grid, each metric
      pinned to the correct scale (dimensions→`$size`, gap/padding→`$space` — DEF-U8-h); `compact` reserved as a seam.
- [ ] **Layering & elevation** against the existing `$zIndex` scale (sticky bars `$sticky`; overlay host `$overlay`/
      `$modal`) + design.md §V (Level-3 overlay; modal `lg 12`/drawer `xl 16` radius; dark = border+bg) — no invented values.
- [ ] **Motion** of dock-collapse/drawer specified: transform/opacity only, `motion.ts` duration, reduced-motion instant (B12).
- [ ] Shell **store shape** the responsive frame requires is specified (breakpoint via `useMedia`, not stored; reserves dock-collapsed + `isMobileNavOpen`).
- [ ] The **layout artifact** (`shell/breakpoints.ts` + `shell/regions.ts`) compiles in `apps/web/src`; **unit-tested**
      (breakpoint invariants + region-reflow predicates); zero dep on unbuilt systems; does NOT edit `tamagui.config.ts`.
- [ ] `typecheck` + `lint` green; consistent with UX-1 nav model, UX-2 command-bar seams, UI-1 z-scale + motion.
- [ ] Layout model promoted to `docs/core/architecture/shell-layout.md` + README row (Currency Rule §XXIX).

## 5. Implementation Prompt
Authored as the gate-2 IMPLEMENTATION-PLAN after Approval 1 (FULL variant — the `apps/web/src/shell` artifact is code).

## 6. Decisions — ALL resolved by the docs/precedent (no open forks)
> Second drift-catch (Victor): D2 and D5 were manufactured forks. The issue's declared Home + the two-sibling
> pattern already determine them. Recorded here as resolved, not as a menu. `[[dont-manufacture-an-architecture-fork-the-pattern-already-answers]]`

- **D1 — breakpoint set.** ✅ **Fixed by design.md §X** (`375/768/1440/1920`, mobile-first; 3 primary test widths).
  UX-3 *applies* it. `[FACT: design.md §X:201-214]` (Sub-detail — tablet dock = **rail** — confirm at IMPL-PLAN.)
- **D2 — artifact vs pure-doc.** ✅ **RESOLVED: doc + declarative artifact** (IN.1 + IN.2). Not an open choice — the
  two same-class siblings BOTH delivered exactly this: UX-1 = `information-architecture.md` **+ `apps/web/src/nav/
  module-map.ts`** `[FACT: ux-1 _index Result]`; UX-2 = `command-bar-and-search.md` **+ `apps/web/src/command-bar/`
  contract** `[FACT: ux-2 _index Result]`. Plus UX-3's Home = `apps/web/src` `[FACT: m1.0-delivery-plan.md:210]`.
  The pattern + Home fix it.
- **D3 — density/containers.** ✅ **Fixed by design.md §IV/§X** (padding scale Compact/Default/Loose/Spacious;
  containers 1280 + 16/24/32; touch 44×44). UX-3 *applies* it (chrome = Default/Loose; Compact reserved).
  `[FACT: design.md §IV:158-162, §X:216-227]`
- **D4 — overlay-host scope.** ✅ **RESOLVED by the IA scope boundary**: UX-3 = layout, UX-2 = interaction, UI-4 =
  render `[FACT: ia.md:16-18,153-154]`. So UX-3 specs the overlay host's **placement/geometry only** (mobile sheet /
  tablet+ centered overlay, `$overlay`/`$modal` z, modal `lg 12`/drawer `xl 16` radius, Level-3 elevation) — this is
  "layout," not a fork; the ⌘K behavior stays UX-2's, the render UI-4's. `[FACT: design.md §V]`
- **D5 — breakpoint-config home.** ✅ **RESOLVED by the issue Home = `apps/web/src` ONLY.** The delivery-plan is
  deliberately precise: **UX-4's Home = `apps/web/src`, `packages/ui`** (it touches UI-1), but **UX-3's Home =
  `apps/web/src`** — `packages/ui` is intentionally excluded `[FACT: m1.0-delivery-plan.md:210-211]`. So the artifact
  lives **app-local** in `apps/web/src/shell/`, and UX-3 **reserves the UI-4 `createMedia` seam** (UI-4 wires
  `@vida/ui`+config into apps/web). Editing `packages/ui/.../tamagui.config.ts` is **out of UX-3's declared scope** —
  not an option to weigh. *(A future DS pass MAY promote breakpoints into the config — a reserved thought for that
  owner, not this issue.)*

**Net: the entire direction is determined by design.md §X/§IV/§V + the IA scope boundary + the UX-1/UX-2 deliverable
pattern + the issue's `apps/web/src` Home. Nothing is left to invent.**

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-09 | 2026-08-09-ux-3-shell-layout-responsive | PLAN Rev 1 — direction for Approval 1 (grounded in baseline; D1–D5 recommended) |
| 2026-08-09 | 2026-08-09-ux-3-shell-layout-responsive | PLAN Rev 2 — independent critique SHIP (0 blockers); folded 2 minors: §2(g) `useMedia()`↔D5-seam cross-ref; §2(d)/§4 density metrics pinned to correct scale (dimensions→`$size`, gap/padding→`$space`, DEF-U8-h). |
| 2026-08-09 | 2026-08-09-ux-3-shell-layout-responsive | **PLAN Rev 3 — DRIFT-CATCH 1 (Victor).** Root cause: profile mislabeled `Generic` (loads only `process`) → design.md never loaded → Rev 1/2 INVENTED a breakpoint set contradicting **design.md §X**. Corrected profile → **add-frontend-component (design-led)**; aligned D1 (breakpoints `375/768/1440/1920` mobile-first), D3 (§IV padding scale + §X containers 1280/16-24-32 + touch 44×44), D4/§2(e) (§V radius/elevation). |
| 2026-08-09 | 2026-08-09-ux-3-shell-layout-responsive | **PLAN Rev 4 — DRIFT-CATCH 2 (Victor).** D2 + D5 were manufactured forks. Resolved by docs: D2 = doc+artifact (UX-1/UX-2 both delivered exactly this; issue Home `apps/web/src`); D5 = app-local (UX-3 Home = `apps/web/src` ONLY, `packages/ui` deliberately excluded vs UX-4 → editing DS tamagui.config.ts is out of scope). D4 = IA scope boundary. **No open decisions remain — direction fully doc-determined.** |
