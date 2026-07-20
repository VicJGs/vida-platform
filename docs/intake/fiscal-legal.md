<!-- Intake — fiscal-legal · CAPTURED INTENT STUB (not a full Phase-1 harvest) · 2026-07-07
     Origin: Victor input during documentation-blueprint session, framed as "a Finance idea."
     Status: PRE-HARVEST. No v2 schema exists (net-new intent). Full Phase 1 (v1/v2 harvest + gap map +
     /critique gate) runs when this context is scheduled. This file preserves the intent verbatim + my
     structural assessment so nothing is lost. Every forward claim is INTERPRETATION unless cited. -->

# Intake — Fiscal & Legal  (working name; a.k.a. "Jurisdiction Compass")
# Level: Feature context (EMERGING) — cross-module: Finance ↔ Projects ↔ Purpose & Goals

> ⚠ **INTENDED-IMMATURE / net-new.** This is captured intent, not enforced reality. There is **no v2
> schema** for it yet. It is recorded now so the idea is not lost; it is fully harvested, reshaped, and
> gated in its own `/documentation` session later. Placement (own context vs. Finance sub-feature) is a
> DECISION for Victor at that session — captured here as "own emerging context, cross-ref from Finance."
>
> ⏸ **DEFERRED to POST-ALL-WAVES (Victor, 2026-07-07).** Victor will return to ENHANCE this idea after
> every documentation wave is complete. Do NOT schedule its Phase-1 session before then. This stub only
> holds the seed intent + assessment until that enhancement pass.

## The intent (Victor, verbatim intent, 2026-07-07)
People who dream big and want to plan and set goals properly hit one of the hardest walls in the
**economic-legal sphere**: the rules are many, differ per country/state, change constantly, and users are
usually unaware of how those rules influence them and impact their goals and decisions over the long run.
The feature should let a user **situate himself in any country/state** (each with different, changing rules),
help him **plan big** for companies/projects that need advisement in the economic-legal world, help him
**set things up and do his taxes** based on where his money **is, will be, and is planned to** touch — both
**personally** and as **legal entities (for projects)** — and let him **update this systematic approach and
refresh** it based on legal changes, new releases, and updates.

## Decomposition — 4 capabilities, very different risk profiles (INTERPRETATION)
1. **SITUATE** — model where the user + each project/legal-entity is fiscally-legally resident, and where
   money touches (personal + per-entity). User's own structured data. **ZK-safe.**
2. **INFORM** — per-jurisdiction rule knowledge base (brackets, entity types, filing deadlines,
   obligations). This is **public law**, not private data — safe to bundle or fetch; only leak is *which*
   jurisdiction the user queries (metadata, mitigable).
3. **TRACK OBLIGATIONS** — derive deadlines / filings / payments per jurisdiction → feed **Tasks +
   Notifications + Global Calendar** (forward deps). Computed locally over user data + public rules. **ZK-safe.**
4. **ADVISE & "DO TAXES"** — AI guidance over the user's *actual* financial numbers + tax prep/filing per
   jurisdiction. **The hard part** (see collisions + scope reframe below).

## ZK-safe SPINE vs. GUARDED EXTENSION (INTERPRETATION — the buildable split)
- **Spine (ships under pure ZK):** capabilities 1–3 + on-device what-if planning ("incorporate here vs.
  there; if money flows this way, here's what changes / what I'll owe / when"). Computation local over the
  user's own numbers + public rule-packs. No plaintext ever leaves the device.
- **Guarded extension (opt-in, user-owns-risk, manual fallback — the extension-model principle):**
  - AI advisement over private financial data → **on-device/agentic = ZK-safe path; cloud LLM = opt-in
    plaintext dent** (identical to Projects G6 stance).
  - Live legal-change ingestion ("refresh on new releases") → external-fetch pipeline, consent-gated.
  - Actual tax computation/filing engines per jurisdiction → 3rd-party integration or DEFERRED.

## SCOPE REFRAME I'm urging (my assessment — Victor to confirm)
"**Do his taxes for any country/state**," taken literally, is *TurboTax-for-the-world*: a regulated
professional service, per-jurisdiction filing engines, constant upkeep, and real legal liability — a
company, not a feature, and the opposite altitude from Vida's strength (private, local-first **planning +
knowledge**). Reframe: Vida **situates, organizes, surfaces obligations, and models long-run impact**; the
**filing itself hands off** to a professional or a deferred/3rd-party engine. Keeps the ambition, stays
buildable + ZK-compliant + out of the liability trap.

## Dependencies (this is the LARGEST concrete instance of two already-filed ADRs)
- **ADR: External DATA ingestion under zero-knowledge** — the living-ruleset refresh IS this ADR. Softer
  than bank data because legal rules are *public*; strongest justification for the ADR yet. `[link: task backlog]`
- **ADR: AI/LLM integration under zero-knowledge** (Projects G6) — advisement over private numbers; on-device
  agentic is the ZK-safe path. `[link: task backlog]`
- **CORE constitution: the "extension-model" principle** — this feature is a textbook case (ZK core
  untouched; external/AI layers opt-in, guarded, manual fallback). `[link: task backlog]`
- **Forward deps:** Tasks (obligation tasks), Notifications, Global Calendar (parked surface), Projects
  (legal-entity model), Purpose & Goals (long-run impact), Finance (money-touch data + multi-currency/FX).

## Open questions to resolve at its Phase-1 session
- Placement: own context vs. Finance sub-feature (leaning **own context**).
- Jurisdiction model shape: entity ↔ residency ↔ money-touch — how are "where money is/will/planned-to
  touch" represented as data?
- Rule-pack format + provenance + trust/versioning (public law, but *sourced from where*, and how verified?).
- Liability framing + disclaimers (not professional advice) as a first-class product constraint.
- How far the on-device planning/what-if engine goes before handing off.

## RESOLUTION (Phase-1, Victor, 2026-07-19)
- **FL1 Placement = FINANCE SUB-FEATURE** (Victor chose the tighter coupling over own-context). Documented at
  `docs/features/finance/fiscal-legal/` (5 aspect docs), cross-referenced from Finance. ⚠ Flagged tension:
  legal-entities/residency reach into Projects — so it's a Finance sub-context that *composes* Projects.
- **FL2 Scope = SITUATE / ORGANIZE / SURFACE-OBLIGATIONS / MODEL-IMPACT; filing HANDS OFF** (reframe confirmed).
  NOT TurboTax-for-the-world; never files, never a regulated service.
- **FL4 Liability = FIRST-CLASS CONSTRAINT.** Every advisement/what-if output labeled "informational, not
  professional/legal/tax advice"; AI outputs carry `source = ai` + disclaimer; **no auto-actions** on legal/tax
  matters — the user confirms everything.
- **Unblocked by the two standing ADRs (this session):** INFORM (rule-packs) = **ADR-014 public-reference layer**
  (bundled/bulk, provenance/signed, versioned); ADVISE (over private numbers) = **ADR-015** (on-device agentic
  ZK-safe · cloud = disclosed dent).
- **FL3 data-model shape (proposed — flag for review):** money-touch = a **jurisdiction link/tag on Finance
  entities** + `fiscal_residencies` (owner {user | legal_entity} ↔ jurisdiction ↔ type ↔ dates) + `legal_entities`
  (link to Projects). SITUATE = user's own `[E]` data (ZK-safe, local).
- **FL5 what-if extent (proposed — flag for review):** on-device engine models *informational* long-run impact
  over the user's own numbers + public rule-packs (ADR-015 on-device); **stops at modeling — filing hands off.**
