# Fix: @vida/ui barrel ships a runtime `import './tamagui.d.ts'` → crashes any bundler consuming the package

Status: resolved
Classification: **ISOLATED** (one line, `packages/ui/src/index.ts`)
Found: 2026-08-11, during UI-3 / E1 (@vida/editor became the first cross-package RUNTIME consumer of `@vida/ui`).
Session: 2026-08-11-ui-3-vida-editor

## Findings
`@vida/ui/src/index.ts` shipped the Tamagui `TamaguiCustomConfig` augmentation to consumers with a **value
(side-effect) import** of a type-only declaration file:

```ts
import './tamagui.d.ts' // side-effect: ship the TamaguiCustomConfig augmentation to consumers (B16)
```

tsc passes a value import through to emitted JS, so `dist/index.js` contained `import './tamagui.d.ts';`. Two
problems compounded:
1. **Runtime JS import (the live crash).** Any bundler importing the `@vida/ui` barrel tries to resolve
   `./tamagui.d.ts` as a runtime module. It isn't one → **Vite throws** `Failed to resolve import "./tamagui.d.ts"`.
2. **The referenced module never existed in dist.** tsc does **not** copy a source `.d.ts` input to `outDir`, so
   `dist/tamagui.d.ts` was absent — the same dangling `import './tamagui.d.ts'` also appeared in `dist/index.d.ts`,
   meaning the augmentation was **not actually reaching consumers** either (latent, separate from the crash).

## Facets
- **Why latent until now:** `@vida/ui`'s own tests import from relative SOURCE (`../provider`, `./button`), never the
  built barrel; and no app consumed `@vida/ui` at runtime yet (UI-4 not built). E1's jsdom test does
  `import { UIProvider } from '@vida/ui'` → the built `dist/index.js` → surfaced it. `apps/web` would have hit the
  same crash the moment it imported `@vida/ui`.
- **Blast radius:** every runtime consumer of the `@vida/ui` barrel (the app, `@vida/editor`, any future package).

## Files
- `packages/ui/src/index.ts` — the offending line (fixed).

## Root cause
A value import was used to carry a **type-level** ambient augmentation. The augmentation belongs in the package's
type output, not its runtime JS.

## Resolution
Replace the value import with a **triple-slash reference directive** at the top of the barrel:

```ts
/// <reference path="./tamagui.d.ts" />
```

tsc emits **nothing** into `dist/index.js` for a `///` directive (it's a comment in JS), removing the runtime crash;
the reference is a type-level construct. Verified:
- `dist/index.js` no longer contains an `import './tamagui.d.ts'` statement (line 1 is now an inert `//` comment).
- `@vida/ui` rebuild green; **`@vida/ui` 317/317 tests pass** (no regression).
- `@vida/editor` now imports `UIProvider` from the barrel cleanly; `@vida/editor` 17/17 tests pass.
- `@vida/editor` typechecks using `$`-tokens — no consumer type regression (Tamagui core types accept the token
  props; the augmentation shipping was already non-functional via the dangling reference, so nothing was lost).

## Follow-up (not blocking)
The augmentation **shipping to consumers** (emitting `dist/tamagui.d.ts` so the `///` reference resolves) remains a
pre-existing latent gap — `dist/tamagui.d.ts` was never emitted. It is not blocking (consumers typecheck without it),
so it is left for the DS/UI owner to address if/when consumer-side `$token` type-narrowing is required. Recorded here
so it isn't mistaken for new breakage.
