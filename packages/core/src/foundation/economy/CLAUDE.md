# foundation/economy — substrate (ADR-012)
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is
Multi-currency points economy on a rule->consequence engine; grant_currency effect + consequence_ledger derived balance. Surface = services/gamification/

## Owning ADR
ADR-012

## Capabilities (framework §3)
E2 E3 E4

## Status
Built by AR-7 Increment 4 (2026-08-03, FINAL — closed AR-7). `currencies` + `consequence_ledger` (append-only,
derived balances) — `db/schema/foundation/economy.ts` + migration 006 · `CURRENCY_BACKING_KIND`/`CONSEQUENCE_KIND`
enums · `balance.ts` (computeBalance) · `handlers.ts` (grant_currency/lock_currency write the ledger via the rail's
tx + `dispatchConsequence` coordinator) · `registry.ts` (currency service + XP seed). Currency: `docs/core/economy/current-*`.
Deferred (all homed, DF-12): store+move_money→MOD-finance; surface_notification→MOD-notifications; rules/achievements/
level/clamp→MOD-gamification; sandbox→#85. Uses `Repository.createInTx` (added to DB-6 this increment for handler co-writes).

