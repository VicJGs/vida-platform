<!-- Identity — features/finance/fiscal-legal · /documentation Phase 2 · sources: ADR-014 · ADR-015 · Finance/Projects/Purpose docs · CLAUDE.md §9 -->

# Identity — Fiscal & Legal ("Jurisdiction Compass") (level: Finance sub-context — situate·organize·plan)

**What it is.** A **Finance sub-context** that helps a user **situate themselves and their projects/legal-entities across
jurisdictions**, **track the fiscal-legal obligations** that flow from where their money is (and will be, and is planned
to be), and **model the long-run impact** of those rules on their goals — **without ever filing anything**. It is the
OS's answer to one of the hardest walls for people who plan big: the economic-legal sphere is many-ruled, per-country,
constantly changing, and mostly invisible to the user until it bites. `[FACT: CLAUDE.md §9]`
`[INTENT: RESOLUTION FL1/FL2 — Victor]`

**Placement (Victor's call).** A **sub-feature of Finance**, not its own module (FL1) — it lives closest to money. It
**composes** Finance (money-touch data), **Projects** (legal-entities), **Purpose & Goals** (long-run impact), and
**Tasks/Notifications/Calendar** (obligations). ⚠ It reaches into Projects for legal-entities, so it is a Finance
sub-context with cross-module dependencies. `[INTENT: RESOLUTION FL1 — Victor chose Finance sub-feature]`

**Four capabilities, split by risk (the buildable shape).** `[INTENT: RESOLUTION]`

- **SITUATE** (ZK-safe spine) — model where the user + each legal-entity is fiscally-legally **resident**, and where money
  **touches** (personal + per-entity). The user's own `[E]` structured data, computed locally.
- **INFORM** (guarded, public) — a per-jurisdiction **rule knowledge base** (brackets · entity types · filing deadlines ·
  obligations). **Public law, not private data** → rides the **ADR-014 `public-reference` layer** (X2), **device-mediated**
  (X1 — fetched/parsed on-device, never via a server proxy), fetched as the **whole set** (X3 — bundled/bulk, queried from a
  local copy, provenance-signed + versioned), gated by the ADR-010 grant **`external_in_ok`** (X5). `[FACT: ADR-014 X1/X2/X3/X5 (Layer-2 = public-reference)]`
- **TRACK OBLIGATIONS** (ZK-safe) — **derive** deadlines/filings/payments from the user's data + rule-packs → obligation
  **Tasks + Notifications + Calendar**. Computed on-device.
- **ADVISE / WHAT-IF** (guarded, opt-in) — model long-run impact ("incorporate here vs. there; if money flows this way,
  what I'll owe / when") over the user's numbers + rule-packs → the model call **splits to ADR-015** (X11 — ADR-014 moves
  the data, ADR-015 governs the model; §4 names "Fiscal advisement" verbatim), offered in the two **`on_device`** /
  **`cloud`** execution modes (AI1 — server-blind; "on-device **agentic**" here is ADR-015 §3.1's _mode_ label, **not** a
  tool-wielding agent — the what-if mutates nothing). A **`cloud`** run is a scope-minimized egress (AI3 + X4 + `external_out_ok`,
  X5). **Informational only** — no auto-action. `[FACT: ADR-014 X4/X5/X11; ADR-015 AI1/AI3]`

**What it is NOT.** `[INTENT; FACT: intake reframe; ADRs]`

- **Not a tax-filing engine — filing HANDS OFF.** Vida situates, organizes, surfaces obligations, and models impact; the
  **filing itself hands to a professional or a 3rd-party engine.** Not "TurboTax-for-the-world" — that's a regulated
  service, per-jurisdiction filing engines, and real legal liability (a company, not a feature). `[INTENT: RESOLUTION FL2]`
- **Not professional advice.** Every advisement/what-if output is **informational, not professional/legal/tax advice** —
  a **first-class constraint** (FL4): AI outputs carry `source = ai` + the disclaimer, and there are **no auto-actions**
  on legal/tax matters (the user confirms everything). `[INTENT: RESOLUTION FL4]`
- **Not a new privacy model.** SITUATE/TRACK/what-if are the user's own data computed **locally** (ZK-safe); rule-packs
  are **public** (ADR-014 `public-reference`, X2); AI is **ADR-015**. The guarded paths gate on the existing ADR-010 grants
  **`external_in_ok`** / **`external_out_ok`** (X5, no new grant table) — it invents no new integration or ZK mechanism.
  `[FACT: EX-1; ADR-014 X2/X5; ADR-015]`
- **Not a Finance rewrite.** It **reads** money-touch from existing Finance entities and **tags** them with jurisdiction;
  it does not restructure accounts/transactions. `[INTENT: RESOLUTION FL3]`
- **Not required.** Opt-in; Finance and the rest of the OS work fully without it. `[FACT: EX-1]`

## Completion checklist

- [x] "what it is" + capabilities + "what it is NOT" filled · [x] each claim [FACT/INTENT/INTERP] · [x] no `{{…}}` · [x] placement + scope-reframe + liability-first-class + ADR-014/015 wiring stated
