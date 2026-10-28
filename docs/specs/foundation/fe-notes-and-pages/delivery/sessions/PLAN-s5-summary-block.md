# PLAN — S5 · `/summary` block + per-section degrade

> fe-notes-and-pages (② unit #27) · slice S5 · Linear LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Approval-1 artifact** (PLAN → ░g1░ → preflight → IMPL → ░g2░ → Approval-2 → blocking Visual Gate). Grounded in
> `delivery/{slice-map,seam-contract,envision,interpretation}.md` + the authoritative aspect `notes-and-pages.md`
> (NOT-32/33/34/52) + the journals engine `docs/modules/journals/current-spec.md`.

## 1. What S5 is (scope line)

The **`/summary` block render** — the daily OS summary, rendered per-section, where a missing/failing source degrades
**that section only**, never the whole block (NOT-34/EC-9). fe-notes OWNS the **render + per-section degrade**; it
consumes the journals ENGINE (`buildDashboard`) and does NOT re-author the engine or the editor node.

**Doc-resolved boundary (grounded):**

- **Engine = journals-service.** `buildDashboard(date, selection?) → DashboardData {summary: SectionData[], agenda:
SectionData[]}` — barrel-exported from `@vida/core/services/journals`; **per-section degrade is ALREADY engine-side**
  (per-provider try/catch → `{state:'error'}`; `journalStillRenders` anti-blank) [FACT: journals current-spec.md
  buildDashboard; NOT-32/34 JOU-13]. Notes owns only `summary_config` STORAGE (①, a `pages` column) — not the engine.
- **UI = P6 (fe-notes).** NOT-32/34 SPLIT homes "the `/summary` block render + per-section degrade" to P6 [FACT:
  notes-and-pages.md:46-48]. This slice = that render.
- **The inline editor `/summary` NODE is ui-3.** The 12 platform blocks are `@vida/editor` TipTap extensions "NOT
  re-authored in M1.1" [FACT: NOT-52]; E5 shipped `dailySummary` as a **placeholder node-view**
  (`IntegrationBlockPlaceholder`, attrs `rendered:false`) [FACT: integration-blocks.tsx]. The real-body replacement +
  `CapabilityRegistry` wiring is ui-3/#31 [FACT: editor CLAUDE.md "integration-block REAL bodies → MOD-* / #31"]. →
  **F-S5-1 finding** (parallel to F-S4-1): fe-notes builds the render; the editor node-view mount is ui-3.

**In scope (S5 — apps/web):**

- `SummaryView` (presentational, state-as-prop): renders `SectionData[]` — each section by its `state`:
  **success** → the section's `dataPoints[].label` list (`DataPoint = {id,label}`, human-readable); **empty** → a muted
  "No `<module>` today"; **error** → a section-scoped calm error (`role=status`); plus **block-level** states (loading /
  block-error / block-empty). `SectionData.items` is **opaque (`unknown[]`)** — fe-notes renders the section FRAME +
  dataPoint labels GENERICALLY, never the module-shaped items (D-S5-7). Per-section degrade = EC-9/NOT-34.
- `SummaryBlock` (hook-wired shell) + `use-journal-summary(date)` data seam (honest-stub + `?sample`; live =
  `createJournalsService.buildDashboard`).
- **Wire into `journalOverviewStub`'s Summary section** (`note-overview.tsx`) — replace the S2 `SummarySeam` (the real
  fe-notes mount; EC-15/EC-18a: the journal shows `/summary`).
- Consumes `SectionData`/`DashboardData` **type-only** from `@vida/core` (clean exported engine types; apps/web already
  deps `@vida/core`).

**Explicitly OUT (homed/deferred — no pull-forward, §XXVIII if tempted):**

- The inline editor `/summary` block NODE-VIEW (E5 real body) → **ui-3/#31** (F-S5-1).
- Live `buildDashboard` wiring (a live composition root + registered contributors) → data plane (S1-D2/F3) — stubbed.
- `summary_config` read/write UI (which sections are enabled) → S6 metadata controls / NOT-32 config; **S5 renders the
  sections the engine returns**, not the config editor. The wider personalizable menu (NOT-35) → M1.4.
- The `agenda` half of `DashboardData` + the full journal daily-dashboard (Today's agenda · Streaks · Check-in) →
  **fe-journals** (EC-18a RIDE); S5 renders only the `summary` sections in the stub's Summary seam.

## 2. Composition shape

```
note-overview.tsx  (journalOverviewStub — S2, edited)
└─ replaces SummarySeam() with:
   <SummaryBlock page={page} />                              apps/web/src/notes/summary-block.tsx   [NET-NEW]
      ├─ use-journal-summary(journalDate)                    apps/web/src/notes/use-journal-summary.ts [NET-NEW]
      │     → { sections: SectionData[], state }             honest-empty default + ?sample
      │        (live: createJournalsService.buildDashboard(date, selection).summary)
      └─ SummaryView({ sections, state })                    apps/web/src/notes/summary-block.tsx (pure presentational)
            block states: loading | error | empty            (whole-block terminal)
            per SectionData: success → items/dataPoints · empty → section-empty · error → section-error (EC-9/NOT-34)
```

`SummaryView` is **body-only** (the overview Section frame supplies the "Summary" label). One component; the journal
is the only page-type whose overview has a Summary section (note overview = Properties/Attachments/Backlinks).

## 3. Net-new units (files)

| File                                          | Purpose                                                                                       | Notes                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/web/src/notes/use-journal-summary.ts`   | DATA seam — `{sections: SectionData[], state}`; `?sample`                                     | STUB; live = `buildDashboard(date).summary`; key `['journal','summary',date]` |
| `apps/web/src/notes/summary-block.tsx`        | `SummaryView` (state-as-prop) + `SummaryBlock` (hook shell)                                   | reuses `note-chrome` `Eyebrow`/`Row`/`Icon`; per-section + block states       |
| `apps/web/src/notes/note-overview.tsx` (edit) | swap `SummarySeam` → `<SummaryBlock page={page}/>` in `journalOverviewStub` (merged + tabbed) | remove dead `SummarySeam`                                                     |
| `*.test.ts(x)`                                | `summary-block.test.tsx` (block states + per-section degrade matrix)                          | mirror S3/S4                                                                  |

Reuses shipped: `note-chrome` atoms · `SectionData`/`DashboardData` (type-only, `@vida/core`) · Tamagui · Lucide (EC-22).
**No new `@vida/ui` primitive.**

## 4. Decisions — all DOC-RESOLVED

- **D-S5-1 — per-section degrade is RENDER-over-engine-state, not re-derived.** `buildDashboard` already returns each
  section with `state: TerminalState` (per-provider try/catch) [FACT: journals current-spec]. `SummaryView` renders each
  `SectionData` by its `state` — success/empty/error per section (EC-9/NOT-34). fe-notes does NOT re-run providers or
  re-derive states; it renders what the engine produced. Block-level empty = no sections; block error = the hook failed
  to call the engine at all (vs a section erroring).
- **D-S5-2 — the inline editor NODE is ui-3 (F-S5-1).** [FACT: NOT-52; E5 placeholder; editor CLAUDE.md #31]. fe-notes
  builds the render; it mounts in the journal-overview Summary section now, and the ui-3 editor node-view will mount the
  SAME render when #31 replaces the placeholder. Filed, not built.
- **D-S5-3 — render SectionData, not the config.** S5 renders the sections the engine returns; the `summary_config`
  (which sections are on) editor UI is NOT S5 (config storage = ①; the toggle UI = S6/NOT-32). No config affordance here.
- **D-S5-4 — type-only `@vida/core` import.** `SectionData`/`DashboardData` are clean exported engine types (NOT Drizzle
  Rows) — import type-only (erased); apps/web already deps `@vida/core`. No structural `*Like` needed (contrast S3/S4
  which dodged Drizzle Row coupling).
- **D-S5-5 — live wiring deferred** (S1-D2/F3): honest-empty default + `?sample`; live = `buildDashboard`. RQ key
  `['journal','summary',date]` (prefix-safe under `['journal']`).
- **D-S5-6 — state ladder** `loading | error | empty | populated` (block-level, §VIII; S3/S4 parity) + the per-section
  terminal states INSIDE a populated block.
- **D-S5-7 — `items` is opaque → render dataPoint labels, generically.** `SectionData.items: unknown[]` is the
  app-shaped payload, opaque at the seam [FACT: journals types.ts:48]; `dataPoints: {id,label}[]` IS renderable. So a
  success section renders its `dataPoints[].label` (a labeled list); the rich per-module item body is each module's ② /
  the inline editor block, NOT fe-notes (keeps the render generic over any `SectionData`).
- **D-S5-8 — tabbed-mode wiring (N1):** in `journalOverviewStub` tabbed, flip the `summary` block `state: 'empty' →
'success'` + `renderBlock` returns `<SummaryBlock>` (the S3 backlinks-block pattern — the panel owns its own ladder);
  merged renders `<SummaryBlock>` inside the Summary Section.

## 5. Envision coverage — S5's EC Visual-Gate MUSTs

| EC              | Requirement                                                                                            | S5 assertion                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EC-9**        | `/summary` renders per-section; a missing source degrades **that section only**, never the whole block | Visual Gate: a sample with ≥3 sections of MIXED state (success + empty + error) — the error section shows a scoped error, the others still render |
| **EC-15**       | the journal shows `/summary`                                                                           | the journal-overview Summary section renders the real block (not the S2 seam)                                                                     |
| **EC-22**       | Lucide icons token-tinted                                                                              | section rows carry Lucide svg                                                                                                                     |
| EC-16/17 (feel) | editorial calm                                                                                         | live per-slice Visual Gate (full-matrix AA)                                                                                                       |

## 6. Test plan

- `summary-block.test.tsx` (drive `SummaryView` directly): block `loading`(aria-busy)/`error`(role=status)/`empty`;
  `populated` with a **mixed-state section array** → success section renders its `dataPoints[].label`s, empty section
  renders its empty line, **error section renders a scoped `role=status` error WHILE the others still render** (EC-9/
  NOT-34 — the anti-blank proof); each section labeled by `module`; EC-22 svg; a11y roles.
- `note-overview` (extend if it asserts the Summary seam copy): journalOverviewStub both modes render `SummaryBlock`.
- Full `@vida/web` suite green.

## 7. Blocking Visual Gate (real browser, after g2)

Brave; real app `/notes/2?sample` (id 2 = journal — `SAMPLE_TYPE['2']='journal'`, so the journal overview + Summary
section render). 3 presets × light/dark × {merged, tabbed} × 375/768/1440:

- EC-9: the Summary section shows ≥3 sections with ≥1 in an ERROR state scoped to that section (others still render).
- EC-15: the journal overview Summary section renders the block (not "appears here once connected").
- EC-22: Lucide svg; full-matrix **AA** on section text incl. warm-dark; `axe` 0; 0 overflow; MEASURED_OK + composite opacity.

## 8. Risks / findings

- **F-S5-1 (FILED — not built here):** the inline editor `/summary` block node-view (E5 real body) is ui-3/#31; add to
  the parking lot alongside EC-24/F-S4-1. fe-notes' render mounts in the journal overview now; the editor node-view later.
- **R1 — sample must exercise a mixed-state array** (not all-success) or EC-9's "degrade that section only" is unproven
  — the sample MUST include an error section + a success section so the anti-blank behavior is visible.
- **R2 — SectionData.items/dataPoints shape** is module-defined (`dataPoints[]`); S5 renders them GENERICALLY (a labeled
  list of the section's items), not per-module-bespoke (module bodies = each module's ② / the inline block). Keep the
  render generic over `SectionData` — a per-module rich body is out of scope.

## 9. Performance budget (§XXII)

`SummaryView` is O(n) over the sections (small, ~5-10). No memoization. Stated per §XXII; N/A-trivial for the stub.
