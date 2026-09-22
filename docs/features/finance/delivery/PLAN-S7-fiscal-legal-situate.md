<!-- PLAN — mod-finance ① · S7 fiscal-legal SITUATE (local ZK spine) · Entity Delivery Flow v1 -->
<!-- §XXVI Gate 1 = THIS spec. Operations authority: parts/finance.md FL-01/02/03/09/10. Invariants: fiscal-legal/business-rules.md FL-1…12. -->

# PLAN — Finance ① S7: fiscal-legal SITUATE (local ZK spine)

**Slice:** S7 (of 8). **Legs:** FL-01 (`setResidency`), FL-02 (`linkMoneyTouch`), FL-03 (`registerLegalEntity`),
FL-09 (grant-gate), FL-10 (typed-error contract). **Track:** backend. **Envision Gate:** N/A (service tier).
**New service:** `createFiscalLegalService` — a Finance **sub-context** (FL-1), a new file `services/finance/fiscal-legal.ts`.

**Shape:** the **always-available, no-external-dep** spine (FL-4/FL-11) — residency + legal-entity CRUD + a
money-touch jurisdiction link, all on-device over `[E]` data; plus the fail-closed grant-gate + the full typed-error
contract that S8's guarded INFORM/DERIVE/ADVISE will consume. No schema (tables built at DB-4 `020_finance`).

---

## §1 Context (BASELINE — code as-is)
- Tables exist (`020_finance`): `fiscal_residencies` (owner_type[FIXED FISCAL_OWNER_TYPE]/owner_id/jurisdiction_code/
  residency_type/start_date/end_date?/notes[E]), `legal_entities` (project_id?/name[E]/entity_type/jurisdiction_code/
  registration_ref[E]), `fiscal_obligations` (S8). Row types exported (`FiscalResidencyRow`/`LegalEntityRow`). `[FACT: schema/finance.ts:198-258]`
- **No `@vida/types` fiscal-legal interface** (DB-11) → the service returns **Row types directly** (no interface
  cast — the raw-reader precedent `[[drizzle-row-not-assignable-to-vida-types-interface]]`). `[FACT: S1 slice-map DB-11 note]`
- `FISCAL_OWNER_TYPE = ['user','legal_entity']`. Money-touch entities carry `jurisdiction_code` (in their update
  schemas: accounts/transactions/assets/investments/income — the FL-9 amend, S1). `[FACT: finance.ts:81; validators/finance.ts:56,78,97,135,155]`
- Enforcer BUILT: `checkAction(defId, {type:'external_in',source}|{type:'external_out',target}) → {allowed}`. `[FACT: capability/enforcer.ts:105; types.ts:108-109]`
- No fiscal-legal validators exist yet (net-new). `[FACT: grep validators/finance.ts — 0 hits]`

## §2 Business Rules (invariants this slice MUST satisfy — cited)
- **BR-S7-1 (FL-4 / ZK-1).** SITUATE is the user's own local `[E]` data, computed on-device — **needs NO external
  integration** (the always-available core). `[FACT: fiscal-legal/business-rules.md:22-24]`
- **BR-S7-2 (FL-9).** Money-touch = a **jurisdiction link on existing Finance entities** (accounts · transactions ·
  assets · income · investments) — Finance entities **untouched in structure** (the `jurisdiction_code` column
  already exists); the sub-context only sets the association, **never copies a balance**. `[FACT: fiscal-legal/business-rules.md:45-47]`
- **BR-S7-3 (FL-8 / FL-1).** A legal-entity is modeled as/linked to a **Project** (`project_id`, no-FK cross-domain
  forward-dep); fiscal-legal **owns only** its own situation, never another module's data. `[FACT: fiscal-legal/business-rules.md:42-44; parts/finance.md:59]`
- **BR-S7-4 (FL-11 / FL-9-leg / X5·X9).** The guarded capabilities (INFORM `external_in`, ADVISE `external_out`) are
  opt-in, **revocable/fail-closed**, **NO new grant table** (reuse ADR-010 fields). **SITUATE/TRACK work WITHOUT
  them.** In M1 (no enforcer/grant wired) the gate **fails closed** → `ExternalGrantMissing`. `[FACT: fiscal-legal/business-rules.md:51-54; parts/finance.md:65]`
- **BR-S7-5 (FL-10).** The typed-error contract (all 7): `RulePackUnverified`, `ExternalGrantMissing`,
  `InsufficientRuleData`, `AdviceIsInformational`, `NoAutoAction`, `FilingHandsOff`, `ModelUnavailable` — defined
  here; S8 throws the INFORM/DERIVE/ADVISE ones. `[FACT: parts/finance.md:66; fiscal-legal/business-rules.md:72-96]`
- **BR-S7-6 (FL-3).** No auto-action on legal/tax matters — but that's an S8/derive concern; S7 SITUATE is plain
  user-confirmed CRUD. Recorded so S7 assumes no auto-action semantics. `[FACT: fiscal-legal/business-rules.md:18-21]`

## §3 Design (new file `services/finance/fiscal-legal.ts`; new validators in `validators/finance.ts`)

### 3.1 Deps + typed errors
```ts
export interface FiscalLegalServiceDeps {
  db: DrizzleDb
  deviceId: string
  finance: FinanceService          // FL-02 linkMoneyTouch delegates to its validated update path (sync_queue, no dup)
  enforcer?: CapabilityEnforcer    // FL-09 grant-gate; absent ⇒ ExternalGrantMissing (fail-closed, M1)
}

// FL-10 — the full typed-error contract (S8 throws the INFORM/DERIVE/ADVISE ones). EACH class's constructor sets
// `this.name` (+ a doc-grounded message) — the NAME is the contract (FL-10 surfaces/labels), an empty-body subclass
// reporting name:'Error' would violate it (B1). Messages trace to business-rules.md:88-96 (failure behavior).
export class RulePackUnverified extends Error {}      // X3 sig/version fail → "rule-pack unverified", not applied (S8)
export class ExternalGrantMissing extends Error {}    // fail-closed, no egress/fetch (S7 gate + S8)
export class InsufficientRuleData extends Error {}    // missing pack → "insufficient rule data", no fabrication (S8)
export class AdviceIsInformational extends Error {}   // "not professional advice" label + source=ai, unstrippable (S8)
export class NoAutoAction extends Error {}            // never auto-applied — user confirms (S8)
export class FilingHandsOff extends Error {}          // organized summary, HANDS OFF — never files (S8)
export class ModelUnavailable extends Error {}        // cloud-AI failure isolated; SITUATE/TRACK spine unaffected (S8)
// e.g. constructor(...) { super(<message>); this.name = '<ClassName>' } — every class, per the S4 error precedent.
```

### 3.2 Validators (append to `validators/finance.ts`)
```ts
CreateResidencySchema = { owner_type: z.enum(FISCAL_OWNER_TYPE), owner_id, jurisdiction_code, residency_type,
                          start_date, end_date?: string|null, notes }   // notes notNull [E]
UpdateResidencySchema = CreateResidencySchema.partial()
CreateLegalEntitySchema = { project_id?: string|null, name, entity_type, jurisdiction_code, registration_ref }
UpdateLegalEntitySchema = CreateLegalEntitySchema.partial()
```

### 3.3 Operations (the `FiscalLegalService` interface; returns Row types)
```ts
// FL-01 — residency CRUD (the SITUATE spine).
setResidency(input): Promise<FiscalResidencyRow>
updateResidency(id, patch): Promise<FiscalResidencyRow>
softDeleteResidency(id): Promise<void>
listResidencies(): Promise<FiscalResidencyRow[]>

// FL-03 — legal-entity CRUD (composes Projects via project_id, no-FK forward-dep).
registerLegalEntity(input): Promise<LegalEntityRow>
updateLegalEntity(id, patch): Promise<LegalEntityRow>
softDeleteLegalEntity(id): Promise<void>
listLegalEntities(): Promise<LegalEntityRow[]>

// FL-02 — money-touch = set jurisdiction_code on a Finance entity (5 types; NOT liability). Delegates to the
// finance service's validated update (sync_queue, no restructure). A non-money-touch type fails loud.
linkMoneyTouch(entityType: MoneyTouchType, entityId: string, jurisdictionCode: string): Promise<void>

// FL-09 — the external-access grant-gate (fail-closed). M1: no enforcer ⇒ ExternalGrantMissing.
assertExternalGrant(defId: string, action: CapabilityAction): Promise<void>
```
`MoneyTouchType = 'account' | 'transaction' | 'asset' | 'investment' | 'income_stream'` (the FL-9 five; liability excluded).

### 3.4 Operation flow
- **CRUD** — factory-object, hoisted closures, no `this.` `[[factory-service-no-this-for-intra-calls]]`;
  `encryptedFields: []` M1.0 pass-through for the `[E]` notNull fields (notes / name / registration_ref — required
  in the create input, no default); `softDelete: true` on both tables. `createRepository(db, fiscalResidencies, cfg)`
  / `legalEntities`. serialize backfills `end_date ?? null`, `project_id ?? null`, `deleted_at: null`. Update/delete
  on a missing id fail loud via the repo throw (the finance-service precedent — no local guard).
- **linkMoneyTouch** — validate `entityType ∈ MoneyTouchType` (else fail loud); dispatch to the injected
  `finance.updateAccount/updateTransaction/updateAsset/updateInvestment/updateIncomeStream(entityId, { jurisdiction_code })`.
  Reuses finance's validated update + co-transactional sync_queue; no fiscal-legal write to finance tables directly.
  **Reuse-safety (N1):** a jurisdiction-only patch to `updateTransaction` is safe — its FN-4 re-validation guard
  fires ONLY when `transaction_type`/`transfer_to_account_id`/`account_id` are in the patch, so `{jurisdiction_code}`
  skips it (no spurious transfer-shape rejection).
- **assertExternalGrant** — `if (!deps.enforcer) throw new ExternalGrantMissing(...)` (M1 fail-closed); else
  `const d = await enforcer.checkAction(defId, action); if (!d.allowed) throw new ExternalGrantMissing(...)`.

### 3.5 Deferred inside S7 (recorded, homed)
- **INFORM/DERIVE/ADVISE** (FL-04/05/06/07/08 — rulePack/deriveObligations/model/prepareFilingSummary/impact) — **S8**.
  S7 defines their typed errors (FL-10) but builds none of them.
- **`fiscal_obligations`** table CRUD — S8 (deriveObligations). **Projects legal-entity model** (`project_id`
  forward-dep) — Projects owns it; S7 stores the id, no-FK. `[FACT: parts/finance.md:122]`
- **`[E]` field encryption** (notes/name/registration_ref) — M1 pass-through; wiring → M3/DB-5. `[[m10-repos-use-empty-encryptedfields-seam]]`

## §4 Acceptance
1. `setResidency`/`updateResidency`/`softDeleteResidency`/`listResidencies` — CRUD over `fiscal_residencies`; invalid `owner_type` rejects; soft-delete hides; not-found fails loud; `sync_queue` enqueued.
2. `registerLegalEntity`/`update`/`softDelete`/`list` — CRUD over `legal_entities`; `project_id` optional (no-FK); `[E]` name/registration_ref round-trip (M1 plaintext pass-through).
3. `linkMoneyTouch('account', id, 'US-CA')` sets the account's `jurisdiction_code` (via finance update, verified by a read); a non-money-touch type (`'liability'`/junk) fails loud; a missing entity fails loud via the finance update throw.
4. `assertExternalGrant` → `ExternalGrantMissing` with no enforcer (M1 fail-closed); with an enforcer: `allowed:true` resolves, `allowed:false` → `ExternalGrantMissing`.
5. All 7 FL-10 error classes exported (the contract S8 consumes).
6. tsc 0, eslint 0. Live-store Verification Gate PASS. Finance S1–S6 untouched.

## §XXVIII deviation (impl) — `@vida/types` money-touch interfaces extended (FL-02 exposure)
The PLAN said "@vida/types untouched" — **wrong**. tsc caught it: `linkMoneyTouch`/`getAccount` expose `jurisdiction_code`,
but the `@vida/types` `Account`/`Transaction`/`Asset`/`Investment`/`IncomeStream` interfaces lacked it. This is NOT a
new decision — the S1 slice-map (`slice-map.md:57`) **explicitly deferred it to S7**: *"`jurisdiction_code` interface
exposure stays for S7 (FL-02)."* Fix: add `jurisdiction_code: string | null` to the **5 money-touch interfaces**
(Liability excluded, per FL-9's set). Grounded, mechanical, the documented S7 scope the PLAN under-specified. `[FACT: slice-map.md:57; schema/finance.ts nullable jurisdiction_code]`

## §5 Implementation Prompt
New `services/finance/fiscal-legal.ts` (`createFiscalLegalService` + `FiscalLegalService`/`FiscalLegalServiceDeps` +
the 7 error classes + `MoneyTouchType`); append the 4 fiscal validators to `validators/finance.ts`. Returns Row
types (no `@vida/types` cast). Barrel-export from `index.ts`. tsc → Vitest (residency/legal-entity CRUD + invalid
enum + soft-delete + not-found · linkMoneyTouch dispatch + reject + missing · assertExternalGrant fail-closed +
enforcer allow/deny · error-class exports) → live-store smoke → code-review → `/critique` → Currency (§XXIX) → commit.

**Auth/ZK:** SITUATE is all local `[E]` reads/writes (no egress); the grant-gate is fail-closed for the S8 external
reaches. No `@vida/types` change (Row types).

## Gate-1 critique resolution (§XXVI step 2)
- **B1 — RESOLVED.** Every FL-10 error class gets a `this.name`-setting constructor + a doc-grounded message
  (traced to `business-rules.md:88-96`) — the name IS the contract; empty-body `name:'Error'` would violate FL-10 (§3.1).
- **N1 — folded** (§3.4: jurisdiction-only patch skips updateTransaction's FN-4 guard — reuse-safe).
- **N2 — folded** (D2 rationale: `finance` required because fiscal-legal is a finance sub-context, FL-1).
- **N3 — folded** (all 7 errors exported from the barrel so S8 imports, never redefines; §3.1 marks each "(S8)").

## Open decisions for Approval 1
- **D1** — the service returns **Row types** (`FiscalResidencyRow`/`LegalEntityRow`), no `@vida/types` interface (DB-11; the raw-reader precedent). No `_sync_status` cast needed.
- **D2** — `linkMoneyTouch` **delegates to the injected `FinanceService`** update methods (validated + sync_queue), not a fiscal-legal-local write to finance tables. `finance` is a **required** dep — fiscal-legal is a finance sub-context (FL-1) that composes its parent; the app always constructs finance first (one-way edge, no cycle).
- **D3** — S7 defines **all 7** FL-10 error classes (the contract), though only `ExternalGrantMissing` is thrown in S7; S8 throws the rest (doc-fixed homing, `parts/finance.md:66`).
- **D4** — money-touch covers the **5** FL-9 entities (account/transaction/asset/investment/income_stream); **liability excluded** (per FL-9's enumerated set).
