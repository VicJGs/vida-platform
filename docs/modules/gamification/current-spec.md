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
| `getProfile()` / `updateProfile(patch)` | real-column VIEW (IR-11); upsert singleton + re-read (defaults) | `service.ts:127-153` |

## Composed (RATIFY — not re-implemented)
`computeBalance` `[FACT: foundation/economy/balance.ts:12-27]` · `createCurrencyRegistry` (`create`/`list`,
SHIPPED_CURRENCIES=[XP]) `[FACT: foundation/economy/registry.ts:44-73]` · `CurrencyDef`/`CurrencyBalance`/
`LedgerEntry` types `[FACT: foundation/economy/types.ts:8-22]`.

## Files
`services/gamification/{level,types,service,index}.ts` + `__tests__/gamification-service.test.ts` (10 live-store
tests) · `validators/gamification.ts` (`CurrencyCreateSchema`, `UpdateProfileSchema`).

## Not in S1 (homed)
- S2 rule engine · S3 achievement engine · S4 journal provider + wiring (this module, later slices).
- Store worth-tree = **Finance-owned** (FIN-18/FIN-24) — composed via the `move_money` effect, never built here.
- `total_xp`/`current_level` cache refresh — folds into the effect-firing mutation path (S2/S3); S1 derives live.
- User-authored rules/achievements (⚠ INTENDED → #85 CAP-authoring) · level-unlocks · quests.
