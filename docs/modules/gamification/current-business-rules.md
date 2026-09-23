# Gamification — Current Business Rules (as-built)

<!-- Durable per-context rules. Living doc (§XXIX). mod-gamification #48 ① (LIF-124). S1 shipped.
     Promoted from delivery/interpretation.md (IR-*) + the S1 implementation. [FACT: path:line]. -->

## S1 — Currency surface, level, below-floor clamp (shipped)

- **BR-GM-1 (balances DERIVED, never stored).** Every balance is a live `computeBalance` over the append-only
  `consequence_ledger`; no op writes a balance column. `total_xp`/`current_level` are caches (GM-4), left as-is
  in S1 and derived live via `getLevel`. `[FACT: service.ts:97-120; foundation/economy/balance.ts:1-6]` (IR-1)
- **BR-GM-2 (currency code is the unique business key).** `defineCurrency` rejects a code that already resolves
  (shipped OR user) with `CurrencyExists` — a shipped code (XP) is in-memory so the `currencies.code` UNIQUE
  can't catch a shadowing define. `[FACT: service.ts:78-88]` (R1)
- **BR-GM-3 (fail-loud on unknown code).** `getCurrency`/`getBalance` throw `CurrencyNotFound`. `[FACT: service.ts:90-95]`
- **BR-GM-4 (level curve, GM-14).** `level = 1 + ⌊√(max(0,total)/100)⌋` over `requiredXp(n)=100(n−1)²`, with title
  bands (Novice/Apprentice/Adept/Expert/Master). Level derives from lifetime `earned` → never de-levels on spend.
  `[FACT: level.ts:33-53]`
- **BR-GM-5 (below-floor clamp+flag, IR-12).** A lock/spend of a positive magnitude may not drive a balance below
  its floor (default 0); `clampToFloor` returns `{applied, clamped}`. Rewards never call it. `[FACT: level.ts:55-64]`
- **BR-GM-6 ([E] pass-through, IR-10).** Repositories use `encryptedFields: []` — the M1.0 dormant field-level
  seam (getVaultKey throws vault-locked). `[FACT: service.ts:64-68]`
- **BR-GM-7 (profile = real-column VIEW, IR-11).** `getProfile`/`updateProfile` return `GamificationProfile`
  mirroring the actual `user_profile` columns, NOT the divergent `@vida/types` `UserProfile` interface (which
  still carries persona/check_in_streak/etc. moved to Preferences/Check-ins). JSON arrays parse at the boundary;
  writes re-read via `findById` (create/update echo the input row → DB defaults would be undefined:
  `[[repository-create-returns-input-row-not-db-defaults]]`). `[FACT: service.ts:127-153]`
- **BR-GM-8 (append-only ledger read).** `consequence_ledger` has no `deleted_at`; balance reads use plain
  `findWhere(eq(currency_id, code))`. `[FACT: service.ts:99-104; db/schema/foundation/economy.ts:36-59]`

## Deferred (homed, not dropped)
- Rule engine (S2) · achievement engine (S3) · journal provider + effect-handler wiring (S4) — this module.
- `total_xp`/`current_level` cache refresh → the effect-firing mutation path (S2/S3).
- Store worth-tree → **MOD-finance** (FIN-18/FIN-24; compose via `move_money{lockTarget}`). `[FACT: docs/core/economy/current-business-rules.md:22]`
- Fire-time consent gate for cross-module `move_money` → auth-off M1 (ADR-017; Finance BR-S4-5, #46/#85).
- User-authored rules/achievements sandbox → ⚠ INTENDED (#85) · level-unlocks · quests.
