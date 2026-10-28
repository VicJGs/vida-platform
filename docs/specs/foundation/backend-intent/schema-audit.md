# schema-audit.md — P2 · Schema + Types Reconcile Audit Report

> **Phase:** P2 of the backend-replan campaign (ADR-021 · `docs/roadmap/backend-consolidation-plan.md`).
> **Consumes:** `corpus.md` + `parts/*.md` (P1 ground truth). **Gate:** this report is the input to the
> **audit-report gate = Approval 2** (plan §7.2) — an independent adversarial critic verifies every finding
> BEFORE any fix is applied.
> **Companion files:** `schema-audit-appendix.md` (full 435-item roster) · `schema-audit-deferred-homes.md`
> (the 117 deferred items grouped by home).
> **Source:** audit Workflow `wf_f7ecb25f-a91` — 31 auditors + triage, 32 agents, 2.43M tok, ~105 min,
> 31/31 domains returned. Authored 2026-09-14.

---

## 0. Method recap (what was audited)

Per plan §2–§3: the **31 schema files** (19 domain `schema/*.ts` + 12 `schema/foundation/*.ts`) were
cross-mapped **N:M** to the corpus's 34 parts, and only the **schema-implicating subset** (§2 filter:
persisted derivations · column/table/index/CHECK-naming deferred flags · `measurement_kind`/`binding_mode`
AMENDs · new-vocab CHECKs · inferred `*_bidx` · Part-D UNKNOWNs homed to P2) was classified
ALIGNED / GAP / DIVERGENT / DEFERRED with a FACT cite on both sides. Pure service logic (no persisted shape)
was excluded (→ P3). `notes.ts` was NOT audited — it is the §4 rebuild.

---

## 1. Executive summary & reconcile verdict

**435 schema-implicating items classified:**

| Class           | Count | Meaning                                               |
| --------------- | ----: | ----------------------------------------------------- |
| **ALIGNED**     |   312 | schema already supports it (cite present)             |
| **DEFERRED**    |   117 | legitimately later — **0 unhomed** (all carry a home) |
| **DIVERGENT**   |     6 | schema vs corpus tension — **all resolved below**     |
| **GAP**         | **0** | _no corpus-proven shape the schema lacks_             |
| bidx candidates |     8 | inferred equality-over-`[E]` needs                    |

**fixKind distribution (non-DEFERRED):** `none` 184 (verify-only) · `expose` 112 (types/validators, **no
migration**) · `check-vocab` 20 (parity/CHECK verification) · `move-vocab` 1 (already-retired) · `add-migrate` 1.

**Verdict: RECONCILE CONFIRMED (targeted, not a redo).** The **0-GAP** result validates the ADR-021 §3.3
thesis — DB-4's holistic Model-B build already carries the backend intent. The reconcile is overwhelmingly
**expose-in-types + parity verification**, plus the notes-hub rebuild. **The only new DDL migration P2 needs
is `033_notes.ts`** (the notes hub); every other candidate change is either expose-only (no migration) or
defers to its owning module build. Three genuine dispositions require an Approval-2 ruling (§9).

The audit's highest-value output is the set of **anti-gaps** — guards proving where a column must _not_ be
added (Books/Finance/Relationships must not carry `measurement_kind`; a would-be AMEND there is a bug). These
prevent manufactured work and are as binding as the positive findings.

---

## 2. Headline per-domain result

| Domain           |   A |  Di |  De | bidx | Domain                    |   A |  Di |  De | bidx |
| ---------------- | --: | --: | --: | ---: | ------------------------- | --: | --: | --: | ---: |
| books            |  14 |   0 |   3 |    0 | notifications             |  10 |   0 |   3 |    1 |
| check-ins        |   7 |   1 |   2 |    0 | preferences               |   9 |   0 |   3 |    0 |
| finance          |  10 |   0 |   7 |    1 | projects                  |  11 |   0 |   5 |    0 |
| gamification     |   7 |   1 |   5 |    0 | purposes                  |  11 |   0 |   7 |    0 |
| habits           |  13 |   0 |   2 |    0 | relationships             |  14 |   0 |   5 |    2 |
| health-core      |  15 |   0 |   6 |    0 | routines                  |  13 |   0 |   4 |    0 |
| health-nutrition |  14 |   0 |   5 |    2 | skills                    |  13 |   0 |   3 |    2 |
| health-training  |  16 |   0 |   7 |    0 | tasks                     |  10 |   2 |   6 |    0 |
| journals         |   2 |   0 |   3 |    0 | **foundation** (12 files) |  91 |   1 |  27 |    0 |
| knowledge        |  11 |   0 |   8 |    0 | learning                  |  21 |   1 |   6 |    0 |

Full roster: `schema-audit-appendix.md`.

---

## 3. DIVERGENT dispositions (6 — all resolved)

| #   | Item                                                                                                                                                                                                                                                                        | Class of divergence                                                                                                                                        | Disposition                                                                                       | Migration? |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | :--------: |
| D1  | **check-ins CHE-22** — corpus says `template_id` SET NULL/CASCADE; schema is no-FK plain TEXT                                                                                                                                                                               | **stale-corpus-wording** — schema is CORRECT per ADR-016 §3.4 (no cross-table FK; app-layer referential behavior). Comments already note `(was SET NULL)`. | No action — FK semantics are P3 service-owned.                                                    |     No     |
| D2  | **gamification GM-14** — corpus says `user_achievement.achievement_id` "FK CASCADE"; schema no-FK plain TEXT                                                                                                                                                                | **stale-corpus-wording** — v1-residue phrasing; ADR-016 §3.4 mandates no-FK/app-cascade.                                                                   | No action — flag corpus wording as stale, not schema.                                             |     No     |
| D3  | **tasks TAS-27** — corpus says migrate inline `tasks.tags` JSON → `entity_tags`                                                                                                                                                                                             | **aligned-by-absence** — v2 schema never authored an inline tags column (ADR-006 SP1, Spaces-owned).                                                       | No action — migration is a no-op here.                                                            |     No     |
| D4  | **learning LEA-64** — `course_type`: keep subject-level modality vs drop (mode now at Institution/Self-taught level)? _(Part-D UNKNOWN homed to P2)_                                                                                                                        | **open P2 disposition** — column authored & nullable; schema's own lean = keep as modality.                                                                | **Ratify keep-as-modality** (§9 O1) → then expose. No migration either way.                       |     No     |
| D5  | **tasks TAS-24** — `kind` is FIXED CHECK (2-value `TASK_KIND`); corpus wants it OPEN/user-extensible (Duties dissolution → `standard\|obligation\|duty\|…`)                                                                                                                 | **intent-vs-shape tension** — TAS-24 is `⚠ INTENDED` build-phase (ADR-002 amendment); the widening ships with Duties dissolution, not now.                 | **Keep FIXED now** (§9 O2); drop the CHECK to plain TEXT when the widening lands (its own build). |  No (now)  |
| D6  | **foundation/knowledge-review `XCU-17 [xcut-review]`** — corpus names TWO caps (`new_cards_per_day` + `reviews_per_day`); schema has a single generic `daily_cap`. _(NB: `XCU-17` is a domain-scoped id — distinct from the finance `move_money` `XCU-17 [xcut-economy]`.)_ | **shape divergence** (`add-migrate` candidate) — but the consuming review engine is MOD-knowledge (M1.2).                                                  | **Defer to MOD-knowledge M1.2 build** (§9 O3) with home; or split now if Victor prefers.          |  Deferred  |

**Net: 3 no-action (stale wording / absence), 1 ratify-keep (D4), 1 keep-FIXED (D5), 1 deferred-shape (D6).**
Zero DIVERGENT forces a migration now. D1/D2 also confirm a **platform-wide pattern**: the corpus's FK-cascade
phrasing lags the no-FK convention everywhere — noted, not fixed per-domain.

---

## 4. Blind-index (`*_bidx`) verdict (8 candidates)

The `*_bidx` inference (equality-lookup/filter over an `[E]` field — NOT full-text, which is FTS5/DB-8) was
deliberately restrained. Consolidated ruling:

| Candidate                              | Verdict                                        | Reason                                                                                                                                                                                            |
| -------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transactions.category_bidx` (finance) | **PRESENT — expose only**                      | recurring analytics GROUP-BY over `[E]` category (FIN-30/FIN-22); the named precedent, already authored + indexed (`finance.ts:86`).                                                              |
| `nutrition_ingredients.name_bidx`      | **Defer-add → nutrition build (M1.2)** (§9 O3) | genuine recurring equality probe (HEA-28 barcode scan vs local food-DB copy) — structurally identical to `category_bidx`. Consuming service is not M1.1-now → home it, author at nutrition build. |
| `shopping_items.name`                  | **REJECT**                                     | one-shot small-N in-service de-dup (single-user local DB); no blind index warranted.                                                                                                              |
| `contacts.email` / `contacts.phone`    | **REJECT**                                     | REL-08 import dedup is one-shot small-N over decrypted rows in-service; the `category_bidx` precedent is recurring large-N analytics, not import dedup.                                           |
| `skill_definitions.name`               | **REJECT**                                     | SKI-24 add-only import dedup — same one-shot small-N reasoning.                                                                                                                                   |
| `notifications.entity_id`              | **correctly rejected**                         | `entity_type`/`entity_id` are PLAINTEXT (NF-11) → plain index, no bidx.                                                                                                                           |
| `skills.name`                          | **correctly rejected**                         | roster groups by plaintext `domain`, not `[E]` name.                                                                                                                                              |

**Net: 1 present (expose), 1 defer-add (nutrition), 4 reject, 2 correctly-rejected. No auditor manufactured a
bidx over a plaintext or full-text field.** The **REJECT** rulings are recorded so a later pass does not
silently auto-add `email_bidx`/`phone_bidx` and manufacture a gap (a standing anti-gap).

---

## 5. Cross-cutting reconciles (7 — one decision each, applied uniformly)

1. **`measurement_kind` × `binding_mode` axes (ADR-011)** — single-sourced from `packages/types/src/measurement.ts`
   (4-value + 3-value tuples). All pursuable domains author the pair as **inert nullable columns → expose-only,
   zero migrations**. **Anti-gap guards equally binding:** Books (`reading_plans`, C-M1), Finance (C6 feeder),
   Relationships (C1 contacts) MUST NOT carry them. Learning uses a separate `education_measurements` table
   (a deliberate storage variant → its own `@vida/types` interface).
2. **Nullable `progress`/`mastery`/`current_value` override slot (NULL⇒derive @ M3)** — one reframe applied
   identically (retires the As-is `NOT NULL DEFAULT 0` floor). **Expose-only**, but reconcile every `@vida/types`
   interface's field to `number | null` as **ONE batch** (DB-11 mirror sweep) — no per-domain nullability drift.
3. **Inline `tags` retired → `entity_tags` (ADR-006 SP1)** — already landed platform-wide (no inline column
   anywhere); `_registry.ts` already carries every flagged `entity_type`. No domain owes a column or registry edit.
4. **v2 `pages` table — NOT YET AUTHORED** _(BLOCKING → §11)_ — ~9 domains route load-bearing intent "to a
   pages row" (PRO-24 mission, REL-49 descriptions, BOO-16/17 notes, KN-5, CHE-14, task notes). This is exactly
   the **§4 notes-hub rebuild**; those deferrals are homed there, not per-domain gaps.
5. **Session sub-type extension shape** — `reading/workout/class_sessions` all = base `sessions` row + 1:1
   `session_id UNIQUE`, no-FK, **no `deleted_at`** (base owns lifecycle). Verified consistent; no reconcile.
6. **`effect_event_id` + UNIQUE convergence key (ADR-012)** — lands ONLY on effect-CONSUMER output rows
   (notifications now; gamification ledger; finance cost events) — never on producer/extension tables.
   Health-training correctly DEFERS its output-row columns (XCU-28 → AR-9/M4). Coherent; no action.
7. **`source`/provenance triad (manual\|ai\|import, AI6)** — one FIXED closed-triad convention on AI/import-writable
   rows. **Naming drift to reconcile:** health uses `'ai'`, training uses `'llm'` for the same slot (§9 O4).

---

## 6. Coherence-flag dispositions

| Flag (severity)                                                    | Disposition                                                                                                                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **[blocking] v2 `pages` not authored**                             | = the §4 notes-hub rebuild. Confirms §4 is the top P2 dependency (not a gap). Resolved by building `033_notes.ts` (§11).                                                                   |
| **[review] REL-08 email/phone bidx**                               | **NO bidx** (§4 ruling) — small-N single-user in-service dedup. Recorded to prevent a manufactured gap.                                                                                    |
| **[review] nutrition barcode vs shopping-list bidx**               | **split the decision**: `nutrition_ingredients.name_bidx` is real (defer-add, O3); `shopping_items.name` rejected.                                                                         |
| **[review] user_profile single-writer split (E9)**                 | **Verify** at fix-time: `check_in_streak*` removed from `user_profile` (Gamification #21 landed?) + receive columns present in `user_preferences`; no field with two/zero writers (§8 V1). |
| **[review] health-training `exercise_plans.status` OPEN vs FIXED** | corpus lists a 4-state ladder `{draft·active·deload-week·completed}` — smells FIXED. **Disposition O5** (§9): FIXED-with-CHECK vs keep OPEN.                                               |
| **[nit] LEA-64 course_type**                                       | genuine sign-off → O1 (§9).                                                                                                                                                                |
| **[nit] CHE-22/GM-14 no-FK**                                       | stale corpus wording, consistent platform-wide — no action (D1/D2).                                                                                                                        |
| **[nit] PRO-13 deliverables "table absent"**                       | corpus STALE — table IS authored (`projects.ts:99`); ALIGNED-expose. **The positive precedent** that the expose-vs-add rule is working.                                                    |

---

## 7. THE APPLIED-FIX LIST (concrete P2 changes, after Approval 2)

**A. Notes-hub rebuild — the ONLY new DDL migration (§11 detail):**

- author `schema/notes.ts` (`pages` · `page_links` · `note_attachments`) + `@vida/types/note.ts` (flat) +
  `validators/note.ts` + `migrations/033_notes.ts` (`version:33`) + barrel exports + parity rows + `_registry`
  soft re-validate. ~9 cross-domain "notes-via-pages" deferrals home here.

**B. O4 provenance unify (Victor-approved 2026-09-14) — types + CHECK + parity:**

- rename `'llm'` → `'ai'` so the triad is the single canonical `manual | ai | import` across
  `PHYSICAL_ROLE_AUTHORING_SOURCE` (`health.ts:108`) + `SKILL_FILL_SOURCE` (`skill.ts:27`) — matching the
  already-`'ai'` `MEAL_SOURCE`/`HEALTH_METRIC_VALUE_SOURCE`. Edit the tuple + the source migration's CHECK
  in place (pre-release, empty tables → parity stays mirror≡migration) + the parity row. Introspection-verify
  each touched table.

**B′. Expose sweep — DEFERRED to DB-11 / consuming module builds (NOT P2).** _(scope refinement 2026-09-14)_
The ~112 inert-column exposes + the `progress`/`mastery`/`current_value` → `number | null` batch (§5.1/§5.2)
are **not** P2 work: the plan's Acceptance (§8) requires types-colocation _correct_ (a verification), not a
speculative bulk-expose, and §3.2 exposes only a column "an M1 service **now** needs" — no M1.1 service
consumes these yet (same defer logic as O3). Home: **DB-11 interface reconcile** + each module's build (expose
its own cols when its service lands). Recorded in `schema-audit-deferred-homes.md`. P2 exposes ONLY the notes
hub's own `@vida/types/note.ts`.

**C. Parity / CHECK verification (~20 check-vocab, NO schema change):**

- confirm each FIXED enum's parity row exists (`validators/enum-parity.test.ts`) — habits, notifications,
  preferences, purposes, relationships, health-training vocabs, economy, scheduling, spaces `VIEW_LAYOUT`, etc.
  These are already `enumText`→CHECK in their migrations; the audit asks only that the parity assertion is present.

**D. Deferred-with-home (117) — no P2 action; recorded in `schema-audit-deferred-homes.md`** (§10).

**Migration count for P2: 1 (`033_notes.ts`).** Dispositions O3 (D6 daily_cap, nutrition bidx) defer their DDL
to MOD-knowledge / nutrition module builds unless Approval-2 elects to author now.

---

## 8. Fix-time verifications (must run during the fix step)

- **V1 — user_profile single-writer:** grep `user_profile` in `gamification.ts` confirms `check_in_streak*`
  absent; grep `user_preferences` in `preferences.ts` confirms the receive columns present. No two/zero-writer field.
- **V2 — `_registry.ts` completeness:** every flagged `entity_type` present (habit, transaction, project/
  milestone/deliverable, contact, network, subject, 6 nutrition, 11 health-core, 4 training, dream, value,
  contribution, daily_check_in, achievement, skill_definition, book_bookmark/book_quote). `book_highlight`
  DELIBERATELY excluded (BOO-18/BK-6). Session sub-types (reading/class/workout_session, skill_action) NEVER
  registered. → most likely a no-op (teardown left `_registry.ts` intact).
- **V3 — RETIRE-verify (BR-N5):** `page_tags`, `pomodoro_sessions`, `pages.slug` never appear in `schema/`.
- **V4 — deleted-symbol sweep:** 0 dangling imports of any torn-down notes symbol (rebuild re-adds).

---

## 9. Open dispositions for Approval 2 (leans stated — ratify or override)

These are the _only_ genuine calls in the audit; all others are doc-fixed. Each carries a FACT-grounded lean.

- **O1 · LEA-64 `course_type`** — **LEAN: keep as subject-level modality** (column authored nullable;
  `conventions L71`; harmless, expose-only). No migration either way.
- **O2 · TAS-24 `tasks.kind`** — **LEAN: keep FIXED CHECK now**; the OPEN-registry widening is `⚠ INTENDED`
  build-phase (ADR-002 amendment) and ships with Duties dissolution, not P2. Dropping the CHECK now would open
  a vocab with no consumer.
- **O3 · Deferred-add DDL (D6 `daily_cap` split + `nutrition_ingredients.name_bidx`)** — **RATIFIED: DEFER to
  the owning module builds** (MOD-knowledge M1.2 / nutrition M1.2), **flagged prominently so context is not
  lost** (Victor 2026-09-14). Neither consuming service is M1.1-now; ADR-016 resolves build-phase DDL at the
  module build. Carry-forward recorded in `schema-audit-deferred-homes.md` (§ _P2 defer-adds — DO NOT LOSE_).
- **O4 · Provenance triad naming (`'ai'` vs `'llm'`)** — **RATIFIED: UNIFY to `manual|ai|import` now** (Victor
  2026-09-14). Applied in §7.B (tables empty → zero-risk rename). Two synonyms collapse to one canonical triad.
- **O5 · health-training `exercise_plans.status`** — **RATIFIED: keep OPEN (no CHECK) for P2** (leaned). Flag
  as a nutrition/training build-phase FIXED-vs-OPEN call; no M1.1 service depends on the CHECK.
- **O1 · LEA-64 `course_type`** — **RATIFIED: keep as subject-modality** (expose-free; no migration).
- **O2 · TAS-24 `tasks.kind`** — **RATIFIED: keep FIXED CHECK now** (OPEN widening ships with Duties dissolution).

---

## 10. Deferred-with-home (117 — 0 unhomed)

Grouped in `schema-audit-deferred-homes.md`. The dominant homes: **review-engine design-pass** (journals/M1.4),
**M2 ADR-014/015 ingestion+AI** (import*staging / ai*\* tables uniformly deferred), **M3/DB-5** (field-level
encryption wiring), **DB-8** (FTS5), **P3 module decomposition** (per-module service DDL at build phase),
**Spaces/Views design-passes** (saved-view selection, neural-graph data-prep). Every item names its owner;
none is homeless.

---

## 11. Notes-hub rebuild inputs (§4 — the one authored unit)

The rebuild MUST honor (from the triage `notesHubReminders`):

1. **Author the v2 `pages` + `page_links` + `note_attachments`** (they exist ONLY in `_legacy/schema.v1.ts`).
   Shape grounded in `parts/notes-and-pages.md` (NOT-01…54): 6-type FIXED CHECK `pages.type`; `journal_date`
   partial-UNIQUE (NP-2); `entity_type`/`entity_id` polymorphic **OPEN no-CHECK** (registry-validated, NP-6);
   `parent_id` self-ref no-FK; `content`/`title`/`cover_image`/`summary_config` `[E]`;
   `word_count`/`is_favorite`/`is_archived`/`icon`/`has_pomodoro` plaintext; baseColumns + `deleted_at`.
   `page_links` UNIQUE(source,target)+reverse idx, `context[E]`; `note_attachments` carries **all three `[E]`
   fields** — `filename[E]` + `encrypted_blob[E]` NOT NULL + `thumbnail_blob[E]` (NOT-29/NOT-38).
2. **`_registry.ts` is ALREADY COMPLETE** for authored domains — do NOT re-add (page/note/journal reserved;
   `book_highlight` deliberately excluded). Session sub-types NEVER registered. Child/junction entities excluded.
3. **`entity_tags` lives in `foundation/spaces.ts`** — the notes hub owns `pages`/`page_links`/`entity_links`
   (entity_links already in spaces.ts, no-FK `page_id` TEXT), NOT `entity_tags`.
4. **`entity_type` CHECK is registry-derived** (hand-written SQL CHECK sourced from `ENTITY_TYPES`, OPEN
   registry, no Drizzle `check()`) — single-sourced from `ENTITY_TYPES`.
5. **Migration at `version:33`** (slot 012 is the inert teardown gap; runner filters `version > current` so a
   `v12` migration would be silently skipped on migrated devices). Register in `runner.ts ALL_MIGRATIONS`.
   Self-contained (no FK references `pages`); parity/introspection is order-independent.

**`validators/note.ts` re-added here; `services/notes/` is P3 (do NOT resurrect).**

---

## 12. Gate ask (Approval 2)

Independent adversarial critic (plan §7.2): confirm (a) **0 GAP is real** — no corpus-proven shape mis-classified
ALIGNED/DEFERRED; (b) no **DEFERRED is actually M1.1-required** (esp. the O3 defer-adds); (c) no **DIVERGENT
missed**; (d) the **anti-gap guards** (§5.1 no-measurement-on-Books/Finance/Rel; §4 bidx rejects) are correct;
(e) the **notes-hub input shape** (§11) is faithful to `parts/notes-and-pages.md`. Then ratify O1–O5 (§9).
