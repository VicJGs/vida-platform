# DB-4 · Domain Group #9 — Finance (+ Fiscal & Legal) · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #9 of 22 · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `020_finance` (v20) · **Schema file:** `schema/finance.ts` · **Branch:** `db-4-per-domain-schema`
**Reruns:** finance ✅IMPLEMENTED (2026-07-24) · fiscal-legal ✅IMPLEMENTED (2026-07-25) — the ADR-realignment is DONE; DDL is this build's job.

> The largest DB-4 group so far — **9 tables** (6 finance core + 3 fiscal-legal), plus a `jurisdiction_code` link
> on the 5 finance entities and the `category_bidx` blind-index column. Every shape is doc-determined; **zero
> build-decisions**, consistent with groups #1–#8.

## §0. Source model

Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/finance/{identity,business-rules,structure-data,contract,conventions}.md` + `finance/fiscal-legal/{…}.md`
(both reruns implemented) · `ADR-002 §5.8` (exact core DDL) + `§5.20` L3814/3828 (owed-ledger) · `finance.ts` (7 live enums)
· `database-layer/current-*.md` (the no-FK convention + prior-group precedent).

## §1. Identity — what this unit is

The Finance private financial command center — the **6 owned entity tables** (`accounts`, `transactions`, `assets`,
`liabilities`, `investments`, `income_streams`) authored fresh in the hand-written ADR-016 model (they lived in the
pre-rebuild monolith; absent from the new `schema/`) — plus the **Fiscal & Legal** Finance sub-context (net-new:
`fiscal_residencies`, `legal_entities`, `fiscal_obligations`) and the money-touch `jurisdiction_code` link on the
5 finance entities.

### Scope boundary — doc-DECIDED (the settled-intent / undecided-architecture split)

The `⚠ INTENDED` set splits cleanly by flag-type. **Settled-intent build-phase flags → author now**
([[build-phase-flags-mean-resolve-now-not-defer]]); **undecided-architecture flags ("candidate ADR", "needs design
pass") → out** (a real open decision, not a schema I can invent).

**AUTHOR (settled → build-phase):**

- `accounts.opening_balance` (FN-3 ledger-derived balance) — settled at intake G4.
- `transactions.category_bidx TEXT` + `idx_transactions_category_bidx` (F7/D7) — the P-side blind-index **column+index**;
  the keyed-BLAKE2b derivation is service-layer (deferred). §5.20 L3814 marks the column build-phase.
- G9 restored: `liabilities.{payment_frequency, next_payment_date, interest_type, payoff_date}` · `income_streams.next_payment_date`.
- `jurisdiction_code?` link on `accounts`/`transactions`/`assets`/`income_streams`/`investments` (FL-9).
- Fiscal-legal 3 tables (§5.20 L3828, all shapes fixed in `fiscal-legal/structure-data.md`).

**OUT (owned elsewhere / undecided / no-table):**

- `store`/`rules` — **DB-3-authored** (`009_economy_store_rules`, `schema/foundation/economy.ts`); `dream_id`/`purpose_id`
  overlay cols already present. Not re-authored.
- `import_staging` + `connection_config` — gated on the **undecided** "external financial data under ZK" candidate ADR
  (the aggregator plaintext dent is a live open decision, C4/G2/FN-9). Open-architecture boundary, not a time-defer.
- `ai_connections`/`ai_conversations`, saved what-if scenario — ADR-015 (undecided AI layer). Rule-packs = ADR-014
  `public-reference` (not a table).
- Budgeting tables · `liability_payments` ledger · multi-currency FX store — explicitly "needs design pass" (FN-13, G8/G12).
- `measurement_kind`/`binding_mode` — **NOT on any finance table** (rerun C6: Finance is a _feeder_ to Purpose targets,
  not a pursuable; §5.20 L3816 "Finance measurables" is Purpose-side). The module doc puts no M\* on finance
  ([[module-doc-is-db4-roster-not-adr-broad-list]]).
- `move_money` effect — a handler, not a table (FN-16). **Commitments** — a derived management LAYER, no table (FN-14).
- Inline `transactions.tags` — **RETIRED** → shared `entity_tags` (FN-10, SP1); Finance registers `entity_type='transaction'`
  (+ the other 4 note-targets). No `tags` column authored.

### Boundary — what this unit is NOT (doc-cited)

NOT the ingestion pipeline/service · NOT the derived-aggregate engine (net-worth/balance derive at read; FN-3/FN-6/FN-7)
· NOT the `move_money`/effect-handler wiring · NOT the AI/rule-pack layer · NOT budgeting/commitments/liability-payment
internals · NOT the DB-11 `@vida/types` interface reconcile.

## §2. Business Rules (inherited invariants the intake honors)

- **FN-1 [E] set** (ZK-1): monetary values + identifying text encrypted; `*_type` enums, `currency`, `*_date`, flags,
  `color`/`icon` are plaintext. (M1.0 = empty `[E]` set, pass-through — BR-DB6-3; `[E]` marked via `@encrypted` JSDoc.)
- **FN-2** money = INTEGER cents; rates = basis points (INTEGER); `quantity` = REAL.
- **FN-11 referential integrity** — the _semantics_ (account delete cascades transactions; `transfer_to_account_id`/
  `investments.account_id` SET NULL) are **app/sync-layer** under the no-FK convention (the DDL carries plain-TEXT refs
  - indexes, no `REFERENCES`). Soft delete via `deleted_at`.
- **FN-3** `opening_balance` authored; balance derives at read (no stored counter).
- **FN-15/FN-16** `store`/`move_money` are cited, DB-3/handler-owned — not (re)authored here.
- **FL-14 [E]** — fiscal free-text encrypted (residency notes, entity name/registration_ref); jurisdiction codes,
  obligation types/dates, FKs, owner refs are structural (P); rule-packs are public (no table).
- **FL-9** money-touch = a `jurisdiction_code` link on Finance entities (Finance structure untouched, cols additive).

### Enum CHECK sets (FIXED → SQL CHECK, tuple-sourced) + OPEN-vocab (no CHECK)

**FIXED (parity rows):**
| Table.column | Tuple (`@vida/types`) | Note |
|---|---|---|
| `accounts.account_type` | `ACCOUNT_TYPE` (7) | live |
| `transactions.transaction_type` | `TRANSACTION_TYPE` (3) | live |
| `transactions.recurring_frequency` | `FREQUENCY` (6) | reuse — no `RECURRING_FREQUENCY` (purposes precedent) |
| `assets.asset_type` | `ASSET_TYPE` (6) | live |
| `liabilities.liability_type` | `LIABILITY_TYPE` (7) | live |
| `liabilities.interest_type` | `INTEREST_TYPE` (2) | **NET-NEW** `{fixed,variable}` (G9) |
| `investments.investment_type` | `INVESTMENT_TYPE` (8) | live |
| `income_streams.income_type` | `INCOME_TYPE` (8) | live |
| `income_streams.work_type` | `WORK_TYPE` (5) | live |
| `income_streams.frequency` | `FREQUENCY` (6) | reuse |
| `fiscal_residencies.owner_type` | `FISCAL_OWNER_TYPE` (2) | **NET-NEW** `{user,legal_entity}` |
| `fiscal_obligations.owner_type` | `FISCAL_OWNER_TYPE` (2) | reuse the net-new |

**OPEN-vocab (plain TEXT, NO CHECK, NO tuple — [[open-vocab-columns-take-no-sql-check]]):**
`currency` (ISO, DEFAULT 'USD') · `category_bidx` (blind index) · all `jurisdiction_code` · `residency_type` ·
`legal_entities.entity_type` · `obligation_type` · `fiscal_obligations.status` — the fiscal four are "per-jurisdiction
enums (from rule-packs)" (`fiscal-legal/conventions.md:32`) → genuinely rule-pack-defined, not a platform tuple.

## §3. Intended shape — 9 tables (floor + settled amendments, cited)

All 9: `...baseColumns` (id · created*at · updated_at · 6 `\_sync*_`) + explicit `deleted_at`. No cross-table FK
(all `_\_id`plain TEXT + index; cascade/orphan app-layer — locked convention`current-spec.md:176-177`, superseding
ADR-002 §5.8's stale `REFERENCES`). FIXED enums → SQL CHECK from the tuple.

### §3a. `accounts` `[FACT: §5.8 L2026-2053; AMEND FN-3 opening_balance, FL-9]`

`name[E]` · `account_type`(CHECK 7) · `institution[E]` · `currency`(DEFAULT 'USD', no CHECK) · `current_balance[E]`(cents,
DEFAULT 0) · `opening_balance[E]`(**NEW**, nullable, cents) · `credit_limit[E]` · `interest_rate[E]`(bp) · `is_active`(DEFAULT 1)
· `color` · `icon` · `jurisdiction_code`(**NEW**, nullable, no CHECK) · `deleted_at`.

### §3b. `transactions` `[FACT: §5.8 L2059-2096; AMEND category_bidx F7, FL-9, tags RETIRED]`

`account_id`(plain TEXT, no-FK) · `transfer_to_account_id`(plain TEXT, no-FK) · `transaction_type`(CHECK 3) · `amount[E]`(cents)
· `currency`(DEFAULT 'USD') · `category[E]` · `category_bidx`(**NEW**, P, nullable) · `subcategory[E]` · `description[E]` ·
`date`(YYYY-MM-DD, NOT NULL) · `is_recurring`(DEFAULT 0) · `recurring_frequency`(CHECK `FREQUENCY`, nullable) ·
`jurisdiction_code`(**NEW**, nullable) · `deleted_at`. **No `tags` column** (retired → entity_tags).
Indexes: `idx_transactions_account`(account_id) · `idx_transactions_date`(date) · `idx_transactions_category_bidx`(category_bidx).

### §3c. `assets` `[FACT: §5.8 L2102-2125; AMEND FL-9]`

`name[E]` · `asset_type`(CHECK 6) · `purchase_date` · `purchase_price[E]` · `current_value[E]` · `depreciation_rate[E]`(bp/yr)
· `location[E]` · `jurisdiction_code`(**NEW**, nullable) · `deleted_at`.

### §3d. `liabilities` `[FACT: §5.8 L2131-2156; AMEND G9 ×4]`

`name[E]` · `liability_type`(CHECK 7) · `original_amount[E]` · `current_balance[E]` · `interest_rate[E]`(bp) ·
`monthly_payment[E]` · `due_date` · `lender[E]` · **G9:** `payment_frequency`(CHECK `FREQUENCY`, nullable) ·
`next_payment_date`(YYYY-MM-DD) · `interest_type`(CHECK `INTEREST_TYPE`, nullable) · `payoff_date`(YYYY-MM-DD) · `deleted_at`.

### §3e. `investments` `[FACT: §5.8 L2162-2186]`

`account_id`(plain TEXT, no-FK) · `name[E]` · `investment_type`(CHECK 8) · `ticker_symbol[E]` · `quantity[E]`(REAL) ·
`purchase_price[E]`(cents/unit) · `current_price[E]`(cents/unit) · `jurisdiction_code`(**NEW**, nullable) · `deleted_at`.
Index: `idx_investments_account`(account_id).

### §3f. `income_streams` `[FACT: §5.8 L2192-2219; AMEND G9 next_payment_date, FL-9]`

`name[E]` · `income_type`(CHECK 8) · `work_type`(CHECK 5, nullable) · `amount[E]`(cents) · `frequency`(CHECK `FREQUENCY`,
DEFAULT 'monthly') · `is_active`(DEFAULT 1) · `employer[E]` · `start_date` · `end_date` · `next_payment_date`(**NEW G9**) ·
`jurisdiction_code`(**NEW**, nullable) · `deleted_at`.

### §3g. `fiscal_residencies` (NET-NEW) `[FACT: §5.20 L3828; fiscal-legal/structure-data.md:12-13]`

`owner_type`(CHECK `FISCAL_OWNER_TYPE`) · `owner_id`(plain TEXT, no-FK) · `jurisdiction_code`(no CHECK) ·
`residency_type`(OPEN, no CHECK) · `start_date`(YYYY-MM-DD) · `end_date`(nullable) · `notes[E]` · `deleted_at`.

### §3h. `legal_entities` (NET-NEW — composes Projects) `[FACT: §5.20 L3828; structure-data.md:14-16]`

`project_id`(plain TEXT, no-FK — cross-domain, Projects) · `name[E]` · `entity_type`(OPEN, no CHECK — per jurisdiction) ·
`jurisdiction_code`(no CHECK) · `registration_ref[E]` · `deleted_at`.

### §3i. `fiscal_obligations` (NET-NEW — derived, user-confirmable) `[FACT: §5.20 L3828; structure-data.md:20-22]`

`jurisdiction_code`(no CHECK) · `owner_type`(CHECK `FISCAL_OWNER_TYPE`) · `owner_id`(plain TEXT) · `obligation_type`(OPEN, no CHECK)
· `due_date`(YYYY-MM-DD) · `status`(OPEN, no CHECK) · `source_rulepack_version`(P) · `linked_task_id`(plain TEXT, no-FK, nullable)
· `deleted_at`. All-plaintext (structural).

### §3j. `ENTITY_TYPES` registry — append

`+= 'account', 'transaction', 'asset', 'investment', 'liability'` (the 5 finance note-targets, G12/conventions.md:26).
`income_stream` NOT registered (G12 lists 5, excludes it). Fiscal entities NOT registered (legal_entity composes Projects;
obligation → Tasks; neither is a pages/entity_links/entity_tags target per the docs).

### §3k. `@vida/types` — net-new enums now; interfaces → DB-11

NET-NEW tuples + Zod validators: **`INTEREST_TYPE`** = `['fixed','variable']` · **`FISCAL_OWNER_TYPE`** = `['user','legal_entity']`.
Reuse `FREQUENCY` (recurring_frequency + income.frequency). The 7 finance interfaces + fiscal interface reconcile in
`@vida/types` (Finance +opening_balance/category_bidx/jurisdiction_code/G9; new Fiscal\* interfaces) → **DB-11** (interface
reconcile is deferred every group; cited, not done here).

## §4. Physical home & authoring model

- `packages/core/src/db/schema/finance.ts` — the 9 Drizzle mirrors (query-type only; a `// --- Fiscal & Legal sub-context ---`
  divider; fiscal is a _sub-context of Finance_, so one file per the one-file-per-group precedent).
- `packages/core/src/db/migrations/020_finance.ts` — hand-written SQL DDL (all 9 CREATE TABLE + indexes), `up()` only,
  no self-transaction. Registered in `migrations/runner.ts` `ALL_MIGRATIONS`.
- `schema/index.ts` barrel += `export * from './finance'`.
- `schema/_registry.ts` `ENTITY_TYPES` += the 5 finance types.
- `@vida/types` finance module += `INTEREST_TYPE`, `FISCAL_OWNER_TYPE` (+ Zod in `@vida/core` validators).
- `validators/enum-parity.test.ts` += migration-020 import (both lists) + the 13 FIXED parity rows.
- `db/tests/finance-introspection.test.ts` (NEW) — mirror #8; PRAGMA vs the 9 Drizzle mirrors (col-set/nullability/pk/defaults).

## §5. Phase-1 completion checklist

- [x] intake §E + both reruns read (implemented); roster = `structure-data.md` (both) authoritative
- [x] on-disk verified (6 finance ABSENT; store/rules DB-3; fiscal net-new)
- [x] §5.8 exact DDL + §5.20 owed rows read; [E] set (FN-1/FL-14) + enum vocabs (finance + fiscal) grounded
- [x] scope boundary doc-decided (settled-intent authored / undecided-architecture out); zero build-decisions
- [x] no-FK convention cited (supersedes §5.8 REFERENCES); no M\* (C6); tags retired; registry append set

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)

1. Within+cross-domain FK → plain TEXT no-FK + index (`current-spec.md:176-177` + 8 prior groups). §5.8 REFERENCES = stale.
2. `category_bidx` = P-side column + index now; PRF derivation service-deferred (§5.20 L3814; ADR-002 §5.8 comment).
3. `opening_balance` [E] nullable (FN-3 settled). G9 fields all P (enums/dates).
4. Fiscal `residency_type`/`entity_type`/`obligation_type`/`status`/`jurisdiction_code` = OPEN no-CHECK (rule-pack-defined,
   conventions.md:32). `owner_type` = FIXED CHECK.
5. `tags` retired → entity_tags (register `transaction` + 4). No M\* on any finance table (feeder, C6).
6. All 9 = baseColumns + deleted_at. `currency` no CHECK (ISO). FREQUENCY reused ×3.

## Phase 2 — Current-state read (reconcile-and-extend baseline)

### Already authored — DO NOT re-create

`store`/`rules` (`009_economy_store_rules`, `foundation/economy.ts`) with the full E6 shape incl. `dream_id`/`purpose_id`.
`entity_tags` (AR-6). `FREQUENCY` + the 7 finance enums (`finance.ts`, DB-9).

### To author — 9 confirmed ABSENT

6 finance (absent from new `schema/`; existed in the pre-ADR-016 monolith) + 3 fiscal (net-new, grep-clean).

### `ENTITY_TYPES` diff · Migration slot · `@vida/types`

Append 5 finance types · migration `020_finance` (v20; next after 019) · net-new `INTEREST_TYPE`+`FISCAL_OWNER_TYPE`.

### Baseline verdict

Reconcile-and-extend: append-only (no prior-group edits). Pattern = `purposes.ts`/`019_purposes.ts`/`purposes-introspection.test.ts`.

## Phase 3 — Implementation Plan (gate-1 draft)

### §P3.1 — Exact DDL intent

The 9 CREATE TABLEs per §3a-§3i (baseColumns + deleted_at; FIXED→CHECK; OPEN→plain TEXT; no REFERENCES); indexes
`idx_transactions_account`/`_date`/`_category_bidx`, `idx_investments_account`. Drizzle mirrors match 1:1.

**Nullability — read from the source, no-FK strips only `REFERENCES` not `NOT NULL`; the Drizzle mirror carries `.notNull()`
where the source has it.**

- **Finance (6) `[FACT: ADR-002 §5.8]`** — NOT NULL exactly as §5.8 declares it: `accounts.{name, account_type,
current_balance DEFAULT 0, is_active DEFAULT 1}` · `transactions.{account_id, transaction_type, amount, date, is_recurring
DEFAULT 0}` · `assets.{name, asset_type}` · `liabilities.{name, liability_type}` · `investments.{name, investment_type}` ·
  `income_streams.{name, income_type, amount, is_active DEFAULT 1}` + `created_at`/`updated_at`/`_sync_*` (baseColumns);
  `currency`(accounts+transactions) NOT NULL DEFAULT 'USD'; `income_streams.frequency` NOT NULL DEFAULT 'monthly'. All other
  §5.8 columns nullable.
- **Finance additive columns — nullable `[FACT: additive to existing rows, no DEFAULT]`:** `opening_balance`, `category_bidx`,
  every `jurisdiction_code`, `liabilities.{payment_frequency, next_payment_date, interest_type, payoff_date}`,
  `income_streams.next_payment_date`.
- **Fiscal (3) — the roster `?`-notation IS the nullability source (no ADR-002 SQL exists for net-new tables)**
  `[FACT: fiscal-legal/structure-data.md:12-22]`: nullable = the three `?`-marked columns `fiscal_residencies.end_date`,
  `legal_entities.project_id`, `fiscal_obligations.linked_task_id`; every other column is NOT NULL as the roster lists it.

### §P3.2 — Registry & validators

`ENTITY_TYPES += 5`. `@vida/types`: `INTEREST_TYPE`, `FISCAL_OWNER_TYPE` tuples + `z.enum` validators; 13 parity rows.

### §P3.3 — Files, migration, tests

`schema/finance.ts` · `migrations/020_finance.ts` (+runner `ALL_MIGRATIONS`) · `index.ts` barrel ·
`enum-parity.test.ts` (`migration020Finance` added to both the import list and the `ddlFor` apply-chain + 13 rows) ·
`finance-introspection.test.ts` (new; applies `migration020Finance.up`, self-contained no-FK; 9 tables ×4 assertions).
`boolInt` mirror defaults as `true`/`false` literals (`purposes.ts:68`).

### §P3.4 — DB-11 deferrals (cited, not fixed here)

Finance `@vida/types` interfaces +opening_balance/category_bidx/jurisdiction_code/G9; new `FiscalResidency`/`LegalEntity`/
`FiscalObligation` interfaces. Interface reconcile = DB-11 (every group defers it).

### §P3.5 — Plan checklist (pre-critique)

- [ ] 9 tables authored SQL + Drizzle mirror parity · [ ] 13 CHECK↔tuple parity rows green · [ ] introspection 9×4 green
- [ ] 2 net-new enums + Zod green · [ ] ENTITY_TYPES +5 · [ ] runner registers 020 · [ ] typecheck/lint 0 · [ ] §XXIX currency
