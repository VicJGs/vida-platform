# fe-codec-theme · S1 — Token families + emitter (forward spec / PLAN)

> **Slice:** S1 of 3 (slice-map.md). **Context:** `@vida/ui` → `packages/ui/src/themes/` (ds-2). **Gate:** §XXVI
> (PLAN → /critique → Approval 1 → /preflight → /critique → Approval 2 → build). **Baseline:** token-pipeline
> current-spec/current-business-rules (B1–B12), build-tokens.mjs, tokens/*.json. **No-Guessing:** `[FACT: src]`.

## 1. Objective (S1 only)
Extend the token layer from **one placeholder family (light/dark)** to **3 preset families × light/dark = 6 themes**,
each carrying its own palette + font-family, plus a **2-level density scale** — all emitted from the seed by
`build-tokens.mjs`, preserving every invariant B1–B12. **S1 authors tokens + emitter + tests only.** `createFont`/
`createTamagui` wiring + real font serving = **S2**; provider/density application + app rewire = **S3**.

## 2. Mechanism (doc-fixed) + the chosen seed architecture (proposed, technical)
Doc-fixed: presets = **Tamagui sub-themes → N theme families** [FACT: decisions.md:9]. Dark = the **B7 overlay**,
generalized per preset [FACT: build-tokens.mjs:191-209 + current-business-rules B7].

> ### 2a. Preflight resolution — Tamagui **2.6.2** (installed), scheme-first naming [RESOLVED — grounds the names below]
> Verified against the **installed** `@tamagui/core@2.6.2` resolver (`@tamagui/web/dist/cjs/hooks/useThemeState.cjs`),
> per the verify-against-installed-lib rule. (Spec originally cited 2.5.1 — corrected to the installed 2.6.2.)
> - **A theme's light/dark SCHEME is its FIRST `_`-segment, and ONLY `light`/`dark` are valid schemes** —
>   `const validSchemes = { light, dark }` [:312]; `getScheme = name.split('_')[0]` [:317]. So `editorial_dark`
>   reads as scheme **`editorial`** → `undefined` (NOT dark) → breaks inversion (`isInverse` :267), `reset` (:339),
>   and the `found===parentName && !validSchemes[found]` guard (:394). **Theme names MUST be scheme-FIRST.**
> - **NAMING LAW (this codec):** the **default preset (`editorial`) keeps the bare scheme names `light`/`dark`**
>   (+ the existing `light_<Comp>`/`dark_<Comp>`); the non-default presets are **`${mode}_${preset}`** —
>   `light_reader`·`dark_reader`·`light_quietDesk`·`dark_quietDesk` — with sub-themes `${mode}_${preset}_<Comp>`.
>   Every name's first segment is a valid scheme. This keeps `tamagui.config.ts`'s `import { light, dark, light_Button… }`
>   **unchanged at S1** (editorial = today's output) → S1 is emitter-only and typecheck-green by construction; S2 adds the
>   2 net-new presets' themes to `createTamagui` additively.
> - **Per-preset component sub-themes are REQUIRED (O3's "no explosion" hypothesis is REFUTED).** For a styled
>   component (name undefined, `componentName` set) the resolver tries **exactly one** candidate —
>   `` `${parentParts.join('_')}_${componentName}` `` [:377-379] — and does **NOT** fall back to a bare `<Comp>`
>   theme. So under base `light_reader` a `Button` needs `light_reader_Button` to exist, or it loses its overrides to
>   the parent. Count = **(components in component.json) × presets × modes** = 10 × 3 × 2 = **~60 sub-themes**
>   (20 already exist as editorial's bare `light_/dark_<Comp>`; **40 net-new** for reader/quietDesk). No cross-preset
>   dedup (each resolves to its own preset's color tokens → all distinct). Bounded; the test asserts the exact count.
> - **Density is NOT a theme/token-swap** [DEF-U8-h, confirmed]: Tamagui resolves `space`/`size` **dimension** props
>   against the **global token scale**, theme swaps **color only**. Density therefore applies via a **provider CSS
>   data-attribute scale** (the injected-CSS precedent), resolved in **S3** — so S1 correctly authors **no density
>   tokens** (the gate-1 fix stands).

**What differs per preset = the primitive RAMP the semantics resolve to (paper/ink neutral + accent brand) + the
font-family.** The semantic STRUCTURE is identical across presets (`surface/text/brand/focus/border/signal`,
`space.inset`, `radius`) — only the values behind it change (R1: color + font only).

**Chosen architecture — generalize the proven overlay pattern (reuses B7, least-invasive to checkLayers/B1):**
- **primitive.json** gains **per-preset ramps**, namespaced: `color.reader.{paper,ink.50..900,accent.50..900}`,
  `color.editorial.{…}`, `color.quietDesk.{…}`. Shared `signal.{success,danger}` + `white` stay global. Aux
  `fontFamily.{reader,editorial,quietDesk}.{display,body,chrome}` (the 6 faces across 3 presets).
- **semantic.json** stays the single structural contract (surface/text/brand/focus/border/signal + space.inset + radius)
  and **IS the default preset (editorial)** — its color refs repoint from the DS-2 placeholder (`color.brand.*`/
  `color.neutral.*`) to **`color.editorial.*`**. editorial needs **no separate overlay** ("its overlay = the base").
  The non-default presets get overlay files mirroring `semantic.dark.json`: `semantic.reader.json` ·
  `semantic.quietDesk.json` (full light remap to that preset's ramp) + `semantic.<preset>.dark.json` (the dark delta).
  **6 semantic files total:** `semantic.json` + `semantic.dark.json` (editorial, existing) + `semantic.reader.json` +
  `semantic.reader.dark.json` + `semantic.quietDesk.json` + `semantic.quietDesk.dark.json`. **No `semantic.editorial.json`.**
  - **Overlay validation (gate-1 fix).** These files load BY FILENAME (like `semantic.dark.json`) and so **bypass
    `checkLayers`/B2**. The emitter MUST apply the same inline overlay-validation the dark overlay already gets
    (`:198-200`: each entry isRef + resolves to a loaded primitive, else fail loud), extended to per-preset files.
    **Merge precedence is explicit: base < `semantic.<preset>.json` < `semantic.<preset>.dark.json`.**
- **density:** authoring the density token *shape* is **deferred to S3** (gate-1 fix) — its consuming mechanism (how
  calm/dense maps to Tamagui tokens) is an explicit S3/preflight open seam, and authoring the shape before the mechanism
  risks a wrong shape. S1 does **not** add density tokens; S3 authors them co-located with its mechanism. (`space.inset`
  `compact/default/loose/spacious` already exists and is untouched here.)

**Alternative considered + rejected:** parameterizing semantic refs inside the emitter (e.g. `surface→color.$preset.surface`)
— a deeper emitter rewrite that breaks the "overlay loaded by filename" model + checkLayers' static ref-resolution.
The overlay approach keeps B1/B2 intact and each preset auditable as a file. *(Final call confirmed at /preflight.)*

## 3. Emitter changes (`build-tokens.mjs`)
- Generalize the single `light`/`dark` emission into a **preset loop** over `P ∈ {editorial, reader, quietDesk}`,
  emitting **scheme-first names** (§2a NAMING LAW): the **default `editorial`** → bare **`light`** (`semantic.json`) and
  **`dark`** (`semantic.json` + `semantic.dark.json`) — today's emission path, unchanged; each non-default `P` →
  **`light_P`** (`semantic.json` + `semantic.P.json`) and **`dark_P`** (+ `semantic.P.dark.json`). Reuse the existing
  overlay-merge + `toPrimitivePath`/`tamaguiRef`/`tokenRef` machinery. Merge precedence per non-default preset:
  **`semantic.json` < `semantic.P.json` < `semantic.P.dark.json`** (the P-light remap overrides the editorial base; the
  P-dark delta overrides that). The overlay-merge's missing-file branch (`:206-208`) already degrades cleanly.
- **Component sub-themes under the preset axis — CONFIRMED REQUIRED at /preflight (not a guess).** Verified against the
  installed 2.6.2 resolver [:377-379]: a styled component tries exactly **one** name `` `${base}_${componentName}` ``
  and does **NOT** fall back to a bare `<Comp>`. So the sub-theme emission **generalizes to per-scheme-preset** —
  `<Comp>` emits `light[_P]_<Comp>` / `dark[_P]_<Comp>` (editorial keeps today's bare `light_<Comp>`/`dark_<Comp>`),
  each resolving to its own base-theme's semantic keys (the `:177-188` base-key mechanism, now parameterized by preset).
  **Count = components × presets × modes = 10 × 3 × 2 = ~60** (20 existing editorial + **40 net-new**); no cross-preset
  dedup (distinct preset color tokens). Correctness floor: every active (scheme,preset) has a resolvable `<Comp>` theme.
- `fonts.ts`: emit **per-preset font-family data** (keep the shared role-keyed size/weight/lineHeight/letterSpacing
  scales; only `fontFamily` branches per preset). Aux routing (B9) unchanged.
- Keep: 3-layer check (B2), 4pt grid (B8), determinism/sort (B4), GENERATED banners (B5), aux-skip (B9).

## 4. Generated output shape (after build) — scheme-first (§2a)
- `themes.ts`: 6 base themes — `light, dark` (editorial default, **unchanged**) + `light_reader, dark_reader,
  light_quietDesk, dark_quietDesk` — plus ~60 sub-themes `light[_P]_<Comp>`/`dark[_P]_<Comp>` (editorial's 20 bare
  `light_<Comp>`/`dark_<Comp>` **unchanged** + 40 net-new). Each a flat key→`tokens.*` object. **`tamagui.config.ts`'s
  existing `import { light, dark, light_Button, … }` stays resolvable** (editorial = today's export NAMES) → S1 touches
  no config; S2 adds the reader/quietDesk base+sub-themes to `createTamagui`. (editorial's theme VALUES repoint to the
  `color.editorial.*` ramp — the intended new palette, not byte-identical to the DS-2 placeholder.)
- **CSS-var payload (engineering §XIII):** 6 base + ~60 sub-themes grow the Tamagui-compiled CSS-var output; the payload
  is **measured at the S3 app Visual Gate** (no shipped route exists at S1). Bounded — 10 comps × 3 presets × 2 modes.
- `fonts.ts`: `fonts.fontFamily` = editorial **bare** `{display, body, chrome}` (config-resolvable) + camel-keyed
  `{readerDisplay, readerBody, readerChrome, quietDeskDisplay, quietDeskBody, quietDeskChrome}` (the emitter's existing
  camel-flatten over the nested seed — no fonts-emitter change needed); shared size/weight/lineHeight/letterSpacing scales unchanged.
- `tokens.ts`/`variables.css`: carry the new per-preset primitive ramps (`color.<preset>.{neutral,accent}.*`). **No density
  tokens at S1** (density = a provider CSS data-attr scale, S3 — §2a/§8); the existing `space.inset` scale is untouched.

## 5. Values (from the P1 record — FACT, not invented)
Per-preset light palettes + type from the P1 specimen [FACT: p1-identity-specimen.html:49-104]:
- **reader** paper `#faf7f0` · ink `#211d17`/`#2c2820` · accent oxblood `#9a2a2a` · Fraunces/Newsreader/Inter.
- **editorial** paper `#fbfbfa` · ink `#16181d`/`#3a3f48` · accent ink-blue `#1d4ed8` · Spectral/Spectral/Inter.
- **quietDesk** paper `#f4f2ec` · ink `#26251f`/`#423f36` · accent olive `#5a6b3f` · Source Serif 4/Source Serif 4/IBM Plex Sans.
- **dark** per preset = B7 overlay (paper↔deep-ink, text↔light, accent→contrast-lifted step); modeled parallel, not inverted
  (B7). Ramps (50..900) interpolated around each anchor; **contrast = AA floor on every rendered text pair × preset × mode**
  (B10 — enforced in-build by the full-matrix test in §6, g2-added). **Dark-mode caveat (g2):** the warm reader/quietDesk
  dark surfaces (`neutral.900`) are the tight constraint — ghost text (`brand.primary`→`accent.400`) and muted
  (`neutral.400`) on them pin the dark accent/neutral steps; the reader/quietDesk `accent.400`/`neutral.900`/`neutral.400`
  (and quietDesk `accent.500/600` for light ghost) were tuned to clear AA with ≥0.4 margin. A future brand pass must
  re-run the matrix, not just eyeball the light mode (this is the symmetric partner of the DS-2 white-on-`brand.500`→`.600` caveat).

## 6. Tests (`build-tokens.test.ts`, extend the 31)
- **Scheme-first names (§2a):** base set === `{light, dark, light_reader, dark_reader, light_quietDesk, dark_quietDesk}`;
  **every name's first `_`-segment ∈ {light,dark}** (the Tamagui scheme law — a `*_dark` or bare-preset name FAILS).
- **Backward-compat (S1 typecheck guard):** `light`/`dark` + the 20 editorial `light_<Comp>`/`dark_<Comp>` still export
  with unchanged keys (editorial = today's output) — asserts `tamagui.config.ts` imports stay resolvable.
- **Exact sub-theme count** === components(component.json) × presets × modes (10×3×2 = 60); 40 net-new vs the 20 existing.
- Each preset resolves to ITS ramp (not the default's); per-preset dark overlay applies (`dark_reader` ≠ `light_reader`;
  not ≡ `dark`); per-preset font-family routes to `fonts.ts`, shared scales unchanged.
- Determinism (byte-identical rebuild), 4pt grid, 3-layer check still fail-loud (regression fixtures); per-preset overlay
  validation fails loud on a non-ref / dangling entry (extends the dark-overlay fixture).
- Contrast AA per preset × mode (B10).

## 7. Verification (Step 8–10 for S1 — non-visual slice)
`pnpm --filter @vida/ui tokens:build` deterministic · `build-tokens.test.ts` green · `pnpm --filter @vida/ui typecheck`
0 · root typecheck green · no hard-coded palette · GENERATED banners intact. **Typecheck-green by construction** —
editorial keeps the bare `light`/`dark` names so `tamagui.config.ts` + `provider.tsx` are untouched at S1 (config
rewire = S2, provider = S3). **No Visual Gate at S1** (no rendered surface; the rendered presets × density Visual Gate
is **S3**).

## 8. Risks / seams
- **Density mechanism** — **preflight-RESOLVED (§2a):** NOT a Tamagui theme/token-swap (DEF-U8-h — dimension props read
  the global token scale, theme swaps color only); it is a **provider CSS data-attr scale**, owned by **S3**. S1 authors
  **no density tokens** (gate-1 fix confirmed); the existing `space.inset` compact/default/loose/spacious is untouched.
- **Ramp interpolation** (50..900 per preset from the P1 anchors) — keep placeholder-honest where P1 gave one anchor;
  the exact mid-steps are a token-value detail (brand pass may refine), architecture is final (ds-2 placeholder precedent).
- **Emitter blast radius** — the loop refactor touches the most load-bearing format; mitigated by the regression fixtures (B2/B4/B8) + determinism test.

## 9. §XXIX currency (on S1 done)
Refresh `docs/ui/token-pipeline/current-spec.md` + `current-business-rules.md` — new B-rule: **B-codec-1** N-preset
families via per-preset overlays (generalizes B7); density scales authored. Promote with the code.
