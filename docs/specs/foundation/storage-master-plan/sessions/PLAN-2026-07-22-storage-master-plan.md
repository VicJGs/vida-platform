# PLAN — storage-master-plan (ADR-016 + master build plan)   (session: 2026-07-22-storage-master-plan · language: Markdown/English)
> Executive summary (Human Gate 1). Read to approve the DIRECTION. No-Guessing: every claim [FACT]/[INTERP]/[UNKNOWN].

## 1. Contexto & demanda
DB-1 shipped the storage primitives (commit b234e85). The from-zero rebuild now needs its two **governing artifacts**
before more tables are authored: a durable decision record (**ADR-016**) and a living **master plan** (the table
ledger + phase sequence + per-table-gate template). Without them, DB-2…DB-11 and the ~130 per-table gates run with no
locked plan — the exact drift the campaign exists to prevent. The strategy intake
(`docs/infrastructure/storage-rebuild-strategy.md`) captured the shape; this task formalizes it **through the gate**.
Affected: the entire storage rebuild + the AR-1 topology decision. `[FACT: storage-rebuild-strategy.md; DB-1 close-out]`

## 2. O que muda e por quê
**IN:**
- **ADR-016** (`docs/core/decisions/ADR-016-storage-layer-rebuild-from-zero.md`) — the decision: why from-zero · the
  `schema/` topology · the locked patterns (DB-1 primitives + enum model + systemic-gap fixes) · the per-table gating
  protocol · **RESOLVES the DDL-generation fork**. Registered in the ADR index + `architecture.md`.
- **storage-build-plan.md** (`docs/infrastructure/`) — the master plan: the full **table ledger** (every table ·
  owning domain · phase · FK-deps · readiness ✓/⏳/↔ · status), the **table-spec template**, the **phase sequence**
  (foundation-first → wave order), and the **context machinery** (ledger-resume + shape-decision log).

**OUT** (owned elsewhere): authoring any actual table → DB-3/DB-4 per-table gates; the full DB-cluster Linear
re-scope → a follow-up informed by this; DB-2 sync columns; per-table column enumeration (that IS each table's gate).

**Why now:** it is the plan every subsequent DB gate reads; locking it stops 130 gates from drifting. `[FACT: roadmap ① Database Layer]`

## 3. Regras de negócio relevantes (funcional)
- **[FACT]** The documented DDL model is **hand-written SQL migrations** (ADR-002 §5) + Zod (DB-9); Drizzle is
  query-only; no drizzle-kit installed. ADR-016 must either **ratify** this or **consciously deviate**.
  `[FACT: ADR-002 §2.3/§5; DB-1 finding; storage-rebuild-strategy.md "Open decisions"]`
- **[FACT]** The target table set = **Stream i** (§5.20's enumerated RETIRE/ADD/AMEND ledger — exact row counts
  pinned in the master ledger at authoring, ~11 retire · ~23 add · ~22 amend as of this reading) + **Stream ii** (the
  `structure-data.md` docs). `[FACT: ADR-002 §5.20]`
- **[FACT] Count / source correction (No-Guessing):** `find docs/features -name structure-data.md` = **24** (disk
  truth); §5.20's Stream-ii list names only **19** (a pre-2026-07-19 snapshot — omits `finance/fiscal-legal` ·
  `gamification` · `notes-and-pages` · `notifications` · `purposes-and-goals`). The ledger is keyed to **disk (24)**;
  §5.20 is a **cross-check, not the authority** for Stream ii. `[FACT: ADR-002 §5.20:3817 "19"; find = 24 — 5 delta docs verified on disk]`
- **[FACT]** **Per-table gating** — each table = its own Per-Step Build Gate (locked by Victor this campaign). The
  master plan is the shared relational context every gate reads.
- **[FACT]** **FK-dependency order** — a table is gated only after its referenced parents are authored; the ledger
  encodes this so gates can't run out of order.
- **[INTERP]** The master plan enumerates table **names + deps + phase + readiness**, NOT full columns — column
  detail is each table's own gate. Enumerating every column now would *be* the build; the ledger defers that per the
  per-table model.

## 4. Aceitação (funcional)
- [ ] **ADR-016** exists, follows `.adr/ADR-000-template.md`, and: states the from-zero decision + rationale (cited);
      defines the `schema/` topology; lists the locked patterns; specifies the per-table gating protocol; **resolves
      the DDL-generation fork** with rationale.
- [ ] **storage-build-plan.md** exists with: the full **table ledger** (every Stream-i + Stream-ii table, FK-dep
      order, ✓/⏳/↔, owning domain · phase · FKs-out · **row-state** planned→authored→verified); the **table-spec
      template** (incl. the row-state lifecycle + who flips it on gate-close); the **phase sequence**; the **context
      machinery**. The ledger's table count **reconciles** to the reconciliation buckets (~130-150).
- [ ] Every ledger table is **sourced** (its `structure-data.md` doc / §5.20 entry) — No-Guessing.
- [ ] The build-plan contains an explicit **DB-cluster → phase** table (each of DB-2…DB-11 → its phase P0…P-final →
      status); the Linear re-scope is noted (not executed).
- [ ] Both artifacts cross-reference; ADR-016 registered in the ADR index + `architecture.md`.

## 5. Questões em aberto / decisões pendentes
- **[DECISION — Victor, in this gate] The DDL-generation fork.** (A) **Ratify hand-written SQL migrations** — the
  documented model (ADR-002 §5); dual-authoring (Drizzle object + SQL migration per table); reversible. (B) **Adopt a
  drizzle-kit-generate hybrid** — Drizzle objects as source → `drizzle-kit generate` → the existing custom runner
  applies; single-source; would sanction a Drizzle `check()` helper; a deliberate deviation from ADR-001/002.
  **Recommendation: (A) ratify hand-written now**, record (B) as a revisitable option — it matches the docs and is
  reversible. ADR-016 records whichever you choose. **If (A):** ADR-016 also records (B)'s revisit trigger ("before
  DB-3 authors tables at volume") so the option survives this plan's retirement.
- **[DECISION — lock at authoring] Enumeration method.** Domain set = **`find`-derived (disk)**, NOT §5.20's stale
  19-list. Fan-out per-domain readers over **all 24** `structure-data.md` docs **+ the dissolved-module docs**
  (`docs/intake/bucket-list.md` · `docs/intake/duties.md` · `docs/features/languages/`) **+ §5.20 Stream i's
  cross-cutting/junction tables** (home rule = the **child** side of the FK). Extract each table + its FKs; assemble
  **FK-ordered** by topological sort over **hard** FKs — self-refs (`parent_task_id` · `store.parent_id`) impose no
  ordering (intra-table); polymorphic/`entity_type` FKs order after `_registry.ts`, pinning no single parent.
  Cross-check the final count against the reconciliation buckets so omissions surface.
- **[UNKNOWN: settles per-gate]** A subset of ⏳ tables (capability registry, `rules`, `planned_blocks`, session
  extensions, `store`) have shapes decided at their own gate — the ledger tags them ⏳; it does not resolve them.

## 6. Aprovação 1 (direção)
**APPROVED — Victor, 2026-07-22.** Direction + method approved. **DDL-generation fork resolved: (A) ratify
hand-written SQL migrations** (documented model; dual-authoring; reversible) — ADR-016 records A and logs B's revisit
trigger. Gate trail: /critique REVISE (miscite §5.20 19≠24 + method gaps) → fixed → /preflight PASSED.
