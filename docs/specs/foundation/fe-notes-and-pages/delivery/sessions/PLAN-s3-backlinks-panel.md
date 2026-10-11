# PLAN — S3 · Backlinks panel ("What links here", merged + grouped by source)

> fe-notes-and-pages (② unit #27) · slice S3 · Linear LIF-191 · branch `fe-notes-and-pages` (Node 24).
> Per-slice §XXVI double-gate: **this is the Approval-1 artifact** (PLAN → ░g1░ → preflight → IMPL → ░g2░ →
> Approval-2 → blocking Visual Gate). Grounded in `delivery/{slice-map,seam-contract,envision,interpretation}.md`
> + the finished ① (`docs/modules/notes/current-{spec,business-rules}.md`, BR-S4-4).

## 1. What S3 is (scope line)
The **"What links here" backlinks panel**. It fills the S2 empty-but-functional `BacklinksSeam`
(`note-overview.tsx:40`) — in **both** overviews (`note`, `journal` stub) × **both** modes (merged inline Section +
tabbed DashboardBlock) — with a real panel that **merges** the ①'s two unmerged lists (`pageLinks`, `entityLinks`)
into one "what links here" list **grouped by source module** (EC-6, resolved envision.md:142 — the G6 shape; NOT-24).

**In scope (S3):**
- A pure, tested `mergeBacklinks` + `groupBySourceModule` (the G6 merge the ① defers to the UI — BR-S4-4).
- A `useBacklinks(entityType, entityId)` data seam — **honest-empty default + `?sample` DEV gate** (mirrors
  `useNoteEntity`/`useNotesRows`); live swap = React-Query over `getBacklinks` (zero-signature-change, deferred).
- A presentational `BacklinksPanel` (body-only) owning its own `loading` / `empty` / `populated` states, rendered in
  **both** modes from one component (the S2 "one section feeds both modes" discipline).
- Wiring both `noteOverview` + `journalOverviewStub` (`note-overview.tsx`) to the panel; tabbed block → `state:'success'`.
- Tests + the blocking Visual Gate (EC-6, EC-22).

**Explicitly OUT (homed / deferred — no pull-forward):**
- **Live source resolution (id → source page type + title).** `getBacklinks` returns link rows carrying only
  **ids + an [E] `context` snippet** (`PageLinkRow.source_page_id` / `EntityLinkRow.page_id`; schema `notes.ts:80`,
  `spaces.ts`). The source's *type/title* is **enrichment** — the same deferred seam as the S4 preview-card
  (seam-contract.md:31, "card renders with available data"). M1 ships the resolver seam; the `?sample` provides
  resolved rows for the gate. **Live resolution = the data-plane slice (S1 D2 / F3), deferred.** (D-S3-1)
- Click-through navigation to the source page → the live data plane / routing is stubbed; rows are non-interactive in
  M1 (a `role=listitem`, not a link — no dead `/notes/$id` nav against a stub). (D-S3-4)
- `getPageLinksTo` as a *separate* affordance → not needed; `getBacklinks` already folds it in (seam-contract.md:16).
- FTS5 / graph data-prep / Yjs content → unrelated deferred backend seams (IR-2).

## 2. Composition shape
```
note-overview.tsx  (noteOverview + journalOverviewStub — S2, edited)
└─ replaces BacklinksSeam() with:
   <BacklinksPanel entityType={page.type} entityId={page.id} />        apps/web/src/notes/backlinks-panel.tsx  [NET-NEW]
      ├─ useBacklinks(entityType, entityId)                            apps/web/src/notes/use-backlinks.ts     [NET-NEW]
      │     → { groups: BacklinkGroup[], count, state }                state: loading|error|empty|populated
      │        honest-empty default + ?sample DEV gate                 (live swap: React-Query ['links','backlinks',
      │                                                                 type,id] → getBacklinks → resolve sources → merge)
      └─ pure core:                                                    apps/web/src/notes/backlinks.ts         [NET-NEW]
            mergeBacklinks(raw, resolveSource) → BacklinkItem[]        1 item/source; item.count = occurrences (no drop)
            groupBySourceModule(items)         → BacklinkGroup[]       grouped + sorted (module label asc, item recency)

  merged mode : <Section title="Backlinks"><BacklinksPanel/></Section>        (inline Eyebrow + body, no box — EC-19)
  tabbed mode : DashboardBlock{ id:'backlinks', state:'success' }             (Card frame provides the title)
                renderBlock(b)=> b.id==='backlinks' ? <BacklinksPanel/> : …   (panel = body-only, both modes)
```
The panel is **body-only** (no self-title): the frame supplies the "Backlinks" label in both modes — exactly how
`PropertyRows` rides the Card/Section today (`note-overview.tsx:82`). `renderBlock` is success-only
(`dashboard-view.tsx:160`), so the block is always `'success'` and the panel owns its **full state ladder
`loading | error | empty | populated`** internally — one ladder for both modes (parity with S2's `useNoteEntity`
`loading|empty|error|success`, note-entity.tsx:51,61; §VIII requires `error` on a data component).

## 3. Net-new units (files)
| File | Purpose | Notes |
|------|---------|-------|
| `apps/web/src/notes/backlinks.ts` | **pure** merge + group: `BacklinkItem`, `BacklinkGroup`, `mergeBacklinks`, `groupBySourceModule`, `MODULE_FOR_TYPE` | no React; 100% unit-tested (§XIX business logic) |
| `apps/web/src/notes/use-backlinks.ts` | the DATA seam — `{groups, count, state}`, `state: 'loading'\|'error'\|'empty'\|'populated'` | STUB: honest-empty + `?sample`; live swap = React-Query over `getBacklinks` (zero-sig-change) |
| `apps/web/src/notes/backlinks-panel.tsx` | presentational body: grouped list / own `loading`/`error`/`empty` | reuses `Eyebrow`/`Row`/`Icon`/`typeIcon`/`typeLabel` (note-chrome, EC-22) |
| `apps/web/src/notes/note-overview.tsx` (edit) | swap `BacklinksSeam` → `<BacklinksPanel/>` in both overviews; tabbed block → `state:'success'` | remove the now-dead `BacklinksSeam` fn |
| `*.test.ts(x)` | `backlinks.test.ts` (pure core) + `backlinks-panel.test.tsx` (states) | mirror S1/S2 coverage |

Reuses shipped: `note-chrome` atoms (`Eyebrow`, `Row`, `Icon`, `typeIcon`, `typeLabel`, `IconTone`) · `DashboardView`/
`DashboardBlock` · Tamagui `Text`/`View` · Lucide (EC-22). **No new `@vida/ui` primitive** (a feature panel, not a
reusable DS atom — §VI: appears once, composes existing atoms).

## 4. Decisions — all DOC-RESOLVED (grounded before the gate, per the standing "check the docs first" rule)
- **D-S3-1 — source resolution rides the (already-stubbed) data plane; it is NOT skipped work.** BR-S4-4 makes the
  merge+group the UI's job, and grouping **by module** needs the source's page *type* — but `getBacklinks` returns
  **ids-only** rows (`PageLinkRow.source_page_id` / `EntityLinkRow.page_id`; `notes.ts:80`, `spaces.ts`), so the type
  must come from `getPage`/`listPages` — **which throw on the absent apps/web composition root** (the exact
  S1-D2 / S2 `useNoteEntity` cause, note-entity/use-note-entity.ts:5). So the live resolver is *forced* to defer with
  the whole data plane — identical to S1/S2, not a new choice. (Secondary analogy: the S4 preview-card enrichment
  defer, seam-contract.md:31.) → `mergeBacklinks(raw, resolveSource)` takes a **resolver fn**; M1 wires an empty
  resolver (→ honest-empty), the `?sample` provides pre-resolved rows for the gate; the live resolver (batched
  `listPages` → `id→{type,title}`) arrives with the data plane. **FACT-grounded defer, not an invention.**
- **D-S3-2 — "source module" grouping key.** EC-6 chose *source module* over *link type* over *flat+badge*
  (envision.md:62 → resolved :142). Each source is a **page** (both lists are page-sourced: pageLinks via
  `source_page_id`, entityLinks via `page_id` — `backlink-resolver.ts:46`), so the module derives from the source's
  **page type** via a `MODULE_FOR_TYPE` map (`note→Notes`, `journal→Journals`, `task_note`/`task_group_note→Tasks`,
  `milestone_note`/`deliverable_note→Projects`; unknown → `typeLabel(type)` fallback). No per-row type badge (EC-6).
- **D-S3-3 — merge grain = one row per SOURCE, with an occurrence count `[INTERPRETATION]`.** The locked **Notion
  standard** (EC-1) groups "what links here" by source and never silently drops a link. So the merge folds both lists
  to **one item per `sourceId`** (a source links here, regardless of mechanism — the faithful "merges page + entity
  links" reading of EC-6) **but surfaces the occurrence `count`** when a source links more than once
  (`"Project kickoff · 3 links"`), so **nothing is silently discarded** (no-silent-caps rule). The item keeps the
  first non-empty `context` snippet for preview; **per-occurrence snippet lists = deferred enrichment** (snippets are
  `[E]`/inert in M1 anyway — R3), explicitly noted, not dropped. Envision fixes the module *grouping* (:142), not the
  *grain* — so this grain choice is labeled `[INTERPRETATION]`; **fallback** if the gate wants per-occurrence rows:
  item = link (no dedup), same grouping — a localized change to `mergeBacklinks`, no panel/API change.
- **D-S3-4 — rows are non-interactive in M1.** No live data plane / routing → a row is a `role=listitem`
  (icon · source title · optional `context` snippet), **not** a link. No dead `/notes/$id` nav against a stub
  (the S2 honest-stub discipline; click-through arrives with the data plane). No WCAG name-but-no-target trap.
- **D-S3-5 — React-Query key** (D3): `['links','backlinks',entityType,entityId]` — **prefix-safe** under `['links']`
  so a future link write invalidates it (heed the staleTime/prefix trap, memory
  [[verify-a-cache-liveness-BR-against-the-runtime-config]]). Live-swap-only; the stub needs no client.

## 5. Envision coverage — S3's EC Visual-Gate MUSTs
| EC | Requirement | S3 assertion |
|----|-------------|--------------|
| **EC-6** | "What links here" merges page + entity links, **grouped by source module** (structural) | Visual Gate: the `?sample` renders ≥2 source-module groups (e.g. Notes · Projects), each an Eyebrow + rows; a multi-link source shows its occurrence count (nothing dropped); no per-row type-badge |
| **EC-22** | Lucide icons, token-tinted via CSS var (cross-cutting) | each row's source-type icon is a Lucide svg, tinted `var(--colorText*)`; svg count > 0 |
| EC-16/EC-17 (feel) | editorial calm | live per-slice Visual Gate (full-matrix AA) |

## 6. Test plan
- `backlinks.test.ts` (pure): empty→[]; page-only; entity-only; both merged; **one-item-per-source** (same source in
  both lists → 1 item, `count=2`, first snippet kept — nothing dropped); **grouping** by module (multi-type →
  multi-group, sorted); unknown type → fallback label.
- `backlinks-panel.test.tsx`: `empty` → "Nothing links here yet."; `error` → "Couldn't load what links here."
  (`role=status`); `loading` → busy; `populated` → groups + rows + occurrence count + Lucide svg; body-only (no
  self-title); `role` structure (group/list/listitem) for a11y; rows are non-interactive (no link role — D-S3-4).
- `note-overview.test` (extend if present): both overviews × both modes render the panel (no `BacklinksSeam` left).
- Full `@vida/web` suite green (S2 lesson: run the FULL suite, not just the slice's files — a route/integration test
  may assert on the overview).

## 7. Blocking Visual Gate (real browser, after g2)
Brave via `PW_EXECUTABLE_PATH`; real app (onboarding → `/notes/1?sample` populated; a note with sample backlinks),
applySelection preset×mode class-switch (`t_light/t_dark` on html + `t_<preset>` on body). **3 presets × light/dark ×
{merged, tabbed} × 375/768/1440:**
- EC-6: ≥2 source-module groups visible, grouped + labeled; merge is deduped.
- EC-22: Lucide svg per row, token-tinted (both modes).
- Full-matrix **AA** on every text pair (group Eyebrow, source title, muted snippet) incl. **warm reader-dark**
  (the tight constraint — memory [[contrast-test-must-be-full-matrix-not-light-only]]); exclude any WCAG-disabled control.
- `axe` 0 · 0 overflow at 375 · console clean · empty state at a no-backlinks page (`/notes/3?sample` or no `?sample`).
- Assert MEASURED_OK + scope to the panel + composite ancestor opacity (memory
  [[visual-gate-must-assert-measurement-and-composite-opacity]]).

## 8. Risks
- **R1 — grouping over-engineering.** "Source module" could be read as needing a live module registry. → It is a pure
  `MODULE_FOR_TYPE` map over the known `PageType`s (D-S3-2); no registry, no new dependency. Flag if the gate wants
  more types than the map covers (fallback = `typeLabel`).
- **R2 — empty-vs-populated across both modes.** The tabbed block is `state:'success'` always (panel owns empty), so
  DashboardView never shows its generic block-empty for backlinks — verify the panel's own empty reads correctly
  inside the Card frame (Visual Gate).
- **R3 — snippet is [E].** `context` is `@encrypted [E]` (M1.0 pass-through, inert). The sample provides plaintext;
  live, the snippet renders only once decryption is wired — degrade to title-only if absent (never crash). Noted, not
  built (no encryption wiring in S3).

## 9. Performance budget (§XXII — stated, not estimated)
`mergeBacklinks` + `groupBySourceModule` are **O(n) single passes** over the two link lists (a `Map` fold for dedup +
one `Map` fold for grouping + one sort of the group keys). For M1 the input is the `?sample` fixture (≤ ~6 rows); live,
backlink counts per page are small (tens, not thousands). **No memoization needed; no render-loop work** (the pure fold
runs once per `useBacklinks` result, not per render). Budget is N/A-trivial for the stub and comfortably within any
list-render budget live — stated per §XXII rather than omitted.
