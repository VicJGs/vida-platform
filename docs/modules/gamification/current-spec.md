# Gamification — Current Spec (as-built)

<!-- Durable per-context spec. Living doc (§XXIX). Ground truth for /critique + /preflight + session-kickoff.
     mod-gamification #48 ① (LIF-124). S1 shipped; S2–S4 pending. Every claim [FACT: path:line]. -->

## What it is
The Gamification module ("the System") — the user-facing SURFACE over the AR-7 economy substrate
(`foundation/economy`). It COMPOSES the substrate (currency registry · `computeBalance` · effect handlers ·
`dispatchConsequence`) and never re-implements it. Service tier only; every user-visible affordance is the
② `fe-gamification` (LIF-181). `[FACT: packages/core/src/services/gamification/CLAUDE.md; docs/features/gamification/delivery/interpretation.md §0]`

## Factory & composition
`createGamificationService(deps: { db, deviceId }): GamificationService` — factory-object, hoisted closures,
no `this.`. Creates the `CurrencyRegistry` from `db+deviceId` and two repositories (`consequence_ledger` read,
`user_profile` singleton), all `encryptedFields: []` (M1.0 [E] pass-through seam). `[FACT: services/gamification/service.ts:62-70]`
S2+ append injected ports (rail · measurement · enforcer). `[FACT: services/gamification/types.ts:24-28]`

## Surface (S1 — shipped)
| Op | Behaviour | Source |
|----|-----------|--------|
| `defineCurrency(input)` | validate → guard against an already-resolving code (`CurrencyExists`) → `registry.create` → re-read | `service.ts:78-88` |
| `listCurrencies()` / `getCurrency(code)` | `registry.list()` (shipped XP + user rows) / `.find` or `CurrencyNotFound` | `service.ts:72-76,90-95` |
| `getBalance(code)` / `getBalances()` | ledger rows → `computeBalance(entries, pool_ceiling)` — DERIVED, never stored | `service.ts:97-115` |
| `deriveLevel(total)` / `getLevel(code='XP')` | pure non-linear curve `1+⌊√(total/100)⌋` + title; level from lifetime `earned` | `service.ts:117-120; level.ts:44-48` |
| `previewSpend(code, requested)` | `clampToFloor(current, requested)` — below-floor clamp+flag | `service.ts:122-125; level.ts:60-64` |
| `getProfile()` / `updateProfile(patch)` | real-column VIEW (IR-11); upsert singleton + re-read (defaults) | `service.ts` |

## Surface (S2 — rule engine)
| Op | Behaviour | Source |
|----|-----------|--------|
| `createRule`/`updateRule` | validate → acyclicity check (`assertAcyclic` over rule→rule edges) → persist; re-read | `service.ts` |
| `enableRule`/`disableRule`/`deleteRule` | toggle `is_enabled` / soft-delete | `service.ts` |
| `listRules`/`getRule(id)` | parsed `Rule[]` / one or `RuleNotFound` (soft-deleted excluded) | `service.ts` |
| `executeRule(id, ctx)` | eval condition → envelope check (user-authored) → clamp locks → `rail.applyEffect` per effect; honest `effectsFired` | `service.ts` |
| `evaluateRules(ctx)` | sweep enabled rules against the context | `service.ts` |

## Surface (S3 — achievement engine)
| Op | Behaviour | Source |
|----|-----------|--------|
| `seedAchievements(defs)` | direct-drizzle insert (non-syncable seed), idempotent by `key` | `service.ts` |
| `listAchievements()` / `getUserAchievements()` | seed read (direct) / earned join (syncable) | `service.ts` |
| `evaluateAchievements(ctx)` | eval predicates (measure/currency) → unlock: earned-join + guarded reward + guarded notification | `service.ts` |

## Composed (RATIFY — not re-implemented)
`computeBalance` `[FACT: foundation/economy/balance.ts:12-27]` · `createCurrencyRegistry` (`create`/`list`,
SHIPPED_CURRENCIES=[XP]) `[FACT: foundation/economy/registry.ts:44-73]` · `CurrencyDef`/`CurrencyBalance`/
`LedgerEntry` types `[FACT: foundation/economy/types.ts:8-22]` · the effect rail `applyEffect` (idempotent) ·
measurement `query`/`assertAcyclic` · capability `checkAction` (user-authored rules).

## Files
`services/gamification/{level,rules,achievements,types,service,index}.ts` + `__tests__/gamification-service.test.ts`
(26 live-store tests) · `validators/gamification.ts` (Currency/Profile + Rule/Condition/ConsequenceSpec +
Achievement condition/seed schemas).

## Not in S1/S2/S3 (homed)
- S4 journal provider (`summary(date)→SectionData`) + effect-handler registration wiring (this module, next slice).
- Store worth-tree = **Finance-owned** (FIN-18/FIN-24) — composed via the `move_money` effect, never built here.
- `total_xp`/`current_level` cache refresh — folds into the effect-firing mutation path; currently derived live.
- User-authored rules AUTHORING surface + `grant_id`→def-id resolution (⚠ INTENDED → #85) · level-unlocks · quests.
- `derived_pull` recurring-occasion feeder wiring → composition seam (OQ-2) · achievement partial-progress + multi-currency rewards.
