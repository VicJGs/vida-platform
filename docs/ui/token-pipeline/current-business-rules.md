# Token Pipeline — Current Business Rules (durable · §XXIX promotion target)

> **Context:** `@vida/ui` → `packages/ui/src/themes/`. Built by DS-1 (LIF-81), 2026-07-26. Companion:
> `current-spec.md`. Sources: ADR-001 (Tamagui + Style Dictionary), STANDARDS design.md §II/§XII,
> `docs/specs/components/ds-1-token-pipeline/_index.md`. **No-Guessing:** `[FACT: src]` / `[INTENT]` (owed).

## Invariants the pipeline upholds
1. **[FACT] B1 — Single source.** Every emitted value (CSS var, Tamagui token, theme key) traces to exactly one
   seed entry; no value authored twice; no duplicate path across layers. `[design.md §II; build-tokens.mjs checkLayers]`
2. **[FACT] B2 — Three-layer indirection, never skipped.** primitive = literal; semantic references primitive only;
   component references semantic only. A raw literal in a non-primitive layer, a layer-skip, a dangling reference,
   or an empty layer **fails the build loud** (non-zero exit, cause named). `[design.md §II lines 55–79; checkLayers; proven live]`
3. **[FACT] B3 — Naming, scoped per target.** CSS target: seed path `a/b/c` → `--a-b-c` (design.md §XII). Tamagui
   target: Tamagui's schema (flat category tokens accessed `$name`; theme keys; `light_<Comp>` sub-themes) — NOT the
   CSS-var name. The two targets differ in name shape by design; each is deterministic. `[design.md §XII; @tamagui/core]`
4. **[FACT] B4 — Determinism.** Same seed → byte-identical output per target (tokens sorted by path; no dated header).
   `[build-tokens.mjs; vitest "second build is byte-identical"]`
5. **[FACT] B5 — Generated, never hand-edited.** Every output carries a "GENERATED — DO NOT EDIT" banner; the seed
   is the only editable input. `[build-tokens.mjs BANNER/CSS_BANNER]`
6. **[FACT] B6 — Scale completeness (DS-2).** brand + neutral are 10-step ramps; signals success/danger; type scale
   = 7 sizes; spacing = the 4pt set; radius sm→full; shadow ×3. No arbitrary values. `[design.md §II–V; primitive.json]`
7. **[FACT] B7 — Parallel dark, designed not inverted (DS-2).** semantics that differ in dark have an entry in
   `semantic.dark.json` (→ a primitive); `themes.ts` dark = light + overlay, loaded by filename (not SD source), maps
   1:1 to Figma modes. `[design.md §XI; build-tokens.mjs; vitest B7]`
8. **[FACT] B8 — 4pt grid, `space.*` only (DS-2).** every primitive `space.*` is an integer multiple of 4; build
   fails loud otherwise. Radius (`full:9999`), size, zIndex, line-heights, aux are exempt. `[design.md §IV; checkLayers; vitest B8]`
9. **[FACT] B9 — Aux-namespace routing (DS-2).** `fontFamily/fontSize/fontWeight/lineHeight/letterSpacing/shadow` are
   NOT createTokens categories → CSS + `fonts.ts`, **skipped** in `tokens.ts`/`themes.ts` (incl. aux-referencing
   semantics); never trip B3. `[build-tokens.mjs AUX/isAuxPath; vitest B9]`
10. **[FACT] B10 — Contrast is the floor.** semantic text-on-surface pairs meet WCAG AA in both modes (caveat:
    white-on-brand.500 = 4.47 → buttons use brand.600). Verified in the design gate. `[design.md §II; DS-2 contrast check]`
11. **[FACT] B11 — Motion primitives, aux-routed, standard-aligned (DS-3).** `duration.*` (unitless ms numbers) and
    `easing.*` (CSS cubic-bezier/linear strings) are primitives routed to `variables.css` + `motion.ts` and **skipped**
    by both the `tokens.ts` and `themes.ts` emitters (not Tamagui categories — a third aux consumer alongside
    typography→`fonts.ts` and shadow→CSS). Every duration sits in a `motion.md §IX` band; every easing is one of the
    3 canonical cubic-beziers or `linear`. No arbitrary timing/curve; >500ms would need written justification (none).
    `[motion.md §IX; build-tokens.mjs MOTION/AUX; vitest B11 + fonts-isolation + css-vars presence]`
12. **[FACT] B12 — Motion contract, documented + component-gate-enforced (DS-3).** Two rules travel with the motion
    foundation but are **not** build-enforced at the token layer (no component code here): (a) **reduced-motion** —
    every animation ships a `prefers-reduced-motion: reduce` alternative that is an *instant state change* (not the
    absence of motion; if it communicates state, the reduced path communicates it another way); (b) **safe
    properties only** — animate `transform`/`opacity`/`clip-path` only, never `color`/`background`/`box-shadow`/
    `border`/`width`/`height`/`top-left-right-bottom`/`margin`/`padding`. Enforced at the component gate (DS-5/UI-*);
    the themes layer-doc is B12's enforcement artifact. `[motion.md §IX]`

## Rules established by DS-1 (IMPLEMENTED 2026-07-26)
- **[NEW]** design.md §II three-layer architecture is now **enforced mechanically** by the build (B2), not by review
  convention — a layer-skip cannot ship. This is the design-gate "three-layer" item passing *by construction*.
- **[NEW]** design.md §XII CSS-var naming is **enforced** by the CSS formatter (`--<path-with-dashes>`).
- **[NEW]** DS-1 ⊥ DS-4: the Tamagui token/theme modules typecheck **standalone** (no `tamagui.config.ts`), so the
  pipeline is not circularly dependent on the app config DS-4 builds. `[FACT: typecheck green]`

## Rules established by DS-2 (IMPLEMENTED 2026-08-03)
- **[DONE]** Token **values** authored code-first (B6) + **parallel dark** (B7) + **4pt grid enforced** (B8) +
  **aux routing** (B9). ⚠ values are a provisional placeholder palette, not brand ([[ds-2-palette-is-provisional-placeholder]]).
- **[DONE]** Approved via the **Frontend Visual Gate** (`docs/specs/foundation/frontend-visual-gate.md`) — its first run.

## Rules established by DS-3 (IMPLEMENTED 2026-08-03)
- **[DONE]** Motion primitives (B11) — `duration` (instant 0/fast 150/moderate 250/slow 400, unitless ms) +
  `easing` (out/in/inOut cubic-beziers + linear) added as a **third aux consumer**: `AUX` factored into
  `TYPOGRAPHY`→`fonts.ts` · `shadow`→CSS · `MOTION`→`motion.ts` (leak-proof by set membership, closed the
  fonts↔motion collision by construction). @vida/ui 26/26 (20 DS-2 + 6 DS-3), root typecheck 10/10.
- **[DONE]** Motion contract (B12) recorded — reduced-motion + safe-property obligations documented for the
  component gate (DS-5/UI-*); the render preview demos animate transform+opacity only + honor reduced-motion.
- **[DONE]** Approved via the **Frontend Visual Gate** — its second run (motion demos: 4 durations × 4 easings).

## Boundaries (what the pipeline does NOT own — owed downstream)
- **[INTENT: DS-4]** `tamagui.config.ts` (`createTamagui`), provider, dark-mode **mechanism** (theme-switch), and the
  CSS-var reconciliation (Tamagui's own web vars vs the design.md `variables.css` names; incl. the unitless-duration
  `ms` reconciliation + the lone camelCase `--easing-inOut`). `createFont` consumes `fonts.ts`; **`createAnimations`
  consumes `motion.ts`** + composes named transition presets (duration+easing pairs the 3-layer seed can't express).
  ⚠ `createAnimations` config shape is **driver-dependent** (CSS driver = duration+easing; RN driver = spring configs,
  no cubic-bezier) — DS-4 picks the driver and reconciles what it consumes. `[UNKNOWN: driver — verify at DS-4]`
- **[INTENT: DS-5]** component-token expansion + the white-on-brand.500 contrast caveat (buttons → brand.600).
- **[INTENT: later / M4 P2-⑦]** Figma community file + MCP-scripter bridge (NOT Tokens Studio). `[DIRECTION: Victor 2026-08-03]`
