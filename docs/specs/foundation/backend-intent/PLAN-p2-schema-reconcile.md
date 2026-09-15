# PLAN — P2 · Schema + Types Reconcile (against the intent corpus)

> **Phase:** P2 of the backend-replan campaign (`docs/roadmap/backend-consolidation-plan.md`, ADR-021).
> **Status:** DRAFT — awaiting its own Approval 1 (§XXVI gate 1). Per ADR-021 §3.6 this phase runs its
> own plan + gates.
> **Profile:** project-foundation · **Authored:** 2026-09-13
> **Consumes:** `docs/specs/foundation/backend-intent/corpus.md` (+ `parts/*.md`) — the P1 ground truth.
> **Deliverables:** an audit report (`schema-audit.md`) · targeted schema/types/validator fixes ·
> the rebuilt notes hub + a new appended migration · a deleted-symbol-clean, introspection-green tree.

---

## 1. Goal & the reconcile contract

Bring the DB-4 schema + `@vida/types` + validators into agreement with the intent corpus — **targeted
fixes, not a wholesale redo of the 117 gated tables** (ADR-021 §3.3). Done when:

- **R1 · Every schema-affecting corpus item is reconciled** — each is ALIGNED (schema already supports it),
  FIXED (a targeted change applied), or DEFERRED (legitimately later, noted with its home). None silently
  unaddressed.
- **R2 · The notes hub is rebuilt** — `pages`/`page_links`/`note_attachments` + the `entity_type` registry
  vocabulary + `@vida/types` + validators re-authored from the corpus's `notes-and-pages` intent, on a
  **new appended migration** (forward-only; not refilling slot 012), with the ~10 polymorphic consumers +
  `entity_links`/`entity_tags`/`_registry` re-validated against the rebuilt shape.
- **R3 · Types colocation + CHECK-vocab are correct** — no domain's vocab is mis-filed (the pomodoro-class
  bug), OPEN vs FIXED CHECK placement matches conventions ([[open-vocab-columns-take-no-sql-check]]).
- **R4 · The tree is green + clean** — typecheck 11/11, DDL-introspection parity (mirror ≡ migration),
  0 dangling imports of any deleted/renamed symbol.

## 2. The audit surface — which corpus items imply schema (the filter)

The corpus has 1,194 service intent items; **most need NO schema change** (derivations/facades run over
existing columns). P2 audits ONLY the **schema-implicating** subset — do not re-audit pure service logic:

- **Part C2 live-intent** where a derivation must **persist** a value (a column) rather than compute on read.
- **Part C `⚠ INTENDED` / `[DEFERRED — build phase]` flags** that name a column/table/index/CHECK
  (the DB-4 gate authored many; some were deferred).
- **`measurement_kind` / `binding_mode` AMENDs** flagged across pursuable entities (ADR-011;
  `schema-foundation-build-flow.md:191`).
- **New-vocab CHECKs** the corpus introduces (OPEN vs FIXED per conventions).
- **Blind-index (`*_bidx`) columns** — a corpus item requiring **equality-lookup / filtering over an `[E]`
  field** (NOT full-text — that's FTS5/DB-8) implies a `*_bidx` column + its index (`schema-foundation-build-flow.md:190`;
  `finance.ts:86` `category_bidx` precedent). **The corpus never NAMES these** (grep `bidx` across corpus+parts = 0),
  so they must be INFERRED from the search/filter intent — an explicit audit trigger, not a doc-cited flag.
- **Part D UNKNOWNs homed to P2** — schema-shape resolutions.
- **The notes hub** (R2 — a rebuild, not an audit).

An item that implies no persisted shape is **out of P2** (it's a P3 service-decomposition concern).

## 3. Method — per-domain reconcile

For each of the **19 domain `schema/*.ts` files + the 12 `schema/foundation/*.ts` substrate files**
(`ls packages/core/src/db/schema/*.ts packages/core/src/db/schema/foundation/*.ts`, minus
`_shared`/`_registry`/`index`; **no `notes.ts` — torn down, rebuilt in §4**) + their `@vida/types` files +
validators, cross-mapped to the corpus's 22 module + 12 cross-cutting parts (**N:M, not 1:1** — e.g.
sessions/scheduling/pomodoro/journals span `foundation/{sessions,scheduling,session-extensions}.ts` +
`journals.ts`; languages is dissolved, 0 files) + the filtered surface (§2):

1. **Classify each schema-affecting item:**
   - **ALIGNED** — schema already supports it (cite the column/table).
   - **GAP** — the corpus (FACT-cited) requires a shape the schema lacks.
   - **DIVERGENT** — schema has something the corpus contradicts (or a stale shape).
   - **DEFERRED** — intent is legitimately later (M2/M3/M4 or a design-pass); no schema now, home it.
2. **Fix rule (keeps it targeted):** apply a change NOW iff the item is (a) FACT-cited, (b) **required by an
   in-scope M1 service behavior** to persist/derive, AND (c) not already homed to a later milestone.
   Otherwise note + defer. A DIVERGENT stale shape is fixed if a service depends on the corpus shape.
   - **Expose-vs-add (critical anti-redundancy):** a DB-4 `⚠ INTENDED` column **already present** in the
     mirror + migration (e.g. `category_bidx`, or an already-authored `measurement_kind`/`binding_mode`
     nullable slot) that an M1 service now needs is **ALIGNED → expose in types/validator only, NO
     migration** (`schema-foundation-build-flow.md:100` — a manufactured "gap" on an authored inert column
     was struck at a prior gate). Only a **genuinely absent** column is a GAP → appended migration. Do not
     re-migrate authored-but-inert columns.
3. **Apply per ADR-016 discipline:** hand-written SQL in a **new appended migration** + the Drizzle
   type-mirror + `@vida/types` tuple/interface + the Zod validator + the SQL-CHECK↔tuple parity — the
   DB-4 5-phase pattern (Phase-5 DDL-introspection parity per changed table).

## 4. Notes hub rebuild (R2 — the one non-audit sub-phase)

- **Exact paths** (do NOT deviate): `packages/core/src/db/schema/notes.ts` (`pages`·`page_links`·
  `note_attachments`) · `packages/types/src/note.ts` (**flat**, per the task.ts/session.ts/finance.ts
  convention — NOT under `entities/`; `PAGE_TYPE`·`ENTITY_LINK_TARGET`·`Page`/`PageLink`/`NoteAttachment`;
  the pomodoro enums already re-homed to `session.ts` STAY there; do NOT resurrect the stray empty
  `packages/types/src/notes.ts`) · `packages/core/src/validators/note.ts`. Grounded in
  `parts/notes-and-pages.md` (recovered-from-`main` intent) + the reconciled `entity_type` registry vocab.
- **P2 re-adds `validators/note.ts` ONLY** — `packages/core/src/services/notes/` is **P3** (do not
  resurrect it here; the stale `dist/validators/note.*` artifacts are ghosts, ignore them).
- New **appended** migration `0XX_notes.ts` at **`version: 33`** (next after 032) — register in `runner.ts`
  `ALL_MIGRATIONS`. **Why not slot 012:** the runner filters `m.version > currentVersion` (`runner.ts:250`),
  so a `version: 12` migration is **silently skipped** on an already-migrated device (12 ≯ 32) → notes tables
  never created; a `version: 33` is picked up, and `LATEST_VERSION`/`listMigrations().length` derive
  dynamically (`runner.ts:135`) so the runner test stays green automatically (no contiguity assertion; the
  slot-12 gap is inert). Re-add the barrel exports (types/core/schema/validators indexes) + the parity rows.
- **Self-containment (why the forward-only rebuild is safe):** no migration references `pages` via a FK
  (grep `REFERENCES` = empty), `entity_links.page_id` is plain TEXT no-FK by design (`spaces.ts:21-22`
  "so the table stands up before N&P exists"), and each introspection test applies its migration in
  isolation (never scans the runner) — so the notes migration is order-independent; the version gap is
  invisible to parity.
- **Blast radius = SOFT vocabulary/registry-consistency re-validation, NOT structural** (no FK coupling
  exists): confirm `entity_type='page'`/`note`/`journal` remain registered in `_registry.ts` (untouched by
  teardown — likely a no-op) and the seed/CHECK vocab agrees across the modules whose `entity_type` targets
  pages/notes + `entity_links`/`entity_tags`. Nothing breaks when notes returns; this is a consistency check.
- **Deleted-symbol sweep:** re-confirm 0 dangling imports (teardown removed them; the rebuild re-adds).

## 5. Types colocation + CHECK-vocab audit (R3)
- Grep each domain's enum/vocab consumers; verify vocab lives in its owning `@vida/types` file (catch
  mis-files like the pomodoro-in-notes bug). Fix mis-homes (move + re-export + validator reconcile).
- OPEN (user-extensible/modality) → plain TEXT no CHECK; FIXED (closed taxonomy) → CHECK + parity row.

## 6. Deliverables
- `docs/specs/foundation/backend-intent/schema-audit.md` — per-domain audit table (ALIGNED/GAP/DIVERGENT/
  DEFERRED, each cited) + the applied-fix list + the deferred-with-home list.
- Applied schema/types/validator changes + the new notes migration.
- Green tree (§ R4).

## 7. Gate (P2's own)
1. **Method gate (now):** `/critique` on THIS plan — is the audit surface filter (§2) correct (nothing
   schema-affecting excluded)? is the fix rule (§3.2) sound (targeted, not creeping into a redo)? is the
   notes-hub blast radius complete? → Approval 1.
2. **Audit-report gate:** independent critic on `schema-audit.md` — every GAP genuinely corpus-proven, no
   DEFERRED that's actually M1-required, no DIVERGENT missed. → Approval 2 (before applying fixes).
3. **Post-impl gate:** after fixes — DDL-introspection parity per changed table + typecheck 11/11 + the
   deleted-symbol sweep + `/critique`. → P2 done.

## 8. Acceptance (P2 done when) — ✅ ALL MET (2026-09-14)
- [x] `schema-audit.md`: 435 items classified + cited; **0 GAP**; every DIVERGENT resolved, 117 DEFERRED-with-home
  (0 unhomed). 0 unaddressed.
- [x] Notes hub rebuilt (schema + types + validators + appended migration `033_notes.ts` v33 + barrels + parity
  row + new introspection test); `_registry` re-validated complete (no-op); consumers re-checked (no-FK, no break).
- [x] Types colocation correct (0 mis-filed vocab; O4 `'llm'`→`'ai'` unified); OPEN/FIXED CHECK placement per conventions.
- [x] typecheck 11/11 · DDL-introspection parity green (notes 12 tests) · 0 dangling imports · `@vida/core` 796/796.
- [x] Audit-report gate (2 critics SHIP) + post-impl gate (independent critic SHIP) pass.

**Disposition ledger (Approval 2, Victor 2026-09-14):** O1 keep course_type modality · O2 keep tasks.kind FIXED ·
O3 DEFER daily_cap-split + nutrition name_bidx to M1.2 module builds (flagged, `schema-audit-deferred-homes.md`) ·
O4 UNIFY provenance to `manual|ai|import` (applied) · O5 keep exercise_plans.status OPEN. Expose-sweep (112) +
progress→null batch DEFERRED to DB-11 / module builds (scope refinement).

## 9. Out of scope for P2
Pure service logic that implies no persisted shape (→ P3) · the decomposition/issue list (P3) · the
frontend (P6) · a wholesale redo of the 18 non-notes domains (audit + targeted fix only) · resolving GG4
and other Part-D UNKNOWNs not homed to P2 (they carry their own resolve-by phase).

## 10. Execution note
The per-domain audit (22 schemas × corpus cross-check) is another fan-out — likely a workflow (per-domain
auditor → findings → central triage → applied fixes), decided at execution after Approval. The notes-hub
rebuild is authored directly (single coherent unit), not fanned out.
