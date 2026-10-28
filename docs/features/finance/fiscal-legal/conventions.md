<!-- Conventions — features/finance/fiscal-legal · /documentation Phase 2 · sources: intake/fiscal-legal.md RESOLUTION · ADR-014 · ADR-015 · CLAUDE.md Conventions -->

# Conventions — Fiscal & Legal ("Jurisdiction Compass") (level: Finance sub-context)

## How to build here

- **Disclaimer-first, always.** Every advisement / what-if / derived-obligation output carries **"informational, not
  professional/legal/tax advice"** — a first-class label a caller cannot strip; AI outputs also carry `source = ai`
  (FL-3/FL-13). `[FACT: RESOLUTION FL4; ADR-015 §3.6]`
- **Never file, never auto-act.** The OS situates/organizes/models and **hands filing off**; **no** legal/tax action
  fires without explicit user confirmation (FL-2/FL-3). `[FACT: RESOLUTION FL2/FL4]`
- **Rule-packs are public data via the ADR-014 `public-reference` layer (X2, = Layer-2).** **Device-mediated** (X1, never a
  server proxy), fetch the **whole set** (X3 — bundle/bulk, query a **local copy**, **verify signature + version** before
  applying), gated by **`external_in_ok`** (X5); never compute obligations on unverified law (FL-5). `[FACT: ADR-014 X1/X2/X3/X5 + provenance owed]`
- **Advisement over private numbers rides ADR-015.** `on_device` agentic = the ZK-safe path (ADR-015 §3.1's _mode_, not an
  AI4 agent); `cloud` = the disclosed dent — a **scope-minimized** egress (AI3 — only the needed slice) under
  **`external_out_ok`** (X5) + the X4 gate + X6 compositional treatment. Never send fiscal data to a model outside
  ADR-015's guard. `[FACT: ADR-014 X4/X5/X6; ADR-015 AI1/AI3]`
- **Tag Finance, don't copy it.** Money-touch = a **jurisdiction link** on existing Finance entities; never duplicate a
  balance or restructure a Finance table (FL-9). `[FACT: INT-1; RESOLUTION FL3]`
- **Legal-entities compose Projects.** A legal-entity is/links a Project; don't build a parallel entity model (FL-8). `[FACT: projects]`
- **Obligations become Tasks through the Tasks handler** (INT-2); this context derives, Tasks owns (FL-6). `[FACT: INT-2]`
- **Local-first + ZK.** SITUATE/TRACK/what-if compute **on-device** over `[E]` data; our server sees nothing (FL-12). `[FACT: ZK-1; LF-2]`
- **Data conventions (inherit CLAUDE.md):** UUIDv7 TEXT PKs · Unix-ms timestamps · money INTEGER cents · dates
  `YYYY-MM-DD` · `[E]` on user fiscal free-text + amounts (residency/entity/obligation notes, saved what-if scenarios) ·
  **rule-packs are public plaintext (P)** · jurisdiction codes / obligation types / FKs structural (P) · the guarded paths
  carry the existing ADR-010 grant tokens **`external_in_ok`** / **`external_out_ok`** (X5, no new columns) · AI outputs
  carry `source = ai` (AI6) · `_sync_*` on syncable tables · soft delete. `[FACT: CLAUDE.md Conventions; ZK-1; ADR-014 X5 public-data; ADR-015 AI6]`

## Naming & layout

- Invariants are `FL-N`; aspect docs = the canonical 5. This is a **Finance sub-context** (`docs/features/finance/fiscal-legal/`).
- Tables: `fiscal_residencies` · `legal_entities` · `fiscal_obligations`; jurisdiction link on Finance entities; rule-packs = ADR-014 layer (no user table).
- `owner_type` ∈ {user, legal_entity}; `residency_type`/`obligation_type` = per-jurisdiction enums (from rule-packs).
- AI outputs: `source = ai` + the not-professional-advice disclaimer (FL-13).

## Pitfalls / local "never do"

- **Never file a return or fire a legal/tax auto-action** — situate + hand off; user confirms (FL-2/FL-3).
- **Never present an output without the not-professional-advice label** (FL-3).
- **Never compute on an unverified rule-pack** — verify signature+version first (FL-5).
- **Never per-item-fetch a rule** (leaks the user's jurisdiction interest) — bundle/bulk the **whole set** (X3, `public-reference`).
- **Never route the rule-pack fetch or the AI call through the server** — both are device-mediated / BYO-key, server-blind (X1 / AI1).
- **Never auto-transmit on a `cloud` what-if** — it is a user-consented X4 egress under `external_out_ok` (X5); **never send more than the scope-minimized slice** (AI3).
- **Never send fiscal data to a model outside ADR-015's guard** (FL-7).
- **Never build an agentic AI actor here** — the what-if is a scoped, informational, no-auto-action advisement, not an AI4 tool-envelope agent (the agentic-actor contract is Projects').
- **Never copy a Finance balance or restructure a Finance table** — link a jurisdiction only (FL-9).

## Completion checklist

- [x] how-to-build · [x] naming/layout · [x] pitfalls · [x] inherits CLAUDE.md conventions · [x] [FACT/INTENT] per claim · [x] disclaimer-first + no-file/no-auto-act + rule-packs-public + ADR-015-guarded enforced
