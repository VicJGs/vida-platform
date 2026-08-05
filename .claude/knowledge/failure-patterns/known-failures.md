# Known Failures — this project
# Project-specific failure patterns. Added via the On Failure protocol in each scenario.
# Assign F-numbers sequentially — check the last entry before adding. Format: _template.md
# This file is seeded once by the toolkit and then OWNED by the project — never overwritten.

---

## F001 — @vida/core: "Cannot find module '@vida/types'" during typecheck

**Symptom:** `pnpm typecheck` fails in `@vida/core` with `error TS2307: Cannot find module '@vida/types'` across 6 source files. `editor`/`ui`/`server` pass (they don't import it).
**Root cause:** ISOLATED. `packages/core/package.json` imported `@vida/types` in source but never declared it as a dependency, so pnpm didn't symlink it into `core/node_modules`. `tsc --noEmit` resolves bare specifiers via `node_modules` (unlike `tsc --build`, which can follow project `references`), so it couldn't find the package.
**Fix:** Add `"@vida/types": "workspace:*"` to `packages/core/package.json` dependencies, then `pnpm install` to create the symlink.
**Prevention:** When a package imports another workspace package, declare it in `package.json` — a tsconfig `references` entry alone is NOT enough for `tsc --noEmit`. Grep `@vida/*` imports vs declared deps when adding cross-package imports.
**Documented:** 2026-06-08 | Session: 2026-06-08-toolkit-setup-2

---

## F002 — key-management.ts: Uint8Array | null not assignable to Uint8Array

**Symptom:** `error TS2322: Type 'Uint8Array | null' is not assignable to type 'Uint8Array'` at `unlockVault` return (line 99).
**Root cause:** ISOLATED. `_vaultKey` is a module-level `let` typed `Uint8Array | null`. Although assigned a non-null value earlier in the function, TypeScript widens it back to the declared union after intervening function calls (`zeroKey`, `setState`) that could theoretically reassign it, so the `return _vaultKey` is seen as possibly null.
**Fix:** Return the local non-null value directly: `return keyChain.vault_key` instead of `return _vaultKey`.
**Prevention:** Don't return module-level mutable union-typed variables across function-call boundaries; return the narrowed local that holds the same value.
**Documented:** 2026-06-08 | Session: 2026-06-08-toolkit-setup-2

---

## F003 — token pipeline: `dark_<Comp>` sub-themes identical to `light_<Comp>` (dark mode uses light values)

**Symptom:** Generated `themes.ts` emits `light_Button ≡ dark_Button` (both `backgroundPrimary: tokens.color.brand600`). Component sub-themes render light-mode token values in dark mode; the `semantic.dark.json` overlay is bypassed for the entire component-token layer. Surfaced by DS-5 when firming the `component.json` intent set (previously invisible because only `button.background.primary` existed).
**Root cause:** STRUCTURAL. The `vida/tamagui-themes` emitter resolves component (rank-2) tokens to their **primitive** value (`build-tokens.mjs:179` `toPrimitivePath` + `:183` `tokenRef`) and emits `light_`/`dark_` from **one shared `subs` object** (`:217-218`) — collapsing the semantic light/dark indirection. This deviates from the DS-1 spec's projection example (`ds-1-token-pipeline/_index.md:113`: `light_Button = { background: light.colorSurfacePrimary }` — sub-themes reference the **base theme objects** `light.*`/`dark.*`). The DS-1 acceptance prose ("referencing those tokens") was ambiguous and the impl followed it; a placeholder duplication of `light_/dark_` went unnoticed while only one non-dark-critical component token existed.
**Fix:** In the rank-2 branch, read the component token's semantic ref (`t.original.value` → `refTarget` → `camel`) and store the **semantic key**; emit `light_<Comp>[k] = light.<semKey>` / `dark_<Comp>[k] = dark.<semKey>` per DS-1:113 (dark inherits the overlay by construction). Add a `build-tokens.test.ts` fixture asserting `light_<Comp> ≠ dark_<Comp>` when a referenced semantic has a dark override. Full diagnosis + fix: `docs/specs/fixes/component-subtheme-dark-drift/_index.md`.
**Prevention:** When an acceptance criterion's prose disagrees with its concrete projection example, the **example is authoritative** — encode it as a test, not prose. Fix pipeline defects at the pipeline root (DS-1), never per-consumer (DS-5) — a per-component patch masks the shared root cause.
**Documented:** 2026-08-05 | Session: 2026-08-05-ds-5-primitive-contracts

---
