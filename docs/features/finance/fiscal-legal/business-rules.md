<!-- Business Rules — features/finance/fiscal-legal · /documentation Phase 2 · sources: intake/fiscal-legal.md RESOLUTION · ADR-014 · ADR-015 · Finance/Projects/Purpose/Tasks/Notifications docs -->

# Business Rules — Fiscal & Legal ("Jurisdiction Compass")  (level: Finance sub-context)

> Inherits the CORE constitution `[[../../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3, EN, SU-1, INT-1, INT-2,
> **EX-1/EX-2**, PC-3. Every rule below complies. **Altitude note:** this is **net-new** — v2 has **no fiscal/legal
> schema** (v1 had only income `is_taxable`, dropped). The whole surface below is **⚠ INTENDED**; live-vs-INTENDED is
> flagged per rule and in the ⚠ delta. It is a Finance **sub-context** (FL1), scoped to situate/organize/plan (FL2).

## Invariants (what is ALWAYS / NEVER true)

- **FL-1 — A Finance sub-context, not a module.** It lives under Finance and **composes** Finance (money-touch) +
  Projects (legal-entities) + Purpose (long-run impact) + Tasks/Notifications/Calendar (obligations); it owns only the
  fiscal-legal situation + obligation-derivation, never another module's data. `[INTENT: RESOLUTION FL1 — Victor]`
- **FL-2 — Scope is situate/organize/surface/model; filing HANDS OFF.** The OS **never files** a tax return and is
  **never a regulated service**: it situates the user, tracks obligations, and models impact; the filing step hands to a
  professional or a 3rd-party engine. Anything that would make Vida the filer is out of scope. `[INTENT: RESOLUTION FL2]`
- **FL-3 — NOT professional advice — a first-class product constraint.** Every advisement/what-if/obligation output is
  labeled **"informational, not professional/legal/tax advice"**; AI outputs also carry **`source = ai`** (FL-13); there
  are **NO auto-actions** on legal/tax matters — the user explicitly confirms every derived obligation, filing hand-off,
  and plan. `[INTENT: RESOLUTION FL4 — Victor]`
- **FL-4 — SITUATE is the user's own local `[E]` data (ZK-safe spine).** Residency + money-touch modeling is the user's
  structured data, computed **on-device**; no plaintext leaves. This capability needs **no** external integration and is
  the always-available core. `[FACT: ZK-1; LF-1; EX-1 core-works-without-integration]`
- **FL-5 — INFORM rides the ADR-014 `public-reference` layer (X2).** Per-jurisdiction rule-packs (brackets · entity types ·
  deadlines · obligations) are **public law, not private data**: **device-mediated** (X1 — fetched/parsed on-device, server
  never a fetch proxy), fetched as the **whole set** (X3 — bundled/bulk opt-in defaults, **queried from a local copy** so the
  read hides which rule the user consults), **provenance-signed + versioned** (X3 owed — a poisoned rule-pack is a
  correctness + legal hole), gated by the ADR-010 grant **`external_in_ok`** (X5, no new grant table); revoking the
  subscription stops future fetch but keeps already-downloaded packs (X9). `[FACT: ADR-014 X1/X2/X3/X5/X9 (Layer-2 = public-reference); provenance/signing owed]`
- **FL-6 — TRACK OBLIGATIONS is derived locally → Tasks + Notifications + Calendar.** Deadlines/filings/payments are
  **computed on-device** from the user's data + rule-packs, then surfaced as obligation **Tasks** (INT-2 via the Tasks
  handler), **Notifications** (ADR-013), and the cross-module **Calendar**. The System stores no obligation another
  module owns. `[FACT: Tasks INT-2; ADR-013; Global Calendar parked surface]`
- **FL-7 — ADVISE / WHAT-IF rides ADR-015; informational only.** Advisement over the user's *actual* numbers uses the
  ADR-015 AI layer in its two `on_device` / `cloud` modes (AI1, server-blind) — **`on_device` agentic = the ZK-safe path**
  (ADR-015 §3.1's *mode* label, **not** an AI4 tool-wielding agent), **`cloud` = a disclosed, opt-in content dent**: a
  scope-minimized egress (AI3 — only the needed numeric slice, not the vault) under **`external_out_ok`** (X5) + the X4
  egress gate, and because it combines a sensitive read with an external grant the model payload is treated as **outbound**
  (X6). The model call splits from the ADR-014 data move (X11). A rule-pack feeding the prompt carries its provenance in
  (AI5). Outputs are informational (FL-3), never an auto-action. `[FACT: ADR-014 X4/X5/X6/X11; ADR-015 AI1/AI3/AI5; AI4 N/A]`
- **FL-8 — Legal-entities compose Projects; personal vs entity fiscal separation.** A legal-entity is modeled as/linked
  to a **Project** (a project can *be* or *own* a legal entity); the user's **personal** fiscal situation and each
  **entity's** are tracked separately and can be viewed together. `[INTENT: RESOLUTION FL3; INTENT: legal-entity composes Projects — forward-dep; Projects has project_contacts today, not yet a legal-entity model]`
- **FL-9 — Money-touch = a jurisdiction link on Finance entities.** "Where money is / will / is-planned-to touch" is a
  **jurisdiction tag/link on existing Finance entities** (accounts · transactions · assets · income · investments) —
  Finance entities are **untouched** in structure; the sub-context adds the jurisdiction association. `[INTENT: RESOLUTION FL3]`
- **FL-10 — Long-run impact ladders into Purpose.** A modeled fiscal outcome (e.g. "incorporating here saves X over N
  years") can feed **Purpose & Goals** long-run planning via the measurement/contribution rails (ADR-011), never a
  bespoke path. `[FACT: ADR-011 contributions; intake long-run-impact]`
- **FL-11 — Opt-in, user-owns-risk, manual fallback.** The guarded capabilities (INFORM rule-packs via `external_in_ok`,
  ADVISE cloud via `external_out_ok` — X5) are opt-in and user-owns-risk (EX-1), and each grant is **revocable/fail-closed**
  (revoke = stop future fetch/egress, keep already-ingested — X9); SITUATE/TRACK work manually without them (the user can
  type residency + obligations by hand). `[FACT: EX-1; ADR-014 X5/X9]`
- **FL-12 — Local-first + ZK.** Obligation derivation + what-if run **on-device** over `[E]` user data; **our server sees
  nothing** (ZK-1). A `cloud`-AI advisement is the only path that shares data, and only as ADR-015's disclosed dent —
  scope-minimized (AI3) and X4-egress-gated. `[FACT: ZK-1; LF-2; ADR-015 AI3; ADR-014 X4]`
- **FL-13 — AI-authored output is flagged + carries the disclaimer.** A model-generated advisement/what-if carries
  `source = ai` (AI6, ADR-015 §3.6 — the `manual|ai|import` authorship triad) **and** the FL-3 "not professional advice"
  label; it is a draft the user owns, never an unlabeled truth. `[FACT: ADR-015 §3.6 AI6; RESOLUTION FL4]`
- **FL-14 — Encryption.** `[E]` on all user fiscal-legal free text + amounts (residency notes, entity names, obligation
  notes, what-if scenarios); **rule-packs are public plaintext** (P, bundled). Jurisdiction *codes*, obligation
  types/dates, FKs are structural (P). `[FACT: ZK-1; ADR-014 public-data]`
- **FL-15 — External + AI paths are ADR-014/015-layered (the mechanical grant/scope contract).** Rule-packs are
  device-mediated `public-reference` whole-set bulk ingest (X1/X2/X3) under **`external_in_ok`**; the what-if is an
  ADR-015 model call split from the data move (X11), offered `on_device`/`cloud` (AI1, server-blind), a `cloud` run being a
  scope-minimized (AI3) egress under **`external_out_ok`** (X5) + the X4 gate + X6 compositional treatment, with rule-pack
  provenance carried into any prompt (AI5); outputs carry `source = ai` (AI6). Both grants are revocable/fail-closed (X9).
  **No AI4 agentic envelope** — the what-if is a scoped, informational, no-auto-action advisement (FL-3/FL-7), not a
  tool-wielding actor; and **no new grant column/table** — `external_*_ok` are existing ADR-010 fields (X5). `[INTENT: ADR-014 X1/X2/X3/X4/X5/X6/X9/X11; ADR-015 AI1/AI3/AI5/AI6; AI4 N/A]`

## Validation & edge cases
- A user in **multiple jurisdictions** (personal + an entity abroad) → each residency/money-touch is tracked separately;
  a combined view aggregates without merging the entities (FL-8). `[INTERP FL-8]`
- A rule-pack whose **signature/version fails verification** → not applied; the obligation derivation flags "rule-pack
  unavailable/unverified", never computes on unverified law (FL-5). `[INTERP FL-5]`
- A what-if run with a **missing rule-pack** for a jurisdiction → returns "insufficient rule data", never fabricates a
  number (FL-5/FL-7). `[INTERP]`
- An obligation the user **disputes** → user overrides/dismisses; no auto-action ever fired (FL-3). `[FACT: FL-3 no-auto-action]`
- **Filing** requested → the OS produces the organized summary and **hands off** (export / professional link); it does
  not file (FL-2). `[FACT: FL-2]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Situate (residency/money-touch) | — | "no jurisdictions set" | — | residencies + money-touch mapped |
| Rule-pack (INFORM) | fetching bulk | "no pack for jurisdiction" | signature/version fail → flag, don't apply | signed pack, local copy, versioned |
| Derive obligations | computing | "none due" | rule-pack unverified → flag | obligation Tasks + Notifications + Calendar |
| What-if / advise | modeling | "insufficient rule data" | AI/model error → flag, retry | informational scenario + `source=ai` + disclaimer |
| Hand-off filing | preparing summary | — | export fail → flag | organized summary handed to professional/3rd-party |

## Failure behavior (fail loud — constitution §5)
- Never compute an obligation or what-if on **unverified** rule-packs — flag and suppress (FL-5).
- Never fire an **auto-action** on legal/tax — every obligation/filing needs user confirmation (FL-3).
- A cloud-AI advisement failure is isolated; the local SITUATE/TRACK spine is unaffected (FL-7/FL-12).
- Every AI/what-if output shows the **"not professional advice"** label — no unlabeled fiscal claim (FL-3/FL-13).

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
**Entire surface is INTENDED** (v2 has no fiscal/legal schema; v1 had only income `is_taxable`, dropped). → §5.20:
`fiscal_residencies` · `legal_entities` (↔ Projects) · jurisdiction link on Finance entities · `fiscal_obligations`
(derived) · rule-packs via **ADR-014 public layer** (provenance/signed) · what-if/advise via **ADR-015**. Disclaimer +
`source=ai` on outputs. **Live today (FACT floor):** nothing — net-new context. `[FACT: grep clean; v1 is_taxable dropped]`

## Completion checklist
- [x] invariants [FACT/INTENT/INTERP] · [x] terminal states · [x] failure loud · [x] inherits constitution (ZK/EX/INT) · [x] drift flagged · [x] filing-hands-off + not-professional-advice + ADR-014/015 wiring stated
