# Spec: component:ds-2-foundations
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: implemented   <!-- draft → approved → implemented -->  (built + verified 20/20 · typecheck 10/10 · Frontend Visual Gate PASS provisional 2026-08-03; ⚠ palette is a placeholder, not brand — §6)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Linear: LIF-82 · Project M1 — Whole Manual OS · Milestone M1.0 — Boot & Connective Base.
Depends on: DS-1 (token pipeline, IMPLEMENTED on main ab5966c). Blocks: DS-3 (motion).

<!--
  FORWARD spec (LITE gate — design-system document-first: §1·§2·§4 + §5; §3 = data/format contract, not /contract's
  visual framework — DS-2 defines VALUES, not a visual component). No two-approval loop; single review.
  DS-2 = the real token VALUES + the two pipeline extensions (aux namespaces, dark overlay). Actual brand hue and
  typefaces are design decisions resolved WITH Victor in Step 2 (see §6).
-->

## 0. Source model (direction — 2026-08-03)
The frontend's source of truth is the **documented intent** (ADRs, specs, design.md), realized **code-first**: the
hand-authored `tokens/*.json` seed is the authored source during M1. The community-forkable **Figma file is built
later** — once products exist — as a faithful reflection, synced via **Figma MCP + a scripter + docs** (NOT Tokens
Studio; paid heavy-task). DS-2 keeps values aligned to design.md so "Figma-later" is a projection, not a
reconciliation — and models dark as an **overlay** so it maps 1:1 to Figma variable **modes**.
`[DIRECTION: Victor 2026-08-03]` `[MEM: frontend-source-of-truth-is-documented-intent]`

## 1. Identity

**What it is.** DS-2 supplies the **real foundation token values** for `@vida/ui`, replacing DS-1's throwaway
placeholder seed. It defines four scale families as three-layer tokens (primitive → semantic → component) consumed
by the DS-1 pipeline:

1. **Color system** — one brand ramp, one neutral ramp, two semantic signals (success, danger), each as a 10-step
   primitive ramp; semantic surface/text/brand/focus/border tokens; **parallel light + dark values**.
   `[FACT: design.md §II "One brand ramp. Two semantic signals (success and danger). One neutral ramp."]`
2. **Typography scale** — 7 sizes (2 display + 5 body/UI), line-heights, weights, and two typefaces (1 display,
   1 body). `[FACT: design.md §III]`
3. **Spacing scale** — the 4pt grid (`4,8,12,16,20,24,32,40,48,64,80,96,128`) + component-padding presets.
   `[FACT: design.md §IV "The 4pt Grid — Non-Negotiable"]`
4. **Radius & shadow scales** — radius `sm/md/lg/xl/full`; 3 elevation levels (resting/raised/overlay).
   `[FACT: design.md §V]`

Home: `packages/ui/src/themes/` (same as DS-1). `[FACT: reconstructed-structure #17]`

**Two pipeline extensions DS-2 introduces** (approved 2026-08-03) — both minimal, both additive to DS-1:

| Extension | Why | Shape |
|---|---|---|
| **Aux namespaces** (typography + shadow) | Fonts & shadows are **not** `createTokens` categories (`color/space/size/radius/zIndex`); a font/shadow primitive would fail DS-1's B3 fail-loud in **both** the `tokens.ts` emitter (primitive → `tamaguiRef`) **and** the `themes.ts` emitter (any semantic resolving through `toPrimitivePath` → `tamaguiRef`). `[FACT: build-tokens.mjs:105 tamaguiRef throws on non-category; reached from :130 tokens format AND :154/:158 themes format]` `[FACT: Tamagui fonts = createFont, separate from createTokens — @tamagui/core@2.5.1 CATEGORIES has no font category, build-tokens.mjs:23]` | Route the `fontFamily/fontSize/fontWeight/lineHeight/letterSpacing/shadow` namespaces to **`variables.css` + a typed data export (`fonts.ts`)**; **skip** them in **both** the `tokens.ts` and `themes.ts` createTokens/`tamaguiRef` paths — including semantic tokens that *reference* an aux primitive (B9). The `vida/css-vars` format is already namespace-agnostic (build-tokens.mjs:111–121 never calls `tamaguiRef`) → fonts/shadows emit to CSS with no format change. `createFont`/`createTamagui` wiring = DS-4. |
| **Dark overlay** | Encode real parallel dark values (design.md §XI) without rewriting DS-1's `{value,type}` leaf + validation. | A thin dark override set (only tokens that differ in dark). **It must NOT sit in Style Dictionary's `source` glob** — `source: [TOKENS_DIR/*.json]` (build-tokens.mjs:181) would sweep it in as a phantom layer (`rankOfFile` → −1 → mis-emit into `:root` + same-path deep-merge collision). **Fix: change `source` to the explicit 3-file list** (`primitive/semantic/component.json`) and load the overlay **separately** by filename in the `themes.ts` emitter (mirroring `validate()`'s filename read, build-tokens.mjs:85–88). `light` = `semantic.json`; `dark` = `semantic.json` + overlay. `checkLayers` (which already reads by explicit filename, :85) never sees it — no B1 duplicate-path trip. Maps 1:1 to Figma modes. |

**What it is NOT.**
- NOT the dark **mechanism** — `createTamagui({ themes })` theme-switching + web CSS-var reconciliation are **DS-4**.
  DS-2 supplies the dark *values* only. `[FACT: roadmap.md:89 "DS-4 Tamagui + dark mode"; reconstructed #19]`
- NOT motion tokens — timing/easing/duration are **DS-3**. `[FACT: reconstructed #18]`
- NOT `createFont`/`createTamagui` config — DS-2 emits the font *values* + `fonts.ts` data DS-4 feeds to `createFont`.
- NOT primitive component contracts — button/input/etc. component tokens beyond DS-1's proof are firmed at **DS-5**.
  `[FACT: reconstructed #20]`
- NOT a Figma dependency — code-first per §0.

## 2. Business Rules
DS-2 **inherits** DS-1's invariants B1–B5 (single source; three-layer indirection never skipped; determinism;
generated-never-edited; fail-loud). `[FACT: docs/ui/token-pipeline/current-business-rules.md]` It adds:

- **B6 — Scale completeness.** Color ramps are 10-step (`50,100,200,300,400,500,600,700,800,900`); type scale =
  the 7 sizes of §III; spacing = the §IV 4pt set; radius = the 5 of §V; shadow = 3 levels. No arbitrary values.
  `[FACT: design.md §II–V]`
- **B7 — Parallel dark, designed not inverted.** Every semantic color token that differs in dark has an explicit
  entry in `semantic.dark.json`. Dark is a parallel design, never an inversion or auto-generation.
  `[FACT: design.md §XI, §II "Dark Mode"]`
- **B8 — 4pt grid, non-negotiable.** Every primitive under the **`space` namespace only** is an integer multiple
  of 4. **Build asserts it** (fail-loud, consistent with DS-1's STRUCTURAL-at-root triage). **Explicitly excluded:**
  `radius` (esp. `full: 9999`, not a multiple of 4), `size`, `zIndex`, line-heights, and all aux namespaces — the
  assertion must key on the `space.*` path prefix, not on `type: dimension`. `[FACT: design.md §IV; §V radius full=9999]`
- **B9 — Aux-namespace routing.** Typography + shadow tokens emit to `variables.css` + typed data export (`fonts.ts`)
  and are **skipped** (not failed) by **both** the `tokens.ts` `createTokens` emitter (aux primitives) **and** the
  `themes.ts` emitter (semantic/component tokens whose resolved primitive is aux — else `tamaguiRef` throws B3 at
  build-tokens.mjs:154/158). They never violate B3. `[INTERP: from §1 extension + B3 code paths]`
- **B10 — Contrast is the floor.** Semantic text-on-surface pairs meet WCAG **AA** (4.5:1 body, 3:1 large text) in
  **both** modes; we design above the floor. Verified in the design gate (not build-enforced in DS-2).
  `[FACT: design.md §II "Contrast ratio is the floor"; STANDARDS engineering a11y]`

**Terminal states** (unchanged from DS-1 + B8): success (all targets written, exit 0) · fail-loud on
dangling-ref / layer-skip / empty-layer / **off-grid spacing (B8)** — no partial output, cause named, exit ≠ 0.

## 3. Contract (data/format)

### 3.1 Input — seed additions (classic Style Dictionary `{ "value", "type" }`, refs `{group.name}`)
> Format note: the **live** pipeline uses `value`/`type` (not `$value`/`$type`); DS-2 matches the live code.
> `[FACT: tokens/*.json on main]`

- **`primitive.json`** gains: brand + neutral 10-step color ramps, `success`/`danger` ramps; the full 4pt `space`
  scale; `size` scale (mirrors space where needed); `radius` `sm/md/lg/xl/full`; `zIndex` levels; **aux**:
  `fontFamily`, `fontSize` (7), `fontWeight`, `lineHeight`, `letterSpacing`, `shadow` (3).
- **`semantic.json`** (light, default mode): `color/surface/{primary,secondary,inverse}`, `color/text/{primary,
  muted,inverse}`, `color/brand/primary`, `color/focus/ring`, `color/border/default`, `color/success`,
  `color/danger`; `space/inset/{compact,default,loose,spacious}`; `radius/control`; `shadow/{resting,raised,overlay}`.
  `[FACT: design.md §II semantic examples, §IV component padding, §V]`
- **dark overlay** (NEW) — only tokens whose value differs in dark (e.g. `surface/primary → {color.neutral.900}`,
  `text/primary → {color.neutral.50}`, shadows → border-based per §V). **Lives OUTSIDE the SD `source` glob** — the
  build switches `source` to the explicit 3-file list and the overlay is read by filename in the `themes.ts` emitter
  (see §1 extension table). Same-path override of `semantic.json` is intentional (light↔dark), which is exactly why
  it must not be a phantom SD source layer.
- **`component.json`**: unchanged shape (references semantic only) — DS-2 keeps DS-1's button proof; full set = DS-5.

### 3.2 Output targets (extends DS-1)
| File | Change | Shape |
|------|--------|-------|
| `variables.css` | **+aux namespaces** | now also emits `--fontSize-body`, `--shadow-resting`, … (design.md §XII naming); dark overlay NOT in `:root` here (DS-4 owns the web dark-mode selector) |
| `tokens.ts` | **skip aux** (B9) | `createTokens` over the 5 categories only; font/shadow primitives skipped, no B3 fail |
| `themes.ts` | **+dark overlay** (B7) **+ skip aux-referencing semantics** (B9) | `light` from `semantic.json`; `dark` from `semantic.json` + the filename-loaded overlay; `light_<Comp>`/`dark_<Comp>` as before; semantics resolving to an aux primitive (e.g. `shadow/resting`) are skipped, not B3-failed |
| `build-tokens.mjs` `source` | glob → **explicit 3-file list** | `source: [primitive, semantic, component].json` so the dark overlay is not swept in as a phantom layer (`rankOfFile` −1 bug) |
| `fonts.ts` | **NEW** | typed plain-data export of the typography tokens (family/size/weight/lineHeight/letterSpacing) for DS-4's `createFont`; GENERATED banner |

### 3.3 Build interface (unchanged)
`pnpm --filter @vida/ui tokens:build` → exit 0 on success; non-zero + named cause on B2/B8 violation.
`packages/ui/src/index.ts` re-exports `tokens`, `light`, `dark`, `light_<Comp>`, and `fonts`.

## 4. Acceptance (testable DoD)
- [x] Seed defines the four scale families per §3.1 with **no arbitrary values** (B6): color 10-step ramps,
      7 type sizes, 4pt spacing set, 5 radii, 3 shadows.
- [x] dark overlay exists **outside the SD source glob**; `source` is the explicit 3-file list; `themes.ts` `dark`
      = light + overlay and **differs** from `light` on the overlaid tokens (proves parallel dark, B7); overlay
      tokens do **not** leak into `variables.css` `:root` or `tokens.ts`.
- [x] **B8 proven (scoped):** an off-grid `space/*` primitive (e.g. `space/5: 5`) makes the build exit non-zero,
      cause named — **and** `radius/full: 9999` + line-heights build cleanly (B8 keys on `space.*` only, not `dimension`).
- [x] **B9 proven:** a `fontSize`/`shadow` primitive builds cleanly — emitted to `variables.css` + `fonts.ts`,
      **absent** from `tokens.ts` `createTokens`, and does **not** trip B3.
- [x] `fonts.ts` exports the typography tokens as typed data (consumable by a future `createFont`); GENERATED banner.
- [x] `pnpm --filter @vida/ui typecheck` green (strict, `@tamagui/core` only, no `tamagui.config.ts` → still DS-2⊥DS-4).
- [x] `pnpm --filter @vida/ui test` green — DS-1's 13 fixtures still pass + new fixtures for B7/B8/B9.
- [x] **B4 determinism** holds: two builds byte-identical per target (incl. `fonts.ts`, dark overlay).
- [x] **B10:** semantic text-on-surface pairs meet WCAG AA in both modes (recorded in the design gate).
- [x] **Frontend Visual Gate** (token values only): `pnpm preview:tokens` renders the real palette/type/space/radius/
      shadow (light+dark); critique + preflight pass; **Victor's visual approval** recorded before values ship.
      `[FACT: docs/specs/foundation/frontend-visual-gate.md]` (Pipeline-extension code ships on the normal gate — not visual.)
- [x] `[C]` `current-spec.md` + `current-business-rules.md` refreshed for the themes context; `[L]` layer-doc updated.

## 5. Implementation Prompt
<!-- Ordered; each step cites a §2/§3 rule. Brand hue + typefaces are §6 UNKNOWNs — resolved in Step 2 before this runs. -->
1. **Extend the pipeline** (`build-tokens.mjs`): (a) switch `source` from the `*.json` glob to the explicit
   `[primitive, semantic, component].json` list (removes the overlay phantom-layer bug); (b) define the aux
   namespace set; make **both** the `tokens.ts` emitter (aux primitives) and the `themes.ts` emitter
   (semantics/components resolving to an aux primitive) **skip** aux — not B3-fail (B9); (c) add the `fonts.ts`
   format (typed data of the typography tokens); (d) add the **B8 4pt-grid assertion scoped to `space.*` only** to
   `validate()`/`checkLayers` (fail-loud; must NOT touch `radius/full`, line-heights, aux); (e) load the dark
   overlay by filename in the `themes.ts` emitter and apply it to `dark` (B7). Keep B1–B5 + B4 determinism intact.
2. **Author the color seed** — brand + neutral 10-step ramps, success/danger ramps (primitive); surface/text/
   brand/focus/border/signal semantics (light) + `semantic.dark.json` overlay. Values from §6 design pass. `[FACT: design.md §II]`
3. **Author typography** — `fontFamily` (display+body from §6), `fontSize` ×7, `lineHeight`, `fontWeight`,
   `letterSpacing` (primitive, aux). `[FACT: design.md §III]`
4. **Author spacing / radius / shadow** — 4pt `space` set + `size`; component-padding semantics; `radius`
   `sm/md/lg/xl/full` + `radius/control`; `shadow` 3 levels + dark border-based overlay. `[FACT: design.md §IV, §V]`
5. **Update `packages/ui/src/index.ts`** re-exports to include `fonts`.
6. **Tests** (Vitest) — add fixtures: dark overlay differs (B7); off-grid spacing fails (B8); aux skipped from
   createTokens but present in CSS + `fonts.ts` (B9); determinism holds (B4). Keep DS-1's 13 green.
7. **Done-check:** run every §4 checkbox; regenerate outputs; refresh `[C]`/`[L]` docs.

## 6. Open UNKNOWNs / Decisions Needed
- **⚠ INTENDED-IMMATURE — the token VALUES are a functional placeholder palette, not a brand.** (Victor,
  2026-08-03, at Visual-Gate approval.) The current values — indigo brand, slate neutral, emerald/red signals,
  Space Grotesk/Inter — are accessible + coherent but deliberately **generic**; they will be **replaced when Vida's
  brand identity is defined**. What is FINAL is the token **architecture** (3-layer, 4pt grid, aux namespaces, dark
  overlay, the scales' shape) — the brand pass swaps VALUES in the seed only, no structural change, re-runs the
  Visual Gate. `[MEM: ds-2-palette-is-provisional-placeholder]`
- **[RESOLVED 2026-08-03] Brand hue = indigo · Typefaces = Space Grotesk (display) + Inter (body)** — self-hosted
  (privacy). Provisional per the flag above.
- **[RESOLVED] Type-scale px** — displayLarge 60 / display 36; heading 24 / subheading 18 / body 16 / small 14 /
  caption 12 (design.md §III).
- **[RESOLVED] Shadow token `type`** — SD `type: "shadow"` carrying a CSS box-shadow string; CSS var + skipped from
  createTokens (B9). Built as specified.
- **[CONTRAST caveat → DS-5] white-on-brand.500 = 4.47** (just under AA 4.5 for small text); filled buttons with
  white text use **brand.600** (6.29 ✓). Both tokens exist; component guidance, not a DS-2 value change.
- **[DEFERRED → DS-4] Web dark-mode selector + CSS-var reconciliation** (Tamagui's own web vars vs design.md names).
  Carried from DS-1 §6. `[INTENT: DS-4]`

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-03 | 2026-08-03-ds-2-foundations | initial forward spec: §0 source model, §1 identity + 2 pipeline extensions, §2 B6–B10, §3 data/format contract, §4 acceptance, §5 impl prompt, §6 UNKNOWNs. Structural approach approved (aux namespaces + dark overlay). |
| 2026-08-03 | 2026-08-03-ds-2-foundations | REVISE (independent critique): F1 dark overlay collided with SD `source:['*.json']` glob (phantom rank −1 layer) → `source`→explicit 3-file list + filename-load overlay in themes emitter; F2 B8 scoped to `space.*` only (radius `full:9999`/line-heights excluded); F3 B9 aux-skip must cover the `themes.ts` emitter path (aux-referencing semantics), not just `tokens.ts`. |
| 2026-08-03 | 2026-08-03-ds-2-foundations | **Inheritance rule (frontend source-of-truth Step 5):** this spec's `## 0. Source model` pointer is REQUIRED on every forward frontend spec (DS-3/4/5, UI-*), enforced mechanically by `pnpm check:frontend-source-model`. Next spec author: keep §0. See `docs/specs/foundation/frontend-source-of-truth.md`. |
| 2026-08-03 | 2026-08-03-ds-2-foundations | **Step 2 BUILT.** Pipeline extended (source→3-file list · aux-skip both emitters · `fonts.ts` · B8 space-scoped · dark-overlay loader + `tokenRef` bracket-notation fix). Seed authored: indigo brand + slate neutral + emerald/red signals (10-step ramps); 4pt space + size; radius sm–full; zIndex; type scale (7 sizes + families/weights/line-heights via `fonts.ts`); shadow ×3; `semantic.dark.json` (10 parallel dark overrides). Verify: build ✓ deterministic · `@vida/ui` **20/20** (13 DS-1 + B7/B8/B9) · root typecheck **10/10**. Contrast AA both modes (caveat: white-on-brand.500 = 4.47 → components use brand.600 for filled buttons). **Awaiting Visual Gate stage 4 (Victor).** |
