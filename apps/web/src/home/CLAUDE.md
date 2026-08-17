# apps/web/src/home — Home = Journal daily dashboard (design model)

**Owning issue:** UX-6 Home = Journal daily dashboard (LIF-95) · **Authority:** new-feature · intent
`docs/features/journals` + ADR-004 provider-registry pattern. Full model:
`docs/core/architecture/home-journal-dashboard.md`.

## What lives here
The **design model** of the daily Journal Home — the landing surface at `/` — as central DATA/logic the render
layer (Phase-1b) consumes. **No chrome, no `.tsx`, no route change.** UX-6 designs the shape; the rendered screen
+ the real aggregation land downstream.

- `section-model.ts` — `HOME_SECTIONS` (summary · agenda · entry) + `HomeSectionKey`/`SectionRenderHint`; each
  section's shell `region` (imported `ShellRegion` type from UX-3) + intended renderer (a string hint, no component).
- `journal-contribution.ts` — the **registry seam** (BR-2): `JournalContribution`/`SectionData`/`DataPoint`/
  `DateRange` types + `registerJournalContribution` (signature-only, throws `JournalSeamNotActivated`). Names no module.
- `section-state.ts` — the per-section **degrade composition** (BR-3): `resolveDashboardStates` +
  `journalStillRenders`, reusing the `@vida/core` `TerminalState` type. Does NOT derive state (no query here).
- `selection.ts` — personalization (BR-6): pure `resolveSelection` (override-wins per module) + deferred
  `get/setSelection` storage seams.

## Rules (do not violate)
- **Design model, not chrome.** No JSX, no components, no rendering, no `routes.tsx` change. The rendered Home
  screen is Phase-1b (consumes this model).
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
