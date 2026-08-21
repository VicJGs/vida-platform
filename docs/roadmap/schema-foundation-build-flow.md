# Schema-Foundation Build Flow — DB-3 & DB-4 (M1.0)

<!-- Authoritative build flow for the M1.0 schema foundation (DB-3 substrate + DB-4 per-domain).
     Decided by Victor 2026-08-18. This doc is the SINGLE source of truth for how DB-3/DB-4 are built;
     the delivery plans, the reconstructed-structure rows, the closeout record, and the two task files
     all point here. No-Guessing: claims are [FACT: src] / [INTERP] / [UNKNOWN]. -->

Status: **ACTIVE — authoritative. DB-3 is the next M1.0 build head; DB-4 follows it.**
Supersedes: the "streaming loop model (Q1 settled)" in [`m1.0-delivery-plan.md` §5.1.1](./m1.0-delivery-plan.md)
and every "DB-3/DB-4 are `〰` streams / land per-module / not upfront" description across the corpus (reconciled — see §5).

---

## 0. Why this doc exists

M1.0 was reopened on 2026-08-18: its foundation **includes the complete schema**, and two schema issues were left
unfinished — **DB-3** (substrate, LIF-65, partial) and **DB-4** (per-domain, LIF-66, not started). The reopen asserted
the *intent* (finish the schema before M1.1) but the corpus still carried the **original, contradictory build model**
("streaming" — schema authored per-module across M1.1+, DB-3/DB-4 never standalone heads). Building on that
contradiction would inherit it.

This doc resolves it: it records the **decided build model** (Model B — upfront foundation) and the **5-phase
lifecycle** each of DB-3 and DB-4 runs. It is the setup a clean-context session reads before touching schema.

---

## 1. The decision — Model B (upfront foundation), document-first

**DB-3 and DB-4 author the schema as a self-contained M1.0 foundation, BEFORE M1.1 modules — not streamed into them.**
The following M1.1+ modules build **service + UI on the finished schema; they never author schema.** `[DECISION
2026-08-18 (Victor blueprint); anchored in m1.1-delivery-plan.md:8-13,50-52]`

This was a genuine fork the docs had not settled — two live models in the same corpus:

| | **Model A — streaming (superseded)** | **Model B — upfront foundation (DECIDED)** |
|---|---|---|
| DB-3 tables | land per-substrate as each `foundation/` framework is built | authored as one gated foundation build (the full Stream (i) set) |
| DB-4 tables | land per-module in M1.1+, inside each module's build | authored as one gated foundation build (all ~19 domains), before M1.1 |
| DB-3/DB-4 as heads | `# Stream: true` — never a delivery head | real, gated build heads (DB-3, then DB-4) |
| M1.1 modules | author their own domain schema | consume the finished schema; author none |

**Why Model B.** A foundation's consumers are *unwritten* — they cannot push back on a schema-shape decision later. If
the schema streams in per-module, each module silently re-decides shape, and "following issues use it as a foundation
properly" becomes impossible to guarantee. Authoring the whole schema upfront, from the full documented intent, is what
makes it a foundation. `[INTERP: Victor blueprint rationale — "the following issues will use it as a foundation properly"]`

**ADR-016 reconciliation (no ADR reversal).** ADR-016 §3.5 mandates schema is authored **per-feature at build phase,
hand-written SQL, not a v1-style monolith dump.** Model B is consistent with that: DB-4 authors **per-domain, one domain
group at a time, each gated** — it is still incremental per-feature authoring at a build phase; the only change is that
the build phase for domain schema is **DB-4 (a foundation issue)** rather than scattered across M1.1 module issues. The
`foundation/` v2 authoring surface (`core/src/db/schema/<domain>.ts`) is unchanged. What is superseded is the
**delivery-plan §5.1.1 "streaming" timing decision**, not ADR-016. `[FACT: ADR-016 §3.5; ADR-002 §5.20 D5-a "deferred
to its own build-phase schema session"]` — §5.20 itself already anticipated "its own build-phase schema session," which
is exactly DB-3 + DB-4.

---

## 2. The 5-phase lifecycle (run identically for DB-3, then DB-4)

This is the standard §XXVI Per-Step Build Gate with two **foundation-specific bookends** — Phase 1 (full-intent intake)
and Phase 5 (foundation-soundness verify) — that a normal component build does not carry.

### Phase 1 — Intent intake (document-first, FULL intent, NOT ship-scope)
Capture the **complete intended** schema into documentation before any planning. Ship-scope trimming is forbidden here
— a foundation intakes the whole intent so nothing is silently omitted (`[[intake-captures-intent-not-ship-scope]]`).
- **DB-3 intent source:** ADR-002 §5.20 Stream (i) — the full ADD / RETIRE / AMEND ledger.
- **DB-4 intent source:** the 19 `docs/features/<module>/structure-data.md` docs (Stream (ii)).
- Shape-open tables (`store`, `rules`, `planned_blocks`) intake their **documented intent** even where the DDL is left
  open in-source — the shape is resolved in Phase 3, grounded in that intent, never guessed.
- Skills: `/document-context` (refresh the `database-layer` context's `current-*`) → `/documentation-component` (the
  unit spec, in `docs/specs/foundation/<db-3|db-4>-<slice>/`).

#### Phase 1 — No-Decisions Gate (anti-drift protocol · MANDATORY)
**A Phase-1 intake produces "resolutions ALL doc-determined, ZERO decisions" — NEVER a list of "open points", "shape
points", or "decisions with leans".** The documentation already closes every point (Model B: the schema's consumers are
unwritten, so nothing may be left to re-decide later). This drift recurred THREE times (Notes #1, Sessions #3, Tasks #4)
and Victor corrected it every time — it is the single failure mode of this flow. `[[stale-source-plus-live-convention-is-fact-not-a-decision]]`

**The tell (a mechanical string-check, not a judgment call).** If the P1/P3 spec contains any of — *decision · open
point · open question · shape point · resolve at the gate · lean · TBD · choose · "either…or" · advisory · fold · note ·
governing principle · transparency note · "this is the moment to say so"* — that IS the drift signal. STOP and re-ground
each occurrence in the docs before proceeding. A clean intake contains none of these words in its own analysis (quoting a
doc that uses them is fine). *(The `advisory · fold · note · governing principle` set was added after group #9 Finance,
where the SAME No-Decisions drift leaked through the gate machinery — a critic's "minor advisory" and a preflight "fold" —
instead of through the word "decision"; a doc-fixed FACT re-surfaced by a critic or a gate is still just the FACT, cite it
or drop it. [[stale-source-plus-live-convention-is-fact-not-a-decision]] · [[verify-a-critiques-escalation-and-defer-target-before-relaying]])*

**The mandatory No-Guessing steps (every group, BEFORE writing that any "gap" exists):**
1. **Read ALL five aspects** — `identity · structure-data · business-rules · contract · conventions` — plus the owning
   ADR(s), the **ADR-002 §5.20 ledger** (ADD/RETIRE/AMEND = the definitive table roster; a table not in the ADD set is
   not owed), and the §5.<n> body DDL. *Stopping at `structure-data.md` is the documented root cause of the drift.*
2. **Grep the concept across the WHOLE corpus** (`docs/` + `packages/`) for every column a feature doc leaves loose. An
   existing canonical representation used ≥2× elsewhere WINS over inventing one — e.g. Tasks #4: "recurrence rule
   *fields*" → the platform's single `recurrence_rule` RRULE column (found 3×), not a new frequency+days model.
3. **Read the owning ADR's mechanism section** — it often NAMES the exact column (ADR-011 §3.3 named `nesting_weight`
   verbatim; §5.20 enumerates the `measurement_kind`+`binding_mode` pursuable pair).
4. **`@vida/types` interface reconciles are a STANDING DB-11 boundary** — mirror-only now, cited, P5-exempt. Never a
   per-unit "extend-now vs defer" choice.
5. **NEVER manufacture a DEFAULT.** An INTENDED column's default must be licensed by a documented "natural"/default;
   absent one, the column is NULLABLE (the override-slot grain, ADR-011 §3.2). Gate-2 struck a manufactured
   `binding_mode NOT NULL DEFAULT 'event-trigger'` at Tasks #4 — the reverse form of the same drift.

**Checkpoint (the supervised-loop backstop).** After **P1 + P2** (both mechanical / pre-gate), SURFACE the intake to
Victor for a ~30-second glance — a compact table of the group's tables + every column tagged `[FACT floor]`/`[INTENDED]`/
boundary, and the one-line assertion **"zero decisions — every point doc-cited."** The drift, if present, is visible
here, one step BEFORE the P3 gates spin up. On his nod → proceed to the P3 double-gate. *(This is the fastest catch
point; the two independent critics have twice failed to catch this class, so the string-check + this glance — not more
adversarial review — are the reliable guard.)*

### Phase 2 — Current-state / skeleton read (reconcile-and-extend, never from-zero)
Determine exactly what is authored on disk vs skeleton vs absent. Every prior DB issue (DB-6, DB-7) was built
reconcile-and-extend; do the same. This is the No-Guessing baseline the plan is drawn from.
- Read `packages/core/src/db/schema/**` and diff against the Phase-1 intent set.
- Output: a precise "authored ✓ / missing ✗ / shape-open ⏳" table per table.

### Phase 3 — Plan (full double-gate, end-to-end)
Plan *what & how* from the documented intent. Because the **Phase-1 No-Decisions Gate** already closed every shape from
the docs, **Phase 3 is a STRAIGHT AUTHORING PLAN with nothing to "decide at the gate"** (the group #3/#4 outcome) — the
exact DDL + files + tests, each `[FACT]`-cited. If Phase 3 surfaces a genuine fork, that means Phase 1 was incomplete →
return to it and re-ground, do not "resolve at the gate". `[No-Guessing: each claim FACT/INTERP/UNKNOWN]`
- PLAN → `/critique` (fix every REVISE) → **Approval 1** → `/preflight` (against the spec) → `/critique` → **Approval 2**.
- Split form: `sessions/PLAN-<session>-<unit>.md` (gate 1) then `IMPLEMENTATION-PLAN-<session>-<unit>.md` (gate 2).

### Phase 4 — Implement
Author the schema strictly from the approved IMPLEMENTATION-PLAN — hand-written SQL migration (ADR-016) + Drizzle table
modules in the v2 surface + the `ENTITY_TYPES` registry append per `_registry.ts`. Any divergence → Deviation Protocol
(§XXVIII). Skills: `victor:execute-plan-code`, `victor:tdd`/`victor:verification` per step.

### Phase 5 — Foundation-soundness verify (the exit bookend)
Prove the build (a) followed the **whole Phase-1 intent** and (b) left `current-spec.md` + `current-business-rules.md`
**clear and sound enough that a following issue consumes it as a foundation without re-authoring.** This is stricter
than a normal post-impl pass — the acceptance criterion is *downstream usability*, not just "tests green."
- Post-impl `/critique` (independent) → §XXIX Currency promote (docs ship in the same commit) →
  a "foundation-readiness" check: pick a representative downstream consumer (e.g. MOD-notes for DB-4's Notes domain)
  and confirm every table/column it needs exists and is documented. Log any gap as a defect, do not hand-wave.
- **DDL-introspection parity check (MANDATORY — the green tests are blind to it).** Apply each new migration in-memory
  (better-sqlite3 + `PRAGMA table_info`, the `enum-parity.test.ts` driver pattern) and diff the REAL table, column by
  column, against BOTH the Drizzle mirror (`schema/<domain>.ts`) and the `@vida/types` interface, on **nullability ·
  default · column-set · type**. The enum-parity test checks only CHECK *value-sets* and the runner test only checks
  that migrations *apply* — neither catches a `NOT NULL`-in-mirror-but-nullable-in-SQL drift, which makes `$inferSelect`
  (and the interface) lie about the row. Every mismatch is a defect; resolve to the canonical contract (usually the
  `@vida/types` interface + sibling-column convention), fixing BOTH the migration and any ADR §5 DDL it mirrors. Known
  interface↔table divergences deliberately deferred to DB-11 are exempt — cite them, don't "fix" them.
  `[origin: DB-4 group #2 P5 caught a `time_format` NOT NULL type-lie a CHECK-only parity pass missed; the group-#1
  oversight re-review then cleared #1 via this same introspection — 2026-08-19]`

---

## 3. DB-3 — Stream (i) substrate schema (the next head)

**Intent source:** ADR-002 §5.20 Stream (i) (ADD / RETIRE / AMEND, enumerated). **Profile:** add-backend-component.

**Current state (verified on disk 2026-08-18):** 17 tables authored across `core/src/db/schema/foundation/*` (15 DB-3
substrate + `sync_queue`/DB-6 + `app_state`/DB-7). Mapped to §5.20 ADD line-items, **11 are done**: `sessions` (+
`session_type_registry`, `session_attachments`), `applied_effects`, `entity_tags`, `spaces`, `space_enabled_blocks`,
`views`, `capability_definitions`, `block_instances`, `capability_grants`, `consequence_ledger`, `currencies` (+ `tags`,
`entity_links` from AR-6). `[FACT: packages/core/src/db/schema/foundation/*.ts]` *(Arithmetic: the 15 substrate tables =
the 11 done ADD line-items + 4 satellites — `session_type_registry`, `session_attachments`, `tags`, `entity_links` —
which are not distinct §5.20 ADD rows; +`sync_queue`/DB-6 +`app_state`/DB-7 = 17 physical files. The "11 done" and the
"11 remaining" below are two different sets.)*

**⚠ Corrected missing-table ledger.** The informal "11 missing" list carried in the reopen docs drifted from the
authoritative §5.20 Stream (i) ADD set. The **true DB-3 remainder is these 11 substrate ADD tables:**

| # | Table | ADR | Shape |
|---|-------|-----|-------|
| 1 | `planned_blocks` | ADR-004 §3.1 | ⏳ aggregator-scheduled blocks |
| 2 | `templates` | ADR-009 | ✓ shape-locked (`id·name[E]·bundle[E]`) |
| 3 | `review_curves` | ADR-005 | ↔ confirm cols vs Knowledge structure-data |
| 4 | `method_bindings` | ADR-005 | ↔ confirm cols vs Knowledge structure-data |
| 5 | `review_events` | ADR-005 | ↔ confirm cols vs Knowledge structure-data |
| 6 | `values` | ADR-011 PG4 | ✓ shape-locked (core-beliefs layer above purposes) |
| 7 | `contributions` | ADR-011 PG7/10 | ⏳ polymorphic weighted goal-edge |
| 8 | `purpose_reviews` | ADR-011 PG3 | ✓ shape-locked |
| 9 | `plan_steps` | ADR-011 PG5 | ⏳ lightweight DOC layer on task/target |
| 10 | `store` | ADR-012 | ⏳ **shape-open in-source** (Finance-owned) |
| 11 | `rules` | ADR-012 | ⏳ **shape-open in-source** (headless-automation) |

**Corrections vs the drifted list** `[FACT: ADR-002 §5.20]`:
- **`values` was omitted** — it *is* an owed Stream (i) ADD table. (+1)
- **`review_events` was omitted**; the drifted list wrote **`topic_reviews`** — but `topic_reviews` is a **per-domain
  (Stream (ii) / DB-4)** table, not DB-3 substrate. (swap)
- **`measurement`** in the drifted list is **not a table** — §5.20 has it as a column-level AMEND
  (`measurement_kind` + `binding_mode` on pursuable entities), cross-cutting Stream (ii). (remove)

**Two separately-tracked categories** (part of DB-3's Phase-1 intake but distinct from the 11 above):
- **Session sub-type 1:1 extensions** (`reading_sessions`, `class_sessions`, `workout_sessions`, `work_sessions`,
  `study_sessions`-redefined, `focus_sessions`) — §5.20 marks these "some settle at build." Phase 3 decides whether to
  author now or defer each to its consuming domain (record the decision; do not silently drop).
- **Column-level AMENDs** (`_sync_field_ts` on every syncable table, nullable-progress override slots, `category_bidx`,
  the `measurement_kind`/`binding_mode` pair, etc.) — many are build-phase-deferred by design; Phase 3 classifies each.

**RETIRE set** (§5.20): reconcile the 10 superseded tables/columns (flat `study_sessions`, `flashcard_*`, `page_tags`,
`xp_history`, bare purpose junctions, …) — none should exist in the v2 surface; verify absent, remove any reference.

---

## 4. DB-4 — Stream (ii) per-domain schema (after DB-3)

**Intent source:** the 19 `docs/features/<module>/structure-data.md` docs (§5.20 Stream (ii)). **Profile:**
add-backend-component. **Blocked by:** DB-3 (consumes the substrate spine).

**Grain.** Author the per-domain Drizzle schema **one domain group at a time**. *(The "~19 domains" was indicative — the
counts differed across charters [~17–21] because Health/Knowledge sub-groups fold differently; DB-4's **P0** enumerated the
single canonical domain-group list and is the authority for the final count.)* **P0 RESOLVED (2026-08-18): 22 domain
groups** — see `.claude/tasks/db-4-per-domain-schema.md` "## P0 Output". Key grain calls: **Health split ×3**
(Core/Nutrition/Training); **Languages = own group** (intent = ADR-002 §5.10, its `docs/features/languages/` docs are
0-byte stubs → author `structure-data.md` in P1); **Pomodoro folded into Sessions**, **ICS folded into Learning**;
tracked as lightweight build-steps (no Linear sub-issues); cross-domain refs are plain TEXT no-FK → no hard build-order. The charter's list: Notes & Pages ·
Tasks · Projects · Habits · Routines · Purpose & Goals · Finance (+Fiscal & Legal) · Relationships ·
Learning/Education · Books · Knowledge · Sessions & Scheduling · Skills · Check-ins · Health (core/nutrition/training)
· Preferences · Journals · Pomodoro · Gamification · Notifications · ICS). Each domain group is a component sub-issue
(one per domain), added when DB-4's build begins — each runs the 5-phase lifecycle at domain granularity. `[FACT:
db-4-per-domain-schema.md; ADR-002 §5.20 Stream (ii)]`

**Cross-module MOVES** (§5.20 Stream (ii)) to honor: `bucket_list_items` → collapse into `dreams`; `pomodoro_sessions`
→ re-home to the Sessions realm (keyed by `session_id`); `skill_resources` → `entity_links`. Dissolved modules land
their schema elsewhere (Bucket List → `dreams`; Duties → intake; Languages → `docs/features/languages/`).

**Foundation-readiness (Phase 5) for DB-4** is measured against the first real consumers: M1.1's `MOD-*` modules must
find every table/column their `structure-data.md` promises already authored.

---

## 5. Reconciliation record — what changed from Model A → Model B (2026-08-18)

The streaming model was retired across the corpus so the mechanical layer matches the decision:

| File | Was (Model A) | Now (Model B) |
|------|---------------|---------------|
| `.claude/tasks/db-3-stream-i-consolidation.md` | `# Stream: true`; "never a delivery head / folds into consumer gates" | real gated head; profile + scenario + 5-phase Build Steps; points here |
| `.claude/tasks/db-4-per-domain-schema.md` | `# Stream: true`; same | real gated head; per-domain sub-issue grain; points here |
| `docs/roadmap.md` (M1.0 DB-spine bullet) | "DB-3/DB-4 land per-module … not a single upfront campaign" | DB-3 then DB-4 authored upfront as gated foundation builds |
| `m1.0-delivery-plan.md` rows DB-3/DB-4 (170-171) | "streaming issue … not one-shot/upfront"; flow "per-increment (rides gate)" | gated build heads; flow = 5-phase lifecycle (this doc) |
| `m1.0-delivery-plan.md` §5.1.1 "streaming loop (Q1 settled)" | DB-3/DB-4 fold into consumer gates, never ready heads | superseded — see this doc |
| `reconstructed-structure.md` rows #9/#10 | `〰 stream` glyph | `◻`/`⏳` real build heads |
| `m1.0-closeout.md` | model + flow "pending Victor's blueprint"; drifted 11-table ledger | model decided (Model B); flow = this doc; ledger corrected (§3) |

---

## 6. Acceptance (this flow's setup is "documented properly" when)

- [x] The model fork is decided and recorded (Model B, §1) with ADR-016 reconciliation.
- [x] The 5-phase lifecycle is persisted (§2), reusable for DB-3 and DB-4.
- [x] The DB-3 ledger is corrected against ADR-002 §5.20 (§3).
- [x] The Model-A layer is reconciled across all seven docs (§5).
- [x] Both task files are primed (profile · scenario · intent source · 5-phase Build Steps) for a clean-context pickup.
- [x] TASKS.md routes the next head to DB-3, pointing here.
