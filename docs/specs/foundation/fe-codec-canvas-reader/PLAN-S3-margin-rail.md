# PLAN — S3 · Margin rail (annotations)

> Entity Delivery Flow ② · per-slice §XXVI PLAN (gate 1). Slice S3 of 6. Home: `@vida/ui` (extends `canvas-reader.tsx`).
> Grounded in `delivery/seam-contract.md` §A (annotation props + the IR-1 rule) + `delivery/envision.md` EC-5/6/14 +
> `delivery/interpretation.md` IR-1/IR-2/IR-8/IR-10. Completes the **living-margin** layout: S2 added the left (Contents)
> zone; S3 adds the **right (annotations) zone** — the "living margin" the whole concept is named for.

## §1 · Context
The margin rail is where annotations live beside the text. It renders annotations **grouped by chapter** (EC-14),
**N-per-nature** (IR-10), the three natures **visually distinct** (EC-6), each row showing its **pre-resolved location**
(IR-8 — the shell never parses `position`), under the **IR-1 affordance rule** (a highlight is never linkable). It is the
third and final Body zone (Contents ∣ reading column ∣ **rail**); at 375 it stacks below the column (EC-9).

## §2 · Business rules (S3 scope)
- **BR-S3-1 (pre-grouped, EC-14 + IR-8):** the rail renders `annotationGroups: AnnotationGroup[]` (chapter groups the
  **adapter builds** — S6), NOT a flat list it groups itself. The shell **never groups/sorts/parses** — the board-view /
  list-view `sections` precedent ("the renderer never groups"; `CLAUDE.md` board-view + list-view `sections`). Chapter
  derivation (TOC page-range) + an "unplaced" bucket for a null/unresolved `position` are S6's, not the shell's.
- **BR-S3-2 (IR-1 shell-enforced, EC-5 — the load-bearing checkpoint):** a row's affordances derive from
  `linkable = nature !== 'highlight'`. **Add-note** renders iff `linkable && onAddNote`; **Link** iff
  `linkable && onLinkAnnotation`. A `highlight` row shows **neither, regardless of whether the handlers are passed**. The
  Visual Gate FAILS if a highlight renders a link/note action. (`AnnotationNotLinkableError` is thus unreachable from the
  UI — the service throw becomes dead defence.)
- **BR-S3-3 (three distinct natures, EC-6 + accessibility):** each row carries a **nature label** (`Highlight` /
  `Bookmark` / `Quote`, `$caption` uppercase eyebrow) — the **non-colour** signal (WCAG: colour is never the sole means) —
  **plus** a per-nature **accent marker** differentiated by SHAPE/FILL (highlight = filled accent block · bookmark =
  outlined accent · quote = accent left-bar), satisfying EC-11 "accent on the markers". **Token-pure: no accent-surface
  tint** (no such token — the list-view P1 lesson); accent lives in the marker + current-signal only. **The markers are
  GRAPHICAL OBJECTS → they carry the §XIV 3:1 floor** (not the 4.5 text floor): the outlined (bookmark) + bar (quote)
  variants in particular must clear **≥ 3:1 against their surface** in both modes × 3 presets — asserted at the gate.
- **BR-S3-3a (text excerpt is bounded):** the annotation `text` excerpt is **line-clamped to 3 lines via Tamagui
  `numberOfLines={3}`** (the house idiom — tabs/menu/select; maps to line-clamp on RNW; NOT raw `-webkit-line-clamp`) so a
  long quote can't balloon the ~280px rail row — the rail stays scannable (§I negative space / §III measure). The full
  text lives in the opened annotation note (S6 intent), not the rail.
- **BR-S3-4 (location, EC-14 + IR-8):** each row renders `annotation.location` as a **ready `ReactNode`** (e.g.
  "Ch. 4 · p. 56 · line 12") — `$caption` muted. The shell does **not** parse `position` or derive the chapter (S6's job).
- **BR-S3-5 (counts + scale, EC-14 / IR-10):** the rail header states a **total count** ("8 annotations"); each chapter
  group eyebrow states its **per-chapter count**. Scales to many — **no cap, non-virtualized** (the page scroll carries
  it). The §XIII ">100 → virtualize" case is **deferred to the data/collection layer**, consistent with every shipped
  UI-2 presentational renderer (list-view et al. are non-virtualized); documented here as a stated decision, not an
  omission.
- **BR-S3-6 (terminal states, BR-2):** `annotationsState?: ViewState` (loading / empty / error / success; **NOT**
  `ReaderState` — annotations have no access-`unavailable` concept, which is reading-file-specific). loading → skeleton
  rows (`aria-busy`) · empty → a teaching `EmptyState` ("No annotations yet") · error → `role="status"` muted · success →
  the grouped list. The app derives + threads the state (BR-2); `success` with no groups degrades to the empty teaching.
- **BR-S3-7 (toggle, R5 app-owned):** `railOpen?` (default `true` when annotations exist) + `onToggleRail`; an
  "Annotations" header toggle (`aria-pressed`, beside "Contents" — the collection switcher precedent). Rail renders only
  when open.
- **BR-S3-8 (layout/reflow, EC-9):** the rail = the **right zone** of the Body flex-wrap row (mirrors `ContentsZone`:
  `flexBasis:280 minWidth:220 flexShrink:1` + `borderLeftWidth:1` + `paddingLeft:'$16'`); at 375 it **stacks below** the
  column (flexWrap). Body `justifyContent` is `flex-start` when **either** zone (Contents or rail) is present (else center).
- **BR-S3-9 (intents, never writes — IR-5):** `onAddNote(id)` / `onLinkAnnotation(id)` emit intents only; the shell owns
  no write (the flow-session / pomodoro precedent). The adapter (S6) binds them to `openAnnotationNote` / `linkAnnotations`.
- **BR-S3-10 (a11y):** the rail is a labeled region (`role="region"` `aria-label="Annotations"` — the `ContentsPanel`
  precedent); each chapter group is a `role="list"` `aria-labelledby` its `useId`-keyed eyebrow id; each annotation a
  `role="listitem"`; affordances are ui-1 `Button`s (own a11y). `warnMissingName` unaffected (S1 names the root region).
- **BR-S3-11 (tokens/type/motion, EC-10/11):** DIRECT semantic tokens; semantic type scale (no px); designed dark;
  accent (marker + current-signal) **flips per preset**; AA full-matrix incl. warm-dark; no new motion (static rail).

## §3 · Contract (added to `CanvasReaderProps`)
```ts
type Nature = 'highlight' | 'bookmark' | 'quote'
// location is ALREADY RESOLVED by the adapter (S6) — the shell only renders it (EC-14; no parsing in @vida/ui).
interface ReaderAnnotation { id: string; nature: Nature; text: ReactNode; location: ReactNode }
// pre-grouped by chapter (the board-view/list-view `sections` shape); the adapter builds the groups.
interface AnnotationGroup { id: string; title: ReactNode; annotations: ReaderAnnotation[] }

// + on CanvasReaderProps:
annotationGroups?: AnnotationGroup[]
annotationsState?: ViewState            // loading|empty|error|success (NOT ReaderState); default 'success'
railOpen?: boolean                      // default true when annotations exist; app owns the state
onToggleRail?: () => void
onAddNote?: (annotationId: string) => void        // SHELL ENFORCES IR-1: never offered on a highlight
onLinkAnnotation?: (annotationId: string) => void // ditto — bookmark & quote only
```

**Two `/contract` refinements from the PROPOSED seam-contract** (types there are explicitly "PROPOSED — refined per slice"):
1. **flat `annotations?: ReaderAnnotation[]` → pre-grouped `annotationGroups?: AnnotationGroup[]`.** EC-14 requires
   grouping by chapter, and a flat array of `{location: ReactNode}` carries **no chapter key** to group by; the shell is
   presentational and must not derive/sort (BR-S3-1, board/list-view precedent). The adapter already derives the chapter
   (TOC page-range) → it owns grouping. **NET: the shell consumes groups; S6 produces them.**
2. **`annotationsState: ReaderState` → `ViewState`.** `unavailable` is a reading-file access concept (IR-NEEDS-4), not an
   annotations concept — the honest, minimal type is the 4-state `ViewState` the rail actually uses.

## §4 · Acceptance (Visual Gate MUSTs)
- **EC-5 (IR-1):** a highlight row shows **NO** Add-note/Link; a bookmark & a quote show both (handlers passed). The gate
  FAILS on a highlight affordance.
- **EC-6:** the three natures are **visually distinct** (nature label + shape-differentiated accent marker), each with its
  location.
- **EC-14:** annotations **grouped by chapter**, with **counts** (total + per-chapter), **N-scale** (many per nature), each
  row's **resolved location** rendered.
- the living-margin reads (Contents ∣ column ∣ rail) · 375 reflow (rail stacks below, no overflow, EC-9) ·
- dark × 3 presets · **accent flips** on the markers (EC-10) · **text AA MEASURED 0-fail incl. warm-dark** ·
- **nature markers ≥ 3:1 graphical-object contrast** (fill/outline/bar, both modes × 3 presets) · quote bar reads
  distinct from the `RailZone` left border ·
- **text excerpt clamped to 3 lines** (no row balloon) ·
- rail terminal states (loading skeleton `aria-busy` · teaching empty · `role=status` error) · toggle shows/hides ·
- tsc 0 · eslint 0 · tests green · **axe 0**.

## §5 · Implementation prompt
1. `canvas-reader.tsx` —
   - add `Nature` · `ReaderAnnotation` · `AnnotationGroup` types (exported) + the 6 props.
   - styled hosts: `RailZone` (mirror `ContentsZone`, `borderLeftWidth` + `paddingLeft`) · `NatureMarker` (variants
     `highlight`/`bookmark`/`quote` — shape/fill, accent; markers = graphical objects, verify ≥3:1) · an annotation
     `RowHost` whose `text` is **3-line clamped** (`-webkit-line-clamp:3`/`overflow:hidden`).
   - `AnnotationRail` sub-component: labeled `role="region"` "Annotations" → header (`PanelLabel` "Annotations" + total
     count) → per-chapter group (`role=list` `aria-labelledby` eyebrow `useId`; eyebrow = `title` + per-chapter count) →
     `AnnotationRow` (marker + nature label + location + `text`; affordances gated by `linkable = nature!=='highlight'` and
     handler-presence → ui-1 `Button` size="sm" intent="ghost" "Add note" / "Link", emit `onAddNote`/`onLinkAnnotation(id)`).
   - a `RailBody` state switch (mirror `ReadingBody`): loading skeleton (`aria-busy`) · empty `EmptyState`
     (`titleLevel={3}` — nested sub-region, keeps the doc outline correct) · error `role=status` muted · success → the
     grouped list (success + no groups → empty teaching).
   - insert `<AnnotationRail>` as the Body's **right** zone when `showRail`; add the "Annotations" header toggle in
     `MetaToggles`; set Body `justifyContent` = `flex-start` when `showContents || showRail`, else `center`.
2. Stories (greybox retired — real component): `MarginRail` (reader + rail, 3 natures across ≥2 chapters, counts) ·
   `RailManyAnnotations` (N-scale, IR-10) · `RailStates` (loading/empty/error) · `Rail375` (reflow — rail stacks). Fake
   groups with a highlight (no affordances) beside a bookmark+quote (both affordances).
3. Tests (extend `canvas-reader.test.tsx`): groups render (role=list per chapter, listitems) · nature labels present for
   all three · **IR-1: highlight renders NO Add-note/Link even with handlers; bookmark/quote render both** · onAddNote /
   onLinkAnnotation emit the id · total + per-chapter counts · annotationsState loading(`aria-busy`)/empty(EmptyState)/
   error(role=status) · toggle hides/shows (onToggleRail, `aria-pressed`) · rail region named "Annotations".
4. tsc + eslint + test → **blocking Visual Gate** (Brave via Playwright, `/tmp/gate-s2.mjs` pattern, 3 presets ×
   light/dark + 375; assert EC-5/6/14 + measured AA + axe) → §XXIX (`packages/ui/src/CLAUDE.md` canvas-reader entry +
   `docs/specs/components/ui-2-platform-views/canvas-reader.md` S3 block).

## Deviations / open
- The two §3 `/contract` refinements (flat→grouped · ReaderState→ViewState) are the only departures from the PROPOSED
  seam-contract — both grounded above, both within "refined per slice". No §XXVIII deviation (the ratified artifacts are
  the ECs/IRs, which these satisfy).
- Nature **markers are shape-differentiated accent Views + labels, not an icon set** — EC-15 (real SVG icons) is scoped to
  S5/S4 (listen + selection controls), not the rail; S3 stays icon-set-free + emoji-free + token-pure.
- The annotation `text` excerpt + the "unplaced" bucket are the adapter's data concerns (S6); S3 renders what it's given.
- `AnnotationGroup` uses `{ id, title, annotations }` — a deliberate divergence from the sibling `{id,title,items}`
  (`ListSection`/`BoardGroup`) for domain clarity (the field holds annotations, not generic items). Intentional, noted.
