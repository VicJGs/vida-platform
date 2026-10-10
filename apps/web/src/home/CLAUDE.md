# apps/web/src/home — Home = Journal daily dashboard (design model + rendered surface)

**Owning issues:** UX-6 Home = Journal daily dashboard (LIF-95, the design model) + **fe-home #18 (LIF-187, the
rendered surface — Phase-1b)** · **Authority:** new-feature / add-frontend-component · intent `docs/features/journals`
+ ADR-004 provider-registry pattern + ADR-008 render-targets. Full model:
`docs/core/architecture/home-journal-dashboard.md`; fe-home delivery: `docs/specs/foundation/fe-home/delivery/`.

## The rendered Home surface (fe-home #18 — Phase-1b, SHIPPED)
The `/` landing surface, rendered inside the UI-4 shell `<Outlet/>` (`routes.tsx` index route). COMPOSES two distinct
entities (ADR-008 render-targets) — it owns no block body and no live data (all cross-layer reads are SEAMS):
- `home-dashboard.tsx` — **HomeDashboard** (S1, EC-4/EC-5): a personalized grid of **standalone** integration-block
  widgets (summary·finance·tasks·habits·projects·purposes·dreams·schedule) over the shipped `@vida/ui` `DashboardView`.
  `renderHomeWidget` = the standalone widget SUCCESS-body seam (M1 placeholder; real bodies ship per-capability).
  `useHomeWidgets` = the READ seam (M1 default set; live data = `buildDashboard`/registry, deferred to first consumer).
- `journal-page-region.tsx` — **JournalPageRegion** (S2, EC-3): the **inline**-block editor page (prose + inline block
  regions + the "/" affordance). The real `@vida/editor` `<VidaEditor>` mount is the **N6 seam** (deferred; `@vida/editor`
  is not an apps/web dep). Shell owns the page terminal states.
- `home-surface.tsx` — **HomeSurface** (S3, EC-1/EC-2/EC-6/EC-7): the greet header + the **arrangement** layer composing
  S1+S2. `useHomeArrangement` = the READ seam (default `journalFirst`; the toggle CONTROL + persisted write = Settings/
  `fe-settings`, `decomposition.md:71`). fe-home OWNS the arrangement layout (RP4): Journal-first = page hero + a compact
  "At a glance" dashboard rail; Dashboard-first = full OS grid + page below. EntityView `merged` = fixed layout→editor,
  so Journal-first is this surface's bespoke 2-col.
- Gates: tsc 0 · home+routes tests green · **Visual Gate PASS** (Brave, 2 arrangements × 3 presets × light/dark ×
  375/1440: axe 0 · AA 0-fail incl. warm-dark · 0 overflow). The gate caught a composite-opacity AA fail
  (`opacity:0.6` on muted `/type` labels → 2.26; fixed to plain `$colorTextMuted`), [[visual-gate-must-assert-measurement-and-composite-opacity]].

## What lives here (UX-6 design model — the data/logic layer fe-home consumes)
The **design model** of the daily Journal Home — central DATA/logic the render layer consumes. UX-6 designs the shape;
fe-home renders it. **The UX-6 model files below stay JSX-free** (the rendered surface is the `*-surface`/`*-dashboard`/
`*-page-region` files above).

- `section-model.ts` — `HOME_SECTIONS` (summary · agenda · entry) + `HomeSectionKey`/`SectionRenderHint`; each
  section's shell `region` (imported `ShellRegion` type from UX-3) + intended renderer (a string hint, no component).
- `journal-contribution.ts` — the **registry seam** (BR-2): `JournalContribution`/`SectionData`/`DataPoint`/
  `DateRange` types + `registerJournalContribution` (signature-only, throws `JournalSeamNotActivated`). Names no module.
- `section-state.ts` — the per-section **degrade composition** (BR-3): `resolveDashboardStates` +
  `journalStillRenders`, reusing the `@vida/core` `TerminalState` type. Does NOT derive state (no query here).
- `selection.ts` — personalization (BR-6): pure `resolveSelection` (override-wins per module) + deferred
  `get/setSelection` storage seams.

## Rules (do not violate)
- **The UX-6 MODEL files are data/logic, not chrome.** `section-model.ts` · `journal-contribution.ts` ·
  `section-state.ts` · `selection.ts` stay JSX-free (no components, no rendering). The rendered surface lives in the
  `home-surface`/`home-dashboard`/`journal-page-region` `.tsx` files (fe-home #18, Phase-1b) — which DO render + wire `/`.
- **Reuse canons by TYPE, never redefine.** `TerminalState` (4 literals) from `@vida/core` via
  `../state-conventions/terminal-state`; `ShellRegion` from `../shell/regions`. Do NOT call `deriveTerminalState`
  (it derives from a live React-Query result — there is none here; that derivation is the downstream engine's).
- **The journal names no module (BR-2).** A contribution's `module` is a string field, not a hard reference.
- **Seams are inert.** `registerJournalContribution`/`get/setSelection` throw `JournalSeamNotActivated` until the
  engine (MOD-journals #33, M1.1) + storage (Preferences/MOD-journals) fill them. Follows the AR-9 precedent.

## Downstream homes (fenced OUT of UX-6)
- Aggregation engine (`journal-service.ts`, `buildDashboard`/`captureSnapshot`/`getJournal`/`buildReview`) →
  **MOD-journals #33** (M1.1; "0 lines INTENDED").
- Real module `summary(date)`/`dueIn` providers → each **MOD-*** (M1.1+).
- The journal `pages` row + `/summary` block + TipTap entry → **Notes & Pages** (owns them; `entry` here is a seam).
- Snapshot + Wrapped-style temporal review engine → **design-pass / Wave 3-4**.
- The rendered React screen + `/` route wiring → **Phase-1b**.
