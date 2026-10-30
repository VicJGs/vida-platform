# PLAN — F4-body/D5: ADR-002 consolidation (owed-tables ledger + write-now-vs-track)

- **Unit:** ADR revision (doc-only; foundation profile; full §XXVI gate incl. the independent adversarial pass, per
  F1/F2/F3/F6/F7 precedent). This is the **last 🔴 architectural fix** in the F1–F15 revise pass (report L136).
  F4 was split: **F4-header ✅ done** (2026-07-16 — "Amended by 003–010" + a consolidation-status note pointing at
  the ledger). **F4-body** is this unit: make the deferral _fully-scoped_ (a complete, durable owed-tables ledger)
  and _ratify D5_ (write-now vs track the DDL) as an explicit ADR-002 decision, closing the revise pass.
- **Fix:** F4 (report §Unified Fix Menu L85) — _"ADR-002 consolidation: fix amended-by header, write owed-tables
  ledger, decide write-now vs track."_ Header + a pointer are done; the **owed-tables ledger is under-scoped** (prose
  bullets in a _review_ doc) and **D5 is unratified**.
- **Decision:** D5 (report §The 7 decisions L106).
- **Severity:** 🔴 — the capstone (Purposes & Goals) and the build phase both reference tables that "exist only
  scattered across ADR prose" (throughline ① L35). Until the ledger is complete + durable, every downstream reader
  must re-derive the schema deltas from 7 separate ADRs.
- **Sources loaded (ground truth):**
  - Report throughline ① (L34-44, the owed-tables ledger as it stands) · F4 (L85) · D5 (L106) · resolution log
    F1/F2/F3/F6/F7 build-item entries (L126-134) · "Remaining" (L136).
  - **ADR-002 header + consolidation note** (L7-19: Amended-by 003–010; the ⚠ note pointing at the review-doc
    ledger) · §5 Complete Schema headings (L1254-3715, the stale v1 body) · the specific RETIRE targets: flat
    `study_sessions` (§5.10 L2549), §5.11 planner (L2771-2911), `flashcard_decks` (L2652), `flashcard_reviews`
    (L2717), SM-2 cols on `flashcards` (L2680) + on `study_topics` (L2582), Note Tags `tags`/`page_tags` (§5.2
    L1391), closed `entity_links` CHECK (L1357).
  - **Amending ADRs' own `Amends:` declarations (each names what it owes ADR-002):**
    - **ADR-004:8** — `sessions` spine + per-sub-type extension tables (`reading_sessions`/`class_sessions`/
      `workout_sessions`/`work_sessions`/`study_sessions`-redefined/`focus_sessions`, L48-50) + `planned_blocks`
      (L53) + Integration-Contract tables (`session_attachments`, §3.2.1 L57); supersedes flat `study_sessions` +
      §5.11 planner. **+ F1:** local-only `applied_effects` dedup ledger + deterministic `effect_event_id` columns.
      **⚠ ADR-004:8 says the extension set is settled but §3.1 leaves "etc." — some sub-type tables "settle at build."**
    - **ADR-005** — RETIRE `flashcard_decks`/`flashcard_reviews`/SM-2-on-`flashcards`; ADD review-engine tables
      (`review_curves`, `method_bindings`, `review_events`). `study_methods` is **NOT a base table** — it is the
      `kind='study_method'` partition of the ADR-008 registry (F2/D2), queryable via a kind-partition read/view.
    - **ADR-006:9** — RETIRE `page_tags`; **AMEND** `tags` (survives as `tags(name [E], color)` gaining
      `parent_tag_id`, L37/L75); ADD `entity_tags(tag_id, entity_type, entity_id)` (L69) + `spaces` (L21); OPEN
      `entity_links.entity_type` CHECK → registry (L87). **+ F3/D3:** the Space's `enabled_blocks` offered-capability
      **palette** = a Space↔capability-definition junction (e.g. `space_enabled_blocks`), row-based; references the
      ADR-008 registry defs; storage strategy → F10.
    - **ADR-007** — ADD `views`; RETIRE the INTENDED `task_views` + the Preferences per-module custom-views store.
    - **ADR-008:9** — ADD the capability **registry (definition)** table + `block_instances` (standalone
      _placements_, distinct from 006's `enabled_blocks` _menu_); registry `kind` column carries `study_method`
      (F2/D2); OPEN the closed `editor.ts` `BlockType` union. **⚠ ADR-008:9 literally: "Exact tables settle at build."**
      Inline instances are ProseMirror nodes synced in the page's Yjs doc — **no table** (§3.4 L123).
    - **ADR-009** — ADD a light `templates` store (user-saved bundles).
    - **ADR-010** — ADD `capability_grants` (incl. the `granted_envelope_hash` field the TOCTOU delta-check depends on).
    - **ADR-003** — ADD `_sync_field_ts TEXT` to **every** syncable table (unratified cross-ADR schema edit).
  - **F6/D4 build columns** (report L132): HLC **storage representation** for `_sync_lww_ts` + `_sync_field_ts`
    (string / BigInt / two-column — _not_ a free INTEGER pack; couples to the wire header + `blob_index`); HLC state
    persistence (`last_l`/`last_c`, home TBD); `updated_at` stays wall-ms. All **explicitly build-phase (D4-d)**.
  - **F7/D7 build columns** (report L134): `category_bidx` blind-index side column (+ keyed-BLAKE2b derivation);
    §5.19 FTS already rewritten in F7 (no further schema); analytics decrypt-in-memory (no schema).
  - **Code:** `packages/core/src/db/` schema is not yet the ~60-table DDL (prior F-items confirmed `packages/`
    diff = 0 is reachable; the schema lives in ADRs, not code, at this stage) — to be re-verified at Transform.
- **Scope guard.** F4-body **does not redesign anything** — every table's _existence and shape_ was already decided
  by its amending ADR (004–010) through its own gated session. F4-body **consolidates the record**: it (a) produces
  the complete, grounded, durable owed-tables ledger, (b) folds in the F1/F6/F7 build-column items, and (c) ratifies
  **D5** (does the SQLite DDL get written into ADR-002 §5 _now_, or does the durable ledger _become_ the tracked
  deferral until the build-phase schema session). It **corrects** ADR-002's stale-body divergence from _invisible/
  under-scoped_ to _fully-scoped + ratified_. Zero new architectural decisions; zero code.

---

## §1. Context — the spine problem (grounded, not paraphrased)

Throughline ①, verbatim (report L34-35):

> **ADR-002 has drifted out from under everything built on it 🔴 (spine problem).** Still ships the schema 004/005
> retire (flat `study_sessions`, §5.11 planner, `flashcard_decks`/`flashcard_reviews`/SM-2 columns, page-only
> `tags`+`page_tags`, closed `entity_links` CHECK). Owns **none** of the ~15 tables 004–010 declare it must hold. Its
> "Amended-by" header names only 004/005 — silent on 003, 006–010. Every Spaces ADR ships _prose field-lists, not
> DDL_. The "consolidated amendment pending in build phase" is real but **under-scoped**. → The Purposes capstone will
> reference tables that exist only scattered across ADR prose.

**What F4-header already closed (`[FACT: ADR-002 L7-19]`).** The Amended-by header now lists **003–010** (each from
its own `Amends:` line), and a ⚠ consolidation-status note declares the body "pre-amendment v1 / stale," states D5's
deferral is intentional (not silently pending), and points readers at the owed-tables ledger "_(§ throughline ①)_"
in `docs/reviews/2026-07-15-adr-critique-gate.md`. So **visibility** is fixed; the header no longer lies.

**What F4-header left open — the two residuals F4-body owns (`[FACT]`):**

1. **The ledger is under-scoped and lives in the wrong kind of document.** Throughline ① is a **review artifact** —
   a point-in-time critique, not a durable spec. It enumerates the owed tables as **prose bullets**, not a complete
   per-table delta (RETIRE / ADD / AMEND, with columns + source-ADR cite). A build engineer or the Purposes capstone
   still has to open 7 ADRs and re-derive the schema. Throughline ①'s own words: _"the consolidated amendment pending
   in build phase is real but **under-scoped**."_ Making it **fully-scoped + durable** is the residual.
2. **D5 is unratified.** The report _recommends_ (L106) "keep the consolidated ADR-002 amendment deferred to its own
   build-phase session (it's large), **but** fix the header + write the owed-tables ledger now." F4-header did the
   header + a _pointer_; the **write-now-vs-track** call itself has never been put to Victor as an explicit,
   recorded decision. The revise pass does not close until it is.
3. **The owed set is _two_ streams, and the review-doc ledger only ever held one (B1).** Throughline ①'s "~15 tables"
   is the **ADR-004…010 slice**. The adversarial pass proved ADR-002 v1 is _also_ stale against the **entire
   documentation-blueprint effort** — a grep confirms **19 `docs/features/*/structure-data.md` docs** each declare
   `[INTENT]`-marked owed ADR-002 amendments (the per-module documented target schema). That second stream is the far
   larger owed set; F4-body must make it **visible** (named completely) without **enumerating** it (that IS the
   deferred build session, per D5-a=TRACK).

**The load-bearing fact that shapes the D5 recommendation (`[FACT]`; honest bound per adversarial B3 — a _subset_
defers, not all).** Two of the amending ADRs — **ADR-004:8** and
**ADR-008:9** — state in their _own_ `Amends:` declarations that their **exact tables "settle at build"** (ADR-008:9
verbatim; ADR-004 leaves the sub-type extension set at "…etc." §3.1 L50). ADR-006's `entity_tags`/`spaces` are shaped,
but F3/D3's `space_enabled_blocks` junction has its **storage strategy explicitly deferred to F10**; F6/D4's HLC
column **representation** is **explicitly build-phase (D4-d)**; F1's `effect_event_id`/`applied_effects` columns and
F7's `category_bidx` are build items. Not _every_ owed table defers — `templates`/`capability_grants`/`entity_tags`/
`views`/`spaces` are fully-specified and drop-in (the ledger's ✓ readiness class, B3) — but because a **material
subset** does, a _complete final §5_ cannot honestly be written today without stubbing the deferred rows. This is not a
reason to leave the record scattered — it is the reason the **durable, complete ledger** (a scoped checklist of
what/where/why + a per-row readiness marker, grounded to source) is the correct artifact, and the **final DDL** is
correctly the build-phase schema session's output.

**Conclusion (`[DECISION]`, D5).** F4-body closes the revise pass by (1) writing the complete owed-tables ledger into
a **durable home** (recommend: a new ADR-002 §5.20, where the divergence is maximally visible — the F4-header note
already tells readers to "read that ledger alongside the body"), (2) folding in the F1/F6/F7 build-column items, and
(3) ratifying **D5-a = track (defer the §5 DDL rewrite to the build-phase schema session)**, with **write-now** put
fairly as the alternative (§6). The schema stops being scattered; the DDL stays honestly build-phase.

---

## §2. Invariants this unit must satisfy (business rules)

- **BR-1 (completeness — the ledger is exhaustive across BOTH owed sources; R1).** ADR-002 owes schema changes from
  **two** accepted-decision streams, not one: **(i) the ADR revise pass** — the ADR-003 §17 amendment + ADR-004…010
  `Amends:` lines + F1/F6/F7 build columns (ADR-003 has **no** `Amends:` line — its `_sync_field_ts` addition lives in
  ADR-003 §17; N1); **(ii) the module-documentation tier** — the `[INTENT]`-marked owed amendments across **all 19
  `docs/features/*/structure-data.md` docs** (the per-module _documented target schema_; grep-confirmed, B1), whose
  table-by-table consolidation **is** the build-phase schema session D5-a=TRACK defers; notable confirmed moves: `bucket_list_items`→`dreams`, exec #6/PG8; `pomodoro_sessions` re-home
  Notes→Sessions, exec #5; to-sweep: Health monitoring/biomarker/exam tables, Languages dissolution, Duties→task
  types). After F4-body, a single durable ledger enumerates **every** owed change from **both** streams, each as an
  explicit **RETIRE / ADD / AMEND** row with: the table/column, its **source (ADR `Amends:` line OR module-doc exec)**,
  and — for RETIRE — the stale ADR-002 body location it supersedes. **The §5.20 ledger carries both streams without
  silent omission:** stream (i) = fully enumerated RETIRE/ADD/AMEND rows, each with source cite + a ✓/⏳/↔ **readiness
  marker** (B3); stream (ii) = the **complete 19-doc source list** (the build session's input checklist) + the
  confirmed cross-module moves called out — **named, not enumerated** (that enumeration is the deferred build session;
  doing it now would balloon F4-body into the very rewrite TRACK defers, B1). Naming stream (ii) completely is what
  makes it **visible and tracked, never silently omitted** — the exact invisible-divergence failure F4 exists to kill.
  No owed change lives _only_ in an amending ADR's/module-doc's prose or _only_ in the review doc.
- **BR-2 (durable home, not a review doc).** The ledger lives in a **durable spec** (ADR-002 itself, recommended),
  not the point-in-time critique. The review doc may _summarize + cross-link_, but is not the system of record. The
  F4-header note's "read the ledger alongside the body" resolves to a section **in the body**.
- **BR-3 (no redesign — consolidation only).** F4-body introduces **zero** new tables, columns, or semantics of its
  own. Every entry is traceable to a _prior_ gated decision (004–010, F1–F7). Where an amending ADR left a shape at
  "settles at build," the ledger records **that**, verbatim — it does not invent the resolution (No-Guessing:
  `[FACT: source]` or `[build-phase, per ADR-00X]`, never a guessed column list).
- **BR-4 (D5 ratified + recorded).** The write-now-vs-track decision is put to Victor explicitly, its rationale
  (incl. the "settles at build" fact) stated, and the outcome recorded in ADR-002 + the report. The ⚠ note's
  "deferred per D5" stops being a forward-reference to an unmade decision.
- **BR-5 (build-phase items stay build-phase, but visible).** F1's `applied_effects` + `effect_event_id`, F6's HLC
  representation columns + HLC-state home, F7's `category_bidx` — each appears in the ledger as an **AMEND (build
  item)** row with its F-cross-ref, so the build-phase session inherits one checklist. F4-body does **not** finalize
  their DDL (that would re-open F6/D4-d and F1). **F10 cross-ref** is preserved for the sync/storage-strategy items
  (`space_enabled_blocks` storage, HLC representation/`blob_index` coupling).
- **BR-6 (retirements are reconciled, not just deleted).** Each RETIRE row names what **replaces** it and confirms
  no _other_ ADR-002 reference (index, FK, cross-domain map §8, count summary §7) still points at the retired table —
  so the eventual build rewrite has no dangling reference. (F4-body records the reconciliation targets; it does not
  execute the §5 deletions under D5-a=track.)
- **BR-7 (ADR-002 encryption/sync design untouched).** F4-body does not touch the L1/L2/L3 model, the cipher, the
  P/E classification (F7's job, done), or the HLC algorithm (F6's job, done). It only consolidates the **table
  inventory**. Zero code (`packages/` diff = 0).

---

## §3. Design — the consolidation ledger + D5

### Part A — The owed-tables ledger (the deliverable), grouped RETIRE / ADD / AMEND

The complete, grounded ledger F4-body writes into the durable home. Every row cites source; "settles at build" is
recorded verbatim where the amending ADR deferred the shape (BR-3). Counts: **~8 RETIRE, ~15 ADD, ~2 AMEND-classes.**

**RETIRE (superseded — remove from §5 at the build rewrite; reconcile all references, BR-6):**
| Retire | Stale §5 location | Superseded by |
|--------|-------------------|---------------|
| flat `study_sessions` (Learning-only) | §5.10 L2549 | ADR-004 `sessions` spine + `study_sessions` **redefined** as a 1:1 extension |
| §5.11 flat Study Planner: `study_availability`, `availability_exceptions`, `study_plan_batches`, `scheduled_study_sessions`, `session_templates` | §5.11 L2771-2911 | ADR-004 `planned_blocks` + aggregator engine (**verify per-table disposition at Transform** — some redefined, not dropped; ADR-004 §3.1) |
| `flashcard_decks` | §5.10 L2652 | ADR-005 — reviewable becomes lean content entity |
| `flashcard_reviews` | §5.10 L2717 | ADR-005 — generic review-engine (`review_events`) |
| SM-2 columns on `flashcards` | §5.10 L2680 | ADR-005 — scheduled by Knowledge's generic engine |
| SM-2 columns on `study_topics` (flag) | §5.10 L2582 | ADR-005 review-engine — **reconcile** (throughline ① flags study_topics "still carries its own SM-2 columns") |
| `page_tags` | §5.2 Note Tags L1391 | ADR-006 `entity_tags` (rows migrate) |
| INTENDED `task_views` + Preferences per-module custom-views store | §5.3 Tasks / §5.17 Prefs | ADR-007 `views` |

_RETIRE note (R2):_ the SM-2 `flashcards`/`study_topics` rows above are **column-level** removes (kept here for
locality); the opening of `entity_links.entity_type`'s CHECK is **not** a retire — it moves to AMEND below.

**ADD (new tables owed — existence/name decided by the amending ADR; shape as noted):**
| Add | Source | Shape note |
|-----|--------|-----------|
| `sessions` (spine) | ADR-004 §3.1 L45 | thin base row; shared spine |
| `reading_sessions`, `class_sessions`, `workout_sessions`, `work_sessions`, `study_sessions` (redefined), `focus_sessions` | ADR-004 §3.1 L48-50 | 1:1 extension per sub-type, keyed by `session_id`; **set at "…etc." — some settle at build** |
| `planned_blocks` | ADR-004 §3.1 L53 | aggregator-scheduled blocks |
| `session_attachments` | ADR-004 §3.2.1 L57 | Integration-Contract polymorphic attachment |
| `review_curves`, `method_bindings`, `review_events` | ADR-005 | Knowledge review-engine tables |
| `entity_tags(tag_id, entity_type, entity_id)` | ADR-006 §3.2 L69 | universal tag junction (replaces `page_tags`) |
| `spaces` | ADR-006 §3 L21 | lightweight first-class entity; membership spine = a root tag |
| `space_enabled_blocks` (junction) | ADR-006 §3.4 + F3/D3 | Space↔capability-**definition** palette (the _menu_); row-based; **storage strategy → F10** |
| `views` | ADR-007 | saved views |
| capability **registry (definition)** table | ADR-008 §3.1 | id·kind·render-targets·bindings·effects·config; `kind` carries `study_method`; **"Exact tables settle at build" (ADR-008:9)** |
| `block_instances` | ADR-008 §3.4 L123 | standalone **placements** (distinct from the `enabled_blocks` menu) |
| `templates` | ADR-009 | user-saved bundles (light store) |
| `capability_grants` | ADR-010 | incl. `granted_envelope_hash` |
| `applied_effects` (**local-only, not synced**) | ADR-004 F1 | dedup ledger, like `sync_queue` |

_Not a table (recorded to prevent re-litigation):_ `study_methods` = the `kind='study_method'` partition of the
ADR-008 registry (F2/D2), **not** a base table — queryable via a kind-partition read / optional view.
_Not a table:_ **inline** capability instances = ProseMirror nodes synced in the page's Yjs doc (ADR-008 §3.4 L123).

**Readiness split — per-row marker (adversarial B3).** The §5.20 ledger tags each ADD row so the build session knows
which are drop-in vs still-open, and so the D5-a justification stays honest (not "everything defers"):

- **✓ FULLY-SPECIFIED (ready to write as-is):** `entity_tags(tag_id, entity_type, entity_id)` (ADR-006 L69) ·
  `templates(id · name [E] · serialized bundle [E])` (ADR-009 L70) · `capability_grants(capability_def_id ·
granted_bindings · granted_effects · media_ok · external_in_ok · external_out_ok · consented_sensitive_modules ·
granted_envelope_hash)` (ADR-010 L64-65) · `views` (ADR-007) · `spaces` (ADR-006). Their columns are fully
  enumerated in their ADRs — **no** build-phase deferral.
- **⏳ BUILD-DEFERRED (shape genuinely open in-source):** ADR-004 sub-type extension set ("…etc.", §3.1 L48-50) ·
  the ADR-008 capability **registry** table ("Exact tables settle at build", ADR-008:9) · `block_instances` (same) ·
  `space_enabled_blocks` (storage strategy → F10) · the F1/F6/F7 AMEND build columns.
- **↔ TO-VERIFY:** `review_curves`/`method_bindings`/`review_events` (ADR-005 names them; confirm column shape at the
  build sweep against Knowledge structure-data).
- **Note (B2):** `fts_knowledge` (Knowledge K11, "absent today") is a **new** owed FTS5 table — F7 rewrote only the
  _existing_ §5.19 tables (pages/tasks/contacts/courses); new searchable domains owe additional FTS tables, ⏳
  build-deferred under stream (ii). "§5.19 already handled by F7" is true only for F7's scope, not owed FTS at large.

**AMEND (column-level changes across existing/all tables — build items stay build-phase, BR-5):**
| Amend | Source | Disposition |
|-------|--------|-------------|
| `_sync_field_ts TEXT` on **every** syncable table | ADR-003 | ratify formally at consolidation (currently "implicit schema edit") |
| **open `entity_links.entity_type` CHECK enum → registry** (R2 — was mis-filed under RETIRE) | ADR-006 §3.2 L87 | CHECK relaxed to the same registry as `entity_tags` |
| `parent_tag_id` on `tags` | ADR-006 §3.2 L75 | tag nesting |
| `effect_event_id` on effect-**triggering** rows; **UNIQUE** `effect_event_id` on effect-**output** rows | ADR-004 F1 | build item — cross-device convergence key |
| HLC **representation** of `_sync_lww_ts` + `_sync_field_ts` (string/BigInt/two-column) + HLC-state home (`last_l`/`last_c`); `updated_at` stays wall-ms | F6/D4-d | **build-phase (D4-d); couples to wire header + `blob_index` → F10** |
| `category_bidx TEXT` (blind index) + `idx_transactions_category_bidx` | F7/D7 | build item — keyed-BLAKE2b domain-separated derivation |

**STREAM (ii) — the MODULE-DOCUMENTATION owed tier (adversarial B1 — this was materially under-scoped in the first
draft).** The revise pass's "~15 tables" (throughline ①) was only ever the **ADR-004…010 slice**. The adversarial
pass proved ADR-002 v1 is _also_ stale against the **entire documentation-blueprint effort**: a grep confirms **19
module `structure-data.md` docs each declare `[INTENT]`-marked owed ADR-002 amendments** routing to "the standing
consolidated ADR-002 amendment." This is the per-module **documented target schema** — dozens of tables — and
**enumerating it table-by-table IS the build-phase schema session** that D5-a=TRACK defers. So F4-body's correct move
is **name this tier completely as a bounded, tracked category** (its full source-doc list below) + call out the
notable cross-module _moves_ — **not** enumerate its tables (that would be the deferred rewrite, ballooning F4-body
into the very thing TRACK defers). Naming it completely is what makes the omission **tracked, not silent** (B1).

**The complete stream-(ii) source set (all 19 — the build session's remaining input, `[FACT: grep 2026-07-17]`):**
`books` · `check-ins` · `finance` · `habits` · `journals` · `knowledge` (+ `knowledge/flashcards`) · `pomodoro` ·
`preferences` · `projects` · `relationships` · `routines` · `sessions-and-scheduling` · `skills` · `tasks` ·
`health/{core,nutrition,training}` · `learning/education` — each at `docs/features/<module>/structure-data.md`. (Plus
the **dissolved** modules whose schema landed elsewhere: Bucket List → `docs/intake/bucket-list.md`; Duties →
`docs/intake/duties.md`; Languages content under `docs/features/languages/`.)

**Notable cross-module MOVES called out explicitly (examples, not the whole tier):**
| Move | Kind | Source | ADR-002 site |
|------|------|--------|--------------|
| `bucket_list_items` → **collapse into `dreams`** | RETIRE + AMEND | Bucket List dissolution (PG8) | §5.14 L3316 → `dreams` §5.7 L1928 |
| `pomodoro_sessions` → **re-home Notes→Sessions**, keyed by `session_id` | AMEND (move) | Pomodoro exec #5 | §5.2 L1450 → Sessions realm |
| `skill_resources` → `entity_links`; `knowledge_notes`/`resource_urls` superseded | RETIRE | Skills / Knowledge structure-data | §5.10 |

_Why named-not-enumerated (consistent with D5-a=TRACK)._ The stream-(i) ledger is enumerated because it is the
revise-pass's finite, already-analyzed slice. Stream (ii) is the full v2 module schema; consolidating it into DDL is
**definitionally** the deferred build-phase session. F4-body therefore delivers stream (ii) as a **complete pointer**
(the 19 docs = the build session's checklist of inputs) so nothing is silently omitted, while honoring TRACK by not
doing the enumeration now. §5.20 states both: stream (i) tables + the stream-(ii) source list.

### Part B — Where the ledger lives (D5-b, the durable home)

- **Recommend: a new ADR-002 `### 5.20 Pending Consolidation (build-phase owed tables)`** — the ledger travels
  _inside_ the schema doc, exactly where the F4-header ⚠ note tells readers to look ("read that ledger alongside the
  body"). The §7 Table Count Summary + §8 Cross-Domain map get a one-line forward-note ("+N tables pending per
  §5.20"). Maximally visible; the review doc becomes a _cross-link_, not the system of record (BR-2).
- **Alternative:** a dedicated `docs/core/decisions/ADR-002-addendum-owed-tables.md`. Cleaner separation, but adds a
  file a reader must know to open — weaker on visibility. Rejected unless Victor prefers separation.
- **Rejected:** leaving it in the review doc (status quo — a review artifact is not a durable spec; BR-2).

### Part C — The write-now-vs-track decision (D5-a), grounded

- **Recommend: TRACK** — the ledger (Part A) _is_ the deferral artifact; the §5 DDL rewrite happens at the
  build-phase schema session. Grounds (softened per adversarial B3 — the honest version): (1) **a material subset of
  the owed shapes are genuinely build-deferred in-source** — ADR-008:9 "Exact tables settle at build," ADR-004's "…etc."
  sub-type set, F3/D3 `space_enabled_blocks` storage → F10, F6/D4-d HLC representation → build, F1/F7 columns → build —
  so a **complete, final §5 rewrite cannot honestly be written now** without pre-empting them (and you don't ship a
  _half_-written §5 with the deferred rows stubbed). _Not_ claimed: that **every** table defers — several (`templates`,
  `capability_grants`, `entity_tags`, `views`, `spaces`) are fully-specified and drop-in (the ✓ readiness class), which
  is exactly why the ledger carries the readiness marker (B3). (2) **The true owed set is far larger than "~15 tables"**
  — stream (i)'s ADR slice **plus** stream (ii)'s 19-module documented schema **plus** the `_sync_field_ts` + HLC deltas
  across ~60 tables; consolidating all of that into DDL **is** the build-phase schema session (which also writes the
  Drizzle schema in `packages/core`) — hand-writing it now creates a second artifact to keep in sync. (3) A **complete**
  §5.20 (stream (i) enumerated + stream (ii) source-list) already delivers "one source of truth" — _scoped_, not
  _scattered_ — which is throughline ①'s actual demand.
- **Alternative: WRITE-NOW** (put fairly, §6). Rewrite §5 with the consolidated DDL so ADR-002 is a single whole
  schema. Benefit: no "read two places." Cost: freezes build-phase-deferred shapes prematurely; large churn; a DDL
  doc that diverges from the eventual Drizzle schema. My rebuttal: a complete §5.20 gets the "one place" benefit
  without the premature freeze — so TRACK dominates unless Victor wants the whole schema inlined now.

### Part D — Ratify ADR-003's implicit edit + the F1/F6/F7 fold-in

- The `_sync_field_ts` addition is currently marked in the header _"Implicit schema edit — ratify formally at
  consolidation."_ F4-body **formally ratifies** it in the ledger (moves it from "implicit" to an AMEND row).
- The F1/F6/F7 build columns become explicit **AMEND (build item)** rows (Part A), each with its F-cross-ref, so the
  build session inherits one checklist instead of re-reading three F-specs. F4-body does **not** finalize their DDL.

### Part E — Report + header reconciliation (edit the record, not the schema)

- Tick **F4** (both header ✅ + body) in the report resolution log with the D5-a/D5-b outcome; update "Remaining"
  (L136) — after F4-body, **no 🔴 architectural fix remains**; only 🟢 F10–F15 tracked-for-build.
- Update the ADR-002 ⚠ consolidation note (L19): repoint "the owed-tables ledger" from the review doc to the durable
  home (§5.20, per D5-b), and record "D5-a = track (ratified <date>)."
- **Close the F1–F15 revise pass** in the report (a one-line pass-complete marker + the standing 🟢 F10–F15 list).

---

## §4. Acceptance

- [ ] **Ledger complete — BOTH streams (BR-1 · R1 · B1):** stream (i) — every owed change across the ADR-003 §17
      amendment + ADR-004…010 `Amends:` lines + F1/F6/F7 appears as a RETIRE/ADD/AMEND row, cross-checked table-by-table,
      each ADD row carrying a ✓/⏳/↔ readiness marker (B3); stream (ii) — the **complete 19-doc source list** is present
      (books · check-ins · finance · habits · journals · knowledge[+flashcards] · pomodoro · preferences · projects ·
      relationships · routines · sessions-and-scheduling · skills · tasks · health/{core,nutrition,training} ·
      learning/education + dissolved intake/{bucket-list,duties}) with the confirmed moves called out
      (`bucket_list_items`→`dreams`, `pomodoro_sessions` re-home, `skill_resources`→`entity_links`). Every RETIRE row
      names its stale §5 location + replacement; no owed change lives only in an amending ADR's/module-doc's prose or
      only in the review doc.
- [ ] **Stream (ii) named-not-enumerated (B1 · TRACK):** the 19 module docs are listed as the build session's input
      checklist; stream-(ii) tables are **not** enumerated table-by-table in §5.20 (that IS the deferred build session)
      — the ledger points at them completely rather than reproducing them.
- [ ] **B2 — owed FTS visible:** `fts_knowledge` (and the general "new searchable domains owe new FTS5 tables") is
      noted; the "§5.19 already handled by F7" claim is scoped to F7's existing tables, not owed FTS at large.
- [ ] **Durable home (BR-2 / D5-b):** the ledger lives in the chosen durable location (recommend ADR-002 §5.20); the
      F4-header ⚠ note is repointed there; the review doc is a cross-link, not the system of record.
- [ ] **D5 ratified (BR-4):** the write-now-vs-track call is recorded in ADR-002 + the report with rationale
      (incl. the "settles at build" fact); the ⚠ note states the outcome, no longer forward-references an unmade call.
- [ ] **Build items visible but not frozen (BR-5):** `applied_effects`/`effect_event_id` (F1), HLC representation +
      state home (F6), `category_bidx` (F7) each appear as AMEND (build item) rows with F-cross-refs; **none** has
      finalized DDL that would re-open F6/D4-d or F1; F10 cross-ref preserved.
- [ ] **ADR-003 ratified (Part D):** `_sync_field_ts` moves from "implicit schema edit" to a formal AMEND row.
- [ ] **No redesign (BR-3):** zero new tables/columns/semantics originate in F4-body; every row is traceable to a
      prior gated decision; "settles at build" shapes are recorded verbatim, not guessed.
- [ ] **Reconciliation targets recorded (BR-6):** each RETIRE row's other-reference points (index/FK/§7 count/§8 map)
      are listed for the build rewrite; no dangling reference is _created_ by F4-body.
- [ ] **Design untouched (BR-7):** L1/L2/L3, cipher, P/E rule, HLC algorithm unchanged; **`packages/` diff = 0**.
- [ ] **Revise pass closed (Part E):** report ticks F4; "Remaining" shows no 🔴; F1–F15 pass-complete marker + 🟢
      F10–F15 standing list present.
- [ ] **Grep verify:** the durable ledger enumerates each name in the ADR-003 §17 addition + the 004–010 `Amends:`
      lines + F1/F6/F7 build cols; `grep` for the retired names (`flashcard_decks`, `page_tags`, flat `study_sessions`)
      shows each marked RETIRE/superseded; the stream-(ii) doc-list covers the grep-confirmed 19; the ⚠ note points at
      the durable home, not the review doc.

---

## §5. Implementation prompt (after Approval 2)

Edit in order (exact home/DDL-vs-track finalized once D5-a/D5-b chosen at Approval 1):

1. **ADR-002 durable ledger (D5-b = new §5.20)** — write the Part A ledger, **both streams**:
   **(i) ADR-revise-pass** — RETIRE/ADD/AMEND rows grounded to the 003 §17 amendment + each 004–010 `Amends:` line
   (N1); "settles at build" verbatim where deferred; the ✓/⏳/↔ **readiness marker** per ADD row (B3); F1/F6/F7 AMEND
   rows + F10 cross-refs; formal ratify of ADR-003's `_sync_field_ts` (Part D). **(ii) module-documentation tier** —
   **named, not enumerated** (B1; enumerating it IS the deferred build session, per TRACK): write the **complete list
   of the 19 source docs** (`docs/features/<module>/structure-data.md` for books · check-ins · finance · habits ·
   journals · knowledge[+flashcards] · pomodoro · preferences · projects · relationships · routines ·
   sessions-and-scheduling · skills · tasks · health/{core,nutrition,training} · learning/education; + dissolved
   `docs/intake/{bucket-list,duties}.md`) as the build session's input checklist, and call out the confirmed
   cross-module **moves** (`bucket_list_items`→`dreams`; `pomodoro_sessions` re-home; `skill_resources`→`entity_links`).
   Do **not** enumerate stream-(ii) tables (No-Guessing + TRACK). `fts_knowledge` noted as an owed new-domain FTS (B2).
2. **ADR-002 ⚠ consolidation note (L19)** — repoint "owed-tables ledger" → the durable home; record D5-a outcome
   ("track, ratified <date>" or "written inline"); if D5-a = write-now, instead execute the §5 RETIRE/ADD/AMEND DDL
   edits + reconcile §7 count / §8 map / indexes / FKs (BR-6) — larger path, only if chosen.
3. **§7 Table Count Summary + §8 Cross-Domain map** — one-line forward-note ("+N pending per §5.20") under D5-a=track.
4. **report** — tick F4 (header ✅ + body); update "Remaining" (no 🔴 left); add the F1–F15 pass-complete marker +
   the 🟢 F10–F15 standing list; cross-link the durable ledger.
   Then **Verify** (grep + read): the ledger covers every `Amends:` line + F1/F6/F7 cols; retired names marked
   superseded; ⚠ note repointed; ADR-002 encryption/sync design + `packages/` diff = 0. Run the §XXIX check (foundation
   profile — ADRs _are_ the durable docs; N/A to CURRENT- module docs, note it).

---

## §6. Decisions (Approval 1 — pending Victor)

**Two decisions, both with a clear recommendation; laid out per your sign-off preference for foundational calls.**

- **D5-a (the call) — RECOMMEND TRACK (defer the §5 DDL rewrite; the complete §5.20 ledger is the tracked artifact),
  with WRITE-NOW as the alternative.**
  - **TRACK.** Write the complete owed ledger into a durable home now; the actual §5 DDL rewrite happens at the
    **build-phase schema session** — the same session that expresses it as Drizzle in `packages/core`. _Why I lean here
    (honest version, post-adversarial-B3):_ (a) a **material subset** of the owed shapes are genuinely build-deferred
    in-source — "Exact tables settle at build" (ADR-008:9), ADR-004's "…etc." sub-types, F3/D3 storage → F10, F6/D4-d
    HLC representation, F1/F7 columns — so a **complete, final §5 can't honestly be written now** (you'd stub the
    deferred rows); _not_ every table defers — `templates`/`capability_grants`/`entity_tags`/`views`/`spaces` are
    drop-in (the ledger's ✓ readiness class). (b) The **true owed set is far bigger than "~15"** — stream (i)'s ADR
    slice **plus** stream (ii)'s 19-module documented schema **plus** the `_sync_field_ts`/HLC deltas across ~60 tables;
    consolidating all of it into DDL **is** the build session. A _complete_ §5.20 (stream (i) enumerated + stream (ii)
    named) already gives the capstone + build one scoped source of truth — throughline ①'s actual demand.
  - **WRITE-NOW.** Rewrite ADR-002 §5 into a single consolidated schema now (RETIRE + ADD + AMEND inline), reconcile
    §7/§8/indexes/FKs. Benefit: ADR-002 is one whole schema; no "read two places." Cost: freezes build-deferred
    shapes prematurely, large churn, and creates a hand-written DDL doc that will diverge from the eventual Drizzle
    schema. _My rebuttal:_ a complete §5.20 delivers the "one place" benefit without the premature freeze.
  - **My lean: TRACK.** But if you want ADR-002 to read as a finished schema today and accept re-touching it when the
    build shapes settle, WRITE-NOW is coherent. **Your call.**
- **D5-b — RECOMMEND the durable home = a new ADR-002 §5.20** (ledger travels with the schema doc, maximally visible,
  matches the F4-header note). **Alternative:** a dedicated `ADR-002-addendum-owed-tables.md` (cleaner separation,
  one more file to know about). **Rejected:** leaving it in the review doc (not a durable spec).

---

## §7. Status

- [x] Spec written (gate 1)
- [x] /critique run → **REVISE (R1/R2/R3)** → all fixed. **R1** (blocking, the real catch) = the ledger claimed
      "single source of truth / every owed change" but was scoped only to ADR-003–010 + F1/F6/F7, **silently omitting**
      the documentation-blueprint **module-reframe** schema changes owed to ADR-002 (confirmed: `bucket_list_items`→
      `dreams`; `pomodoro_sessions` re-home Notes→Sessions; to-sweep: Health/Languages/Duties) — the exact
      invisible-divergence failure F4 exists to kill → BR-1 reframed to **two owed streams**, a module-reframe bucket added
      to Part A. _(This /critique fix was itself only a sliver — the adversarial B1 below proved the real second stream
      is the complete 19-doc module tier, and superseded this bucket with the named-not-enumerated tier.)_
      **R2** = opening `entity_links.entity_type`'s CHECK was mis-filed under RETIRE (it's an AMEND) → moved; SM-2
      removals labelled column-level. **R3** = acceptance didn't require the R1 sweep or the flagged §5.11/study_topics
      reconciles → added. Affirmed sound: **D5-a=TRACK** (the "settles at build" grounding verified against ADR-008:9/
      ADR-004/F10/D4-d) + the **ADR-Amends half is complete** (ADR-004 tables = session_attachments + applied_effects
      only; 007=`views`; 009=`templates` — verified) + **consolidation-only holds** (every row = a prior gated decision).
- [x] Approval 1 — **RATIFIED by Victor 2026-07-17: D5-a = TRACK (defer the §5 DDL rewrite to the build-phase schema
      session; the complete §5.20 ledger is the tracked artifact) · D5-b = new ADR-002 §5.20 (durable home).**
- [x] /preflight → **PASSED** (doc-only; D5-a=TRACK ratified). Assumptions surfaced: **A1** = the R1 sweep paths
      confirmed to exist (`docs/features/{pomodoro,sessions-and-scheduling,health,languages,purposes-and-goals,tasks}/` + `docs/intake/{bucket-list,duties}.md`) → folded into §5 so the sweep is executable-as-written; **A2** owed-table
      definition made explicit; **A3** confirmed cites heading-accurate, fold-in fields read at Transform; **A4** §5.20
      slots between §5.19 (L3663) and §6 (L3716). No blocking gaps.
- [x] Independent adversarial critique (fresh refuter, given the spec + all 10 ADRs + `docs/features/*`/`docs/intake/*`)
      → **REFUTED on 2 of 4 claims** → all closed. **Core survived** (No-Redesign SURVIVES — no invented row;
      Grounding SURVIVES — every spot-checked cite accurate incl. ADR-008:9 verbatim, the RETIRE §5 line locations, the
      §5.20 slot). The load-bearing catches: - **B1 (blocking — the big one):** Completeness REFUTED. Bucket (ii) as first-drafted (Health/Languages/Duties)
      was a _sliver_ — a grep proves **19 `docs/features/*/structure-data.md` docs** owe ADR-002 amendments (Skills,
      Knowledge, Books, Routines, Relationships, Journals, Projects, … all routing to "the standing consolidated
      ADR-002 amendment"), none reachable by the §5 sweep paths → **still the silent-omission failure F4 exists to
      kill.** Fixed: stream (ii) reframed to the **complete 19-doc module tier, named-not-enumerated** (enumerating it
      IS the deferred build session, per TRACK); BR-1 + Part A + §4 + §5 + §1 residual #3 all rewritten; the full
      source-list is now the build session's checklist. - **B2 (blocking):** owed `fts_knowledge` (Knowledge K11, "absent today") missed; "§5.19 handled by F7" was a
      blanket claim → scoped to F7's existing tables; new-domain FTS noted as owed/⏳ build-deferred. - **B3 (blocking):** the TRACK _justification_ ("the ADRs defer their shapes → can't write DDL now") overstated —
      `templates`/`capability_grants`/`entity_tags`/`views`/`spaces` are fully-specified, **not** deferred → softened
      to "a _material subset_ defers, so a _complete final §5_ can't honestly be written" + added a **✓/⏳/↔ per-row
      readiness marker** to the ADD ledger so the build session knows which are drop-in. TRACK _decision_ unaffected. - **N1:** ADR-003 has **no** `Amends:` line (its `_sync_field_ts` is in ADR-003 §17) → all "003–010 Amends"
      references corrected. **N2:** ADR-008:9 cite verbatim-correct, no change.
- [x] Approval 2 — **RATIFIED by Victor 2026-07-17** (B1 named-not-enumerated scope for stream (ii) signed off; B2/B3/N1
      fixes accepted; TRACK · §5.20 unchanged; no direction change).
- [x] **Implement + Verify — DONE 2026-07-17.** Wrote **ADR-002 §5.20 (Pending Consolidation)** — the durable
      owed-tables ledger: Stream (i) enumerated (RETIRE/ADD/AMEND, ✓/⏳/↔ readiness markers), Stream (ii) = the 19-doc
      module tier named as the build-session checklist + confirmed moves; `_sync_field_ts` formally ratified; `entity_links`
      CHECK moved to AMEND; `fts_knowledge` noted. Repointed the ADR-002 ⚠ note (L17) → §5.20; forward-notes on §7 count + §8 map. **Verify caught 1 drift** (as F6/F7 each did): **ADR-006 L122** still named the review doc as the ledger
      home → repointed to §5.20; **ADR-004 L123** sharpened to name §5.20. **Verify PASS:** §5.20 covers every ADR name + F1/F6/F7 cols + the 19-doc list (readiness 8✓/14⏳/4↔); retired names marked RETIRE; no live doc points at the
      review doc as the owed-tables _home_; ADR-002 encryption/sync **design** untouched (only header + §5.20 + §7/§8
      notes); **`packages/` diff = 0** (zero code). §XXIX N/A (foundation — no `docs/modules/`; ADR-002 §5.20 IS the
      durable doc). Changed: ADR-002 · ADR-004 · ADR-006 · report · this spec.
- [x] **Revise pass F1–F15 CLOSED (2026-07-17).** F4-body was the last 🔴 architectural fix. Report carries the
      pass-complete marker + a top-of-doc RESOLUTION banner + the 🟢 F10–F15 build-phase standing list. No ADR edit owed.
