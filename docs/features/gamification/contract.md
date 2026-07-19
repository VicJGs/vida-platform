<!-- Contract — features/gamification · /documentation Phase 2 · sources: ADR-002 §5.15 · ADR-004 §3.2.5 · ADR-011 · ADR-008/010 · finance.ts · docs/intake/gamification.md RESOLUTION -->

# Contract — Gamification ("the System")  (level: Feature — incentive engine)

> ⚠ The surface below is **INTENDED** (the System reframe); the v2 code is 4 tables, 0 service logic. The System is a
> **consumer/coordinator** — it fires **typed** effects through each owning module's guarded handler and reads signals
> via seams; it re-implements nothing. Terminal states per capability are enumerated in `[[business-rules]]`.

## Exposed surface — `SystemService`
- **Currency CRUD** — `defineCurrency(def) · update · archive`. A currency declares `backing_kind`
  {real-money, self-granted, measured-time} · unit · pool. `[INTENT §B]`
- **Rule CRUD (headless automation)** — `authorRule({ binding, consequences[] }) · update · revoke`. A rule = an
  **ADR-011 binding** (condition) + one or more **typed consequences**; user-authored rules install under the **ADR-010**
  declare→grant→enforce sandbox (attachment-scoped, sensitive-module consent). NOT an ADR-008 render-Block. `[INTENT §A;
  FACT: ADR-010 §3.1-3.3]`
- **Consequence dispatch** — on a rule fire, dispatch **typed effects**: the four gamification-owned effects
  (`grant_currency` · `lock_currency` · `move_money` · `surface_notification`) are **all §3.2.5 Additive-class**
  (a consequence may also fire other modules' keyed/projection effects). Idempotent per deterministic
  `effect_event_id`; the *engine* coordinates, the *rail* enforces per-effect dedup. `[INTENT §A; FACT: ADR-004 §3.2.5; ADR-012 §3.1]`
- **`balances(currency): { to_distribute, earned, locked, current }`** — all **derived** from the consequence ledger
  (never stored counters). `[INTENT GG2]`
- **`level(currency): { level, title, progress_to_next }`** — pure function of the currency total over a fixed
  non-linear curve. `[INTENT GG5]`
- **Achievement evaluation** — `evaluate(achievement)` = a measurable predicate on the ADR-011 seam + the event stream +
  a reconcile pass; unlock → `user_achievement` + reward + `surface_notification`. `[INTENT GG6/GG13]`
- **Provider registration** — `summary(date)` (currency earned/locked · achievements · level-ups → Journal) + emits
  `surface_notification` on unlock/level-up. `[INTENT GG10; FACT: journals JR-3]`

## What it consumes (documented integration points — no direct table access, constitution §6)
- **ADR-004 effect rail** — the typed effects above; every write goes through the **owning module's** guarded handler
  (`gamification.grantCurrency`, a Finance transfer handler for `move_money` [INTENDED — 0-logic today], `notifications.fire`), idempotent (INT-2 / §3.2.5).
  `[FACT: ADR-004 §3.2.5]`
- **ADR-011** — `binding_mode` (rule conditions) + the **measurement-source seam** (Health weight/food-quality · Finance
  categories · time · engagement). `[FACT: ADR-011 §3.5-3.6]`
- **ADR-010** — the permission envelope for user-authored rules/currencies/achievements. `[FACT: ADR-010]`
- **Finance** — the **Storage layer** (read boxes; request money-moves via the Finance handler; the OS-ledger transfer,
  FN-4); box↔Dream earmark. `[FACT: finance.ts transfer; FN-4]`
- **Purposes / Dreams** — reward targets (`estimated_cost`), laddering into progress. `[FACT: dreams L1941; ADR-011]`
- **Spaces** — user currencies · challenges (a challenge = a saved View) · personalization. `[FACT: ADR-006/007]`
- **Every feeder** — emits `award_xp` (= `grant_currency(XP)`) / other `grant_currency` on its events (Habits · Tasks ·
  Sessions · Routines · Check-ins · Skills · Pomodoro · …). `[FACT: HB-9, RT-13, CK-11, PD-10, SK-10]`
- **Depended on by:** **Notifications** (reads for unlock/level-up alerts — the only in-edge) · Journals (reads
  `summary`). `[FACT: dep-graph L225 in-degree 1]`

## Contract error cases (typed)
- `CyclicRule` — a rule binding that would form a cycle → rejected at author time (ADR-011 §3.7).
- `UngrantedScope` — a user rule fires an effect outside its ADR-010 grant → rejected, no write (fails closed).
- `SignalUnavailable` — a condition's measurement-source is missing/stale → rule **suppressed** + flagged, never fires on
  fabricated data (GM-10).
- `EffectApplyFailed` — a typed effect fails → target unchanged + flagged; idempotent `effect_event_id` blocks
  double-apply (GM-20).
- `CurrencyFloorClamp` — a penalty that would over-draw a currency/box is **clamped** + flagged, never over-locked (GM-5).
- `DoubleParentStore` — wrapping a value-holder under two worth-tree nodes → rejected (canonical single-parent, GM-9).
- `ProviderEmitFailed` — `summary`/notification emit fails in isolation; the ledger + other providers unaffected (GM-15).

## Completion checklist
- [x] exposed surface + consumed · [x] typed errors · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] on each claim · [x] typed effects (not one umbrella) · [x] rules = headless automation
