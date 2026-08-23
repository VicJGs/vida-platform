# FIX (diagnosis + plan) — Note creation throws "Vault not initialized" (initVault never called at web boot)
Type: bug (CODE defect — full §XXVI double-gate per §XXIV; NOT an environment/pre-flight J-1 case).
Status: DIAGNOSED + APPROACH VALIDATED (2026-08-22) — gate-1 (critique + preflight) cleared; awaiting Approval 1 → IMPLEMENTATION-PLAN (gate-2).
Task: mod-notes (LIF-131) · increment ② · branch `mod-notes-2a-data-plane`
Source-repo: /Users/victor/Documents/CODE/vida-platform

## 1. Defect + root cause (cited)
**Symptom.** In the real browser, `/notes` → ⌘K → "New note" shows a **"Could not create note"** toast and does not
navigate. Reproduced live via chrome-devtools MCP (Brave). The command's `catch` (`apps/web/src/app/notes/commands.ts:34`)
discards the error (toast only, no `console.error`), so the browser console was silent — which is why it stayed
"not root-caused" for a full session.

**Unmasked error** (called `createPage` directly in the page, bypassing the swallowing catch):
```
Error: Vault not initialized — call initVault() first
  at assertReady     (packages/core/src/encryption/vault.ts:29)
  at hashContent     (packages/core/src/encryption/vault.ts:255)
  at computeSyncHash (packages/core/src/db/repository.ts:162)
  at createInTx      (packages/core/src/db/repository.ts:212)
```

**Root cause (one sentence).** The web app **never calls `initVault()` at startup**, so every repository WRITE throws
at `computeSyncHash → hashContent → assertReady()` — because the `_sync_hash` content fingerprint is computed on every
write (`repository.ts:340`, unconditional) via libsodium's BLAKE2b, which requires the WASM module loaded
(`initVault()` = `await sodium.ready`, `vault.ts:23-27`) — **independent of field-level encryption**.

**Confirmed by ground truth:**
- `grep initVault apps/web/src` → **none** (no production caller anywhere in the web app). `[FACT]`
- `computeSyncHash` runs on **every** create/update regardless of the `[E]` set (`repository.ts:340,432`). `[FACT]`
- Live fix proof: `initVault()` then `createPage({type:'note'})` in the page → **succeeds**, valid `_sync_hash`, reads
  back count 1. Nothing else lurking behind it. `[FACT: chrome-devtools evaluate_script, 2026-08-22]`
- `@vida/core` tests ALL call `initVault()` before writes precisely for this reason — `repository.test.ts:85`
  comments it: *"required by hashContent (_sync_hash), independent of vault UNLOCK."* `[FACT]`

## 2. Facets
- **Two independent vault gates, only one was ruled out.** `getVaultKey()` (UNLOCK, needs password-derived key) is
  correctly skipped for empty-`[E]` repos (`repository.ts:249-254`). `hashContent()→assertReady()` (WASM-LOAD, keyless)
  is a **separate** gate that fires on every write. The Step-0 baseline finding #6 conflated them (see §6).
- **Symptom vs cause:** user sees a generic toast; cause is a missing one-time boot init, one layer down, masked by a
  no-log catch.
- **Blast radius:** platform-wide. `computeSyncHash` is in the generic `repository.ts` — every module's writes (tasks,
  habits, journals…) were broken, not just notes. **Class: ISOLATED cause (one missing boot call), broad impact.**
- **Realm (the make-or-break question):** the apps/web DB is worker-hosted, but `computeSyncHash`/`hashContent` run on
  the **MAIN thread** — the Drizzle proxy (`db/drizzle.ts:37`) serializes SQL and ships it to the worker *after* the
  hash is computed; `worker.ts` only executes raw SQL and never calls `hashContent`. So a main-thread `initVault()`
  (in `boot.ts`) sets `_ready` in the same JS realm that `assertReady()` reads. **Verified by the adversarial critique.**
- **Not a band-aid over a missing flow.** ADR-017 explicitly permits keyless M1.0 pass-through writes; onboarding is
  contractually forbidden from creating/unlocking a vault in M1.0 (`onboarding/steps.ts:36-45`, `onboarding/CLAUDE.md:24`).
  Writes are *meant* to work keyless. `[FACT]`

## 3. Files involved
- `apps/web/src/db/boot.ts` — `ensureDbReady()` (the fix site; AR-4 one-time startup owner, `App.tsx` gates render on it).
- `apps/web/src/app/notes/commands.ts:34` — discarded-error catch (observability fix: `console.error` the error).
- `packages/core/src/encryption/vault.ts:23-31,255-258` — `initVault`/`assertReady`/`hashContent` (the mechanism; no change).
- `packages/core/src/db/repository.ts:162-170,340,432` — `computeSyncHash` (the unconditional caller; no change).
- **Tests:** `apps/web/src/db/*` (NO boot.test.ts today) · the mocks that hid it: `app/notes/commands.test.ts:13`
  (mocks the whole service), `App.integration.test.tsx:12` + `App.test.tsx:8` (mock `./db/boot`).

## 4. The fix (validated approach — gate-1 cleared)
1. **`boot.ts` — add `initVault()` to `ensureDbReady()`**, placed first and overlapped with open:
   ```ts
   const c = getDbClient()
   await Promise.all([initVault(), c.open(DB_NAME)]) // libsodium ready + DB open (independent); _sync_hash needs sodium
   await getOrCreateDeviceId(c.driver)
   ```
   `initVault` is idempotent (`vault.ts:24`) and the ready-promise is memoized (`boot.ts:42 ??=`) → StrictMode-safe;
   the existing rejection-clears-memo (`boot.ts:49`) covers an `initVault` failure too.
2. **`commands.ts` — log the discarded error:** `catch (e) { console.error('[notes:new-note]', e); toast(...) }`
   (it already toasts — this adds observability so a swallowed error can never hide a whole session again).
3. **Regression test at the BOOT level (platform-wide, not notes):** a real-write test that runs the *actual*
   `initVault` + a repository `create` (NO service mock) and asserts a row with a `_sync_hash` is written — closing the
   mock blind spot that let 218 web tests pass while the browser threw. libsodium WASM loads in vitest (proven by
   `vault.test.ts`, `notes-service.test.ts`).

## 5. Out of scope (follow-up filed separately)
- **Hoist libsodium-ready into `@vida/core`'s DB-open path** (adapter `open()`/a `createDatabase` factory) so the
  invariant "a repository write needs libsodium loaded" is enforced by the layer that depends on it — mobile/desktop
  will otherwise hit this identical bug. Both independent reviewers flagged this as the deeper correct home; land the
  `boot.ts` fix now (documented startup owner, unblocks web immediately), file the hoist.

## 6. §XXIX doc corrections owed (part of the fix commit)
- `.claude/tasks/mod-notes.md:130-134` (baseline finding #6) — **WRONG**: concluded "vault gating is NOT a blocker" by
  reasoning only about UNLOCK (`getVaultKey`), missing the WASM-load gate (`hashContent→assertReady`). Amend to split
  the two gates.
- `docs/features/notes-and-pages/current-spec.md` + `current-business-rules.md` — note `initVault()` is a hard write
  precondition in M1.0 (they describe `[E]` pass-through but are silent on it).
- `apps/web/src/db/CLAUDE.md` — the stale "createRepository needs an unlocked vault (M3)… not exercised here" line;
  MOD-notes ②a now exercises repository writes on web without unlock.

## 7. Acceptance
- [ ] `/notes` → ⌘K → "New note" creates a page and navigates to `/note/$id` in the real browser (Brave, chrome-devtools).
- [ ] Boot-level regression test (real `initVault` + repository create) is GREEN and would FAIL without the `boot.ts` change.
- [ ] `pnpm typecheck` 0 · web suite green · `pnpm lint` clean.
- [ ] §6 doc corrections landed in the same commit (§XXIX).
