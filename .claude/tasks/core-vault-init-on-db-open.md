# Task: core-vault-init-on-db-open
# Profile: Change Backend Component
# Scenario: default
# Spec: docs/specs/fixes/vault-not-initialized-on-boot/_index.md §5 (follow-up)
# Created: 2026-08-22
# Status: planned
# Cluster: M1 — Whole Manual OS
# Linear: LIF-160
# Project: M1 — Whole Manual OS
# Milestone: M1.1 — Hub & Foundation Modules (hardening)
# Source: spun out of the vault-not-initialized-on-boot fix (2026-08-22)

## Goal
Make libsodium-readiness (`initVault()`) a guaranteed precondition of a repository WRITE at the layer that DEPENDS on
it — `@vida/core`'s DB-open path — instead of relying on each consuming app's boot to remember it. Today `_sync_hash`
is computed on every write via `hashContent()` → `assertReady()`, but nothing in `@vida/core`'s write path guarantees
`initVault()` was called; only `apps/web/src/db/boot.ts` does (as of the 2026-08-22 fix). **Mobile and desktop will hit
the identical `Vault not initialized` bug** when they wire up their boot — this task closes that class of bug for the
whole OS.

## Why this is a proper follow-up, not part of the boot fix
Victor's directive (2026-08-22): "I want a proper fix on the whole OS." The `boot.ts` fix unblocks web NOW (the
documented startup owner); this task is the durable, platform-agnostic guarantee. Both independent reviewers
(critique + preflight) flagged `@vida/core` as the deeper-correct home. Landing it here keeps the boot fix small +
verifiable while scheduling the real hardening deliberately.

## Approach options (decide at the PLAN gate — do NOT pre-commit)
1. **Adapter/open-path init** — `await initVault()` inside `@vida/core`'s DatabaseAdapter `open()` (or a `createDatabase`
   factory), so ANY platform that opens the DB gets crypto ready. Web/mobile/desktop each call `open()` → covered once.
2. **Lazy self-guarantee in `hashContent`** — make `computeSyncHash`/`hashContent` `await sodium.ready` itself (turns a
   hard precondition into a self-satisfying one). Trade-off: makes the write path async at a new point; measure.
3. **Documented boot contract + a lint/test guard** — keep it app-owned but enforce via a shared test helper that every
   app's boot must satisfy. Weakest; only if 1/2 have an unacceptable cost.
Recommendation to evaluate first: **option 1** (enforced by the layer that depends on it, one call per platform).

## Dependencies
- Consumes the shipped `vault-not-initialized-on-boot` fix (web boot already calls `initVault()`; this generalizes it).
- Touches `@vida/core` DB-open/adapter/repository — run the full §XXVI double-gate; @vida/core has 787+ tests to keep green.

## Scope guard
- Do NOT remove the `apps/web/src/db/boot.ts` `initVault()` call until the `@vida/core` guarantee lands and is proven
  (belt-and-suspenders during the transition; the boot call becomes redundant-but-harmless, then removable).
- M1.0 keyless model unchanged (ADR-017): this is about WASM-load readiness, NOT vault UNLOCK / encryption.

## Open Questions
- [ ] Which open-path hook is the single choke point every platform traverses? (web = `web-adapter.open` → worker; does
      the worker realm ALSO need it? The worker runs raw SQL only today — no `hashContent` — but confirm future writes.)
- [ ] Is making `hashContent` async acceptable, or must it stay sync (option 1 keeps it sync)?

## Progress
- [ ] Planned (spun out 2026-08-22). Pick up after the current mod-notes ② Visual Gate work.
