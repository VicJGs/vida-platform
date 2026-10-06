# PLAN — Card refinement (fe-codec-primitives-refinement · view 1 · LIF-230)

> §XXVI Per-Step Build Gate · gate-1 artifact (the SPEC). Profile: change-frontend-component. Unit: the `@vida/ui`
> `Card` primitive — Layer-1 aesthetic polish + Layer-2 alive-hooks. Visual target: `mockups/views-refinement.html`
> (Card plate) + `mockups/views-alive-concept.html` (Card micro-dashboard). Status: **awaiting Approval 1.**

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
- BR-C-1 Read-only container; never a native `<button>`; interactive = `<div role=button>` + Enter/Space + focus-visible ring. [card.md]
- BR-C-2 Accessible-name guard on interactive cards; computed a11y props win over `{...rest}` (N1). [card.tsx:118-138,170-181]
- BR-C-3 Elevation = opacity-overlay (B12), self-cancels in dark; **no `animation` on the frame**; reduced-motion safe.
- BR-C-4 Dimensions via token scale (radius `$lg`), never a sub-theme key (DEF-U8-h). No hard-coded palette (brand = M4).

**Layer-1 polish (aesthetic):**
- BR-C-5 Softer, more intentional **resting elevation** — a two-layer shadow (ambient + tight) at low opacity, still
  opacity-overlay (B12), still dark-self-cancelling, still reduced-motion safe. (`card-styles.ts`, no API change.)
- BR-C-6 Optional **hairline header divider** (`$colorBorderDefault`) between the header bar and body.
- NB the editorial *content* vocabulary (eyebrow kicker · serif title · tabular meta) is **consumer-composed** via
  `header`/`children` — Card ships the chrome, the stories demonstrate the composition. Not new Card API.

**Layer-2 alive-hooks (additive, presentational — primitive ships the hook, surface feeds data):**
- BR-C-7 `status` variant → a **left-edge 3px bar** signalling entity state, using DIRECT semantic **signal** tokens
  (preset-invariant, the SyncStatus precedent): `calm`→`$colorSignalSuccess` · `warm`→`$colorSignalDanger` · `faded`→
  frame `opacity:0.62` + no edge · `neutral` (default)→no edge. Decorative (`aria-hidden`); state meaning is in content.
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

## 4. Acceptance
- **Visual Gate (blocking)** — Brave via `PW_EXECUTABLE_PATH`, full matrix **3 presets × light/dark × calm/dense**:
  (a) `status` edge-tints render with the right **signal** color per mode (preset-invariant), `faded` dims; (b) `metric`
  slot lays out top-right, no collision with `actions`; (c) `headerDivider` hairline; (d) softer resting elevation reads
  in light + the dark border-elevation still carries; (e) the editorial composition story (eyebrow+serif+tabular+ring+
  status) reads; (f) **AA** on all text/edge pairs incl. warm-dark; (g) **axe 0**.
- **a11y** — status edge `aria-hidden`; interactive Card keyboard/focus/name guard intact; metric slot in header, not a control.
- **Automated** — `card.test.tsx` extended (status variant class/edge · metric renders · divider · `neutral`==baseline);
  full `@vida/ui` suite green; `tsc` 0; eslint 0.
- **§XXIX currency** — `packages/ui/src/CLAUDE.md` Card paragraph updated (status/metric/divider + softer elevation).

## 5. Implementation plan
1. `internal/card-styles.ts` — soften the resting elevation to a 2-layer low-opacity shadow (ambient+tight); keep the
   opacity-overlay/B12/dark-self-cancel/reduced-motion model.
2. `card.tsx` — add `StatusEdge` styled bar (left, 3px, signal token by `status`, `aria-hidden`), gated off `neutral`;
   `faded`→frame opacity; `metric` rendered in the header row left of `actions`; `headerDivider` hairline. Preserve all
   guards + the computed-a11y-after-rest order (N1).
3. `CardProps` + barrel unchanged signature (additive); export types.
4. `card.stories.tsx` — add editorial-composition + alive (status × metric ring) stories across the matrix (Visual Gate surface).
5. `card.test.tsx` — cover the three new props + the `neutral`-is-baseline guarantee.
6. Run the Visual Gate (Brave, 12 cells); fix findings.
7. Promote §XXIX currency; commit code + doc together.
