<!-- Slice Map — features/gamification · Entity Delivery Flow v1 Step 2 · session 2026-09-22-mod-gamification -->
<!-- The decomposition: slices + the backend/frontend split. Gate artifact — approved before per-slice work (Approval 1). -->
<!-- Reads on interpretation.md (intent authority) + seam-contract.md (the ② surface). Every claim [FACT: path:line] / [INTERP]. -->

# Slice Map — Gamification ("the System") ①

**Mode.** RATIFY the economy substrate (AR-7 built it) + BUILD the four downstream-homed pieces. The full
RATIFY/BUILD table is `interpretation.md §0`. This map fixes the **backend slices** and their **frontend twin**.

**Track split.** ① backend = this task (`services/gamification/`, 4 slices below). ② frontend = `fe-gamification`
(LIF-181, separate P6 issue) consumes the `seam-contract.md` surface. No shared slice: the module is a pure
service tier; every user-visible affordance is ②. `[FACT: interpretation.md §6 Envision-Gate N/A]`

---

## Backend slices (① — build order; each runs the per-slice Verification Gate before the next, Step 9)

### S1 · Currency surface + level + below-floor clamp — **BUILD-thin over RATIFY**
- **Owns:** `deriveLevel(total)` (pure non-linear curve + title) · below-floor **clamp+flag** on lock/spend · `user_profile` read/update (split-residual VIEW, IR-11).
- **Composes (RATIFY):** `computeBalance(rows, ceiling)` (never re-derive) · `createCurrencyRegistry.create/list` — but note (R1) the registry has ONLY `create(def)→void` + `list()→CurrencyDef[]` `[FACT: foundation/economy/registry.ts:28-31,51-64]`, so the `Currency`-interface shape, `getCurrency`, and the create-echo are a **thin BUILD** over `list()` (map `CurrencyDef`→`Currency`; re-read after create), NOT a pure pass-through.
- **Net-new types:** `Currency`, `ConsequenceLedger` interfaces (grep-confirmed absent). `[FACT: interpretation.md §3]`
- **Operations:** `defineCurrency` (create→re-read→map) `listCurrencies`/`getCurrency` (map/`find` over `list()`) · `getBalance(currencyId)` (reads ledger rows → `computeBalance`) · `getBalances()` · `deriveLevel(total)` · `getProfile`/`updateProfile`.
- **Invariants:** IR-1 (derived-never-stored) · IR-10 (`[E]` name) · IR-11 (interface≠row) · IR-12 (clamp+flag).
- **Verification Gate:** live-store — define a currency, write earn/lock ledger rows via the economy handlers, assert `getBalance` matches `computeBalance`; assert a below-floor lock clamps+flags.

### S2 · Rule engine — **BUILD**
- **Owns:** `rules` CRUD · binding validation (`assertAcyclic`) · `executeRule`/`evaluateRules` = parse `rules.consequences` (`[E]` JSON-as-TEXT) → typed `EffectEvent[]` (derive subjectNaturalKey/transition) → `dispatchConsequence(rail, effects)` · user-authored envelope check (`grant_id`→`assertPermitted`).
- **Composes (RATIFY):** `dispatchConsequence` + the grant/lock handlers (via the rail) · measurement `query(key)`/`assertAcyclic` · capability `assertPermitted`.
- **Net-new types:** `Rule` interface + `ConsequenceSpec` (the parsed `consequences` shape).
- **Operations:** `createRule`/`updateRule`/`enableRule`/`disableRule`/`deleteRule`/`listRules` · `executeRule(ruleId, ctx)` · `evaluateRules(ctx)` (derived-pull sweep).
- **Invariants:** IR-2 (effect-set, each idempotent) · IR-7 (fire on rail tx) · IR-9 (user-authored ⇒ envelope; shipped ⇒ trusted) · condition binding acyclic.
- **N1 (gate-1) — fire-time consent gate is DEFERRED, not dropped.** A `move_money` effect targets Finance (a `SENSITIVE_MODULE_CLASS`) so it would need `assertEffectPermitted`; but that consent gate is auth-off at M1 (trusted in-process callers, ADR-017; Finance BR-S4-5 defers it to #46/#85). So S2 composes only capability `assertPermitted` (the user-authored-rule grant), NOT the effect consent gate — matching Finance's own deferral. `[FACT: foundation/effects/gate.ts:46-59; capability/types.ts:97; finance/current-business-rules.md:56-58]`
- **Verification Gate:** live-store — author a shipped rule, execute it, assert the correct ledger row(s) appear once (idempotent replay → no double-apply); a user-authored rule with a revoked grant fails closed.

### S3 · Achievement engine — **BUILD**
- **Owns:** predicate evaluation over the measurement seam + ledger event stream (a reconcile pass, not bespoke checkers) · unlock → write `user_achievement` (syncable) + fire reward (`grant_currency`) + `surface_notification` · static-seed `achievements` READ (IR-8, not via sync Repository).
- **Composes (RATIFY):** measurement `query` · the rail (`applyEffect`) · economy handlers.
- **Operations:** `listAchievements` (seed) · `getUserAchievements` · `evaluateAchievements(ctx)` · `unlockAchievement(id)` (internal, idempotent via `UNIQUE(achievement_id)`).
- **Invariants:** IR-8 (static-seed read; write only `user_achievements`) · IR-4 (read signals, store none) · IR-2/IR-7 (unlock effects idempotent).
- **Verification Gate:** live-store — seed an achievement, advertise a measure that satisfies its predicate, run `evaluateAchievements`, assert one `user_achievement` row + reward ledger row + notification effect; re-run → no duplicate (UNIQUE holds).

### S4 · Journal provider + cross-module wiring — **BUILD**
- **Owns:** `createGamificationJournalContribution` (`summary(date) → SectionData`, R2 — the fixed contribution shape; the day payload rides in `items` typed `GamificationDaySummary`) · effect-handler registration wiring (registers the economy handlers into the app's rail at module init; NOT re-implementing them) · the module barrel `index.ts` + `createGamificationService(deps)` assembly.
- **Composes (RATIFY):** the journal-contribution seam returning `SectionData` (finance precedent `services/finance/journal.ts:24,31`) · `registerEconomyEffects`.
- **Operations:** `createGamificationService(deps)` (the factory that returns S1–S3 operations + the journal contribution) · `summary(date) → SectionData`.
- **Invariants:** IR-3 (money via Finance) · factory-object no-`this.` (`[[factory-service-no-this-for-intra-calls]]`).
- **Verification Gate:** live-store — build the full service, register on a rail, call `summary(date)` after seeding ledger + an unlock, assert the aggregated shape; assert the barrel exports typecheck against `@vida/core`.

> **Not a slice (compose-only):** the `store` worth-tree (Finance-owned, FIN-18/FIN-24) — gamification fires
> `move_money` with `lockTarget` (deny-safe today) and reads net-worth when Finance ships it (OQ-1). `[FACT: interpretation.md IR-13]`

---

## Frontend twin (② — `fe-gamification` LIF-181, NOT this task)
Consumes `seam-contract.md`. Surfaces: currency dashboard (balances + level/title) · rule builder · achievement
wall · (store worth-tree view = Finance's ② when it ships). Each rides an S1–S4 backend op 1:1; Visual Gate is ②'s.

---

## Dependencies between slices
S1 → S2 (rules fire currency effects; need the currency surface + types) → S3 (achievements fire rewards = currency
effects; reuse the effect-firing path) → S4 (assembles all three + journal). Linear build order S1→S2→S3→S4.
`[INTERP: from the effect-firing dependency chain]`
