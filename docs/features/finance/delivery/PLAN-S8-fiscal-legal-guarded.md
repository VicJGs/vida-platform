<!-- PLAN — Finance ① S8 · Entity Delivery Flow v1 (per-slice Service track) · mod-finance #47 / LIF-122 -->
<!-- Mode: RATIFY + detail. The 5 legs (FL-04…08) are doc-fixed by slice-map.md:21 + parts/finance.md:60-64 + -->
<!-- fiscal-legal/{contract,business-rules}.md. This PLAN details the guarded surface over the BUILT substrates -->
<!-- and the deny-safe ports; it decides no new leg. Gate 1 = this spec (§1–§4 + Open Decisions). -->

# PLAN — Finance ① S8: fiscal-legal INFORM / DERIVE / ADVISE (guarded)

**Slice:** S8 (LAST ① slice). **Legs:** FL-04 `rulePack` · FL-05 `deriveObligations` (+confirm→fan-out) · FL-06 `model` · FL-07 `prepareFilingSummary` · FL-08 long-run impact → Purpose. **Track:** backend. **Files:** extend `services/finance/fiscal-legal.ts` + new `services/finance/fiscal-ports.ts` (deny-safe ports, mirrors `config-seams.ts`) + append `validators/finance.ts`. **No schema** (`fiscal_obligations` already exists, `020_finance`). **No `@vida/types` change** (Row types + service-local DTOs — DB-11 precedent, S7).

## §1 Context (BASELINE — code as-is, `[FACT: path]`)

- **S7 landed the SITUATE spine + the full 7-error contract.** `createFiscalLegalService` (`fiscal-legal.ts`) exposes residency/legal-entity CRUD + `linkMoneyTouch` + `assertExternalGrant` (fail-closed via the enforcer, X5). The 7 named errors (`RulePackUnverified`, `ExternalGrantMissing`, `InsufficientRuleData`, `AdviceIsInformational`, `NoAutoAction`, `FilingHandsOff`, `ModelUnavailable`) are **defined**; S8 is where they are **thrown**. `[FACT: fiscal-legal.ts:33-82,189-197]`
- **`fiscal_obligations` table is BUILT** (`schema/finance.ts:227-238`): `jurisdiction_code`, `owner_type` (FIXED CHECK `FISCAL_OWNER_TYPE`), `owner_id`, `obligation_type` (OPEN), `due_date`, `status` (OPEN), `source_rulepack_version` (notNull), `linked_task_id?` (no-FK → Tasks on confirm). Full `baseColumns` + `deleted_at`. `[FACT: schema/finance.ts:227-238]`
- **The substrates S8 composes are BUILT (all deny-safe/fail-closed at M1):**
  - `foundation/ingestion` — `createPublicReferenceEngine({fetch?,verifier?})` → `fetchWholeSet` (XCU-04, subset refused) throws `PublicRefDenied('fetch_unavailable')` at M1 (no mirror wired, U-2); `verifyDataset` fail-closed. `[FACT: ingestion/public-reference.ts:22-57]`
  - `foundation/ai` — `createAiService(...)` → `askModel(req)` deny-safe (both ports absent ⇒ `AiDenied('model_unavailable'|'on_device_unavailable')`); `checkModelCall` non-throwing. `buildAiDisclosure(mode)`, `stampAiProvenance(row)→{...,source:'ai'}`, `resolveMode`. A cloud call carries the egress triple `{target{kind:'model'},slice,userInitiation}` and rides #43. `[FACT: ai/types.ts:144-151,72-94; ai/modes.ts:57,66]`
  - `foundation/capability` — `CapabilityEnforcer.checkAction`; S7's `assertExternalGrant(defId, action)` already gates on it (fail-closed). `[FACT: fiscal-legal.ts:189-197]`
- **The fan-out / hand-off / feed TARGETS are NOT built** (only directory-home `CLAUDE.md`): `services/tasks`, `services/notifications` (module write-paths), `services/export`, `services/purposes` (`contributions` writer). `contributions` writing is **Purpose-owned** (DF-12; `foundation/measurement` is a pure engine, **no tables**). `[FACT: ls services/*; foundation/measurement/CLAUDE.md]`
  → Therefore **every S8 external/cross-module reach is a deny-safe port** composing a built substrate or fronting an unbuilt target — the S4 `StoreLockPort` / S5 `config-seams` / S6 FIN-31 reserved-seam precedent. Zero-signature-change swap at M2. `[[xs-security-services-deny-safe-port-build-shape]]`
- **⚠ The rule-pack CONTENT format + provenance/verify is EXPLICITLY OWED — homed to the ADR-014 public-reference build (M2), NOT S8.** `[FACT: parts/finance.md:60 "provenance/signing owed"; parts/finance.md:123 "the sign/verify mechanism is not yet specified → BLOCKER homed to FL-04"; structure-data.md:26 "provenance-signed + versioned [owed]"; intake:72 rule-pack-format open-question NOT resolved by the RESOLUTION 76-93]` So S8 does **not** author a rich rule-pack schema or a per-jurisdiction rule-evaluation engine (that would *invent the owed format*). S8 builds the **obligation LIFECYCLE + the never-on-unverified-law gate**; the pack-evaluation body is an owed seam that lands with the format at M2. `RulePack` is a **minimal opaque handle** (its content schema owed), not a detailed DTO.
- **The REAL, testable positive path is `confirmObligation` — via the FL-11 manual fallback.** A user can author an obligation by hand (FL-11: "SITUATE/TRACK work manually... the user can type residency + **obligations** by hand"), so `confirmObligation(candidate)` persists a real `fiscal_obligations` row **without needing a rule-pack** — the S5 real-persist-with-deferred-reach analog (persist real, cross-module fanout deferred). `[FACT: business-rules.md:51-54 (FL-11); structure-data.md:20-22 "derived, user-confirmable"]`

## §2 Business Rules (S8 invariants — MUST satisfy; cited)

- **BR-S8-1 (FL-05/X2/X5/X9 · FL-04).** `rulePack(jurisdiction)` reads the ADR-014 **public-reference** layer via the BUILT `createPublicReferenceEngine`: `assertExternalGrant(external_in)` FIRST (fail-closed) → `fetchWholeSet` (WHOLE set only, never a per-item leak) → provenance/version verify. M1: no mirror ⇒ `PublicRefDenied('fetch_unavailable')` mapped to `RulePackUnverified`; no grant ⇒ `ExternalGrantMissing`. A pack that fails verification is **not applied**. `[FACT: business-rules.md:25-30; contract.md:12-14; public-reference.ts]`
- **BR-S8-2 (FL-05/FL-5 · owed-format grounding).** `deriveObligations(range)` is the **lifecycle proposer + the unverified-law gate**: it requires a **verified** `RulePack` (opaque handle) and returns `ObligationCandidate[]` — it **NEVER persists and NEVER fans out**. On an unverified/absent pack it refuses with `RulePackUnverified` (never computes on unverified law). The per-jurisdiction **rule-evaluation body** (brackets/deadlines → concrete candidates) is an **owed seam** landing with the pack format at M2 — at M1 the pack is never verified (public-reference deny-safe), so the tested behavior is the **deny path**. Building the evaluation now would invent the owed format. `[FACT: business-rules.md:31-34,75-76; parts/finance.md:60,123; structure-data.md:26]`
- **BR-S8-3 (FL-3/FL-6/FL-11 · NoAutoAction structural).** `confirmObligation(candidate)` is the **explicit user action** — the ONLY path that persists a `fiscal_obligations` row + fires the fan-out. The candidate may be **hand-authored** (FL-11 manual fallback) or come from `deriveObligations`; the persist is real (built table) either way. NoAutoAction is enforced **STRUCTURALLY** by this split (derive proposes, only confirm persists — there is no auto-apply method to guard), NOT by a manufactured throw. The persist commits FIRST; then a deny-safe `ObligationFanoutPort` (Tasks/Notifications/Calendar unbuilt) surfaces its deferral **in the return value** (`{deferred:[...]}`) — never a silent swallow, never a rollback of the valid local row (the FIN-31 reserved-emit precedent, not the S4 atomic `StoreLockPort`). `[FACT: business-rules.md:18-21,31-34,79,94; FL-11 51-54; current-business-rules.md FIN-31]`
- **BR-S8-4 (FL-07/FL-06 · ADR-015).** `model(scenario)` runs the what-if via the BUILT `AiService.askModel`; output is wrapped with `stampAiProvenance` (`source='ai'`) + the FL-3 **"not professional advice"** disclaimer, carried as **non-optional readonly fields the service always stamps** (a caller cannot obtain an `Advisement` from the service without them; mutating one's own returned copy is out of the ZK threat model). `AdviceIsInformational` is a **structural marker** of that contract, not thrown on the happy path. Missing rule-pack for the jurisdiction ⇒ `InsufficientRuleData` (never fabricates). An ADR-015 failure/deny ⇒ `ModelUnavailable`, isolated — the local SITUATE/TRACK spine is unaffected. Never an auto-action. `[FACT: business-rules.md:35-41,58-60,77-78,89,95-96; contract.md:18-21,41; ai/modes.ts stampAiProvenance]`
- **BR-S8-5 (FL-2/FL-07).** `prepareFilingSummary(jurisdiction)` assembles an organized summary **locally** (over the user's fiscal-legal + money-touch data — real, no external dep) and **hands off** via a deny-safe `FilingExportPort` (export substrate unbuilt → M2). It **NEVER files**: there is no file affordance, so "never files" is enforced structurally; `FilingHandsOff` is the **permanent contract marker** (the OS is never a regulated service), NOT the M1 export-absent error — the port raises its own `FilingExportNotActive` at M1, and at M2 (export built) `prepareFilingSummary` SUCCEEDS and never throws `FilingHandsOff`. `[FACT: business-rules.md:15-17,80-81; contract.md:22-23,43]`
- **BR-S8-6 (FL-08/FL-10 · ADR-011).** `feedLongRunImpact(impact)` feeds a modeled fiscal outcome into Purpose long-run planning via the ADR-011 **contributions** rail — a deny-safe `ContributionsPort` (Purpose-owned writer unbuilt), **never a bespoke path**. `[FACT: business-rules.md:48-50; parts/finance.md:64]`
- **BR-S8-7 (FL-12/ZK-1).** Obligation derivation + what-if assembly run on-device over `[E]` user data; the server sees nothing. A `cloud` what-if is the only sharing path, and only as ADR-015's disclosed, scope-minimized (AI3), X4-egress-gated dent — the slice is caller-supplied (the tier has no vault access to over-send from). `[FACT: business-rules.md:55-57; ai/types.ts:76-89]`

## §3 Design

### 3.1 Deny-safe ports — new file `services/finance/fiscal-ports.ts` (mirrors `config-seams.ts`)

Each port fronts an unbuilt target; each M1 default is deny-safe/fail-loud (never fabricates), swapped at M2 with no signature change.

```ts
// The confirm → Tasks/Notifications/Calendar fan-out (FL-6). One port; the three targets are its concern.
// The obligation ROW is persisted by confirmObligation (built table); this surfaces it cross-module.
export interface ObligationFanoutPort {
  onConfirm(o: FiscalObligationRow): Promise<ObligationFanoutResult> // {taskId?, notificationId?, calendarId?, deferred: string[]}
}
export class FanoutTargetsNotActive extends Error { /* names the deferred targets (M1) */ }
export const denySafeObligationFanoutPort: ObligationFanoutPort // M1: returns {deferred:['tasks','notifications','calendar']} — NOT silent: the row stands, the echo is explicitly deferred

// Filing FORMAT-export (FL-2) — OPTIONAL. `prepareFilingSummary` RETURNS the assembled FilingSummary (the
// deliverable, contract.md:22); this port only renders it to a file FORMAT (PDF/DOCX via the export module).
// M1: export substrate absent ⇒ the summary still returns; only an explicit format-export throws. NOT
// FilingHandsOff (that is the permanent "never files" marker, structural — there is no file() affordance).
export interface FilingExportPort { toFormat(summary: FilingSummary, format: string): Promise<FilingHandoffRef> }
export class FilingExportNotActive extends Error { /* M1: format-export substrate not wired */ }
export const denySafeFilingExportPort: FilingExportPort // M1: throws FilingExportNotActive (summary itself unaffected)

// Long-run impact → Purpose contributions (FL-10). ContributionInput MIRRORS the ADR-011 `contributions` schema
// (schema/purposes.ts) — never a bespoke path. M1: Purpose writer absent ⇒ fail loud (typed), never a silent no-op.
export interface ContributionsPort { feed(c: ContributionInput): Promise<void> }
export class ContributionsSinkNotActive extends Error {}
export const denySafeContributionsPort: ContributionsPort // M1: throws ContributionsSinkNotActive
```

> **Rule-pack fetch** does NOT get a new port — it composes the BUILT `createPublicReferenceEngine` directly (that IS the ADR-014 substrate). **The model call** does NOT get a new port — it composes the BUILT `AiService` (injected). We add ports ONLY where the target module is unbuilt AND there is no built substrate to compose (fan-out, filing-export, contributions).

### 3.2 Deps (extend `FiscalLegalServiceDeps` — all new deps optional, deny-safe default)

```ts
publicRef?: PublicReferenceEngine     // default: createPublicReferenceEngine() (M1 deny-safe fetch)
ai?: AiService                        // FL-06; absent ⇒ model() throws ModelUnavailable (fail-closed, no ambient AI)
fanout?: ObligationFanoutPort         // default: denySafeObligationFanoutPort
filingExport?: FilingExportPort       // default: denySafeFilingExportPort
contributions?: ContributionsPort     // default: denySafeContributionsPort
```
(`enforcer?` + `finance` already on the S7 deps; `assertExternalGrant` reused verbatim.)

### 3.3 DTOs + Validators (pinned — preflight-resolved shapes)

**DTOs (service-local; `@vida/types` untouched, DB-11):**
- `RulePack = { jurisdiction_code: string; version: string; verified: boolean }` — minimal handle; the **content** (brackets/entity-types/deadlines) is an owed M2 field (`content?: unknown` reserved), NOT authored now. `[FACT: schema/finance.ts:235 source_rulepack_version notNull]`
- `ObligationCandidate = { jurisdiction_code; owner_type∈FISCAL_OWNER_TYPE; owner_id; obligation_type; due_date; source_rulepack_version; linked_task_id?: null }` — the `fiscal_obligations` insert minus baseColumns/status; `status` set by the service on confirm to `'pending'` (OPEN vocab, no CHECK — app-chosen default). `linked_task_id = null` at M1 (fanout deferred; the M2 fanout writes it back). `[FACT: schema/finance.ts:227-238,234 status OPEN]`
- `ConfirmResult = { obligation: FiscalObligationRow; fanout: ObligationFanoutResult }`.
- `Advisement = { readonly content: string; readonly source: 'ai'; readonly disclaimer: string; readonly modeDisclosure: AiModeDisclosure }` — **two distinct disclosures**: `disclaimer` = the FL-3 `NOT_PROFESSIONAL_ADVICE` constant (legal label); `modeDisclosure` = `buildAiDisclosure(mode)` (the egress-honesty bound). `source` via `stampAiProvenance`. `[FACT: business-rules.md:18-21,58-60; modes.ts:57,66]`
- `FilingSummary = { jurisdiction_code; residencies: FiscalResidencyRow[]; legalEntities: LegalEntityRow[]; moneyTouch: {type,id,jurisdiction_code}[]; obligations: FiscalObligationRow[] }` — assembled **locally** from built data; the deliverable itself (see §3.4 FL-07). `FilingHandoffRef = { format: string; ref: string }` (only produced by the optional format-export port, M2).
- `ContributionInput = { goal_type∈CONTRIBUTION_GOAL_TYPE; goal_id; contributor_type∈CONTRIBUTION_CONTRIBUTOR_TYPE; contributor_id; contribution_percentage: number /*0–100*/; contribution_notes?: string }` — **mirrors** `schema/foundation/purpose.ts:33-49` verbatim (FL-10 "never a bespoke path"). `[FACT: schema/foundation/purpose.ts:33-49]`
- `NOT_PROFESSIONAL_ADVICE` — a fiscal-legal string constant: "informational, not professional/legal/tax advice" (FL-3). `[FACT: business-rules.md:18-21]`

**Validators (append to `validators/finance.ts`):**
- `DeriveObligationsRangeSchema` — `{ from: YYYY-MM-DD, to: YYYY-MM-DD }` (from ≤ to).
- `ObligationCandidateSchema` — validates the `ObligationCandidate` shape above (owner_type enum-checked).
- `WhatIfScenarioSchema` — `{ defId: string; jurisdiction_code; mode: AiMode; prompt: string }` **for on_device**; a `cloud` scenario additionally carries the egress triple `{ target: EgressTarget /*{kind:'model'}*/; slice: EgressSlice; userInitiation: UserInitiationProof }` — **caller-supplied** (the tier has no vault access to build a slice from, BR-S8-7). `defId` is required by `AiCloudRequest`/`AiOnDeviceRequest`; `model(scenario, pack)` maps it to an `AiRequest`. `[FACT: ai/types.ts:83-94]`

### 3.4 Operations (added to `FiscalLegalService`)
| Op | Signature | Flow | Errors (thrown) |
|----|-----------|------|--------|
| FL-04 | `rulePack(jurisdiction): Promise<RulePack>` | `assertExternalGrant(FISCAL_LEGAL_CAP_ID, {type:'external_in', source: rulePackDatasetId(jurisdiction)})` (defId = the fixed fiscal-legal capability id; moot at M1 — no enforcer → `ExternalGrantMissing` before use) → `publicRef.fetchWholeSet({datasetId})` → `verifyDataset`; map `PublicRefDenied`→`RulePackUnverified` | `ExternalGrantMissing`, `RulePackUnverified` |
| FL-05 | `deriveObligations(range, pack): Promise<ObligationCandidate[]>` | require `pack.verified` (else `RulePackUnverified`) → propose candidates (evaluation body = **owed seam**, M2 w/ format); **no persist, no fanout** | `RulePackUnverified` |
| FL-05c | `confirmObligation(candidate): Promise<ConfirmResult>` | validate → serialize (`status:'pending'`, `linked_task_id:null`) → **persist `fiscal_obligations` row** (built table) → `fanout.onConfirm` (deny-safe) → return `{obligation, fanout:{deferred:[...]}}` | *(none — NoAutoAction is structural)* |
| FL-06 | `model(scenario, pack): Promise<Advisement>` | require `pack.verified` (else `InsufficientRuleData`) → build `AiRequest` (with `scenario.defId`) → `ai.askModel` → `stampAiProvenance` + `disclaimer=NOT_PROFESSIONAL_ADVICE` + `modeDisclosure=buildAiDisclosure(mode)` (all readonly) | `InsufficientRuleData`, `ModelUnavailable` |
| FL-07 | `prepareFilingSummary(jurisdiction): Promise<FilingSummary>` | **assemble + RETURN `FilingSummary` locally (real, M1-complete)**: residencies/legalEntities via the S7 `listResidencies`/`listLegalEntities` (filter jurisdiction); obligations via `findWhere(jurisdiction_code)` on `fiscal_obligations`; money-touch via the S1 finance list reads filtered by `jurisdiction_code`. Format-export is a SEPARATE optional `exportFiling(summary, format)` → `filingExport.toFormat` | *(prepareFilingSummary never throws at M1; `exportFiling` → `FilingExportNotActive`)* |
| FL-08 | `feedLongRunImpact(impact): Promise<void>` | `contributions.feed` (ADR-011 rail; input mirrors `contributions` schema verbatim) | `ContributionsSinkNotActive` *(M1 port)* |

> **Structurally-enforced (NOT thrown) errors** — honest throw-site accounting: `NoAutoAction` (enforced by the derive-proposes/confirm-persists split; no auto-apply method exists to guard), `AdviceIsInformational` (enforced by the always-stamped non-optional disclaimer + `source:'ai'`), `FilingHandsOff` (enforced by the absence of any `file()` affordance). Defining a fake throw-site for any of these to "satisfy" BR-S7-5's "S8 throws them" would be manufacture — S8 **realizes** the contract, some legs structurally, some by throw. `[FACT: business-rules.md:79,94; contract.md:41-43]`

Service-local DTOs (`@vida/types` untouched, DB-11): `RulePack` (**minimal opaque handle** — content schema owed to the ADR-014 build, M2), `ObligationCandidate`, `ConfirmResult` (`{obligation: FiscalObligationRow, fanout: ObligationFanoutResult}`), `Advisement` (readonly `source:'ai'` + `disclaimer`, non-optional), `FilingSummary`/`FilingHandoffRef`, `ContributionInput` (mirrors `schema/purposes.ts` `contributions`).

### 3.5 Deferred inside S8 (recorded, homed)
- Real rule-pack mirror/CDN + signature verifier → M2 (`publicRef` real ports). `[FACT: ingestion CLAUDE.md]`
- Real AI mediator / on-device runtime → M2 (LIF-145; `ai` ports). `[FACT: ai CLAUDE.md]`
- Tasks/Notifications/Calendar write-paths → the MOD modules (fan-out port swap). Export substrate → export module. Purpose `contributions` writer → MOD-purposes. `[FACT: ls services/*]`
- `[E]` encryption of obligation/scenario free text → M3/DB-5 (M1 `encryptedFields:[]` pass-through, FL-14). `[[m10-repos-use-empty-encryptedfields-seam]]`
- All fiscal-legal UIs (obligation review/confirm, what-if, hand-off) → ② `fe-finance` (P6).

## §4 Acceptance (Verification Gate — Step 9; PASSes before ①-close)
- **Functional — deny/fail-closed (Vitest):** `rulePack` (no grant → `ExternalGrantMissing`; grant + M1 deny-safe fetch → `RulePackUnverified`) · `deriveObligations` refuses on unverified/absent pack (`RulePackUnverified`) + never persists (0 rows written) · `model` deny (`ModelUnavailable`) + missing pack → `InsufficientRuleData` · `exportFiling` → `FilingExportNotActive` (M1 format-export port) · `feedLongRunImpact` → `ContributionsSinkNotActive`.
- **Functional — POSITIVE paths (the real capabilities, testable now):**
  - `confirmObligation` with a **hand-authored** candidate (FL-11) persists exactly ONE `fiscal_obligations` row (`status:'pending'`, `linked_task_id:null`) + returns `{obligation, fanout:{deferred:['tasks','notifications','calendar']}}` — the deferral surfaced, not swallowed; and there is **no auto-persist path** (derive returns candidates without writing — structural NoAutoAction).
  - `model(scenario, pack)` with a **verified minimal `RulePack`** (`{jurisdiction_code, version, verified:true}` — the handle, not the owed content) + an **injected stub `AiService`** (mediator/on-device port returning an `AiResponse`) returns an `Advisement` carrying `source:'ai'` + `disclaimer=NOT_PROFESSIONAL_ADVICE` + `modeDisclosure` — proves the stamp/**both-disclosures** path, not just the deny path. *(The AI substrate + `AiResponse` shape are BUILT — unlike the owed rule-pack CONTENT, this positive path is legitimately buildable.)*
  - `prepareFilingSummary` **returns** a real `FilingSummary` assembled from live residencies/entities/obligations/money-touch (M1-complete, no external dep) — the summary IS the deliverable (contract.md:22); only the optional `exportFiling` format-render is deferred.
- **Not tested at M1 (owed, stated — no silent cap):** the per-jurisdiction rule-**evaluation** inside `deriveObligations` (pack format owed → M2); the real rule-pack fetch/verify (mirror owed → M2). Only the deny path is exercised. `[FACT: parts/finance.md:123]`
- **Live-store smoke (better-sqlite3 + `initVault()` + `migrate()`):** `confirmObligation` writes a real `fiscal_obligations` row (baseColumns + `deleted_at` null + `sync_queue` enqueued) via a hand-authored candidate; ports fail-closed against the real enforcer + public-reference engine.
- **Gates:** tsc 0 · eslint 0 · @vida/core all green (+N) · code-review folded · pre-ship /critique SHIP.

## §5 Implementation Prompt
1. `validators/finance.ts` += `DeriveObligationsRangeSchema`, `ObligationCandidateSchema`, `WhatIfScenarioSchema` (§3.3).
2. `services/finance/fiscal-ports.ts` (new): `ObligationFanoutPort`/`FilingExportPort`/`ContributionsPort` interfaces + deny-safe defaults + `FanoutTargetsNotActive`/`FilingExportNotActive`/`ContributionsSinkNotActive` (mirror `config-seams.ts` + `effects.ts` `StoreLockPort`). Export the DTOs (`RulePack`, `ObligationCandidate`, `ConfirmResult`, `Advisement`, `FilingSummary`, `FilingHandoffRef`, `ContributionInput`, `ObligationFanoutResult`) + the `NOT_PROFESSIONAL_ADVICE` constant.
3. `fiscal-legal.ts`: extend `FiscalLegalServiceDeps` (§3.2: `publicRef?`/`ai?`/`fanout?`/`filingExport?`/`contributions?`) + add the 7 operations (§3.4: `rulePack`, `deriveObligations`, `confirmObligation`, `model`, `prepareFilingSummary`, `exportFiling`, `feedLongRunImpact`) to the interface + factory; wire deny-safe defaults; reuse `assertExternalGrant` (S7). Compose `publicRef`/`ai` (built). Stamp provenance via `stampAiProvenance`; both disclosures (`NOT_PROFESSIONAL_ADVICE` + `buildAiDisclosure(mode)`). `serializeObligation` backfills nullables (`status:'pending'`, `linked_task_id:null` — the S7 `serializeResidency` precedent). Honest throw-site accounting (§3.4 note): NoAutoAction/AdviceIsInformational/FilingHandsOff structural.
4. `index.ts` barrel += the new exports (ops types, ports, DTOs, `NOT_PROFESSIONAL_ADVICE`, error classes).
5. tsc → Verification Gate (§4: deny + positive paths) → code-review → §XXIX currency refresh (`finance/current-*` BR-S8-1…7) → pre-ship whole-① /critique → PR.

## §4b Preflight resolution (§XXVI step 4 — BLOCKED→resolved, grounded)
`/preflight` returned BLOCKED (6 gaps); each resolved from the docs/built substrates (no guess):
1. FL-3 legal disclaimer ≠ AI mode disclosure → `Advisement` carries BOTH (`NOT_PROFESSIONAL_ADVICE` + `buildAiDisclosure`). `[FACT: modes.ts:57; business-rules.md:18-21,58-60]`
2. `RulePack` = `{jurisdiction_code, version, verified}` (version structurally required by `source_rulepack_version notNull`; content owed). `[FACT: schema/finance.ts:235]`
3. `prepareFilingSummary` RETURNS `FilingSummary` (the deliverable); format-export is a separate optional `exportFiling`. `[FACT: contract.md:22-23; FL-11]`
4. `rulePack` grant-gate action = `{type:'external_in', source}`. `[FACT: capability/types.ts:108]`
5. `ContributionInput` mirrors `contributions` schema verbatim. `[FACT: schema/foundation/purpose.ts:33-49]`
6. Field shapes pinned (§3.3): `ObligationCandidate`, `status:'pending'`, `linked_task_id:null`@M1, `WhatIfScenario` caller-supplied egress triple. `[FACT: schema/finance.ts:227-238; ai/types.ts:83-94]`

## Gate-1 critique resolution (§XXVI step 2 — critique run + re-grounded per "ground everything in the documentation")
The gate-1 /critique returned REVISE (5 findings). Each was then re-grounded against the aspect docs (Victor directive); the grounding **inverted finding 1** as an over-reach and confirmed the other four:
1. **[INVERTED — over-reach]** "Build+test a real pack-derivation." The rule-pack **format + provenance/verify is OWED to the ADR-014 build (M2)** — `parts/finance.md:60,123` ("provenance/signing owed"; "sign/verify mechanism not yet specified → BLOCKER homed to FL-04"), `structure-data.md:26` ("[owed]"), `intake:72` (open Q not closed by RESOLUTION). Building the evaluation now invents the owed format. **Resolution:** `deriveObligations` = lifecycle proposer + unverified-law gate (deny path is the M1 behavior); `RulePack` = minimal opaque handle; the evaluation body is an owed M2 seam. §2 BR-S8-2, §3.4 updated.
2. **[CONFIRMED]** Manufactured `NoAutoAction`/`AdviceIsInformational` throws → **structural enforcement** (derive/confirm split + baked disclaimer), documented in §3.4's throw-site accounting. `[FACT: business-rules.md:79,94]`
3. **[CONFIRMED]** `FilingHandsOff` overload → the port raises its own `FilingExportNotActive` at M1; `FilingHandsOff` stays the permanent "never files" marker. `[FACT: contract.md:43]`
4. **[CONFIRMED]** `confirmObligation` return surfaces the fan-out deferral (`ConfirmResult`), not just the row. `[FACT: business-rules.md:88 terminal-state]`
5. **[CONFIRMED]** `model` positive path is testable now (AI substrate built) → §4 adds the injected-stub `source:'ai'`+disclaimer test.

## Open decisions for Approval 1 (grounded leans — confirm at the gate)
1. **Fan-out atomicity + M1 fail-mode (the one real fork).** **Lean:** persist the row first (committed), THEN `fanout.onConfirm` returns `{deferred:[...]}` (surfaced, NOT rollback, NOT swallow) — FIN-31 reserved-emit precedent, not the S4 atomic `StoreLockPort` (the obligation row is valid standalone; the cross-module echo is additive). `[FACT: current-business-rules.md FIN-31; business-rules.md:31-34]`
2. **`RulePack` = minimal opaque handle (format owed).** Confirm S8 does NOT author the pack content schema / rule-evaluation engine (M2, with the owed format). `[FACT: parts/finance.md:123]`
3. **Positive path = `confirmObligation` via FL-11 manual authoring** (real persist, no pack needed) + `model` via injected stub. The derive-from-pack evaluation is the only owed-deferred piece. `[FACT: business-rules.md:51-54]`
4. **New code location.** Extend `fiscal-legal.ts` + one new `fiscal-ports.ts` (deny-safe ports, `config-seams.ts` split). No new service. `[FACT: slice-map.md:8]`
