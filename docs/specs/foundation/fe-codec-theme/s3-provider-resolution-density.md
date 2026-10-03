# fe-codec-theme · S3 — Provider + resolution + density + app rewire · forward spec / PLAN

> **Slice:** S3 of 3 (final ②) [FACT: slice-map.md S3]. **Context:** `@vida/ui` → `packages/ui/src/provider.tsx` +
> the typed contract export (`index.ts`); `apps/web` → `apps/web/src/App.tsx`. **Gate:** §XXVI (PLAN → /critique →
> Approval 1 → /preflight → /critique → Approval 2 → build), then the **blocking per-slice Visual Gate** (Step 10) →
> PR for ①. **Baseline:** S1 shipped 6 scheme-first base themes + 60 sub-themes [FACT: themes/themes.ts 66 exports];
> S2 shipped `createTamagui({themes:{...T}})` + 2 var-driven `createFont` keys reading
> `var(--vida-font-body/display, <Spectral fallback>)` [FACT: tamagui.config.ts:50-63,78] + all 3 families' faces served
> [FACT: apps/web/public/fonts/{spectral-*,fraunces-vf,newsreader-vf,source-serif-4-vf}.woff2; apps/web/src/fonts.css].
> **No-Guessing:** every claim `[FACT: src]` / `[INTERPRETATION]` / `[UNKNOWN → /preflight]`.

## 1. Objective (S3 only)

Make the codec **switchable from the app**: a pure resolution function + a widened provider that (a) resolves a
`{preset, mode, density}` selection → the scheme-first Tamagui theme name, (b) applies the per-preset **font** CSS vars
(the S2 seam) and the **density** CSS scale on the theme root, and (c) is fed its cold-start default by `App.tsx`
(replacing the hardcoded `theme="light"` — the W2 fix). S3 owns: `provider.tsx`, the typed contract in the barrel, and
the `App.tsx` rewire. **S3 does NOT** build the switcher UI, the Zustand theme store, or the `user_preferences` write —
those are app/Settings, a later unit [FACT: seam-contract.md:5-6; interpretation.md R5/O1].

## 2. Architecture (seam-contract-fixed)

The exported surface is **doc-fixed** [FACT: seam-contract.md:9-38] — S3 implements it verbatim, no net-new API:

```ts
type ThemePreset  = 'reader' | 'editorial' | 'quietDesk'
type ThemeMode    = 'light' | 'dark'
type ThemeDensity = 'calm' | 'dense'
interface ThemeSelection { preset: ThemePreset; mode: ThemeMode; density: ThemeDensity }
type ThemeName = ThemeMode | `${ThemeMode}_reader` | `${ThemeMode}_quietDesk`   // scheme-first (G1)

const THEME_DEFAULT: ThemeSelection          // { editorial, light, calm } — cold-start (R2/R6)
const THEME_PRESETS: readonly ThemePreset[]   // ['reader','editorial','quietDesk']

function resolveTheme(sel: ThemeSelection): { themeName: ThemeName; density: ThemeDensity }
interface UIProviderProps extends Omit<TamaguiProviderProps,'config'|'defaultTheme'> { selection?: ThemeSelection }
function UIProvider(props: UIProviderProps): JSX.Element
export { useVidaTheme }  // unchanged
```

Three mechanisms converge on **one provider-owned CSS layer on the theme root**:
1. **Theme name** → `TamaguiProvider defaultTheme` (the existing re-root mechanism; color only) [FACT: provider.tsx:20-24].
2. **Font family** → set `--vida-font-body` / `--vida-font-display` per preset (the S2 seam; editorial = no override =
   the baked fallback) [FACT: tamagui.config.ts:46-49].
3. **Density** → set the density CSS scale under the same root (the §6 mechanism).

## 3. `resolveTheme` (pure, unit-testable — no React)

```ts
function resolveTheme(sel: ThemeSelection) {
  const themeName = sel.preset === 'editorial' ? sel.mode : `${sel.mode}_${sel.preset}` as ThemeName
  return { themeName, density: sel.density }
}
```
[FACT: seam-contract.md:26-29]. Scheme-first is **law** (Tamagui 2.6.2: a theme's scheme = first `_`-segment, only
`light`/`dark` valid; `${preset}_dark` breaks inversion/reset) [FACT: current-business-rules.md:96-100; slice-map.md:54].
`editorial` keeps the bare `light`/`dark`; `reader`/`quietDesk` prefix `${mode}_${preset}`. Exhaustive: the 6 `(preset×mode)`
inputs map 1:1 to the 6 base theme names that exist on `config.themes` [FACT: themes.ts base exports].

## 4. Provider (`provider.tsx`)

- Widen the contract: `theme?: 'light'|'dark'` → `selection?: ThemeSelection` (defaults to `THEME_DEFAULT`)
  [FACT: seam-contract.md:31-35]. `ThemeName` widens from `'light'|'dark'` to the §2 union.
- `const { themeName, density } = resolveTheme(selection)`.
- Render `<TamaguiProvider config={config} defaultTheme={themeName}>{children}</TamaguiProvider>` (the existing re-root
  mechanism, color only) — **no wrapper div**. Everything else is applied by a layout effect on `<html>` (below).
- **Mount point = `document.documentElement` (`<html>`), via a layout effect (G1).** The font + density vars must reach
  **portalled** content too: Select/Menu/Dialog/Popover/Toast portal to `document.body` [FACT: packages/ui/src/CLAUDE.md].
  A wrapper `<div>` inside `TamaguiProvider` is **not** an ancestor of body-portals → a Dialog in dense/reader would render
  calm/editorial. Theme *color* crosses to portals only because the theme class is on `<html>` (`addThemeClassName:'html'`
  [FACT: tamagui.config.ts:83]) + portals re-wrap in `<Theme name>`; but font/density vars are **not theme values**, so a
  `<Theme>` re-wrap won't carry them (Tamagui docs: fonts are global, not per-theme — [FACT: tamagui.dev/docs/core/configuration
  "No documented support for swapping fonts per theme"]). ∴ the vars MUST sit on an ancestor of BOTH the app and the
  body-portals = `<html>`. React does not render `<html>`, so this is an effect, not an inline-style JSX root.
- **ONE apply/clear mechanism = direct `setProperty` on `<html>` (B1).** The single `useLayoutEffect`/`useInsertionEffect`
  does, on `[themeName, preset, density]` change:
  - **fonts:** reader/quietDesk → `documentElement.style.setProperty('--vida-font-body', fonts.fontFamily.<preset>Body)`
    (+ `display`); **editorial → `removeProperty` both** (N1 — fall back to the baked Spectral) [FACT: fonts.ts:5 family
    strings, imported not hardcoded, R1].
  - **density:** dense → `setProperty` each runtime-read band var (space + type, §6) to its dense value; **calm →
    `removeProperty`** (fall back to the base scale).
  - **marker:** `setAttribute('data-vida-density', density)` — a **semantic hook / escape hatch only**, NOT the value
    carrier. The values ride `setProperty`; there is **no attribute-selector stylesheet** (it can't be authored against
    runtime-only var names — §6/G4). (If a CSS-selector form is ever wanted, it must be a runtime-injected `<style>` built
    from the `getToken` names — out of scope here.)
  So fonts and density share the identical `setProperty`/`removeProperty` path; editorial+calm = the clean base state.
- **Effect deps + idempotency (N1):** deps = `[themeName, preset, density]` (not every render). `setProperty`/`removeProperty`
  are idempotent → the StrictMode double-invoke is safe. The root provider never unmounts, so cleanup-on-unmount is optional
  (stated, not relied on).
- **FOUT:** cold-start is editorial+calm = the baked fallback / base scale → **no flash now**; a persisted non-editorial/dense
  initial (future Settings) would flash one frame — acceptable for S3 (default is editorial+calm), noted for the Settings unit.
  No wrapper div → no flex-collapse risk ([[flex1-child-collapses-to-height-0-in-column-under-rnw]] moot here).

## 5. `App.tsx` rewire (the W2 fix)

Replace `<UIProvider theme="light">` [FACT: App.tsx:71] with `<UIProvider selection={THEME_DEFAULT}>` (explicit
cold-start; later Settings feeds the Zustand value) [FACT: seam-contract.md:41-42]. **No store, no switcher** (R5).
Backward-compat: bare `<UIProvider>` in test wrappers keeps working via the `THEME_DEFAULT` fallback — **no test-wrapper
edits** [FACT: seam-contract.md:49-51]; verify the call-sites (`routes.test.tsx`, `shell/test-router.tsx`, etc.).

## 6. Density mechanism — the crux (LEAD + FALLBACK; the make-or-break spike → /preflight)

**Doc-fixed intent** [FACT: seam-contract.md:53-58; current-business-rules.md:103-105]: density is **NOT** a Tamagui
theme/token swap — Tamagui resolves `space`/`size` dimension props against the **global** token scale, theme swaps color
only (DEF-U8-h) [FACT: packages/ui/src/CLAUDE.md DEF-U8-h]. It is a **provider-applied CSS scale** keyed by
`data-vida-density`, rescaling `space.inset` + the type ramp. Grounding `@tamagui/core@2.6.2` sharpened the binding:

- Token CSS var names are **hashed** (`createVariables` → `simpleHash(key)` → `--space-<hash>`)
  [FACT: @tamagui/web 2.6.2 createVariables.cjs:46-47] — so names can't be hand-authored, **but** each token's real var
  string is readable at runtime from `config.tokens.space['$8'].variable` [FACT: createVariable.cjs:41-56 `variable` field].
- Components consume `$8/$12/$24` **raw** on dimension props [FACT: card.tsx:42-44 `padding:'$8'/'$12'/'$24'`;
  calendar-view.tsx:50,56].

**Invariant that constrains every candidate (B1):** density MUST stay **provider-applied and orthogonal** — "surfaces
never branch on `preset`" and density is a provider CSS scale [FACT: seam-contract.md:44,56-58]. **Any mechanism that
leaks density into consumers (e.g. requiring each surface to pass a `size`/`compact` prop) violates the contract** and is
therefore NOT an eligible fallback — at most a §XXVIII deviation requiring its own approval. All candidates below are
provider-only.

**THE decisive test — RESOLVED at /preflight (spike done 2026-10-03): LEAD confirmed.** Chain in `@tamagui/core@2.6.2`:
a non-animated web component uses `resolveValues:"auto"` [FACT: createComponent.cjs:460 — only `isAnimated && inputStyle!=='css'`
uses `"value"`]; `getTokenForKey` → `resolveVariableValue(key,v,"auto")` returns the Variable's `.variable`
[FACT: helpers/getTokenForKey.cjs resolveVariableValue — `"value"`→`.val` literal, else→`.variable`]; `.variable` =
`` `var(--${name})` `` [FACT: createVariable.cjs:42,56]. ∴ `padding:'$8'` compiles to `padding: var(--<space-8>)` — a var
reference, **overridable**. The one `resolveValues:"value"` literal path is animated components — our static layout
spacing isn't animated, so the override is safe.

**Accessor — the DOCUMENTED export `getToken` (G4, doc-grounded correction):** read the real var name with
`getToken('$8','space')` → `var(--…)` on web [FACT: tamagui.dev/docs/core/exports; @tamagui/web config.cjs:135
`getToken(value,group,useVariable=isWeb)`]. **Not** the internal `config.tokensParsed` (the earlier draft) — `getToken`
is the supported, stable API. No hardcoded hash; the provider enumerates the inset-band space tokens, reads each var name,
and applies the dense overrides via `setProperty` on `<html>` when `density==='dense'` (calm → `removeProperty`; §4 — the
one `setProperty` mechanism, no attribute-selector stylesheet). **Arg-form dev-assert (N2):** our space tokens are keyed
`"8"/"12"` (numeric) [FACT: tokens.ts:6], so confirm the exact call — `getToken('$8','space')` vs `getToken('8','space')`
— returns a `var(--…)` string, and **dev-assert it**: a wrong arg form silently yields `undefined` and no-ops the override
(the live-gate class, [[visual-gate-catches-worker-rpc-bugs-unit-tests-bypass]]).

**No first-class density variant in 2.6.2 (ruled out, grounded):** a newer Tamagui pattern (`theme.activeVariants.density`
+ token `variantKey`) exists in forks/later work, but **does NOT exist in installed 2.6.2** [FACT: grep `activeVariants|variantKey`
over @tamagui/{core,web}@2.6.2 dist = 0 occurrences]. The `data-vida-density` CSS-var remap is the correct version-safe
mechanism — and real-world projects ship exactly this `[data-density]`→remap-spacing-vars pattern [FACT: WebSearch —
foam-foundation/foam3#5620, hirobius/hds#336].

**Type-ramp density (G2 — co-scale + accessor caveat):** font-size is NOT a `createTokens` group, so `getToken(...,'size')`
does not cover it — font-size/line-height vars live under `getConfig().fontsParsed[fam].{size,lineHeight}[$key].variable`
[FACT: @tamagui/web config.cjs:99 fontsParsed; createFont.cjs]. Type density MUST override **both** the font-size AND the
line-height vars together (our `lineScale` is baked `round(size×ratio)` px [FACT: tamagui.config.ts:25-29]; overriding
size without line-height gives dense text a calm line box — the DEF-U4-e clip class). The IMPLEMENTATION-PLAN picks between
**(A)** overriding the fontsParsed size+lineHeight vars under the data-attr (smaller, consistent with the spacing LEAD;
needs a dev-assert that the fontsParsed accessor yields a `var(--…)` string) and **(B)** extending the S2 CSS-var seam to
font-size in the config (bigger, touches the baked lineScale). **Lead = (A).** If (A)'s accessor proves fragile at impl,
S3 ships spacing density + the `data-vida-density` signal and homes type-ramp density as an orthogonal follow-up (never a
consumer leak — the B1 rule), flagged §XXVIII (partial-contract delivery).

**Scope:** the override rescales the inset-band tokens `$8/$12/$16/$24` + the type-ramp font-size+line-height vars (all
usage of those — inset AND small/mid gaps = the intended uniform dense air); large layout tokens `$32…$128` stay fixed so
page structure doesn't collapse. **FALLBACK-A/B (below) are NOT needed for spacing** (var-referenced confirmed); retained
as the historical decision record:

- **LEAD (if var-referenced):** the provider enumerates the inset-relevant space tokens + the type-ramp font-size vars
  from `config` (real names, no hardcoded hashes) and, under `[data-vida-density="dense"]`, redefines them to the dense
  values (calm = the base scale, no override). CSS-var cascade re-applies to the already-compiled atomic classes. Clean,
  config-sourced, no lib-internal coupling, fully orthogonal.
- **FALLBACK-A — root rem-scale (if inlined-px; preferred fallback, orthogonal):** the provider sets a root
  `font-size`/`--vida-density-scale` under `[data-vida-density="dense"]`; the type ramp (and any rem-expressed spacing)
  scales from the root with **zero per-component work** — surfaces never branch. If spacing literals are px (not rem) and
  thus don't follow, the honest consequence is **type-ramp density ships in S3, spacing-density is type-only** until the
  spacing scale can be made rem/var-expressed (a documented, provider-level limitation — NOT a consumer leak). Preflight
  measures how much spacing actually follows a root scale.
- **FALLBACK-B — root `transform: scale()` / `zoom` (orthogonal, blunt):** a last-resort provider-only scale of the whole
  subtree. Orthogonal but coarse (scales everything, risks blur/subpixel + hit-target drift against §X 44×44) — eligible
  only if A is insufficient, and then flagged for its trade-offs.

The LEAD is strongly preferred (orthogonal, zero per-component work, scales both type AND spacing). The
component-`size`-prop path is **explicitly rejected** (B1 — it breaks orthogonality); if neither LEAD nor FALLBACK-A can
deliver *spacing* density orthogonally, S3 ships **type-ramp density + the `data-vida-density` signal**, documents the
spacing limitation, and homes orthogonal spacing-density as a follow-up — rather than leaking density into consumers.
**No Victor decision on the mechanism** — the spike + this eligibility rule resolve it; the only escalation is if the
only viable path requires a contract deviation (then §XXVIII).

## 7. Reduced motion (B12, EC-7)

A preset/mode/density switch is an **instant** state change — **no animated palette/type/space transition**
[FACT: seam-contract.md:63; current-business-rules.md B12; motion.md §Reduced-Motion]. The provider adds no transition on
the themed root; any incidental transition is gated by `@media (prefers-reduced-motion: reduce)` → `transition:none`. The
`useReducedMotion` hook exists [FACT: hooks/use-reduced-motion.ts] but the swap needs no JS motion — it is instant by
construction. Verify: toggling selection repaints with no tween; reduced-motion makes no difference (already instant).

## 8. §4 Acceptance = the blocking Visual Gate (Step 10) — the FULL matrix

Done = **all** of:
- `resolveTheme` unit tests: 6 `(preset×mode)` → correct scheme-first name; density passthrough; exhaustive.
- Provider: `selection` re-roots theme + sets the right font vars + `data-vida-density`; bare `<UIProvider>` = `THEME_DEFAULT`.
- **Runtime selection-change (B2) — the codec's reason to exist:** changing the `selection` prop at runtime (not a fresh
  mount) re-roots the theme color, re-applies the font vars, and updates `data-vida-density` in **one re-render** — no
  stale state, no flash, and reader→editorial **clears** the font vars (N1). A mount-only gate is insufficient; the
  Visual-Gate harness must toggle `selection` live and assert all three channels update (the live-gate catches what a
  per-mount check bypasses — [[visual-gate-catches-worker-rpc-bugs-unit-tests-bypass]]).
- `App.tsx` feeds `THEME_DEFAULT`; `@vida/ui` + `apps/web` test suites green; tsc 0; eslint 0.
- **Visual Gate (real browser, blocking):** the rendered matrix **3 presets × {light, dark} × {calm, dense}** from the
  shipped code against the P1 specimen [FACT: slice-map.md:42-43] — each cell shows the correct palette, the correct
  density spacing/type, and the **correct real font family verified by `getComputedStyle(node).fontFamily`** on a rendered
  node (N2 — not a visual-only check, which can pass on the Spectral fallback), confirming Fraunces/Newsreader · Spectral ·
  Source Serif 4 actually resolve (the faces are served).
- **a11y + contrast across the FULL matrix** (not light-only — [[contrast-test-must-be-full-matrix-not-light-only]]):
  every rendered text/UI pair ≥ 4.5:1 (AA) in **both** modes × all 3 presets; the warm `reader`/`quietDesk` **dark**
  surfaces are the tight constraint (S1 g2 catch) [FACT: current-business-rules.md:34-36]. Keyboard/focus unchanged
  (provider adds no focusable chrome); reduced-motion = instant swap verified.
- **Font activation budget (N3):** activating a non-default preset pulls its 2 faces onto the active path
  (`font-display:swap`, on activation — acceptable). Report the measured added payload per preset and confirm a preset
  switch does not regress the `<80KB` initial discipline (the preloaded critical path stays Spectral-only; S2 budget intact).
- Breakpoints 375/768/1440 (the provider is layout-neutral; confirm no wrapper-div flex-collapse regression).

## 9. Risks / seams

- **Density var-reference vs inlined-px** (§6) — **RESOLVED (LEAD, grounded in docs + 2.6.2 source + external corroboration).**
  Spacing var override is confirmed overridable. **Eligibility rule (B1) stands:** every candidate is provider-only +
  orthogonal; the component-`size`-prop path is rejected (contract leak).
- **Residual risk → type-ramp accessor** (§6/G2) — font-size vars come via `getConfig().fontsParsed` (less documented than
  `getToken`). The impl-plan must dev-assert the accessor yields a `var(--…)` string AND co-scale line-height; if fragile,
  spacing density ships + type-ramp homed as an orthogonal §XXVIII follow-up. This is now the slice's main implementation
  risk (spacing is settled).
- **CSS-layer mount point** (§4) — **RESOLVED = `<html>` via layout effect** (portals force it; a wrapper div can't reach
  body-portals). No wrapper → no flex-collapse.
- **Font var application timing** — effect-based (html isn't React-rendered). Editorial cold-start = the baked fallback →
  no flash now; a persisted non-editorial initial (future Settings) flashes one frame — acceptable for S3, noted for
  Settings. Use `useLayoutEffect`/`useInsertionEffect` to minimize; editorial = `removeProperty` (N1).
- **OS prefers-color-scheme vs explicit selection** (§9a) — verify at the Visual Gate the explicit theme class wins; one-
  line `shouldAddPrefersColorThemes:false` config tweak if it conflicts.
- **Backward-compat call-sites** (§5) — grep every `<UIProvider` usage; bare ones rely on the default. A missed required
  `theme` prop removal is a typecheck catch (good), but assert the test wrappers compile untouched.
- **Full-matrix contrast** (§8) — the known failure mode is a light-only subset passing while a dark warm surface fails
  AA. The gate asserts every pair × preset × BOTH modes; run an independent g2 review on the final (load-bearing).

## 9b. §XXVIII DEVIATION (Visual Gate, 2026-10-03) — density mechanism A → A-prime

**What diverged:** the approved LEAD applied density by `setProperty` of the token vars on `<html>`. The Visual Gate proved
it works for **space** (`--t-space-*` not redeclared → the html override cascades; card padding 16→12 verified) but **fails
for type-ramp**: Tamagui's generated `:root .font_body`/`.font_display` classes **redeclare `--f-size-*`/`--f-lineHeight-*`
as element-level literals** (`--f-size-body:16px`), shadowing the inherited html override [FACT: Visual-Gate probe — rule
`:root .font_body{…--f-size-body:16px…}`; computed `font-size` stayed 16px with html `--f-size-body:15px`]. This is the G2
residual risk realized. (Font-family still swaps because the class sets `--f-family: var(--vida-font-body,…)` — a *nested*
seam my html var resolves into; space works; only type-size was shadowed.)

**Resolution — A-prime (Victor-approved, full delivery over the escape):** density is a **single injected, attribute-toggled
stylesheet** `#vida-density-scale`, appended last so it wins by **source order at equal specificity** against Tamagui's
`:root …` rules:
- `[data-vida-density="dense"]{ --t-space-8:…; --t-space-12:…; --t-space-16:…; --t-space-24:… }` (space band; (0,1,0) ties `:root`)
- `[data-vida-density="dense"] .font_body,[data-vida-density="dense"] .font_display{ --f-size-*:…; --f-lineHeight-*:… }`
  (type; (0,2,0) ties `:root .font_body` → later rule wins, beating the literal redeclare)

Values read at runtime from `getToken('$N','space')` + `getConfig().fontsParsed` (baked `val` × `DENSE_TYPE_SCALE`, round).
The provider effect now just **toggles `data-vida-density`** (+ sets the `--vida-font-*` family vars, unchanged). This is a
cleaner single density mechanism than the html-setProperty mix, still provider-only + orthogonal (surfaces never branch).
**Re-gated** after the change. §XXVIII: STOP→diagnose→Victor-approve A-prime→re-impl→re-gate.

### §XXVIII DEVIATION #2 — theme application: flat `defaultTheme={themeName}` → scheme-on-`<html>` + preset-on-`<body>`
The Visual Gate next showed the **preset neutrals/surfaces didn't apply** (reader/quietDesk rendered light/default). Root
cause: Tamagui emits sub-theme vars under a **nested** selector `:root.t_<mode> .t_<preset>`, so the spec's flat
`defaultTheme="<mode>_<preset>"` (one `t_<mode>_<preset>` class on `<html>`) matches nothing. **Fix (B-codec-3):**
`defaultTheme={mode}` (scheme class on `<html>`) + `t_<preset>` on **`<body>`** (an ancestor of the app AND body-portals).
Re-gated → all 12 cells' neutrals/surfaces/text correct incl. dark sub-themes + portals. The registration (S1) was fine;
only the application (S3 provider) changed.

### §XXVIII DEVIATION #3 — preset ACCENT (+ neutrals) on component sub-themes: RESOLVED (Option A, 2026-10-03)
The Gate's final finding: accent (and the neutral component-keys) didn't reach components that own a sub-theme (buttons
rendered editorial in every preset). Triaged STRUCTURAL (`docs/specs/fixes/preset-accent-component-subthemes/`): component
sub-themes BAKE every key to the scheme base at Tamagui config time; the emitter-inherit fix is unviable (Tamagui bakes
`var(--…)` theme values). **Fix (Victor-approved Option A, full scope):** the 21 preset-sensitive component-sub-theme-key
usages across the 10 primitives now consume DIRECT semantic tokens (which inherit the preset at component scope — a
*component* sub-theme emits only its own keys, so the semantic vars still cascade from the B-codec-3 `<body>` preset class);
signal keys stay baked (preset-invariant); per-preset component sub-themes retired (themes 66 → 26). Re-gated: accent +
neutrals swap per preset across all 12 cells (reader oxblood, quietDesk olive). Currency B-codec-6. **§8 acceptance now
FULLY met — nothing deferred.**

## 9a. Preflight resolutions (G1–G6) + library grounding

Verified against the **official Tamagui docs** (core/tokens · configuration · themes · exports) + the **installed 2.6.2
source** + a live call-site grep:

- **G1 — mount point = `<html>` via layout effect** (portals force it; §4). Reverses the inline-style-on-wrapper draft.
- **G2 — type density co-scales font-size + line-height**; accessor = `getConfig().fontsParsed` (§6). Lead = approach (A).
- **G3 — dense magnitudes [→ IMPLEMENTATION-PLAN]:** §6 fixes *which* tokens scale, not *to what*. The impl-plan sets the
  dense values grounded in the P1 "two airs" / `compact_mode` intent [FACT: interpretation R3/R8; specimen:268,288], marked
  Visual-Gate-tunable. (Runtime density overrides are CSS-var values, not JSON tokens, so B8's 4pt rule doesn't bind them —
  but keep them sane; prefer stepping the inset band down one sensible notch + a single type-ramp ratio.)
- **G4 — var-name accessor = the documented `getToken('$8','space')`** for space; `getConfig().fontsParsed[...].variable`
  for type (§6). No internal `config.tokensParsed`, no hardcoded hash.
- **G5 — file placement [→ IMPLEMENTATION-PLAN]:** new `packages/ui/src/theme-resolution.ts` = types (`ThemePreset`/
  `ThemeMode`/`ThemeDensity`/`ThemeSelection`/`ThemeName`) + `resolveTheme` + `THEME_DEFAULT` + `THEME_PRESETS` + its
  `.test.ts` (pure, no JSX); `provider.tsx` imports it + owns the effect; the barrel (`index.ts:17`) re-exports the new
  symbols alongside `UIProvider`/`useVidaTheme` (today it exports `UIProvider, useVidaTheme, ThemeName, UIProviderProps`
  [FACT: index.ts:17]).
- **G6 — backward-compat RESOLVED (grep done):** `apps/web/src/App.tsx:71` is the **only** `theme=`-passing call-site; all
  others — `routes.test.tsx`, `shell/{command-bar,nav-link}.test.tsx`, `shell/test-router.tsx`, `onboarding.test.tsx`, and
  every `packages/ui/src/components/*.test.tsx` wrapper + Storybook — are **bare `<UIProvider>`** → keep working via the
  `THEME_DEFAULT` default, **zero edits**; no `theme="dark"` usage to migrate. Only App.tsx:71 changes (→ `selection={THEME_DEFAULT}`).
- **New seam — `shouldAddPrefersColorThemes` defaults `true`** [FACT: tamagui.dev/docs/core/configuration]; our config omits
  it [FACT: tamagui.config.ts:83] → Tamagui emits `@media (prefers-color-scheme)` theme fallbacks. The explicit theme class
  on `<html>` (driven by `defaultTheme`) should win, but **verify at the Visual Gate** that an explicit *light* selection is
  not overridden by an OS *dark* preference; if it conflicts, set `shouldAddPrefersColorThemes:false` (the app owns mode —
  light primary, user-controlled) as a one-line config tweak (R2/R5).
- **Fonts are global, confirmed** [FACT: docs/core/configuration "No documented support for swapping fonts per theme"] →
  the S2 CSS-var seam is the right/only mechanism (B-codec-2 validated); `face` (weight→file map) is native-only, not needed
  on web now.

## 10. §XXIX currency (on S3 done)

Refresh `docs/ui/token-pipeline/current-*` — new rule **B-codec-3**: the provider resolves `{preset,mode,density}` →
scheme-first theme name + per-preset font vars + the `data-vida-density` scale (one CSS layer on the theme root); density
mechanism = [LEAD/FALLBACK per the preflight spike]; swap is instant (B12). Update `packages/ui/src/CLAUDE.md`
(`provider.tsx` entry) + the seam-contract "built" status. Promote with the code (same commit).
