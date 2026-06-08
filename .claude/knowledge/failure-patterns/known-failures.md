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
