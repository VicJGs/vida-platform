# Bug: ds-4-rn-driver-drift
<!-- type: bug -->
Status: diagnosed → fix-gated
Source-repo: /Users/victor/Documents/CODE/vida-platform
Discovered: 2026-08-03, during DS-4 (LIF-84) Step 2, by Victor ("where does this RN come from within the documentation?").
No-Guessing: every claim below is [FACT: source] / [INTERP] / [UNKNOWN].

## Symptom (what the error message said)
`Error: Cannot find package 'react-native-web' imported from
node_modules/.pnpm/@tamagui+animations-react-native@2.6.2/.../@tamagui/animations-react-native/dist/esm/createAnimations.mjs`
— thrown when importing `packages/ui/src/tamagui.config.ts` at runtime (the DS-4 config probe test).

## Root cause (ONE sentence)
**The error is caused by choosing the `@tamagui/animations-react-native` (RN) animation driver for the WEB config —
a driver the documentation does NOT specify for web and which violates ADR-001 §9's "no extra dependency" rule — NOT
by the missing `react-native-web` package (that missing package is the *symptom* the runtime used to signal the drift).**

## Classification: STRUCTURAL
Not a one-file bug. The wrong-driver assumption propagated across code + deps + spec + docs, and fixing the symptom
(adding `react-native-web`) would ENTRENCH the drift rather than correct it.

## Facets
- **Symptom vs root cause:** symptom = `react-native-web` not found; root cause = wrong driver choice (RN on web).
- **Affected layers:** dependency (package.json/lockfile) · config code (tamagui.config.ts) · the DS-4 forward spec
  (~10 sites) · the reasoning trail (change-log/decisions).
- **Reproduction:** `import { config } from 'packages/ui/src/tamagui.config'` at runtime (vitest) → RNW resolution error.
- **How the drift happened:** on Victor's earlier challenge ("why the CSS driver?") the assistant OVER-corrected,
  concluding ADR-001 *mandated* the RN driver. It does not.

## Ground truth (CONFIRMED — file:line, not assumed)
- `docs/core/decisions/ADR-001-tech-stack.md:112` — Animations = "Tamagui built-in (uses react-native-reanimated
  **on native**) | Cross-platform, **no extra dependency**". → reanimated is scoped to NATIVE; web unnamed.
- `ADR-001:114` — Theme = "**CSS variables on web**, native theming on mobile". → web is CSS.
- `ADR-001:258` — `react-native-reanimated # Animations (via Tamagui)` sits inside the **mobile app** dependency
  tree (next to `react-native-webview`, :257). → reanimated is a NATIVE dep, not a web one.
- `docs/ui/token-pipeline/current-business-rules.md:72` (DS-3's own note) — "CSS driver = duration+easing; RN driver
  = spring configs". DS-3 emitted duration+easing (`motion.ts`) → CSS-driver-shaped.
- **Empirical:** the non-driver config (tokens/themes/fonts) imports + resolves at runtime cleanly (`size.true=16`;
  `light.colorSurfacePrimary #FFFFFF ≠ dark #0F172A`). → ONLY the RN driver is the failing element.
- **Conclusion:** the doc-faithful WEB driver is `@tamagui/animations-css` (matches "CSS variables on web" + "no
  extra dependency", consumes `motion.ts`'s duration+easing directly, needs NO `react-native-web`); reanimated is
  the NATIVE driver (ADR-001:258), deferred to when mobile is built. Per-platform driver = standard Tamagui.

## Files involved (blast radius — all must change together)
1. `packages/ui/src/tamagui.config.ts` — driver import + `createAnimations` const + `animations` field + header comment.
2. `packages/ui/package.json` — replace `@tamagui/animations-react-native` → `@tamagui/animations-css`; re-check the
   `@tamagui/core` version pin (the exact-`2.6.2` pin was done to fix an RN-driver version skew — reassess for CSS).
3. `pnpm-lock.yaml` — regenerate.
4. `docs/specs/components/ds-4-tamagui-config-dark-mode/_index.md` — ~10 sites (header, §1.1, §1 NOT, §3.2 ×2, §4,
   §5.1, §6-A, B15, change-log) currently assert the RN driver "per ADR-001"; correct to CSS-on-web / reanimated-native.
5. **NOT affected (keep):** provider.tsx (JSX/TamaguiProvider), the `jsx`/`DOM`/`react`/`@types/react` tsconfig+pkg
   additions (needed for the provider regardless of driver), the ambient `tamagui.d.ts` augmentation, `createFont`
   role-key + `$true` mapping — all driver-independent and already verified.

## Prevention
Memory written: [[dont-let-downstream-shape-reopen-an-adr]] (extend: verify the ADR's EXACT platform scoping before
picking a library — "reanimated on native" ≠ "RN driver on web"). Read the ADR rows verbatim, don't infer a web
choice from a native clause.

## Fix direction (gated below)
Revert to `@tamagui/animations-css`; `createAnimations({ fast: '<easing> <duration>ms', … })` from `motion.ts`
(duration + easing, lossless — no easing seam, no `react-native-web`); correct the spec to the per-platform reading.
