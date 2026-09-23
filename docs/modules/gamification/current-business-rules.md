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

## S2 — Rule engine (shipped)

- **BR-GM-9 (rule = binding + typed effects, GM-2).** A rule's condition is an ADR-011 binding
  (`event_trigger` matches an incoming event; `derived_pull` reads the measurement seam vs a threshold); its
  `consequences` are typed ADR-004 effects (`grant_currency`/`lock_currency`/`move_money`/`surface_notification`).
  `[FACT: rules.ts:82-99; validators/gamification.ts GAMIFICATION_EFFECTS]`
- **BR-GM-10 (fire = per-effect dispatch on the rail, IR-2/IR-7).** `executeRule` parses `consequences` →
  `EffectEvent[]` (transition `${ruleId}:${occasion}#${index}` — distinct per consequence, idempotent per
  occasion) → `rail.applyEffect` per effect. Each effect is atomic; the set is re-driven on partial failure and
  the rail dedups already-applied effects. `[FACT: service.ts executeLoadedRule; rules.ts:88-99]`
- **BR-GM-11 (honest applied-count, R1).** `ExecutionResult.effectsFired` counts effects NEWLY applied — an
  idempotent replay or a fully-clamped lock reports 0, so a downstream journal/achievement/level counter never
  double-counts. `fired` = the rule triggered this call. `[FACT: service.ts executeLoadedRule; rules.ts ExecutionResult]`
- **BR-GM-12 (below-floor clamp on lock, IR-12).** A `lock_currency` consequence is clamped to the currency's
  live `current` before firing; a fully-clamped lock (nothing available) is dropped. Rewards (`grant_currency`)
  are never clamped. `[FACT: service.ts executeLoadedRule]`
- **BR-GM-13 (acyclic rule graph, GM-2 / measurement §3.7).** `createRule`/`updateRule` reject a rule whose
  consequence feeds its own (or a mutual) `derived_pull` condition — `rulesToBindings` builds producer→consumer
  edges (grant/lock currencyId == a condition measureKey), `assertAcyclic` throws `RuleBindingCyclic`. The graph
  includes disabled rules (conservative — enabling can't introduce an unchecked cycle). `[FACT: rules.ts rulesToBindings; service.ts assertRuleGraphAcyclic]`
- **BR-GM-14 (user-authored ⇒ envelope; shipped ⇒ trusted, IR-9, fail-closed).** A rule with `grant_id != null`
  requires the capability enforcer to permit EVERY consequence effect before ANY fires (no enforcer, or any
  deny → `RuleGrantDenied`); `grant_id == null` = shipped/trusted, skips the check. **R2:** `grant_id` is passed
  as the capability identity to `checkAction`; the grant-row→def-id resolution when a REAL enforcer is wired is
  owed to #85 CAP-authoring (M1 auth-off; this is a fail-closed HOOK). `[FACT: service.ts executeLoadedRule]`
- **BR-GM-15 (rules CRUD, soft-delete).** `rules` has `deleted_at` → `softDelete:true`; `getRule`/`listRules`
  exclude soft-deleted; `deleteRule` soft-deletes; `RuleUpdateSchema.strict()` (no `grantId` — grant is
  create-time). `[FACT: service.ts rulesRepo + CRUD ops]`

## S3 — Achievement engine (shipped)

- **BR-GM-16 (achievements is a non-syncable static seed, IR-8).** `seedAchievements` writes via **direct
  drizzle** (`db.insert` + `uuidv7()` id + explicit `created_at` + `onConflictDoNothing` by `key`) — NOT the
  sync Repository (the table has no `_sync_*` columns; routing it through the Repository would break the insert
  + wrongly enqueue sync). `listAchievements` reads via `db.select`. `[FACT: service.ts seedAchievements/listAchievements]`
- **BR-GM-17 (unlock = earned-join write + guarded reward + guarded notification, GM-13/GM-15).** On a met
  predicate, `evaluateAchievements` writes `user_achievements` (syncable; `UNIQUE(achievement_id)` converges a
  cross-device double-unlock) + fires `grant_currency` (XP reward) + `surface_notification` via the rail.
  `[FACT: service.ts unlockAchievement]`
- **BR-GM-18 (registry-guarded emit, dormant seam).** An effect fires only if a handler is registered
  (`registry.resolve`); `surface_notification` (MOD-notifications-owned, unregistered at M1) stays dormant, the
  reward fires (economy handler present). No `NoEffectHandler` on unlock. `[FACT: service.ts canFire]`
- **BR-GM-19 (predicate eval, IR-4).** Conditions read the measurement seam (`measure`) or a derived currency
  balance quantity (`currency` ∈ earned/current/locked/spent); a null source (unmeasured / unknown currency) →
  not met (never fabricated). A `condition == null` achievement is skipped (no auto-predicate). `[FACT: achievements.ts; service.ts evaluateAchievements]`
- **BR-GM-20 (unlock idempotency).** Already-earned achievements are filtered out (the earned-`Set`); the reward
  effect's deterministic `achievement:${id}:reward` transition dedups a re-fire on the rail. `[FACT: service.ts evaluateAchievements]`

## S4 — Journal provider + wiring (shipped — ① backend COMPLETE)

- **BR-GM-21 (journal contribution, GM-15).** `createGamificationJournalContribution(svc)` registers ONE
  `summary`-section contribution (no `dueIn` agenda); `summary(date) → SectionData` is a tz-safe SNAPSHOT
  (current level/title · XP balance · achievements-to-date). `state` derives from its own live read as a
  `TerminalState` BY TYPE (`hasData ? 'success' : 'empty'`, never `deriveTerminalState`); a no-data day returns
  `state:'empty'`, never throws (the per-section degrade is the dashboard's). `earned>0` covers every non-empty
  XP state (the S2 clamp forbids a real-but-zero balance), so no false-empty. `[FACT: journal.ts]`
- **BR-GM-22 (effect-handler wiring, call-once).** `registerGamificationEffects(registry, db, deviceId)` wires
  the economy grant/lock handlers onto a rail (composes `createEconomyHandlers` + `registerEconomyEffects` —
  invents no handler) so rules (S2) + rewards (S3) can fire. Call-once at module init (a re-register throws
  `DuplicateEffectHandler`, the shared substrate contract). `[FACT: journal.ts registerGamificationEffects]`

## Deferred (homed, not dropped)
- `total_xp`/`current_level` cache refresh → the effect-firing mutation path (currently derived live).
- Journal per-day deltas (XP earned today · achievements unlocked today) → a dated ledger query + tz handling.
- Rule `grant_id` → capability def-id resolution + the authoring surface → #85 CAP-authoring (⚠ INTENDED).
- `derived_pull` recurring occasion wiring (which feeder supplies the occasion token) → composition seam (OQ-2).
- Achievement partial-`progress` tracking (`Record<string,number>`) + multi-currency rewards → later slices.
- Store worth-tree → **MOD-finance** (FIN-18/FIN-24; compose via `move_money{lockTarget}`). `[FACT: docs/core/economy/current-business-rules.md:22]`
- Fire-time consent gate for cross-module `move_money` → auth-off M1 (ADR-017; Finance BR-S4-5, #46/#85).
- User-authored rules/achievements sandbox → ⚠ INTENDED (#85) · level-unlocks · quests.
