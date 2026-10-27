# foundation/templates — substrate (ADR-009)

# Auto-read by Claude when editing this layer.

## What this substrate is

Templates as portable seed bundles, fork-on-instantiate (deep copy, no live link).

## Owning ADR

ADR-009 (contract lives under `docs/core/spaces/current-*` — no `docs/core/templates/`).

## Capabilities (framework §3)

T1 T2 T3 T4 T5

## Status (XS-templates #36, LIF-176 — 2026-09-19)

BUILT (consumer-independent):

- `service.ts` — `TemplatesService` store CRUD (create/list/get/soft-delete; NO update — fork model, XCU-01)
  over the DB-6 Repository; empty `[E]` set (M1.0 pass-through, XCU-09).
- `types.ts` + `@vida/types/template.ts` — `TemplateBundle` 5-member envelope (members opaque — serialization is
  build-time per ADR-009:112-115), `INSTANTIATION_STATUS`, `InstantiationResult`/`FlaggedMember`, typed errors.
- `validators/template.ts` — envelope-only `BundleSchema` + `InstantiationStatusSchema`.

FIRST-CONSUMER-PULL SEAMS (NOT built here — no M1.1 consumer; pulled by the first _module_ that saves-as-template
/ instantiates; ADR-019 §3.5): `captureFromSpace` + authored-vs-accumulated invariant (XCU-02/03/04/07-serializer),
`instantiate`-fork execution + partial-failure derivation (XCU-05/11), `listShipped` asset-source (XCU-08), the
preset primitive (XCU-12/13, tab = P6). ADR-009 invariants (T2/T3/T5) are LOCKED; enforce when the seam is built.
Do NOT add sibling-service (Spaces/Views) reads speculatively — capture pulls them when its first module lands.

## Tests

`__tests__/types.test.ts` (envelope/status-parity/errors) · `__tests__/service.test.ts` (live-store CRUD/sync_queue).
