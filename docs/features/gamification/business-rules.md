<!-- Business Rules — features/gamification · /documentation Phase 2 · sources: ADR-002 §5.15 L3361-3463 · user.ts L38-92 · ADR-004 §3.2.2/§3.2.5 · ADR-011 · ADR-008/010 · docs/intake/gamification.md RESOLUTION -->

# Business Rules — Gamification ("the System") (level: Feature — behavioral incentive engine)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3, SU-1/2, INT-1, **INT-2**, PC-3,
> EX-1/EX-2, DATA-3/4. Every rule below complies. **Altitude note:** the v2 surface is 4 tables (user_profile ·
> achievements · user_achievements · xp_history), schema-only, 0 service logic. The System reframe below (rule →
> consequence engine · multi-currency economy · Storage boxes) is INTENDED; live-vs-INTENDED is flagged per rule and
> in the ⚠ Flagged delta. The System is the **motivation/consequence** plane — partner to Purposes' meaning plane.

## Invariants (what is ALWAYS / NEVER true)

- **GM-1 — Optional, opt-in, omnipresent-when-on.** Nothing in the OS requires the System (`preferences.
feature_gamification`); when on, any action CAN earn/lose a consequence and the System surfaces it. It is the
  behavioral **partner to Purposes** (meaning ↔ motivation), never a gate on core function. `[FACT: user.ts
feature_gamification L199; INTENT: RESOLUTION GG1]`
- **GM-2 — A rule = a binding; a consequence = a set of TYPED effects (each in its §3.2.5 class).** A System rule is
  `IF [measured condition] THEN [consequence]`: the condition is an **ADR-011 binding** (`event-trigger` · `derived-pull`
  over a measurement-source), acyclic (DAG). A "consequence" is **NOT one effect** — it dispatches **typed effects,
  each in its correct ADR-004 §3.2.5 write-class**: all four gamification-owned effects — **`grant_currency`** (`award_xp`
  = the XP case) · **`lock_currency`** · **`move_money`** · **`surface_notification`** — are **§3.2.5 Additive-class**
  (each appends a durable output row with no domain natural key → a deterministic `effect_event_id` is the sole
  convergence key; a notification writes a real synced `notifications` row, so it is Additive, **not** a projection).
  A consequence may **also** fire other modules' effects (`complete_habit_occurrence` [keyed] · `surface_journal`
  [projection]). The consequence _engine_ coordinates them; the _rail_ keeps every effect idempotent on its own key
  (an umbrella effect can't converge several distinct output rows on one id, nor be additive + keyed + projection at
  once). No new engine. **[Authority: ADR-012 §3.1 — supersedes the earlier "keyed"/"projection" labels here.]**
  `[FACT: ADR-004 §3.2.5 taxonomy (Additive = "no domain natural key"); ADR-011 §3.5-3.7; ADR-012 §3.1]`
- **GM-3 — The economy is MULTI-CURRENCY.** Points generalize to many **resource-currencies** that run
  simultaneously; a reward/penalty is denominated in any of them. **Backing kinds:** `real-money` (→ Storage/Finance) ·
  `self-granted allowance` (vacation · cheat/food-freedom · fun/gaming — no external backing, no wealth required) ·
  `measured-time` (sessions · `task_time_logs`). Currencies are **user-definable**. `[INTENT: RESOLUTION §B — Victor]`
- **GM-4 — Currency balances are DERIVED, not stored.** Per currency, the four quantities — **to-distribute · earned ·
  locked · current** — recompute from the **consequence ledger** (the generalized `xp_history`); the stored counters
  (`total_xp`, `current_level`) become caches, never the source of truth. `[INTENT GG2; FACT: house rule SS-12 /
ADR-011 §3.2]`
- **GM-5 — Penalties LOCK, never destroy.** A penalty moves currency/money into a **locked** box/pool — held and
  **recoverable**, not deleted — via a `lock_currency`/`move_money` **Additive** effect (idempotent per deterministic `effect_event_id`; ADR-012 §3.1).
  `[INTENT: RESOLUTION §A/§B — Victor "not truly lost, but locked"]`
- **GM-6 — Real-money consequences move money through Finance; the OS is the ledger truth.** A `real-money` reward =
  a **transfer** into a Storage box (native `transaction_type='transfer'`, FN-4) — a real entry in the user's own
  money-truth, **not** a bank API call. **Self-granted-allowance** consequences need no Finance: the OS tracks the
  balance the user honors in life. Finance/Health writes require explicit capability consent (PC-3). `[FACT:
finance.ts transfer L86-106; FN-4; ADR-010 §3.3 sensitive-module consent]`
- **GM-7 — Rewards can fund Dreams (money ↔ meaning).** A reward routed into a box may earmark a **Dream**
  (`estimated_cost`) / Purpose, laddering the consequence into Purposes progress. `[INTENT; FACT: dreams
estimated_cost ADR-002 L1941; ADR-011 contributions]`
- **GM-8 — Rules are USER-AUTHORED, guarded — a HEADLESS automation primitive, NOT a render-Block.** A rule = an
  ADR-011 binding + typed consequence effects (GM-2) + (for user-authored ones) the **ADR-010** permission envelope.
  Shipped rules are trusted; user-authored rules run under ADR-010's declare→grant→enforce sandbox (attachment-scoped ·
  guarded-write · no double-count · sensitive-module consent · revocable · fails closed) — **reusing that machinery
  without being an ADR-008 capability.** ADR-008 capabilities are **render-targeted Blocks** (inline/standalone); a
  rule is headless background automation with no render target. `[FACT: ADR-010 §3.1-3.3; core PC-3; ADR-008 §3.2
render-targets — rules are NOT that]`
- **GM-9 — Storage = a nestable composition LAYER, not a rewrite.** A `store` node = **group** (folder) or **wrapper**
  (→ existing `account`/`investment`/`asset`), self-nesting (`parent_id`), carrying `is_locked` · `dream_id?`/
  `purpose_id?` · the currency overlay. **Existing Finance entities are UNTOUCHED.** The tree is a **domain structural
  hierarchy** (single-parent `parent_id`, exactly like Projects `parent_milestone` / Tasks `parent_task_id`) —
  **orthogonal to Spaces**, which owns many-to-many **tag** grouping (`entity_tags`, INT-1a); a structural
  worth-hierarchy is not a tag-set. Worth-tree is **canonical single-parent** (each value-holder wrapped once → no
  double-count); Spaces tags an entity into any number of themed views _on top_. Net worth = Σ store tree − Σ
  liabilities. Owned by **Finance**, consumed by the System. `[INTENT: RESOLUTION §C — Victor; FACT: Commitments
precedent FN-14; projects/tasks parent-FK; core INT-1a; ADR-011 rollup]`
- **GM-10 — The System READS behavioral signals, owns no source data.** Conditions read via the **ADR-011
  measurement-source seam** (Health body-weight/food-quality · Finance categories · time · engagement); the System
  never stores another module's signal. Cross-device screen-time + Finance budgeting are the **EX-2/FN-13 frontier**
  (opt-in, on-device, ZK), added incrementally. `[FACT: ADR-011 §3.6; INT-1; EX-1/EX-2; health HN-12/13]`
- **GM-11 — Streaks are module-owned; the System reads them.** Habits (cached), Routines (policy-derived), Check-ins
  own their streaks; the System awards milestone consequences but **never computes or owns a streak**. `[FACT: HB-2,
RT-7/RT-14, CK-11]`
- **GM-12 — `user_profile` splits by single-writer (cross-cutting).** The System owns only per-currency total + level;
  **`check_in_streak*` → Check-ins** (owner exists, CK-11); **persona/motivation/modules/onboarding → Preferences**
  (which owes a receiving amendment). **PII (`display_name`/`avatar_url`/`birth_date`) STAYS in `user_profile` for
  now** — ⚠ no account/identity entity exists yet to receive it; relocation is INTENDED once that model is designed.
  The cross-module footprint (Check-ins + Preferences amendments) is tracked in §5.20. No field ends with two writers.
  `[INTENT GG3; FACT: overloaded ADR-002 L3366-3396; no account entity today]`
- **GM-13 — Achievements = predicates over measured state + the event stream.** An achievement `condition` is a
  measurable predicate (streak ≥ N · count ≥ N · `level_reached` · `net_worth ≥ X`) evaluated on the **measurement
  seam** (pull) + consequence events (push) + a reconcile pass — **not** v1's bespoke per-category checkers. **App-
  curated catalogue for v1**; user-authored achievements/challenges = the capability model (⚠ INTENDED). `[INTENT
GG6/GG7; FACT: v1 22+ condition types ../life-os achievementDefinitions.ts]`
- **GM-14 — Leveling = a pure function of a currency total.** A level is derived from a currency's cumulative total
  against a **fixed non-linear curve + titles** (v1: 0·100·300·…·5500); level-**unlocks** (rewards that _do_ something)
  are ⚠ INTENDED. `[INTENT GG5; FACT: ../life-os levelConfig.ts]`
- **GM-15 — Provider registration + Notifications.** The System registers **`summary(date)`** for Journals (currency
  earned/locked · achievements unlocked · level-ups) and **emits Notifications** on unlock/level-up/consequence via a
  new **`surface_notification`** effect. Its only in-edge is Notifications reading it. `[INTENT GG10; FACT: journals
JR-3; notifications table ADR-002 §5.16; dep-graph in-degree 1]`
- **GM-16 — Persona / onboarding guidance is NOT the System.** v1's persona weighting + module-guidance + template
  suggestions belong to **Preferences/Onboarding + Spaces templates**; the System at most reads persona for reward
  framing. `[INTENT GG9]`
- **GM-17 — Quests / challenges are a Space.** Time-boxed challenges = a saved challenge **View** over rules/goals
  (Spaces), or ⚠ INTENDED-later — not a bespoke quest table. `[INTENT GG11]`
- **GM-18 — Encryption.** `[E]` on all user free-text: currency names, box/store names, rule + user-authored
  achievement titles/descriptions, `xp_history` notes; structural enums, amounts, levels, timestamps, FKs are
  plaintext. `[FACT: ZK-1; ADR-002 §5.15 achievements are P app-content — user-authored content becomes E]`
- **GM-19 — Local-first + idempotent consequences.** Every earn/lock/spend/consequence succeeds locally first; LWW
  (HLC, ADR-003) on structured columns; the ledger merges by natural key + the deterministic `effect_event_id`, so a
  consequence **never double-applies across devices**. `[FACT: LF-2; ADR-003; ADR-004 §3.2.5]`
- **GM-20 — Consequences fail loud.** A failed money-move / consequence leaves state **unchanged** and **flags** it;
  the idempotent `effect_event_id` guarantees no double-apply on retry; a penalty **never** silently over-applies.
  `[FACT: ADR-004 §3.2.5; constitution §5]`

## Validation & edge cases

- Enum CHECKs (v2 floor): `achievements.category`(9), `tier`(bronze·silver·gold·platinum), `is_secret`; `persona`(6).
  `[FACT: ADR-002 L3405-3416, L3368]`
- A rule whose condition references an unavailable measurement-source → surfaces a typed "signal unavailable" state,
  **never** fires the consequence on stale/missing data (GM-10). `[INTERP GM-10]`
- A penalty that would drive a currency below its floor → clamps + flags (money can't go below a box's real balance;
  a self-granted allowance can't lock more than exists). `[INTERP GM-5]`
- A binding that would form a cycle (rule A feeds B feeds A) → rejected at author time (ADR-011 §3.7). `[FACT: ADR-011
§3.7]`
- Wrapping the same value-holder under two store nodes in the worth-tree → rejected (canonical single-parent, GM-9);
  free grouping goes through Spaces instead. `[INTERP GM-9]`

## Terminal states (enumerated before build)

| Capability                            | loading    | empty               | error                                                          | success                                             |
| ------------------------------------- | ---------- | ------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| Author a rule (condition→consequence) | —          | —                   | cycle / invalid ref / ungranted scope → typed error, no save   | rule saved; binding armed                           |
| Fire a consequence (reward/penalty)   | —          | —                   | effect fails → state unchanged + flagged; idempotent no-double | currency granted/locked; ledger appended            |
| Currency dashboard (4 quantities)     | computing  | "no currencies yet" | signal error → show partial + flag                             | to-distribute/earned/locked/current per currency    |
| Storage tree (boxes + worth)          | skeleton   | "no boxes yet"      | node/value read error → typed, retry                           | nested tree; net worth = tree − liabilities         |
| Achievement evaluation                | evaluating | "none yet"          | measurement-source error → skip + flag, retry on reconcile     | unlocked → user_achievement + reward + notification |
| Level / progress                      | computing  | "level 1"           | ledger error → cache + flag                                    | derived level + progress-to-next + title            |
| Provider (summary / notifications)    | —          | nothing in range    | emit fail → flagged, isolated                                  | Journal feed + unlock/level-up notifications        |

## Failure behavior (fail loud — constitution §5)

- A consequence that fails to apply leaves the target **unchanged** and **flags** it — never a partial money-move or
  half-locked currency (GM-20). The idempotent `effect_event_id` blocks double-apply on retry/multi-device.
- A missing/stale measurement-source **suppresses** the rule with a typed flag — never fires on fabricated data (GM-10).
- A provider/notification emit failure is **isolated**; the ledger and other providers are unaffected (GM-15).
- A penalty is **clamped, never silently over-drawn** (GM-5).

## ⚠ Flagged delta (spec must not outrun code — constitution §8)

INTENDED, not in ADR-002 §5.15 today (→ consolidated into **§5.20** + **ADR-012**, Accepted 2026-07-19): **GM-2** the TYPED consequence
effects (`grant_currency` · `lock_currency`/`move_money` · `surface_notification` — **all §3.2.5 Additive-class**, ADR-012 §3.1) + rules as
a headless automation primitive (ADR-011 binding + ADR-010 envelope, NOT an ADR-008 Block); **GM-3/GM-4**
multi-currency ledger (generalize `xp_history`) + `currencies` registry; **GM-5** locked-currency/box; **GM-9** the
`store` Storage layer (Finance-owned domain hierarchy); **GM-6** the `move_money` Finance effect + box↔Dream link;
**GM-12** `user_profile` split (Check-ins + Preferences receive; PII stays ⚠); **GM-13** achievement-engine-on-
measurement + user-authored achievements. **Live today (FACT floor):** the 4 tables
(user_profile · achievements · user_achievements · xp_history), the `award_xp` effect slot (ADR-004), the
Notifications table — and **no service logic**. `[FACT: ADR-002 §5.15; grep clean of packages/core/src/services]`

## Completion checklist

- [x] invariants with [FACT/INTENT/INTERP] · [x] terminal states enumerated · [x] failure is loud · [x] inherits constitution (incl. INT-2/PC-3/EX) · [x] spec/code drift flagged · [x] the System model (rule→consequence · multi-currency · Storage) stated
