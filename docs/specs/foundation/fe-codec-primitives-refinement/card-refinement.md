# PLAN — Card refinement (fe-codec-primitives-refinement · P2 · LIF-230)

> §XXVI Per-Step Build Gate · gate-1 artifact (the SPEC). Profile: change-frontend-component. Unit: the `@vida/ui`
> `Card` primitive — Layer-1 aesthetic polish + Layer-2 alive-hooks **+ the P1-gate landmark fix**. Visual target:
> `mockups/views-refinement.html` (Card plate) + `mockups/views-alive-concept.html` (Card micro-dashboard). Status:
> **awaiting Approval 1 (revised — P2 session, 2026-10-06: landmark fix added).**

## 0a. P1-gate carry-in (the headline P2 decision — grounded in the contract + code)

P1's Visual Gate flagged: Card renders `header`/`footer` as real `<header>`/`<footer>` elements. Because the Card
FRAME is a `<div>` (`role="group"`/`"button"`) — **not** sectioning content — those nested `<header>`/`<footer>`
escape to `<body>` scope and are exposed as `banner`/`contentinfo` **landmarks**. In a repeated-row (list) context that
is N duplicate landmarks → axe `landmark-no-duplicate-banner`/`-contentinfo` (12 violations in the P1 story until it
composed rows via Card `children`). [FACT: task `## Phase log` ⚑ P2 flag; `card.tsx:80-92` `render:'header'`/`'footer'`]

**The contract already contradicts itself — and the Intent governs:**

- `card.md:6` **Intent**: Card is "**NOT a page section landmark by default**." (the governing statement)
- `card.md:45` / `u5-card.md:42-43,70,77` **mechanism**: "header/footer are `<header>`/`<footer>` regions inside"
  (`render:'header'`/`'footer'`). `card.test.tsx:41` even encodes the symptom: "renders … as `<header>`/`<footer>`
  **landmark** regions." → The mechanism PRODUCES exactly the landmark `:6` forbids. Intent outranks mechanism.
- Two HARD facts constrain the frame: `card.md:21` `forwardRef<HTMLDivElement | View>` + `u5-card.md:82-83` "Host =
  `<div>` (default render) … **fixes the ref to a div**." → the frame MUST stay a `<div>`.

**Resolution (BR-C-11) = drop the landmark tags.** `CardHeader`/`CardFooter` drop `render:'header'`/`'footer'` → plain
styled `<div>`s. This (a) satisfies the governing Intent `card.md:6` (no landmark, in ANY context — list row or
standalone); (b) **preserves** both hard facts (frame stays `<div>`, ref stays `HTMLDivElement`); (c) reconciles only
`card.md:45` — the losing side of its own intra-contract conflict with `:6`. **A descoped `<header>` contributes nothing
to the a11y tree**, so no AT value is lost; the visual header/footer layout is unchanged (the styled Views keep every
style — only the emitted tag changes `<header>`→`<div>`). **Option A (frame→`<article>` to descope) was REJECTED:** it
violates `card.md:21` + `u5-card.md:82-83` (ref-fixed-to-div / host-is-div) — two documented FACTs — to save a `:45`
mechanism that has no AT value. Fewer-divergence + Intent-faithful wins. `card.test.tsx:41` flips to assert header/footer
CONTENT renders with **no** `banner`/`contentinfo` landmark.

## 0. Source model (frontend-source-of-truth)

Code-first interim (`docs/specs/foundation/frontend-source-of-truth.md`): tokens come from the shipped Style-Dictionary→
Tamagui pipeline; **no Figma/Tokens Studio** here; brand VALUES are M4/P2. Acceptance verified via the **Storybook +
Brave Visual Gate**, not a Figma diff. No palette values authored in this unit.

## 1. Context (grounded — No-Guessing)

- `Card` = a static grouped surface, renders a `<div>` (`role="group"`, or `role="button"` + hand-rolled keyboard when
  `interactive`; never a native `<button>`). Slots: `header` · `footer` · `actions` (top-right) · `children`. Variants:
  `padding` (compact/default/spacious), `interactive`. **No `loading` prop** (consumer-composed). [FACT: `packages/ui/src/components/card.tsx:27-206`]
- Elevation = the OPACITY of a raised-shadow overlay child; resting shadow self-cancels in dark (border carries dark
  elevation); hover = INSTANT border strengthen (B12, no transition on the frame). [FACT: `card.tsx:17-20,65-76` + `internal/card-styles.ts`]
- **Token-clean**: 0 hard-coded colors; DIRECT semantic tokens (accent-fixed in fe-codec-theme). Radius via the token
  scale (`$lg` = radius.card, DEF-U8-h). [FACT: `card.tsx:33-36,52`]
- **Consumers today = Storybook stories only** (collection/list/timeline/gallery stories + `_codec-gate`). No app surface
  consumes `Card` yet → **additive props are non-breaking**; the Visual Gate is the Storybook harness. [FACT: grep 2026-10-05]
- Contract: `docs/specs/components/ds-5-primitive-contracts/card.md` + `ui-1-vida-ui-primitives/u5-card.md`.

## 2. Business rules

**Preserve (invariants — must not regress):**

- BR-C-1 Read-only container; never a native `<button>`; interactive = `role=button` + Enter/Space + focus-visible ring. [card.md]
- BR-C-2 Accessible-name guard on interactive cards; computed a11y props win over `{...rest}` (N1). [card.tsx:118-138,170-181]
- BR-C-3 Elevation = opacity-overlay (B12), self-cancels in dark; **no `animation` on the frame**; reduced-motion safe.
- BR-C-4 Dimensions via token scale (radius `$lg`), never a sub-theme key (DEF-U8-h). No hard-coded palette (brand = M4).

**Landmark fix (from the P1 gate — see §0a):**

- BR-C-11 Card's `header`/`footer` must **never** be exposed as `banner`/`contentinfo` landmarks, in any context
  (standalone or repeated list row) — honoring the governing Intent `card.md:6`. Mechanism: `CardHeader`/`CardFooter`
  drop `render:'header'`/`'footer'` → plain styled `<div>`s (every style preserved; only the emitted tag changes). The
  FRAME stays a `<div role="group"/"button">` so `card.md:21` + `u5-card.md:82-83` (ref fixed to `HTMLDivElement`/
  host-is-div) are **preserved**; `role`/`tabIndex`/keyboard/elevation/a11y-name are byte-for-byte unchanged. Reconciles
  `card.md:45` (mechanism) — the losing side of its own conflict with `:6`; a descoped `<header>` had no AT value.

**Layer-1 polish (aesthetic):**

- BR-C-5 Softer, more intentional **resting elevation** — a two-layer shadow (ambient + tight) at low opacity, still
  opacity-overlay (B12), still dark-self-cancelling, still reduced-motion safe. (`card-styles.ts`, no API change.)
- BR-C-6 Optional **hairline header divider** (`$colorBorderDefault`) between the header bar and body.
- NB the editorial _content_ vocabulary (eyebrow kicker · serif title · tabular meta) is **consumer-composed** via
  `header`/`children` — Card ships the chrome, the stories demonstrate the composition. Not new Card API.

**Layer-2 alive-hooks (additive, presentational — primitive ships the hook, surface feeds data):**

- BR-C-7 `status` variant → a **left-edge 3px bar** signalling entity state, using DIRECT semantic **signal** tokens
  (preset-invariant — same `success500`/`danger500` across all 6 themes, the SyncStatus precedent `sync-status.tsx:43-44`):
  `calm`→`$colorSignalSuccess` · `warm`→`$colorSignalDanger` · `faded`→dimmed frame + no edge · `neutral` (default)→no
  edge. The edge is decorative (`aria-hidden`); state meaning lives in content. As a graphical object the edge needs only
  §XIV 3:1 (`danger500`=3.63 clears 3:1; it is the TEXT use of danger that fails 4.5 — M4/Figma, not this edge).
- BR-C-7c **Edge MECHANISM (grounded — preflight catch):** the edge is an **absolute `StatusEdge` child** (left:0,
  top:0, bottom:0, width:3px, `backgroundColor`=the signal token, `borderTopLeftRadius`/`borderBottomLeftRadius`=`$lg` to
  follow the rounded corner, `aria-hidden`, `pointerEvents:none`) — sibling of `CardElevation`. **NOT `borderLeftWidth`**
  (toast.tsx:133-135: a border-left fights Card's existing 1px border + `$lg` radius) and **NOT via frame
  `overflow:hidden`** (toast's clip trick) — that would clip `CardElevation`'s raised box-shadow, which must escape the
  frame bounds. Being a separate element, the edge is also immune to the interactive `hoverStyle:{borderColor}`
  (card.tsx:52) — hover can't clobber the status color. `neutral`/`faded` render no edge.
- BR-C-7a **`faded` = "neglected"** (mockup:142), NOT disabled/inactive → the WCAG-1.4.3 inactive-component exemption does
  **not** apply, and `engineering §XIV` is binding ("contrast … is a blocker — not a design choice"). So faded dims the
  frame **only so far as all text still clears AA** — the **Visual Gate is the oracle** (task:134); if a blanket
  `opacity:0.62` drops muted/meta text below 4.5 at the Gate, dim the chrome (surface/border/elevation + eyebrow) and
  hold the text, or raise the floor. Invariant over exact value: faded reads as de-emphasized AND every text pair ≥ AA.
- BR-C-7b **Precedence:** when `faded` co-occurs with interactive-`disabled`, the more-dimmed wins — `disabled`'s
  `opacity:0.5` (`card.tsx:178`) takes precedence (disabled IS WCAG-1.4.3-exempt); they do not stack/multiply.
- BR-C-8 `metric` slot (ReactNode) → a **glanceable readout** rendered top-right of the header (e.g. a progress ring/
  badge). Distinct from `actions` (interactive controls): `metric` is non-interactive; both may coexist (metric before
  actions). Part of the header region.
- BR-C-9 All new props **optional**; `neutral`/absent = today's exact render (back-compat; stories unaffected).
- BR-C-10 No new deps; no cross-module reads (all data consumer-fed).

## 3. Contract (API)

Additive to `CardProps` (all optional → non-breaking):
| Prop | Type | Default | Semantics |
|---|---|---|---|
| `status` | `'neutral' \| 'calm' \| 'warm' \| 'faded'` | `'neutral'` | left-edge signal bar (BR-C-7); `faded` also dims the frame |
| `metric` | `ReactNode` | — | non-interactive glanceable readout, top-right of header (BR-C-8) |
| `headerDivider` | `boolean` | `false` | hairline under the header bar (BR-C-6) |
Unchanged: `header · footer · actions · interactive · onPress · disabled · padding · children` + all a11y behavior.
**Internal (no prop):** `CardHeader`/`CardFooter` drop `render:'header'`/`'footer'` → plain `<div>`s (BR-C-11). The FRAME
stays `<div>`; `role`/`tabIndex`/`aria-*`/ref (`HTMLDivElement`, `card.md:21`) are all unchanged. **DEF-U5-g** (reconcile
the frozen DS-5 contract): `card.md:45` "header/footer are `<header>`/`<footer>` regions" is superseded by `card.md:6`
(Intent: not a landmark) — header/footer are non-landmark `<div>` regions. Promote to `card.md` + `u5-card.md` at §XXIX.

## 4. Acceptance

- **Visual Gate (blocking)** — Brave via `PW_EXECUTABLE_PATH`, full matrix **3 presets × light/dark × calm/dense**:
  (a) `status` edge-tints render with the right **signal** color per mode (preset-invariant), `faded` dims; (b) `metric`
  slot lays out top-right, no collision with `actions`; (c) `headerDivider` hairline; (d) softer resting elevation reads
  in light + the dark border-elevation still carries; (e) the editorial composition story (eyebrow+serif+tabular+ring+
  status) reads; (f) **AA** on all text/edge pairs incl. warm-dark **(faded included — BR-C-7a: faded text must clear AA,
  the Gate is the oracle for the dim)**; (g) **axe 0**.
- **Landmark fix (BR-C-11) — blocking** — a **repeated-row story** (N interactive Cards each with `header`+`footer`, the
  exact P1-violation shape) must axe-**0** on `landmark-no-duplicate-banner`/`-contentinfo` (+ no `nested-interactive`
  regression — unchanged from today's `<div role=button>`); the Card's exposed `role`/keyboard/focus are unchanged; DOM
  emits NO `<header>`/`<footer>` (plain `<div>` regions), frame still `<div>`.
- **a11y** — status edge `aria-hidden`; interactive Card keyboard/focus/name guard intact; metric slot in header, not a control.
- **Automated** — `card.test.tsx` extended (status variant class/edge · metric renders · divider · `neutral`==baseline ·
  **BR-C-11: header/footer render as non-landmark `<div>`s — no `banner`/`contentinfo`; frame stays `<div>`; exposed role
  still group/button**); the existing `:41` landmark test **flips** to assert content-in-region + no landmark; full
  `@vida/ui` suite green; `tsc` 0; eslint 0.
- **§XXIX currency** — `packages/ui/src/CLAUDE.md` Card paragraph updated (status/metric/divider + softer elevation +
  header/footer now non-landmark `<div>`s); **DEF-U5-g** reconciled into `card.md:45` + `u5-card.md` (header/footer are
  non-landmark regions, superseding the `<header>`/`<footer>` wording per the `card.md:6` Intent).

## 5. Implementation plan

Order = types-first, then the landmark fix (lowest-risk, highest-value), then styles, then slots, then stories/tests.

1. `card.tsx` — **BR-C-11 landmark fix**: `CardHeader`/`CardFooter` drop `render:'header'`/`'footer'` → plain styled
   `<div>`s (every other style unchanged). Frame, `role`/`tabIndex`/`aria-*`, `CardElevation` all untouched. Flip the
   `card.test.tsx:41` landmark test to assert content-in-region + NO `banner`/`contentinfo`.
2. `internal/card-styles.ts` — soften the resting elevation to a 2-layer low-opacity shadow (ambient+tight); keep the
   opacity-overlay/B12/dark-self-cancel/reduced-motion model.
3. `card.tsx` — add `StatusEdge` **absolute** child (BR-C-7c: left:0/top:0/bottom:0/width:3px, `backgroundColor`=signal
   token, `borderTopLeftRadius`/`BottomLeftRadius`=`$lg`, `aria-hidden`, `pointerEvents:none`), rendered only for
   `calm`/`warm` (sibling of `CardElevation`, NO frame `overflow:hidden`, NO `borderLeftWidth`); `faded`→frame opacity
   (BR-C-7a/b precedence); `metric` in the header row between `header`(flex:1) and `actions`; `headerDivider` =
   `borderBottomWidth:1`+`$colorBorderDefault` on `CardHeader`. Preserve all guards + computed-a11y-after-rest (N1).
4. `CardProps` + barrel: additive props (`status`/`metric`/`headerDivider`), signature non-breaking; export types.
5. `card.stories.tsx` — add (a) editorial-composition + (b) alive (status × metric ring) + (c) **repeated-row** stories
   across the matrix (the Visual Gate surface + the BR-C-11 axe cell).
6. `card.test.tsx` — cover the three new props + the `neutral`-is-baseline guarantee + **BR-C-11** (header/footer are
   non-landmark `<div>`s, no `banner`/`contentinfo`, frame still `<div>`, exposed role unchanged).
7. Run the Visual Gate (Brave, 12 cells + the repeated-row axe cell); fix findings.
8. Promote §XXIX currency; commit code + doc together.
