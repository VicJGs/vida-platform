<!-- Seam Contract — features/gamification · Entity Delivery Flow v1 Step 2 · session 2026-09-22-mod-gamification -->
<!-- The service API the ② fe-gamification (LIF-181) UI consumes. The ①↔② seam. Gate artifact (Approval 1). -->
<!-- Signatures are the CONTRACT; exact types land in packages/types + the service spec. [FACT]/[INTERP]/[UNKNOWN]. -->

# Seam Contract — `createGamificationService(deps)` ①→②

**Factory** (finance precedent `createFinanceService(deps)` `[FACT: services/finance/service.ts:167]`):

```ts
createGamificationService(deps: GamificationServiceDeps): GamificationService
```

`GamificationServiceDeps` = `{ db, deviceId, rail, currencyRegistry, measurement, enforcer }` — the composed
substrates injected (RATIFY), NOT re-created inside. `[INTERP: from interpretation.md §1 dependencies]`

Object-literal factory; intra-service calls hoisted to closures, never `this.` (`[[factory-service-no-this-for-intra-calls]]`).
Data-flow per op: `validate (Zod) → repository → encrypt-seam → return`. `[FACT: services/gamification/CLAUDE.md]`

---

## Surface (what ② calls)

### Currencies & balances (S1)

| Op               | Signature                                           | Notes                                                                                                                              |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `defineCurrency` | `(input: CurrencyCreate) → Promise<Currency>`       | **thin-BUILD:** `registry.create` returns `void` → the surface re-reads via `list()` and maps `CurrencyDef`→`Currency`; `[E]` name |
| `listCurrencies` | `() → Promise<Currency[]>`                          | **thin-BUILD:** `registry.list()` returns `CurrencyDef[]` (shipped+user merged) → map to `Currency`                                |
| `getCurrency`    | `(id) → Promise<Currency>`                          | **thin-BUILD:** no `registry.get` exists → `list().find(id)`; throws `CurrencyNotFound`                                            |
| `getBalance`     | `(currencyId) → Promise<CurrencyBalance>`           | ledger rows → `computeBalance` (RATIFY); DERIVED                                                                                   |
| `getBalances`    | `() → Promise<Record<currencyId, CurrencyBalance>>` | all currencies                                                                                                                     |

`CurrencyBalance = { earned, locked, spent, distributed, current, toDistribute }` `[FACT: foundation/economy/balance.ts:12-27]`

> **R1 (gate-1):** `CurrencyRegistry` exposes only `create(def)→void` + `list()→CurrencyDef[]` `[FACT: foundation/economy/registry.ts:28-31,51-64]` — the `Currency`-interface shape + `getCurrency` are BUILT on `list()`, not passed through. Not a pure compose.

### Levels & profile (S1)

| Op              | Signature                                                    | Notes                                                 |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| `deriveLevel`   | `(currencyTotal: number) → { level: number; title: string }` | pure, fixed non-linear curve (GM-14)                  |
| `getProfile`    | `() → Promise<UserProfileView>`                              | VIEW of real columns, not the stale interface (IR-11) |
| `updateProfile` | `(patch: UserProfilePatch) → Promise<UserProfileView>`       | XP/level are caches; PII stays (GM-12)                |

### Rules (S2)

| Op                                                   | Signature                                               | Notes                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `createRule`                                         | `(input: RuleCreate) → Promise<Rule>`                   | validates binding acyclic; user-authored ⇒ `grant_id` required           |
| `updateRule`/`enableRule`/`disableRule`/`deleteRule` | `(id[, patch]) → Promise<Rule\|void>`                   | `is_enabled` toggle; soft-delete                                         |
| `listRules`                                          | `() → Promise<Rule[]>`                                  |                                                                          |
| `executeRule`                                        | `(ruleId, ctx: RuleContext) → Promise<ExecutionResult>` | parse consequences → `EffectEvent[]` → `dispatchConsequence`; idempotent |
| `evaluateRules`                                      | `(ctx: RuleContext) → Promise<ExecutionResult[]>`       | derived-pull sweep over enabled rules                                    |

`RuleContext = { subjectId; event?: { type; targetRef; value? } }` `[INTERP: event-trigger vs derived-pull, OQ-2]`

### Achievements (S3)

| Op                     | Signature                                         | Notes                                           |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------- |
| `listAchievements`     | `() → Promise<Achievement[]>`                     | static seed (read-only, IR-8)                   |
| `getUserAchievements`  | `() → Promise<UserAchievement[]>`                 | earned                                          |
| `evaluateAchievements` | `(ctx: RuleContext) → Promise<UserAchievement[]>` | predicate eval → unlock(s); idempotent (UNIQUE) |

### Journal (S4)

`createGamificationJournalContribution(svc) → JournalContribution` with `summary(date) → SectionData`
— the FIXED contribution shape `{ sectionKey:'summary', module:'gamification', dataPoints, state, items? }`; the
day's gamification detail (currency earned/locked · achievements unlocked · level-ups) rides in `items`, typed
`GamificationDaySummary`. `state` is derived per the TerminalState-by-type rule from its own live read.
`[FACT: services/journals/types.ts:43-49,58-64; services/finance/journal.ts:24,31]`

> **R2 (gate-1):** `JournalContribution.summary` returns `SectionData`, NOT a bespoke type — `GamificationDaySummary` names the `items` element only.

---

## Error contract (typed, fail-loud)

`CurrencyNotFound` · `RuleNotFound` · `RuleBindingCyclic` (from `assertAcyclic`) · `RuleGrantRevoked` (user-authored, `assertPermitted` denies — fail-closed) · `BelowFloorClamped` (flag, not necessarily throw — clamp is the happy path) · `AchievementNotFound`. Firing errors surface from the rail (`applyEffect` throw rolls back the tx, IR-7). `[INTERP: from interpretation.md §4]`

## What ② must NOT expect from this seam

- No `store` CRUD / net-worth ops — Finance-owned (compose-only, OQ-1/IR-13).
- No user-authored-rule sandbox/DSL — ⚠ INTENDED (#85 CAP-authoring); the seam exposes the `grant_id` hook only.
- No direct `move_money`/`surface_notification` — those fire as effects, not seam calls (IR-3).
- No stored balances — every balance is a live `computeBalance` (IR-1).

## ①↔② coupling note

The ② UI holds NO business logic: it renders `CurrencyBalance`/`Rule`/`Achievement`/`GamificationDaySummary`
shapes and calls the ops above. Terminal states (loading/empty/error/success) are ②'s via the `@vida/core`
`TerminalState` canon (`[[design-model-reuses-canon-by-type-not-runtime]]`). `[INTERP]`
