# Spec: bug:component-subtheme-dark-drift
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: fixed (2026-08-05)   <!-- draft → approved → implemented/fixed -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is labeled [FACT: source] / [INTERP:] / [UNKNOWN:].
Owner layer: DS-1 token pipeline (`packages/ui/src/themes/build-tokens.mjs`). NOT DS-5.
Surfaced-by: DS-5 (LIF-85), while firming the `component.json` intent set.

## 1. Findings (the error document)

**Symptom.** `dark_<Comp>` Tamagui sub-themes are byte-identical to `light_<Comp>` — e.g. generated
`themes.ts:9-10` had `light_Button ≡ dark_Button` (both `backgroundPrimary: tokens.color.brand600`).
In dark mode a component renders its **light-mode** token values; the DS-2 dark overlay
(`semantic.dark.json`) is bypassed for the entire component-token layer. [FACT: generated themes.ts:9-10]

**Root cause (STRUCTURAL — one sentence).** The emitter resolves component tokens to their **primitive**
value and emits `light_`/`dark_` from **one shared object**, collapsing the semantic light/dark
indirection — the defect is in the emitter, not in `component.json`. [FACT: build-tokens.mjs:179,183,217-218]

**The drift vs the spec.** DS-1's projection table mandates the correct shape:
> `export const light_Button = { background: **light**.colorSurfacePrimary, … }` — component→`light_<Comp>`/
> `dark_<Comp>` sub-themes referencing the **base themes**. [FACT: ds-1-token-pipeline/_index.md:113]

Sub-themes must reference `light.<semKey>` / `dark.<semKey>` (the base theme objects). The impl instead
called `toPrimitivePath` (`:179`) + `tokenRef` (`:183`) → raw `tokens.color.brand600`, then duplicated the
object across `light_`/`dark_` (`:217-218`).

**Why it drifted (reason).** DS-1's acceptance prose (`:125`/`:149`) said sub-themes "referencing those
tokens" — ambiguous, read as `tokens.*` — while the projection example (`:113`) showed the base-theme
ref. The implementer followed the prose + duplicated `light_/dark_` as a placeholder. It was **invisible**
while `component.json` held only `button.background.primary` (its brand.primary had no dark override that
mattered), and became **material** when DS-5 added intent variants referencing dark-overridden semantics
(`brand.emphasis`→brand600/brand300, `surface.secondary`→neutral50/neutral800). [INTERP: from :113 vs :183]

**Affected layers / blast radius.** Every `light_/dark_<Comp>` (Button today; all 10 DS-5 primitives
forward); `themes.ts` (generated); `tamagui.config.ts` (consumes `light_/dark_Button`); every component
UI-1 builds against these sub-themes. Classification **STRUCTURAL** (one root cause, many sites).

**Reproduction.** `pnpm --filter @vida/ui tokens:build` → inspect `themes.ts`: `light_Button` and
`dark_Button` are identical despite `semantic.dark.json` overriding `color.brand.emphasis`.

## 2. Fix (what should be done)
At rank-2 (component) in `vida/tamagui-themes`:
1. Read the component token's **semantic** reference (`t.original.value` → `refTarget` → `camel`), not its
   resolved primitive. Skip aux (B9) as before. Store the **semantic key** string.
2. Emit `light_<Comp>[k] = light.<semKey>` and `dark_<Comp>[k] = dark.<semKey>` — the base-theme objects,
   per DS-1:113. Dark inherits the overlay by construction.
3. Guard: a component token must reference a semantic token (checkLayers B2 already enforces the 3-layer
   rule; add a fail-loud if `original.value` is not a ref).
4. **Regression fixture** in `build-tokens.test.ts`: with a component token → a dark-overridden semantic,
   assert `light_<Comp> ≠ dark_<Comp>` (locks the invariant so this can't silently re-drift).

## 3. Verification
- `pnpm --filter @vida/ui tokens:build` deterministic; `themes.ts` now has `light_Button` referencing
  `light.*` and `dark_Button` referencing `dark.*` — values differ where a dark override exists.
- `@vida/ui` test + typecheck green (existing 30 + the new fixture). Root typecheck 10/10.

## 4. Prevention
- When an acceptance criterion's prose and its projection example disagree, the **concrete example is
  authoritative** — encode it as a test, not prose. (Added the `light_≠dark_` fixture.)
- Fixed in the pipeline root (DS-1), not per-component in DS-5 — patching DS-5 would have masked a
  pipeline defect. [[three-gates-each-catch-a-distinct-bug-class]]
