<!-- Structure & Data — features/gamification · /documentation Phase 2 · sources: ADR-002 §5.15 L3361-3463 · user.ts L38-92 · ADR-004 §3.2.2/§3.2.5 · ADR-011 · ADR-008/010 · finance.ts · docs/intake/gamification.md RESOLUTION -->

# Structure & Data — Gamification ("the System")  (level: Feature — incentive engine)

## Data model

### As-is (v2 — FACT, the floor) `[FACT: ADR-002 §5.15 L3361-3463; user.ts L38-92]`
- **`user_profile`** (singleton) — **OVERLOADED across 3 owners:** System (`total_xp`, `current_level`), Check-ins
  (`check_in_streak`, `longest_check_in_streak`, `last_check_in_date`), Preferences/Onboarding (`persona`,
  `life_stage`, `motivation_style`, `focus_areas[E]`, `display_name[E]`, `avatar_url[E]`, `birth_date[E]`, `timezone`,
  `onboarding_completed`, `skipped_modules`, `active_modules`). `[FACT: L3366-3396]`
- **`achievements`** — app-defined static: `key · category(9) · tier(bronze·silver·gold·platinum) · title ·
  description · icon · xp_reward · condition(JSON) · is_secret`. `[FACT: L3402-3419]`
- **`user_achievements`** — `achievement_id(FK,CASCADE) · earned_at · progress(JSON)`; `UNIQUE(achievement_id)`.
  `[FACT: L3425-3439]`
- **`xp_history`** — the XP ledger: `action_type · xp_amount(± allowed) · entity_type · entity_id · level_before ·
  level_after · earned_at`; index on `earned_at`. `[FACT: L3445-3463]`
- **Seam (decided):** feeders emit the **`award_xp`** effect (additive-write, `gamification.awardXp`, idempotent).
  `[FACT: ADR-004 §3.2.5 L83,L89]`

**The v2 model is schema-only, 0 service logic:** `total_xp`/`current_level` are stored counters nothing derives;
XP is additive-only (no penalties); no rules, no currencies, no boxes. `[FACT: grep clean packages/core/src/services]`

### Intended (the System reframe — ⚠ INTENDED → ADR-002 §5.20 + the capstone ADR) `[INTENT: RESOLUTION]`
- **`currencies`** (NEW) — user-definable resource-currency: `name[E] · backing_kind`{real-money, self-granted,
  measured-time}` · unit · icon · pool/to-distribute config`. The multi-currency spine. `[INTENT §B]`
- **consequence ledger** (generalize `xp_history` → `consequence_ledger`) — `currency_id · amount(±) · kind`{earn,
  lock,spend,distribute}` · entity_type · entity_id · effect_event_id(UNIQUE) · at`. The **4 quantities**
  (to-distribute/earned/locked/current) **DERIVE** from this per currency; XP = one currency. `[INTENT §B/GG2]`
- **rules** (NEW — a **headless automation primitive**, NOT an ADR-008 render-capability) — a rule = a **binding**
  (ADR-011 event-trigger/derived-pull condition) + **typed consequence effects** (grant_currency · lock_currency ·
  move_money · surface_notification, GM-2) + (for user-authored) the **ADR-010 permission envelope**. Reuses ADR-010's
  sandbox/grant machinery **without** being an ADR-008 Block (those are render-targeted). Exact table settles at build.
  `[INTENT §A; FACT: ADR-010 §3.1-3.3; ADR-008 §3.2 render-targets]`
- **`store`** (NEW — the Storage LAYER, **owned by Finance**) — `parent_id`(self-nest) · `node_kind`{group,wrapper} ·
  (wrapper) `ref_type`{account,investment,asset}`/ref_id` · `name[E] · is_locked · dream_id?/purpose_id? · currency
  overlay`. Existing Finance entities UNTOUCHED. A **domain structural hierarchy** (single-parent, like Projects
  `parent_milestone` / Tasks `parent_task_id`) — orthogonal to Spaces tag-grouping, not a competitor. `[INTENT §C;
  FACT: projects/tasks parent-FK precedent; core INT-1a]`
- **AMENDMENTS:**
  - `achievements` → `condition` becomes a **measurable predicate** evaluated on the ADR-011 seam + event stream (not
    a bespoke checker); user-authored achievements/challenges = capability (⚠ INTENDED). `[INTENT GG6/GG7]`
  - `user_profile` → **SPLIT** (GM-12): System keeps per-currency total + level; `check_in_streak*` → Check-ins;
    persona/modules/onboarding → Preferences; PII → account/profile. `[INTENT GG3]`
  - **level** → a derived value over a fixed non-linear **curve config** + titles (no new table). `[INTENT GG5]`
- **New effects on the ADR-004 rail — TYPED, each in its §3.2.5 class (NOT one umbrella):** **`grant_currency`**
  (additive-write; `award_xp` = its XP case) · **`lock_currency`** (keyed) · **`move_money`** (keyed, Finance-owned
  `finance.recordTransfer`) · **`surface_notification`** (projection). The consequence *engine* coordinates them; the
  rail keeps their idempotency classes distinct. `[INTENT §A/GG10; FACT: ADR-004 §3.2.5 taxonomy]`
- **RE-HOME:** the non-System columns leave `user_profile` (GM-12 — `check_in_streak*`→Check-ins, persona/modules→
  Preferences; **PII STAYS ⚠** until an account/identity model exists). **`award_xp` is NOT retired** — it stays the
  canonical **`grant_currency(XP)`** case, so the 9 feeders that emit it are unbroken; `grant_currency` generalizes it
  to other currencies. `[INTENT GG3]`

## Dependencies / graph (within the coupling budget — constitution §6)
- **Depends on (consumes, via seams — no direct table access):** every feeder's events via `award_xp`
  (= `grant_currency(XP)`) / other `grant_currency` (Habits · Tasks · Sessions · Routines · Check-ins · Skills · Pomodoro · Finance · Education ·
  Dreams) · **ADR-011 measurement-source seam** (Health weight/food-quality · Finance categories · time · engagement)
  · **Finance** (the Storage layer + transfers + boxes) · **Purposes/Dreams** (reward targets) · **Spaces**
  (currencies · challenges · user-rule personalization) · **capability model** (ADR-008/010 — user-authored rules) ·
  **Notifications** (`surface_notification`) · **Journals** (provider registry).
- **Depended on by:** **Notifications** (reads for "achievement unlocked" / "level-up" — the **only** in-edge) ·
  Journals (reads `summary(date)`). `[FACT: dep-graph in-degree 1]`
- **No cycle:** the System is a **peripheral observer** — it reads everything via seams and writes **only** its own
  ledger + fires consequences through other modules' guarded handlers (INT-2). Nothing core depends on it. `[FACT:
  dep-graph §5; core INT-2]`

## ADRs / structural decisions
- **CAPSTONE ADR — "Points Economy & Consequence Engine"** (to raise at Accept; sibling to ADR-011): multi-currency
  points (real-money · self-granted · measured-time) · nested Storage boxes · earn/lock/distribute ledger ·
  rule-bound reward/penalty/money-move/notify consequences on the ADR-004 rail · user-authored via capabilities.
  `[INTENT]`
- **ADR-004 (Session Framework)** — the ⚠ INTENDED typed effects (`grant_currency` additive · `lock_currency`/
  `move_money` keyed · `surface_notification` projection) join the §3.2.2 catalogue at build (each in its §3.2.5
  class); owed to the capstone ADR + §5.20, not yet in ADR-004's authoritative body. `[FACT: ADR-004 §3.2.5 taxonomy;
  INTENT: new effects]`
- **ADR-011 (Measurability)** — rules = bindings; conditions read the measurement-source seam. `[FACT: ADR-011]`
- **ADR-008/010 (Capability authoring)** — user-authored rules/achievements/currencies are capability defs under the
  declare→grant→enforce sandbox. `[FACT: ADR-008 §3.5; ADR-010]`
- **Finance Storage layer** — the `store` node is Finance-owned (a Commitments-style composition sub-context),
  consumed by the System. `[INTENT §C; FACT: Commitments FN-14 precedent]`
- **ADR-002 §5.20 amendment (build-phase)** — currencies · consequence_ledger · store · user_profile split · new
  effects join the owed ledger. `[INTENT §5.20]`

## Single source of truth (constitution §3)
- **Currency balances are DERIVED** from the consequence ledger — `total_xp`/`current_level` are caches, not truth
  (GM-4).
- **Money lives in Finance**; the Storage layer **wraps/organizes**, never copies balances (GM-9).
- **Streaks live in their modules** (Habits/Routines/Check-ins); the System reads (GM-11).
- **Consequences write via the owning module's guarded handler** (INT-2), never a direct cross-module table write
  (GM-2/GM-6).
- **Achievement conditions evaluate on the measurement seam** — the System caches no other module's state (GM-13).
- **The worth-tree is canonical single-parent**; any other grouping is **Spaces** (GM-9).

## Completion checklist
- [x] data model (as-is FACT floor vs INTENDED reframe) · [x] dep graph within budget (no cycle) · [x] ADRs (capstone + reused) · [x] single source per concern · [x] [FACT/INTENT] on every claim · [x] RETIRE/NEW/AMEND enumerated for §5.20
