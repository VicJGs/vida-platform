# foundation/economy — Current Business Rules

> Durable invariants for the points economy (AR-7 Increment 4). Owning ADR: ADR-012.
> Kept current with `packages/core/src/foundation/economy/`.

- **BR-1 (rule = binding + typed effects — §3.1).** A consequence dispatches typed effects on the rail; the 4 economy
  effects are all **Additive**, each appending its own output row keyed by a deterministic `effect_event_id`.
- **BR-2 (multi-currency — §3.2).** `currency.backing_kind {real-money·self-granted·measured-time}`; XP is one currency (`grant_currency(XP)`), not privileged.
- **BR-3 (derived balances — §3.3).** `earned·locked·spent·distributed` recompute on read from `consequence_ledger`;
  `current = earned − locked − spent`. Stored counters are caches, never truth (`computeBalance`).
- **BR-4 (to-distribute — §3.3).** `toDistribute = ceiling − distributed` — a config ceiling, not a ledger sum; `null` when no ceiling.
- **BR-5 (lock-not-destroy — §3.4).** A penalty writes a `lock` row (recoverable); the ledger is **append-only**
  (no `deleted_at`; corrections are compensating rows). The below-floor **clamp+flag** is deferred to the enforcing surface (MOD-gamification).
- **BR-6 (idempotent handlers — §3.1).** `grant_currency`/`lock_currency` write a `consequence_ledger` row inside the
  effect rail's tx (via `Repository.createInTx`), with the deterministic `effect_event_id` under **UNIQUE
  (effect_event_id, kind, target_ref)** — mirroring the rail's composite PK. The rail's local `applied_effects` is the
  replay guard; the ledger UNIQUE is cross-device convergence.
- **BR-7 (coordinator invents no write path — §3.1).** `dispatchConsequence(rail, effects[])` fans a fire out to `rail.applyEffect` per typed effect — no new write path, no new idempotency.
- **BR-8 (boundaries — §3.11).** Owns currencies/ledger/4-derived/lock-not-destroy/coordinator/effect-class. Does NOT own the rail (ADR-004), conditions (ADR-011 — a condition *is* a Binding), or the sandbox (ADR-010).

## Deferred (not in this increment — all homed, DF-12 + §6)
`store` + `move_money` handler → MOD-finance. `surface_notification` handler → MOD-notifications. Rules table +
condition-eval + achievement reconcile + level-curve config + below-floor clamp → MOD-gamification. User-authored rules
sandbox → #85 CAP-authoring. `user_profile` split → Check-ins/Prefs (PII stays ⚠). Level-unlocks · user achievements/quests → ⚠ INTENDED-later.
