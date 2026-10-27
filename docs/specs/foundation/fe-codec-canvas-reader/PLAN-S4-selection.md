# PLAN — S4 · Selection affordance

> Entity Delivery Flow ② · per-slice §XXVI PLAN (gate 1). Slice S4 of 6. Home: `@vida/ui` (extends `canvas-reader.tsx`
>
> - the barrel). Grounded in `delivery/seam-contract.md` §A (the 4 `on*Selection` + the highlight mark) + `envision.md`
>   EC-4/EC-3/EC-12/EC-15 + `interpretation.md` IR-NEEDS-3 (the body is a consumer slot the shell does not own/parse).

## §1 · Context

The way an annotation is **born**: selecting a passage offers Highlight · Quote · Bookmark (+ Listen-from-here), and a
highlighted span reads as a **marked inline span** within the text. This is the first slice that must reconcile a hard
architectural fact: **the reading body is the consumer's `renderContent` slot — the shell does not render, own, or parse
it** (IR-NEEDS-3 / ORG DELEGATES). So the shell cannot detect a browser text-selection or anchor to a `Range` inside the
body. The selection UI must therefore be **presentational pieces the consumer composes at the selection** (they own the
`Range`), not a shell-positioned overlay.

## §2 · The surfacing model (the S4 design decision — doc-resolved, confirm at Approval 1)

**DECISION: export two presentational pieces the consumer composes in `renderContent`; CanvasReader gains NO selection
props.** Grounded:

- **IR-NEEDS-3 / ORG-DELEGATES:** the shell renders the body via a slot and does not parse it → it has no `Range`, cannot
  know a selection exists or where it is, cannot anchor an overlay to it.
- **EC-12 (feel): "immediate + in-place, not a buried form"** → the action set must sit _at the selection_; only the
  consumer (who owns the `Range` in `renderContent`) can place it. A shell-rendered top-of-column bar would be exactly the
  "buried form" EC-12 warns against.
- **Envision greybox note:** "the real affordance is a **selection popover**" — i.e. consumer-anchored.
- ⟹ The shell SHIPS the action-set + the mark as composable pieces; the consumer renders `SelectionActions` inside its own
  `Popover` anchored to the `Range`, and wraps highlighted spans with `ReaderHighlightMark` — both INSIDE `renderContent`.

**/contract refinement:** the seam-contract's 4 `on*Selection` were PROPOSED on `CanvasReaderProps`; the slot boundary
moves them onto **`SelectionActions`** props (the shell can't host selection UI positioned within a slot it doesn't
render). Same "proposed-per-slice" clause as S2/S3.

_(Rejected alternative — "CanvasReader renders a controlled `selectionActive` bar": keeps the callbacks on the main props
but violates EC-12 in-place feel [a bar can't anchor to the Range] and asks the shell to own selection UI over a body it
doesn't render. Doc-contrary.)_

## §3 · Business rules (S4 scope)

- **BR-S4-1 (SelectionActions = the birth action set, EC-4):** an exported `role="toolbar"` of up to four icon Buttons —
  **Highlight · Quote · Bookmark** (the three natures, IR-2) **+ Listen-from-here**. Each button renders **only when its
  handler is passed** (the `collection onFilter` / shell render-when-handler precedent); emits its intent, **never writes**
  (IR-5). The toolbar is named (`aria-label`, default "Turn selection into").
- **BR-S4-2 (real icons, EC-15):** each action is an **inline SVG** icon (the `icons/` dir is empty → no icon-set dep; the
  pomodoro `ProgressRing` / button-spinner inline-SVG precedent) — **never an emoji**. Icons are `aria-hidden`; the
  Button's `aria-label` carries the name (the icon-only-Button contract). SVG uses `currentColor` so it adopts the
  Button's intent colour.
- **BR-S4-3 (Listen-from-here degrades, IR-7):** the Listen-from-here action renders only when `onListenFrom` is passed
  AND `listenAvailable !== false`; when TTS is unavailable it is **omitted** (not an error) — the full listen _states_
  are S5's, S4 only gates the birth action.
- **BR-S4-4 (ReaderHighlightMark = the inline mark, EC-3):** an exported inline component that wraps a highlighted span so
  it **reads as marked within the text** — a **2px accent underline** (`borderBottomWidth: 2` + `borderBottomColor:
$colorBrandPrimary`, the calendar `TodayMark` / list-tick precedent; **≥2px** so it reads as a deliberate mark and clears
  the ≥3:1 graphical floor reliably across all 6 cells — a 1px hairline is too thin), **text held at `$colorTextPrimary`**
  so body AA is unaffected (the "mark the chrome, hold the text" rule). **Token-pure: no accent-surface bg tint** (no such
  token — the list-view P1 lesson; an accent background would be M4 palette churn). The mark is a graphical object → ≥3:1.
- **BR-S4-5 (universal, no web-only elements):** `ReaderHighlightMark` is a styled `Text` span, **not** a native `<mark>`
  (web-only; @vida/ui is universal — the RN target has no `<mark>`). No special ARIA (EC-3 is a visual mark; the text is
  read normally).
- **BR-S4-6 (a11y, §XIV):** `SelectionActions` = `role="toolbar"` + named; each action a ui-1 `Button` (own focus ring +
  keyboard activation + required `aria-label`). **Keyboard model = plain Tab-stops, NOT roving** (the collection-view
  switcher `role="toolbar"` precedent, `collection-view.tsx:216` — a 2–4 button toolbar is a defensible Tab-stop group; the
  gate asserts axe-clean against that model). Reduced-motion: no new motion in S4.
- **BR-S4-6a (touch target, §X — B1 fix):** the icon-only actions use **`size="lg"` (48px height ≥ 44×44)** — NOT `size="sm"`
  (32px, below the §X / WCAG 2.5.5 floor); this is the primary annotation-birth affordance on the universal (mobile) target.
  `button.tsx:62` `lg = $48`; icon-only width = `paddingHorizontal $20 ×2 + 16px` ≈ 56px → clears 44×44.
- **BR-S4-6b (375 reflow):** the toolbar is a single `flexWrap` row — it must **wrap cleanly, never overflow a narrow
  column** (the flow-session `AffordanceRow` lesson: a nested non-wrapping sub-row overflowed at 375 because RNW
  `flexShrink` defaults to 0; CLAUDE.md). 4 × 48px icon buttons fit 375 trivially; the rule guards against regressions.
- **BR-S4-7 (tokens/type, EC-10/11):** DIRECT semantic tokens; accent on the icons + the mark (flips per preset); AA
  full-matrix incl. warm-dark (button labels are aria-only; icon + mark carry the graphical 3:1 floor).
- **BR-S4-8 (CanvasReader unchanged for selection):** no new `CanvasReaderProps`; the consumer composes `SelectionActions`
  - `ReaderHighlightMark` inside `renderContent`. Both are added to the package barrel.

## §4 · Contract (new exports — NOT on `CanvasReaderProps`)

```ts
interface SelectionActionsProps {
  onHighlight?: () => void
  onQuote?: () => void
  onBookmark?: () => void
  onListenFrom?: () => void
  listenAvailable?: boolean // default true; false ⇒ Listen-from-here omitted (IR-7)
  'aria-label'?: string // default "Turn selection into"
  ref?: Ref<HTMLDivElement>
}
function SelectionActions(props: SelectionActionsProps): JSX.Element

interface ReaderHighlightMarkProps {
  children: ReactNode
}
function ReaderHighlightMark(props: ReaderHighlightMarkProps): JSX.Element
```

## §5 · Acceptance (Visual Gate MUSTs)

- **EC-4:** the action set offers Highlight · Quote · Bookmark (+ Listen-from-here); each emits its intent.
- **EC-15:** every control is a **real inline SVG icon**, never an emoji (gate asserts `<svg>` present, 0 emoji).
- **EC-3:** a `ReaderHighlightMark` span reads as a **marked inline span** (accent underline) within body text, text AA held.
- **EC-12 (feel, live):** a story placing `SelectionActions` in a **representative in-place position** (an `absolute`/
  `position:fixed` box over a highlighted span) reads as immediate + in-place (not a buried form). ⚠ The shipped `Popover`
  is **trigger-anchored (cloneElement), NOT Range-anchored** (`popover.tsx:47-59`) — so the live
  `getSelection().getRangeAt(0).getBoundingClientRect()` → position wiring is the **apps/web consumer's** (S6 / fe-books
  #36), NOT this slice. S4 proves the _pieces_ + a representative placement, not the Range→rect math.
- icons + mark are graphical objects **≥3:1** (both modes × 3 presets); body text AA 0-fail incl. warm-dark ·
- **each action ≥ 44×44** (§X touch target) · **focus ring + hover state** on each icon button (§VIII hover visually
  distinct — ghost fills `$colorSurfaceSecondary`; the 16px icon still ≥3:1 on the hover surface) · reduced-motion (none) ·
- 375 (toolbar wraps cleanly, no mid-control overflow) ·
- tsc 0 · eslint 0 · tests green · **axe 0**.

## §6 · Implementation prompt

1. `canvas-reader.tsx` —
   - 4 inline SVG icon components (`HighlightIcon`/`QuoteIcon`/`BookmarkIcon`/`ListenIcon`, `aria-hidden`, 16px,
     `currentColor`).
   - `SelectionActions` — `role="toolbar"` named (Tab-stops, not roving); render each action (ui-1 `Button` intent="ghost"
     **`size="lg"`** — 44×44 §X, B1) only when its handler is passed; icon child + `aria-label`; Listen gated by
     `onListenFrom && listenAvailable !== false`. `flexWrap` row (BR-S4-6b). React-19 ref-prop.
   - `ReaderHighlightMark` — a styled `Text` span, **2px** accent `borderBottom` (`$colorBrandPrimary`), text
     `$colorTextPrimary`; `className="vida-reader-highlight"` (gate hook).
   - export both from `canvas-reader.tsx`; add to `packages/ui/src/index.ts` barrel (+ the two prop types). **While in the
     barrel, close the S3 gap:** export `Nature`, `ReaderAnnotation`, `AnnotationGroup` (shipped in S3, never exported — N5).
2. Stories: `SelectionActionSet` (the toolbar, 4 icons) · `SelectionInPlace` (a reading body with a `ReaderHighlightMark`
   span + `SelectionActions` placed in a representative `absolute`/`fixed` box over it — EC-12 feel; NOT the shipped
   trigger-anchored Popover — the live Range→rect is apps/web's, B2) · `HighlightMark` (marked spans in a paragraph).
3. Tests (extend `canvas-reader.test.tsx`): the 4 actions render when handlers passed + each emits its intent · an action
   is absent without its handler · Listen omitted when `listenAvailable===false` · toolbar role + name · icons are `<svg>`
   aria-hidden (no emoji) · `ReaderHighlightMark` renders children + carries the mark class.
4. tsc + eslint + test → **blocking Visual Gate** (Brave, 3 presets × light/dark + 375; assert EC-4/EC-3/EC-15 + icon/mark
   3:1 + body AA + axe) → §XXIX (`CLAUDE.md` + `canvas-reader.md` S4 block + barrel note).

## Deviations / open

- The §2 surfacing model (exported pieces, consumer-anchored; callbacks off `CanvasReaderProps`) is the one material
  departure from the PROPOSED seam-contract — doc-resolved (IR-NEEDS-3 + EC-12 + greybox), surfaced for Approval 1.
- **Rejected third option — a `renderSelection?: (range) => ReactNode` render-prop ON `CanvasReader`:** tempting, but
  doc-contrary — the shell still doesn't own the `Range` (it lives in the consumer's `renderContent`), so threading a slot
  down would be a fiction. The two-exports model is the honest decomposition. (Noted so a reviewer doesn't re-raise it.)
- EC-12 is a `feel` EC → verified at the live Visual Gate via the `SelectionInPlace` composition (representative placement),
  never a greybox MUST; the live Range→rect anchoring is the apps/web consumer's (S6 / fe-books #36).
- The highlight mark = 2px accent underline (token-pure); a true highlighter background awaits an M4 accent-surface token.
- **N5 (barrel):** S4 closes the pre-existing S3 barrel gap (`Nature`/`ReaderAnnotation`/`AnnotationGroup` were shipped but
  never exported) — not an S4 defect, but S4 is the natural place since it touches the barrel.
