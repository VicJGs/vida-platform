# Spec: component:ds-4-tamagui-config-dark-mode
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: implemented   <!-- draft → approved → implemented -->  (built + verified: @vida/ui 30/30 · root typecheck 10/10 · config imports at runtime with no react-native-web · Frontend Visual Gate PASS [Victor, 2026-08-03]. RN-driver drift triaged + corrected mid-build.)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Linear: LIF-84 · Project M1 — Whole Manual OS · Milestone M1.0 — Boot & Connective Base.
Depends on: DS-2 (token values), DS-3 (motion), both IMPLEMENTED on main. Blocks: DS-5 (primitive contracts), UI-*, UX-*.
Animation driver: **per-platform, per ADR-001 §9** — **web = CSS driver** (`@tamagui/animations-css`; ADR-001 "CSS
variables on web" + "no extra dependency"), **native = reanimated** (ADR-001:258, deferred to mobile). No new ADR
(§6-A). Corrected 2026-08-03 from an RN-driver drift — see `docs/specs/fixes/ds-4-rn-driver-drift/`.

<!--
  FORWARD spec (LITE gate — DS-* class per delivery-plan §3: design-system profile, F·C·L, quality-gate-design +
  -components; single approval, no double-gate). Triaged 2026-08-03: LITE is the FLOOR — the dark-mode/driver
  MECHANISM is the most code-like part; a specific increment can escalate to a double-gate via §XXVIII if it earns it.
  DS-4 = the config ASSEMBLY (createTamagui from the DS-1→DS-3 generated outputs) + the theme-switch mechanism +
  the deferred CSS-var/unit reconciliation. It is the first unit that COMPOSES the tokens (breaks DS-1's ⊥ DS-4).
-->

## 0. Source model (direction — 2026-08-03)
The frontend's source of truth is the **documented intent** (ADRs, specs, `design.md`), realized **code-first**:
DS-4 hand-authors `tamagui.config.ts` that *composes* the GENERATED token outputs (`tokens.ts`/`themes.ts`/
`fonts.ts`/`motion.ts`) — it authors **no token values**, only the Tamagui wiring. The community Figma file
(later, M4 P2-⑦, Figma MCP + scripter — NOT Tokens Studio) reflects the same tokens; DS-4's `light`/`dark` map 1:1
to Figma variable **modes**. `[DIRECTION: Victor 2026-08-03]` `[MEM: frontend-source-of-truth-is-documented-intent]`

## 1. Identity

**What it is.** DS-4 assembles the **Tamagui configuration** for `@vida/ui` and wires **dark mode as a first-class,
switchable theme**. It is the consumer that composes everything DS-1→DS-3 emitted:

1. **`tamagui.config.ts`** (`packages/ui/src`) — `createTamagui({ tokens, themes, fonts, animations, settings })`:
   - `tokens` ← `themes/tokens.ts` (`createTokens`, 5 categories). `[FACT: tokens.ts]`
   - `themes` ← `themes/themes.ts` (`light`, `dark`, `light_Button`, `dark_Button`). `[FACT: themes.ts]`
   - `fonts: { body, display }` ← two `createFont(...)` calls mapped from `themes/fonts.ts`. **⚠ Key-shape care
     (D):** `fonts.ts` keys `fontSize`/`lineHeight` by **role** (`caption/small/body/subheading/heading/display/
     displayLarge`), not numerically — `createFont`'s signature is a passthrough (`<A> => A`), so ANY key shape
     *typechecks* but an unstyled `<Text>` resolves `size.$true`. So the mapping MUST (a) keep the role keys as the
     token names (`fontSize="$body"`), (b) add a **`true` default** (`size.true = size.body`, likewise lineHeight),
     and (c) share the one role-keyed size/lineHeight scale across both families (they differ by `family`, not by
     scale). This is why §4 needs a *render* assertion, not just typecheck. `[FACT: fonts.ts role keys; createFont
     GenericFont.size passthrough — @tamagui/web types; INTERP: $true default needed]`
   - `animations` ← `createAnimations(...)` from `themes/motion.ts`, using the **web driver ADR-001 §9 implies**:
     **`@tamagui/animations-css`** (ADR-001 "CSS variables on web" + "no extra dependency" — no `react-native-web`).
     Its config is a CSS transition string `'<easing> <duration>'`, so it consumes `motion.ts`'s **duration AND easing
     losslessly**: `{ fast: 'cubic-bezier(0,0,0.3,1) 150ms', … }`. Named presets pair a duration band with ease-out
     (motion.md §IX); enter/exit refinements = per-component (DS-5/UI-*). **Native = reanimated** (ADR-001:258),
     wired when mobile is built. `[FACT: ADR-001:112/114/258; @tamagui/animations-css format; motion.ts; verified live]`
   - `settings: { disableSSR: true, addThemeClassName: 'html' }` (Vite SPA, non-SSR; `addThemeClassName` default is
     already `'html'` — set explicitly for clarity) + typed module augmentation (`declare module '@tamagui/core'`).
     `[FACT: disableSSR + addThemeClassName ∈ CreateTamaguiProps settings — @tamagui/web@2.6.2 types]`
2. **Theme-switch mechanism (pinned).** A `@vida/ui` Provider wrapper `<UIProvider theme>` rendering
   `<TamaguiProvider config defaultTheme={theme}>`. The theme *state* (`'light'|'dark'|'system'`) lives in the app's
   existing **Zustand** store (AR-4); the app passes the resolved value as `<UIProvider theme={...}>` → `defaultTheme`.
   Because the store change re-renders `UIProvider`, `defaultTheme` re-roots the theme (no `@tamagui/next-theme`; no
   `<Theme>`-wrapper needed for the global switch). `@vida/ui` also exports a thin **`useVidaTheme()`** hook (NOT
   Tamagui's `useThemeSetting`, which lives only in the rejected `@tamagui/next-theme`) reading Tamagui's `useTheme`
   for consumers. **`addThemeClassName` is a `createTamagui({ settings })` option (default `'html'`), NOT a Provider
   prop** — it belongs in §1.1's config, and the default already places the theme class on `<html>` for CSS-var
   styling. `[FACT: TamaguiProviderProps has {config,defaultTheme,…} but NO addThemeClassName; addThemeClassName ∈ createTamagui settings, @default html — @tamagui/web@2.6.2 types; AR-4 Zustand]`
3. **The deferred CSS-var/unit reconciliation (recommended resolution).** Tamagui compiles `createTokens` → its OWN
   web CSS variables at runtime, so those are **authoritative at runtime**; the design.md `variables.css` (unitless
   `--space-*`/`--duration-*`) is a **parallel documentation / Figma-projection artifact**, NOT wired into the app.
   DS-4's resolution = state that explicitly (no runtime dependency on `variables.css`; the unitless px/ms concern
   dissolves because Tamagui owns the runtime vars), and update the DS-1/DS-3 "deferred to DS-4" notes to "resolved:
   variables.css is a projection, Tamagui vars are runtime". `[FACT: Tamagui compiles tokens→web CSS vars — config docs;
   current-spec.md deferrals; INTERP: projection-not-runtime]`

Home: `packages/ui/src` (config) — beyond the DS-1→DS-3 `themes/` subdir. `[FACT: delivery-plan #192; reconstructed #19]`

**What it is NOT.**
- NOT the token **values** — DS-4 authors none; it composes the generated outputs (a config, not a seed). `[FACT: §0]`
- NOT the **theme-toggle UI + preference persistence** — the actual toggle control + persisted user choice are
  **app-shell** (UX-3 / UI-4). DS-4 provides the *capability* (config with switchable themes + Provider + a
  `useVidaTheme` hook), not the button. `[FACT: reconstructed #23 UX-3 shell, #30 UI-4 app shell]`
- NOT a **driver re-decision** — ADR-001 §9 fixes it per-platform (web = CSS driver, native = reanimated); DS-4
  consumes the web driver, it does not choose it (§6-A). The **native reanimated driver** + any duration→spring
  translation are wired when mobile is built (M-later). `[FACT: ADR-001:112/114/258]`
- NOT **primitive component contracts** — button/input/etc. component APIs = **DS-5**. `[FACT: reconstructed #20]`
- NOT a Figma dependency — code-first per §0.

## 2. Business Rules
DS-4 **inherits** B1–B12 (the whole DS-1→DS-3 token contract). `[FACT: docs/ui/token-pipeline/current-business-rules.md]`
It adds:

- **B13 — Config composes generated outputs only (no hand-authored values).** `tamagui.config.ts` imports
  `tokens`/`themes`/`fonts`/`motion` from the GENERATED modules and wires them; it introduces **no** raw color/space/
  type/motion literal. A value change still flows from the seed → `pnpm tokens:build` → config. `[INTERP: from §0 + B5]`
- **B14 — Dark is a switchable first-class Theme, not an inversion.** `light`/`dark` are both passed to
  `createTamagui`; switching is a `<Theme name>` / `defaultTheme` change (parallel design, design.md §XI), never a
  runtime color inversion or a CSS filter. `[FACT: design.md §XI "parallel design, not an inversion"; themes.ts B7]`
- **B15 — Animation driver consumes `motion.ts` faithfully.** The web CSS driver's config is *derived* from
  `motion.ts` (no re-authored timings): each named preset = `'<motion.easing.*> <motion.duration.*>ms'` — duration
  **and** easing, losslessly. No easing seam. `[FACT: ADR-001:112/114; @tamagui/animations-css string format; verified live]`
- **B16 — Typed config, app-consumable.** `createTamagui`'s config is registered via module augmentation so
  `@vida/ui` (and apps) get typed tokens/themes/fonts; `@vida/ui` exports the config + Provider + theme hook.
  `[FACT: Tamagui TamaguiCustomConfig augmentation verified /tamagui/tamagui]`

**Terminal states.** `pnpm --filter @vida/ui typecheck` + `build` green **with** the real config (this is the moment
DS-1's "⊥ DS-4 standalone typecheck" boundary is intentionally crossed — the token modules now compose with a live
`createTamagui`). `[FACT: current-business-rules.md DS-1 rule "DS-1 ⊥ DS-4"]`

## 3. Contract (data/format)

### 3.1 Inputs (all GENERATED, already on main)
`themes/tokens.ts` (createTokens) · `themes/themes.ts` (light/dark/+Button) · `themes/fonts.ts` (typography data) ·
`themes/motion.ts` (duration/easing data). DS-4 imports these; it edits none. `[FACT: the four generated modules]`

### 3.2 Outputs
| File / artifact | Change | Shape |
|---|---|---|
| `packages/ui/src/tamagui.config.ts` | **NEW** | `createTamagui({ tokens, themes, fonts:{ body, display }, animations, settings })` + `declare module '@tamagui/core'` augmentation; default-exports the config |
| `createFont` mapping | **NEW** (in config) | `fonts.ts` → **two** `createFont({ family, size, lineHeight, weight, letterSpacing })` (`body`+`display`) sharing the **role-keyed** size/lineHeight scale + a **`true` default** (§1.1-D) |
| `createAnimations` mapping | **NEW** (in config) | `motion.ts` → CSS driver (`@tamagui/animations-css`): `{ fast: 'cubic-bezier(0,0,0.3,1) 150ms', … }` from `motion.easing.*` + `motion.duration.*` (duration+easing, lossless) |
| Provider + theme hook | **NEW** | `packages/ui/src` — `<UIProvider theme>` wrapping `<TamaguiProvider config defaultTheme={theme}>` (NO `addThemeClassName` prop — that's a config setting, §1.1) + `useVidaTheme()` hook (reads Tamagui `useTheme`; NOT next-theme's `useThemeSetting`); theme *state* source = app Zustand (AR-4) |
| `packages/ui/src/index.ts` | re-export | `config`, `UIProvider`, `useVidaTheme` (+ re-export Tamagui `Theme`/`useTheme` as needed) |
| `packages/ui/package.json` | **+dep** | `@tamagui/animations-css` (web driver; `createAnimations` is its export, NOT in `@tamagui/core`; no `react-native-web`). `@tamagui/core` + `@tamagui/animations-css` pinned to the same `2.6.2` (Tamagui family alignment). `createTamagui`/`createFont`/`TamaguiProvider`/`Theme`/`useTheme` resolve via `@tamagui/core`→`@tamagui/web@2.6.2` |
| CSS-var reconciliation | **resolve** | pin how design.md `variables.css` names coexist with Tamagui's compiled web vars + the unitless px/ms (§1.3) |

### 3.3 Build/verify interface
`pnpm --filter @vida/ui typecheck` (now **with** `tamagui.config.ts` — no longer standalone) + `pnpm --filter @vida/ui
build` green; `pnpm --filter @vida/ui test` green (token pipeline fixtures unaffected). `pnpm tokens:build` still
deterministic and independent of the config.

## 4. Acceptance (testable DoD)
- [x] `tamagui.config.ts` assembles `createTamagui` from the four generated modules (B13) — **no hand-authored token
      value** anywhere in the config (grep: no hex/px/ms literals).
- [x] `fonts` built via **two** `createFont` (body+display) from `fonts.ts` with role keys + a **`true` default**;
      `animations` built via the chosen driver (§6-A) from `motion.ts` (B15) — e.g. `fast === '<motion.easing.out>
      <motion.duration.fast>ms'`.
- [x] **Font size RESOLVES at runtime (not just typecheck, §1.1-D):** a render assertion that `<Text fontSize="$body">`
      and an unstyled `<Text>` (→ `$true`) both resolve to a real px — guards the role-vs-numeric passthrough trap that
      typecheck can't catch.
- [x] `light` + `dark` both registered; switching (Zustand `theme` → `UIProvider defaultTheme`, and/or `<Theme
      name="dark">`) changes **resolved** theme values (B14) — proven by a render/typed assertion (e.g. resolved
      `colorSurfacePrimary` = `neutral900` under dark), not just presence.
- [x] Module augmentation registers the config → typed tokens/themes/fonts flow to consumers (B16).
- [x] `pnpm --filter @vida/ui typecheck` + `build` green **with** the config (DS-1 ⊥ DS-4 boundary crossed cleanly);
      `pnpm --filter @vida/ui test` still green; `pnpm tokens:build` still deterministic.
- [x] `@tamagui/animations-css` (ADR-001 web driver) added to `packages/ui/package.json` (pinned `2.6.2` w/ core); lockfile regenerated; **no `react-native-web`** pulled.
- [x] CSS-var/unit reconciliation resolved + documented (no lingering "deferred to DS-4" in `current-spec.md`).
- [x] **Frontend Visual Gate**: a minimal Tamagui render (a **throwaway `<Theme>`-swap demo** — NOT the shipped
      app-shell toggle, which is UX-3/UI-4) shows the real themed surface flipping light↔dark; critique
      (`quality-gate-design` + `-components`) + preflight pass; **Victor's visual approval** recorded.
      `[FACT: frontend-visual-gate.md; delivery-plan §3 DS-* gate; §1 NOT-boundary]`
- [x] `[C]` `current-spec.md` + `current-business-rules.md` refreshed (B13–B16; deferrals resolved); `[L]` layer-doc.

## 5. Implementation Prompt
<!-- Ordered; each step cites a §2/§3 rule. §6-A driver decision resolved with Victor BEFORE Step 2. -->
1. **Add the driver dep** — `@tamagui/animations-css` (the ADR-001 web driver, §6-A; pinned `2.6.2` to match core) to `packages/ui/package.json`; `pnpm install`.
2. **Author `tamagui.config.ts`** — two `createFont` (body+display) from `fonts.ts` sharing the role-keyed size/
   lineHeight scale **+ a `true` default** (§1.1-D); `createAnimations` from `motion.ts` (`'<easing> <duration>ms'`
   per name); `createTamagui({ tokens, themes, fonts, animations, settings:{ disableSSR:true, addThemeClassName:'html' } })`;
   `declare module '@tamagui/core'` augmentation; default-export (B13/B15/B16).
3. **Author the Provider + theme hook** — `<UIProvider theme>` rendering `<TamaguiProvider config defaultTheme={theme}>`
   (theme value from app Zustand; NO `addThemeClassName` prop — it's a config setting) + `useVidaTheme()` reading
   Tamagui `useTheme` (B14). Toggle UI/persistence = app shell (out of scope).
4. **Resolve the CSS-var/unit reconciliation** — decide + document how Tamagui's web vars coexist with `variables.css`
   (§1.3); update the DS-1 deferral note.
5. **Update `packages/ui/src/index.ts`** re-exports (config, VidaConfig, UIProvider, useVidaTheme) + side-effect import of the ambient `tamagui.d.ts` augmentation.
6. **Verify** — typecheck + build + test green with the config; determinism of `tokens:build` intact.
7. **Done-check** — every §4 box; Frontend Visual Gate (dark toggle); refresh `[C]`/`[L]`.

## 6. Open UNKNOWNs / Decisions Needed
- **A — ANIMATION DRIVER — DECIDED by ADR-001 §9, per-platform; no new decision, no new ADR.** ADR-001 §9 reads
  (verbatim): Animations = *"Tamagui built-in (uses react-native-reanimated **on native**) · Cross-platform, no extra
  dependency"*; Theme = *"**CSS variables on web**, native theming on mobile"*; and `react-native-reanimated` is listed
  in the **mobile** dep tree (ADR-001:258). So the doc-faithful reading is **per-platform**:
  - **Web (all of M1.0): `@tamagui/animations-css`** — matches "CSS variables on web" + "no extra dependency" (no
    `react-native-web`); consumes `motion.ts`'s duration **+ easing** directly (`'<easing> <duration>ms'`). **Verified
    live** — config imports at runtime with no `react-native-web`, animations = `{fast:'cubic-bezier(0,0,0.3,1) 150ms'…}`.
  - **Native (mobile, later): reanimated** (ADR-001:258), wired when mobile is built.
  - **Correction note:** a prior draft drifted to `@tamagui/animations-react-native` ("cross-platform driver"),
    which forced `react-native-web` — an *extra dependency* that VIOLATES ADR-001 — and is NOT named in the docs for
    web. Triaged STRUCTURAL + corrected 2026-08-03; diagnosis `docs/specs/fixes/ds-4-rn-driver-drift/`. Lesson:
    "reanimated **on native**" ≠ "RN driver on web" — read the ADR's platform scoping verbatim
    ([[dont-let-downstream-shape-reopen-an-adr]]). `[FACT: ADR-001:112/114/258; verified live]`
- **B — Theme-switch state owner (mechanism pinned §1.2).** App **Zustand** (AR-4) owns `light/dark/system` → passed
  as `<UIProvider theme>` → `TamaguiProvider defaultTheme`; the store change re-renders the Provider so `defaultTheme`
  re-roots the theme (no `@tamagui/next-theme`, no `<Theme>` wrapper for the global switch). `@vida/ui` exports the
  Provider + `useVidaTheme()` (NOT next-theme's `useThemeSetting`); the app owns persistence. Confirm. `[FACT: AR-4;
  TamaguiProviderProps.defaultTheme — @tamagui/web@2.6.2]`
- **D — createFont key mapping (resolved §1.1-D).** Keep `fonts.ts`'s **role keys** as font-size token names
  (`$body`/`$heading`/…) + synthesize a **`true` default** so unstyled `<Text>` resolves; both families share the
  one scale. Confirm vs. re-keying to a numeric `$1..$n` scale (rejected — role names match design.md §III + are
  self-documenting). `[FACT: createFont passthrough; §4 render assertion guards it]`
- **C — Scope boundary.** Confirm the toggle **UI + persistence** belong to the app shell (UX-3/UI-4), DS-4 ships the
  config + Provider + hook only. `[INTERP: reconstructed #23/#30]`
- **[RESOLVED from DS-3] createAnimations shape** — driver-dependent, now pinned by decision A. `[FACT: verified]`
- **[DEFERRED → mobile] RN spring driver + duration/easing→spring mapping.** `[FACT: A]`

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-03 | 2026-08-03-ds-4-tamagui-config-dark-mode | initial forward LITE spec: §0 source model, §1 identity (config assembly + theme-switch + CSS-var reconciliation), §2 B13–B16, §3 data/format contract, §4 acceptance, §5 impl prompt, §6 decisions (A driver = the pivotal call). Tamagui v2 API verified via context7 (createTamagui/createFont/createAnimations drivers/TamaguiProvider). Gate class = DS-* LITE per delivery-plan §3 (triaged). |
| 2026-08-03 | 2026-08-03-ds-4-tamagui-config-dark-mode | **Grounding pass (Victor: "ground everything on the docs before I approve").** Confirmed grounded: M1.0 = web-only (reconstructed); decision B Zustand (AR-4 current-spec); home split (reconstructed #19/#23/#30). **CORRECTION — the animation driver is NOT an open decision:** ADR-001 §9 already fixed it (*"Tamagui built-in, cross-platform, no extra dependency"*). §6-A rewritten to **follow** ADR-001 (built-in `@tamagui/animations-react-native`); the `@tamagui/animations-css` "fork" + proposed ADR-021 are **WITHDRAWN** — re-litigating a settled ADR ([[dont-manufacture-forks-from-non-authoritative-notes]]). `motion.ts` feeds the built-in driver as tweens; easing-mapping = a build-time detail, not a decision. All `animations-css`/ADR-021 references purged from §1/§3/§4/§5/§6. |
| 2026-08-03 | 2026-08-03-ds-4-tamagui-config-dark-mode | REVISE (independent critique, read installed @tamagui/web@2.6.2 types — SHIP after fixes; driver decision A, gate class, boundary, B13–B16 all confirmed accurate). Fixes: **#1** `addThemeClassName` is a `createTamagui({settings})` option (default `'html'`), NOT a Provider prop — corrected §1.1/§1.2/§3.2/§5; **#2** renamed the exported hook `useThemeSetting`→**`useVidaTheme`** (former collides with the rejected `@tamagui/next-theme`); **#3** pinned the switch mechanism (Zustand→`UIProvider theme`→`defaultTheme` re-render; no next-theme, no `<Theme>` wrapper); **#4** `createFont` role-vs-numeric size trap (passthrough → typecheck won't catch) → keep role keys + synthesize `true` default + §4 **render assertion** that a size resolves (new §1.1-D/§6-D); **#6** dep note (`@tamagui/animations-css` = new tree; core APIs via `@tamagui/core`→`@tamagui/web`); **#9** Visual-Gate render = throwaway `<Theme>`-swap, not the shell toggle; **#10** CSS-var reconciliation direction given (Tamagui web vars authoritative at runtime; `variables.css` = projection artifact). |
| 2026-08-03 | 2026-08-03-ds-4-tamagui-config-dark-mode | **DRIFT CORRECTION (triage — `/victor-triage`, Victor: "where does this RN come from in the docs?").** The grounding-pass entry above was WRONG: it concluded ADR-001 §9 mandated the RN driver (`@tamagui/animations-react-native`). ADR-001 §9 verbatim = reanimated **on native** + **CSS variables on web** + no-extra-dependency (:112/114/258) — the RN driver on web is nowhere in the docs and forced `react-native-web` (an extra dep VIOLATING ADR-001). Classified **STRUCTURAL**; diagnosis persisted `docs/specs/fixes/ds-4-rn-driver-drift/`. Corrected: web = **`@tamagui/animations-css`** (consumes `motion.ts` duration+easing losslessly; no `react-native-web`), native = reanimated (deferred). Swapped dep + config + all ~8 RN spec sites. **Verified live:** config imports at runtime (no RNW), `size.true=16`, `light≠dark`, `animations.fast='cubic-bezier(0,0,0.3,1) 150ms'`. |
