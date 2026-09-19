# xs-spaces-tags-links — Interpretation Layer (Entity Delivery Flow · Step 1)

> Head: **XS-spaces-tags-links** (LIF-175) · leg **xcut-spaces:XCU-SP-27** (the ONLY leg — `[FACT: docs/specs/foundation/backend-intent/decomposition.md:48]`).
> Profile: Add Backend Component · Scenario: Default (Decide-mode for the net-new resolution service; ratifies AR-6 substrate).
> Purpose: make the implicit explicit before decomposing. Every claim carries a `[FACT: path:line]`.

## 0. What this leg IS (verbatim scope)

XCU-SP-27 = the **tag/link unify⇄separate RESOLUTION layer** — *"a single association API/surface over both `entity_tags` + `entity_links`"* `[FACT: docs/core/decisions/ADR-006-spaces-foundation-universal-tags.md:163]`. The behavior:
- **unified** → the OS *"queries, displays, and traverses tags and links together through a single association API/surface — genuinely one association space, computed in the OS, not a display flag"* `[FACT: ADR-006:90-92]`
- **separate** → *"they stay two surfaces"* `[FACT: ADR-006:92-93]`
- the choice is a **real OS behavior, user-owned**; *"the tables are untouched either way"* `[FACT: ADR-006:93-94]`
- SP2 intent: *"the user configures whether tags & links behave as one unified association surface or stay separate, in his experience. Capability underneath, choice on top."* `[FACT: docs/intake/spaces.md:67-71]`

This leg is **SPLIT service | UI** `[FACT: docs/specs/foundation/backend-intent/parts/xcut-spaces.md:47]`:
- **service** (THIS backend head): the unified query derivation over both tables — `foundation/spaces (association-resolution)`.
- **UI** (P6/frontend, NOT here): *"the surface + the user switch"*, home Preferences/Spaces.

## 1. DEPENDENCIES

- **Substrate — AR-6, already built, ratified (no drift).** `[FACT: docs/core/spaces/current-spec.md:5]` `[FACT: git log — foundation/spaces unchanged since 2026-07-29]`
  - `entity_tags(tag_id, entity_type, entity_id)` + idx `idx_entity_tags_entity` on `(entity_type, entity_id)` `[FACT: packages/core/src/db/schema/foundation/spaces.ts:51-61]`
  - `entity_links(page_id, entity_type, entity_id, context)` — **page-anchored source**, polymorphic OPEN target; idx `idx_entity_links_entity` on `(entity_type, entity_id)` `[FACT: spaces.ts:67-79]`
  - `SpacesService` — writes + CRUD only; **no association READ/query method exists** `[FACT: packages/core/src/foundation/spaces/service.ts:38-61]`
  - `TaggableTypeRegistry` governs BOTH tables; `isRegistered()` / unregistered → `UnknownEntityType` `[FACT: packages/core/src/foundation/spaces/registry.ts:15-28]` `[FACT: foundation/spaces/types.ts:37-42]`
- **The §3.3 prerequisite is already satisfied.** Both tables draw `entity_type` from the ONE open registry — *"the OS cannot coherently present tags and links as one surface unless both sides draw from one open registry"* `[FACT: ADR-006:87-89]`; enforced as BR-2/BR-4 `[FACT: docs/core/spaces/current-business-rules.md:9,11]`.
- **No dependency on any other head.** decomposition.md:48 lists deps `—` `[FACT: decomposition.md:48]`.

## 2. NEEDS (what the head must produce)

A **read-composition service over the two tables**, parameterized by `mode: 'unified' | 'separate'`. The mode is a **real behavioral resolution, not a display flag** `[FACT: ADR-006:25-26 "a real behavioral resolution, not a cosmetic"]` `[FACT: ADR-006:90-92 "computed in the OS, not a display flag"]`:
- **unified** → the OS derives **one homogeneous association relation** — each tag-membership and each outbound link normalized into a common edge, returned as a single set (the entity's associations as one space). Each edge keeps its `kind` so the two primitives stay distinct *inside* the one space `[FACT: current-business-rules.md:11 BR-4 — never merged]`.
- **separate** → **two heterogeneous typed relations**, handled independently.

The modes differ in **relation structure**, not container — that is what makes it behavioral, not cosmetic. Reads only; no schema change (*"tables untouched"* `[FACT: ADR-006:93-94]`); reversible (Option-C merged-table REJECTED `[FACT: ADR-006:148-152]`).

## 3. ORGANIZATION (where it lives)

- Home: `packages/core/src/foundation/spaces/` (the association-resolution service) `[FACT: xcut-spaces.md:47 — "foundation/spaces (association-resolution)"]`.
- Composes the AR-6 substrate; adds a read surface alongside the existing `SpacesService` (write surface).

## 4. IMPLICIT RULES (backend deps a mock would hide)

- **IR-1 · Inbound reference resolution is OUT — it is AR-8, a different head.** The `(entity_type, entity_id)` idx is *"the backlink read path AR-8 consumes"* `[FACT: spaces.ts:66]`; *"Backlink resolver service + neural-graph data-prep → AR-8"* `[FACT: current-spec.md:33]`. This head resolves an entity's **own** associations: its tag memberships (`entity_tags` by `(entity_type, entity_id)`) + its **outbound** links (`entity_links` by `page_id`). No "what links here", no graph node/edge prep, no depth-traversal engine. (`traverse` in ADR-006:91 is a *mode semantic* — unified vs separate — not a graph-algorithm mandate.)
- **IR-2 · Soft-delete must be filtered explicitly.** `Repository.findWhere` runs the raw clause and skips the `deleted_at` filter `[FACT: memory repository-findwhere-skips-softdelete-filter]` `[FACT: current-business-rules.md:22 — removes are soft-delete]`; every resolution read must add `isNull(deleted_at)`.
- **IR-3 · Registry validation on reads (BR-2).** An unregistered `entity_type` → `UnknownEntityType`, matching the write path `[FACT: service.ts:76-78]` `[FACT: current-business-rules.md:9]`.
- **IR-4 · M1.0 pass-through — reads return plaintext.** `[E]` fields (`context`) are the M3 target; M1.0 repos carry an empty `[E]` set `[FACT: current-business-rules.md:20]` `[FACT: service.ts:68-69]`.
- **IR-5 · Stateless on the switch.** The persisted toggle + surface are Preferences/Spaces + P6 `[FACT: xcut-spaces.md:47]` `[FACT: ar-6-spaces/_index.md:33 — resolution *surface* deferred]`; `mode` arrives as a parameter. The service reads no preference table.
- **IR-6 · Distinct-primitives invariant holds (BR-4).** The two tables never merge in storage `[FACT: current-business-rules.md:11]` `[FACT: ADR-006:85-86]`; unification is a **read-time derivation**, reversible — the Option-C merged-table was explicitly REJECTED `[FACT: ADR-006:148-152]`. Even inside the `unified` relation each edge keeps its `kind` → no blur, no dedup across kinds (a tag-membership and a link to the same id are distinct associations).
- **IR-7 · The space this head returns is the OUTGOING half — partial by design.** It resolves an entity's tag memberships + its **outbound** links; the **incoming** half (entities linking *to* it) is AR-8's backlink resolver `[FACT: current-spec.md:33]` `[FACT: spaces.ts:66]`. The complete bidirectional association space `[FACT: ADR-006:90-92]` = **this head ⊕ AR-8**. This must be a first-class documented boundary in the seam contract so no consumer treats a result as complete.
- **IR-8 · Query surface boundary.** Entity-centric resolution only. Querying the association space *by filter / by tag / across entities* is the views engine (ADR-007 / `xs-views`) `[FACT: docs/core/spaces/current-spec.md:17]` — not re-implemented here.

## 5. Ratify-vs-Decide sizing

- **Ratify:** all AR-6 tables + `TaggableTypeRegistry` + entity_type validation + soft-delete discipline (built, documented, unchanged).
- **Decide (net-new, this head):** the association-resolution read service. ADR-006 *"does not specify the resolution layer's internals"* `[FACT: ADR-006:129-130]` → the internals are this build-phase design-pass, resolved here grounded in §3.3 + the schema, then gated.
