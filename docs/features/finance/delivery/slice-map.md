<!-- Slice Map — features/finance · Entity Delivery Flow v1 Step 2 (Decomposition Gate) · mod-finance #47 / LIF-122 -->
<!-- Mode: RATIFY + detail (§8) — the 48-leg split is doc-fixed by decomposition.md:58 + traceability.md:130-215 + parts/finance.md. This records + validates it, adds the per-slice Verification-Gate ledger + the deferred-seam decisions. Operations spec = parts/finance.md (every signature/typed-error/source already there); NOT duplicated here (ratify, no doc sprawl). -->

# Slice Map — Finance ①  (backend service tier)

**Mode:** Ratify + detail. **Track:** all slices `backend`. **Operations authority:** `docs/specs/foundation/backend-intent/parts/finance.md` (per-leg signatures, sources, typed errors). **Invariants authority:** `docs/features/finance/business-rules.md` (FN-1…16) + `fiscal-legal/business-rules.md` (FL-1…15). This map adds the slice grouping, the seam wiring, and the gate ledger only.

**Two services, one module:** `createFinanceService` (S1–S6) + `createFiscalLegalService` (S7–S8, a Finance sub-service). Both `@vida/core`, factory-object shape, no `this.` for intra-calls `[[factory-service-no-this-for-intra-calls]]`, `encryptedFields: []` M1.0, `softDelete: true` on all 9 tables.

## Slices (ordered; each iterates scenario Steps 3→9, its gate PASSes before the next)

| S | Name | Legs (parts/finance.md) | Track | What it builds |
|---|------|-------------------------|-------|----------------|
| **S1** | Service scaffold + entity CRUD | FIN-01,02,03,04,13,14,15,16,27,41,42,45,46 | backend | `createFinanceService` skeleton (`types.ts` deps/errors, barrel, index registration); CRUD + `listAccounts` + soft-delete for accounts/assets/liabilities/investments/income_streams; Zod validate (enums, money=cents, rates=bp); G9 fields exposed; app-layer referential-integrity contract (FN-11); DB-11 reconcile note: `@vida/types` has no fiscal-legal interface (→ Row types) **and** `Transaction.tags: string[]` (finance.ts:125) is stale vs the retired inline column (FIN-35 consumer must not trust it). |
| **S2** | Transaction ledger + derived balance + transfers | FIN-05,06,07,08,09,10,11,12 | backend | transaction CRUD (each re-derives balance); `getBalance` DERIVATION (FN-3, opening+Σledger); `createTransfer` (FN-4 one row, both balances, source≠dest); `listTransactions(filter)` + `getTransactionsInRange` (default month); transfer-exclusion aggregate invariant. |
| **S3** | Derived analytics | FIN-17,19,22 | backend | `getOverview` → `{totalBalance,totalAssets,totalLiabilities,netWorth,monthlyIncome,monthlyExpenses}` (**net worth = FN-7 simple sum, NOT the store tree**); `getInvestmentValue` (qty×price + gain/loss); chart-dataset derivations; per-derivation partial-flag on compute error. |
| **S4** | `move_money` effect handler | FIN-26 | backend | register `move_money` on the `EffectRegistry` (mirrors `registerEconomyEffects`); execute the ledger movement via `createInTx` co-write, idempotent via `deriveEffectEventId`/`applied_effects` (R1/R2, Additive); **penalty→lock-box branch = deny-safe deferred `store` port** (FIN-24 deferred). Never collapse into `grant_currency` (C2). |
| **S5** | External / ingestion / config seams | FIN-20,21,25,28,29,30,40 | backend | recurring forecast (Preferences recurring-mode seam); FX convert + `FxRateMissingError` (base-currency/FX = deferred Preferences port, no silent 1:1); persisted-aggregates opt-in seam; `importStatement`→ingestion #44 deny-safe port (`import_staging` deferred); external grant-gate → enforcer #31/egress #43 (fail-closed, `ZeroKnowledgeViolationError`); managed-category resolve (deferred-store port; free-[E]-text + `category_bidx` today); fail-loud typed-error contract. |
| **S6** | Cross-module providers + delegates | FIN-31,32,33,34,35,37 | backend | Gamification achievement emit (event producer); Journal `/summary` contribution provider (Journals registry); Purpose net-worth/balance read seam; notes→`pages` delegate; tags→`entity_tags` consume (`entity_type='transaction'`); `dueIn` provider over the built G9 schedules (**not the deferred Commitments derive, FIN-36**). |
| **S7** | Fiscal-legal SITUATE (local ZK spine) | FL-01,02,03,09,10 | backend | `createFiscalLegalService`; `setResidency`/`linkMoneyTouch`/`registerLegalEntity` CRUD (residencies/legal_entities + jurisdiction link — Finance entities untouched); grant-gate (X5/X9 fail-closed); typed errors (`RulePackUnverified`,`ExternalGrantMissing`,`InsufficientRuleData`,`AdviceIsInformational`,`NoAutoAction`,`FilingHandsOff`,`ModelUnavailable`); encrypt-seam. **Always-available, no external dep.** |
| **S8** | Fiscal-legal INFORM / DERIVE / ADVISE (guarded) | FL-04,05,06,07,08 | backend | `rulePack`→ADR-014 public-reference deny-safe port (#44); `deriveObligations`→fiscal_obligations + Tasks/Notifications/Calendar fan-out on user-confirm (never on unverified law, no auto-action); `model`(what-if)→ADR-015 AI deny-safe port (#45, `source=ai` + disclaimer baked, uncstrippable); `prepareFilingSummary`→export (hands off, never files); long-run impact→Purpose `contributions`. |

## Deferred / OUT of ① (recorded, homed, not built here)
| Leg | What | Home | Why |
|-----|------|------|-----|
| FIN-18 | net-worth **over the store tree** (FN-15) | DEFERRED → DB-3 `foundation/economy.ts` store layer | store tree unbuilt; ① uses FN-7 simple sum (S3) `[FACT: traceability.md:157]` |
| FIN-23 | `store` CRUD | DEFERRED → economy store layer | `[FACT: traceability.md:167]` |
| FIN-24 | `lockBox`/`unlockBox` | DEFERRED → economy `store.is_locked` | S4 penalty branch calls a deny-safe port to it `[FACT: traceability.md:169]` |
| FIN-36 | Commitments derive (`listCommitments`) | DEFERRED → design-pass Part D | no `commitments` table; needs design-pass `[FACT: traceability.md:184]` |
| FIN-38 | Budgeting | DEFERRED → Budgeting design-pass (mini-intake + ADR) | UNKNOWN/undesigned `[FACT: traceability.md:187]` |
| FIN-39 | Liability-payment tracking | DEFERRED → design-pass Part D | txn-link vs `liability_payments` ledger undecided `[FACT: traceability.md:188]` |
| FIN-43, FIN-44, FL-11 | `[E]` field encryption · local-first/LWW | RIDE:substrate | inherited from foundation; M1.0 pass-through, wiring → M3/DB-5 `[FACT: traceability.md:194-195,215]` |
| all `ui` legs | every view surface (9 pages, forms, import wizard) | ② `fe-finance` (P6) | `[FACT: traceability.md ui-rows → P6:P6]` |

## Deferred-seam decisions (the OPEN items this gate resolves — Approval 1 targets)
1. **FIN-26 penalty→lock-box** — build the `move_money` ledger-movement core now; the E5 penalty-lock calls a **`StoreLockPort`** that in M1.0 is a deny-safe no-op returning "store layer not active" (fail-loud, never fabricates a lock). Zero-signature-change swap when FIN-24 lands. `[[xs-security-services-deny-safe-port-build-shape]]`
2. **FIN-28 import / FIN-29 grant-gate** — `importStatement`/external access are thin adapters over the built ingestion #44 + enforcer #31/egress #43 ports; `import_staging` durable table = M2. Deny-safe/fail-closed default.
3. **FIN-21 FX store / FIN-30 managed-category / FIN-25 persisted-aggregates** — the *derivations* build now; the *stores* are deferred (Preferences/managed-category = build-phase). Each surfaces a typed "not-configured" state (`FxRateMissingError`, free-text category fallback), never a silent default.
4. **FIN-37 dueIn** — register the provider over the **built** G9 payment-schedule fields (liabilities/income `next_payment_date`), NOT the deferred Commitments derive (FIN-36). The provider's commitments-progress rows arrive when FIN-36 lands.
5. **S8 rulePack/model** — deny-safe ports to #44/#45; a real reach (rule-pack fetch, cloud AI) is M2. `deriveObligations` computes over `fiscal_obligations` locally now; the fan-out targets (Tasks/Notifications/Calendar) are the built module contracts.

## Per-slice Verification-Gate ledger  (§XXVI · Step 9 — each PASSes before the next slice)
| S | Functional (Vitest logic + failure paths) | Live-store smoke (real better-sqlite3 + `initVault()` + `migrate()`) | Status |
|---|-------------------------------------------|----------------------------------------------------------------------|--------|
| S1 | CRUD happy + invalid-enum reject + soft-delete hides + not-found fail-loud + faithful-echo defaults | create→read each of 5 tables; `deleted_at` set; `sync_queue` enqueued (13 tests) | ✅ PASS |
| S2 | balance = opening+Σledger; edit/delete re-derives; transfer both-balances + excluded; source==dest rejects; FN-4 on account_id change | live ledger writes; balance re-derive over real rows (11 tests) | ✅ PASS |
| S3 | overview totals; net-worth = FN-7 sum; investment gain/loss; partial-flag on error | overview over a live multi-account/asset/liability set; per-chart degrade via live DROP TABLE (41 tests) | ✅ PASS |
| S4 | handler registered; idempotent replay (same event_id → no double); ledger-movement co-write; lock-port deny-safe | fire `move_money` on the real rail; `applied_effects` UNIQUE holds | ☐ |
| S5 | recurring forecast; `FxRateMissingError`; import refuse (ZK) fail-closed; grant-gate fail-closed | ingestion/egress ports exercised against built #44/#43 | ☐ |
| S6 | `/summary` provider output; entity_tags read/write; dueIn over G9 schedules; notes delegate | provider registered in the live Journals registry; entity_tags round-trip | ☐ |
| S7 | residency/legal-entity/money-touch CRUD; grant-gate fail-closed; typed errors | live CRUD on fiscal_residencies/legal_entities; jurisdiction link | ☐ |
| S8 | deriveObligations never-on-unverified + no-auto-action; rulePack/model deny-safe; disclaimer uncstrippable | fiscal_obligations derive + confirm→fan-out seam; #44/#45 ports fail-closed | ☐ |

## Build notes / §XXVIII deviations
- **S1 (2026-09-21):** two code-review-driven refinements, both grounded:
  1. **No finance-local not-found error.** Dropped the initial `guardExists`/`FinanceEntityNotFoundError` — `repository.update()`/`delete()` already throw `Error('Row not found')` (repository.ts:412); the pre-read was a redundant SELECT and a divergence from the checkins/journals precedent (bare repo throw). Soft-delete-aware update rejection (update() ignores `deleted_at`) is a **repo-wide** concern → DB-11, not a finance patch (altitude).
  2. **`@vida/types` interfaces extended (FIN-01/FIN-27).** Added `Account.opening_balance`, liability G9 (`payment_frequency`/`next_payment_date`/`interest_type`/`payoff_date`), `IncomeStream.next_payment_date` — the schema had them, the interfaces didn't, so the exposed contract was incomplete. FIN-27 is homed to "finance service / @vida/types" (parts/finance.md:37), so this is in S1 scope, not deferred DB-11. `jurisdiction_code` interface exposure stays for S7 (FL-02).

- **S3 (2026-09-22):** derived analytics (FIN-17/19/22) appended to `createFinanceService` (types.ts DTOs +
  service.ts closures; `@vida/types` untouched — DTOs service-local). Full gate: PLAN `PLAN-S3-derived-analytics.md`
  → gate-1 /critique REVISE→SHIP (B1: unified null-value policy — overview surfaces `unvalued*`+`partial`, not a
  silent 0; N1–5 folded) → /adr-check (ADR-012 §3.3 derive-not-store house rule; FN-7 vs deferred store-tree
  reconciled) → /preflight PASSED (4 clarifications folded: breakdown null note · empty path · auth/ZK axis ·
  current-* birth) → gate-2 /critique SHIP → implement → Verification Gate PASS → code-review (4 findings folded:
  priceSet/currentValue contract · 2× sort determinism · gainLossPct `>0` guard) → pre-ship /critique SHIP.
  No `date-fns` in core (checkins inline precedent); `monthWindow` UTC arithmetic. @vida/core **1207/1207** (+16),
  tsc 0, eslint 0. §XXIX: `docs/modules/finance/current-{spec,business-rules}.md` BORN (D6, covering S1–S3).

- **S2 (2026-09-21):** balance is DERIVED (FN-3) — no balance-column write on transaction mutation; `getBalance` recomputes live. Two code-review fixes folded: (1) `updateTransaction` re-validates FN-4 on an `account_id` change (an account_id-only patch could turn a transfer into a self-transfer that nets to 0 — regression-tested); (2) `listTransactions`/`getTransactionsInRange` use a stable `byNewest` comparator (date desc → created_at desc → uuidv7 id desc) since `findWhere` issues no `ORDER BY`. M1 pagination = in-memory slice (single-user local ledger). Transaction `tags` returns `[]` (inline column retired → entity_tags; real read is S6/FIN-35). Achievement emit (FIN-31) deferred to S6.

## Coverage check (Ratify completeness)
48 homed legs = S1(13) + S2(8) + S3(3) + S4(1) + S5(7) + S6(6) + S7(5) + S8(5) = **48** ✓. Deferred set (FIN-18/23/24/36/38/39) + RIDE (FIN-43/44, FL-11) + ② ui legs = the complement, all homed above. Every `structural` EC = N/A (pure backend, Envision N/A).

## Completion checklist
- [x] mode declared (Ratify+detail) · [x] all 48 legs sliced, sum verified · [x] deferred/OUT set recorded + homed · [x] deferred-seam decisions enumerated (Approval-1 targets) · [x] per-slice Verification-Gate ledger · [x] operations/invariants cite parts/finance.md + business-rules.md (no duplication)
