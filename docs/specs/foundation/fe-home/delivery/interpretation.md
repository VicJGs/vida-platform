# Interpretation — fe-home (LIF-187, G6 unit #18)

> Entity Delivery Flow ② · Step 1 (Interpretation Layer). Make the implicit explicit before decomposing.
> No-Guessing: every claim tagged `[FACT: …]` / `[INTERPRETATION]` / `[UNKNOWN]`.
> Profile: Add Frontend Component · Scenario: default · M1.2.1 — Hub & Foundation · Frontend.

## 0. What fe-home is (one sentence)

The **rendered Home surface** — the `/` landing screen that composes the shipped CODEC shells into a 4-region
daily dashboard + a free-form journal entry facet, with a user-chosen arrangement, built **on** the UX-6 design
model. `[FACT: decomposition.md:65; home-journal-dashboard.md:9-13,63]`

## 1. The whole entity — the confirmed shape

| Region | What it shows | UX-6 lineage | Renders via |
|--------|---------------|--------------|-------------|
| ① schedule | today's timed + dayparted events; "open calendar →" gateway | UX-6 `agenda` (one day, BR-5) | an integration block body in a DashboardView cell |
| ② stats | glance figures (serif tabular) + gateway to detail | UX-6 `summary` (recap) | an integration block body in a DashboardView cell |
| ③ day-actions | today's **must / can** actions | *new in G6* | an integration block body |
| ④ quick-actions | quick-capture chips (new task/note/…) | *new in G6* | an integration block body |
| journal entry | free-form markdown writing canvas | UX-6 `entry` (`editor-seam`) | the EntityView **Editor facet** mounting `@vida/editor` |

`[FACT: decomposition.md:65; p3-home-the-day-specimen.html:103-130; home-journal-dashboard.md:15-27]`

**The arrangement toggle (D4)** — a user preference choosing where the entry lives relative to the 4 regions:
- **Arrangement A — Journal-first**: the entry is the hero; the 4 regions frame it (side rail).
- **Arrangement B — Dashboard-first**: the 4 regions sit up top (command-center); the entry sits below.

`[FACT: p3-home-the-day-specimen.html:80-114 "Arrangement · D4 … Journal-first / Dashboard-first"; decomposition.md:65 "arrangement toggle (Journal-first/Dashboard-first) = a user pref"]`

## 2. Dependencies (what fe-home composes — all shipped)

- **DashboardView** (`@vida/ui`, fe-codec-dashboard #5 ✅) — the SHELL for the 4 region-blocks: a `renderBlock`
  render-prop over a `size`-enum span grid; shell owns per-block terminal states; `renderBlock` is success-only.
  `[FACT: dashboard-view.md; packages/ui/src/components/dashboard-view.tsx]`
- **EntityView** (`@vida/ui`, fe-codec-entity-facet #6 ✅) — the FACET frame: `layout` facet + optional `editor`
  facet, controlled `mode='merged'|'tabbed'`, Editor facet gated on `editor`-slot presence, `editorState` threaded.
  `[FACT: entity-view.md; packages/ui/src/components/entity-view.tsx]`
- **VidaEditor** (`@vida/editor`, UI-3 ✅) — the TipTap writing canvas; uncontrolled `defaultValue` + `onChange` +
  imperative `VidaEditorHandle`. Mounted as the Editor facet body. `[FACT: packages/editor/src/editor.tsx]`
- **mod-journals ① engine** (`@vida/core/services/journals`, #39 ✅) — `createJournalRegistry` +
  `createJournalsService.buildDashboard(registry, date, selection?)` aggregates registered module contributions
  into `{summary, agenda}` SectionData. `[FACT: docs/modules/journals/current-spec.md]`
- **UX-6 design model** (`apps/web/src/home/`) — `HOME_SECTIONS`, `JournalContribution`, `resolveDashboardStates`,
  `journalStillRenders`, `resolveSelection` (pure), the inert `registerJournalContribution` seam.
  `[FACT: apps/web/src/home/*; home-journal-dashboard.md]`

**Blocker reconciliation.** The reshape runbook lists 3 blockers (dashboard, entity-facet, **canvas-editor #7**);
the task file lists 2. `#7` is row 7 = "Canvas: Editor … **reuse UI-3**" — i.e. the editor canvas IS the shipped
`@vida/editor`. `#7`'s own aesthetic ② pass is orthogonal and unbuilt, and does **not** block fe-home: the entry
facet mounts `@vida/editor` directly as a seam. `[FACT: g6-reshape-runbook.md:7,52; UX-6 entry = editor-seam;
precedent: fe-codec-seams close-out "#7 … non-blocking"]`

## 3. Needs (what must be true for the build to be correct)

- **N1 — compose, don't re-render.** fe-home is a SHELL-of-shells: it wires DashboardView + EntityView + VidaEditor;
  it must not re-implement a grid, a facet toggle, or an editor. `[INTERPRETATION from the shells' BR-*-1 "shell not renderer"]`
- **N2 — state-as-prop, derived app-side.** Both DashboardView (per-block `state`) and EntityView (`mode`,
  `editorState`) are controlled; fe-home derives each block's `ViewState` via the shipped 8-state machine
  (`deriveInteractionState`/`collapseToTerminal`, fe-codec-patterns) from the journals/providers reads. `[FACT: BR-D-2, BR-E-2]`
- **N3 — degrade per-region, never a blank Home.** One failing provider degrades only its block; the Home still
  renders. Mirrors UX-6 `journalStillRenders`/BR-3. `[FACT: home-journal-dashboard.md:38-43]`
- **N4 — the arrangement toggle is a user pref (persisted seam).** The choice persists via the Preferences/MOD-journals
  selection seam (`get/setSelection` deferred); fe-home holds it in app state now, with a persist seam. `[FACT: home-journal-dashboard.md:50-54 "persisted storage … deferred seam → Preferences/MOD-journals"]`
- **N5 — M1 data is seam, not live.** No live `useHome`/`useJournalDashboard` data hook exists yet; per the
  collection/dashboard/seams precedent, fe-home ships the composition + a **type+convention adapter**, with the live
  data hook homed to the first consumer. `[INTERPRETATION; precedent: fe-codec-collection S3 / fe-codec-dashboard S2 / fe-codec-seams]`
- **N6 — the entry facet is a mount seam.** `@vida/editor` is mounted as the EntityView `editor` slot; the live
  journal page (`pages` row, `/summary` block, `[[links]]`) is **Notes & Pages**-owned, not fe-home's. `[FACT: journals/identity.md:42-43]`

## 4. Implicit rules made explicit

- **IR-1 — arrangement ≠ EntityView mode.** EntityView's `mode='merged'|'tabbed'` is the facet-presentation axis
  (both-on-one-surface vs tabs). The **arrangement** (Journal-first/Dashboard-first) is a *layout-ordering* axis
  **within** the merged surface. They are orthogonal; the arrangement is fe-home's own concern, not an EntityView prop.
  `[INTERPRETATION — must be confirmed/pinned at Envision; candidate EC]`
- **IR-2 — the 4 regions are integration blocks.** `decomposition.md:65` "blocks = integration blocks" → each region
  is a DashboardBlock whose body is (eventually) an integration-block widget; today the bodies are greybox/seam
  placeholders. `[FACT: decomposition.md:65]`
- **IR-3 — stats/schedule map to UX-6 summary/agenda; day/quick-actions are additive.** The 4-region model is the
  rendered elaboration of the 3-section UX-6 model, not a contradiction of it. `[INTERPRETATION; reconciles home-journal-dashboard.md:15-27 ↔ decomposition.md:65]`

## 5. The Envision Gate — FIRES

**§3.75 one-question test (verbatim):** *"Is there a user affordance whose UI answer isn't already obvious from an
existing shipped surface?"* Yes → fire (… a module hub · a novel interaction surface). `[FACT: entity-delivery-flow.md:104-107]`

**Verdict: FIRES.** fe-home is *the* module hub, and the **arrangement toggle (Journal-first/Dashboard-first)** is a
novel affordance with no shipped-surface answer — neither DashboardView (a block grid) nor EntityView (a facet
toggle) explains "how does the user flip the whole Home between writing-led and dashboard-led?" This is design-led;
the reviewer is the human (blocking). `[FACT: §3.75 trigger; p3 specimen:106 "the one real decision is where the entry lives"]`

A campaign vision specimen already exists (`p3-home-the-day-specimen.html`), but it is hand-authored HTML, **not**
the §3.75 code-truthful greybox composed from real `@vida/ui` primitives. The Envision step will author that
code-truthful greybox (composing the shipped DashboardView + EntityView + VidaEditor into both arrangements) so the
human pins anchored `EC-n` against the real shell composition — de-risking the shell fit before decomposition.

## 6. Open forks for the human (Envision Gate) — RESOLVED at the gate (see `envision.md`)

> All four resolved at the blocking Envision review (2026-10-10). Headline correction: the first greybox collapsed the
> two-entity architecture (ADR-008 render-targets) — fix: Dashboard = `standalone` widgets, journal page = `inline`
> blocks; they are different entities. Arrangement = a **Settings personalization** (default Journal-first), the control
> is Settings' not Home's. See `envision.md` RP1–RP4 + EC-1…EC-9.


1. **Arrangement surface.** Confirm IR-1: arrangement is a fe-home layout-ordering axis distinct from EntityView
   `mode`; and confirm the default (specimen defaults to **A — Journal-first**). `[p3:112 defaults arrA]`
2. **Toggle placement + control shape.** Where the arrangement control lives (header toolbar vs a settings pref only)
   and its control type. `[UNKNOWN — Envision]`
3. **Region block bodies at M1.** Greybox placeholders vs minimal real-shape bodies (schedule timeline, stat figures,
   action lists, quick chips). `[INTERPRETATION: greybox-grade bodies, live widgets homed downstream — confirm]`
4. **Merged vs tabbed default.** EntityView default `mode` for Home (specimen implies a single merged surface).

## 7. UNKNOWNs (carried into Envision/Decomposition)

- `[UNKNOWN]` exact per-region block body fidelity at M1 (seam placeholder vs minimal shape).
- `[UNKNOWN]` whether the arrangement persists via an app-state seam now or waits entirely for Preferences.
- `[UNKNOWN]` final slice count (set at Decomposition after Envision ECs land).
