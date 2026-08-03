# Spec: component:ds-3-motion-foundation
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: implemented   <!-- draft → approved → implemented -->  (built + verified 26/26 · typecheck 10/10 · post-impl critique SHIP · Frontend Visual Gate PASS [all 4 stages, Victor approved 2026-08-03])
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Linear: LIF-83 · Project M1 — Whole Manual OS · Milestone M1.0 — Boot & Connective Base.
Depends on: DS-2 (foundation values + aux-namespace pipeline, IMPLEMENTED on main). Blocks: DS-4 (Tamagui config + createAnimations).

<!--
  FORWARD spec (LITE gate — design-system document-first: §1·§2·§4 + §5; §3 = data/format contract, not /contract's
  visual framework — DS-3 defines token VALUES, not a visual component). No two-approval loop; single review.
  DS-3 = the motion token VALUES (duration + easing scales) + one minimal, additive pipeline extension
  (a third aux consumer, `motion.ts`) that reuses DS-2's aux-namespace mechanism verbatim.
-->

## 0. Source model (direction — 2026-08-03)
The frontend's source of truth is the **documented intent** (ADRs, specs, `standards/design.md` + `motion.md`),
realized **code-first**: the hand-authored `tokens/*.json` seed is the authored source during M1. The
community-forkable **Figma file is built later** — once products exist — as a faithful reflection, synced via
**Figma MCP + a scripter + docs** (NOT Tokens Studio; paid heavy-task). DS-3 keeps motion values aligned to
`motion.md §IX` so "Figma-later" is a projection, not a reconciliation; motion maps 1:1 to Figma variable
values (duration numbers) + string tokens (easing curves). `[DIRECTION: Victor 2026-08-03]`
`[MEM: frontend-source-of-truth-is-documented-intent]`

## 1. Identity

**What it is.** DS-3 supplies the **motion foundation** for `@vida/ui`: the duration + easing scales that every
animated component composes from, plus the documented reduced-motion + safe-property contract. It defines two
primitive scale families as three-layer tokens consumed by the DS-1/DS-2 pipeline:

1. **Duration scale** — a small set of named durations mapped to `motion.md §IX`'s three timing bands (micro /
   transition / emphasis) plus `instant` for the reduced-motion path. `[FACT: motion.md §IX "Micro 150–200ms;
   Transition 250–300ms; Emphasis 350–450ms"]`
2. **Easing scale** — the three canonical UI cubic-bezier curves (`out`, `in`, `inOut`) plus `linear`
   (progress bars / data-viz only, per the standard's carve-out). `[FACT: motion.md §IX "--ease-out/-in/-in-out
   cubic-beziers; Never use linear for UI. Linear is only for progress bars and data viz."]`

Home: `packages/ui/src/themes/` (same as DS-1/DS-2). `[FACT: reconstructed-structure #18]`

**One pipeline extension DS-3 introduces** — minimal, additive, reuses DS-2's aux mechanism verbatim:

| Extension | Why | Shape |
|---|---|---|
| **Motion as a third aux consumer** (`motion.ts`) | `duration`/`easing` are **not** `createTokens` categories (`color/space/size/radius/zIndex`); a `duration`/`easing` primitive would fail DS-1's B3 fail-loud in **both** the `tokens.ts` emitter (`tamaguiRef` throws on non-category) **and** the `themes.ts` emitter — exactly the case DS-2 already handles for `fontFamily/shadow`. `[FACT: build-tokens.mjs:115 tamaguiRef throws on non-category; :143/:169 both emitters skip via isAuxPath; AUX list :25]` | Add `duration`, `easing` to the **`AUX` set** so `tokens.ts`/`themes.ts` skip them (B9), and the namespace-agnostic `vida/css-vars` format emits them to `variables.css` unchanged. Add a **new `vida/motion` format** emitting `motion.ts` (typed plain-data, mirroring `vida/fonts`) for DS-4's `createAnimations`. **Guard:** the existing `vida/fonts` format currently includes *all* AUX except `shadow` (build-tokens.mjs:227 `if (!AUX.includes(ns) \|\| ns === 'shadow') continue`) → adding `duration`/`easing` to `AUX` would **leak them into `fonts.ts`**; the fonts filter must be narrowed to the typography namespaces only. `[FACT: build-tokens.mjs:219–235 vida/fonts]` **AUX side-effect sweep (all `isAuxPath`/`AUX` call sites):** `:143` tokens.ts skip (wanted) · `:169` themes.ts semantic skip (wanted) · `:190` dark-overlay `isAuxPath` **(INERT for motion — motion has no `semantic.dark.json` entry, so nothing routes here)** · `:227` fonts filter **(the leak — must narrow)** · `vida/css-vars` never calls `isAuxPath` (wanted CSS emission). `[FACT: build-tokens.mjs grep isAuxPath/AUX.includes]` |

**What it is NOT.**
- NOT the animation **mechanism** — `createAnimations(...)`, the animation *driver* choice (`@tamagui/animations-css`
  vs `-react-native`), and wiring into `createTamagui` are **DS-4**. DS-3 supplies the duration/easing *values* +
  `motion.ts` data DS-4 feeds to `createAnimations`, exactly as `fonts.ts` feeds `createFont`.
  `[FACT: roadmap.md:89 "DS-4 Tamagui + dark mode"; reconstructed #19]`
- NOT **semantic transition presets** — a preset like "hover = 150ms + ease-out" pairs a duration *and* an easing
  in one construct. The three-layer model (semantic → **one** primitive reference) cannot express a two-value pair
  without a raw literal (B2 violation). Named animation presets are composed at **DS-4** via `createAnimations`.
  DS-3 stays **primitive-only** for motion — same posture as DS-2's typography (primitive aux; `createFont`
  composition = DS-4). `[INTERP: from B2 three-layer single-reference rule]`
  `[UNKNOWN: createAnimations config shape is DRIVER-DEPENDENT — the CSS driver (@tamagui/animations-css) consumes
  duration + easing-like entries, but the react-native driver (@tamagui/animations-react-native) takes spring
  configs ({type,damping,stiffness}) with NO cubic-bezier easing. So motion.ts's easing strings may be
  CSS-driver-only; DS-4 picks the driver and reconciles what it consumes. DS-3 only emits values — verify against
  Tamagui docs at DS-4.]`
- NOT the **reduced-motion mechanism** — the `@media (prefers-reduced-motion: reduce)` handling and the
  per-component "instant alternative that still communicates" are applied at **consumption** (component CSS /
  DS-4 driver config), not in a token value. DS-3 provides the `duration.instant` token + the documented contract;
  enforcement is a component-gate item (DS-5 / UI-*). `[FACT: motion.md §IX "Reduced Motion — Required for Every
  Animation … instant state change, not the absence"]`
- NOT the **safe-property enforcement** — "animate only `transform`/`opacity`/`clip-path`" is a documented guardrail
  (B12) checked at the component gate; DS-3 records it, it is not build-enforced at the token layer (there is no
  component code here to lint). `[FACT: motion.md §IX "Animated Properties — The Only Safe List"]`
- NOT a Figma dependency — code-first per §0.

## 2. Business Rules
DS-3 **inherits** DS-1/DS-2's invariants B1–B10 (single source; three-layer indirection never skipped; determinism;
generated-never-edited; fail-loud; scale completeness; parallel dark; 4pt grid; aux routing; contrast floor).
`[FACT: docs/ui/token-pipeline/current-business-rules.md]` It adds:

- **B11 — Motion primitives, aux-routed, standard-aligned.** `duration.*` and `easing.*` are primitive tokens
  routed to `variables.css` + `motion.ts` and **skipped** (not failed) by both the `tokens.ts` and `themes.ts`
  emitters (they are not Tamagui categories). Every duration maps to a `motion.md §IX` timing band; every easing
  is one of the three canonical cubic-beziers or `linear`. **No arbitrary timing or curve.** Any duration > 500ms
  would require written justification (none is defined here). `[FACT: motion.md §IX; INTERP: from B9 aux mechanism]`
- **B12 — Motion contract (documented, component-gate-enforced).** Two rules travel with the motion foundation but
  are **not** build-enforced at the token layer (no component code here): (a) **Reduced-motion** — every animation
  ships a `prefers-reduced-motion: reduce` alternative that is an *instant state change*, never the mere absence of
  motion; if the animation communicates state, the reduced path must communicate the same by another means.
  (b) **Safe properties only** — animate `transform`/`opacity`/`clip-path` only; never `color`/`background`/
  `box-shadow`/`border`/`width`/`height`/`top-left-right-bottom`/`margin`/`padding`. Both are enforced at the
  component gate (DS-5 / UI-*) and recorded in the layer-doc. `[FACT: motion.md §IX]`

**Terminal states** (unchanged from DS-2): success (all targets written incl. `motion.ts`, exit 0) · fail-loud on
dangling-ref / layer-skip / empty-layer / off-grid spacing (B8) — no partial output, cause named, exit ≠ 0.
Motion tokens are exempt from B8 (4pt grid is `space.*`-only, `[FACT: build-tokens.mjs:85 space-scoped]`).

## 3. Contract (data/format)

### 3.1 Input — seed additions (classic Style Dictionary `{ "value", "type" }`)
> Format note: the **live** pipeline uses `value`/`type` (not `$value`/`$type`). DS-3 matches the live code.
> `[FACT: tokens/*.json on main]`

- **`primitive.json`** gains two aux namespaces:
  - **`duration`** — `instant: 0`, `fast: 150` (micro), `moderate: 250` (transition), `slow: 400` (emphasis).
    `type: "duration"`. Values are **unitless numbers = milliseconds** (see §6 unit decision — consistent with the
    existing unitless-dimension convention, `ms` reconciliation deferred to DS-4). Each duration sits **inside** a
    `motion.md §IX` band `[FACT: motion.md §IX bands: micro 150–200 / transition 250–300 / emphasis 350–450]`; the
    choice of the band **floor** (150/250) over a midpoint is a deliberate "snappy" design decision, not dictated
    by the standard `[INTERP: band-floor = snappier feel; confirm in §6]`. `instant: 0` is the reduced-motion path,
    not a band. `[FACT: motion.md §IX "instant state change"]`
  - **`easing`** — `out: "cubic-bezier(0, 0, 0.3, 1)"`, `in: "cubic-bezier(0.7, 0, 1, 1)"`,
    `inOut: "cubic-bezier(0.4, 0, 0.6, 1)"`, `linear: "linear"`. `type: "easing"` (honest label — `linear` is not
    a bezier; `type` is inert passthrough metadata anyway, `transforms: []`). String values (directly CSS-usable).
    `[FACT: motion.md §IX CSS values]`
- **`semantic.json` / `semantic.dark.json` / `component.json`** — **unchanged.** Motion is primitive-only in DS-3
  (no semantic/component motion tokens; the three seed files stay non-empty via the existing color/space/etc. so
  B2's non-empty-layer check is satisfied). `[FACT: build-tokens.mjs checkLayers non-empty is per-file, not
  per-namespace]`

### 3.2 Output targets (extends DS-2)
| File | Change | Shape |
|------|--------|-------|
| `variables.css` | **+motion namespaces** | now also emits `--duration-fast: 150`, `--easing-out: cubic-bezier(0, 0, 0.3, 1)`, … (design.md §XII naming, namespace-agnostic emitter — no format change). Durations unitless (see §6). |
| `tokens.ts` | **skip motion** (B9/B11) | `createTokens` over the 5 categories only; `duration`/`easing` primitives skipped (added to `AUX`), no B3 fail. |
| `themes.ts` | **skip motion** (B9/B11) | unchanged output; motion primitives never enter theme objects. |
| `fonts.ts` | **filter narrowed** | must **exclude** `duration`/`easing` (currently emits all-AUX-except-shadow); narrow the `vida/fonts` filter to the typography namespaces only so motion does not leak in. |
| `motion.ts` | **NEW** | typed plain-data export `export const motion = { duration: {...}, easing: {...} } as const` for DS-4's `createAnimations`; GENERATED banner. Mirrors `fonts.ts`. |
| `build-tokens.mjs` | **+`duration`/`easing` in AUX · +`vida/motion` format · narrow `vida/fonts`** | additive; determinism (B4) preserved (sort-by-path, no timestamp). |

### 3.3 Build interface (unchanged)
`pnpm --filter @vida/ui tokens:build` → exit 0 on success; non-zero + named cause on B2/B8 violation.
`packages/ui/src/index.ts` re-exports `tokens`, `light`, `dark`, `light_<Comp>`, `fonts`, **and `motion`**.

## 4. Acceptance (testable DoD)
- [x] Seed defines `duration` (instant/fast/moderate/slow) + `easing` (out/in/inOut/linear) per §3.1, every value
      traceable to a `motion.md §IX` band/curve — **no arbitrary values** (B11).
- [x] **B11 proven:** a `duration`/`easing` primitive builds cleanly — emitted to `variables.css` + `motion.ts`,
      **absent** from `tokens.ts` `createTokens` and `themes.ts`, and does **not** trip B3.
- [x] **css-vars presence proven (positive test):** `variables.css` **contains** the exact lines
      `--duration-fast: 150;` and `--easing-out: cubic-bezier(0, 0, 0.3, 1);` (asserts the namespace-agnostic emitter
      actually emits motion + emits valid CSS text — guards against a css-vars narrowing regression silently dropping
      motion while the negative tests still pass). `[FACT: build-tokens.mjs:130 primitive → String(value)]`
- [x] **fonts.ts isolation proven:** `fonts.ts` contains the typography tokens and **not** `duration`/`easing`
      (the narrowed `vida/fonts` filter) — a fixture asserts motion is absent from `fonts.ts`.
- [x] `motion.ts` exports `{ duration, easing } as const` (typed data consumable by a future `createAnimations`);
      GENERATED banner; `packages/ui/src/index.ts` re-exports `motion`.
- [x] `pnpm --filter @vida/ui typecheck` green (strict, `@tamagui/core` only, no `tamagui.config.ts` → still ⊥ DS-4).
- [x] `pnpm --filter @vida/ui test` green — DS-2's 20 fixtures still pass + new fixtures for B11 + fonts-isolation.
- [x] **B4 determinism** holds: two builds byte-identical per target (incl. `motion.ts`).
- [x] **B12 recorded** — reduced-motion + safe-property contract written into the themes layer-doc as the
      component-gate obligation (not build-enforced here).
- [x] **Frontend Visual Gate** (token values): all 4 stages PASS (preflight ✓ · post-impl critique ✓ SHIP · render ✓
      · **Victor visual approval ✓ 2026-08-03** — approved after one render fix: `instant` now renders static/immediate,
      not a 1ms flicker-loop). `pnpm preview:tokens` renders a **motion section** — animated demo
      elements exercising each duration × easing, honoring `prefers-reduced-motion`; critique + preflight pass;
      **Victor's visual approval** recorded before values ship. `[FACT: docs/specs/foundation/frontend-visual-gate.md
      render table row "Design tokens (DS-2/DS-3)"]` (Pipeline-extension code ships on the normal gate — not visual.)
- [x] `[C]` `current-spec.md` + `current-business-rules.md` refreshed for the themes context; `[L]` layer-doc updated.

## 5. Implementation Prompt
<!-- Ordered; each step cites a §2/§3 rule. -->
1. **Extend the pipeline** (`build-tokens.mjs`): (a) add `'duration'`, `'easing'` to the `AUX` set (so both
   createTokens emitters skip them via `isAuxPath` — B11); (b) **narrow the `vida/fonts` filter** from
   "all AUX except shadow" to an explicit typography set (`fontFamily/fontSize/fontWeight/lineHeight/letterSpacing`)
   so motion does not leak into `fonts.ts` (§3.2 guard); (c) add a **`vida/motion`** custom format emitting
   `motion.ts` (`export const motion = { duration, easing } as const`, primitive-layer motion namespaces only,
   GENERATED banner) — **mirror `vida/fonts` verbatim including BOTH sort layers** (`[...allTokens].sort(byPath)`
   before grouping AND `Object.keys(groups).sort()` on the top-level namespaces) so no insertion-order
   nondeterminism creeps in (B4); (d) register `motion.ts` in the `files` list. Keep B1–B5 + B4 determinism intact.
2. **Author the motion seed** in `primitive.json` — `duration` (instant 0 / fast 150 / moderate 250 / slow 400) +
   `easing` (out/in/inOut/linear cubic-beziers) per §3.1, each value from `motion.md §IX`. `[FACT: motion.md §IX]`
3. **Update `packages/ui/src/index.ts`** re-exports to include `motion`.
4. **Tests** (Vitest) — add fixtures: motion primitives emit to CSS + `motion.ts`, **absent** from `tokens.ts`/
   `themes.ts` (B11); `fonts.ts` excludes `duration`/`easing` (fonts-isolation); determinism holds (B4). Keep
   DS-2's 20 green.
5. **Extend the visual render** (`tools/scripts/render-token-preview.mjs`) — add a motion section: for each
   `duration × easing`, an animated demo element (a transform/opacity transition on hover or loop) driven by the
   emitted vars, wrapped so `@media (prefers-reduced-motion: reduce)` disables it. `[FACT: frontend-visual-gate.md
   render mechanism]`
6. **Done-check:** run every §4 checkbox; regenerate outputs; refresh `[C]`/`[L]` docs (B12 contract into the
   layer-doc); run the Frontend Visual Gate → Victor's approval.

## 6. Open UNKNOWNs / Decisions Needed
- **[DECISION — unit of duration = unitless number (ms).** Durations are stored as raw numbers (`150`), so
  `variables.css` emits `--duration-fast: 150` (unitless), consistent with DS-2's unitless-dimension convention
  (`--space-16: 16`) where CSS-var unit reconciliation is **deferred to DS-4**. `motion.ts` carries numbers, which
  `createAnimations` composes per driver at DS-4. The visual-render demo (Step 5) supplies its own `ms` — it is a
  render artifact, not the token contract. Rationale: joins the existing px-reconciliation deferral rather than
  inventing a second unit convention. `[INTERP: consistent with current-spec "CSS dimension vars are unitless …
  deferred to DS-4"]` — **confirm acceptable, or store `"150ms"` strings instead (CSS-directly-usable but diverges
  from the number convention).**]
- **[DECISION — duration scale grain = 4 tokens** (instant/fast/moderate/slow). Covers the three `motion.md` bands
  + the reduced-motion instant. **Confirm** this grain vs. a wider ramp (e.g. adding `deliberate: 500`, which the
  standard flags as needing justification). `[FACT: motion.md §IX three bands]`
- **[DECISION — duration values sit at each band's FLOOR** (fast 150 = micro floor, moderate 250 = transition floor,
  slow 400 = emphasis mid). This is a "snappy" feel choice, not dictated by the standard (any in-band value is
  valid). **Confirm** the snappy bias vs. band-midpoints (e.g. fast 175 / moderate 275). `[INTERP: band-floor]`
- **[DECISION — easing names** `out`/`in`/`inOut`/`linear` (curve-shape names) vs. intent names
  (`enter`/`exit`/`loop`). Curve-shape names are proposed (they match the CSS `ease-*` mental model and the
  standard's own labels); intent aliases can be added as DS-4 `createAnimations` preset names. **Confirm.**
- **[DEFERRED → DS-4] `createAnimations` + driver choice + reduced-motion mechanism** (media-query wiring /
  driver-level `enterStyle`/`exitStyle`). DS-3 supplies values + the documented contract only.
- **[DEFERRED → DS-5 / UI-*] Safe-property + reduced-motion enforcement** at the component gate (B12 is documented
  here, checked there).

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-03 | 2026-08-03-ds-3-motion-foundation | initial forward LITE spec: §0 source model, §1 identity + 1 pipeline extension (motion as third aux consumer), §2 B11–B12, §3 data/format contract, §4 acceptance, §5 impl prompt, §6 decisions. Grain: primitive-only motion tokens reusing DS-2's aux mechanism; presets + mechanism = DS-4. |
| 2026-08-03 | 2026-08-03-ds-3-motion-foundation | REVISE (independent adversarial critique — SHIP after fixes; core architecture + all line citations verified true against live `build-tokens.mjs`, easing values match `motion.md §IX` byte-for-byte). Fixes: **F2** §1 AUX side-effect sweep now enumerates all call sites incl. `:190` dark-overlay (inert for motion); **F8** added positive css-vars presence acceptance test (exact `--duration-fast`/`--easing-out` text — guards a css-vars narrowing regression); **F6** reframed `createAnimations` config shape as `[UNKNOWN: driver-dependent]` (RN driver = spring configs, no cubic-bezier); **F5** moved band-floor duration selection (150/250) from `[FACT]` to `[INTERP]`/§6 decision; **F9** Step 1(c) → mirror `vida/fonts` verbatim incl. both sort layers (B4). |
| 2026-08-03 | 2026-08-03-ds-3-motion-foundation | **Step 2 BUILT.** Pipeline extended: `AUX` factored `[...TYPOGRAPHY, 'shadow', ...MOTION]`; `vida/fonts` filter narrowed to `TYPOGRAPHY` (closed the fonts↔motion leak by construction); new `vida/motion` format → `motion.ts` (mirrors `vida/fonts`, both sort layers); `motion.ts` registered + index re-export. Seed: `duration` (instant 0/fast 150/moderate 250/slow 400, unitless ms) + `easing` (out/in/inOut cubic-beziers + linear, `type:"easing"`). Render: `render-token-preview.mjs` motion section (4×4 demos, transform+opacity, reduced-motion honored). **Verify:** `tokens:build` deterministic · **@vida/ui 26/26** · **root typecheck 10/10** · preview deterministic. **Post-impl critique = SHIP** (2 NITs: linear-type→fixed `type:"easing"`; camelCase `--easing-inOut`→noted, DS-4). §XXIX docs promoted (current-spec/current-business-rules B11/B12 + themes layer-doc = B12 enforcement artifact). Live-smoke caught+fixed a render bug (cubic-bezier commas → isShadow miscapture; motion branch moved above shadow). **Awaiting Visual Gate stage 4 (Victor).** |
