# PLAN — S4 · `[[` picker + create-on-miss + preview-card

> fe-notes-and-pages (② unit #27) · slice S4 · Linear LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Approval-1 artifact** (PLAN → ░g1░ → preflight → IMPL → ░g2░ → Approval-2 → blocking Visual Gate). Grounded in
> `delivery/{slice-map,seam-contract,interpretation}.md` + the authoritative aspect `backend-intent/parts/notes-and-pages.md`
> (NOT-18/19) + the ui-3 editor spec (`e4-slash-menu.md:31`) + the finished ① (`docs/modules/notes/current-*`).

## 1. What S4 is (scope line)

The **`[[` wiki-link picker**: the UI a user gets when linking a page to another by title — a candidate list over
`resolveWikiLink(text)`, an explicit **"+ Create '<text>'"** affordance (create-on-miss, never silent — NOT-19), and a
**preview-card** for a chosen/candidate link (unenriched — BSE-12 deferred). fe-notes OWNS the **picker UI + the
create-on-miss two-call compose**; it does NOT author the editor-side `[[` trigger.

**Doc-resolved boundary (the pivotal S4 finding — grounded, not guessed):**

- The **`[[` suggestion SURFACE (the editor trigger)** that detects `[[` typed in the editor is **a ui-3 `@vida/editor`
  concern, explicitly separate from the E4 slash menu, and UNBUILT** [FACT: `e4-slash-menu.md:31` — "`@`-mentions /
  entity `[[wiki-link]]` autocomplete — a separate suggestion surface"]. fe-notes **DELEGATES** platform-block TipTap
  extensions to `@vida/editor` and does **not** re-author them [FACT: interpretation.md:124 (NOT-52); IR-1:140 —
  "a missing primitive is a decomposition FINDING, not a license to build it here"]. `VidaEditor` exposes no
  extension/suggestion injection seam [FACT: editor.tsx:25-43,146-160].
- **NOT-19 SPLIT** [FACT: notes-and-pages.md:33]: _service_ = the stub-`note` create + link compose (NOT-01 + NOT-14);
  **UI = "the picker '+ Create' affordance + explicit-choice gate" → P6 (fe-notes)**. So the picker UI + compose is ours.

**In scope (S4 — apps/web):**

- A presentational **`PickerView`** (state-as-prop, the S3 `BacklinksView` split): candidate rows · the explicit
  "+ Create '<text>'" row · empty/searching states · keyboard a11y (combobox/listbox semantics).
- A **`PreviewCard`** for a link target — renders with **available data** (title/type), no enrichment, no dead card (BSE-12).
- The **create-on-miss two-call compose** (IR-4): `createPage('note')` → `createPageLink(src, tgt)` — explicit, never
  silent; surfaces `JournalExistsError`/`UnregisteredEntityTypeError` at the affordance (IR-8).
- A **`useWikiLinkPicker`** data seam (honest-stub default + `?sample` DEV gate; live = React-Query over `resolveWikiLink`
  - the compose mutations), mirroring `useNoteEntity`/`useBacklinks`.
- A **DEV-gated mount** (B1): a `?picker` branch in `note-entity.tsx` renders `<WikiLinkPicker sourcePageId={page.id}>`
  **open as an overlay** on the note page for the blocking Visual Gate (the exact `?sample` dev-gate precedent;
  NODE_ENV≠production, off in prod). The real caret-anchored trigger is ui-3.

**Explicitly OUT (homed/deferred — no pull-forward, §XXVIII if tempted):**

- The **`[[` suggestion-surface editor extension** (the trigger) → **ui-3 `@vida/editor`** (e4:31; a FINDING filed in the
  parking lot — the EC-24 "editor change = separate ui-3 PR" precedent). S4 ships the picker; ui-3 ships the trigger that
  mounts it.
- **Preview-card enrichment** (rich target metadata) → M1.1+ [FACT: seam-contract.md:31; xcut-backlinks-search-export.md:43].
- **Live service wiring** (resolveWikiLink/create mutations against a real store) → the data plane (S1-D2/F3) — stubbed.
- The **`/entity-link` slash block** (a DIFFERENT affordance, the E5 integration block) — not this slice.
- Content persistence / Yjs (IR-7); FTS5 (DB-8).

## 2. Composition shape

```
apps/web/src/notes/
├─ wikilink-picker.tsx        [NET-NEW]  PickerView(state-as-prop) + WikiLinkPicker(hook-wired shell)
│    PickerView({ query, candidates, state, onPick, onCreate })  → listbox: candidate rows + "+ Create '<query>'" row
│    WikiLinkPicker({ sourcePageId, onLinked })                  → useWikiLinkPicker + compose, delegates to PickerView
├─ use-wikilink-picker.ts     [NET-NEW]  data seam
│    useWikiLinkPicker(sourcePageId) → { query, setQuery, candidates, state, pick(target), createAndLink(title) }
│      honest-empty default + ?sample; live = RQ over resolveWikiLink + createPage/createPageLink mutations
├─ wikilink.ts                [NET-NEW]  pure: WikiCandidate view-model + toCandidates(rows) + the "+ Create" row model
├─ link-preview-card.tsx      [NET-NEW]  PreviewCard({ target }) — available-data card (BSE-12 unenriched), no dead card
└─ (DEV harness)              a ?picker dev-gate mounts <WikiLinkPicker> open on /notes/$id for the Visual Gate
```

The picker is a **listbox/combobox** popup (the WAI-ARIA pattern the E4 slash menu uses — focus semantics documented in
`e4-slash-menu.md`); S4 builds the _panel_, not the editor caret-anchoring (that's the ui-3 trigger). States:
`searching | empty(no candidates, only "+ Create") | populated | error`.

## 3. Net-new units (files)

| File                     | Purpose                                                                                                         | Notes                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `wikilink.ts`            | **pure** — `WikiCandidate` view-model, `toCandidates(PageRow-like[])`, the create-row model                     | no React/@vida/core; the structural `*Like` precedent                                     |
| `use-wikilink-picker.ts` | data seam — query state + candidates + `pick`/`createAndLink`                                                   | STUB: honest-empty + `?sample`; live swap = RQ over `resolveWikiLink` + compose mutations |
| `wikilink-picker.tsx`    | `PickerView` (state-as-prop) + `WikiLinkPicker` (hook shell)                                                    | listbox a11y; explicit "+ Create" row; reuses `note-chrome` atoms (EC-22)                 |
| `link-preview-card.tsx`  | `PreviewCard` — available-data target card (BSE-12)                                                             | no enrichment; degrade to title-only; never a dead card                                   |
| `*.test.ts(x)`           | `wikilink.test.ts` (pure) + `wikilink-picker.test.tsx` (states + create-on-miss) + `link-preview-card.test.tsx` | mirror S3 coverage                                                                        |

Reuses shipped: `note-chrome` (`Row`/`Icon`/`typeIcon`/`typeLabel`/`Eyebrow`) · Tamagui `Text`/`View` · the ① seam
(`resolveWikiLink`/`createPage`/`createPageLink`) · typed errors. **No new `@vida/ui` primitive** (§VI; feature panel).

## 4. Decisions — all DOC-RESOLVED

- **D-S4-1 — the `[[` trigger extension is ui-3, NOT fe-notes.** [FACT: e4-slash-menu.md:31 "separate suggestion
  surface"; interpretation IR-1/DELEGATES] → S4 builds the picker UI + compose; the editor trigger is a FILED ui-3 finding
  (parking lot). Demonstrated standalone via a `?picker` dev-gate (the `?sample` precedent).
- **D-S4-2 — create-on-miss is the explicit two-call compose in the UI** [FACT: NOT-19; IR-4; seam-contract.md:48-50].
  No `createNoteAndLink` service method exists or is invented. The "+ Create '<text>'" row is a distinct, explicit
  choice — a typo never silently creates a stray page. Surfaces `JournalExistsError`/`UnregisteredEntityTypeError` (IR-8).
  - **N1 — what pick/create DO in M1 (the picker↔link boundary):** `pick(candidate)` → `createPageLink(sourcePageId,
target_page_id)` (the stored `page_links` row — id-bound, NP-7); `createAndLink(title)` → `createPage('note',{title})`
    THEN `createPageLink`. The **editor-doc `[[token]]` INSERTION at the caret is the ui-3 trigger's job**, NOT fe-notes'
    (D-S4-1). So fe-notes owns the _stored link_ side (which S3's backlinks panel then reads); the inline editor token is
    ui-3. In M1 (no trigger) the compose is driven by the picker directly (dev-gate/live-hook), not by an editor caret.
- **D-S4-3 — candidates are id-bound, title-LIKE** [FACT: NOT-18/NP-7]. `resolveWikiLink(text)` → title-LIKE `PageRow`s;
  the picker binds a concrete `target_page_id` (rename-safe). Pure `toCandidates` maps rows → `WikiCandidate` view-model.
- **D-S4-4 — preview-card renders with available data (BSE-12)** [FACT: seam-contract.md:31]. Title + type from the
  candidate/target row; enrichment (snippet/thumbnail) deferred; absent data → title-only, never a dead/empty card.
  - **N2 — PreviewCard's real mount (hover on a `[[link]]` in the editor) is ALSO ui-3** (the trigger/hover surface); S4
    builds it presentational + demonstrates it standalone in the `?picker` harness. Its mount seam is ui-3, like the picker.
- **D-S4-5 — live service wiring deferred with the data plane** (S1-D2/F3) — honest-empty default + `?sample`; the live
  RQ query + mutations are the drop-in swap (zero-sig). React-Query keys: reads `['pages','resolve',query]`;
  mutations invalidate `['pages']` + `['links']` prefixes (prefix-safe — [[verify-a-cache-liveness-BR-against-the-runtime-config]]).
- **D-S4-6 — picker state ladder** `searching | empty | populated | error` (§VIII; S3 parity). "empty" still shows the
  "+ Create" row (empty candidates ≠ nothing to do — the create path is always available on a non-blank query).
  - **N3 — interactive §VIII states:** candidate rows + the create row are interactive → each carries `:focus-visible`
    ring + hover + `aria-selected` (the active option); keyboard ↑/↓/Enter/Esc drive selection (the listbox/combobox
    pattern `e4-slash-menu.md` documents). Not just static roles.

## 5. Envision coverage — S4's EC Visual-Gate MUSTs

| EC              | Requirement                                                                                                | S4 assertion                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **EC-10**       | `[[` picker shows title-LIKE candidates + an **explicit "+ Create '<text>'"**; create-on-miss never silent | Visual Gate: `?picker` sample shows candidate rows + a distinct "+ Create" row; create is a separate explicit choice |
| **EC-11**       | a link shows a **preview card**; enrichment deferred → renders with available data, no dead card           | Visual Gate: `PreviewCard` renders title+type (available data), never empty/dead                                     |
| **EC-22**       | Lucide icons, token-tinted                                                                                 | candidate rows + create row carry Lucide svg, tinted via CSS var                                                     |
| EC-16/17 (feel) | editorial calm                                                                                             | live per-slice Visual Gate (full-matrix AA)                                                                          |

## 6. Test plan

- `wikilink.test.ts` (pure): `toCandidates` maps rows→view-model (id-bound, type/title); the "+ Create" row model
  (present on non-blank query, absent on blank); dedup/ordering if any.
- `wikilink-picker.test.tsx`: `searching`/`empty`(+Create row present)/`populated`/`error`; pick → `onPick(target_page_id)`;
  "+ Create" → `onCreate(query)` (distinct from pick — explicit-choice gate); listbox a11y (role/option/aria-selected);
  keyboard nav; non-blank-query gate on the create row.
- `link-preview-card.test.tsx`: renders title+type; absent enrichment → title-only, no crash, no empty card.
- Compose test: `createAndLink` calls `createPage('note')` THEN `createPageLink` (order + two-call — IR-4); a thrown
  `JournalExistsError`/`UnregisteredEntityTypeError` surfaces (not swallowed — IR-8).
- Full `@vida/web` suite green (S2 lesson — full suite).

## 7. Blocking Visual Gate (real browser, after g2)

Brave via `PW_EXECUTABLE_PATH`; real app (onboarding → `/notes/1?sample&picker` mounts the picker open). 3 presets ×
light/dark × 375/768/1440:

- EC-10: candidate rows + a DISTINCT "+ Create '<query>'" row visible; create is a separate affordance.
- EC-11: `PreviewCard` renders available data (title+type), no dead card.
- EC-22: Lucide svg in the picker rows (tinted, both modes).
- Full-matrix **AA** on every text pair (candidate title, muted type/meta, create-row label) incl. warm reader-dark
  ([[contrast-test-must-be-full-matrix-not-light-only]]); exclude WCAG-disabled controls.
- `axe` 0 · 0 overflow 375 · console clean · MEASURED_OK + composite ancestor opacity
  ([[visual-gate-must-assert-measurement-and-composite-opacity]]).

## 8. Risks / findings

- **F-S4-1 (FILED FINDING — not built here):** the `[[` suggestion-surface editor extension (the trigger) is a **ui-3
  `@vida/editor` unit** (e4:31). Add to the task parking lot alongside EC-24; it lands as a separate ui-3 change that
  mounts `WikiLinkPicker`. Without it, the picker is demonstrated via the `?picker` dev-gate only (M1 honest posture).
- **R1 — "picker not integrated" could read as incomplete.** Mitigation: it is doc-mandated (D-S4-1); the slice ships a
  real, tested, gated component + compose, wired to the ① seam, exactly as NOT-19 homes the UI to P6. The integration
  seam (ui-3 trigger) is named, not hand-waved.
- **R2 — create-on-miss default type.** `createPage('note')` is fixed by NOT-19 ("creates a stub `note` page"); not a choice.

## 9. Performance budget (§XXII)

Pure `toCandidates` is O(n) over the resolveWikiLink result (title-LIKE, small). Picker is a short list; no virtualization
needed at M1 scale. Stated per §XXII; N/A-trivial for the stub.
