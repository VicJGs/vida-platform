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

**What differs per preset = the primitive RAMP the semantics resolve to (paper/ink neutral + accent brand) + the
font-family.** The semantic STRUCTURE is identical across presets (`surface/text/brand/focus/border/signal`,
`space.inset`, `radius`) — only the values behind it change (R1: color + font only).

**Chosen architecture — generalize the proven overlay pattern (reuses B7, least-invasive to checkLayers/B1):**
- **primitive.json** gains **per-preset ramps**, namespaced: `color.reader.{paper,ink.50..900,accent.50..900}`,
  `color.editorial.{…}`, `color.quietDesk.{…}`. Shared `signal.{success,danger}` + `white` stay global. Aux
  `fontFamily.{reader,editorial,quietDesk}.{display,body,chrome}` (the 6 faces across 3 presets).
- **semantic.json** stays the single structural contract but becomes **preset-agnostic templates**; the per-preset
  resolution is supplied by **overlay files** mirroring `semantic.dark.json`:
  `semantic.reader.json` · `semantic.editorial.json` · `semantic.quietDesk.json` (light) +
  `semantic.<preset>.dark.json` (the dark delta per preset). Default preset = **editorial** (its overlay = the base).
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
- Generalize the single `light`/`dark` emission into a **preset loop**: for each `P ∈ {reader, editorial, quietDesk}`
  emit `P` (base + `semantic.P.json`) and `P_dark` (base + `semantic.P.json` + `semantic.P.dark.json`), reusing the
  existing overlay-merge + `toPrimitivePath`/`tamaguiRef`/`tokenRef` machinery.
- **Component sub-themes under the preset axis (gate-1 blocking fix).** Tamagui resolves `light_Button` because the
  active base theme is `light`; a component rendered under base theme `editorial` needs **`editorial_Button`** (+
  `editorial_dark_Button`) or it loses its overrides and falls back to the parent theme. So the sub-theme emission
  **generalizes to per-preset-mode** — `<preset>[_dark]_<Comp>` for the 20 Comps = **up to 120 sub-themes**, each still
  resolving to its preset base-theme's semantic keys (the `:177-188` base-key mechanism, now parameterized by preset).
  **The exact Tamagui theme-resolution + fallback behaviour (does a missing `editorial_Button` fall back to `Button`
  or to `editorial`?) is resolved at `/preflight` against `@tamagui/core@2.5.1`** — if Tamagui provides a
  preset-independent component-theme fallback, the count drops; that is a preflight finding, NOT a build-time guess.
  No sub-theme is emitted whose base-key is identical across all presets AND modes (dedupe), but correctness (every
  active preset×mode has a resolvable Comp theme) is the floor.
- `fonts.ts`: emit **per-preset font-family data** (keep the shared role-keyed size/weight/lineHeight/letterSpacing
  scales; only `fontFamily` branches per preset). Aux routing (B9) unchanged.
- Keep: 3-layer check (B2), 4pt grid (B8), determinism/sort (B4), GENERATED banners (B5), aux-skip (B9).

## 4. Generated output shape (after build)
- `themes.ts`: `reader, reader_dark, editorial, editorial_dark, quietDesk, quietDesk_dark` (+ any genuinely-varying
  `<preset>_<mode>_<Comp>` sub-themes) — each a flat key→`tokens.*` object.
- `fonts.ts`: `fonts.fontFamily.{reader,editorial,quietDesk}.{display,body,chrome}` + shared scales (density tokens → S3).
- `tokens.ts`/`variables.css`: carry the new primitive ramps + density scales.

## 5. Values (from the P1 record — FACT, not invented)
Per-preset light palettes + type from the P1 specimen [FACT: p1-identity-specimen.html:49-104]:
- **reader** paper `#faf7f0` · ink `#211d17`/`#2c2820` · accent oxblood `#9a2a2a` · Fraunces/Newsreader/Inter.
- **editorial** paper `#fbfbfa` · ink `#16181d`/`#3a3f48` · accent ink-blue `#1d4ed8` · Spectral/Spectral/Inter.
- **quietDesk** paper `#f4f2ec` · ink `#26251f`/`#423f36` · accent olive `#5a6b3f` · Source Serif 4/Source Serif 4/IBM Plex Sans.
- **dark** per preset = B7 overlay (paper↔deep-ink, text↔light, accent→contrast-lifted step); modeled parallel, not inverted
  (B7). Ramps (50..900) interpolated around each anchor; **contrast = AA floor both modes** (B10 — verified in-build).

## 6. Tests (`build-tokens.test.ts`, extend the 31)
- 6 themes emit with the right keys; each preset resolves to ITS ramp (not the default's).
- Per-preset dark overlay applies (reader_dark ≠ reader; not ≡ editorial_dark).
- Per-preset font-family routes to `fonts.ts`; shared scales unchanged.
- Determinism (byte-identical rebuild), 4pt grid, 3-layer check still fail-loud (regression fixtures).
- Contrast AA per preset × mode (B10).

## 7. Verification (Step 8–10 for S1 — non-visual slice)
`pnpm --filter @vida/ui tokens:build` deterministic · `build-tokens.test.ts` green · `pnpm --filter @vida/ui typecheck`
0 · root typecheck green · no hard-coded palette · GENERATED banners intact. **No Visual Gate at S1** (no rendered
surface; the rendered presets × density Visual Gate is **S3**).

## 8. Risks / seams
- **Density mechanism** (how calm/dense maps to Tamagui tokens) is **S3 + /preflight** — S1 only authors the scale values.
- **Ramp interpolation** (50..900 per preset from the P1 anchors) — keep placeholder-honest where P1 gave one anchor;
  the exact mid-steps are a token-value detail (brand pass may refine), architecture is final (ds-2 placeholder precedent).
- **Emitter blast radius** — the loop refactor touches the most load-bearing format; mitigated by the regression fixtures (B2/B4/B8) + determinism test.

## 9. §XXIX currency (on S1 done)
Refresh `docs/ui/token-pipeline/current-spec.md` + `current-business-rules.md` — new B-rule: **B-codec-1** N-preset
families via per-preset overlays (generalizes B7); density scales authored. Promote with the code.
