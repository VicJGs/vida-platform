# Re-run PLAN — check-ins (Part 1.2, Tier-2 · the lone non-ingest unit)

**Type:** doc-realignment unit PLAN (LITE gate — §XXVI LITE variant; non-code scenario).
**Status:** 🟢 CRITIQUE-CLEAN — independent adversarial critic (fresh code-aware subagent, prompted to refute) → **SHIP / 0 blocking** (9th consecutive clean unit); all three rulings **CORRECT**: the **E9 reframe** (schema `check_in_streak*:1183-1185` verified live; E9 predicate L177 verbatim; the CK-11 "owned there" correction is a refinement — streak=check-ins', reward=Gamification's — not a contradiction), the **E2/`award_xp` layering** (`grant_currency`=E2 general, `award_xp`=XP case; "no S4" verified — check-ins absent from the session applies-to L234; the inverse of the habits B1), and the **SP1 reconciliation** (no inline tag column verified; SP1 requires `entity_tags` only *if* tagged → opt-out is not a violation; SP4 correctly cited). **1 note folded (N1):** the structure-data As-is floor note acknowledges the co-located `persona`/`active_modules`/`onboarding_*` siblings so the `user_profile` split reads as a real multi-owner decomposition. **Awaiting Victor LITE-gate approval → implement.**
**Date:** 2026-07-24 · **Session:** build-roadmap-resequence (foundation-realignment campaign, Part 1.2).
**Context:** `docs/features/check-ins/` (5 aspect files: identity, structure-data, business-rules, contract, conventions).
**Verdict (sweep):** **gap** (row 15) — drivers **012, 006**. *("No anti-signal; as an economy feeder never names `grant_currency` (E2); as E9 `check_in_streak*` owner, silent on the `user_profile` split. 'NO tags' assertion to reconcile with SP1.")*
**Grounded in:** `staleness-sweep.md` (row 15 + Tier-2 order), `capability-framework.md` §3 ADR-012 (E2/E3/E9) / ADR-006 (SP1/SP4) + §4 applies-to (feeder L242 **names Check-ins**; E9 owner L243/L177 **names Check-ins**; pursuable L240, ingest L245, AI L246, S1 L234 do **NOT**) + §5, **all 5** current aspect docs, **and the live schema** (`daily_check_ins:1100`, `check_in_templates:1116`, `check_in_template_questions:1129`, `user_profile:1171`; grepped this session).
**No-Guessing:** every forward token below is one the framework/ADR actually names (cited); no invented tokens. **One live-FACT reframe** — the E9 split: `user_profile.check_in_streak`/`longest_check_in_streak`/`last_check_in_date` (`schema.ts:1183-1185`) are live FACTs check-ins owns → R6 two-tier. **No inline tags column** (grep-confirmed — the "NO tags" assertion is real), no `xp_history`/`page_tags` in the check-ins docs → the E2/SP1 work is additive/reconciling. Code/directory homes + the ADR-002 amendment (CK-2 UNIQUE fix, CK-3 type expansion, CK-6 review contract) + the `user_profile`/`consequence_ledger` DDL are `[DEFERRED — Part 2 / build phase]`.

---

## §1. Context — why this re-run, and the true shape

Check-ins is a **structured daily-reflection** module — template-driven morning/afternoon/evening check-ins + weekly/monthly/yearly reviews, all `[E]`, local-first. It owns 3 live tables (`daily_check_ins`, `check_in_templates`, `check_in_template_questions`) and is a **Wave-1 independent domain**. Its docs are well-formed (CK-1…CK-12) and clean of ingest/AI/measurement — it is **the lone non-ingest Tier-2 unit**.

**The sweep's `gap` is precise** — three narrow driver points, all in the **economy + tags** family (the muscles habits/tasks/pomodoro already exercised):

| Cap | Framework token (owning ADR) | Present today? | Fix shape |
|---|---|---|---|
| **E9 (012)** `user_profile` single-writer split | Check-ins owns **`check_in_streak*`**; Preferences owns `persona`/`active_modules`/`onboarding_*`; `user_profile` keeps derived per-currency total+level + PII only. Anti-signal: `user_profile` still writing `check_in_streak*` | **WRONG-MODEL (live FACT)** — `user_profile.check_in_streak`/`longest_check_in_streak`/`last_check_in_date` (`schema.ts:1183-1185`); the docs are silent on ownership, and CK-11/identity L35 say streaks are "owned there [Gamification]" (conflates the streak with its reward) | **reframe in `[INTENT]`** → **check-ins owns `check_in_streak*`** (derived from `daily_check_ins`), off the overloaded `user_profile`; correct "owned there" → the *streak* is check-ins', the *XP reward* is Gamification's. R6 two-tier |
| **E2 (012)** `grant_currency` feeder | a feeder names **`grant_currency(XP)`** (`award_xp` = its XP case, NOT retired); Check-ins **is a named feeder** (L242) | **GAP** — CK-11/identity L35/contract L39 say "streaks + completion emit XP/achievement events; Gamification owns the reward" but name no `grant_currency` | **gap-add** — name `grant_currency(XP)` as the feeder effect on completion/streak; check-ins **emits the event**, Gamification applies the grant → `consequence_ledger` (E3); check-ins never writes XP |
| **SP1/SP4 (006)** tags vs links | `entity_tags` is the universal tag primitive; `entity_links` (typed reference) is **distinct** (SP4, never merged) | **ASSERTION TO RECONCILE** — CK-9 "No tags", identity L34, structure-data L27, conventions L24/L40 assert check-ins is untagged; no inline tag column | **reconcile (aligned)** — the "NO tags" stance is **SP1-consistent** (no bespoke/inline tag store — exactly what SP1 requires); frame it as a **deliberate opt-out from `entity_tags`** (design choice: links not tags), using `entity_links` (SP4, tags≠links). No functional change — name the tokens so the assertion is SP1-grounded |

**Fix shape:** the **lightest Tier-2 unit** — **one live-FACT E9 reframe** (R6 two-tier) + **one E2 gap-add** + **one SP1/SP4 reconciliation**. **No M1/M2** (check-ins is not pursuable — mood/energy/streak are analytics, not measurables), **no X*/AI*** (no ingest/model), **no S1** (a check-in is a form entry, not a timed session). Same economy family as habits/tasks/pomodoro — the E2/E3/`award_xp` layering trap is the one to pre-empt.

---

## §2. What changes — E9 reframe + E2 gap-add + SP1 reconciliation + guards

### Primary A — the E9 `user_profile` split (driver 012; live-FACT R6 reframe)

| # | Cap | Retire (As-is FACT floor) → add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-E9 | **`user_profile.check_in_streak*` → check-ins-owned** | As-is FACT: `user_profile.check_in_streak`/`longest_check_in_streak`/`last_check_in_date` (`schema.ts:1183-1185`). `[INTENT]`: **check-ins owns `check_in_streak*`** (the E9 split) — derived from `daily_check_ins` (consecutive-day analytic); the overloaded `user_profile` **stops writing** them (keeps only derived per-currency total+level + PII). Correct the "streaks owned there [Gamification]" framing → the **streak** is check-ins', the **XP reward** on it is Gamification's | ADR-012 §3.10/§5 (E9) | identity (L35) · business-rules (CK-11) · structure-data (ownership) · contract (Consumed-by Gamification) |

### Primary B — E2 feeder naming (driver 012; gap-add, no floor)

| # | Cap | Forward tokens to add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-E2 | **`grant_currency(XP)` feeder** | name the completion/streak's feeder effect **`grant_currency(XP)`** (E2) — `award_xp` is its XP case (NOT retired, NOT the general mechanism); check-ins **emits the event**, Gamification **applies** the grant → **`consequence_ledger`** (E3); check-ins never writes XP itself (E1/E2 layering) | ADR-012 §3.2/§3.3/§5 (E2/E3) | identity (L35) · business-rules (CK-11) · contract (L39) · conventions |

### Primary C — SP1/SP4 reconciliation (driver 006; aligned, name the tokens)

| # | Cap | Reconcile → (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-SP1 | **the "NO tags" stance is SP1-consistent (opt-out)** | frame CK-9's "No tags" in framework terms: check-ins has **no inline/bespoke tag store** (SP1-satisfied — that's the SP1 requirement) and **deliberately opts out of the universal `entity_tags`** (design choice: links not tags); its relationships ride **`entity_links`** (SP4 — tags≠links, distinct primitives). No functional change | ADR-006 §3.2/§3.3 (SP1/SP4) | identity (L34) · business-rules (CK-9) · structure-data (L27) · conventions (L24/L40) |

### Secondary — guards surfaced by grounding (flag, don't silently skip)

| # | Finding | Fix | Cite | Scope guard |
|---|---|---|---|---|
| C-E1/E3 | **`user_profile.total_xp`/`current_level` are Gamification's, NOT check-ins'.** The E9 predicate keeps them on `user_profile` but **derived** (Gamification's E1/E3 job — stored-XP-as-truth is Gamification's anti-signal, already reframed→aligned per sweep row 16). | **Do NOT re-spec `total_xp`/`current_level`.** Check-ins owns ONLY `check_in_streak*` (E9). Cite Gamification for the currency/ledger; check-ins reads derived, never writes XP. | framework §3 E1/E3/E9; sweep row 16 | **scope guard** — the E9 split is per-owner; check-ins takes only its slice |
| C-LAYER | **The E2/`award_xp` layering trap** (bit habits/finance B1). | Name `grant_currency` as the ADR-012 **E2 general** effect; `award_xp` = its XP case (NOT the general mechanism, NOT retired). Check-ins is not a session → **no S4 catalogue** (the grant rides the check-in-completion *event*, not a session sub-type effect). | framework §3 E2 (anti-signal); ADR-004 (no S1 here) | **scope guard** — pre-empt the layering; no S4 |
| C-M | **No M1/M2** — check-ins is not pursuable (absent from L240); mood/energy/streak are analytics. | **Do NOT add `measurement_kind`/`binding_mode`.** The streak is a derived analytic (like habits' streak cache), not a measured target. | framework §4 L240 | **scope guard** — don't manufacture measurability |
| C-XAI | **No X*/AI*/S1** — check-ins ingests nothing, touches no model, is not a timed session (absent from L234/L245/L246). | **Do NOT add X*/AI*/S1 tokens.** (Scheduling/reminders ride Preferences + Notifications, CK-8, aligned — not a driver.) | framework §4 L234/L245/L246 | **scope guard** — don't manufacture ingest/AI/session contracts |
| C-FIX | **CK-2 (UNIQUE bug fix), CK-3 (type expansion), CK-6 (review contract) are the doc's own intended fixes, NOT driver tokens.** | **Leave as-is** — these are ADR-002-amendment / build-phase items, unrelated to 012/006; don't touch. | business-rules ⚠ delta | **scope guard** — no scope creep into the module's own backlog |

**Disclosed calls (critic VERIFIES, not catches):**
1. **E9 corrects a doc claim** — CK-11/identity L35 say check-in streaks are "owned there [Gamification]"; E9 says the **streak** is check-ins-owned (only the XP reward is Gamification's). The reframe splits the conflation; verify it doesn't contradict CK-11's intent (it refines it — Gamification still owns the *reward*).
2. **SP1 is a reconciliation, not a change** — the "NO tags" stance is already SP1-aligned; this just names the tokens (opt-out from `entity_tags`, uses `entity_links` per SP4). Verify it's not manufacturing a tag capability the doc rejects.

**Scope guards (do NOT over-apply):**
- **R6 two-tier applies to ONE token** — `user_profile.check_in_streak*` (live FACT) → recorded in As-is floor, reframed to check-ins-owned in `[INTENT]`. E2 (grant_currency) is a `[INTENT]` gap-add (no floor — no `xp_history` in check-ins docs); SP1 is a reconciliation (no change).
- **Conceptual home + owning ADR only.** Every token (`grant_currency`, `consequence_ledger`, `check_in_streak*` ownership, `entity_tags`/`entity_links`) is cited to its ADR; the physical `user_profile`/`consequence_ledger` DDL is `[DEFERRED — Part 2]`.
- **Cite-not-re-spec the owned substrates.** `grant_currency`/`consequence_ledger`/`currencies`/`total_xp`(derived) are **Gamification-owned**; `entity_tags`/`entity_links` are **Spaces/Notes-owned**; reminders are **Preferences/Notifications-owned**. Check-ins names only its E9 slice (`check_in_streak*`) + the feeder effect it emits.
- **No M1/M2** (C-M), **no X*/AI*/S1** (C-XAI), **no S4 catalogue** (C-LAYER), **no touching `total_xp`/`current_level`** (C-E1/E3), **no scope creep into CK-2/CK-3/CK-6** (C-FIX). **No schema-level reconciliation** — the ADR-002 amendment → build phase (ADR-016).

---

## §3. Per-aspect edit map (all 5 aspects touched)

**`identity.md`**
- **G-E9/G-E2** — L35 ("Not the Gamification owner. Check-in streaks feed XP/achievements (⚠ INTENDED), owned there"): split the conflation — the **streak** is check-ins-owned (`check_in_streak*`, E9); the completion/streak emits **`grant_currency(XP)`** (E2) that Gamification applies → `consequence_ledger` (E3); check-ins never writes XP. `[INTENT G9; ADR-012 E2/E9]`
- **G-SP1** — L34 ("Not tagged. Check-ins use links, not tags"): the "no tags" stance is SP1-consistent (no bespoke tag store) — a deliberate opt-out from `entity_tags`; relationships ride `entity_links` (SP4, tags≠links). `[INTENT G10; ADR-006 SP1/SP4]`

**`structure-data.md`**
- **G-E9** — the ownership/dep section (L43-48, in-edge Gamification): note check-ins **owns `check_in_streak*`/`last_check_in_date`** (the E9 `user_profile` split — derived from `daily_check_ins`, not written onto the overloaded `user_profile`); `user_profile` keeps only derived total+level + PII. As-is FACT floor: `user_profile.check_in_streak*` (`schema.ts:1183-1185`) **sits on the same overloaded row as Gamification's `total_xp`/`current_level` (`:1181-1182`) and Preferences' `persona`/`active_modules`/`onboarding_*` (`:1173/1188-1189`, `:1186`) — the E9 split is a real 3-owner decomposition (N1)**. `[INTENT; ADR-012 E9]`
- **G-SP1** — L27 ("NO tags"): SP1-consistent (no inline tag column) + deliberate opt-out from `entity_tags`; uses `entity_links` (SP4). `[INTENT G10; ADR-006 SP1/SP4]`
- **Named-ADR set** — extend the ADRs block (L57-60) → +012/006. `[INTENT]`

**`business-rules.md`**
- **G-E9/G-E2** — CK-11 (L40-41, "streaks + completion emit XP/achievement events; Gamification owns the reward"): the **streak** is check-ins-owned (`check_in_streak*`, E9 split — derived from `daily_check_ins`); the completion/streak emits **`grant_currency(XP)`** (E2 — `award_xp` = its XP case, not the general mechanism) which Gamification applies → `consequence_ledger` (E3); check-ins never writes XP. **No S4** (not a session). `[INTENT G9; ADR-012 E2/E3/E9]`
- **G-SP1** — CK-9 (L37, "No tags. Check-ins use links, not a tag vocabulary"): keep the stance; frame it SP1-consistent (no bespoke tag store) — a deliberate opt-out from `entity_tags`; `entity_links` (SP4) is the distinct primitive it uses. `[INTENT G10; ADR-006 SP1/SP4]`
- ⚠ Flagged-delta (L70-78): add the E9 reframe + E2 naming; the CK-2/CK-3/CK-6 fixes stay the module's own amendment items (C-FIX, untouched).

**`contract.md`**
- **G-E9/G-E2** — Consumed-by Gamification (L39, "streak/completion events"): the **streak** is check-ins-owned (E9); the events carry the **`grant_currency(XP)`** feeder effect (E2) Gamification applies → `consequence_ledger` (E3). `[INTENT G9; ADR-012 E2/E9]`
- **C-E1/E3 guard** — `total_xp`/`current_level` on `user_profile` are Gamification's (derived, E1/E3) — check-ins cites, does not re-spec. `[guard]`

**`conventions.md`**
- **G-E2** — new build rule: on check-in completion, **emit** `grant_currency(XP)` (E2) → Gamification applies → `consequence_ledger` (E3); **never write XP or `check_in_streak*` onto `user_profile`** from check-ins (E9 — check-ins owns its streak derived from `daily_check_ins`). `[INTENT; ADR-012 E2/E3/E9]`
- **G-SP1** — L24/L40 ("Links, not tags" / "Never add a tag vocabulary"): keep the landmine; frame it SP1-consistent — a deliberate opt-out from `entity_tags`, using `entity_links` (SP4). `[INTENT G10; ADR-006 SP1/SP4]`

---

## §4. Acceptance (the definition-of-aligned §5 lines this unit must pass)

- [ ] **E9** — check-ins named the owner of `check_in_streak*`/`last_check_in_date` (the `user_profile` split; derived from `daily_check_ins`); As-is FACT floor (`user_profile.check_in_streak*`, live `schema.ts:1183-1185`) kept; the "streaks owned there [Gamification]" conflation corrected (streak = check-ins', reward = Gamification's).
- [ ] **E2** — `grant_currency(XP)` named as the feeder effect on completion/streak (`award_xp` = its XP case, not retired, not the general mechanism); check-ins emits, Gamification applies → `consequence_ledger` (E3); check-ins never writes XP.
- [ ] **SP1/SP4** — the "NO tags" stance framed SP1-consistent (no bespoke tag store) + a deliberate opt-out from `entity_tags`; `entity_links` (SP4, tags≠links) named as the primitive it uses.
- [ ] **C-E1/E3 guard** — `total_xp`/`current_level` left Gamification-owned (derived); not re-spec'd.
- [ ] **C-LAYER guard** — `grant_currency` = E2 general, `award_xp` = its XP case; **no S4 catalogue** (check-ins is not a session).
- [ ] **C-M guard** — **no M1/M2** (check-ins not pursuable; streak = analytic).
- [ ] **C-XAI guard** — **no X*/AI*/S1** tokens (no ingest/model/session).
- [ ] **C-FIX guard** — CK-2/CK-3/CK-6 (the module's own amendment items) left untouched.
- [ ] **Boundary rule** — every code/directory home + the `user_profile`/`consequence_ledger` DDL + the ADR-002 amendment is `[DEFERRED — Part 2 / build]`; only conceptual ADR homes asserted (Gamification owns the ledger/currency; Preferences owns persona/onboarding; Spaces/Notes own tags/links).
- [ ] **R6** — the As-is (live FACT floor: `user_profile.check_in_streak*`) / `[INTENT]` (check-ins-owned) split intact; named-ADR set extended to +012/006.
- [ ] **No new anti-signal**; **no structural call made**; no schema-level reconciliation attempted.
- [ ] **No contradiction** with any ADR 001–017 nor neighbors (Gamification owns `grant_currency`/`consequence_ledger`/`currencies`/derived `total_xp`; Preferences owns `persona`/`active_modules`/`onboarding_*`; the Journal owns the day page check-ins link to).

---

## §5. Out of scope (explicit)

- **The economy substrate** — `grant_currency`, `consequence_ledger`, `currencies`, `total_xp`(derived)/`current_level` are **Gamification-owned** (reframed→aligned, sweep row 16); this unit names the feeder effect + its E9 slice, does not re-spec ADR-012.
- **The Preferences slice of the `user_profile` split** — `persona`/`life_stage`/`active_modules`/`onboarding_*` are **Preferences-owned** (E9); check-ins takes only `check_in_streak*`.
- **The module's own amendment items** — CK-2 UNIQUE(`check_in_date`,`check_in_type`) fix, CK-3 type expansion, CK-6 review→Purpose/Projects/Tasks aggregation contract — build-phase / cross-module contract, unrelated to 012/006.
- **Reminders/scheduling** — Preferences + Notifications-owned (CK-8, aligned); untouched.
- **The Journal integration** — the day-page link via `entity_links` (CK-7) is Notes/Journal-owned; check-ins cites it (SP4 confirms links≠tags).
- **Measurability / ingest / AI / sessions** — not applicable to check-ins (not in the M1/X/AI/S1 applies-to sets).
- **Code/directory homes + schema reconciliation** — final DDL, the ADR-002 amendment → build phase (ADR-016).

---

## Change Log
| Date | Change |
|------|--------|
| 2026-07-24 | Initial PLAN drafted from the ground read (sweep row 15 + framework §3 ADR-012 E2/E3/E9 / ADR-006 SP1/SP4 + §4 applies-to [feeder L242 + E9 owner L243/L177 name Check-ins; pursuable L240 / ingest L245 / AI L246 / S1 L234 do NOT] + §5, all 5 aspect docs, and the live schema — `daily_check_ins:1100` [no inline tags], `check_in_templates:1116`, `check_in_template_questions:1129`, `user_profile:1171` [`check_in_streak*`:1183-1185]). **The lightest Tier-2 unit — the lone non-ingest.** One live-FACT E9 reframe (`user_profile.check_in_streak*`→check-ins-owned, derived from `daily_check_ins`; correct the "streaks owned there [Gamification]" conflation — streak is check-ins', reward is Gamification's) + one E2 gap-add (name `grant_currency(XP)` on completion/streak; `award_xp`=XP case; check-ins emits, Gamification grants→`consequence_ledger` E3) + one SP1/SP4 reconciliation (the "NO tags" stance is SP1-consistent — no bespoke tag store — a deliberate opt-out from `entity_tags`, using `entity_links` per SP4). No M1/M2 (not pursuable), no X*/AI*/S1 (no ingest/model/session), no S4 (not a session). Guards: C-E1/E3 `total_xp`/`current_level` Gamification-owned (don't re-spec), C-LAYER pre-empt the E2/`award_xp` layering, C-M/C-XAI no measurability/ingest/AI/session, C-FIX CK-2/CK-3/CK-6 are the module's own amendment items (untouched). Presented for the LITE gate. |
