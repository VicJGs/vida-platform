<!-- Contract — features/finance/fiscal-legal · /documentation Phase 2 · sources: ADR-014 · ADR-015 · Finance/Projects/Tasks/Notifications docs -->

# Contract — Fiscal & Legal ("Jurisdiction Compass") (level: Finance sub-context)

> ⚠ The surface below is **INTENDED** (net-new; v2 has no fiscal/legal code). It is a **composer/deriver** — it reads
> money-touch from Finance, entities from Projects, law from ADR-014 rule-packs, and derives obligations through the
> owning modules' handlers; it re-implements nothing. Terminal states per capability are in `[[business-rules]]`.

## Exposed surface — `FiscalLegalService` (a Finance sub-service)

- **Situate** — `setResidency({owner, jurisdiction, type, dates})` · `linkMoneyTouch(financeEntity, jurisdiction)` ·
  `registerLegalEntity({project?, name, entity_type, jurisdiction})`. The user's own `[E]` data (ZK-safe). `[INTENT FL-4/8/9]`
- **Inform** — `rulePack(jurisdiction): RulePack` — reads the **ADR-014 `public-reference` layer** (X2), **device-mediated**
  (X1), fetched as the **whole set** (X3 — bundled/bulk, local copy, signature+version verified) under **`external_in_ok`**
  (X5); never a per-item leak. `[FACT: ADR-014 X1/X2/X3/X5 (Layer-2 = public-reference)]`
- **Derive obligations** — `deriveObligations(range): Obligation[]` — computes deadlines/filings/payments **on-device**
  from user data + rule-packs; on user-confirm, each becomes an obligation **Task** (Tasks handler, INT-2) + a
  **Notification** (ADR-013) + a **Calendar** entry. **No auto-action** — user confirms (FL-3). `[INTENT FL-6; FACT: INT-2]`
- **What-if / advise** — `model(scenario): Advisement` — the model call splits to **ADR-015** (X11) in the `on_device` /
  `cloud` modes (AI1, server-blind; `on_device` = ADR-015 §3.1's agentic _mode_, not an AI4 agent); a `cloud` run is a
  scope-minimized egress (AI3 — only the needed slice) under **`external_out_ok`** (X5) + the X4 gate. Returns an
  **informational** result carrying `source = ai` (AI6) + the **"not professional advice"** disclaimer. `[FACT: ADR-014 X4/X5/X11; ADR-015 AI1/AI3/AI6; RESOLUTION FL4]`
- **Hand-off filing** — `prepareFilingSummary(jurisdiction): Export` — produces the organized summary and **hands off**
  (export / professional link); **never files** (FL-2). `[INTENT FL-2]`

## What it consumes (documented integration points — no direct table access, constitution §6)

- **Finance** — money-touch (reads accounts/transactions/assets/income; adds a jurisdiction link, FL-9). `[FACT: finance structure-data]`
- **Projects** — the legal-entity model (a legal-entity is/links a Project, FL-8). `[INTENT: legal-entity composes Projects — forward-dep, not yet in Projects schema]`
- **ADR-014** — rule-packs (`public-reference` layer X2; provenance-signed X3) under `external_in_ok`/`external_out_ok` (X5). `[FACT: ADR-014 X2/X3/X5]`
- **ADR-015** — advisement/what-if (two-mode `on_device`/`cloud` AI, AI1; cloud = egress + scope-min, AI3); AI key custody
  lives in the AI layer's **`ai_connections`** (AI2 — `mode·provider·encrypted_key[L2/L3, mediator custody]`, key never in
  sandbox), which this sub-context **consumes**, does not own. `[FACT: ADR-015 AI1/AI2/AI3]`
- **Tasks** — obligation Tasks (via the Tasks handler, INT-2). `[FACT: Tasks INT-2]`
- **Notifications / Global Calendar** — obligation reminders (ADR-013) + dates. `[FACT: ADR-013; Calendar parked surface]`
- **Purpose & Goals** — long-run fiscal impact via ADR-011 contributions. `[FACT: ADR-011]`
- **Depended on by:** Purpose (reads impact) · Tasks/Notifications/Calendar (receive obligations). `[INTERP: leaf-ish deriver]`

## Contract error cases (typed)

- `RulePackUnverified` — the X3 signature/version check fails → not applied; derivation flagged, never computes on unverified law (FL-5).
- `ExternalGrantMissing` — a `cloud` what-if without `external_out_ok` (or a rule-pack fetch without `external_in_ok`) **fails closed** (X5); no egress, no fetch, no fabrication.
- `InsufficientRuleData` — no rule-pack for a jurisdiction in a what-if → returns "insufficient", never fabricates (FL-5/FL-7).
- `AdviceIsInformational` — every advisement/what-if carries the **not-professional-advice** label + `source=ai`; a caller cannot strip it (FL-3/FL-13).
- `NoAutoAction` — a derived obligation/filing is **never** auto-applied; requires user confirmation (FL-3).
- `FilingHandsOff` — a filing request produces a summary + hand-off, never an actual filing (FL-2).
- `ModelUnavailable` — an ADR-015 AI failure is isolated; the local SITUATE/TRACK spine still works (FL-7/FL-12).

## Completion checklist

- [x] exposed surface + consumed · [x] typed errors · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] on each claim · [x] filing-hands-off + no-auto-action + disclaimer-baked-in + ADR-014/015 rails
