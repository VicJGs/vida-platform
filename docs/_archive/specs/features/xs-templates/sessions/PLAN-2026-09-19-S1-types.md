# PLAN — xs-templates S1: types, terminal-states & errors (§XXVI gate 1 = the SPEC)

Status: draft (gate 1) — REVISED 2026-09-19 (Victor drift-catch: S1 must NOT design the bundle serialization schema).
Unit: Slice **S1** of the xs-templates head (#36) — the foundation types the other 4 slices rest on.
Source-repo: vida-platform · `@vida/types` + `@vida/core`
Profile: Add Backend Component · Scenario: Entity Re-scope (recovery)
Grounding rule (Victor directive 2026-09-19): every element traces to a `[FACT: cite]` / `[INTERP: from fact]`.
No invented shape. **The detailed bundle serialization schema is build-time (ADR-009:112-115) / S3's serializer
(xcut-templates.md:37 "not an intent item") — S1 stops at the ENVELOPE.**
Legs: XCU-07 _(envelope shape only — the JSON-doc principle; the serializer is S3)_ · XCU-10 (terminal-state type).
`[FACT: slice-map.md S1 + S3 (XCU-07 split: envelope=S1, serializer=S3)]`

---

## 1. Identity

S1 authors the **shared vocabulary** for the templates engine: the `TemplateBundle` _envelope_ (the 5 FIXED
members, contents opaque here), the instantiation terminal-state type, the instantiation result, and the typed
errors — in `@vida/types/src/template.ts` (canonical cross-package domain types, mirroring `view.ts`) +
`@vida/core/src/foundation/templates/types.ts` (service-local result + errors, mirroring
`foundation/views/types.ts`) + `@vida/core/src/validators/template.ts` (Zod + tuple parity).
`[FACT: view.ts (tuple+alias pattern); foundation/views/types.ts:1-70 (iface+error pattern)]`

**What it is NOT (and this time the contract honours it):**

- NOT the detailed per-member bundle **serialization schema** — ADR-009 fixes the 5-member envelope but defers
  detailed serialization to **build-time**; that field-level logic is authored in **S3's serializer** (the
  capture transform), grounded in what capture actually reads from Spaces/Views/Capability. S1 therefore types
  each member as an **opaque authored-JSON placeholder** (`unknown`), NOT a hand-designed `TagSeed`/`ViewSeed`/
  `SpaceSeed`. `[FACT: ADR-009:112-115; xcut-templates.md:37 "detailed schema is not an intent item"; slice-map.md S3 (XCU-07 serializer)]`
- NOT the capture/instantiate/CRUD logic (S2–S5). NOT the `Preset` type (S5). `[FACT: slice-map.md]`

## 2. Business Rules

- **BR-S1-1 (the envelope is the 5 FIXED members — nothing more).** `TemplateBundle` carries exactly
  `{ root_tag (+ nested tags) · seed entities · views · enabled capabilities+config · child Space structure }`.
  The members are FIXED by the ADR; **their contents are opaque at S1** (detailed serialization = build-time/S3).
  `[FACT: ADR-009:46-50 §3.1; :112-115 (serialization deferred)]`
- **BR-S1-2 (bundle = document, not live FKs).** The bundle is authored _data_ (a JSON document), never a live
  graph of FKs into the vault; the `enabled capabilities+config` member IS the target Space's
  `space_enabled_blocks` offered-capability palette (one concept, two names) — a principle S1 records, not a
  schema it designs. `[FACT: ADR-009:48-50; XCU-07; spaces.ts:97-109 space_enabled_blocks]`
- **BR-S1-3 (members are opaque authored JSON at S1).** Each of the 5 members is typed `unknown` / `unknown[]`
  here; S3's serializer defines the concrete per-member shape at build-time from the live Spaces/Views/Capability
  reads, and `seed_entities` remains the per-module member resolved at each owning module's build (the write-seam).
  Typing them `unknown` is the No-Guessing-correct stop, NOT laziness. `[FACT: ADR-009:112-115; xcut-templates.md:37; interpretation.md §0 (seed-entity write-seam)]`
- **BR-S1-4 (terminal states = exactly three).** `InstantiationStatus = 'in-progress' | 'success' |
'partial-failure'` — declared, degrade-never-crash. `[FACT: ADR-009:108-110; XCU-10]`
- **BR-S1-5 (result = seed-what-it-can / flag-the-rest).** `InstantiationResult` carries the seeded member keys +
  the flagged member keys with a reason. The doc-grounded reason is **a referenced capability not present on this
  device**; the reason field is an **open string** (not a fixed tuple) so S4 can add the M1.1 write-seam case
  without inventing a vocabulary here. `[FACT: ADR-009:108-110 "referencing a capability not present … seeds what it can and flags the rest"; XCU-11 (INTERP: per-member split)]`
- **BR-S1-6 (typed errors, async-reject).** `TemplateNotFound(id)` (mirrors `ViewNotFound`) and
  `TemplateCaptureError(reason)` (the IR-4 capture refusal — a config expressible only via accumulated data is not
  capturable) each extend `Error`, set `.name`, expose a readonly field; thrown by async methods as rejections.
  `[FACT: foundation/views/types.ts:52-66; ADR-009:53-57,73-83 (capture invariant → the refusal); factory-service memory]`
- **BR-S1-7 (tuple ≡ union ≡ validator parity).** `INSTANTIATION_STATUS` is a canonical `as const` tuple in
  `@vida/types` with a `z.enum` mirror in `@vida/core/validators`, parity-tested (`enum-parity.test.ts` convention).
  `[FACT: view.ts:16-27 + validators/view.ts (VIEW_LAYOUT precedent); enums.test.ts]`

## 3. Contract

**`@vida/types/src/template.ts`** (exported, cross-package):

```ts
export const INSTANTIATION_STATUS = ['in-progress', 'success', 'partial-failure'] as const // BR-S1-4
export type InstantiationStatus = (typeof INSTANTIATION_STATUS)[number]

/** The portable seed bundle ENVELOPE — the 5 FIXED members (ADR-009:46-50). Member CONTENTS are opaque
 *  authored JSON here; S3's serializer defines the per-member wire shape at build-time (ADR-009:112-115). */
export interface TemplateBundle {
  // BR-S1-1/2/3
  root_tag: unknown // authored root tag (+ nested); shape → S3 serializer
  seed_entities: unknown[] // per-module authored seeds; shape → owning-module build (write-seam)
  views: unknown[] // authored views (ADR-007); shape → S3 serializer
  enabled_blocks: unknown // the offered-capability palette + config (= space_enabled_blocks); shape → S3
  child_structure?: unknown // nested Space structure (ADR-006); shape → S3 serializer
}
```

**`@vida/core/src/foundation/templates/types.ts`** (service-local):

```ts
export interface FlaggedMember {
  member: string
  reason: string
} // BR-S1-5 (reason OPEN)
export interface InstantiationResult {
  // BR-S1-5
  status: InstantiationStatus
  seeded: string[]
  flagged: FlaggedMember[]
}
export class TemplateNotFound extends Error {
  // BR-S1-6
  constructor(public readonly templateId: string) {
    super(`No template found for id '${templateId}'`)
    this.name = 'TemplateNotFound'
  }
}
export class TemplateCaptureError extends Error {
  // BR-S1-6 / IR-4
  constructor(public readonly reason: string) {
    super(`Cannot capture template: ${reason}`)
    this.name = 'TemplateCaptureError'
  }
}
```

> S4 (instantiate) MAY extend `InstantiationResult` with a forked-root reference — a deferred S4 contract detail,
> not an S1 hole. `[FACT: slice-map.md S4]`

**`@vida/core/src/validators/template.ts`:** `INSTANTIATION_STATUS` `z.enum` mirror + a `BundleSchema` that
validates the **envelope only** (the 5 members present; open members `z.unknown()`) — deeper member validation is
S3's serializer concern. `[FACT: BR-S1-7 / BR-S1-1]`

## 4. Acceptance

- [ ] `@vida/types/src/template.ts` exports `INSTANTIATION_STATUS`, `InstantiationStatus`, `TemplateBundle` (the
      5-member envelope, members `unknown`); re-exported from `@vida/types` index. (BR-S1-1/3/4)
- [ ] `foundation/templates/types.ts` exports `InstantiationResult`, `FlaggedMember` (reason: string),
      `TemplateNotFound`, `TemplateCaptureError`. (BR-S1-5/6)
- [ ] `validators/template.ts` exports the `z.enum` status mirror + envelope-only `BundleSchema`. (BR-S1-7/1)
- [ ] Vitest: `BundleSchema` accepts a minimal envelope (root_tag + empty views/enabled_blocks/seed_entities) and
      a populated one; **rejects** a bundle missing `root_tag`. (BR-S1-1/2)
- [ ] Vitest: `INSTANTIATION_STATUS` tuple ≡ `z.enum` parity (mirrors `enum-parity.test.ts`). (BR-S1-7)
- [ ] Vitest: `TemplateNotFound`/`TemplateCaptureError` carry `.name` + readonly field. (BR-S1-6)
- [ ] `tsc --noEmit` 0 across `@vida/types` + `@vida/core`; regression floor **893/893** holds (+ new S1 tests).

## 6. Open UNKNOWNs / Decisions Needed

- None blocking. The detailed per-member serialization is deferred to **S3's serializer** (build-time) +
  per-module build for `seed_entities` — a documented boundary (ADR-009:112-115; xcut-templates.md:37), not an
  open decision.

## 7. Change Log

| Date       | Session                 | Change                                                                                                                                                                                                                                       |
| ---------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-19 | 2026-09-19-xs-templates | S1 spec drafted (gate 1)                                                                                                                                                                                                                     |
| 2026-09-19 | 2026-09-19-xs-templates | REVISED — removed invented seed sub-schemas (TagSeed/ViewSeed/SpaceSeed); envelope members now opaque `unknown`, serialization deferred to S3 per ADR-009:112-115 + xcut-templates.md:37. Flagged-reason → open string. (Victor drift-catch) |
