<!-- Interpretation Layer — features/gamification · Entity Delivery Flow v1 Step 1 · session 2026-09-22-mod-gamification -->
<!-- Intent authority for the whole MOD-gamification ① build. Every claim is [FACT: path:line] / [INTERP: from fact] / [UNKNOWN: needs X]. Governed by the No-Guessing Principle. -->

# Interpretation — Gamification ("the System") · ① backend service tier

**Entity.** The OS's behavioral incentive & consequence engine — the motivation/consequence plane, partner
to Purposes' meaning/direction plane. Optional, opt-in (`feature_gamification`). `[FACT: docs/features/gamification/identity.md:30-44]`

**Source authority (in precedence order).** (1) the 5 aspect docs `docs/features/gamification/{identity,structure-data,business-rules,contract,conventions}.md` + the intake RESOLUTION `docs/intake/gamification.md` (module WHOLE as of 2026-07-19, GG1–GG11 resolved by Victor) `[FACT: docs/intake/gamification.md:197-198]`; (2) the ADRs it rides (004 effects · 010 capability · 011 measurement/bindings · 012 economy); (3) the already-built foundation substrate as the RATIFY floor.

**Build mode.** Predominantly **RATIFY + COMPOSE** for the economy substrate (AR-7 built it) and **BUILD** for the four downstream-homed pieces (rules engine · achievements · level curve · store layer). See §0 — this demarcation is the scope spine and is *doc-fixed*, not a decision.

---

## 0. SCOPE SPINE — RATIFY vs BUILD (the decisive demarcation)

The `foundation/economy` barrel states the boundary verbatim: *"currencies + consequence_ledger (derived
balances) + the grant_currency/lock_currency effect handlers + the consequence coordinator + a thin currency
service. **The rules engine, achievements, level curve, store layer, and move_money/surface_notification
handlers are homed downstream (DF-12).**"* `[FACT: packages/core/src/foundation/economy/index.ts:1-6]`
The module's own layer-doc echoes it: *"The Points Economy substrate's user-facing SURFACE... Engine =
foundation/economy/. Rides foundation/ substrates; does not re-implement them."* `[FACT: packages/core/src/services/gamification/CLAUDE.md]`

| Concern | Status | Where it lives | This task |
|---------|--------|----------------|-----------|
| Currencies registry (define/list, SHIPPED_CURRENCIES=[XP]) | **BUILT** | `foundation/economy/registry.ts` (`createCurrencyRegistry`) `[FACT: registry.ts:44; SHIPPED_CURRENCIES registry.ts:24-26]` | **RATIFY + compose** (expose a user-facing currency surface over it) |
| Derived balances (earned/locked/spent/distributed/current/toDistribute) | **BUILT** | `foundation/economy/balance.ts` (`computeBalance(rows, ceiling)`) `[FACT: balance.ts:12-27]` | **RATIFY + compose** (never re-derive) |
| grant_currency / lock_currency effect handlers | **BUILT** | `foundation/economy/handlers.ts` (`createEconomyHandlers`, `registerEconomyEffects`) `[FACT: handlers.ts:36,67]` | **RATIFY + compose** |
| Consequence coordinator (fan-fire a set of effects) | **BUILT** | `foundation/economy/handlers.ts` (`dispatchConsequence(rail, effects[])`) `[FACT: handlers.ts:74]` | **RATIFY + compose** |
| move_money handler | **BUILT** (mod-finance S4) | `services/finance/effects.ts` (`createFinanceEffectHandlers`, `registerFinanceEffects`) `[FACT: effects.ts:83-100]` | **RATIFY + compose** (fire the effect; never move money directly — GM-6) |
| surface_notification delivery | **BUILT** (xs-notifications-delivery) | `foundation/notifications/service.ts` (`createNotificationDeliveryEngine`) `[FACT: service.ts:28-33]` | **RATIFY + compose** (fire the effect; handler registration = MOD-notifications) |
| Effect rail + idempotency | **BUILT** | `foundation/effects/service.ts` (`createEffectRail.applyEffect`; `applied_effects` composite PK) `[FACT: service.ts:26,44-70]` | **RATIFY + compose** |
| Measurement read seam | **BUILT** | `foundation/measurement/source-registry.ts` (`query(key)→number\|null`) + engine `assertAcyclic` `[FACT: source-registry.ts:17; engine.ts:65-92]` | **RATIFY + consume** (read-only; advertise nothing) |
| **Rules engine** (author/validate/execute) | **NET-NEW** | `services/gamification/` (this task) over the `rules` table `[FACT: economy.ts:87-103]` | **BUILD** |
| **Achievement engine** (predicate eval → unlock) | **NET-NEW** | `services/gamification/` over `achievements`+`user_achievements` `[FACT: gamification.ts:52-79]` | **BUILD** |
| **Level curve** (level from currency total) | **NET-NEW** | `services/gamification/` + `user_profile` XP/level cache `[FACT: gamification.ts:28-46]` | **BUILD** |
| **Store worth-tree** (nestable boxes + net-worth) | **Finance-owned** (FIN-18/FIN-24, deferred) | `services/finance/` — NOT this task `[FACT: docs/core/economy/current-business-rules.md:22; docs/features/gamification/structure-data.md:35,81; docs/modules/finance/current-spec.md:89]` | **COMPOSE only** (fire move_money w/ lockTarget; read net-worth when Finance ships it) |
| **Below-floor clamp+flag** (a lock/spend that would take a balance below its floor → clamp + flag) | **NET-NEW** | `services/gamification/` (the enforcing surface) `[FACT: docs/core/economy/current-business-rules.md:13,23]` | **BUILD** (folds into the currency surface) |
| **Journal provider** (`summary(date)`) | **NET-NEW** | `services/gamification/journal.ts` (finance precedent) `[FACT: services/finance/journal.ts:24]` | **BUILD** |
| **user_profile service** (split-residual view) | **NET-NEW** | `services/gamification/` `[FACT: gamification.ts:28-46]` | **BUILD** |

> The whole risk of this task is **re-implementing a RATIFY row**. `computeBalance`, the grant/lock handlers,
> and `dispatchConsequence` must be *called*, not rewritten. Precedent: `[[xs-foundation-heads-trace-to-ar7-ratify]]`,
> "M1 foundation owns the schema; modules build on it" `[[m1-foundation-owns-schema-modules-build-on-it]]`.

---

## 1. DEPENDENCIES — the composed contexts + their exact seams

All satisfied (blockers all Done). Each seam below is what the module CALLS; none is re-implemented.

- **Effect rail** — `createEffectRail(db, registry)`; fire via `rail.applyEffect(event: EffectEvent{subjectNaturalKey, transition, effectType, targetRef, payload?}) → {applied}`. Idempotency is **guaranteed by the rail**: deterministic `effect_event_id = deriveEffectEventId(subject, transition, effectType)` + `applied_effects` composite PK `(effect_event_id, effect_type, target_ref)` → at-most-once per triple on any device. Handlers receive the active `tx` and co-write through it; a throw rolls back BOTH the ledger row and handler writes (F1 §3B). `[FACT: packages/core/src/foundation/effects/service.ts:26,44-70]`
- **Effect consent gate** — `assertEffectPermitted(ctx, effectType, moduleClass?)` throws `EffectConsentMissing`; must be called before firing a **sensitive-module** effect (e.g. `move_money`→Finance) with `ctx.consentedSensitiveModules`. `[FACT: packages/core/src/foundation/effects/gate.ts:46-59]`
- **Economy substrate** — `createEconomyHandlers(db, deviceId)` + `registerEconomyEffects(registry, handlers)` (grant/lock); `dispatchConsequence(rail, effects[])`; `computeBalance(rows, ceiling)`; `createCurrencyRegistry(db, deviceId)` (`create`/`list`). `[FACT: packages/core/src/foundation/economy/{handlers.ts:36,67,74; balance.ts:12-27; registry.ts:29-30,44}]`
- **Capability enforcer** — `createCapabilityEnforcer(db, deviceId, registry)`; a **user-authored** rule (has `grant_id`) must clear `assertPermitted(defId, {type:'effect', effect})` before firing (ADR-010, fail-closed). A **shipped/trusted** rule has `grant_id = NULL` and skips the envelope. `[FACT: packages/core/src/foundation/capability/enforcer.ts:105-115; economy.ts:93 (grant_id nullable)]`
- **Measurement read seam** — `createMeasurementSourceRegistry().query(key) → number | null` (unadvertised → `null`, never fabricate); pure engine `assertAcyclic(bindings)` for binding-DAG validation. The System **advertises nothing** — it is a pure consumer (INT-1). `[FACT: packages/core/src/foundation/measurement/source-registry.ts:17; engine.ts:65-92]`
- **Finance move_money** — fire an effect `{effectType:'move_money', payload:{fromAccountId, toAccountId, amount(+cents), lockTarget?}}`; `fromAccountId ≠ toAccountId` or `InvalidTransferError`; penalty `lockTarget` hits `denySafeStoreLockPort` which throws `StoreLayerNotActive` at M1 (FIN-24 deferred). `[FACT: packages/core/src/services/finance/effects.ts:34-42,57-77,98-99]`
- **Notifications** — fire `surface_notification`; the delivery engine `deliver(decision)` is content-zero (routing only). The System does NOT call `deliver()` directly; it fires the effect (handler = MOD-notifications). `[FACT: packages/core/src/foundation/notifications/service.ts:28-72]`

---

## 2. NEEDS — what the module owes at M1 (the BUILD rows of §0)

1. **Currency surface** — user-facing define/list/get + `balance(currencyId)` (composes `createCurrencyRegistry` + `computeBalance` over the ledger rows). `[FACT: business-rules.md GM-3,GM-4; contract.md:20-23]`
2. **Rule engine** — author/enable/disable/revoke rules (`rules` CRUD); validate the condition binding is acyclic (`assertAcyclic`); **execute** a rule → build its typed-effect set and fire via `dispatchConsequence`; user-authored rules clear the capability envelope first. `[FACT: business-rules.md GM-2,GM-8; structure-data.md:30-34; contract.md:12-19]`
3. **Achievement engine** — evaluate app-curated achievements as predicates over the measurement seam + the ledger event stream (a reconcile pass, not bespoke checkers); on unlock → write `user_achievement` + fire the reward (grant_currency) + `surface_notification`. `[FACT: business-rules.md GM-13; contract.md:24-25]`
4. **Level derivation** — pure level(currencyTotal) over a fixed non-linear curve + titles; maintain the `user_profile.total_xp`/`current_level` **caches** (recomputed, not authoritative). `[FACT: business-rules.md GM-14; contract.md:20-23]`
5. **Below-floor clamp+flag** — on a lock/spend that would drive a balance below its floor, clamp the effect and flag it (the enforcing-surface rule the economy substrate deferred here). `[FACT: economy/current-business-rules.md:13,23]`
6. **Journal provider + user_profile service** — register `summary(date)` (currency earned/locked · achievements · level-ups) via the journal-contribution seam (finance precedent); read/update the split-residual `user_profile`. `[FACT: business-rules.md GM-15; services/finance/journal.ts:24]`
   - **NOT owed here:** the store worth-tree (`store` CRUD + net-worth) is **Finance-owned** (FIN-18/FIN-24) — gamification composes it, never builds it (OQ-1). `[FACT: economy/current-business-rules.md:22]`

---

## 3. ORGANIZATION — tables, types, service shape

**Tables OWNED** (module-tier writes): `user_profile` (split residual — XP/level caches + PII-stays; NO deleted_at, singleton) `[FACT: packages/core/src/db/schema/gamification.ts:28-46]`; `achievements` (**FIRST non-syncable static-seed table** — no `_sync_*`/`updated_at`/`deleted_at`; NOT written through the sync Repository) `[FACT: gamification.ts:52-64]`; `user_achievements` (SyncMetadata only, `UNIQUE(achievement_id)`, no `created_at`/`deleted_at`) `[FACT: gamification.ts:69-79]`; `rules` (`event_trigger`/`derived_pull` binding + `[E]` JSON-as-TEXT `consequences` + nullable `grant_id`) `[FACT: economy.ts:87-103]`; `store` (single-parent, `group`/`wrapper`, `[E]` name, `dream_id?`/`purpose_id?` overlays, indexes on `parent_id` + `(ref_type,ref_id)`) `[FACT: economy.ts:61-81]`.

**Tables CONSUMED (never written directly)**: `currencies` + `consequence_ledger` (append-only, `UNIQUE(effect_event_id, kind, target_ref)`, no `deleted_at`) — writes happen ONLY through the economy handlers on the rail's `tx`. `[FACT: economy.ts:36-55]`

**Types.** `UserProfile`/`Achievement`/`UserAchievement` interfaces are **colocated in `packages/types/src/entities/user.ts`** `[FACT: entities/user.ts:43-86]`; economy has **enum tuples only** (`packages/types/src/economy.ts` — CURRENCY_BACKING_KIND/CONSEQUENCE_KIND/STORE_NODE_KIND/STORE_REF_TYPE/RULE_CONDITION_BINDING_TYPE) `[FACT: economy.ts:1-22]`. **`Currency`/`ConsequenceLedger`/`Store`/`Rule` interfaces do NOT exist yet** — defining them is genuinely net-new, not a double-export (grep-confirmed; clears `[[db4-types-may-be-colocated-grep-name-before-net-new]]`). `XpHistory` interface lingers but its table is retired → `consequence_ledger`. `[FACT: entities/user.ts:88-97]` Validators: economy enum Zod schemas exist (`validators/economy.ts`); **no full-entity validators** — those are net-new. `[FACT: packages/core/src/validators/economy.ts:10-15]`

**Service shape** (finance precedent `[FACT: packages/core/src/services/finance/{service.ts:167, types.ts:244, journal.ts:24, index.ts}]`): a `createGamificationService(deps)` factory returning an object literal (intra-calls hoisted to closures, NOT `this.` — `[[factory-service-no-this-for-intra-calls]]`), with `service.ts`/`types.ts`/`journal.ts`/`index.ts` + `__tests__/`; follows the data-flow pattern `validate → repository → encrypt-seam → return` `[FACT: services/gamification/CLAUDE.md]`.

**Dependency shape.** In-degree ~1 (only Notifications reads it); out-degree ~10 (feeders + Finance + Purposes + Journals). Peripheral observer, no cycle. `[FACT: structure-data.md:63-67]`

---

## 4. IMPLICIT RULES — invariants & seam preconditions (must hold; the gate checks these)

- **IR-1 Balances are DERIVED, never stored.** `total_xp`/`current_level` are caches recomputed via `computeBalance`; the ledger is truth (GM-4). Never write a balance column on mutation. `[FACT: business-rules.md GM-4; balance.ts:1-6]`
- **IR-2 Consequence = a SET of typed effects, each idempotent on its own key.** No umbrella effect; the engine coordinates, the rail dedups each (GM-2). `[FACT: business-rules.md GM-2; effects/service.ts:44-70]`
- **IR-3 Money moves ONLY through Finance's guarded handler** (fire `move_money`; never touch `transactions`/`accounts`). OS-ledger truth, not a bank call (GM-6). Self-granted/measured-time currencies need no Finance. `[FACT: business-rules.md GM-6; finance/effects.ts]`
- **IR-4 The System stores no signals.** Achievements/rule-conditions READ via `measurement.query(key)`; the System advertises none and owns no source data (GM-10, INT-1). `[FACT: business-rules.md GM-10; measurement/source-registry.ts:17]`
- **IR-5 Penalties LOCK, never destroy** (recoverable `lock` ledger rows) (GM-5). `[FACT: business-rules.md GM-5]`
- **IR-6 Streaks are module-owned** (Habits/Routines/Check-ins); the System reads, never computes/owns a streak (GM-11). `[FACT: business-rules.md GM-11]`
- **IR-7 Effects fire on the rail's tx, co-transactionally.** Firing a consequence during a rule execution uses `applyEffect`; a handler throw rolls back the whole effect atomically (F1 §3B). Idempotent replay → `applied:false`, no double-apply (GM-19/GM-20). `[FACT: effects/service.ts:44-70; business-rules.md GM-19,GM-20]`
- **IR-8 achievements is static-seed, non-syncable.** It cannot go through the sync Repository write path; the achievement engine reads it as seed content and writes only `user_achievements` (syncable). `[FACT: gamification.ts:52-64,14-16]`
- **IR-9 User-authored rule ⇒ capability envelope; shipped rule ⇒ trusted.** `grant_id` NULL = shipped (no envelope); non-null = author granted, must clear `assertPermitted` before firing (GM-8, fail-closed). User-authored achievements/rules as a *creation surface* are ⚠ INTENDED (see §5). `[FACT: business-rules.md GM-8; economy.ts:93; capability/enforcer.ts]`
- **IR-10 `[E]` on all user free-text** (currency name, store/box name, rule name/condition_ref/consequences, ledger notes) — the M1.0 field-level pass-through seam; getVaultKey throws vault-locked so the M1 encryptedFields set may be `[]` (`[[m10-repos-use-empty-encryptedfields-seam]]`). `[FACT: business-rules.md GM-18; conventions.md:24-25]`
- **IR-11 `user_profile` interface ≠ DB row** — the interface still carries `persona`/`check_in_streak`/etc. that moved to Preferences/Check-ins; the service returns a VIEW matching the real columns, not the stale interface (`[[drizzle-row-not-assignable-to-vida-types-interface]]`; DB-11 reconcile). `[FACT: entities/user.ts:43-64 vs gamification.ts:28-46]`
- **IR-12 Below-floor clamp+flag is the enforcing surface's job.** A lock/spend that would drive a balance below its floor is clamped + flagged HERE (deferred from the economy substrate to MOD-gamification). `[FACT: economy/current-business-rules.md:13,23]`
- **IR-13 Store is Finance-owned; compose, never build.** Rewards route into boxes via the `move_money` effect (deny-safe `StoreLockPort` today, FIN-24); net-worth is Finance's (FIN-18). MOD-gamification owns no `store` write. `[FACT: economy/current-business-rules.md:22; finance/current-business-rules.md:51-53]`

---

## 5. THE BOUNDARY — What it is NOT · M1-vs-M2 · open questions for Step 2

**What it is NOT** (identity.md:30-44): not the meaning plane (Purposes) · not a new engine (rides ADR-011/004) · not the owner of streaks/signals · not Finance · not an ADR-008 capability/Block (headless automation) · not the persona/onboarding owner · not required, not wealth-gated. `[FACT: docs/features/gamification/identity.md:30-44]`

**M1 (build now):** rule engine · achievement engine · level curve · currency surface · journal provider · user_profile service — the §0 BUILD rows minus the store question.

**M2 / ⚠ INTENDED (do NOT build; state as seams):**
- User-authored **achievements/rules creation surface** under the ADR-010 sandbox (GG7) — M1 supports shipped/trusted rules + the `grant_id` envelope hook, not an authoring UI/DSL. `[FACT: business-rules.md GM-13; intake.md GG7]`
- **Level-unlocks** (perks at thresholds) — M1 derives level+title only (GG5). `[FACT: business-rules.md GM-14]`
- **FN-13** budgeting signals, **EX-2** external screen-time tracking — measurement sources owned elsewhere; the System only reads whatever is advertised. `[FACT: business-rules.md GM-10]`
- **Account/identity entity** — PII relocation from `user_profile` deferred; PII STAYS at M1 (GM-12). `[FACT: structure-data.md:40-44]`

**OPEN QUESTIONS — RESOLVED at Step 2 by doc-grounding (a domain-ownership boundary, not a time-defer):**
- **OQ-1 → RESOLVED: the store worth-tree is Finance-owned, NOT this task.** `economy/current-business-rules.md:22` homes it verbatim: *"`store` + `move_money` handler → MOD-finance"*; `structure-data.md:35,81` — the `store` node is "the Storage LAYER, **owned by Finance** (a Commitments-style composition sub-context)"; it sits in Finance's OWN deferred list (FIN-18 net-worth · FIN-24 lock-box, `finance/current-spec.md:89`). MOD-gamification **COMPOSES** it — fires `move_money` with `lockTarget` (deny-safe today), reads net-worth when Finance ships it — and builds NO `store` CRUD. This is a domain boundary (`[[module-doc-is-db4-roster-not-adr-broad-list]]`), so the economy barrel's "store layer homed downstream" = downstream-to-Finance, not to here. `[FACT: docs/core/economy/current-business-rules.md:22]`
- **OQ-2 → RESOLVED: M1 builds the eval+dispatch operation; the event-source wiring is a composition seam.** `economy/current-business-rules.md:23` homes "Rules table + condition-eval → MOD-gamification"; the peripheral-observer model (structure-data.md:63-67) means the engine exposes `executeRule`/`evaluateRules(context)` (derived-pull reads the measurement seam; event-trigger receives the event), while WHICH feeder fires WHICH rule is wired at composition, not owned here. `[FACT: docs/core/economy/current-business-rules.md:23; structure-data.md:63-67]`
- **OQ-3 → RESOLVED: yes, gamification owns the effect-set assembly.** The rule engine parses `rules.consequences` (`[E]` JSON-as-TEXT) → a typed `EffectEvent[]` (deriving subjectNaturalKey/transition) → `dispatchConsequence(rail, effects)`. This is the net-new core of the rules slice; `dispatchConsequence`/the handlers are RATIFY. `[FACT: economy.ts:91; foundation/economy/handlers.ts:74]`

---

## 6. SLICE HINTS — input to the Decomposition Gate (Step 2)

Proposed backend slices (each tagged RATIFY-compose / BUILD; final call is Step 2):

- **S1 · Currency surface + level + below-floor clamp** (BUILD-thin over RATIFY) — `defineCurrency`/`listCurrencies`/`getBalance` over `createCurrencyRegistry` + `computeBalance`; pure `deriveLevel(total)` curve + title; below-floor **clamp+flag** on lock/spend; `user_profile` read/update (view reconcile, IR-11). Types: `Currency`/`ConsequenceLedger` interfaces (net-new). `[FACT: contract.md:20-23; economy/current-business-rules.md:13,23]`
- **S2 · Rule engine** (BUILD) — `rules` CRUD + `assertAcyclic` binding validation + `executeRule`/`evaluateRules` (parse `consequences` → `EffectEvent[]` → `dispatchConsequence`), user-authored envelope check (`grant_id`→enforcer). Type: `Rule` (net-new). `[FACT: business-rules.md GM-2,GM-8; economy/current-business-rules.md:23]`
- **S3 · Achievement engine** (BUILD) — evaluate app-curated predicates over the measurement seam + ledger stream (reconcile pass); unlock → `user_achievement` (syncable) + reward (grant_currency) + `surface_notification`; static-seed `achievements` read (IR-8). `[FACT: business-rules.md GM-13; economy/current-business-rules.md:23]`
- **S4 · Journal provider + cross-module wiring** (BUILD) — `createGamificationJournalContribution` (`summary(date)`) + effect-handler registration wiring + module barrel + composed StoreLockPort-consumption note (store itself = Finance). `[FACT: business-rules.md GM-15; services/finance/journal.ts:24]`

> **4 build slices** (store dropped → Finance-owned, OQ-1). Slice count/order is confirmed at Step 2; economy
> substrate rows RATIFY, the four pieces above BUILD.
> The Envision Gate (Step 1.5) is **N/A** — pure-backend service tier, no user-formed surface; the user-visible
> affordances (currency dashboard, rule builder, achievement wall, worth-tree) are the ② `fe-gamification`
> (LIF-181) track. `[FACT: entity-delivery-flow.md §3.75]`
