<!-- Contract — features/finance/fiscal-legal · /documentation Phase 2 · sources: intake/fiscal-legal.md RESOLUTION · ADR-014 · ADR-015 · Finance/Projects/Tasks/Notifications docs -->

# Contract — Fiscal & Legal ("Jurisdiction Compass")  (level: Finance sub-context)

> ⚠ The surface below is **INTENDED** (net-new; v2 has no fiscal/legal code). It is a **composer/deriver** — it reads
> money-touch from Finance, entities from Projects, law from ADR-014 rule-packs, and derives obligations through the
> owning modules' handlers; it re-implements nothing. Terminal states per capability are in `[[business-rules]]`.

## Exposed surface — `FiscalLegalService` (a Finance sub-service)
- **Situate** — `setResidency({owner, jurisdiction, type, dates})` · `linkMoneyTouch(financeEntity, jurisdiction)` ·
  `registerLegalEntity({project?, name, entity_type, jurisdiction})`. The user's own `[E]` data (ZK-safe). `[INTENT FL-4/8/9]`
- **Inform** — `rulePack(jurisdiction): RulePack` — reads the **ADR-014 public-reference layer** (bundled/bulk, local
  copy, signature+version verified); never a per-item leak. `[FACT: ADR-014 Layer-2]`
- **Derive obligations** — `deriveObligations(range): Obligation[]` — computes deadlines/filings/payments **on-device**
  from user data + rule-packs; on user-confirm, each becomes an obligation **Task** (Tasks handler, INT-2) + a
  **Notification** (ADR-013) + a **Calendar** entry. **No auto-action** — user confirms (FL-3). `[INTENT FL-6; FACT: INT-2]`
- **What-if / advise** — `model(scenario): Advisement` — runs via **ADR-015** (on-device agentic ZK-safe · cloud dent);
  returns an **informational** result carrying `source = ai` + the **"not professional advice"** disclaimer. `[FACT: ADR-015; RESOLUTION FL4]`
- **Hand-off filing** — `prepareFilingSummary(jurisdiction): Export` — produces the organized summary and **hands off**
  (export / professional link); **never files** (FL-2). `[INTENT FL-2]`

## What it consumes (documented integration points — no direct table access, constitution §6)
- **Finance** — money-touch (reads accounts/transactions/assets/income; adds a jurisdiction link, FL-9). `[FACT: finance structure-data]`
- **Projects** — the legal-entity model (a legal-entity is/links a Project, FL-8). `[INTENT: legal-entity composes Projects — forward-dep, not yet in Projects schema]`
- **ADR-014** — rule-packs (public-reference layer; provenance-signed). `[FACT: ADR-014]`
- **ADR-015** — advisement/what-if (two-mode AI; disclosed dent for cloud). `[FACT: ADR-015]`
- **Tasks** — obligation Tasks (via the Tasks handler, INT-2). `[FACT: Tasks INT-2]`
- **Notifications / Global Calendar** — obligation reminders (ADR-013) + dates. `[FACT: ADR-013; Calendar parked surface]`
- **Purpose & Goals** — long-run fiscal impact via ADR-011 contributions. `[FACT: ADR-011]`
- **Depended on by:** Purpose (reads impact) · Tasks/Notifications/Calendar (receive obligations). `[INTERP: leaf-ish deriver]`

## Contract error cases (typed)
- `RulePackUnverified` — signature/version check fails → not applied; derivation flagged, never computes on unverified law (FL-5).
- `InsufficientRuleData` — no rule-pack for a jurisdiction in a what-if → returns "insufficient", never fabricates (FL-5/FL-7).
- `AdviceIsInformational` — every advisement/what-if carries the **not-professional-advice** label + `source=ai`; a caller cannot strip it (FL-3/FL-13).
- `NoAutoAction` — a derived obligation/filing is **never** auto-applied; requires user confirmation (FL-3).
- `FilingHandsOff` — a filing request produces a summary + hand-off, never an actual filing (FL-2).
- `ModelUnavailable` — an ADR-015 AI failure is isolated; the local SITUATE/TRACK spine still works (FL-7/FL-12).

## Completion checklist
- [x] exposed surface + consumed · [x] typed errors · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] on each claim · [x] filing-hands-off + no-auto-action + disclaimer-baked-in + ADR-014/015 rails
