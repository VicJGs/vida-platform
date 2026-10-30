# Intake — gamification  (level: 4 — Peripheral; exec #9)

> Fill order: exec #9, after the Purposes capstone. Gamification is a **read-everything observer at the periphery**:
> in-degree 1 (only Notifications reads it), out-degree ~10. Its intake seam is **already decided** — `award_xp` is an
> **ADR-004 §3.2.2 additive-write effect** on the §3.2.5 idempotency rail (handler `gamification.awardXp`), so "how it
> observes" is settled; the open gaps are DESIGN (the XP economy · the achievement engine · the overloaded
> `user_profile` · the Skills-overlap framing). `[FACT: ADR-004 §3.2.2/§3.2.5; module-dependency-graph §5]`

## Current (enforced reality — authoritative source)

**4 tables, all-P (structural), schema-only (0 service logic).** `[FACT: ADR-002 §5.15 L3361-3463; user.ts L38-92]`

- **`user_profile`** (singleton) — **OVERLOADED across 3 owners:** Gamification (`total_xp`, `current_level`), Check-ins
  (`check_in_streak`, `longest_check_in_streak`, `last_check_in_date`), Preferences/Onboarding (`persona`, `life_stage`,
  `motivation_style`, `focus_areas[E]`, `display_name[E]`, `avatar_url[E]`, `birth_date[E]`, `timezone`,
  `onboarding_completed`, `skipped_modules`, `active_modules`). `[FACT: ADR-002 L3366-3396]`
- **`achievements`** — app-defined **static content** (not user-generated): `key · category(9: onboarding·habits·
  learning·projects·financial·social·checkin·purpose·general) · tier(bronze·silver·gold·platinum) · title · description ·
  icon · xp_reward · condition(JSON trigger) · is_secret`. `[FACT: ADR-002 L3402-3419]`
- **`user_achievements`** — join `achievement_id(FK,CASCADE) · earned_at · progress(JSON partial)`; `UNIQUE(achievement_id)`.
  `[FACT: ADR-002 L3425-3439]`
- **`xp_history`** — the XP **ledger**: `action_type · xp_amount · entity_type · entity_id · level_before · level_after ·
  earned_at`; index on `earned_at`. `[FACT: ADR-002 L3445-3463]`
- **The seam (decided):** every feeder emits the **`award_xp`** effect (additive-write, deterministic `effect_event_id`,
  single write path `gamification.awardXp`); Gamification never polls. `[FACT: ADR-004 §3.2.5 L83,L89]`
- **Feeders (all ⚠ INTENDED, declared upstream):** Habits HB-9 · Routines RT-7/RT-13 · Check-ins CK-11 · Pomodoro
  PD-10 · Skills SK-10 · Tasks · Finance · Relationships · Education · Dreams(bucket). `[FACT: those docs; dep-graph §4]`
- **Constitution:** governed by **INT-2** (single write path) + **PC-3** (untrusted capability code guarded); no
  Gamification-specific invariant. `[FACT: core/business-rules INT-2 L61-67; PC-3 L87-93]`

**`total_xp`/`current_level` are stored counters** (`INTEGER DEFAULT 0`); `xp_history` is the ledger — nothing derives
one from the other today. `[FACT: ADR-002 L3378-3379, L3445]`

## Legacy (life-os v1 — the "desire", context only, never a decision)

v1 shipped a **rich, working** gamification UI under the `onboarding` feature — materially richer than the v2 floor.
`[FACT: ../life-os/src/features/onboarding/]`

- **Levels:** 10-level **non-linear** curve (0·100·300·600·1000·1500·2200·3000·4000·5500) with **titles** (Newcomer →
  Life OS Master); `getLevelForXp()` = pure function of total; progress % to next; level-up modal. `[FACT: levelConfig.ts
  L18-99; useXpAward.ts L29-41]`
- **Achievements:** **~60** across the 9 categories × 4 tiers with **XP bands** (bronze 10-20 · silver 30-75 · gold
  75-150 · platinum 200-250). `[FACT: achievementDefinitions.ts L29-925]`
- **Achievement conditions — 22+ criterion types** in the `condition`/`criteria` JSON: `count` (row counts w/ filters) ·
  `*_streak` (habit·study·checkin·active_days·field-streak) · `study_hours`/`focus_minutes` · `perfect_habit_week` ·
  `xp_milestone`/`level_reached` (derived) · `page_visit`/`feature_used` · `modules_setup`/`persona_count` ·
  `onboarding_no_skips`. `[FACT: achievementDefinitions.ts; useAchievementChecker.ts L12-302]`
- **Evaluation:** **event-driven fire-and-forget** — post-action, a category checker examines a context snapshot and
  grants met criteria; **silent-fail** on already-unlocked; a **retroactive scan** on page-mount catches backfills.
  `[FACT: useAchievementChecker.ts; AchievementsPage.tsx L52-65]`
- **XP:** 6 action types (`habit_completion · task_completion · task_completion_high_priority · study_session ·
  project_action · daily_checkin`), variable reward + **bonus multiplier**; total was a **stored counter** computed
  server-side. `[FACT: xpApi.ts L8-65]`
- **Persona system:** 3 personas × per-module **weights** (1-10) + MAX-merge for multi-persona + **template suggestions**
  (27 modules × personas) — this drove **onboarding guidance**, NOT XP. `[FACT: personaConfig.ts L13-328]`
- **UX:** unlock toasts (tier-colored, countdown), level-up modal, category-collapsible AchievementsPage, notification
  queue. `[FACT: components/achievements/*]`

## Existing docs incorporated
- **award_xp is an ADR-004 effect** (additive-write, on the §3.2.5 rail) — the seam is NOT re-decided here. `[FACT: ADR-004]`
- **Feeders already declare** their emit (Habits HB-9 · Routines RT-13 · Check-ins CK-11 · Pomodoro PD-10 · Skills
  SK-10 · etc.) — reference, don't re-specify. `[FACT: those docs]`
- **Streaks are module-owned** (Habits cached · Routines policy-derived · Check-ins) — Gamification READS them. `[FACT:
  HB-2, RT-7/RT-14, CK-11]`
- **ADR-011 (measurability)** just shipped a measurement-source READ seam + normalized measures — a candidate substrate
  for evaluating achievement conditions (predicates over measured state). `[FACT: ADR-011 §3.6]`
- **Skills SK-10** calls skills "the OS's real leveling game" — a framing overlap to resolve. `[FACT: skills/business-rules SK-10]`

## GAP MAP (what the code cannot answer — for Victor, ONE batch)  → GG1 + economy + Storage RESOLVED 2026-07-19; see **RESOLUTION** at end (authoritative).

`[likely …]` = my grounded read, needs your yes/no; the rest need your intent. The seam is decided, so these are DESIGN gaps.

- [ ] **GG1 — Identity / centrality + the Skills overlap (the FRAMING gap — sets the ceiling).** How central is Gamification,
      and how does it relate to **Skills** (SK-10: "the OS's real leveling game")? Is Gamification a **light meta-reward
      layer** (XP · levels · badges over the *whole* OS) sitting ABOVE domain-specific progression like Skills — or one
      unified leveling game? It's already **opt-in** (`preferences.feature_gamification`). Your framing here sets GG4–GG7.
- [ ] **GG2 — XP derived vs stored `[likely: DERIVED]`.** `total_xp`/`current_level` are stored counters; `xp_history` is
      the ledger. Per the house rule (SS-12 / ADR-011 derive-default), should `total_xp` = **derived from the `xp_history`
      ledger** (column = cache) and `current_level` = a **pure function of total_xp** (v1 `getLevelForXp`)? Matches the
      measurability work just shipped.
- [ ] **GG3 — Split the overloaded `user_profile` `[likely: SPLIT, single-writer-per-field]`.** Today it mixes Gamification +
      Check-ins + Preferences/Onboarding + PII. Split so **Gamification owns only XP/level state**; `check_in_streak*` →
      Check-ins; `persona`/`motivation_style`/modules/`onboarding_completed` → Preferences/Onboarding; PII (`display_name`/
      `avatar_url`/`birth_date`) → an account/profile entity? (Single-writer-per-field, like the ADR-011 cleanup.)
- [ ] **GG4 — XP economy: fixed app-table vs user-tunable; difficulty-weighted?** Is XP-per-action a **fixed app-config
      table** (v1 `xp_action_rewards`) or **user-tunable**? Difficulty/priority-scaled (Tasks-by-difficulty, v1's
      high-priority bonus + multiplier)? `[likely: app-default table + difficulty weighting for v1; user-tuning = INTENDED
      via extension-model]`.
- [ ] **GG5 — Leveling curve.** Keep v1's **fixed non-linear** 10-level curve + titles? Configurable/persona-scaled? And
      does leveling **DO** anything (unlocks/rewards) or is it status only? `[likely: fixed non-linear curve + titles for
      v1; level-unlocks = INTENDED-later]`.
- [ ] **GG6 — Achievement engine: how are conditions evaluated? (the MECHANISM gap + measurability reuse).** An achievement
      `condition` is a **predicate over measured state** (streak ≥ 30 · count ≥ 100 · `xp_milestone` · `level_reached` ·
      `net_worth ≥ X`). Should the engine evaluate via the **ADR-011 measurement-source READ seam** (pull) + the
      `award_xp`/effect **event stream** (push) — reusing the just-built measurability contract — rather than v1's bespoke
      per-category checkers? And event-driven (on effects) + a reconcile/retroactive pass? `[likely: yes — conditions =
      measurable predicates on the ADR-011 seam + event triggers; big reuse]`.
- [ ] **GG7 — Achievements: app-curated vs user-authored.** v2 marks them "app-defined static." Should users be able to
      author their own **achievements / challenges / quests** (via the Spaces capability/extension-model, PC-3)? `[likely:
      app-curated catalogue for v1; user-authored = INTENDED-later via the capability model]`.
- [ ] **GG8 — Streaks: confirm Gamification owns NONE `[likely CONFIRM]`.** Habits/Routines/Check-ins own their streaks;
      Gamification **reads** them and awards milestone XP. Confirm — and confirm `check_in_streak*` moves OUT of
      `user_profile` → Check-ins (part of GG3).
- [ ] **GG9 — Persona / onboarding guidance — whose job?** v1's persona weighting + module-guidance + template-suggestions
      drove **onboarding**, not XP. `[likely: that belongs to Onboarding/Preferences + Spaces templates, NOT Gamification;
      Gamification at most reads persona for reward framing]`. Confirm the boundary.
- [ ] **GG10 — Provider registration + Notifications `[likely CONFIRM]`.** Gamification **registers `summary(date)`** for
      Journals (XP earned today · achievements unlocked · level-ups) and **emits Notifications** on unlock/level-up (its
      one in-edge). Confirm it follows the established registry seam + fires the Notifications effect.
- [ ] **GG11 — Quests / time-boxed challenges?** Beyond passive achievements, are there **daily/weekly challenges or
      quests** (motivation vectors)? Or is that INTENDED-later / a **Space** (a saved challenge view, like Bucket List)?
      `[maybe — flag INTENDED / possible Space]`.

### Not-blocking (recorded, resolved during Transform unless you flag)
- Terminal states per capability (loading/empty/error/success) — enumerated in the contract.
- The consolidated **ADR-002 amendment** slice (derive `total_xp`, split `user_profile`, any new tables) folds into §5.20.
- Any surfaced decision (achievement-engine-on-measurability, user-authored achievements) → `/adr-new` at Accept.

## RESOLUTION — GG1 + the System model (2026-07-19, Victor · exec #9)

Gamification is NOT a light badge layer — it is **"the System"**: a personalizable **behavioral incentive & consequence
engine** (manhwa/novel "level up real life"). Its job — make **organization · the pleasure of hard work · earned reward**
legible and felt: the scaffolding Victor (and underaged / life-turnaround users) never had. **Partner to the Purposes
capstone** — Purposes = *meaning/direction*; the System = *motivation/consequence*. Optional-but-transformative; opt-in
(`feature_gamification`). Authoritative over the per-gap `[likely]` notes above.

### A. Rule → Consequence engine
- The user defines **rules**: `IF [measured condition] THEN [consequence]` — a rule = an **ADR-011 binding**
  (`event-trigger` on a state change · `derived-pull` predicate over a measurement-source) + the acyclic DAG guard.
- **Consequences** ride the **ADR-004 §3.2.5 effect rail** (idempotent · single write path · no double-count) — a new
  **`apply_consequence`** family: **reward** (+currency · move money → box · unlock) and **penalty** (**LOCK**
  currency/money → a locked box — held, **not destroyed**, recoverable).
- Rules are **user-authored** via the capability model (ADR-008/010 — sandboxed, declare→grant→enforce, explicit
  Finance/Health consent).

### B. The economy = MULTI-CURRENCY (the inclusivity core) `[Victor 2026-07-19]`
- **Points generalize to many resource-currencies running SIMULTANEOUSLY.** A reward/penalty is denominated in any of them.
- **Backing kinds** — the key design, because it must work WITHOUT money:
  - **`real-money`** — backed by **Storage/Finance** (real money in the user's own ledger).
  - **`self-granted allowance`** — the user defines the pool; **no external backing, no wealth required**: **vacation
    days · food-freedom / cheat days · fun / gaming time** + extensible. The reward is the user's own **time · leisure ·
    freedom** — the great equalizer (Premack principle). *Easiest to build — no Finance dependency; the OS tracks the
    balance the user honors in life.*
  - **`measured-time`** — actual time (sessions · `task_time_logs`).
- Per currency, **4 DERIVED quantities** (not stored): **to-distribute** (the pool the user commits — the layer grows
  with it) · **earned** · **locked** (penalties held) · **current**. Generalized **`xp_history`** = the multi-currency
  ledger (XP = one currency). Currencies are **user-definable** (personalization → capability/Spaces).

### C. Storage = the boxes — a composition LAYER, not a rewrite `[Victor 2026-07-18/19]`
- A nestable **`store`** node — **group** (folder) OR **wrapper** (→ existing `account` · `investment` · `asset`).
  `parent_id` nesting · `is_locked` · `dream_id?`/`purpose_id?` link · currency/points overlay.
- **Existing Finance entities UNTOUCHED** (no rename, no supertype) — composition, per the OS pattern (Commitments-layer ·
  Spaces). Considered + REJECTED: rename `accounts`→supertype (B-flat = the ADR-004-rejected god-table; B-supertype
  heavier than needed). Layer chosen.
- **Canonical single-parent worth-tree** (each value-holder wrapped once → no double-count); **Spaces** does any other
  grouping. Value = fractal tree-walk (ADR-011); **net worth = store tree − liabilities**.
- **Owned by Finance; consumed by the System** for money-backing. Rewards route money into a box → fund **Dreams**
  (`estimated_cost`) → Purposes laddering.

### D. Behavioral signals the System reacts to (via the ADR-011 measurement-source seam)
- **Exist:** Health (body-weight · food-quality via `functional_area`/`whole_food_type`) · Finance (categories) · time
  (sessions/`task_time_logs`) · engagement (`xp_history`/`command_bar_history`).
- **Net-new larger (roadmapped):** Finance **budgeting** (FN-13 — the "wasted money" signal) · **cross-device
  screen-time/app/entertainment** tracking (the "close to infinity" frontier — an **EX-2** opt-in, on-device, ZK
  external integration).

### Resolved smaller gaps (directions — pending a quick confirm)
- **GG2** points & level **DERIVED** from the ledger (column = cache); level = pure fn of a currency total.
- **GG3** SPLIT the overloaded `user_profile` — System owns XP/level state only; check-in streak → Check-ins;
  persona/modules/onboarding → Preferences; PII → account/profile.
- **GG5** leveling curve = v1's fixed non-linear + titles (per currency where it applies); level-unlocks INTENDED.
- **GG8** streaks stay **module-owned** (Habits/Routines/Check-ins); the System READS them, owns no streak compute.
- **GG9** persona/onboarding guidance = Preferences/Onboarding + Spaces templates, NOT the System.
- **GG10** the System registers `summary(date)` (Journals) + emits **Notifications** (via a new `surface_notification`
  effect).
- **GG11** quests / time-boxed challenges = a **Space** (saved challenge view) or INTENDED-later.

### Surfaced ADR (raise at Accept)
**"Points Economy & Consequence Engine"** (capstone-scale, sibling to ADR-011): nested Storage boxes · **multi-currency**
points (real-money · self-granted allowance · measured-time) · earn/lock/distribute ledger · rule-bound
reward/penalty/money-move/notify consequences on the ADR-004 rail · real-money via Finance · user-authored via
capabilities.

### Chassis vs net-new
- **Chassis (exists):** ADR-004 effect rail · ADR-011 bindings · capability authoring (008/010) · Finance transfers ·
  Dreams · Notifications table · Health/time measurement · `xp_history` ledger.
- **Net-new small:** Storage layer node · multi-currency abstraction · `apply_consequence`/lock/penalty +
  `surface_notification` effects · self-granted-allowance currencies · box↔Dream link.
- **Net-new larger (roadmapped):** Finance budgeting (FN-13) · EX-2 external tracking · measurement-source registry runtime.

### Sequencing note
No longer a "peripheral light layer" — a **foundational integrative engine**. It still observes/depends on Finance ·
Health · measurement · Purposes, so it stays late in fill order, but it is **foundational within its own realm** (the
economy the OS's motivation stands on).

---
**STATUS: WHOLE 2026-07-19** — all gaps resolved (GG1–GG11 + the multi-currency economy + Storage layer). GG2/3/5/8/9/
10/11 confirmed by Victor (all-yes). Ready for **Step 2 (Transform)**.
