<!-- Conventions — features/gamification · /documentation Phase 2 · sources: ADR-002 §5.15 · ADR-004 §3.2.5 · ADR-011 · ADR-008/010 · docs/intake/gamification.md RESOLUTION · CLAUDE.md Conventions -->

# Conventions — Gamification ("the System") (level: Feature — incentive engine)

## How to build here

- **Typed effects, never an umbrella.** A consequence dispatches separate typed effects; the four gamification-owned ones
  — **`grant_currency`** · **`lock_currency`** · **`move_money`** · **`surface_notification`** — are **all §3.2.5
  Additive-class** (each a durable row append with no domain natural key; a notification is a real synced row, not a
  projection). A single "do everything" effect can't converge several distinct output rows on one `effect_event_id`, nor
  span classes when a consequence also fires other modules' keyed/projection effects. `[FACT: ADR-004 §3.2.5; ADR-012 §3.1]`
- **Derive, don't store.** Currency balances (to-distribute · earned · locked · current) and levels **recompute from the
  consequence ledger**; `total_xp`/`current_level` are caches, never truth. `[INTENT GG2; FACT: SS-12]`
- **A rule is headless automation, not a Block.** Author it as an ADR-011 binding + typed effects + (user-authored) the
  ADR-010 envelope — **never** as an ADR-008 render-capability. `[FACT: ADR-008 §3.2 render-targets; ADR-010]`
- **Write only through owning handlers (INT-2).** Money moves via a Finance-owned transfer handler (the OS-ledger
  transfer; **INTENDED — `finance-service.ts` is 0-logic today**, `transfer` exists only as a `transaction_type`);
  streaks are **read** from their modules; the System never writes another module's table. Self-granted-allowance
  currencies need **no** Finance — the OS tracks a balance the user honors in life. `[FACT: core INT-2; transfer type finance.ts L22,L88-89]`
- **Read signals via the measurement seam.** Conditions pull Health/Finance/time/engagement via ADR-011 §3.6 — the
  System caches no other module's signal. `[FACT: ADR-011 §3.6; INT-1]`
- **Storage = a Finance-owned domain hierarchy.** The `store` tree is single-parent structural nesting (like Projects/
  Tasks), **canonical** for worth (no double-count); any _other_ grouping is **Spaces** tags. `[INTENT §C; FACT: INT-1a]`
- **Data conventions (inherit CLAUDE.md):** UUIDv7 TEXT PKs · Unix-ms INTEGER timestamps · money INTEGER cents · JSON as
  TEXT · `[E]` on all user free-text (currency/box names, rule + user-authored achievement titles/descriptions, ledger
  notes) · `_sync_*` on every syncable table · soft delete. `[FACT: CLAUDE.md Conventions; ZK-1]`

## Naming & layout

- Invariants are `GM-N`; aspect docs = the canonical 5 (replacing the off-standard stub set). `[FACT: docs/features/*]`
- Effects: `grant_currency` · `lock_currency` · `move_money` · `surface_notification`; **`award_xp` = `grant_currency(XP)`**
  (kept as the canonical XP case — the 9 feeders are unbroken). `[INTENT §A]`
- Currency `backing_kind` ∈ {real-money, self-granted, measured-time}; store `node_kind` ∈ {group, wrapper}. `[INTENT §B/§C]`
- Notes/tags via `pages`/Spaces (achievement/level entity_types already reserved in `entity_links`). `[FACT: note.ts L44-92]`

## Pitfalls / local "never do"

- **Never bundle consequences into one effect** — each output row needs its own `effect_event_id`; and a consequence can span §3.2.5 classes via other-module effects (GM-2, ADR-012 §3.1). `[FACT: §3.2.5]`
- **Never trust `total_xp`/`current_level` as truth** — derive from the ledger (GM-4).
- **Never model a rule as an ADR-008 render-Block** — it's headless automation (GM-8).
- **Never write another module's tables** — money via the Finance handler; streaks read-only (GM-6/GM-11; INT-2).
- **Never compute or own a streak** — it lives in Habits/Routines/Check-ins (GM-11).
- **Never destroy on penalty** — lock (recoverable), never delete (GM-5).
- **Never wrap a value-holder under two worth-tree nodes** — canonical single-parent; use Spaces for other grouping (GM-9).
- **Never wealth-gate the System** — self-granted allowances make it work without money (GM-3).
- **Never relocate `user_profile` PII** until an account/identity model exists — it stays for now (GM-12).

## Completion checklist

- [x] patterns in use (enforced, not aspiration) · [x] naming/layout · [x] pitfalls · [x] [FACT/INTENT] on each claim
