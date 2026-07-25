# Re-run PLAN — habits (Part 1.2, Tier 1)

**Type:** doc-realignment unit PLAN (LITE gate — §XXVI LITE variant; non-code scenario).
**Status:** ✅ IMPLEMENTED (2026-07-24) — LITE gate passed (critique **REVISE→fixed→clean** → Victor approved); edits landed across **all 5** aspect docs; §4 acceptance verified mechanically (grep): `purpose_habits`→`contributions` (M7) with every mention carrying retire/As-is context, zero forward stale token; `page_tags`/inline `habits.tags`→`entity_tags` (SP1); `xp_history`→`consequence_ledger` (E3) with zero forward `xp_history`; `grant_currency(XP)` feeder (E2) + `award_xp` S4 slot; `measurement_kind`/`binding_mode` on the habit (M1/M2, new HB-13); S4 `contribute_purpose_metric`/`award_xp` + R1 rail; `streak(habit)` M5 seam. Guards held: `project_habits` KEPT (C1), inline `habits.tags` recorded as As-is (C2), streak cache left derived-from-ledger — no forced M3 nullable-override (C3), no X*/AI\* (C4). Boundary held (Purpose/Gamification/Sessions substrates cited, not re-spec'd; code homes + ADR-002 amendment `[DEFERRED — build]`).

**Prior status (retained):** Independent adversarial critic (fresh subagent, code-aware) → **REVISE (1 blocking)** → **fixed** → clean. The critic grep-verified all 6 As-is-floor schema lines (`purpose_habits:413`, `page_tags:121`, `xp_history:1213`, `project_habits:437`, `habits:253`, `habit_completions:278`), every framework cite (M1/M2/M4/M5/M7, E2/E3, SP1, R1/R2), and all four guards (C1/C2/C3/C4). **B1 (blocking, FIXED):** the PLAN had listed `grant_currency` inside the **ADR-004 §3.2.2 S4 catalogue** — but the catalogue's economy member is **`award_xp`**; `grant_currency` is the **ADR-012 E2** generalization of it (the exact two-layer distinction the sessions-and-scheduling PLAN established). Corrected at all 6 occurrences: the S4 triad is now `complete_habit_occurrence`/`contribute_purpose_metric`/`award_xp`, with ADR-012 generalizing `award_xp`→`grant_currency(XP)` cited as a *separate* layer. **3 non-blocking notes folded:** N1 (added `unit` to the R3 `[E]` list), N2 (noted G-M7-here = anti-signal retirement, not an M7-ownership claim), N3 (stated N\*/E1/E4/E5 correctly deferred, not missed). Everything else verified shippable.
**Date:** 2026-07-24 · **Session:** build-roadmap-resequence (foundation-realignment campaign, Part 1.2).
**Context:** `docs/features/habits/` (5 aspect files: identity, structure-data, business-rules, contract, conventions).
**Verdict (sweep):** **stale** (row 12) — drivers **011, 012, 006, 004**.
**Grounded in:** `staleness-sweep.md` (row 12 + Part 1.2 Tier-1 order), `capability-framework.md` §2 (R1/R2/R3/R4/R7) + §3 ADR-011 (M1/M2/M4/M5/M7) / ADR-012 (E2/E3) / ADR-006 (SP1) / ADR-004 (S4) + §4 applies-to + §5, all 5 current aspect docs, **and the live schema** (`packages/core/src/db/schema.ts` + `migrations/001_initial.ts` + `packages/types/src/habit.ts` — the As-is FACT floor, grepped this session).
**No-Guessing:** every forward token below is one the framework/ADR actually names (cited); no invented tokens. Every retired token is a **live FACT** (schema line cited) recorded in the As-is floor and retired in `[INTENT]` (R6 two-tier). Code/directory homes + the `contributions` write contract + the measurement design pass + the ADR-002 amendment are `[DEFERRED — Part 2 / build phase]`, never decided here.

---

## §1. Context — why this re-run, and the true stale shape

Habits is the platform's **recurring-behavior tracker** — a **Wave-1 independent domain** with 2 live tables (`habits` + `habit_completions`), a rich completion/streak/mood model, and three cross-module edges: it **contributes** to purpose metrics, **feeds** the economy (XP/achievements), and is **tagged**. It predates ADR-011 (measurability), ADR-012 (economy), ADR-006 (Spaces/tags), and the ADR-004 effect rails — so all three edges are expressed in **pre-framework terms** that name **retired tokens forward**. Sweep verdict is **stale**: `purpose_habits` + `page_tags` are named as the go-forward model, and `xp_history` is named as the XP target.

**The R6 fact that shapes this unit (opposite of health/core):** habits **HAS a live v2 schema** (grepped: `habits` `schema.ts:253`, `habit_completions` `:278`, **`purpose_habits` `:413`**, **`page_tags` `:121`**, **`xp_history` `:1213`**, `project_habits` `:437`). So every retired token is a **genuine As-is FACT floor** → recorded, then retired in `[INTENT]` (the projects R6 two-tier pattern). This is NOT the floor-less health/core case.

**Ground-truth refinement (the sweep scored only structure-data; this PLAN reads all 5 aspects + the schema):** the stale tokens thread through multiple aspects, and the reframe is a **three-retirement + three-gap-add mixed case**:

| Cap | Framework token (owning ADR) | Present today? | Fix shape |
|---|---|---|---|
| **M7** `purpose_habits` → `contributions` | retired junctions `purpose_habits`/`purpose_routines`/`purpose_projects` → polymorphic weighted `contributions` (ADR-011 §Amends/§5) | **WRONG-MODEL (live FACT)** — `purpose_habits` in `schema.ts:413` + `001_initial.ts:451`; named forward in structure-data L24, HB-8, contract L23–24/L41, conventions L24–26, dep graph L46–48 | **retire in `[INTENT]`** → `contributions` (As-is floor kept; Purpose-owned, cite-not-re-spec) |
| **SP1** `page_tags` → `entity_tags` | `entity_tags` (`tag_id, entity_type, entity_id`) is the tag primitive; retired `page_tags` + per-module inline tags (ADR-006 §3.2) | **WRONG-MODEL (live FACT ×2)** — `page_tags` `schema.ts:121`; `habits.tags` inline `[E]` JSON `schema.ts` (ADR-002 §5.5); named forward in structure-data L27, identity L33–35, contract L31–32 | **retire in `[INTENT]`** → `entity_tags`; `habits.tags` inline recorded in As-is floor, retired |
| **E3** `xp_history` → `consequence_ledger` | retired `xp_history` (`xp_amount`/`action_type`/`level_*`); balances derived from `consequence_ledger` (ADR-012 §3.3/§5) | **WRONG-MODEL (live FACT)** — `xp_history` `schema.ts:1213` + `001_initial.ts:1183`; named forward in HB-9, identity L28 | **retire in `[INTENT]`** → `consequence_ledger` (Gamification-owned) |
| **E2** `grant_currency` feeder | a feeder names the effect `grant_currency` + the currency (`award_xp` = its XP case, NOT retired) (ADR-012 §3.2/§5) | **GAP** — HB-9 + identity L28 say "feed XP/achievements" conceptually; name neither `grant_currency` nor the currency | **gap-add** — name `grant_currency(XP)` as the completion's feeder effect |
| **M1** `measurement_kind` | pursuable carries `measurement_kind` CHECK ∈ `quantitative·milestone·rate·qualitative`; a habit-driven goal is now **`rate`**+contribution (ADR-011 §3.1; applies-to **names Habits**) | **GAP (no bespoke enum to untangle — habits has no `target_type` column; pure add)** — the habit is a pursuable but names no `measurement_kind` | **gap-add** — the habit carries `measurement_kind` (natural = `rate`, occurrence-frequency) |
| **M2** `binding_mode` | pursuable carries `binding_mode` CHECK ∈ `manual·derived-pull·event-trigger`; `event-trigger` write is an S4 effect on the R1 rail (ADR-011 §3.5) | **GAP** — absent | **gap-add** — the habit carries `binding_mode`; a completion is the `event-trigger` that advances the measure + fires the S4 effect |
| **S4/R1/R2** effect rails | a completion's cross-module effects draw from the ADR-004 §3.2.2 **S4 catalogue** (`complete_habit_occurrence`/`contribute_purpose_metric`/**`award_xp`**) via **R2**, idempotent via **R1** (`effect_event_id`/`applied_effects`) (ADR-004 §3.2.2/§3.2.5; R1/R2 reused by 011/012). ADR-012 **generalizes** the `award_xp` slot → `grant_currency(XP)` (E2 — a distinct layer, cited separately) | **GAP (directionally right)** — HB-8/HB-9 + conventions "emit through the owning module, never write directly" is **R2-correct** but names no S4 effect, no R1 idempotency | **gap-add** — name the S4 effects + R1 rail the completion rides (the 004 driver) |
| **M4** weighted contribution | `progress = Σ(child.progress × weight)/Σ weight`; laddering weight is `contributions.contribution_percentage` (ADR-011 §3.3) | **PARTIAL** — HB-8 "contributes to a purpose metric" has no weight model | **light** — the completion→purpose contribution rides `contributions.contribution_percentage` (Purposes-owned) |
| **M5** measure read seam | a module advertising a measure exposes it as a queryable source via **R7**; `streak(habit)` is the named example (ADR-011 §3.6; applies-to **names Habits**) | **GAP** — `getStreak`/`getCompletionRate` exist (contract L20–22) but the M5 read seam is unnamed | **light gap-add** — name `streak(habit)`/completion-rate as the M5 measure seam |

**Fix shape:** habits is the **mixed case with a real As-is floor** — three live-FACT retirements (M7 `purpose_habits`, SP1 `page_tags`/inline-tags, E3 `xp_history`) reframed under R6 two-tier, plus additive gap-fills (M1/M2 measurability, E2 `grant_currency`, S4/R1/R2 effect rails, M5 seam). **Economy is IN scope** (012 is a driver — opposite of health/core's C3). **No X*/AI*** — habits neither ingests external data nor touches a model (lighter than health/core on that axis).

---

## §2. What changes — three retirements + measurability/economy/effect-rail gap-adds + guards

### Primary A — retire the three live-FACT stale tokens (R6 two-tier; drivers 011/012/006)

| # | Cap | Retire (As-is FACT floor) → add (`[INTENT]`) | Owning ADR (cite; DDL deferred) | Aspect(s) |
|---|---|---|---|---|
| G-M7 | **`purpose_habits` → `contributions`** | As-is FACT: `purpose_habits` junction (`schema.ts:413`). `[INTENT]`: retire → the polymorphic weighted **`contributions`** primitive (a habit *contributes* to a purpose/target); Purpose owns the write contract (cite-not-re-spec). **`project_habits` STAYS** (C1). *(G-M7 on this doc is an **anti-signal retirement** — habits names a forwarded retired token — NOT an applies-to claim that Habits owns M7; M7's apex owner is Purposes. Framework As-is-exemption + projects-PLAN precedent.)* | ADR-011 §Amends/§5 (M7) | structure-data (⚠ block L24 + dep graph L46–48) · business-rules (HB-8) · contract (L23–24/L41) · conventions (L24–26) |
| G-SP1 | **`page_tags` + inline `habits.tags` → `entity_tags`** | As-is FACT: `page_tags` (`schema.ts:121`) + `habits.tags` inline `[E]` JSON (ADR-002 §5.5). `[INTENT]`: retire both → **`entity_tags`** (`tag_id, entity_type, entity_id`, SP1); Habits is a **consumer**, registers `entity_type='habit'` in the open taggable-type registry. Resolve the "flagged, not yet decided" direction → **decided: `entity_tags`** | ADR-006 §3.2 (SP1) | structure-data (L27) · identity (L33–35) · contract (L31–32) · conventions (tags) |
| G-E3 | **`xp_history` → `consequence_ledger`** | As-is FACT: `xp_history` (`schema.ts:1213`). `[INTENT]`: retire the forward reference → balances derive from **`consequence_ledger`** (Gamification-owned); Habits reads/writes neither directly (R2) | ADR-012 §3.3/§5 (E3) | identity (L28) · business-rules (HB-9) · contract (L44) |

### Primary B — measurability + economy + effect-rail naming (drivers 011/012/004 — name the contract, don't re-spec)

| # | Cap | Forward tokens to add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-M1 | **`measurement_kind` on the habit** | the habit (pursuable — M1 applies-to **names Habits**) carries `measurement_kind` CHECK ∈ `quantitative·milestone·rate·qualitative`; a habit's natural kind is **`rate`** (occurrence frequency). No bespoke enum to untangle (habits has no `target_type` column — pure add) | ADR-011 §3.1 (M1) | structure-data · business-rules · conventions |
| G-M2 | **`binding_mode` on the habit** | the habit carries `binding_mode` CHECK ∈ `manual·derived-pull·event-trigger`; a logged **completion is the `event-trigger`** that advances the measure + fires the S4 effect on the R1 rail (distinct from provenance) | ADR-011 §3.5 (M2) | structure-data · business-rules · conventions |
| G-E2 | **`grant_currency` feeder** | name the completion's feeder effect **`grant_currency(XP)`** (E2) — `award_xp` is its XP case (NOT retired); replaces the bare "feeds XP" framing. The currency + ledger are Gamification-owned | ADR-012 §3.2/§5 (E2) | identity (L28) · business-rules (HB-9) · conventions (landmine) |
| G-S4 | **completion = effect producer on the S4/R1/R2 rails** | the completion's cross-module effects draw from the ADR-004 §3.2.2 **S4 catalogue** — `complete_habit_occurrence` · `contribute_purpose_metric` · **`award_xp`** — each via **R2** (documented effect handler, never a direct write) and **R1** (deterministic `effect_event_id` + `applied_effects` dedup — no double-count on sync replay). ADR-012 **generalizes** the `award_xp` slot → `grant_currency(XP)` (E2 — do not rename the S4 effect; two layers). The doc's "emit through the owning module" **is** R2 — name the S4/R1 tokens it rides | ADR-004 §3.2.2 (S4) / §3.2.5 (R1/R2); reused by ADR-011 §3.5 / ADR-012 §3.1 | business-rules (HB-8/HB-9) · contract (completion surface) · conventions (landmine) |
| G-M4 | **weighted contribution** | the completion→purpose contribution rides `contributions.contribution_percentage` (M4 laddering weight); Purposes-owned | ADR-011 §3.3 (M4) | business-rules (HB-8) · conventions |
| G-M5 | **`streak(habit)` measure read seam** | Habits advertises `streak(habit)` / completion-rate as an **M5 queryable measure** via the **R7** read seam (M5 names `streak(habit)` as its example; applies-to names Habits) — Journal/Purpose read through it, not a direct table read | ADR-011 §3.6 (M5) + R7 (§2) | structure-data · contract (`getStreak`) · conventions |

### Secondary — flagged guards surfaced by grounding (flag, don't silently skip)

| # | Finding | Fix | Cite | Scope guard |
|---|---|---|---|---|
| C1 | **`project_habits` is NOT retired** — live FACT (`schema.ts:437`); the framework M7 retirement list is `purpose_habits`/`purpose_routines`/`purpose_projects` ONLY; CLAUDE.md keeps `project_habits` as a live cross-domain junction. | **Keep `project_habits` untouched.** Retire ONLY `purpose_habits` (G-M7). Explicit guard so the M7 pass does not over-retire. | framework §3 M7 (retirement list); CLAUDE.md §"Cross-domain junctions"; `schema.ts:437` | **guard, not an edit** — the exact projects C1 pattern |
| C2 | **`habits.tags` inline is a live FACT** — do not pretend it is already `entity_tags`. It is the As-is floor that `[INTENT]` retires (R6 two-tier). | Record `habits.tags` inline `[E]` JSON in the As-is floor; retire → `entity_tags` in `[INTENT]`. | ADR-002 §5.5; ADR-006 SP1 | **R6 discipline** — floor kept, not overwritten |
| C3 | **The denormalized streak cache is already M3-aligned** — `current_streak`/`longest_streak`/`total_completions` are "derived from the ledger, a cache never hand-edited" (HB-2). The habit has **no stored `progress` column** → M3's `NOT NULL DEFAULT 0` anti-signal is absent. | **No M3 nullable-override edit needed.** Note the habit's derived measure (`progress()`/rate) is derived-on-read; the streak counters are deterministic analytics caches (HB-2), not the M3 progress slot — leave the derived-cache framing intact. | ADR-011 M3 (anti-signal); HB-2 | **scope guard** — do NOT force a nullable-override on analytics caches |
| C4 | **No X*/AI\* apply** — habits neither ingests external data nor touches a model (not in the ADR-014/015 applies-to sets). | **Do not add X*/AI\* tokens.** (Reminders ride Preferences/Notifications, aligned; not a driver.) | framework §4 applies-to | **scope guard** — don't manufacture ingestion/AI contracts |

**Scope guards (do NOT over-apply):**
- **R6 two-tier is REAL here.** `purpose_habits`, `page_tags`, `habits.tags` inline, `xp_history` are **live FACTs** (schema lines cited) → recorded in the As-is floor, retired/reframed in `[INTENT]`. The M1/M2/E2/S4 gap-adds are `[INTENT]` additions (no floor to preserve — habits has no `measurement_kind`/`grant_currency` today).
- **Conceptual home + owning ADR only.** Every new token (`contributions`, `entity_tags`, `consequence_ledger`, `grant_currency`, `measurement_kind`, `binding_mode`, the S4 effects, `effect_event_id`) is cited to its ADR; **which package/table it physically lives in is `[DEFERRED — Part 2]`.**
- **Cite-not-re-spec the owned substrates.** `contributions` + the completion→metric write contract are **Purpose-owned** (sweep: reframed→aligned); `consequence_ledger`/`grant_currency`/`currencies` are **Gamification-owned** (reframed→aligned); the S4 catalogue + R1 rail are **Sessions-owned** (reframed this campaign). Habits names the contracts it rides, does not author them.
- **`project_habits` survives** (C1) — only the `purpose_*` trio is in M7's retirement list.
- **The streak cache stays** (C3) — HB-2 derived-recompute is already aligned; no forced M3 nullable-override.
- **No X*/AI\*** (C4). **No schema-level reconciliation** — table counts / consolidated DDL / the ADR-002 amendment → build phase (ADR-016).

---

## §3. Per-aspect edit map (all 5 aspects touched)

**`identity.md`**
- **G-E3/G-E2** — L28 ("Not the Gamification engine … `xp_history` / `achievements` owned by Gamification"): retire the forward `xp_history` → balances derive from `consequence_ledger` (E3); the completion feeds via `grant_currency(XP)` (E2). `[INTENT G2; ADR-012 E2/E3]`
- **G-M7** — L30–31 ("Not the Purpose-metrics owner … contributes to a linked purpose's metric"): the contribution rides `contributions` (M7), not `purpose_habits`. `[INTENT G7; ADR-011 M7]`
- **G-SP1** — L33–35 ("Not its own tag vocabulary … `habits.tags` inline `[E]` JSON today, direction is shared tag system, flagged not yet decided"): **decide it** — the shared primitive is `entity_tags` (SP1); `habits.tags` inline is the As-is, retired in `[INTENT]`. `[INTENT; ADR-006 SP1]`
- **G-M1** (light) — the "quantified completion / streaks" scope (L22–23): note the habit is a **pursuable** carrying `measurement_kind` (natural `rate`) + `binding_mode` (M1/M2). `[INTENT; ADR-011 M1/M2]`

**`structure-data.md`** (the As-is floor + the ⚠ INTENDED block land here)
- **Keep the As-is floor** (L5–19): the 2 live tables, `habits.tags` inline JSON, denormalized streak cache — recorded as FACT (they exist in `schema.ts`; C2/C3).
- **G-M7** — ⚠ INTENDED block L24 ("`purpose_habits` junction gains a completion→metric mapping contract"): retire `purpose_habits` → `contributions` in `[INTENT]` (As-is floor: junction exists `schema.ts:413`); the completion→metric contract is Purpose-owned. `[INTENT G7; ADR-011 M7]`
- **G-SP1** — L27 ("deprecating inline `habits.tags` in favor of the shared `tags`/`page_tags` system"): retire `page_tags` (live `schema.ts:121`) → `entity_tags` (SP1); resolve "not yet decided" → decided. `[INTENT; ADR-006 SP1]`
- **G-M1/G-M2** — the ⚠ INTENDED / restored-fields block (L21–28): add that the habit (pursuable) carries `measurement_kind` (M1, natural `rate`) + `binding_mode` (M2, completion = `event-trigger`); no bespoke `target_type` to untangle. `[INTENT; ADR-011 M1/M2]`
- **G-M5** — single-source-of-truth (L52–57): note Habits advertises `streak(habit)`/completion-rate as an **M5 measure seam** (R7); the streak cache stays the derived-from-ledger source (C3). `[INTENT; ADR-011 M5]`
- **G-M7 dep graph** — L46–48: out-edge `purpose_habits` → `contributions` in `[INTENT]`; **keep `project_habits`** (C1). `[INTENT M7]`
- **G-S4** (note) — the completion is an effect producer riding S4/R1/R2 (detail in business-rules). Extend the R6 named-ADR set → +011/012/006/004. `[INTENT R6]`

**`business-rules.md`**
- **G-M1/G-M2** — new invariant (or fold into HB-2/HB-5): the habit is a **pursuable** carrying `measurement_kind` (`rate`) + `binding_mode` (`event-trigger`), M1/M2. `[INTENT; ADR-011 M1/M2]`
- **G-M7/G-M4/G-S4** — HB-8 (purpose contribution): the contribution rides `contributions` (M7) with `contribution_percentage` weight (M4); the write is the S4 **`contribute_purpose_metric`** effect via **R2**, idempotent via **R1** (`effect_event_id`) — never a direct `purpose_metric_value` write. Retire `purpose_habits`. `[INTENT G7; ADR-011 M4/M7; ADR-004 S4/R1/R2]`
- **G-E2/G-E3/G-S4** — HB-9 (Gamification dependency): retire `xp_history` → `consequence_ledger` (E3); the completion emits the **`award_xp`** S4-catalogue effect (ADR-004 §3.2.2) via R2, idempotent via R1, which ADR-012 **generalizes** → **`grant_currency(XP)`** (E2); "Habits never writes XP itself" **is** R2. `[INTENT G2; ADR-004 S4/R1/R2; ADR-012 E2/E3]`
- **C3** — HB-2 (streak cache): leave the derived-from-ledger framing (already M3-aligned); the habit's `progress()`/rate derives, no stored progress column. `[FACT/INTENT — M3 alignment noted]`
- ⚠ Flagged-delta block (L76–84): update the retired-token references (`purpose_habits`/`xp_history`) to their `[INTENT]` targets; the As-is/live-invariant list (HB-1..HB-7, HB-11, HB-12) stays FACT.

**`contract.md`**
- **G-M7** — L23–24 (`contributeToPurposeMetrics … via the `purpose_habits` link`) + L41 (Consumed-by Purpose): retire `purpose_habits` → `contributions`; the write is the S4 `contribute_purpose_metric` effect (R1/R2), Purpose owns the metric write. `[INTENT G7; ADR-011 M7; ADR-004 S4]`
- **G-E2/G-E3** — L44 (Consumed-by Gamification "streak/completion events feed XP"): the feed is `grant_currency(XP)` (E2) → `consequence_ledger` (E3), not `xp_history`. `[INTENT G2; ADR-012 E2/E3]`
- **G-SP1** — L31–32 (shared tag system direction): decided → `entity_tags` (SP1); `habits.tags` inline is the As-is. `[INTENT; ADR-006 SP1]`
- **G-M5** — L20–22 (`getStreak`/`getCompletionRate`): name these as the **M5 measure read seam** (R7) Habits advertises. `[INTENT; ADR-011 M5]`
- **G-S4** — the completion surface (L15–19): the completion fires the S4 effects (`complete_habit_occurrence`/`contribute_purpose_metric`/`award_xp` — ADR-012 generalizes `award_xp`→`grant_currency(XP)`) on the R1 rail. `[INTENT; ADR-004 S4/R1; ADR-012 E2]`

**`conventions.md`**
- **G-M7/G-S4** — L24–26 ("Purpose contribution goes through the junction … Habits never writes `purpose_metric_values` directly") + L45–46 landmine ("Never write XP/achievements or `purpose_metric_values` … emit through the owning module"): **keep the R2 discipline** (it's correct); retire `purpose_habits` → `contributions`; name the S4 effects (`contribute_purpose_metric`/`award_xp`, ADR-012 generalizes `award_xp`→`grant_currency(XP)` E2) + R1 idempotency the emit rides; `consequence_ledger` not `xp_history`. `[INTENT G7/G2; ADR-011 M7; ADR-004 S4/R1/R2; ADR-012 E2/E3]`
- **G-M1/G-M2** — new build rule: the habit carries `measurement_kind` (`rate`) + `binding_mode` (`event-trigger`), never a bespoke goal-type column (M1/M2). `[INTENT; ADR-011 M1/M2]`
- **G-SP1** — tags: `entity_tags` (SP1) is the primitive; retire inline `habits.tags` + `page_tags`. `[INTENT; ADR-006 SP1]`
- **C1 guard** — cross-module rule: retire `purpose_habits` → `contributions`, **keep `project_habits`** (only the `purpose_*` trio retires). `[INTENT — guard]`
- **G-M5** — note `streak(habit)` is advertised as an M5 measure (R7). `[INTENT; ADR-011 M5]`

---

## §4. Acceptance (the definition-of-aligned §5 lines this unit must pass)

- [ ] **M7** — `purpose_habits` retired → `contributions` in `[INTENT]` across all aspects; As-is floor kept (junction is a live FACT, `schema.ts:413`); **`project_habits` untouched** (C1 guard verified).
- [ ] **SP1** — `entity_tags` named as the tag primitive; `page_tags` (live `schema.ts:121`) + inline `habits.tags` recorded in As-is floor and retired; the "not yet decided" tag direction resolved to `entity_tags`.
- [ ] **E3** — forward `xp_history` (live `schema.ts:1213`) retired → `consequence_ledger` in `[INTENT]`; no forward `xp_history` remains.
- [ ] **E2** — the completion names `grant_currency(XP)` as its feeder effect (`award_xp` = its XP case, not retired).
- [ ] **M1/M2** — the habit (pursuable) carries `measurement_kind` (natural `rate`) + `binding_mode` (`event-trigger` completion); no bespoke `target_type` (none exists — pure add).
- [ ] **S4/R1/R2** — the completion's cross-module effects named as the ADR-004 §3.2.2 S4 catalogue (`complete_habit_occurrence`/`contribute_purpose_metric`/**`award_xp`** — with ADR-012 generalizing `award_xp`→`grant_currency(XP)` as a *separately-cited* E2 layer, NOT an S4 member) via R2, idempotent via R1 (`effect_event_id`/`applied_effects`); the "emit through owning module" discipline kept.
- [ ] **M4** — the completion→purpose contribution rides `contributions.contribution_percentage` (Purposes-owned).
- [ ] **M5** — `streak(habit)`/completion-rate named as the M5 measure read seam (R7).
- [ ] **C1 guard** — `project_habits` kept (live FACT, only `purpose_*` trio retires).
- [ ] **C2 guard** — `habits.tags` inline recorded as As-is FACT, not pretended-migrated.
- [ ] **C3 guard** — the denormalized streak cache (HB-2) left as the derived-from-ledger source; no forced M3 nullable-override on analytics caches (habit has no stored `progress` column).
- [ ] **C4 guard** — no X*/AI\* tokens added (not applicable to habits).
- [ ] **Boundary rule** — every code/directory home + the `contributions`/`consequence_ledger`/S4 write contracts + the measurement design pass + the ADR-002 amendment is `[DEFERRED — Part 2 / build]`; only conceptual ADR homes asserted (cite-not-re-spec the Purpose/Gamification/Sessions substrates).
- [ ] **R6** — the As-is (live FACT floor: 2 tables + inline tags + streak cache + retired `purpose_habits`/`page_tags`/`xp_history`) / `[INTENT]` split intact; named-ADR set extended to 002/001/003 + 011/012/006/004.
- [ ] **Rails** — `[E]` on `name`/`description`/`unit`/`cue`/`reward`/`tags` preserved (R3/HB-1); `_sync_*`/soft-delete/CASCADE/UNIQUE(habit,date) intact (R4/HB-3/HB-11); cross-module writes via S4/R2 (never direct), reads via R7.
- [ ] **No new anti-signal** introduced; **no structural call made**; no schema-level reconciliation (DDL/table-count) attempted.
- [ ] **No contradiction** with any ADR 001–017, nor with neighbors (Purpose owns `contributions`/metric write; Gamification owns `consequence_ledger`/`grant_currency`/`currencies`; Sessions owns the S4 catalogue + R1 rail; Projects keeps `project_habits`).

---

## §5. Out of scope (explicit)

- **The `contributions` write contract** — the completion→purpose-metric mapping is **Purpose-owned** (sweep: reframed→aligned); this unit retires `purpose_habits` → `contributions` on the Habits side + names the S4 `contribute_purpose_metric` effect, it does not author the `contributions` DDL or the mapping contract.
- **The economy substrate** — `consequence_ledger`, `grant_currency`, `currencies`, `backing_kind` are **Gamification-owned** (reframed→aligned); this unit names the feeder effect + ledger it rides, does not re-spec ADR-012.
- **The S4 catalogue + R1 rail** — **Sessions-owned** (reframed this campaign in `sessions-and-scheduling`); this unit cites the effect catalogue + idempotency rail, does not re-author them.
- **The measurement design pass** — exact `measurement_kind`/`binding_mode` CHECK defaults for a habit, the rate-derivation formula, and the goal-vs-habit target model → build phase; this unit names the axes.
- **The restored v1 fields (G8)** — `success_criteria`/`difficulty`/completion `location`/`time` are a separate candidate ADR-002 amendment (unchanged by this realignment).
- **Reminders / Notifications (N\*)** — `push_habits` + `habit_backfill_window_days` are Preferences/Notifications-owned (aligned; **013 is not a habits driver** — reminders ride Preferences `push_habits`); untouched. (Confirmed not a gap: the sessions/projects PLANs likewise ran no N\*.)
- **Economy substrate (E1/E4/E5)** — `currencies`/`backing_kind` (E1), the four Additive effects (E4), penalties-lock (E5) are Gamification-owned (§4 applies-to = "owns economy substrate"); habits is a **feeder**, so it names only **E2/E3** (the sweep's "M1/M2 + E2 layer"). E1/E4/E5 correctly deferred, not missed.
- **Code/directory homes + schema reconciliation** — final DDL, table counts, the ADR-002 amendment authoring → build phase (ADR-016).

---

## Change Log
| Date | Change |
|------|--------|
| 2026-07-24 | Initial PLAN drafted from the ground read (sweep row 12 + framework §2 R1/R2/R3/R4/R7 + §3 ADR-011 M1/M2/M4/M5/M7 / ADR-012 E2/E3 / ADR-006 SP1 / ADR-004 S4 + §4 applies-to + §5, all 5 aspect docs, **and the live schema** — `schema.ts`/`001_initial.ts`/`habit.ts`). Ground-truth: habits HAS a live v2 schema, so the As-is FACT floor is real (opposite of health/core) — `purpose_habits` (`:413`), `page_tags` (`:121`), `xp_history` (`:1213`), `project_habits` (`:437`) all confirmed live. The mixed case = **three live-FACT retirements** (M7 `purpose_habits`→`contributions`, SP1 `page_tags`/inline-tags→`entity_tags`, E3 `xp_history`→`consequence_ledger`) under R6 two-tier + **gap-adds** (M1/M2 measurability on the habit-pursuable, E2 `grant_currency`, S4/R1/R2 the completion effect rails — the 004 driver, M4 weighted contribution, M5 `streak(habit)` seam). Economy IS in scope (012 is a driver — opposite of health/core's C3); no X*/AI\* (C4). Four guards: C1 `project_habits` survival (live FACT, only `purpose_*` trio retires), C2 inline `habits.tags` = As-is floor not pretended-migrated, C3 streak cache already M3-aligned (no forced nullable-override), C4 no X*/AI\*. Presented for the LITE gate. |
| 2026-07-24 | Independent adversarial critique (fresh subagent, code-aware) → **REVISE**, 1 blocking → fixed. The critic grepped all 6 As-is-floor schema lines (verified real at their cited numbers → zero fabricated floor), every framework/ADR cite (M1/M2/M4/M5/M7, E2/E3, SP1, R1/R2 — all exact incl. ADR-011 §3.6 `streak(habit)←Habits` verbatim, ADR-004 R1 worked example `derive(habit_id‖date‖"award_xp")`), and all four guards (C1 `project_habits` kept, C2 inline-tags floor, C3 no stored `progress` col on habits → M3 anti-signal genuinely absent, C4 no X*/AI\*). **B1 (blocking):** `grant_currency` was mis-listed inside the ADR-004 §3.2.2 S4 catalogue where the member is `award_xp` (`grant_currency` = ADR-012 E2 generalization) — a token/§-pin layer-conflation contradicting ADR-004 §3.2.2 + the sessions-PLAN precedent. Fixed at all 6 occurrences (S4 triad → `award_xp`; ADR-012 generalization cited as a separate E2 layer). 3 notes folded: N1 `unit` added to R3 list; N2 G-M7 = anti-signal retirement not M7-ownership; N3 N\*/E1/E4/E5 confirmed deferred-not-missed. N4 (S4-on-completion defensible — framework's own R1 example is a habit completion) noted, no change. Ready for Victor's LITE-gate approval. |
