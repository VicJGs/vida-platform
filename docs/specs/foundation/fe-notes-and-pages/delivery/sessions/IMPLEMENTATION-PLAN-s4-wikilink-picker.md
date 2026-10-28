# IMPLEMENTATION-PLAN — S4 · `[[` picker + create-on-miss + preview-card

> fe-notes-and-pages (② unit #27) · slice S4 · LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Gate-2 artifact** (Approval-1 PLAN approved). Build strictly from §3; divergence → §XXVIII. Every contract line
> FACT-grounded. Pairs with `PLAN-s4-wikilink-picker.md`.

## 1. Grounding ledger

| Claim                                                                                                     | Source                                             |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `resolveWikiLink(text) → PageRow[]` (title-LIKE, non-null title, non-deleted; id-bound NP-7)              | seam-contract.md:47; current-spec.md:38            |
| `createPage(input: CreatePageInput) → PageRow`; throws `JournalExistsError`/`UnregisteredEntityTypeError` | seam-contract.md:27; current-spec.md:23            |
| `CreatePageInput = { type: PageType; title?: string\|null; … }` (all but `type` optional)                 | validators/note.ts createPageSchema                |
| `createPageLink(sourcePageId, targetPageId, context?) → PageLinkRow` (idempotent)                         | seam-contract.md:43                                |
| create-on-miss = EXPLICIT caller compose `createPage('note')` then `createPageLink` — NO bundled method   | seam-contract.md:48-50; NOT-19; IR-4               |
| `PageRow` has `{ id, type, title(nullable), icon(nullable), … }`                                          | schema/notes.ts pages (type:5, title:7, icon:16)   |
| the `[[` trigger = ui-3 "separate suggestion surface", UNBUILT; fe-notes doesn't author editor ext        | e4-slash-menu.md:31; interpretation IR-1/DELEGATES |
| preview-card renders available data, enrichment deferred                                                  | seam-contract.md:31 (BSE-12)                       |
| typed errors surfaced at the affordance, not swallowed                                                    | IR-8; seam-contract.md:70-74                       |
| `@vida/core` doesn't re-export Row types → structural `*Like` inputs (PageLike precedent)                 | canvas-editor/page-binding.ts:16                   |
| M1 no live composition root → honest-empty + `?sample`                                                    | use-note-entity.ts:5 (S1-D2/S2/S3)                 |

## 2. Contracts (exact signatures)

### 2a. `apps/web/src/notes/wikilink.ts` (pure — no React, no @vida/core)

```ts
import type { PageType } from '@vida/types'

// Structural projection of a resolveWikiLink PageRow (the PageLike precedent).
export interface PageRowLike {
  id: string
  type: PageType | string
  title: string | null
  icon?: string | null
}

export interface WikiCandidate {
  id: string
  type: PageType | string
  title: string
  icon: string | null
}
export interface CreateRow {
  query: string
} // the "+ Create '<query>'" row model

// Map resolver rows → candidates (defensively drop null/blank titles; resolveWikiLink already excludes null).
export function toCandidates(rows: PageRowLike[]): WikiCandidate[]
// The create-on-miss row: present iff the query is non-blank (a typo still offers Create; blank offers nothing).
export function createRowFor(query: string): CreateRow | null

// The create-on-miss two-call compose (IR-4) — explicit, order-guaranteed, typed-error-propagating. Pure over
// injected fns (testable with mocks; the live hook passes service.createPage/createPageLink). Returns new page id.
export async function createAndLink(
  createPage: (input: { type: 'note'; title: string }) => Promise<{ id: string }>,
  createPageLink: (sourcePageId: string, targetPageId: string) => Promise<unknown>,
  sourcePageId: string,
  title: string,
): Promise<string> // = const p = await createPage({type:'note',title}); await createPageLink(sourcePageId, p.id); return p.id
```

`createAndLink` does NOT catch — `JournalExistsError`/`UnregisteredEntityTypeError` propagate to the caller (the hook)
which surfaces them (IR-8). The two awaits are sequential + ordered (create THEN link); a failed create never links.

### 2b. `apps/web/src/notes/use-wikilink-picker.ts` (data seam — stub-disciplined)

```ts
export type PickerState = 'searching' | 'empty' | 'populated' | 'error'
export interface WikiLinkPickerResult {
  query: string
  setQuery: (q: string) => void
  candidates: WikiCandidate[]
  createRow: CreateRow | null
  state: PickerState
  error: string | null
  pick: (targetPageId: string) => Promise<void> // createPageLink(sourcePageId, target)
  createAndLinkTitle: (title: string) => Promise<void> // createAndLink(...) → new note + link
}
export function useWikiLinkPicker(sourcePageId: string): WikiLinkPickerResult
```

- `query`/`setQuery` = local `useState`. M1 default: empty candidates (honest — no live resolver). `?sample` (DEV) →
  a sample candidate set (≥2 title-LIKE rows of mixed type) so the gate shows `populated`; blank query → `empty` (create
  row only if non-blank). `state` = `searching` (live in-flight) | `empty` (no candidates) | `populated` | `error`.
- `pick`/`createAndLinkTitle`: M1 default = no-op resolve (no live service). Their params + `sourcePageId` are unused in
  the stub → **`_`-prefix** them (`_sourcePageId`/`_targetPageId`/`_title`; the S3 `_entityType` convention — `noUnusedParameters`
  exempts `_`; call site `useWikiLinkPicker(page.id)` unchanged; the live swap un-prefixes in-body). Live swap (zero-sig):
  `pick` → `createPageLink(sourcePageId, target)`; `createAndLinkTitle` → `createAndLink(notes.createPage,
notes.createPageLink, sourcePageId, title)`; both wrapped to set `error` from a caught typed error (IR-8), then
  invalidate `['pages']`+`['links']` (prefix-safe). React-Query read key `['pages','resolve',query]` (live).

### 2c. `apps/web/src/notes/wikilink-picker.tsx` (presentational split — the NoteEntityView precedent)

```ts
export function PickerView(props: {
  query: string
  candidates: WikiCandidate[]
  createRow: CreateRow | null
  state: PickerState
  onPick: (targetPageId: string) => void
  onCreate: (query: string) => void
}): JSX.Element
export function WikiLinkPicker({ sourcePageId }: { sourcePageId: string }): JSX.Element
```

`WikiLinkPicker` = `const p = useWikiLinkPicker(sourcePageId); return <PickerView … onPick={p.pick} onCreate={p.createAndLinkTitle} />`.
`PickerView` is a **listbox** (`role="listbox"`, `aria-label="Link to page"`): candidate rows `role="option"` (Icon
`typeIcon(c.type)` + title `$body` + muted type `typeLabel(c.type)`) + the **distinct create row** `role="option"`
(a `Plus` Lucide + "Create '<query>'") when `createRow`. States: `searching` → muted "Searching…" (`aria-busy`);
`error` → muted `role=status`; `empty` → the create row alone (non-blank) or muted "Type to search pages" (blank);
`populated` → options + create row. Internal `selectedIndex` (useState) drives highlight + `aria-selected`; keyboard
↑/↓ (wrap) move, Enter activates the selected option (pick or create), Esc is a no-op handler (dismiss = host/ui-3).
Each option: `:focus-visible` ring + hover (§VIII, N3). Direct semantic tokens; `note-chrome` atoms (EC-22).

### 2d. `apps/web/src/notes/link-preview-card.tsx` (presentational)

```ts
export function PreviewCard({ target }: { target: WikiCandidate }): JSX.Element
```

A small card: Icon `typeIcon(target.type)` + title `$body` + muted `typeLabel(target.type)` — **available data only**
(BSE-12; no snippet/thumbnail). Never empty/dead: a WikiCandidate always has a title. `role="group"` + `aria-label`.

### 2e. `apps/web/src/notes/note-entity.tsx` (edit — the DEV-gate mount, B1)

Add a DEV-only `?picker` branch in `NoteEntityView`: when `devPickerActive()` (NODE_ENV≠production + `?picker` param),
**wrap the `EntityView` return** in a fragment and render `<WikiLinkPicker sourcePageId={page.id} />` as a **sibling
overlay** (a positioned `View`, scrim-free, DEV-only, above the page content so the gate can see it). Off in prod
(dead-code-eliminated). This is the Visual-Gate mount; the real caret-anchored trigger is ui-3. `devPickerActive`
mirrors `use-note-entity.ts:59` (`?picker` not `?sample`).

## 3. Build steps (strict order; TDD per unit)

- [ ] **B1** — `wikilink.ts` (§2a) + `wikilink.test.ts`: `toCandidates` (drop null/blank), `createRowFor` (blank→null,
      non-blank→row), `createAndLink` (order: create THEN link; returns new id; a create-throw never links; link-throw
      propagates). Mocks for the two fns.
- [ ] **B2** — `use-wikilink-picker.ts` (§2b) + sample fixture (≥2 candidates, mixed type).
- [ ] **B3** — `wikilink-picker.tsx` (`PickerView` + `WikiLinkPicker`) + `wikilink-picker.test.tsx` (4 states; option
      roles; create row distinct + non-blank-gated; onPick/onCreate fire; keyboard ↑/↓/Enter; selected a11y).
- [ ] **B4** — `link-preview-card.tsx` + `link-preview-card.test.tsx` (renders title+type; available-data only; no dead card).
- [ ] **B5** — edit `note-entity.tsx` (§2e, `?picker` DEV mount); extend `note-entity.test.tsx` only if needed (dev-gate off by default → existing tests unaffected).
- [ ] **B6** — `tsc` 0 · `eslint` 0 · **full `@vida/web` suite** green.
- [ ] **B7** — blocking **Visual Gate** (PLAN §7): Brave, `/notes/1?sample&picker`; 3 presets × L/D × {375,768,1440};
      EC-10 (candidates + distinct Create row), EC-11 (PreviewCard available-data), EC-22 (Lucide), AA full-matrix incl.
      warm-dark, axe 0, no overflow, MEASURED_OK + composite opacity.

## 4. Acceptance (DoD — §XXII)

- [ ] `[[` picker shows title-LIKE candidates + an explicit, distinct "+ Create '<text>'" (never silent — NOT-19/EC-10).
- [ ] create-on-miss = `createPage('note')` THEN `createPageLink` (ordered two-call compose — IR-4), typed errors
      surfaced not swallowed (IR-8); `pick` → `createPageLink` (the stored link).
- [ ] PreviewCard renders available data, never a dead card (EC-11/BSE-12).
- [ ] 4 states (§VIII) + interactive option states (focus-visible/hover/selected) + keyboard nav + listbox a11y.
- [ ] TS strict (0 any / 0 non-null / 0 suppressions); pure core 100% covered (§XIX).
- [ ] tsc 0 · eslint 0 · full `@vida/web` suite green · Visual Gate PASS.
- [ ] §XXIX currency: task slice-log + build-step + TASKS.md; **F-S4-1 editor-trigger finding added to the parking lot**.

## 5. Out of scope (no pull-forward — §XXVIII)

The `[[` suggestion-surface editor extension (ui-3) · the editor-doc `[[token]]` insertion · PreviewCard's in-editor
hover mount (ui-3) · live resolveWikiLink/create wiring (data plane) · preview enrichment (M1.1+) · the `/entity-link`
slash block · content/Yjs · FTS5.
