# xs-templates — Slice Map (Entity Re-scope recovery, Step 5)  ·  CORRECTED 2026-09-19

> Turns the Reconciliation ledger (`reconciliation.md` §E, corrected) into the scoped plan. **CORRECTION
> (Victor drift-catch):** capture / instantiate-execution / shipped-asset-source / preset are **first-consumer-pull
> seams** (decomposition.md:49 read-seams "—"; capability-framework.md:239 template-capable = *modules*, none at
> M1.1; ADR-019 §3.5). The only consumer-independent build at #36 is the store substrate's **types + CRUD** (both
> done). No sibling-service (#34/#35) changes. Single-plane (Envision Gate SKIPPED — pure backend).

## Ratified (no slice — built + gated)
- **XCU-06** fork-invariant (no `template_id` FK) · **XCU-09** name/bundle `[E]` M1.0 pass-through · **XCU-SP-31**
  umbrella · the `templates` table + migration 011. `[reconciliation.md §A/§E]`

## Built slices (consumer-independent — the store substrate's own types + access layer)

### S1 — Types, terminal-states & errors  ·  BACKEND  ·  ✅ DONE
- Legs: XCU-07 (bundle ENVELOPE only), XCU-10 (terminal-state TYPE). `@vida/types/template.ts`
  (`TemplateBundle` 5-member envelope, `INSTANTIATION_STATUS`) + `foundation/templates/types.ts`
  (`InstantiationResult`, `TemplateNotFound`, `TemplateCaptureError`) + `validators/template.ts`. Gate PASS (901).

### S2 — Store CRUD (`TemplatesService`)  ·  BACKEND  ·  ✅ DONE
- Legs: XCU-01 (create/list/get/soft-delete), XCU-09 (`[E]` pass-through). `foundation/templates/service.ts`
  over the DB-6 Repository; no `update` (fork model). Live-store Gate PASS (907).

## First-consumer-pull SEAMS (documented, 0 code at #36 — pulled by the first *module* consumer)

> Each is a seam by the #36-position invariant (`interpretation.md` §0) + `decomposition.md:49` read-seams "—".
> A later reader must NOT reopen these as "missing code" — they have no M1.1 consumer by topological construction.

- **CAPTURE seam** — XCU-02 (`captureFromSpace` transform) + XCU-03/04 (authored-vs-accumulated invariant,
  enforced AT capture-time, T3) + XCU-07 (detailed serializer). Pulled when the first module "saves a Space as a
  template" (T1 applies-to = Languages/Health/Skills/Routines/Duties/Bucket List). The invariant rides the
  transform (it must inspect concrete member shapes → the serializer). The rule is LOCKED in ADR-009:73-83 +
  `TemplateCaptureError` (S1) is its typed failure. `[FACT: capability-framework.md:135; xcut-templates.md:37,54]`
- **INSTANTIATE seam** — XCU-05 (fork execution: deep-copy into fresh module entities via writers that don't
  exist) + XCU-11 (partial-failure derivation). Pulled by the first module instantiate. `InstantiationResult` +
  `INSTANTIATION_STATUS` (S1) are its declared contract. The write-seam registry is authored WITH this pull, not
  speculatively now. `[FACT: interpretation.md §0; decomposition.md:49; ADR-019 §3.5]`
- **SHIPPED-ASSET seam** — XCU-08 (`listShipped` asset provider). Curated Templates ship as bundled assets WITH
  their module; none at M1.1 → the asset source + format resolve with the first shipped preset. `[FACT: ADR-009:66-71; capability-framework.md:239]`
- **PRESET seam** — XCU-12/13 (preset = saved View + per-type defaults + module discriminator; tab = P6). T4
  applies-to "modules with a type discriminator (Tasks/Duties)"; none at #36 → pulled by that module. `[FACT: capability-framework.md:136 T4; ADR-009:100-106]`

## §6 Gate plan
- Built slices S1/S2: each ran §XXVI double-gate + a per-slice Verification Gate (PASS).
- Seams: no gate owed at #36 (0 code); each is gated when its owning module pulls it (that module's build).
- Head close: Step 7 `/critique` changed files → SHIP · Step 8 §XXIX (refresh `docs/core/spaces/current-*` for the
  templates store + types delta) · regression floor **907** holds.

## Re-scope Gate — RE-APPROVAL REQUESTED (corrected shape)
**Shape: 3 ratify + 2 built slices (S1 ✅ · S2 ✅) + 4 documented first-consumer-pull seams (capture · instantiate ·
shipped-asset · preset). No S3/S4/S5 code; no sibling-service changes.** The head's code is complete after S1+S2;
what remains is Step 7 (`/critique`) + Step 8 (§XXIX currency) + close. Requesting approval of the corrected scope.
