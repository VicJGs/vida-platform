# Token Pipeline — Current Spec (durable · §XXIX promotion target)

> **Context:** `@vida/ui` → `packages/ui/src/themes/`. **Built** by DS-1 (LIF-81), 2026-07-26. Companion:
> `current-business-rules.md`. Forward spec: `docs/specs/components/ds-1-token-pipeline/_index.md`.
> **No-Guessing:** `[FACT: src]` / `[INTENT]` (documented direction, not yet built).

## What the token pipeline is
The build that turns a hand-authored **three-layer** token seed (primitive → semantic → component) into the
design system's consumable outputs, from one source. It is the foundation every DS-2…DS-5 and UI-* primitive
inherits. Style Dictionary is the engine (ADR-001). `[FACT: build-tokens.mjs]`

## Topology
```
packages/ui/src/themes/
├── tokens/
│   ├── primitive.json     # raw scales — literals only (color/space/size/radius/zIndex)
│   ├── semantic.json      # references primitive only  (color/surface/primary → {color.white})
│   └── component.json     # references semantic only    (button/background/primary → {color.brand.primary})
├── build-tokens.mjs       # Style Dictionary build + custom checkLayers (B2) + 3 custom formats
├── variables.css          # GENERATED — design.md §XII CSS custom properties (var() chain)
├── tokens.ts              # GENERATED — Tamagui createTokens() (5 categories + `true` defaults)
└── themes.ts              # GENERATED — light/dark base + light_<Comp>/dark_<Comp> sub-themes
```
`tokens.ts`/`themes.ts` are re-exported from `packages/ui/src/index.ts`. `[FACT: index.ts]`

## The three-layer → Tamagui projection (the non-trivial core)
| Seed layer (design.md §II) | → Tamagui construct | Shape |
|---|---|---|
| primitive | `createTokens` categories | flat `color/space/size/radius/zIndex`, each with a `true` default `[FACT: @tamagui/core@2.5.1]` |
| semantic  | base `light`/`dark` theme objects | flat keys (`colorSurfacePrimary`…) whose values reference tokens |
| component | `light_<Comp>`/`dark_<Comp>` sub-themes | scoped theme objects referencing tokens |

design.md's 3 layers do NOT map to 3 flat Tamagui token categories — they map onto Tamagui's tokens → themes →
sub-themes. CSS-var names (arbitrary depth) and Tamagui token keys (flat, category-bounded) intentionally differ.

## Contract (build interface)
- **Invoke:** `pnpm --filter @vida/ui tokens:build` → `node src/themes/build-tokens.mjs`. `build` runs it before `tsc`.
- **Input:** `tokens/{primitive,semantic,component}.json` (classic Style Dictionary format: `{ "value", "type" }`,
  references `{group.name}`). `[FACT: seed files]`
- **Output:** `variables.css` (`a/b/c → --a-b-c`, primitive=literal / semantic·component=`var(--target)`),
  `tokens.ts` (`createTokens`), `themes.ts` (`light`/`dark` + `light_<Comp>`/`dark_<Comp>`). GENERATED banner on all.
- **Exit:** `0` success · non-zero on layer-skip / raw-literal-in-non-primitive / dangling-ref / empty-layer, cause named.

## Status (2026-07-26 — DS-1 IMPLEMENTED)
- Built + verified: `pnpm --filter @vida/ui typecheck` green (tokens.ts/themes.ts compile strict with only
  `@tamagui/core`, **no `tamagui.config.ts`** → DS-1 ⊥ DS-4, non-circular); **13/13** vitest pass; build
  deterministic (B4, byte-identical); B2 fail-loud proven live (CLI exit 1 on injected layer-skip). `[FACT: DS-1 session]`
- Deps: `style-dictionary@5.5.0` (devDep) · `@tamagui/core@2.5.1` (dep) · `vitest@3.2.4` (devDep). `[FACT: package.json]`

## Known limitations (DS-1 is plumbing — resolved downstream)
- **Values are THROWAWAY placeholders.** DS-2 replaces the JSON seed with the real Figma Variables → Tokens Studio
  export and designs the real, parallel light/dark values. `[INTENT: DS-2]`
- **`light`/`dark` are identical placeholders** — DS-2 supplies real parallel dark values (design.md §XI, not an inversion).
- **CSS dimension vars are unitless** (`--space-md: 16`, not `16px`) because Tamagui tokens want raw numbers; the
  CSS-var value/name reconciliation vs Tamagui's own web CSS vars is **deferred to DS-4**. `[INTENT: DS-4]`
- **No Figma/Tokens Studio wiring yet** — seed is hand-authored (safe: `/token-audit` found 0 consumers). `[FACT: DS-1]`
