# Spec: component:ui-2-platform-views · V1 — list-view
<!-- type: component (unit sub-spec of ui-2-platform-views) -->
Status: implemented + Visual Gate PASS (Victor, 2026-08-10) — DONE
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/_index.md (shared BR-1..BR-6).

## 1. Identity
V1 `list-view` — the renderer for the `list` VIEW_LAYOUT `[FACT: packages/types/src/view.ts:18]`. A vertical,
data-driven list of rows over a heterogeneous item set. **This unit establishes the shared data-view spine**
(generic `items<T>` + `renderItem` + `getKey` + the 4 rendered terminal states) that V2–V4 reuse. Currently a
0-byte stub `[FACT: packages/ui/src/components/list-view.tsx = empty]`.

- **The desire:** one list renderer every module + every saved `views` row reuses, instead of a per-module list.
- **What it is NOT:** NOT interactive-row logic (the consumer's `renderItem` composes an interactive UI-1 `Card`
  when a row must be clickable — list-view owns layout + semantics + terminal states, not row activation). NOT
  selection, grouping, or virtualization (§6 deferrals). NOT a `<table>` (that's the `table` layout, unshipped).

## 2. Business Rules (V1 — instantiating the umbrella BR-1..BR-6)
- **LV-1 · Generic + slot-rendered (BR-1).** `items: readonly T[]` + `renderItem(item, index) => ReactNode` +
  `getKey(item, index) => string`. list-view maps items → row wrappers; the consumer owns row content. No entity
  shape is hard-coded. `getKey` is REQUIRED (stable UUIDv7 ids exist — conventions; never index keys).
- **LV-2 · Four rendered terminal states (BR-2), state is a PROP; the container ROLE is state-dependent (M2).**
  `state?: ViewState` (default `'success'`):
  - `loading` → container `role="list"` + `aria-busy="true"`; render `loadingCount` (default 5) **static skeleton
    rows** as `role="listitem"` with `aria-hidden` content (token-styled placeholder bar: `$colorSurfaceSecondary`
    + `$md` radius, NO shimmer — the UX-4 §3.1 recipe; the shared Skeleton component was superseded, DEF-U5-a).
    `[FACT: state-conventions.md §3.1]`
  - `empty` → **container `role="status"`** (NOT a `role="list"` with zero items — that trips axe "list has no
    items"): the `empty` slot, else a default muted "Nothing here yet." Empty is a first-class rendered state.
    `[FACT: ADR-007:91-92 "empty … is a first-class rendered state"]`
  - `error` → **container `role="status"`** (polite — the error is a statically-rendered terminal state, already
    derived + painted, NOT a live insertion; `role="alert"`/assertive would over-interrupt — Toast reserves that for
    its live-inserted danger region): the `error` slot, else a default muted "Couldn't load." A provider-error is a
    first-class rendered state; never a crash. `[FACT: ADR-007:91-92; §3.3.4; toast live-region precedent]`
  - `success` → container `role="list"` of `role="listitem"` rows via `renderItem`. (Empty `items[]` with
    `state==='success'` self-heals to the empty render + a dev-warn — LV-7; the app should pass `state='empty'`.)
  The four are the `deriveTerminalState` outputs; **only `empty` + provider-`error` are ADR-labeled "first-class
  rendered states"** (loading/success are states but not so labeled — ADR-007:91-92). `state` is typed by a LOCAL
  `ViewState` union (LV-3a), assignable from the app's `deriveTerminalState(...): TerminalState` by structural
  compatibility — the app derives, list-view renders (the package→app boundary, BR-2). `[FACT: terminal-state.ts:50]`
- **LV-3a · `state` is a LOCAL `ViewState` union — NO cross-package import (B1 fix, boundary-correct).**
  `type ViewState = 'loading' | 'empty' | 'error' | 'success'` declared in `@vida/ui`. The canon `TERMINAL_STATE`/
  `TerminalState` lives in `@vida/core` (`foundation/capability/types.ts:13`), but `@vida/ui` depends on **only
  Tamagui** (`packages/ui/package.json:44-46`) — importing from `@vida/core` would create a wrong-direction
  `ui→core` edge (business-logic/encryption/Drizzle into a pure-presentational package). Structural typing makes the
  app's `deriveTerminalState(...): TerminalState` **assignable to `ViewState`** with no import, so unification holds
  by structure, not by a coupling edge. `ViewState` also matches the existing views-layer name (UX-4 noted the canon
  is declared as `TerminalState`/views `ViewState`/`SearchStatus`). The proper canon→`@vida/types` consolidation
  (DB-9 convention: canonical enum tuples belong in `@vida/types`) is UX-4's **already-flagged owed cleanup** — NOT
  pulled into V1. `[FACT: packages/ui/package.json:44-46; packages/core/src/foundation/capability/types.ts:13;
  packages/types/src/CLAUDE.md DB-9]`
- **LV-3 · Compose tokens, base theme — NO bespoke sub-theme (refines umbrella §4).** Dividers = `$colorBorderDefault`;
  skeleton = `$colorSurfaceSecondary`; density insets = the `$space` scale. list-view needs **no view-specific color
  keys**, so it registers **no `light_/dark_ListView` sub-theme** (a sub-theme would require extending DS-5's
  `component.json`, out of UI-2's fence). Umbrella §4's "register a sub-theme per view" is therefore **conditional** —
  only views with bespoke color tokens (likely neural-graph) register one. `[INTERP: DEF-U8-h note; DS-5 fence]`
- **LV-4 · Density + dividers.** `density?: 'compact'|'default'|'spacious'` sets the **between-row GAP** on the list
  container (`gap: $8|$12|$24`, mirroring Card's padding scale) — **NOT per-row padding** (a row's inset is owned by
  its `renderItem` content, e.g. a Card's own padding; list-view adding row padding would double-pad). `dividers?:
  boolean` → each row `borderBottomWidth: 1` + `$colorBorderDefault` hairline (last row's border is cosmetically
  harmless; no special-case). Defaults: `default`, `false`. Skeleton-row height = a fixed `$24`-tall bar per row
  (density affects the gap, not the skeleton bar height — a stable placeholder). `[FACT: card.tsx:42-44 padding scale]`
- **LV-5 · A11y (BR-6).** Container role is state-dependent (LV-2): `list` in list/loading states, `status` (polite)
  for both empty + error. + `aria-label`/`aria-labelledby` (name); each row wrapper
  `role="listitem"`. list-view adds NO roving tabindex — focusables live inside `renderItem` (a row's interactive
  Card is Tab-reachable); this keeps list-view layout-only and avoids a listbox model it isn't. In `loading`,
  `aria-busy=true` + skeletons `aria-hidden`. `[FACT: WAI-ARIA list role; card.tsx interactive precedent]`
- **LV-6 · Motion.** None in V1 (a list needs no entrance animation; the skeleton→content swap is instant). Any
  future item-enter fade is B12 (opacity only) + reduced-motion `@media`. Documented, not built (avoid over-build).
- **LV-7 · Dev-warn on state/items contradiction (N3, the card.tsx guard precedent).** In `NODE_ENV!=='production'`,
  `console.warn` when `state==='success' && items.length===0` (should be `'empty'`) or when
  `state==='loading' && items.length>0` (stale). Makes the "app passes the derived state" contract enforceable, not
  advisory; DCE'd in prod. `[FACT: card.tsx:118-139 dev-guard precedent]`

## 3. Contract
```ts
// Local, boundary-pure (LV-3a). Structurally assignable from @vida/core's TerminalState.
export type ViewState = 'loading' | 'empty' | 'error' | 'success'

export interface ListViewProps<T> {
  /** The rows. Empty + state='success' self-heals to empty + dev-warns (LV-7). */
  items: readonly T[]
  /** Renders one row's CONTENT (list-view owns the role="listitem" wrapper). Compose an interactive Card here
   *  when the row is clickable. */
  renderItem: (item: T, index: number) => ReactNode
  /** Stable key per row (a UUIDv7 id). REQUIRED — never an index. */
  getKey: (item: T, index: number) => string
  /** Resolved state (the app derives via deriveTerminalState + passes it — BR-2). Default 'success'. */
  state?: ViewState
  /** Slot for state==='empty' (else a default). */
  empty?: ReactNode
  /** Slot for state==='error' (else a default). */
  error?: ReactNode
  /** Skeleton row count for state==='loading'. Default 5. */
  loadingCount?: number
  /** Row inset/gap. Default 'default'. */
  density?: 'compact' | 'default' | 'spacious'
  /** Hairline separators between rows. Default false. */
  dividers?: boolean
  /** React 19 ref-as-prop → the container element (B2: no forwardRef — a generic forwardRef erases <T>, and
   *  LV-5 makes list-view non-interactive so §111-115's forwardRef mandate doesn't apply). */
  ref?: Ref<HTMLDivElement>
  /** Accessible name for the list. */
  'aria-label'?: string
  'aria-labelledby'?: string
}
// A plain GENERIC function component — preserves <T> (forwardRef would erase it). React 19 spreads `ref` as a prop.
export function ListView<T>(props: ListViewProps<T>): ReactElement
```
- **8-state matrix (§VIII) — all 8 named, each covered or n/a-with-reason:**
  | State | Coverage |
  |-------|----------|
  | default | = `success` (LV-2) |
  | hover | n/a at container — a row's hover lives in `renderItem` (compose Card) |
  | focus | n/a at container — focusables are inside rows (LV-5); no roving |
  | active | n/a — container non-interactive (LV-5) |
  | disabled | n/a — container non-interactive |
  | loading | LV-2 skeleton ×N + `aria-busy` |
  | error | LV-2 `role="status"` slot/default |
  | empty | LV-2 `role="status"` slot/default |
  | (dark · responsive) | LV-3 base tokens cross dark; 375/768/1440 reflow |
- Sub-theme: none (LV-3). Exported from `index.ts`. `*.test.tsx` (jsdom) + `*.stories.tsx` (Visual-Gate surface).

## 4. Acceptance
- [ ] `ListView<T>` generic; `items`/`renderItem`/`getKey` render a `role="list"` of `role="listitem"` rows.
- [ ] All 4 terminal states render per LV-2 (loading skeleton ×N + aria-busy; empty slot/default; error slot/default;
      success items). A jsdom test asserts each.
- [ ] `density` + `dividers` variants apply token values (no raw numbers).
- [ ] Dark mode verified (base theme tokens cross); responsive at 375/768/1440.
- [ ] Storybook story covers all 4 terminal states + density + dividers, both themes → **component Visual Gate PASS**.
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green (+ new list-view tests); root typecheck 10/10.
- [ ] §XXIX: `packages/ui/src/CLAUDE.md` gains the list-view paragraph + the data-view-spine note.

## 5. Implementation Prompt (ordered)
1. **Types** — local `type ViewState`; `ListViewProps<T>` (incl. `ref?: Ref<HTMLDivElement>`); plain generic
   `function ListView<T>` (NO forwardRef — B2). No cross-package import (LV-3a).
2. **styled hosts** — `ListRoot` (**`role` set per state**: `list` for loading/success, `status` for empty AND
   error; `flexDirection:'column'`, density variant → `$space` GAP `$8/$12/$24`, not padding), `ListRow`
   (`role="listitem"`; dividers variant → `borderBottomWidth:1` + `$colorBorderDefault`), `SkeletonRow`
   (`$colorSurfaceSecondary`, `$md` radius, **fixed `$24` height**). Color→theme keys, dimension→token scale (DEF-U8-h).
3. **State switch** (LV-2) — `loading`→`role="list" aria-busy` + N `SkeletonRow role="listitem"` (aria-hidden inner);
   `empty`→`role="status"` slot||default; `error`→`role="status"` slot||default; `success`→`role="list"` +
   `items.map`→`ListRow role="listitem" key={getKey(item,i)}` wrapping `renderItem`. `.map` yields a defined `T` (no
   `items[i]` indexing → `noUncheckedIndexedAccess`-safe; if any index access is needed, guard it per tabs.tsx:234).
   Spread `ref` onto `ListRoot`.
4. **A11y + dev-guards** — name via `aria-label`/`labelledby`; dev-warn if success-list has no accessible name
   (Card precedent) AND on the LV-7 state/items contradiction.
5. **Tests** (jsdom) — the 4 states incl. the state-dependent container role (list / status); getKey used (not
   index); density/dividers class/style; `aria-busy` in loading; ref forwarded to the container; LV-7 dev-warns fire.
6. **Story** — a fixture `items` (e.g. `{id,title}`), `renderItem` → an interactive `Card`; a control to flip `state`.
7. **Export** + CLAUDE.md paragraph.

## 6. Deferred (documented — NOT built in V1, added when a consumer needs them)
- **Selection** (`selectedKeys`/`onSelect` + `role="listbox"`/`option` + roving) — a distinct interaction model; add
  when a module needs multi-select.
- **Grouping** (ADR-007 §3.3.3 group-by) — applied after filter, independent of layout; a `sections?` prop later.
- **Virtualization** — for very long lists (years of transactions); a perf seam. V1 renders all rows; the saved-view
  layer paginates/limits. Flag if a consumer hits a perf wall. `[INTERP: ADR-001:124 chose canvas for large charts;
  lists rely on the query limit]`

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-09 | ui-2-platform-views | V1 sub-spec authored at PLAN (establishes the data-view spine; gate-1 next) |
| 2026-08-09 | ui-2-platform-views | Rev 2 — gate-1 critique REVISE→fixed: B1 (local `ViewState`, no `@vida/core` edge), B2 (React-19 ref-prop, no forwardRef), M1 (8-state matrix explicit), M2 (state-dependent container role), M3 (ADR paraphrase tightened), N1 (umbrella §4 conditional sub-theme), N3 (LV-7 dev-warn) |
| 2026-08-09 | ui-2-platform-views | preflight PASSED +2 folds (density=between-row gap not padding; skeleton fixed `$24`); tokens verified emitted. Gate-2 critique **SHIP** +3 minors folded: error role `alert`→`status` (statically-rendered, not live), §5 skeleton-height wording, noUncheckedIndexedAccess guard note. **Approval 2 pending.** |
