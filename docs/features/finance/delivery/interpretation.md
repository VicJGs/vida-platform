<!-- Interpretation Layer — features/finance · Entity Delivery Flow v1 Step 1 · mod-finance #47 / LIF-122 -->
<!-- Makes the implicit explicit before decomposing. Sources: docs/features/finance/{identity,structure-data,business-rules,contract,conventions}.md · fiscal-legal/* · docs/specs/foundation/backend-intent/parts/finance.md (leg source) · schema/finance.ts · foundation/economy.ts · effect rail. -->

# Interpretation — Finance (①  backend service tier)

> **Scope of this build.** `createFinanceService` + `createFiscalLegalService` (a Finance sub-service) in
> `@vida/core`, over the **already-built** DB-4 schema `020_finance` (9 tables). **48 legs** homed to
> `MOD-finance` — `finance:FIN-01…17,19,20,21,22,25,26,27,28,29,30,31,32,33,34,35,37,40,41,42,45,46` +
> `finance:FL-01…10` `[FACT: docs/specs/foundation/backend-intent/decomposition.md:58]`. All UI legs
> (`P6:P6`) are ② `fe-finance` — out of this build. `[FACT: traceability.md:130-215]`

## DEPENDENCIES  (every upstream — each `[FACT: path:line]`)

### Schema / tables (built, consumed)
- `accounts · transactions · assets · liabilities · investments · income_streams` — the 6 owned entity tables. `[FACT: packages/core/src/db/schema/finance.ts:50-190]`
- `fiscal_residencies · legal_entities · fiscal_obligations` — the fiscal-legal SITUATE spine + derived obligations. `[FACT: schema/finance.ts:200-238]`
- Amendments already authored: `accounts.opening_balance` (FN-3 seed), `transactions.category_bidx` + idx, liabilities G9 (`payment_frequency`/`next_payment_date`/`interest_type`/`payoff_date`), `income_streams.next_payment_date`, `jurisdiction_code` on the 5 money-touch entities. `[FACT: schema/finance.ts:21-23,61,86,141-145,187-188]`
- Migration `020_finance` (CHECK + indexes = the SQL DDL truth). `[FACT: packages/core/src/db/migrations/020_finance.ts]`

### Substrates (built elsewhere, consumed — never re-authored)
- **Effect rail** — `move_money` is a **registered handler**, not a table. Rail: `assertEffectPermitted(ctx, effectType, moduleClass)`; `EffectRegistry.register(effectType, handler)`; `EffectHandler = (event: EffectEvent, tx: EffectTx) => Promise<void>`; idempotent via `deriveEffectEventId(subjectNaturalKey, transition, effectType)` + `applied_effects` UNIQUE. `[FACT: packages/core/src/foundation/effects/{gate.ts:46-59,registry.ts:12-30,types.ts:37-53,event-id.ts:20-26}]`
- **Economy substrate (DB-3)** — `store` tree (`node_kind{group,wrapper}`, `ref_type/ref_id`, `is_locked`, `dream_id?`/`purpose_id?`), `currencies`, `consequence_ledger` (append-only, UNIQUE `(effect_event_id, kind, target_ref)`). Handler precedent: `grant_currency`/`lock_currency` in `foundation/economy/handlers.ts`; `move_money` **declared** in `EFFECT_TYPE` (`packages/types/src/session.ts:98`) + classed `additive` (`foundation/effects/types.ts:28`), handler **NOT yet registered** (DF-12 → Finance owns it). `[FACT: schema/foundation/economy.ts:23-81; foundation/economy/handlers.ts:36-70,10-11; foundation/economy/index.ts:5]`
- **Generic Repository** — `createRepository(db, table, {deviceId, encryptedFields, softDelete})`; `create/createInTx/findById/findAll/findWhere/update/delete`; auto encrypt-on-write / decrypt-on-read + co-transactional `sync_queue` enqueue. `[FACT: packages/core/src/db/repository.ts:185-217,267-293]`
- **enforcer #31 / egress #43 / ingestion #44 / AI #45** — the built deny-safe security ports (`external_in_ok`/`external_out_ok` grant gate, egress guard, device-mediated ingestion, AI advise). FIN-28/29 + FL-04/06 delegate to these. `[FACT: TASKS.md #43-46 Done; foundation/{egress,ingestion,ai}]`
- **Journals registry** — the journal-contribution provider seam for `/summary` (FIN-32). `[FACT: packages/core/src/services/journals/registry.ts]`
- **`entity_tags` (Spaces/SP1)**, **`pages` (Notes)**, **`contributions` (ADR-011)**, **`dueIn` aggregator (Sessions)** — consumed via contract, never table-read. `[FACT: parts/finance.md:32-37,42-47,7]`

### Packages
- `@vida/types/finance.ts` — the 6 entity interfaces + all enums (`ACCOUNT_TYPE`…`WORK_TYPE`, `INTEREST_TYPE`, `FISCAL_OWNER_TYPE`). `[FACT: packages/types/src/finance.ts:13-193]`
- `@vida/core/validators/finance.ts` — Zod enum schemas (9). `[FACT: packages/core/src/validators/finance.ts:14-22]`
- Precedent services: `services/checkins`, `services/journals`. `[FACT: packages/core/src/services/{checkins,journals}]`

## NEEDS  (preconditions to function)
- **Vault initialised before any repository write** — `initVault()` is required even with an empty `[E]` set (the keyless content-hash seam runs on every write). `[FACT: services/checkins/__tests__/checkins-service.test.ts:66-74; [[m10-repos-use-empty-encryptedfields-seam]]]`
- **M1.0 encryption is pass-through** — every finance repo takes `encryptedFields: []`; the `[E]` marks are the M3/DB-5 target (FIN-43/FL-11 = RIDE:substrate). `[FACT: schema/finance.ts:31; [[m10-repos-use-empty-encryptedfields-seam]]]`
- **`softDelete` per table** — the 9 finance/fiscal tables all carry `deleted_at` → `softDelete: true`. `[FACT: schema/finance.ts:70,95,121,146,167,189,210,223,237]`
- **`db` + `deviceId` injected** into the factory (the precedent deps shape). `[FACT: services/checkins/types.ts:39-46]`
- **Effect-rail registration ordering** — the `move_money` handler must be `register()`ed into the shared `EffectRegistry` at wiring time, mirroring `registerEconomyEffects`. `[FACT: foundation/economy/handlers.ts:67-70]`
- **Deferred substrate ports** — `store`/lockBox (FIN-24), `import_staging` (FIN-28), managed-category store (FIN-30), base-currency/FX store (FIN-21), Commitments (FIN-36) have **no table today**; each in-scope leg that touches one needs a **deny-safe/deferred port** (fail-closed or "not-configured" typed state), not a stub that fabricates. `[FACT: schema/finance.ts:27-29; parts/finance.md:73-90]`

## ORGANIZATION  (OWNS vs CONSUMES vs DELEGATES)
- **OWNS** — the 6 finance + 3 fiscal-legal tables' CRUD; the derived reads (`getBalance` FN-3, `getOverview`/net-worth-simple FN-7, `getInvestmentValue` FN-6, chart datasets); transfer semantics (FN-4); the `move_money` effect **handler** (executor, FN-16); `deriveObligations` (FL-6); the jurisdiction money-touch link (FL-9).
- **CONSUMES** (reads a substrate, adds nothing to it) — `entity_tags` (FIN-35), `store` reward-target (FIN-26 penalty branch → deferred port), `currencies`/`consequence_ledger` (via `move_money`), the ADR-014 ingestion rails (FIN-28, FL-04), the ADR-015 AI layer (FL-06), the ADR-010 grant fields (FIN-29, FL-09).
- **DELEGATES** (owns nothing; routes through another module's contract) — notes → `pages` (FIN-34); obligation → Tasks/Notifications/Calendar fan-out (FL-05); Gamification achievement emit (FIN-31); Purpose net-worth read seam (FIN-33); Journal `/summary` provider (FIN-32); `dueIn` provider (FIN-37); long-run impact → Purpose `contributions` (FL-08); filing → export (FL-07).
- **NOT OWNED (feeder-only)** — `measurement_kind`/`binding_mode` are **not** on Finance entities (C6 — Finance feeds Purpose, is not a pursuable). `[FACT: parts/finance.md:43,115; schema/finance.ts:28]`

## IMPLICIT RULES  (hidden invariants a doc implies but never states)
- **Balance is never a stored column write.** `accounts.current_balance` exists and is `notNull().default(0)` `[FACT: schema/finance.ts:59]`, but FN-3 makes it **derived** — the service must recompute from `opening_balance + Σ ledger` and never persist a hand-set balance. The column is a cache the derivation may (opt-in, FIN-25) fill, not the source of truth. `[INTERP: FN-3 vs the notNull column — business-rules.md:17-19]`
- **`Repository.create()` returns the input row, not DB defaults.** Omitted notNull-default columns come back `undefined` — backfill defaults (e.g. `currency ?? 'USD'`, `is_active ?? true`) in the service create input. `[FACT: [[repository-create-returns-input-row-not-db-defaults]]]`
- **Fiscal-legal returns Drizzle `Row` types, not `@vida/types` interfaces.** `@vida/types/finance.ts` has **no** `FiscalResidency`/`LegalEntity`/`FiscalObligation` interface (only the enums) — the interface reconcile is DB-11. The fiscal-legal service surface types on `FiscalResidencyRow` etc. `[FACT: packages/types/src/finance.ts:81-82 (enums only); schema/finance.ts:253-258; [[drizzle-row-not-assignable-to-vida-types-interface]]]`
- **Transfer is one row with a nullable partner, enforced app-side.** No FK, no CHECK ties `transfer_to_account_id` to `transaction_type='transfer'` — the service must enforce "transfer ⟺ partner set, non-transfer ⟹ partner null, source≠destination" and re-derive **both** balances. `[INTERP: FN-4 — schema/finance.ts:79 no-FK; business-rules.md:94]`
- **`move_money`'s core is groundable; its penalty branch is not.** The handler registration + ledger-movement execution (R1/R2 via `createInTx`) can build now; the "penalty LOCKs a store box" branch (E5) depends on the **deferred** store layer (FIN-24) → a deny-safe port. `[INTERP: FIN-26 in ① vs FIN-24 deferred — traceability.md:154 vs :169]`
- **Cascade/orphan is app-layer, not the DB.** The `020` model dropped all FKs (no-FK, ADR-016 §3.4) — FN-11 (delete account ⟹ cascade transactions, SET NULL transfer/investment links) is **service code**, not `ON DELETE`. `[FACT: schema/finance.ts:14-15,78-79; business-rules.md:47-50]`
- **`deriveObligations` never computes on unverified law + never auto-acts.** Every derived obligation is user-confirmable; a rule-pack failing signature/version → flag, don't compute; no obligation/filing ever auto-fires. `[FACT: fiscal-legal/business-rules.md:76-79,93-94]`

## Envision Gate — N/A
Pure-backend entity: it renders no user surface (all `ui` legs are homed `P6:P6` → ② `fe-finance`). Per
`entity-delivery-flow.md §3.75`, the Envision Gate is stated N/A, not skipped. Should any slice yield a
user-visible affordance it hands to `add-frontend-component`; none do here. `[FACT: traceability.md ui-legs → P6:P6]`

## Completion checklist
- [x] DEPENDENCIES (schema · substrates · packages) each `[FACT]` · [x] NEEDS (vault · M1.0 [E]:[] · softDelete · deferred ports) · [x] ORGANIZATION (owns/consumes/delegates + feeder-only) · [x] IMPLICIT RULES (7 surfaced, each cited) · [x] Envision Gate N/A stated
