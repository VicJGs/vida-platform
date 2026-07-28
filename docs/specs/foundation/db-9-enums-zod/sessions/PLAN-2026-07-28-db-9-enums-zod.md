# PLAN — DB-9 · Canonical enums + Zod validators   (session: 2026-07-28-db-9-enums-zod · language: TypeScript/English)
> Executive summary (Human Gate 1). Read to approve the DIRECTION. Functional WHAT/WHY — not the technical build
> detail (that is the IMPLEMENTATION-PLAN, authored after Approval 1). No-Guessing: every claim [FACT]/[INTERP]/[UNKNOWN].

## 1. Contexto & demanda
The governing authority is **ADR-002 §2.3**: *"No SQL enums. All categorical values use `TEXT` with **optional**
`CHECK` constraints. **Zod schemas in `packages/core` are the canonical validators**."* `[FACT: ADR-002:72,76]` echoed
by the convention line *"Enums: TEXT with CHECK constraints in SQL, canonical Zod validators in `@vida/core`."*
`[FACT: CLAUDE.md:213; packages/types/src/CLAUDE.md:10]` Two things are already settled by the ADR: **the validators
live in `packages/core`** (not `@vida/types`), and **the per-column CHECK is optional**. Today **two of the three legs
exist, one is missing**:
- **Type leg — exists.** ~80+ enumerated sets across ~14 `@vida/types` domain files, expressed as **TS string-literal
  unions** (`'income' | 'expense'`), never TS `enum`. Shared sets (`Status`, `Priority`, `Frequency`, `LifeDomain`,
  `NotificationType`) in `common.ts`; the rest per-domain. `[FACT: packages/types/src/common.ts:32-57, finance.ts:13-61,
  learning.ts:13-94, sync.ts:12-82]`
- **DB leg — exists (partial).** Hand-written SQL `CHECK (col IN (...))` in migrations; Drizzle is a query-mirror only
  (no drizzle-kit, no generated DDL). `[FACT: db/migrations/001_sync_queue.ts:14-31; db/schema/_shared.ts:7-10]` Only
  `sync_queue` exists so far (foundation); domain tables stream in at DB-4.
- **Validator leg — MISSING (from-zero).** `zod` is not a dependency of `@vida/core` or `@vida/types`
  `[FACT: packages/core/package.json, packages/types/package.json]`. No validator module exists. `_shared.ts` carries
  the explicit forward-reference: *"TS union over TEXT (SQL CHECK authored in the migration; **Zod validates — DB-9**)."*
  `[FACT: db/schema/_shared.ts:20-21]`

**The structural problem DB-9 must solve.** A TS union type is **erased at compile time** — you cannot derive a runtime
`z.enum([...])` or a SQL `CHECK IN (...)` list from a type that no longer exists at runtime. `[INTERP: TS type-erasure
semantics]` So the three legs cannot share a source *as currently written* (a bare union). Runtime tuples already exist
in **two places, both in `@vida/core`**: `sync-queue.ts` — `const OPERATIONS = ['create','update','delete'] as const
satisfies readonly SyncOperation[]` `[FACT: db/schema/foundation/sync-queue.ts:20-21]` — and `_registry.ts` —
`ENTITY_TYPES` with `type EntityType = (typeof ENTITY_TYPES)[number]` `[FACT: db/schema/_registry.ts:6-13]`.
`@vida/types` has **zero** `as const` today; it is a pure type layer whose CLAUDE.md states it carries no runtime code
beyond `APP_NAME`/`MAX_ATTACHMENT_BYTES` `[FACT: packages/types/src/CLAUDE.md:6]`. **Note the two precedents differ:**
`sync-queue.ts` uses `... as const satisfies readonly SyncOperation[]` — which guarantees the tuple is a *subset* of the
union, **not that it is exhaustive** (you could omit a member and the compiler stays silent). `_registry.ts` uses the
inverse — `type = (typeof TUPLE)[number]` — where the tuple **is** the source and the type is derived, so they are equal
by construction. This difference is the crux of decision (C) below.

**Why now:** DB-9 is a ready head off DB-1 (✅) and the gate for the substrate wave — **AR-5/6/7 ← DB-6 ✅ + DB-9** —
and the DB-10 seed (seed rows must satisfy the enum CHECKs DB-9 owns). `[FACT: docs/roadmap/m1.0-delivery-plan.md:112,120-122,206]`

## 2. O que muda e por quê
The canonical SET becomes a **runtime `as const` tuple** (a value, not an erased type), from which the `z.enum`
validator, the Drizzle `enumText` column, and the SQL `CHECK` list all derive. **Where that tuple lives is decision (C)
in §5** — the description below is location-neutral. Concretely:

**IN:**
- **Canonical tuples, one per in-scope enum**, expressed as `_registry.ts`'s exhaustive form
  `const STATUS = ['not_started', ...] as const` + `type Status = (typeof STATUS)[number]` (tuple-as-source =
  guaranteed-equal to the union, closing the subset-only gap of the `satisfies` form). Home = decision (C). The type
  name and assignability are **preserved**, so consumers importing `Status` see no change. `[FACT: verified by critique —
  all @vida/types enum consumers use `import type` + type annotation only; no `satisfies`/mapped-type/`keyof` consumer
  exists → refactor is transparent]`
- **`@vida/core` — the canonical validator layer (new).** Add `zod` as a **runtime dependency of `@vida/core`** (settled
  by ADR-002 §2.3 — validators live in core); author a validators module that wraps each tuple as
  `export const StatusValidator = z.enum(STATUS)` and re-exports from `@vida/core` index, so web/mobile/desktop import
  one canonical validator per enum. `[FACT: ADR-002:72 "Zod schemas in packages/core are the canonical validators"]`
- **SQL-CHECK parity — enforcement is decision (i/ii) in §5.** The ADR-consistent baseline (ii) hand-authors the CHECK
  **from** the tuple const (ADR-016 §3.3 "sourced from that const") and a **parity test** asserts it equals the tuple.
  The optional improvement (i) adds a `sqlEnumCheck(column, TUPLE)` string-emitter so the CHECK is *generated* — but that
  **exceeds** ADR-016 §3.2's "kept in sync by discipline" model and would need its own justification/amendment. `[FACT:
  ADR-016:34,36]`
- **Parity test (backstop for BR-DB9-1).** A table-driven test iterates a **parity fixture** — an explicit list of
  `(table, column, tuple)` rows — and asserts each live table's actual `CHECK` set equals its tuple, failing loud on
  divergence. M1.0 seeds the fixture with `sync_queue`.operation/status; **each DB-4 slice appends its own row** (a
  documented one-line convention — NOT automatic; there is no enum→table registry to auto-discover). `[FACT: only
  registries today are ALL_MIGRATIONS (runner.ts:22) + ENTITY_TYPES — neither maps enum→table]`
- **`enumText()` reuse.** The existing Drizzle `enumText<T>` helper already consumes tuples `[FACT: db/schema/_shared.ts:20]`
  — it consumes the *same* canonical tuple, so the Drizzle mirror joins the parity with no separate literal. `sqlEnumCheck`
  (if adopted) emits a **raw SQL string**, so it does **not** violate `_shared.ts:9`'s ban on a Drizzle `check()` helper.
  `[FACT: db/schema/_shared.ts:9]`

**OUT** — boundary discipline:
- **Per-domain CHECK migrations** (the actual `CREATE TABLE` for finance/learning/… ) → **DB-4 streaming**, authored
  with each domain's table. DB-9 owns the *canonical set + validator + the `sqlEnumCheck` helper*; each DB-4 slice
  *uses* them. `[FACT: delivery-plan §5.1.1 streaming model; ADR-016 §3.5 per-feature authoring]`
- **Non-enum Zod schemas** (full entity/row validators, request/response bodies) → their own units. DB-9 is **enum
  validators only**. `[INTERP: scope boundary from the task Goal]`
- **Runtime validation wiring into the repository** (rejecting bad enums on write) → consumer choice; DB-9 exports the
  validators, it does not force a call-site. `[INTERP: repository is table-agnostic — repository.ts:218]`

## 3. Regras de negócio relevantes (funcional)
Keep (do not regress):
- **[FACT]** Enums are string-literal unions, never TS `enum`; encrypted fields flagged by JSDoc. `[FACT: types/CLAUDE.md:8-11]`
- **[FACT]** DDL is hand-written SQL; Drizzle never generates it. `[FACT: db/schema/_shared.ts:7-10]`

Owed by DB-9 (this unit establishes):
- **[OWED] BR-DB9-1 — three-way parity, single source.** For every in-scope enum, exactly one runtime tuple (`as const`)
  is the source; the TS union (`typeof T[number]`), the `z.enum`, and the SQL `CHECK` set are all **derived from or
  asserted against it**. They must never diverge; divergence fails a test loud. `[ADR-002 §2.3; ADR-016 §3.3]`
- **[OWED] BR-DB9-2 — non-breaking type identity.** The refactor preserves each exported union type's name and
  assignability; no consumer import breaks (verified: all consumers are `import type` + annotation). `[INTERP: `typeof
  T[number]` ≡ prior union; FACT: critique grep of consumers]`
- **[OWED] BR-DB9-3 — `zod` is a runtime dep of `@vida/core` only.** If decision (C) keeps tuples in `@vida/core`,
  `@vida/types` stays zero-dependency and zero-runtime; if (C) moves tuples into `@vida/types`, it gains plain runtime
  arrays (still no `zod`) — a documented identity change (see §5-C). `[FACT: types/package.json; core/package.json]`
- **[OWED] BR-DB9-4 — validators reject invalid input loud.** Each `z.enum` accepts exactly its set and rejects
  everything else (parse throws / safeParse false); tested both directions to §XIX. `[FACT: standards §XIX]`
- **[OWED] BR-DB9-5 — CHECK is sourced from the tuple, never re-typed by hand independently.** Per ADR-016 §3.3 the
  migration's CHECK is authored *from* the const; a parity test guarantees equality. Whether it is generated
  (`sqlEnumCheck`) or hand-authored-then-asserted is decision (i/ii). `[FACT: ADR-016:36]`

## 4. Aceitação (funcional)
- [ ] Each in-scope enum exposes an `as const` tuple + `type X = (typeof X)[number]` (home per decision C); `pnpm
      typecheck` green across the monorepo with **no consumer edits** (proves non-breaking identity — BR-DB9-2).
- [ ] `@vida/core` exports one canonical `z.enum` validator per in-scope enum, each built from *the* tuple (no
      re-declared literals — BR-DB9-1); re-exported from the `@vida/core` index.
- [ ] `zod` added to `@vida/core` deps; the type layer's dependency/runtime footprint matches decision C (BR-DB9-3).
- [ ] `sync_queue`.operation/status CHECKs are **sourced from / asserted equal to** their tuples with **no DDL change**
      (BR-DB9-5); if decision (i), the `sqlEnumCheck` emitter reproduces them byte-for-byte.
- [ ] Parity test iterates the `(table,column,tuple)` fixture (M1.0 seed = `sync_queue`) and asserts CHECK set ≡ tuple;
      it **fails** on a deliberate-drift fixture where one side gains a value (BR-DB9-1).
- [ ] Validator tests: each in-scope `z.enum` accepts all its members and rejects a non-member — §XIX both-directions (BR-DB9-4).
- [ ] `enumText()` Drizzle columns consume the same canonical tuple (no separate literal).
- [ ] `pnpm typecheck` + `pnpm test` green across `@vida/core` and `@vida/types`.

## 5. Questões em aberto / decisões pendentes
- **[DECISION — needs your call at Approval 1] Scope grain: comprehensive vs foundation-first.**
  The tuple-refactor + `z.enum` wrap is **mechanical and low-risk** (it's a faithful mirror of unions that already
  exist), but there are ~90 sets. Two coherent scopes:
  - **(A) recommended — Comprehensive.** Refactor **all** `@vida/types` enums → tuples and author **all** `z.enum`
    validators now. Delivers the complete canonical library the convention (CLAUDE.md:213) promises; every app boundary
    can validate enums immediately; the pattern is applied **once**, not re-litigated per domain. SQL-CHECK parity is
    enforced *per live table* (today only `sync_queue`; the parity test auto-covers each DB-4 table as it lands). Cost:
    a larger, but purely mechanical, diff across ~14 type files. **Recommend (A)** — the validators are pure functions
    of already-committed types, so "foundation-first" defers work that carries no real risk while splitting the pattern.
  - **(B) — Foundation-first.** Refactor + wrap only the sync + foundation + shared (`common.ts`) sets that the
    substrates (AR-5/6/7) and DB-10 seed consume now; per-domain enums adopt the pattern at their DB-4 slice. Smaller
    diff, matches the streaming model literally — but leaves two enum idioms coexisting and defers a zero-risk mechanical
    change. Choose (B) if you want the M1.0 diff minimal above all.
- **[DECISION — needs your call at Approval 1] (C) Where the canonical tuple lives.** *(surfaced by the critique — the
  first draft silently assumed `@vida/types`.)* ADR-002 §2.3 settles that the *validators* live in `@vida/core`; it is
  silent on the *tuple*. Precedent is split in `@vida/core` itself.
  - **(C1) — Tuple in `@vida/core`, union stays in `@vida/types`, linked by `satisfies`** (the `sync-queue.ts`
    precedent). Keeps `@vida/types` a **pure type layer** (its CLAUDE.md:6 identity intact). Cost: two declarations per
    enum (union in types + tuple in core), and `satisfies` only guarantees tuple **⊆** union — exhaustiveness needs an
    extra per-enum type-assertion or it can silently drift. Also contradicts the delivery-plan file list, which names
    `packages/types/src/` as a DB-9 file. `[FACT: delivery-plan:112]`
  - **(C2) recommended — Tuple in `@vida/types` (`as const`), union derived `typeof T[number]`, `@vida/core` imports the
    tuple** (the `_registry.ts` precedent, but relocated to types). **Single source, exhaustive by construction** (tuple
    **=** union) — directly delivers BR-DB9-1. Matches the delivery-plan file list. Cost: `@vida/types` gains its first
    substantial runtime code (plain string arrays, still **no `zod`**), so `packages/types/src/CLAUDE.md:6` ("no runtime
    code") must be **updated** to document that the package now owns canonical enum tuples — a deliberate, disclosed
    identity change, not drift. **Recommend (C2):** the exhaustiveness guarantee is the entire point of the task, and the
    "purity" cost is a doc line + tiny tree-shakeable arrays.
- **[DECISION — needs your call at Approval 1] SQL-CHECK enforcement: assert (ADR-consistent) vs generate (deviation).**
  - **(ii) recommended — assert only (ADR-016 §3.3 model).** Hand-author each CHECK *from* the tuple const (exactly as
    ADR-016 §3.3 already prescribes) and let the **parity test** fail loud on any drift. No new mechanism; fully within
    the ADRs. The parity test already delivers BR-DB9-1's guarantee. `[FACT: ADR-016:36]`
  - **(i) — generate + assert (`sqlEnumCheck`).** Adds a string-emitter so the CHECK is *produced* from the tuple (drift
    structurally impossible, not just caught). Strictly stronger — but it **exceeds ADR-016 §3.2's "kept in sync by
    discipline" model** `[FACT: ADR-016:34]`, so it is a **deviation requiring its own justification** (an ADR-016
    amendment via `/adr-new`, or an explicit note). **Recommend (ii) for M1.0**; revisit (i) as an ADR amendment if
    hand-authoring proves error-prone once many tables exist.
- **[UNKNOWN → resolved in IMPLEMENTATION-PLAN] Validators module layout + exact scope list.** Whether validators sit at
  `packages/core/src/validators/` (one barrel) vs co-located, and — if scope (B) — the exact foundation enum list
  (confirmed against AR-5/6/7 contracts ADR-004/006–012), are build-detail decisions for gate 2. Not blocking the
  direction. `[UNKNOWN: needs the substrate contracts read at gate 2]`

## 6. Aprovação 1 (direção) — ✅ GRANTED (Victor, 2026-07-28)
Direction approved. **Locked decisions:** **(A) comprehensive** — all string-literal-union enums across `@vida/types` ·
**(C2) tuple-as-source in `@vida/types`** (`as const` tuple canonical, union derived `typeof T[number]`, `@vida/core`
imports the tuple; `packages/types/src/CLAUDE.md:6` updated to document the enum-tuple identity) · **(ii) assert-only** —
CHECK hand-authored from the const per ADR-016 §3.3, parity test as the drift backstop (no `sqlEnumCheck` generator; no
ADR amendment). This PLAN cleared an independent adversarial `/critique` (REVISE → all 3 must-fix resolved). Next: author
the IMPLEMENTATION-PLAN → `/preflight` → 2nd `/critique` → Approval 2 → implement.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-28 | 2026-07-28-db-9-enums-zod | initial PLAN (gate 1) — direction + scope decisions for Approval 1 |
| 2026-07-28 | 2026-07-28-db-9-enums-zod | REVISE after independent /critique — surfaced decision (C) tuple location; reframed enforcement (i/ii) per ADR-016; downgraded auto-grow claim to explicit parity fixture; ADR-002 §2.3 authority + nits |
