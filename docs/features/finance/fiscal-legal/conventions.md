<!-- Conventions — features/finance/fiscal-legal · /documentation Phase 2 · sources: intake/fiscal-legal.md RESOLUTION · ADR-014 · ADR-015 · CLAUDE.md Conventions -->

# Conventions — Fiscal & Legal ("Jurisdiction Compass")  (level: Finance sub-context)

## How to build here
- **Disclaimer-first, always.** Every advisement / what-if / derived-obligation output carries **"informational, not
  professional/legal/tax advice"** — a first-class label a caller cannot strip; AI outputs also carry `source = ai`
  (FL-3/FL-13). `[FACT: RESOLUTION FL4; ADR-015 §3.6]`
- **Never file, never auto-act.** The OS situates/organizes/models and **hands filing off**; **no** legal/tax action
  fires without explicit user confirmation (FL-2/FL-3). `[FACT: RESOLUTION FL2/FL4]`
- **Rule-packs are public data via ADR-014 Layer-2.** Bundle/bulk, query a **local copy**, **verify signature + version**
  before applying; never compute obligations on unverified law (FL-5). `[FACT: ADR-014 Layer-2 + provenance owed]`
- **Advisement over private numbers rides ADR-015.** On-device agentic = the ZK-safe path; cloud = the disclosed dent
  (the user scopes what's sent, ADR-014 egress). Never send fiscal data to a model outside ADR-015's guard. `[FACT: ADR-015]`
- **Tag Finance, don't copy it.** Money-touch = a **jurisdiction link** on existing Finance entities; never duplicate a
  balance or restructure a Finance table (FL-9). `[FACT: INT-1; RESOLUTION FL3]`
- **Legal-entities compose Projects.** A legal-entity is/links a Project; don't build a parallel entity model (FL-8). `[FACT: projects]`
- **Obligations become Tasks through the Tasks handler** (INT-2); this context derives, Tasks owns (FL-6). `[FACT: INT-2]`
- **Local-first + ZK.** SITUATE/TRACK/what-if compute **on-device** over `[E]` data; our server sees nothing (FL-12). `[FACT: ZK-1; LF-2]`
- **Data conventions (inherit CLAUDE.md):** UUIDv7 TEXT PKs · Unix-ms timestamps · money INTEGER cents · dates
  `YYYY-MM-DD` · `[E]` on user fiscal free-text + amounts (residency/entity/obligation notes, saved what-if scenarios) ·
  **rule-packs are public plaintext (P)** · jurisdiction codes / obligation types / FKs structural (P) · `_sync_*` on
  syncable tables · soft delete. `[FACT: CLAUDE.md Conventions; ZK-1; ADR-014 public-data]`

## Naming & layout
- Invariants are `FL-N`; aspect docs = the canonical 5. This is a **Finance sub-context** (`docs/features/finance/fiscal-legal/`).
- Tables: `fiscal_residencies` · `legal_entities` · `fiscal_obligations`; jurisdiction link on Finance entities; rule-packs = ADR-014 layer (no user table).
- `owner_type` ∈ {user, legal_entity}; `residency_type`/`obligation_type` = per-jurisdiction enums (from rule-packs).
- AI outputs: `source = ai` + the not-professional-advice disclaimer (FL-13).

## Pitfalls / local "never do"
- **Never file a return or fire a legal/tax auto-action** — situate + hand off; user confirms (FL-2/FL-3).
- **Never present an output without the not-professional-advice label** (FL-3).
- **Never compute on an unverified rule-pack** — verify signature+version first (FL-5).
- **Never per-item-fetch a rule** (leaks the user's jurisdiction interest) — bundle/bulk the whole set (ADR-014 Layer-2).
- **Never send fiscal data to a model outside ADR-015's guard** (FL-7).
- **Never copy a Finance balance or restructure a Finance table** — tag with jurisdiction only (FL-9).

## Completion checklist
- [x] how-to-build · [x] naming/layout · [x] pitfalls · [x] inherits CLAUDE.md conventions · [x] [FACT/INTENT] per claim · [x] disclaimer-first + no-file/no-auto-act + rule-packs-public + ADR-015-guarded enforced
