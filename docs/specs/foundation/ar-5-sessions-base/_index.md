# Spec: foundation:ar-5-sessions-base

<!-- type: component (foundation substrate · full double-gate) -->

Status: draft <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-07-28-ar-5-sessions-base.

<!-- FORWARD spec — §1–§4 are the DESCRIPTION (gate-1 truth); §5 is the build sketch promoted to a full
     IMPLEMENTATION-PLAN after Approval 1. Depth = component/substrate. Governed by No-Guessing. -->

## 1. Identity

**What it is.** The AR-5 Sessions substrate: the **structural + type foundation** for Vida's Session framework
(ADR-004). It ships (a) the polymorphic **`sessions` base spine** table (table-per-type, ADR-004 §3.1); (b) the
**Integration-Contract structure** — `session_attachments` (dim1, `[FACT: ADR-004 §3.2.1]`) + `session_type_registry`
(dims 3+4 = lifecycle + permissions `[FACT: structure-data.md:46]`; and the dim2 effect _declarations_ folded in as
registry JSON `[INTERP: structure-data.md:46 lists registry as defs+dim4+lifecycle; effects[] declaration folded
in — build call]`); (c) the **canonical enums** for the new model (`SESSION_SUB_TYPE · SESSION_PURPOSE ·
SCHEDULING_MODE · SESSION_STATUS · EFFECT_TYPE`) via db-9's C2 tuple-as-source pattern; (d) the **TypeScript
contract types** (`SessionTypeDef` + the 4 dimensions); and (e) a **thin `SessionRegistry`** runtime that
stores + validates type defs (register/get/list).
`[FACT: delivery-plan §5:120 — AR-5 = `foundation/sessions`, "sessions table-per-type + integration contract"]`
`[FACT: ADR-004 §3.1 spine, §3.2.1 attachment, §3.2.3 lifecycle, §3.2.4 permissions; §3.2.2 effect catalogue as amended by ADR-012 L139]`

**The desire behind it.** Make "a session" a real OS primitive with one stable `session_id` that every effect,
attachment, `planned_block`, and pomodoro runtime can hang off — replacing 9+ scattered session-shaped entities
with no shared spine. `[FACT: ADR-004 §2; features/sessions-and-scheduling/identity.md]`

**What it is NOT** (the M1.0 grain — Victor-approved 2026-07-28):

- **NOT the effect-firing rail.** `applied_effects` ledger, `effect_event_id` UNIQUE enforcement, the routing
  registry, and the effect handlers (ADR-004 §3.2.5 A+B) are **AR-7** (`foundation/effects`), built `← AR-5`.
  AR-5 ships effect _declarations_ (in `session_type_registry` defs) + the `EFFECT_TYPE` catalogue vocabulary;
  it does **not** fire anything. `[FACT: delivery-plan §5:122 (AR-7="effect rail") + §5.1.1 (build-order≠runtime-feed)]`
- **NOT the lifecycle-transition engine.** The `transition(session, event)` state machine defers (no M1.0
  consumer — effect targets don't exist yet). The `SESSION_STATUS` enum + the legal-transition _declarations_
  in the registry ship; the executable engine does not. `[INTERP: ADR-017 features-first; Victor grain call]`
- **NOT the scheduling engine.** `planned_blocks`, `study_availability`, `dueIn()`, `generatePlan()` — Pillar 2,
  the G5 design-pass — all defer. AR-5 is Pillar-1 base only. `[FACT: ADR-004 §3 "does NOT specify the scheduler"]`
- **NOT the per-sub-type extension tables.** `study_sessions`, `class_sessions`, `reading_sessions`, … are
  owned by their domain modules and land per-module in M1.1+ (DB-4 stream-(ii)). AR-5 ships only the base spine.
  `[FACT: ADR-004 §3.1; delivery-plan §5:157]`
- **NOT the view layer** (G9, deferred).

## 2. Business Rules

Inherits the CORE constitution (ZK-1, LF-2) + the guarded opt-in extension-model. Sources: ADR-004 §3 +
features/sessions-and-scheduling/business-rules.md (SS-1…SS-6). Only the rules AR-5's _structure_ must uphold:

- **BR-1 (SS-1) — One spine, many sub-types.** Exactly one `sessions` base row per session, discriminated by
  `sub_type`. The spine holds only shared columns; type-specific columns NEVER widen it (they live in
  per-module extension tables, deferred). `[FACT: ADR-004 §3.1]`
- **BR-2 (SS-2) — `sub_type` ⟂ `purpose` are two orthogonal columns**, never one conflated enum. This is the
  explicit v1/v2 anti-pattern (the legacy `SCHEDULED_SESSION_TYPE = study|review|practice|exam_prep|homework`
  conflates them). AR-5 ships them as separate columns + separate enums. `[FACT: SS-2; legacy knowledge.ts:50]`
- **BR-3 (SS-3) — every registered type declares all 4 contract dimensions.** `SessionRegistry.register(def)`
  MUST reject a `SessionTypeDef` missing any of attachment-defaults / effects[] / lifecycle / permissions —
  a hard validation error, no partial registration. `[FACT: SS-3 — "no session type exists without all four declared"]`
- **BR-4 (SS-6, structural half) — user-type capability ⊆ shipped-type capability.** When a user-authored
  `SessionTypeDef` registers, its declared `effects[]` + permission envelope MUST be a subset of the shipped
  envelope; a superset is rejected. (The _runtime_ no-double-count enforcement is AR-7's `effect_event_id`
  rail — out of scope; AR-5 enforces only the static subset check at registration.) `[FACT: SS-6; ADR-004 §3.2.4]`
- **BR-5a — `SESSION_STATUS` + `SCHEDULING_MODE` are FIXED scalar columns → hard SQL `CHECK`** (C2 tuple-as-source).
  `SESSION_STATUS` = the full S5 lifecycle `scheduled·planned·in_progress·completed·skipped·missed·rescheduled`
  (the legacy `SCHEDULED_SESSION_STATUS` is missing `planned`+`missed` — do not reuse it).
  `[FACT: structure-data.md:33-34 explicit CHECK members]`
- **BR-5b — `EFFECT_TYPE` is a FIXED vocabulary but carries NO SQL `CHECK`.** It appears only inside
  `session_type_registry.effects` as a **JSON array** (a JSON array cannot bear a SQL CHECK), so it is enforced
  by the **Zod validator at registry-write**, not by the DB. FIXED ≠ SQL-CHECK here.
  `[FACT: §3.2 effects TEXT/*JSON*/; ADR-004 §3.2.2-as-amended fixed catalogue]`
- **BR-6 — `sub_type` + `purpose` are OPEN vocabularies** → NO hard SQL `CHECK` (SS-5 user-extensibility would
  break under a fixed CHECK). They are free `TEXT`, validated at runtime against `session_type_registry`. The
  `SESSION_SUB_TYPE`/`SESSION_PURPOSE` enum tuples in `@vida/types` are the _shipped_ set (typing + defaults +
  the shipped-type Zod validator), NOT a column constraint. `[INTERP: reconciles SS-5 extensibility with BR-2; DECISION D-1]`
- **BR-7 (SS-1 spine identity) — `sessions` is a syncable table**: `...baseColumns` + `...syncColumns` +
  `key_learnings` field-level encrypted `[E]` (ADR-004 §3.4 — base + extension are separate blobs that travel
  together). The registry + attachments follow the same sync convention unless local-only is justified. `[FACT: ADR-004 §3.4]`

### Terminal states (of AR-5's own surface — the deferred runtime states are out of scope)

- `SessionRegistry.register()`: **ok** (def stored) · **rejected** (BR-3 missing dimension / BR-4 envelope
  superset — typed error, no partial write) · **duplicate** (sub_type already registered → typed conflict).
- `SessionRegistry.get(sub_type)`: **found** · **not-found** (typed, never undefined-cast).
- Schema/migration: **applied** · **fails loud** (CHECK/UNIQUE violation surfaces, never swallowed).

### Failure behaviour (fail loud)

- A `SessionTypeDef` failing validation is a hard rejection with a typed error — never a silent partial register.
- A hard-enum CHECK violation (bad status/mode/effect_type) fails at the DB layer, surfaced typed — never coerced.

## 3. Contract

### 3.1 Enums (`@vida/types` tuples + `@vida/core/validators` z.enum — db-9 pattern)

```
SESSION_SUB_TYPE   = ['study','class','focus','reading','practice','daily','review','workout','work']  // shipped set; OPEN (BR-6)
SESSION_PURPOSE    = ['new_learning','review','exam_prep','pre_class','post_class','maintenance']       // shipped set; OPEN (BR-6)
SCHEDULING_MODE    = ['attended','planned','ad_hoc']                                                    // FIXED scalar CHECK (BR-5a) — 'ad_hoc' per identifier convention (doc prose: 'ad-hoc')
SESSION_STATUS     = ['scheduled','planned','in_progress','completed','skipped','missed','rescheduled']  // FIXED scalar CHECK (BR-5a, S5)
EFFECT_TYPE        = // FIXED catalogue vocabulary (BR-5b — Zod-validated, NO SQL CHECK). 12 members = ADR-004 §3.2.2 base (8) + ADR-012 amendment (4).
  // base (8): complete_habit_occurrence · log_time · emit_measurement_signal · contribute_purpose_metric ·
  //           award_xp · surface_journal · surface_calendar · attach_pomodoro
  // ADR-012 amendment (4, all §3.2.5 Additive-class): grant_currency · lock_currency · move_money · surface_notification
  ['complete_habit_occurrence','log_time','emit_measurement_signal','contribute_purpose_metric',
   'award_xp','surface_journal','surface_calendar','attach_pomodoro',
   'grant_currency','lock_currency','move_money','surface_notification']
```

`[FACT: SESSION_SUB_TYPE/PURPOSE rosters — business-rules.md SS-1/SS-2 + contract.md; SESSION_STATUS — structure-data.md:33-34]`
`[FACT: EFFECT_TYPE = ADR-004 §3.2.2 (8 base) + ADR-012:139 amendment (grant_currency·lock_currency·move_money·surface_notification)]`
`[FACT: ADR-012:60 — grant_currency GENERALIZES award_xp, does NOT retire it → both are valid catalogue slots; xp_history retired, not award_xp]`
`[D-2 RESOLVED — 'ad_hoc': every live tuple member is snake_case (exam_prep/in_progress/flashcard_deck); doc 'ad-hoc' is display spelling]`

### 3.2 Tables (Drizzle query-mirror in `db/schema/foundation/sessions.ts` + hand-written SQL migration 002)

- **`sessions`** (spine, syncable) — `...baseColumns` · `sub_type TEXT NOT NULL` (open, BR-6) · `purpose TEXT`
  (open) · `scheduling_mode TEXT NOT NULL CHECK(∈ SCHEDULING_MODE)` · `planned_block_id TEXT` (nullable FK
  target, table deferred) · `started_at INTEGER` · `ended_at INTEGER` · `status TEXT NOT NULL CHECK(∈
SESSION_STATUS)` **— caller-supplied, NO default** (contrast `sync_queue.status DEFAULT 'pending'`; the
  transition engine that would drive status is deferred, so the initial legal value is set at insert) ·
  `focus_rating INTEGER CHECK(focus_rating BETWEEN 1 AND 5)` · `energy_level INTEGER CHECK(energy_level BETWEEN
1 AND 5)` · `distraction_count INTEGER` · `key_learnings TEXT /* [E] */` · `...syncColumns` · `deleted_at INTEGER`.
- **`session_type_registry`** — `...baseColumns` (id UUIDv7 PK + timestamps + `_sync_*`) · `sub_type TEXT NOT
NULL UNIQUE` · `owner_module TEXT NOT NULL` · `is_user_type INTEGER NOT NULL DEFAULT 0` · `default_purpose
TEXT` · `attachment_defaults TEXT /* JSON */` · `effects TEXT /* JSON: EFFECT_TYPE[] declared */` · `lifecycle
TEXT /* JSON: legal transitions + hooks */` · `permissions TEXT /* JSON: capability envelope */`. Persists the
  `SessionTypeDef` (dims 2-4 declarations). **`id` is the PK (not `sub_type`)** so the db-6 generic `Repository`
  (which generates + queries `id`) can drive persistence; `sub_type` is a `UNIQUE` business key looked up via
  `findWhere(eq(sub_type,…))`. `[FACT: repository.ts:316,346 — create()/findById assume an id PK + baseColumns]`
  **Sync stance (D-3):** only `is_user_type=1` (user) rows are persisted here + synced; shipped defs live
  in-memory, seeded from code (SS-4: device-scoped, never pushed as a default). `[FACT: business-rules.md:78 SS-4]`
- **`session_attachments`** (dim1, `entity_links`-style polymorphic) — `...baseColumns` · `session_id TEXT NOT
NULL` · `entity_type TEXT NOT NULL` **(validated at runtime against `_registry.ts` entity_type registry — the
  same soft-validation seam as `sub_type`, BR-6; NOT a hard SQL CHECK, since the entity_type set is open)** ·
  `entity_id TEXT NOT NULL` · `level TEXT NOT NULL CHECK(level IN ('type','instance'))` · `...syncColumns`.
  `[FACT: ADR-004 §3.2.1; db/CLAUDE.md — _registry.ts is the entity_type registry]`

### 3.3 TypeScript contract types (`foundation/sessions/types.ts`)

```
SessionTypeDef = { sub_type, owner_module, extension_schema?, attachment_defaults, effects: EffectType[],
                   lifecycle: { transitions: [...], hooks?: {...} }, permissions: CapabilityEnvelope,
                   default_purpose? }
CapabilityEnvelope = { allowed_effects: EffectType[], sensitive_optins?: (...) }
```

### 3.4 Thin registry (`foundation/sessions/registry.ts`)

- `SessionRegistry.register(def: SessionTypeDef): void` — validates BR-3 (all 4 dims) + BR-4 (user ⊆ shipped
  when `is_user_type`) + BR-1 uniqueness; persists to `session_type_registry`. Throws typed errors, no partial.
- `SessionRegistry.get(sub_type): SessionTypeDef` — typed not-found.
- `SessionRegistry.list(): SessionTypeDef[]`.
- **No** `transition()`, **no** effect firing, **no** `attach()` runtime beyond the table (deferred).

### Error cases (typed)

`InvalidSessionTypeDef(missing_dimension)` · `CapabilityEnvelopeExceeded(effect)` · `DuplicateSubType(sub_type)`
· `SessionTypeNotFound(sub_type)` · DB `CHECK`/`UNIQUE` violations surfaced typed.

## 4. Acceptance

- [ ] 5 enum tuples authored in `@vida/types` (C2 `as const` + derived union) + re-exported.
- [ ] 5 `z.enum` validators in `@vida/core/validators/session.ts`, barrelled.
- [ ] `db/schema/foundation/sessions.ts` — 3 Drizzle query-mirrors (`sessions`, `session_type_registry`,
      `session_attachments`) composing `_shared.ts` helpers; no hand-repeated sync columns.
- [ ] Migration `002_sessions.ts` — hand-written SQL DDL with the BR-5 hard CHECKs + the 1..5 CHECKs + FK/UNIQUE;
      registered in `runner.ts` `ALL_MIGRATIONS`; `up()` opens no transaction.
- [ ] `foundation/sessions/{types,registry,index}.ts` — `SessionTypeDef` types + thin `SessionRegistry`.
- [ ] SQL-CHECK ↔ tuple parity test (mirroring db-9's `enum-parity.test.ts`) — FIXTURE gains **exactly two**
      rows: `sessions.scheduling_mode`→`SCHEDULING_MODE` and `sessions.status`→`SESSION_STATUS` (the only
      CHECK-backed columns mapping a `@vida/types` tuple). `sub_type`/`purpose` get **no** row (open, BR-6 —
      adding them would false-fail). `EFFECT_TYPE` gets **no** parity row (BR-5b — Zod-validated JSON, no SQL
      CHECK); instead a Zod accept/reject test covers the 12-member catalogue.
- [ ] `session_attachments` table ships (structure). Its `entity_type` runtime validation (against
      `_registry.ts`) lands WITH the attachments write path (`attach()`) — DEFERRED to AR-7/later, since AR-5
      ships no session/attachment write path (Option-1 grain). Likewise `sub_type`/`purpose` are free-TEXT
      (no CHECK, BR-6); their registry-validation binds when the session write path is built. The registry's
      OWN uniqueness/envelope validation (BR-1/BR-4) IS delivered + tested here.
- [ ] Registry tests: register-ok · reject-missing-dimension (BR-3) · reject-envelope-superset (BR-4) ·
      duplicate (BR-1) · get found/not-found — success + ≥2 error cases (scenario Step 7).
- [ ] `pnpm typecheck` 10/10 zero errors; root `pnpm test` green (turbo `^build`, not stale dist — db-9 MF-1 lesson).
- [ ] No firing/transition/scheduler code present (grep-verify the deferrals — no `applied_effects`, no `transition(`).
- [ ] `/critique` → SHIP; `quality-gate-engineering` PASS; Currency Rule refreshes the sessions context docs.

## 5. Implementation Prompt (build sketch → promoted to full IMPLEMENTATION-PLAN after Approval 1)

Ordered, following the established 4-artifact foundation pattern (db-6/db-9). Each step cites §2/§3.

1. **Enums** — `@vida/types`: new `session.ts` with the 5 tuples (§3.1), C2 pattern; barrel-export from index. `→ BR-2/BR-5/BR-6`
2. **Validators** — `@vida/core/validators/session.ts`: 5 `z.enum`; barrel. `→ §3.1`
3. **Schema slice** — `db/schema/foundation/sessions.ts`: 3 query-mirrors (§3.2) via `_shared` helpers; header
   comment citing ADR-004 + "DDL in migration". `→ BR-1/BR-7`
4. **Migration** — `db/migrations/002_sessions.ts`: hand-written SQL, BR-5 hard CHECKs + 1..5 CHECKs + FK +
   `level` CHECK; register in `runner.ts`. `→ BR-5`
5. **Contract types** — `foundation/sessions/types.ts`: `SessionTypeDef` + `CapabilityEnvelope` (§3.3). `→ SS-3`
6. **Thin registry** — `foundation/sessions/registry.ts`: `register/get/list` with BR-3/BR-4/BR-1 validation
   (§3.4); `index.ts` barrel. `→ BR-3/BR-4`
7. **Tests** — parity test (FIXED enums) + registry test suite (§4 cases).
8. **Verify** — root typecheck + test (turbo `^build`); grep-verify deferrals absent. `→ §4 done-check.`

## 6. Open UNKNOWNs / Decisions Needed — updated by Step 0 baseline (2026-07-28)

**Baseline FACTs established (the floor):**

- [FACT] `packages/core/src/foundation/sessions/` = **directory-home only** (CLAUDE.md stub, ADR-018 Part-2);
  **0 lines of engine code, 0 DDL.** Genuine from-zero (unlike db-6). Sibling `foundation/effects/` = same.
- [FACT] `db/schema/foundation/` holds only `sync-queue.ts` (db-6). No `sessions.ts` slice yet (DB-3 rides this gate).
- [FACT] Doc floor is RICH + CURRENT: `docs/features/sessions-and-scheduling/` full 5 aspects (Phase-2), all
  marked **INTENDED** (v2 surface = schema-only, `wc -l = 0`). ADR-004 = structural authority.

**AR-5 vs AR-7 boundary — RESOLVED (was falsely flagged as a decision; the sources already define it):**

- [FACT — plan §5:120-122] AR-5 = `foundation/sessions` = spine + integration contract. AR-7 = "effect rail
  (ADR-004/012)" in `foundation/effects`. [FACT — plan §5.1.1:195-200] a graph edge is a **build-order
  blocker, not a runtime feed**: `effects/CLAUDE.md` "ridden by sessions" is a RUNTIME feed, and the BUILD
  edge is **AR-7 ← AR-5**. [FACT — ADR-004 §3.2.5:74-76] ADR-004 is the **spec-owner** of the mechanism
  ("ADR-008/010 inherit by reference") — "owner" = specifies, not builds; the rail's build-home is AR-7.

**M1.0 runtime grain — RESOLVED (Victor-approved 2026-07-28):** Option 1 — structure + contract types + thin
registry; DEFER transition engine + effect firing + scheduler. See §1 "What it is NOT".

**Decisions — RESOLVED by the independent gate-1 critique (2026-07-28):**

- [D-1 ✅ CONFIRM OPEN] `sub_type`/`purpose` free-TEXT, registry-validated — a hard CHECK breaks SS-5
  extensibility (business-rules.md:28-31). Critic upheld; consistent with the live `_registry.ts` entity_type pattern.
- [D-2 ✅ RESOLVED `'ad_hoc'`] every live tuple member is snake_case; doc 'ad-hoc' is display spelling. Enum
  file carries a note so a codemod doesn't "fix" it back.
- [D-3 ✅ RESOLVED syncable, is_user_type=1 only] registry + attachments are user data → syncable; but shipped
  defs (is_user_type=0) are re-derived from code, so the writer syncs only user-type rows (SS-4, business-rules.md:78).

**Critique-driven REVISE fixes applied (2026-07-28, verdict REVISE → resolved):**

- [MF-1] EFFECT_TYPE was 8-member (ADR-004 base) — a strict subset of the ADR-012-amended catalogue → now 12
  (added grant_currency·lock_currency·move_money·surface_notification). `[FACT: ADR-012:139]`
- [MF-2] award_xp kept (ADR-012:60 — grant_currency generalizes, does not retire it; xp_history is the retired token).
- [MF-3] "dim2 declarations in registry" relabeled FACT→INTERP (source assigns only dims 3-4 to the registry).
- [SF] BR-5 split → BR-5a (status/mode = scalar SQL CHECK) + BR-5b (EFFECT_TYPE = JSON, Zod-validated, no SQL
  CHECK); parity FIXTURE pinned to exactly 2 rows; sessions.status = caller-supplied no-default; entity_type
  registry-validated.

## 7. Change Log

| Date       | Session                       | Change                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-28 | 2026-07-28-ar-5-sessions-base | initial draft (stub + home)                                                                                                                                                                                                                                                                                                                                                             |
| 2026-07-28 | 2026-07-28-ar-5-sessions-base | PLAN authored — §1-§5 filled after Step 0 baseline + grain decision (Option 1); D-1/D-2/D-3 flagged for gate                                                                                                                                                                                                                                                                            |
| 2026-07-28 | 2026-07-28-ar-5-sessions-base | independent gate-1 /critique → REVISE; applied MF-1 (EFFECT_TYPE 8→12 per ADR-012), MF-2 (award_xp kept), MF-3 (INTERP relabel), BR-5 split, parity-fixture pin, status no-default, entity_type registry-validation; D-1/2/3 resolved                                                                                                                                                   |
| 2026-07-28 | 2026-07-28-ar-5-sessions-base | /preflight → BLOCKED (G1/G2/G3); IMPLEMENTATION-PLAN authored resolving them (sessions/IMPLEMENTATION-PLAN-…); independent gate-2 /critique → REVISE (4 MUST-FIX): session_type_registry PK id≠sub_type (Repository needs baseColumns) → §3.2 fixed; 3 explicit barrel edits; ddlFor migration-002 patch; seed ≥1 real shipped type; typed DuplicateSubType via findWhere. All applied. |
