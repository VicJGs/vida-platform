<!-- Identity — features/finance/fiscal-legal · /documentation Phase 2 · sources: docs/intake/fiscal-legal.md RESOLUTION · ADR-014 · ADR-015 · Finance/Projects/Purpose docs · CLAUDE.md §9 -->

# Identity — Fiscal & Legal ("Jurisdiction Compass")  (level: Finance sub-context — situate·organize·plan)

**What it is.** A **Finance sub-context** that helps a user **situate themselves and their projects/legal-entities across
jurisdictions**, **track the fiscal-legal obligations** that flow from where their money is (and will be, and is planned
to be), and **model the long-run impact** of those rules on their goals — **without ever filing anything**. It is the
OS's answer to one of the hardest walls for people who plan big: the economic-legal sphere is many-ruled, per-country,
constantly changing, and mostly invisible to the user until it bites. `[FACT: CLAUDE.md §9; intake/fiscal-legal.md intent]`
`[INTENT: RESOLUTION FL1/FL2 — Victor]`

**Placement (Victor's call).** A **sub-feature of Finance**, not its own module (FL1) — it lives closest to money. It
**composes** Finance (money-touch data), **Projects** (legal-entities), **Purpose & Goals** (long-run impact), and
**Tasks/Notifications/Calendar** (obligations). ⚠ It reaches into Projects for legal-entities, so it is a Finance
sub-context with cross-module dependencies. `[INTENT: RESOLUTION FL1 — Victor chose Finance sub-feature]`

**Four capabilities, split by risk (the buildable shape).** `[INTENT: RESOLUTION]`
- **SITUATE** (ZK-safe spine) — model where the user + each legal-entity is fiscally-legally **resident**, and where money
  **touches** (personal + per-entity). The user's own `[E]` structured data, computed locally.
- **INFORM** (guarded, public) — a per-jurisdiction **rule knowledge base** (brackets · entity types · filing deadlines ·
  obligations). **Public law, not private data** → rides the **ADR-014 public-reference layer** (bundled/bulk, versioned,
  signed). `[FACT: ADR-014 Layer-2]`
- **TRACK OBLIGATIONS** (ZK-safe) — **derive** deadlines/filings/payments from the user's data + rule-packs → obligation
  **Tasks + Notifications + Calendar**. Computed on-device.
- **ADVISE / WHAT-IF** (guarded, opt-in) — model long-run impact ("incorporate here vs. there; if money flows this way,
  what I'll owe / when") over the user's numbers + rule-packs → rides **ADR-015** (on-device agentic = ZK-safe · cloud =
  disclosed dent). **Informational only.** `[FACT: ADR-015]`

**What it is NOT.** `[INTENT; FACT: intake reframe; ADRs]`
- **Not a tax-filing engine — filing HANDS OFF.** Vida situates, organizes, surfaces obligations, and models impact; the
  **filing itself hands to a professional or a 3rd-party engine.** Not "TurboTax-for-the-world" — that's a regulated
  service, per-jurisdiction filing engines, and real legal liability (a company, not a feature). `[INTENT: RESOLUTION FL2]`
- **Not professional advice.** Every advisement/what-if output is **informational, not professional/legal/tax advice** —
  a **first-class constraint** (FL4): AI outputs carry `source = ai` + the disclaimer, and there are **no auto-actions**
  on legal/tax matters (the user confirms everything). `[INTENT: RESOLUTION FL4]`
- **Not a new privacy model.** SITUATE/TRACK/what-if are the user's own data computed **locally** (ZK-safe); rule-packs
  are **public** (ADR-014); AI is **ADR-015**. It invents no new integration or ZK mechanism. `[FACT: EX-1; ADR-014/015]`
- **Not a Finance rewrite.** It **reads** money-touch from existing Finance entities and **tags** them with jurisdiction;
  it does not restructure accounts/transactions. `[INTENT: RESOLUTION FL3]`
- **Not required.** Opt-in; Finance and the rest of the OS work fully without it. `[FACT: EX-1]`

## Completion checklist
- [x] "what it is" + capabilities + "what it is NOT" filled · [x] each claim [FACT/INTENT/INTERP] · [x] no `{{…}}` · [x] placement + scope-reframe + liability-first-class + ADR-014/015 wiring stated
