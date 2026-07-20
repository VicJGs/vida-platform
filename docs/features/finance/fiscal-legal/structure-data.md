<!-- Structure & Data — features/finance/fiscal-legal · /documentation Phase 2 · sources: intake/fiscal-legal.md RESOLUTION · ADR-014 · ADR-015 · Finance/Projects structure-data -->

# Structure & Data — Fiscal & Legal ("Jurisdiction Compass")  (level: Finance sub-context)

## Data model

### As-is (v2 — FACT, the floor)
- **Nothing.** Net-new context — v2 has **no** fiscal/legal schema. v1 carried only income `is_taxable` (dropped in v2).
  `[FACT: grep clean; intake/finance.md v1 is_taxable dropped]`

### Intended (the sub-context — ⚠ INTENDED → ADR-002 §5.20) `[INTENT: RESOLUTION]`
- **`fiscal_residencies`** (NEW) — `owner_type{user, legal_entity} · owner_id · jurisdiction_code · residency_type ·
  start_date · end_date? · notes[E]`. The SITUATE spine: where the user + each entity is fiscally-legally resident.
- **`legal_entities`** (NEW — **links to Projects**) — `project_id? · name[E] · entity_type(per jurisdiction) ·
  jurisdiction_code · registration_ref[E]`. A project can *be* or *own* a legal entity (FL-8); personal vs entity fiscal
  separation. `[INTENT FL-8; INTENT: legal-entity composes Projects — forward-dep; Projects has project_contacts today, not yet a legal-entity model]`
- **Jurisdiction link on Finance entities** (AMEND — a tag/link, not a rewrite) — an optional `jurisdiction_code` (or a
  join) on `accounts`/`transactions`/`assets`/`income_streams`/`investments` = "where money is/will/planned-to touch"
  (FL-9). **Existing Finance columns untouched.** `[INTENT FL-9]`
- **`fiscal_obligations`** (NEW — **derived**, user-confirmable) — `jurisdiction_code · owner_type/owner_id ·
  obligation_type · due_date · status · source_rulepack_version · linked_task_id?`. Derived on-device from user data +
  rule-packs (FL-6); each becomes an obligation **Task** on confirm. `[INTENT FL-6]`
- **Rule-packs (INFORM)** — **NOT a user table**: public datasets via the **ADR-014 public-reference layer** (bundled/
  bulk, queried local, **provenance-signed + versioned**). A jurisdiction's brackets/entity-types/deadlines live here.
  `[FACT: ADR-014 Layer-2 + provenance owed]`
- **What-if / advisement** — **no persistent table required** beyond an optional `[E]` saved-scenario; runs via **ADR-015**
  (on-device agentic ZK-safe · cloud dent); outputs carry `source = ai` + disclaimer (FL-13). `[FACT: ADR-015]`

## Dependencies / graph (within the coupling budget — constitution §6)
- **Depends on (composes, via seams):** **Finance** (money-touch — reads accounts/transactions/assets/income; adds
  jurisdiction link) · **Projects** (legal-entity model) · **Purpose & Goals** (long-run impact via ADR-011
  contributions) · **Tasks** (obligation Tasks, INT-2) · **Notifications** (ADR-013 — obligation reminders) · **Global
  Calendar** (obligation dates) · **ADR-014** (rule-packs, public layer) · **ADR-015** (advisement/what-if).
- **Depended on by:** **Purpose** (reads long-run fiscal impact) · **Tasks/Notifications/Calendar** (receive obligations).
  It is a **leaf-ish** sub-context — mostly a reader + a deriver. `[INTERP: dependency reasoning from the module docs]`
- **No cycle:** it reads Finance/Projects, derives obligations through owning-module handlers (INT-2), and writes only its
  own residency/entity/obligation rows. `[FACT: INT-2; INT-1]`

## ADRs / structural decisions
- **ADR-014 (External Data Ingestion)** — rule-packs are the **public-reference layer** (bundled/bulk, provenance-signed,
  versioned). This context is *the* largest INFORM instance. `[FACT: ADR-014]`
- **ADR-015 (AI/LLM under ZK)** — advisement/what-if over the user's numbers rides the two-mode AI layer. `[FACT: ADR-015]`
- **ADR-011 (Measurability)** — long-run fiscal impact ladders into Purpose via `contributions`. `[FACT: ADR-011]`
- **ADR-002 §5.20 amendment (build-phase)** — `fiscal_residencies` · `legal_entities` · jurisdiction link on Finance
  entities · `fiscal_obligations` join the owed ledger. `[INTENT: §5.20]`

## Single source of truth (constitution §3)
- **Money lives in Finance** — this sub-context tags it with jurisdiction, never copies balances (FL-9).
- **Legal-entities live as/with Projects** — not a duplicate entity model (FL-8).
- **Public law lives in rule-packs** (ADR-014), versioned + signed — never hand-copied into user data (FL-5).
- **Obligations become Tasks** (owned by Tasks) — this context derives, Tasks owns (FL-6).
- **AI outputs are drafts** (`source=ai` + disclaimer), never the source of truth (FL-13).

## Completion checklist
- [x] data model (net-new FACT floor vs INTENDED) · [x] dep graph within budget (no cycle) · [x] ADRs (014/015/011 + §5.20) · [x] single source per concern · [x] [FACT/INTENT] on every claim · [x] Finance-untouched + rule-packs-not-a-table stated
