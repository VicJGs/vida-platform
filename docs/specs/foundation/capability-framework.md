# Capability Framework — Vida Platform

**Type:** foundation reference (Part 0 deliverable of the foundation-realignment campaign).
**Status:** RATIFIED (2026-07-23, Victor — LITE gate passed: independent critique REVISE→fixed + approval). Part 0 complete.
**Date:** 2026-07-23  ·  **Session:** build-roadmap-resequence (foundation-realignment campaign, Part 0)
**Grounded in:** ADRs 004–015 (each capability cites its mandating ADR + section). Extraction pass: 3 read-only
agents over the 12 ADRs, every token verified against the ADR text.
**Consumes:** `docs/specs/foundation/realignment-master-plan/_index.md` (the gating+phasing system this instrument serves).
**No-Guessing:** every predicate names a token the ADR actually uses (FACT + cite). Where an ADR defers the exact
column/table to build-phase (ADR-002 §5.20), the entry is marked `[UNKNOWN — build-phase]` and predicated on the
concept the ADR *does* name — never on an invented token.

---

## §0. What this is and why it exists

The platform's per-context docs (22 feature dirs → 24 `structure-data.md` + ~120 aspect files) were authored
BEFORE ADRs 004–017 matured underneath them. This framework is the **measuring instrument** that makes "is this
doc still aligned with the foundation?" a **mechanical**, grep-checkable question instead of a judgment call.

Each capability below carries a **presence predicate** (a concrete token a conformant doc must contain) and an
**anti-signal** (a retired token whose presence marks the doc STALE). Part 1's staleness sweep runs these predicates
across every context; a failed applicable predicate is a **gap**, filled by context (docs/ADRs) or by Victor's
explicit intent — never by guess.

**This framework does NOT:** author schema tables, decide code/directory homes (that is a later structural part —
the Part-1/Part-2 boundary rule), or reconcile ADR-002 §5/§7/§8 (owned by DB-11). It only *measures docs against ADRs*.

---

## §1. How the sweep uses this (the predicate contract)

1. **Applicability first.** Each capability has an **Applies-to** rule. A predicate is only run against a context
   the rule selects. A capability that doesn't apply to a context is `n/a`, never a failure.
2. **Presence = the grep token is there.** The predicate names an exact SQL identifier (table, column, CHECK enum
   value, effect name) or a required `[E]`/`_sync_*` marker. Presence of that token in the context doc passes it.
   **Convention:** `CHECK ∈ {a·b·c}` denotes **enum membership**, however the owning ADR/owed-schema expresses it
   (`{a,b,c}` prose, a SQL `CHECK` constraint, etc.) — the grep token is the **value set** (`a`/`b`/`c`), NOT the
   literal words `CHECK`/`UNIQUE`, which are this framework's SQL-form normalization (DDL is owed to build-phase).
3. **Anti-signal = automatic stale.** If a context doc contains a retired token (col. "Stale/anti-signal"), it is
   STALE regardless of anything else — it describes a superseded design.
4. **A context is ALIGNED** iff every applicable presence predicate passes AND no anti-signal is present
   (see §5, the definition-of-aligned checklist, which is the compact per-context gate).
5. **Verdict per context:** `aligned` · `stale (+ named drivers = which predicates failed / which anti-signals fired)`
   · `gap (predicate has no answer in docs/ADRs → owed to intent)`.

---

## §2. Shared rails (cross-cutting mechanisms — stated ONCE, referenced by ID)

These recur across ADRs 004/005/008/010/011/012/013/014/015. A context doc references the rail; it does not
re-invent it. A doc that invents a per-module substitute for any rail is STALE against every ADR that mandates it.

| Rail | Rule | Source | Present token | Stale/anti-signal |
|------|------|--------|---------------|-------------------|
| **R1 — Idempotency rail** | Every cross-module effect carries a **deterministic `effect_event_id`** = `derive(subject_natural_key ‖ transition ‖ effect_type)`; a local-only **`applied_effects`** dedup ledger; a **UNIQUE `effect_event_id`** on each effect *output* row. Stops double-count on replay. | ADR-004 §3.2.5 (reused by 008 §3.3·5, 010 §3.3, 011 §3.5, 012 §3.1) | `effect_event_id`, `applied_effects`, `UNIQUE effect_event_id` | random/non-deterministic effect id; no dedup ledger; a per-module dedup mechanism |
| **R2 — Guarded write (INT-2)** | A module/capability writes another module's data **only through that module's documented write API / effect handler** — never a direct table write. | ADR-004 §3.2.5, INT-2 (reused by 008 §3.3·5, 010 §3.3, 011 §3.5) | writes via named effect handler / documented write API | a module inserting into another module's tables directly |
| **R3 — Field encryption `[E]`** | Every user free-text / sensitive field is marked `-- [E]` (encrypted L2/L3 per EN-1/EN-2). | ADR-002 EN-2 (enforced by 006 §3.5, 007, 009, 010 §3.5, 012 §5, 013, 014 §3.4, 015 §5) | `-- [E]` on names/notes/keys/conversations | a user free-text field with no `[E]`; any server-visible plaintext |
| **R4 — Sync metadata** | Every syncable table carries `_sync_*` metadata + `deleted_at` soft-delete (DATA-4). | ADR-002/003 DATA-4 | `_sync_*`, `deleted_at` | a syncable table missing `_sync_*`/`deleted_at` |
| **R5 — Terminal states** | Every capability/view/surface declares `loading · empty · error · success` (degrade, never crash). | ADR-007, ADR-008 §"Terminal states", ADR-009 §"Terminal states" | `loading`, `empty`, `error`, `success` | a surface with no declared empty/error state |
| **R6 — Two-tier structure (As-is / Intended)** | Every context doc carries the **As-is (FACT floor)** vs **[INTENT] Intended** split and names the ADRs it is subject to. | realignment methodology (doc-tier; per master plan §"definition of aligned") | `As-is` / `[INTENT]` split + named ADRs | a flat doc with no As-is/Intended separation |
| **R7 — Read seam (INT-1)** | A module reads another module's data through a **documented list/query/measure read API** (provider fan-out), never a direct cross-module table read or a materialized cross-module index. | ADR-007 §3.4, ADR-011 §3.6 (Journals J2, Sessions `dueIn()`) | fans out to documented read API (`summary(date)`/`dueIn(range)`/advertised measure) | direct cross-module table read; materialized cross-module index |

---

## §3. Capabilities by ADR

Format: **ID · Capability · ADR § · Presence predicate (grep token) · Stale/anti-signal · Applies-to.**
Rail references (R1–R7) point at §2 instead of repeating the mechanism.

### ADR-004 — Session Framework

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| S1 | Sessions supertype | §3.1 | doc references base **`sessions`** (with `sub_type` discriminator) + a 1:1 extension keyed by **`session_id`** (`reading_sessions`/`class_sessions`/`workout_sessions`/`work_sessions`/`study_sessions`) | a self-contained per-module session table; retired flat forms `language_practice_sessions`, `language_daily_sessions`, `pomodoro_sessions`(v2), `reading_session` standalone | **any module with timed/focused activity**: Books, Education, Health, Tasks, Sessions&Scheduling, Language, Pomodoro |
| S2 | Plan↔actual link | §3.1/§5 | names **`planned_blocks`** + nullable **`planned_block_id`** FK on the session | `scheduled_study_sessions` with **no FK** to the session; merged plan+actual row | any scheduled/planned session |
| S3 | Session Integration Contract (4-dim) | §3.2 | per session type references Attachment (**`session_attachments`**), Effects (S4 catalogue), Lifecycle (S5), Permissions envelope | an "island" session firing cross-module writes with no declared contract | every session sub-type |
| S4 | Effects catalogue | §3.2.2 | effects drawn from the fixed set `complete_habit_occurrence·log_time·emit_measurement_signal·contribute_purpose_metric·award_xp·surface_journal·surface_calendar·attach_pomodoro`, each via **R2** | an effect not in the catalogue with no handler; a session writing target tables directly | every session with cross-module effects; receivers Habits/Tasks/Projects/Measurement/Purpose/Gamification/Journal/Calendar/Pomodoro |
| S5 | Lifecycle state machine | §3.2.3 | status enum `scheduled/planned → in_progress → completed·skipped·missed·rescheduled` + per-type hooks | a bespoke per-module status enum omitting/renaming these | every session sub-type |
| S6 | Guarded-write + idempotency | §3.2.5 | **R1** + **R2** (effect handlers in `packages/core/services/<module>`) | see R1/R2 anti-signals; "honor-system" direct writes | **all** effect producers (sessions, ADR-008 caps, ADR-010 caps) |
| S7 | Base+extension co-sync | §3.4 | base + extension enqueue atomically in **`sync_queue`**; base-without-extension = degraded valid session | extension applied without base; base-missing-extension as an error | every session sub-type with an extension |

### ADR-005 — Study-Method Service Framework

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| SM1 | Study-method as capability `kind=study_method` | §3.1.3 | registers in the **one** ADR-008 registry as **`kind=study_method`**; binds via **`method_bindings`** to a **`review_curves`** curve | a Knowledge-owned parallel `study_methods` registry; SM-2 hard-wired as the only method | every study method (Flashcards = reference impl; assessments/self-test/Feynman later) |
| SM2 | Generic review engine (retire per-method tables) | §3.2 | uses **`review_events`** + **`method_bindings`**; grouping via Knowledge container (`parent_object_id`); resource link via `entity_links` | retired **`flashcard_decks`**, **`flashcard_reviews`**, **SM-2 columns on `flashcards`** | every study-method service |
| SM3 | Run = Session sub-type (`review_session`) | §3.1.2 | a run is a base `sessions` sub-type (**`review_session`**) with `session_id` (see S1) | a bespoke "flashcard review session" table off the sessions base | every study-method run |
| SM4 | Content units are OS citizens | §3.1.6/§3.1.5 | content unit taggable (`entity_tags`), note-linkable (`entity_links`), emits **`review_events`** (mastery *derived* by Knowledge, not stored) | a content unit with its own mastery/SM-2 columns; a service computing its own mastery | every study-method content unit |

### ADR-006 — Spaces Foundation & Universal Tags

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| SP1 | Universal tagging | §3.2 | names **`entity_tags`** (`tag_id, entity_type, entity_id`) as the tag primitive | retired **`page_tags`**; page-only `tagPage`/`getPagesByTag`; per-module bespoke tag tables | **any** entity in any module; N&P becomes a *consumer* |
| SP2 | Open taggable-type registry | §3.2 | new types become taggable by **registering** (no `entity_type CHECK(...)` enum); same registry governs `entity_links` | a hard-coded `entity_type CHECK(...)`; closed `resource_type CHECK(...)` | every module with entities (Health, Skills, Purposes named) |
| SP3 | Nestable tags | §3.2 | tag row carries **`parent_tag_id`** (`#a/b`); metadata `name [E]`, `color`, `icon`, `description [E]` | a flat tag table with no `parent_tag_id` | tag primitive globally |
| SP4 | Tags vs links, distinct + resolvable | §3.3 | **`entity_tags`** (grouping) and **`entity_links`** (typed reference) never merge; both draw `entity_type` from the one open registry | a single merged polymorphic table; `entity_links` on a closed CHECK enum | every tagged/linked entity |
| SP5 | `spaces` first-class entity | §3.4 | **`spaces`** row with **`root_tag_id`** (→ entity_tags spine), `name [E]`, `icon`, **`default_view_id`** (→ views), **`enabled_blocks`**, **`parent_space_id`** | a bespoke per-module Hub page (`LanguageHubPage`); a Space that is "just a tag" | any user-assembled module-like surface (replaces Hub pages) |
| SP6 | `enabled_blocks` palette | §3.4 | **`enabled_blocks`** = stored set of capability-**definition** refs (row-based junction), distinct from **`block_instances`** | `enabled_blocks` computed as a projection over placed `block_instances` | every Space |
| SP7 | Spaces-tier sync/encryption | §3.2/§3.4/§3.5 | **R3** + **R4** on `entity_tags`, `spaces`, `views`; tag/space `name`+`description` are `[E]` | plaintext tag/space names; a Spaces-tier table missing `_sync_*`/`deleted_at` | all Spaces-tier tables |

### ADR-007 — Saved Views

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| V1 | `views` first-class primitive | §3.1/§3.3 | a saved surface is a **`views`** row (filter × layout × grouping), not a component; UI renderers (`calendar-view`/`list-view`/`gallery-view`/`neural-graph`/`timeline`) are selectable, not the unit | retired **`task_views`**; Preferences per-module "custom views" store; a saved view hard-coded as a component | every saved surface (Global Calendar, Languages dictionary, Duties tabs, Bucket-List board) |
| V2 | View ownership | §3.2 | **`views.space_id`** nullable (NULL=global, set=Space-owned → `spaces.id`); `spaces.default_view_id` selects the opener | a per-module views table that can't be global/Space-owned | every saved view; every shipped Space |
| V3 | View anatomy + cross-type resolution | §3.3 | filter refs **`entity_tags`** + `entity_types` + predicates (JSON TEXT); layout ∈ `list·table·board·gallery·calendar·graph·timeline`; each layout declares required fields; unmatched types → "ungrouped" bucket, never dropped | a view hard-coded to one layout; a mixed-type view silently dropping types; a crash on missing field | every `views` row; heterogeneous views |
| V4 | Provider fan-out (INT-1) | §3.4 | **R7** — cross-module views fan out to each module's documented list/query API | direct cross-module table read; a materialized cross-module index | every module a view can select |
| V5 | View sync/encryption + states | §3.3 | **R4** on `views`; `views.name` is `[E]`; user-literal filter values `[E]`; **R5** states | `views` missing `_sync_*`/`deleted_at`; plaintext `name`; no empty/error state | every `views` row |

### ADR-008 — Capability Block Registry

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| CB1 | Open capability registry | §3.1 | pluggable units are registered capability **definitions** with a **`kind`** discriminator; definition carries `id·kind·render-targets·bindings·effects·config` | retired closed union `BlockType = StandardBlockType\|IntegrationBlockType`; a parallel `study_methods` registry | every pluggable unit that drives a Session + owns Effects (editor blocks, `@vida/ui` widgets, study-methods) |
| CB2 | Render targets + placement | §3.2 | declares **`inline`** and/or **`standalone`**; inline = editor-node attrs (no table); standalone = **`block_instances`** row (+ R4) | a capability welded to one surface with no declared render-target; a standalone instance not a `block_instances` row | every capability definition |
| CB3 | 6-part anatomy | §3.3 | resolves identity/`kind` · `config` · bindings (`session_attachments`/`entity_links`/tags) · render targets · emitted signals · universal properties (taggable/note-linkable) | a capability described as an "island" (not taggable/note-linkable); un-scoped bindings | every registered capability |
| CB4 | Guarded-write emitted signals | §3.3·5 | **R1**+**R2**; timed/measurable outcome drives a **Session** whose Effects are the S4 catalogue (`award_xp`/`log_time`/`contribute_purpose_metric`/`surface_journal`) | a capability writing a table directly or inventing its own effect channel | any capability with a write/timed outcome (pure-render caps emit nothing) |
| CB5 | `enabled_blocks` vs `block_instances` | §"enabled_blocks" | Space carries **`enabled_blocks`** (offered menu) distinct from **`block_instances`** (placements); a standalone placement is drawn from the Space's palette | conflating menu with placements; force-deleting placements on palette curation (must grandfather) | Spaces (the `spaces` row) |
| CB6 | Per-render-target terminal states | §"Terminal states" | **R5** declared per supported render target | a standalone capability with no empty/error state | every capability, per render target |

### ADR-009 — Templates: Fork-on-Instantiate

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| T1 | Portable seed-bundle template | §3.1/§3.3 | **`templates`** store (`id · name [E] · serialized bundle [E]`, +R4); bundle keyed on `root_tag` + seed entities + views + enabled capabilities + child Space structure | a template as a live graph of FKs into the vault; a bundle carrying runtime data | any Space the user can "save as template" (Languages, Health, Skills, Routines, Duties, Bucket List) |
| T2 | Fork-on-instantiate | §3.2 | deep-copy into fresh UUIDs (DATA-1) with **NO `template_id`** on instances; edits never reconcile with the template | presence of a **`template_id`** FK on instantiated entities; template→instance propagation; a live reference pointer | every template instantiation |
| T3 | Authored-vs-accumulated capture invariant | §3.1/§3.4 | captured config is **authored** structure/config only, **never accumulated** runtime data (logs/completions/journal text/progress); enforced at capture-time | a bundle carrying live entity ids / log contents / completion history | every template capture (the ZK-clean sharing bridge) |
| T4 | Preset primitive | §3.5 | a preset = saved View (ADR-007) + per-type UI/UX + default fields + optional starter Template, bound to a **type discriminator the owning module defines** | a preset modeled as a full seed bundle; a preset owning its own type discriminator | modules with a type discriminator (Tasks/Duties worked-example) |
| T5 | Instantiation terminal states | §"Terminal states" | declares **`in-progress`/`success`/`partial-failure`** (missing-capability = seed-what-it-can + flag, not crash) | instantiation that crashes when a referenced capability is absent | every instantiation flow |

### ADR-010 — Capability Authoring Security

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| A1 | Two-tier trust boundary | §3.1 | classifies capability origin as **`trusted`** (shipped, in-process) or **`untrusted`** (user-authored **or** template-imported → sandboxed); no third tier | a "promote-to-trusted"/marketplace review tier; template-imported caps treated as trusted | every capability |
| A2 | declare→grant→enforce envelope | §3.2 | **`capability_grants`** row with `capability_def_id·granted_bindings·granted_effects·media_ok·external_in_ok·external_out_ok·consented_sensitive_modules·granted_envelope_hash` (+R3/R4) | a user cap running with implicit/ambient authority; no grant record | every untrusted capability |
| A3 | Re-grant on envelope change | §3.2 | **`granted_envelope_hash`** compared to the current declaration; mismatch → **fail closed** until re-granted | an envelope edit widening privilege with no re-prompt | every granted untrusted capability whose declaration can change |
| A4 | Five-constraint permission envelope | §3.3 | attachment-scoped reads/writes; **R2** guarded-write; **R1** no-double-count; **sensitive-module consent** for `Finance`/`Health`; strict subset of shipped privileges (the §3.3 five constraints — distinct from the §3.2 *declared* 4-part envelope) | an "ambient vault access"/"read all pages" primitive; default-on sensitive effects | every untrusted capability (sensitive-consent → Finance, Health) |
| A5 | No-ambient-authority sandbox | §3.4 | no direct SQLite/network/filesystem; only the **mediated capability API**; resource limits; cannot register a shipped capability's id | a user cap with direct DB/network/fs access; in-process app-privilege exec; id impersonation | every untrusted capability |
| A6 | Hard ZK invariants under authoring | §3.5 | media stored `[E]` (**R3**); no ambient network; external reach only via declared+consented+mediated calls keyed on `external_in_ok`/`external_out_ok`; ZK-1 unconditional; compositional read+egress → **union of consents** | a plaintext media blob path; implicit network; sensitive-read + external-out with no union-consent | any capability (media); every untrusted cap (network/egress) |
| A7 | Uniform cross-platform enforcement | §3.6 | definition + **`capability_grants`** sync together (ADR-003); identical envelope web/mobile/desktop; a device that can't enforce **refuses to run** (fail closed) | per-platform divergent guarantees; running an unenforceable cap unguarded | every untrusted capability, every platform |
| A8 | Grant revocation (never permanent) | §3.2 | a grant is **revocable**; on revoke the capability **stops running immediately** (fail closed); distinct from A3 re-grant-on-change (this is the general capability-grant revoke, cf. X9 for external-integration grants) | a grant treated as permanent; a revoked cap still running | every untrusted capability |
| A9 | Sandbox resource limits | §3.4 | the sandbox enforces **CPU / memory / wall-clock** budgets; a runaway capability is **terminated** | a user cap with no resource ceiling; an unbounded runtime | every untrusted capability |

### ADR-011 — Universal Measurability & Progress Propagation

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| M1 | `measurement_kind` discriminator | §3.1 | pursuable entity carries **`measurement_kind`** CHECK ∈ `quantitative·milestone·rate·qualitative`; restores `is_higher_better·baseline_value` (metrics), `success_criteria·measurement_method` (targets) | retired **`target_type`** with **`habit_based`** (habit-driven goal is now `rate`+contribution) | **pursuable entities**: Tasks (incl. sub-tasks), Habits, Routines, Projects/Deliverables, Dreams, Knowledge objectives, Health/Finance measurables. *Excluded:* `plan_step`, reference data (contacts, notes, links) |
| M2 | `binding_mode` | §3.5 | pursuable carries **`binding_mode`** CHECK ∈ `manual·derived-pull·event-trigger`; `event-trigger` write is an S4 effect on the R1 rail; kept distinct from provenance `source{manual,auto}` | conflating `binding_mode` with `source`; a bespoke event-trigger write engine | same pursuable set as M1 |
| M3 | `progress(): [0,1]` contract | §3.4/§3.2 | stored progress is a **nullable override slot** (`NULL ⇒ derive`) — `purposes.progress`, `targets.current_value` nullable; module implements `progress()` derived-on-read | a progress/current_value col left **`NOT NULL DEFAULT 0`**; a stored-and-propagated counter | every pursuable entity |
| M4 | Fractal weighted rollup | §3.3 | `progress = Σ(child.progress × weight)/Σ weight`; laddering weight is **`contributions.contribution_percentage`**; nesting weight = per-child col (default NULL = equal-weight) | treating `contributions` as a third universal association primitive; a rollup requiring weights to sum to 100 | DOWN: sub-tasks/deliverables/milestones. UP: contributor→target→purpose |
| M5 | Measurement-source read seam | §3.6 | a module advertising a measure exposes it as a queryable source (`net_worth`/`streak(habit)`/`body_weight`/`progress(project)`) via **R7**; outage → last-known + flag | a `derived-pull` reading a source by direct table access; an outage fabricating a value | any module advertising a queryable measure (Finance, Habits, Health, Projects) |
| M6 | Acyclic binding DAG guard | §3.7 | both `derived-pull` + `event-trigger` edges count in the graph; a cycle is rejected at author time; detection owned by the core measurement service | allowing a binding cycle; relying on R1 idempotency to stop a *semantic* cycle | every measurable with bindings |
| M7 | Purpose-domain rollup tables | §Amends/§5 | Purposes doc carries **`values`·`contributions`·`purpose_reviews`·`plan_steps`**; `targets.purpose_id` nullable; provenance `source{manual,auto}` on metric-values | retired junctions **`purpose_habits`/`purpose_routines`/`purpose_projects`**; `plan_step` declaring a `measurement_kind` | Purposes & Goals (rollup apex — consumes the contract, does not own it) |

### ADR-012 — Points Economy / Consequence Engine

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| E1 | Multi-currency economy | §3.2/§5 | **`currencies`** table with **`backing_kind`** CHECK ∈ `real-money·self-granted·measured-time`; XP is *one* currency | XP as a privileged/standalone concept; stored `total_xp`/`current_level` as source of truth; no `backing_kind` | Gamification/System owns `currencies`; feeders reference it |
| E2 | `grant_currency` feeders | §3.2/§5 | a feeder names the effect **`grant_currency`** + the currency it emits (e.g. `grant_currency(XP)`); `award_xp` = its XP case (NOT retired) | a bare `award_xp` presented as the *general* mechanism | ~9 feeders: Habits·Tasks·Sessions·Routines·Check-ins·Skills·Pomodoro (any module granting points) |
| E3 | Derived-balance ledger | §3.3/§5 | **`consequence_ledger`** (`currency_id·amount(±)·kind{earn,lock,spend,distribute}·entity_type·entity_id·effect_event_id UNIQUE·at`); balances derived-on-read | retired **`xp_history`** / cols `xp_amount·action_type·level_before·level_after`; `total_xp`/`current_level` as source of truth | Gamification/System owns the ledger; readers read derived |
| E4 | Four typed Additive effects | §3.1/§5 | names **`grant_currency`·`lock_currency`·`move_money`·`surface_notification`**, each §3.2.5 **Additive** (R1) | an umbrella **`apply_consequence`** effect; labeling lock/move as "Keyed" class | rule→consequence coordinator (Gamification); `move_money`→Finance; `surface_notification`→Notifications |
| E5 | Penalties LOCK, never destroy | §3.4 | penalty uses `lock_currency`/`move_money` → `consequence_ledger` row `kind='lock'` (recoverable; clamp+flag at floor) | any penalty modeled as delete/subtract-to-zero/destroy of currency | any rule imposing a penalty |
| E6 | Finance-owned `store` layer | §3.5/§5 | **`store`** (`parent_id·node_kind{group,wrapper}·ref_type{account,investment,asset}/ref_id·is_locked·dream_id?/purpose_id?`); existing `accounts`/`investments`/`assets` untouched; net worth = Σ tree − Σ liabilities | a Finance god-table/value-holder supertype; copying balances out of owning entities; boxes as `entity_tags` | Finance owns `store`; System consumes as reward target |
| E7 | Rules = headless ADR-010 automations | §3.9/§5 | a **`rules`** construct `IF [ADR-011 binding] THEN [typed consequence set]` under an ADR-010 grant, **no render target**; condition acyclic (M6) | a rule modeled as an ADR-008 render-targeted Block | Gamification owns the coordinator; user rules → ADR-010 sandbox |
| E8 | Achievements as measurable predicates | §3.7/§5 | **`achievements.condition`** = a measurable predicate over the ADR-011 seam + event stream; level via fixed-curve config, no new table | v1 bespoke per-category checkers (~22 condition types); a new `levels` table | Gamification/Achievements |
| E9 | `user_profile` single-writer split | §3.10/§5 | Check-ins owns `check_in_streak*`; Preferences owns `persona`/`active_modules`/`onboarding_*`; `user_profile` keeps per-currency total + level (derived) + PII only | `user_profile` still writing `check_in_streak*` or `persona`/`active_modules`/`onboarding_*` | Gamification/System, Check-ins, Preferences |

### ADR-013 — Zero-Knowledge Notification Delivery

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| N1 | Three-tier delivery | §3.1 | classifies each notification: **`in-app`** (always, local encrypted row) · **`local-scheduled`** (native, from `dueIn` seam) · **`wake-signal`** (events cross-device + all web) | server composing readable push/email content; a single flat push channel | Notifications dispatcher; any module producing a notification |
| N2 | Content-free wake payload | §3.3 | off-device push payload carries **no `title`/`message`/`entity_type`/`entity_id`**; device syncs+decrypts+composes locally | a push payload including `title`/`message`/`entity_type`/`entity_id`; relying on silent `content-available` | server wake-relay + client dispatcher |
| N3 | Wake-relay (routes, never reads) | §3.6/§5 | a **`wake-relay`** on Hono fires on blob-push arrival via the ADR-003 per-user WS room, routing by owner metadata only; reads/composes/stores no content | server reading blob contents / composing notification content | `@vida/server` |
| N4 | Push tokens on device registry | §3.6/§5 | adds **`push_token`** + **`push_platform`** CHECK ∈ `apns·fcm·web` to the **existing** device record; registration via existing `/api/devices/register` | a new/parallel push-token table; a new registration route | ADR-003 device registry |
| N5 | Delivery-audit columns | §5 | `notifications` carries delivery-audit columns (which channels a row fired on; multi-device dedup) `[UNKNOWN — build-phase: exact col names]` | a `notifications` row with no per-channel fired-on audit | Notifications / `notifications` table |
| N6 | Channel matrix collapse (no SMS) | §3.4 | channels enumerate exactly `in_app`(full)·`push`(wake-only)·`email`(generic nudge) | presence of **`sms`** as a channel value; email carrying `[E]` detail | Notifications channel config; Preferences |
| N7 | Quiet-hours pre-applied | §3.2 | quiet-hours (`quiet_hours_*`) applied **at registration** (shift/suppress); a quiet-hours change reschedules | quiet-hours enforced live "at fire" for local-scheduled alerts | Notifications dispatcher (native); Preferences |

### ADR-014 — External Data Ingestion Under Zero-Knowledge

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| X1 | Device-mediated ingestion | §3.1 | device fetches→parses/normalizes on-device→encrypts (R3)→writes vault rows syncing as opaque blobs; server never a fetch proxy; a server-plaintext fetch is **refused, not downgraded** | server-side ingestion (fetch/parse/store); "silently downgraded" fetch | any module ingesting external data: Finance, Health, Books, Skills, Learning (ICS), Projects, Spaces, Fiscal&Legal |
| X2 | Three integration layers | §3.2 | classifies each connector: **`native`** · **`public-reference`** · **`user-managed`**, with the layer's honest-leak profile at the consent gate | one flat "external integration" toggle with no layers; a user-wired connector laundered as "device-side = private" | any integration in the eight modules |
| X3 | Whole-set bulk fetch | §3.2 + §5 | public datasets fetch the **whole set** (bundled/mirror/CDN), query a local copy, disclose residual (§3.2); datasets carry provenance + signature/version (§5, owed) | a per-item/scoped query against the live public source; a bundled dataset with no signature/version | public reference datasets: Fiscal&Legal rule-packs, Finance prices/FX, Books ISBN, Health food-DB, Skills exercise libs |
| X4 | Egress guard | §3.3 | vault-leaving data gets per-target explicit consent + **union-of-consents** (A6) + audit trail + **never auto-transmit** | a blanket "allow external" grant covering egress; auto-transmit; egress with no audit | any egress (Health CI-6 medical push named) |
| X5 | External grant semantics | §3.4/§5 | gates on the ADR-010 fields **`external_in_ok`** (per-source+layer) + **`external_out_ok`** (per-target) + data-scope; revocable, fail-closed, re-consent on scope change; **no new columns/table** | a new/parallel grant table or new grant column names for external data | any external-reaching capability (eight modules) |
| X6 | Compositional exfiltration | §3.1 | a cap with a sensitive read + `external_in_ok` OR `external_out_ok` treats the fetch URL/params as egress → union-of-consents (a fetch is outbound) | an `external_in` fetch treated as safe/non-egress because it's "ingress" | any cap combining sensitive read + any external grant |
| X7 | Mediator credential custody | §3.4 | encrypted **`connection_config`** (R3) held by the OS mediator, never handed to sandbox; mediator injects credential + makes the call | a sandboxed cap holding/reading a decrypted token | any authored live connection |
| X8 | Reconcile-on-import | §3.5/§5 | merge imports use **`import_staging`** (parsed rows + match metadata + per-row status), auto-match by date/amount tolerance, commit on user confirm (R1); add-only feeds dedup by natural key (`feed_id,uid`) + `is_ignored`, never delete | silent overwrite/auto-commit; deleting rather than `is_ignored` for feed dedup | merge imports (Finance CSV/OFX); add-only feeds (Learning ICS `ics_synced_events`) |
| X9 | Revocation = stop-future, keep-ingested | §3.4 | revoke halts future fetch/import (fail closed); already-committed rows stay as normal user data | revocation auto-purging already-ingested rows | any revocable integration grant |
| X10 | Integration-identity + normalization contract | §3.8/§5 | a stable **integration-identity** anchor (decoupled from layer) + a declared **per-source normalization contract** (field shape/units/dedup-key both layers emit to) | layers as three incompatible silos; a native connector whose shape differs with no migration | any source with a user-managed→native upgrade path |
| X11 | LLM calls split to ADR-015 | §3.7 | a model-involving pipeline splits: ADR-014 moves the data; **ADR-015 governs the model call** (own AI page) | an LLM/model connection folded into Layer-3 user-managed | any AI/model-touching pipeline (Books OCR, Health photo, Skills draft, Learning syllabus, Fiscal advisement) |

### ADR-015 — AI/LLM Integration Under Zero-Knowledge

| ID | Capability | § | Presence predicate | Stale/anti-signal | Applies-to |
|----|-----------|---|--------------------|-------------------|-----------|
| AI1 | Two execution modes, server blind | §3.1 + §5 | offers exactly **`on_device`** (agentic, no vault content leaves) + **`cloud`** (BYO-key, device→provider direct) as a **per-use** informed choice; neither routes through our server (§3.1 prose "On-device/agentic" + "Cloud (BYO-key)"; snake_case literals `on_device`/`cloud` in §5) | server-side/Vida-hosted AI over user data; cloud-only (no on-device); a global (not per-use) AI setting | every AI-touching module: Projects, Health, Books, Skills, Learning, Fiscal&Legal |
| AI2 | `ai_connections` config | §Amends/§5 | **`ai_connections`** (`mode{on_device,cloud}·provider·encrypted_key[L2/L3, mediator custody]·default_scope·requested_no_train`); key never in sandbox | key held by agent/sandbox; plaintext key; no `requested_no_train` | the dedicated AI management layer |
| AI3 | Cloud call = egress + scope-min | §3.3 | a cloud call rides ADR-014 §3.3 egress (X4) + **scope-minimization** (send only the needed slice) + optional redaction | sending the whole vault; auto-transmit to a provider; "encrypted in transit so private" (TLS ≠ provider-blind) | any cloud-mode AI call |
| AI4 | Agent tool-set = granted envelope | §3.4/§3.4a | agent's callable tool-set **is** its ADR-010 granted envelope (outside → fail closed); writes ride R1/R2; model call is a mediated **`askModel(scoped_slice)`** re-hitting the egress gate each hop; agent never holds the key | an agent with ambient authority / a tool outside its envelope; agent holding the key; silent on-device→cloud upgrade | any agentic AI actor (Projects agentic AI) |
| AI5 | Prompt-injection bounding | §3.4b | untrusted-origin content (OCR page, ICS event, syllabus, rule-pack) carries **provenance into the prompt**; egress slice is user-reviewed/consented; injected tool-calls still hit the X4 consent gate, can't auto-widen scope | untrusted content into a prompt with no provenance; an agent auto-composing/auto-widening an egress slice | any agent consuming ADR-014-ingested untrusted content with a sensitive-read + cloud-egress grant |
| AI6 | AI-authorship provenance | §3.6/§5 | generated rows carry **`source = ai`** (the `manual`\|`ai`\|`import` triad); persisted chat uses **`ai_conversations`** stored `[E]` | AI content with no `source` provenance; plaintext `ai_conversations` | any module persisting AI-generated content (Health, Skills, Learning) |

### Token spelling nuances (intentional — do NOT "normalize")

These variants are each correct as written; a sweep must not collapse them:
- **`in-app` (N1) vs `in_app` (N6)** — ADR-013 uses hyphen `in-app` for the *current* delivery tier and underscore `in_app` only for the *channel-config* value (quoting the v1 enum it collapses). Both greps are right; don't unify.
- **`self-granted` (E1 CHECK value) vs "self-granted allowance" (§3.2 prose)** — the SQL enum token is `self-granted`; the prose adds "allowance." Grep the enum token.
- **`ai`/`llm` (AI6 `source` value)** — ADR-015 §3.6 names the authoring triad `manual | llm/ai | import`; a doc may carry either `ai` or `llm` for the model leg. Accept both.

---

## §4. Applies-to membership rules (index)

A capability is run against a context ONLY if its membership rule selects that context. The rules (not a hand-list)
are what make coverage decidable as new contexts appear.

| Rule | Selects | Capabilities gated |
|------|---------|--------------------|
| **Has timed/scheduled/focused activity** | Books, Education, Health, Tasks, Sessions&Scheduling, Language, Pomodoro, study-methods | S1–S7, SM3 |
| **Is a study-method service** | Flashcards (now); assessments/self-test/Feynman (later) | SM1–SM4 |
| **Has taggable/linkable entities** (≈ all) | every module | SP1–SP4, R3 |
| **User can assemble a module-like surface** | Languages, vision boards, any hub | SP5–SP7, V1–V5 |
| **Ships/authors a pluggable capability or widget** | editor, `@vida/ui`, study-methods, user-authored caps | CB1–CB6, A1–A9 |
| **Can be saved as a template / has presets** | Languages, Health, Skills, Routines, Duties, Bucket List, Tasks | T1–T5 |
| **Is pursuable (goal/cascadable work-unit)** | Tasks, Habits, Routines, Projects/Deliverables, Dreams, Knowledge objectives, Health/Finance measurables, Purposes | M1–M7 |
| **Advertises a queryable measure** | Finance, Habits, Health, Projects | M5 |
| **Grants points / is an economy feeder** | Habits, Tasks, Sessions, Routines, Check-ins, Skills, Pomodoro | E1–E5, E7–E8 |
| **Owns economy substrate** | Gamification/System (currencies, ledger, achievements), Finance (`store`, `move_money`), Check-ins + Preferences (`user_profile` split) | E1, E3, E4, E6, E8, E9 |
| **Produces notifications** | any module; dispatcher = Notifications; relay = server; registry = ADR-003 | N1–N7 |
| **Ingests external data** | Finance, Health, Books, Skills, Learning, Projects, Spaces, Fiscal&Legal | X1–X11 |
| **Touches an AI/LLM model** | Projects, Health, Books, Skills, Learning, Fiscal&Legal | AI1–AI6 |
| **Universal (every syncable table / every context doc)** | all | R3, R4, R6 |

---

## §5. Definition of "aligned" (the compact per-context gate)

The Part-1 sweep judges each context against THIS checklist (drawn from §2–§4). A context is `aligned` iff every
**applicable** line passes and no anti-signal is present. (This is the master-plan gate predicate B3, made mechanical.)

- [ ] **Tagging** = `entity_tags` (SP1) — not `page_tags`.
- [ ] **Sessions** — timed/scheduled activity references the `sessions` supertype + `session_id` extension (S1) — not a flat per-module table.
- [ ] **Measurability** — if pursuable, carries `measurement_kind` + `binding_mode` (M1/M2) — not `target_type`/`habit_based`.
- [ ] **Progress** — if pursuable, stored progress is nullable (`NULL ⇒ derive`, M3) — not `NOT NULL DEFAULT 0`.
- [ ] **Economy** — if a feeder, names `grant_currency` + its currency (E2); ledger is `consequence_ledger` (E3) — not `xp_history`.
- [ ] **Capability/registry** — if pluggable, registers with a `kind` (CB1) — not the closed `BlockType` union.
- [ ] **Templates** — if template-capable, forks with no `template_id` on instances (T2); captures authored-not-accumulated (T3).
- [ ] **Notifications** — if it notifies, uses the three-tier model (N1) + content-free wake payload (N2); no `sms` (N6).
- [ ] **External data** — if it ingests, is device-mediated (X1), layered (X2), gated on `external_in_ok`/`external_out_ok` (X5).
- [ ] **AI** — if it touches a model, offers on-device+cloud (AI1), cloud=egress (AI3), `source=ai` provenance (AI6).
- [ ] **Rails** — `[E]` on user free-text (R3); `_sync_*`+`deleted_at` on syncable tables (R4); cross-module writes via R2, reads via R7, idempotent via R1.
- [ ] **Structure** — carries the As-is (FACT floor) / [INTENT] Intended split + names the ADRs it is subject to (R6).
- [ ] **No contradiction** — no claim contradicts any ADR 001–017.

---

## §6. Acceptance self-check (the LITE gate's bar)

- [x] **Every ADR 004–015 is represented** — 004(S1–S7) · 005(SM1–SM4) · 006(SP1–SP7) · 007(V1–V5) · 008(CB1–CB6) · 009(T1–T5) · 010(A1–A9) · 011(M1–M7) · 012(E1–E9) · 013(N1–N7) · 014(X1–X11) · 015(AI1–AI6).
- [x] **Every capability has ≥1 mechanical predicate** — each row's "Presence predicate" names a concrete token (or references a shared rail R1–R7).
- [x] **Every capability has an applies-to** — per-row, indexed by membership rule in §4.
- [x] **Shared rails factored** — the 7 cross-ADR mechanisms are stated once (§2), referenced by ID, not duplicated.
- [x] **No-Guessing** — no invented *table/column/enum-value* tokens (independent critic verified ~40 across all 12 ADRs); SQL-form words (`CHECK`/`UNIQUE`) are this framework's normalization (§1 convention); one `[UNKNOWN — build-phase]` (N5 exact column names), predicated on the concept the ADR names.
- [x] **Independent adversarial critique passed** — fresh subagent critic, verdict REVISE → all 3 blocking (B1 R2 read/write cross-wire · B2 A8/A9 ADR-010 coverage · B3 CHECK-token honesty) + key non-blocking fixed.
- [x] **Victor approval** — RATIFIED 2026-07-23 (LITE gate closed; Part 0 complete).

---

## Change Log
| Date | Change |
|------|--------|
| 2026-07-23 | Initial draft — extracted from ADRs 004–015 (3-agent cited pass); presented for the LITE gate. |
| 2026-07-23 | Independent critique REVISE incorporated: B1 (R2 read/write cross-wire), B2 (A8 revocation + A9 resource-limits — ADR-010 coverage), B3 (CHECK-token convention + self-check honesty); non-blocking N2/N3/N5/N6. **RATIFIED by Victor — LITE gate closed, Part 0 complete.** |
