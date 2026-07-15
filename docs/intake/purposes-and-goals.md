# Intake — purposes-and-goals  (level: 3 — Higher-order; Wave 3, context 1/3)

> Fill order: Wave 3 opens here. Purposes & Goals is a **higher-order** context — it sits ABOVE the
> foundational domains (Habits ✅, Routines ⏳, Projects ✅, Finance ✅, Tasks ✅) and points DOWN at them
> (a purpose links to / reads progress from them). Its foundations are documented enough to proceed; the
> one forward-dep still open (Routines, Health) is noted per-gap. Documenting it also unblocks the
> **Journals Review engine** lens ("improvement vs goals / dreams / purposes"), which stubbed Purpose as a
> Wave-3 forward-dep. `[FACT: docs/features/journals/ JR-6; task file Journals entry]`

## Current (enforced reality — authoritative source)

**6 tables + 3 junctions, all schema-only (0 service logic).** `[FACT: ADR-002 §5.7 L1769-1900; project.ts
L109-256]`

Hierarchy as shipped: **Purpose → Target (goal) → TargetReview**, plus **Purpose → PurposeMetric →
PurposeMetricValue** (time series), plus **Purpose → Dream**.

- **`purposes`** — `title[E] · description[E] · vision[E] · why[E] · domain(LifeDomain 8) · status(5) ·
  progress 0-100 · start_date · target_date · is_primary · sort_order`. `[FACT: ADR-002 L1772-1800; project.ts
  L113-131]` `LifeDomain = health · career · finance · relationships · personal_growth · spiritual ·
  recreation · environment`. `[FACT: ADR-002 L1778-1781]`
- **`targets`** (= Goals) — `purpose_id(FK,CASCADE) · title[E] · description[E] ·
  target_type(quantitative|qualitative|milestone|habit_based) · target_value · current_value · unit[E] ·
  status(5) · priority(5) · start_date · target_date · review_frequency(6) · next_review_date · sort_order`.
  `[FACT: ADR-002 L1806-1839; project.ts L133-152]`
- **`purpose_metrics`** — `purpose_id(FK) · name[E] · description[E] · unit[E] · target_value · current_value ·
  calculation_method(sum|average|latest|max|min|count)`. `[FACT: ADR-002 L1845-1865; project.ts L154-165]`
- **`purpose_metric_values`** — `metric_id(FK) · value · recorded_at`. Time-series point. `[FACT: ADR-002
  L1871-1885; project.ts L167-172]`
- **`target_reviews`** — `target_id(FK) · progress_rating 1-10 · reflection[E] · next_actions[E] ·
  reviewed_at`. `[FACT: ADR-002 L1891-1898; project.ts L174-184]`
- **`dreams`** — `title[E] · description[E] · domain · target_age · estimated_cost[E,cents] · purpose_id(FK,
  nullable)`. `[FACT: ADR-002 L452-463; project.ts L186-197]`
- **Junctions** `purpose_habits · purpose_routines · purpose_projects` — **FK pairs only** (no contribution
  data). `[FACT: ADR-002 L465; project.ts L238-251]`
- **Polymorphic pages already reserve** `entity_type IN ('purpose','target','purpose_metric_value')` — so
  purpose/target standalone notes + entity-links are pre-wired. `[FACT: ADR-002 L1349-1351; note.ts L44-46]`

**No progress derivation is implemented or specified** — `purposes.progress` and `targets.current_value` are
plain columns; nothing computes them. `[FACT: no service in packages/core/src/services; grep clean]`

## Legacy (life-os v1 — the "desire", context only, never a decision)

v1's Purpose module is **materially richer than v2** and shipped a working UI. The API doc frames it as a
hierarchy **"Purposes → Targets → Plan Steps"** with metrics, periodic reviews, dreams/visions, and
cross-feature linking. `[FACT: ../life-os/src/features/purpose/API.md L1-24; types/purpose.ts]` v2 dropped
the bolded items below:

- **Purpose**: `values[]` (core values) · **purpose-level** `review_frequency` + `last_review_date` +
  `next_review_date` · `priority`. `[FACT: purpose.ts L20-40 PurposeFull]`
- **`purpose_reviews` TABLE — dropped whole in v2.** v1 had rich purpose-level review: `still_aligned ·
  alignment_notes · overall_progress · key_achievements · obstacles_faced · adjustments_needed · new_targets ·
  renewed_commitment · fulfillment_rating · clarity_rating`. v2 keeps only *target*-level reviews. `[FACT:
  purpose.ts L113-133]`
- **`target_plan_steps` TABLE — dropped.** Ordered, completable steps to achieve a target (`title · description
  · order_index · is_completed · completed_at`). `[FACT: purpose.ts L84-96]`
- **Target extras dropped**: `success_criteria · measurement_method · is_achieved · project_id (direct
  target→project) · linked_milestone_ids[]`. `[FACT: purpose.ts L42-64]`
- **Metric extras dropped**: `baseline_value · is_higher_better (progress direction!) · display_format`; value
  extras `recording_method · context_notes · source (manual vs auto)`. `[FACT: purpose.ts L66-111]`
- **Dream extras dropped**: `visualization_notes · vision_board_images[] · target_timeframe(text) · is_achieved
  · achieved_at · achievement_notes`. v2 traded these for `target_age + estimated_cost`. `[FACT: purpose.ts
  L189-205]`
- **Junction extras dropped**: `contribution_notes` (all links) + `contribution_percentage` (project links) —
  the data behind v1's **ContributionMap**. `[FACT: purpose.ts L157-187]`
- **UI surface** (proof of intended depth): PurposeOverviewPage (dashboard) · AllPurposesPage ·
  PurposeDetailPage · TargetDetailPage · **DreamsPage/DreamBoard (vision board)** · **ReviewPage +
  ReviewsDueWidget + ReviewScheduleIndicator + ReviewHistory** · **ContributionMap** · MetricTrendChart.
  `[FACT: ../life-os/src/features/purpose/{pages,components}/]`
- **Business rule OR-001**: *Purpose progress = weighted average of linked target progress*, real-time on any
  target update. **Nerfed to a plain column in v2.** `[FACT: COMPLETE_SYSTEM_ARCHITECTURE.md L130-135]`
- **SR-003**: Targets cannot exist without a Purpose (FK CASCADE) — preserved in v2. `[FACT: same L100-105]`
- v1's **AI purpose generation (WF-002)** was **intentionally CUT** and now falls under the extension-model
  principle (opt-in, on-device). `[FACT: docs/intake/_scope-reconciliation-v1.md L27]`

## Existing docs incorporated (D5b)
- **Scope reconciliation** already ruled Purpose (Purpose/Target/Metric/Review) **✅ kept**. `[FACT:
  _scope-reconciliation-v1.md L17]`
- **Journals** stubbed Purpose as a Wave-3 forward-dep for its Review lens. `[FACT: journals docs JR-6]`
- **Notes & Pages G5** lists "Goals/Targets" as an INTENDED journal-summary section. `[FACT:
  notes-and-pages/business-rules.md G5]`
- **Check-ins** review check-ins = a cross-module review surface that **reads Purpose** (forward dep from that
  side). `[FACT: task file Check-ins entry, G7]`
- **Sessions & Scheduling** ADR-004 defines a `review` session sub-type + `dueIn()` provider primitive —
  candidate host for scheduled purpose/target reviews. `[FACT: docs/core/decisions/ADR-004; sessions contract]`
- Do NOT duplicate/contradict these; reference them.

## GAP MAP (what the code cannot answer — for Victor, ONE batch)

Each gap is a real decision the sources can't settle. `[likely CONFIRM]` = my read of the evidence, needs your
yes/no; the rest need your intent. **v1-restore candidates are flagged — v2 is the nerfed version, so restore
is the default unless you say otherwise.**

- [x] **PG1 — RESOLVED (Victor): (B)-MAXIMAL — Purposes & Goals is the ORGANIZING SPINE of the OS**, the
      **meaning / direction plane**, not a peer module. It is the oldest idea in the platform (v0 Notion) and was
      always meant to be the core; it failed in v0/v1 only for lack of the personalization+organization machinery
      that Waves 0-2 have since built (provider seams, entity_links graph, derived-progress, scoped tags). Its job:
      let the user **see the sides (domains) of their life and how they steer each**, make the **upcoming seasons
      visibly driven by core beliefs + purpose**, and keep the granular daily work tethered to the end goal.
      ⭐ **The hierarchy is deliberately sharp because it carries a full lifecycle: envision → plan → act → (even)
      FAIL → document the failure → reshape → advance** — failure is a first-class, documented step that feeds back
      into the plan; goals accumulate into a reached purpose over time. Connects to **every module**, works at
      **both altitudes at once** (broad life-direction + granular daily action), "ground zero to the max." **The
      only module that shapes the whole OS.**
      ⭐ **TWO INTEGRATION PLANES (Victor's distinction):** Journals/Global Calendar = the **daily-operational
      plane** (what happened / what's due — horizontal, time-based); **Purposes & Goals = the directional/meaning
      plane** (where is my life going / is my work laddering up — vertical, meaning-based, strategic rollup). Same
      provider seam, orthogonal axis → distinct context, not merged. Purposes = **strategic aggregation layer**;
      Journals = **operational aggregation layer**.
      **Framing: optional-but-omnipresent** — nothing REQUIRES a purpose, but everything CAN ladder into one and
      the OS surfaces that laddering everywhere. Sets ceiling for PG2/4/6/7 (pushes defaults → derived progress ·
      values first-class + failure-lifecycle · auto-sourced metrics · broad entity_links laddering).

- [ ] **PG2 — Progress derivation (THE core rule).** Is `purpose.progress` **DERIVED** (v1 OR-001: weighted
      average of its targets, live) or **manual**? And `target.current_value` — derived from its metrics /
      linked entities (habit streaks, project %) or hand-entered? Pick the model: fully-derived · manual ·
      **hybrid (derive by default, allow manual override)** `[likely: hybrid — matches derived-mastery /
      derived-analytics precedent from Knowledge & Sessions]`.

- [ ] **PG3 — Restore purpose-level reviews?** v2 dropped `purpose_reviews` whole. `[likely RESTORE]` — it's
      the alignment/fulfillment loop (still-aligned, fulfillment & clarity ratings, renewed commitment) and
      it's the natural feed for the Journals Review engine + Check-ins review surface. Restore as its own
      table, or fold into a **generic review mechanism** shared with target_reviews (and Check-ins)?

- [ ] **PG4 — Values & the vision spine.** v1 Purpose carried `values[]`. Is there a **Values** layer above
      Purposes (Values → Purposes → Goals), or are values tags/attributes on a purpose? And where do **Dreams
      / Vision** sit in the spine — above purposes (aspirational) or beside them? Define the fixed hierarchy
      to reach a Goal (analogous to Knowledge's "Subject › Unit › Topic" spine).

- [ ] **PG5 — How a Goal decomposes into action.** v1 gave a target: `plan_steps` (ordered checklist),
      `success_criteria`, `measurement_method`, direct `project_id` + `linked_milestone_ids[]`, `is_achieved`.
      v2 dropped all. Does a goal decompose via **(a)** dedicated plan-steps, **(b)** the generic **Tasks**
      universe (link tasks to a goal), **(c)** links to **Projects/Milestones**, or **(d)** all three? This is
      the platform's "connect actions to purpose" promise — needs a definite answer.

- [ ] **PG6 — Metrics: manual vs auto-sourced (the Level-3 aggregation question).** v1 metrics had
      `is_higher_better`, `baseline_value`, `display_format`, and values had a `source` (manual vs auto).
      Should a purpose metric **AUTO-PULL** from platform data via the established **provider seam** — e.g.
      net-worth from Finance, streak from Habits, body-weight from Health — instead of hand-logging? `[likely:
      yes, provider-sourced with manual fallback — this is the same dueIn/registry seam that unified
      Sessions→Calendar→Knowledge→Journals]`. Restore `is_higher_better` + `baseline_value` regardless
      `[likely RESTORE — needed to compute progress direction]`.

- [ ] **PG7 — Cross-module contribution model.** v2 junctions are bare FK pairs; v1 had `contribution_notes`
      + `contribution_percentage` (the ContributionMap). **(1)** Restore weighted contribution? **(2)** Keep
      dedicated junctions (purpose_habits/routines/projects) or move to the generic **entity_links** graph
      (which already powers the neural graph)? **(3)** Which entities may link to a purpose/goal — v2 has
      habits/routines/projects; add **tasks · bucket-list · check-ins · finance targets**?

- [x] **PG8 — Dreams vs Bucket List boundary ✅ RESOLVED (Victor 2026-07-15, at Bucket List #6).** Victor's
      sincere reframe: **Bucket List is NOT a module or a separate entity — it is a Space** (a saved, tagged View
      of "things I want to do before I die," with progress + a vision-board to envision them). Therefore:
      - **One aspiration entity = `Dream`** (owned HERE, Purposes & Goals). The redundant **`bucket_list_items`
        table COLLAPSES into `dreams`** — `dreams` absorbs the execution/progress fields worth keeping from it:
        `status` (dream→planned→in_progress→completed→abandoned) · `progress_percentage` · `target_date`/
        `completed_date` · `category`(or reuse `domain`) · `priority` · `steps`(or compose Tasks/promote to a
        Project via `project_id`) · imagery (`image_url`/`cover_image_url`/`inspiration_url`) · `location`.
        → **build-phase ADR-002 change: retire `bucket_list_items`; widen `dreams`.** `[FACT: ADR-002 bucket_list_items L3292 + dreams L1911]`
      - **"Bucket List" = a Space over Dreams** — a `#before-i-die` tag + a Gallery/vision-board saved View +
        derived progress + an optional Template. Lives in the **Spaces** layer (worked-example #3, after Languages
        + Duties). `[FACT: docs/intake/spaces.md accumulator; docs/intake/bucket-list.md RESOLUTION]`
      - **Vision board** = the Gallery/imagery View provided by the Space (imagery fields already on the entity);
        `visualization notes` = a linked Notes page; achievement tracking = derived progress + Gamification (Wave 4).
      → At Transform (this capstone), model **Dreams** as the single aspiration entity + note the Bucket-List Space.
        `bucket_list_items` no longer documented as its own context. `[Dream↔Bucket redundancy dissolved]`

- [ ] **PG9 — Review scheduling & where reviews fire.** `review_frequency` + `next_review_date` exist but
      nothing schedules/notifies. Do purpose/target reviews become **`review` sessions** (ADR-004 sub-type) on
      the scheduler, surfaced via **`dueIn()`** to the Global Calendar + Journals agenda, and fire
      **Notifications**? `[likely: yes — reuse the ADR-004 review-session + dueIn seam rather than a
      bespoke reminder]`. Confirm, and confirm the relationship to **Check-ins** review check-ins (same
      surface, or distinct?).

- [ ] **PG10 — Journals / Global Calendar provider registration `[likely CONFIRM]`.** This context **registers
      a journal contribution** (`summary(date)` → goals/targets/reviews due + progress deltas) and exposes
      review due-dates via `dueIn()` — i.e. it's a **provider**, consumed by Journals & the Global Calendar,
      not aggregated-from. Confirm it follows the established registry seam (4th+ consumer).

- [ ] **PG_notes `[likely CONFIRM]`.** Purpose/Target/Dream get **standalone pages** (entity_type already
      reserved) with attached notes + **shared scoped tags**; the neural graph shows purpose↔goal↔linked-entity
      connections. Confirm no bespoke notes columns (constitution: all notes via `pages`).

### Not-blocking (recorded, resolved during Transform unless you flag)
- Terminal states per capability (loading / empty / error / success) — enumerated in the contract per scenario
  anti-pattern; no decision needed.
- Consolidated **ADR-002 amendment** slice (restored fields + any new tables) folds into the standing
  amendment; noted, not a blocker.
- Any surfaced decision (e.g. a **generic review mechanism**, or **metric provider seam**) → `/adr-new` at
  Accept.

---
**STATUS: PARKED 2026-07-13 — resume as CAPSTONE (execution #9).** PG1 RESOLVED (meaning-spine, above). PG2–PG10
intentionally left OPEN: Purposes ladders up every module, so its rollup/contribution/metric-sourcing gaps must be
answered against **documented** Health · Skills · Routines · Bucket List (execution #2–8), not guesses. Re-sequence
rationale + full order: `docs/README.md` §"Remaining — EXECUTION ORDER"; task Route History 2026-07-13. Do NOT
Transform until #1–8 are documented and the gap map is made whole.
