# xs-spaces-tags-links — Slice Map (Entity Delivery Flow · Step 2)

> One leg (XCU-SP-27), SPLIT service | UI `[FACT: parts/xcut-spaces.md:47]`. The service half is this head; the UI half is routed to P6.

| Slice | Tag | Scope | In this head? |
|-------|-----|-------|---------------|
| **S1 — AssociationResolver** | backend | The read-composition service over `entity_tags` + `entity_links`: `resolveAssociations(ref, mode)` → unified (one merged `Association[]`) or separate (`{ tags, links }`). Reads only; soft-delete-filtered; registry-validated. | ✅ **BUILD** |
| SP27-UI — resolution surface + user switch | frontend | The presented surface + the persisted unify⇄separate toggle (home: Preferences/Spaces). | ⛔ **ROUTED → P6** `[FACT: xcut-spaces.md:47]` · `[FACT: ar-6-spaces/_index.md:33 — resolution *surface* deferred]` |
| (backlink resolver · neural-graph · inbound refs) | — | Inbound reference resolution + graph node/edge prep. | ⛔ **NOT THIS HEAD → AR-8 / xs-backlinks-search-export** `[FACT: current-spec.md:33]` · `[FACT: spaces.ts:66]` |

**Composition boundary (INV-7).** S1 delivers the **outgoing** association adjacency (tags + outbound links). The **complete** bidirectional association space of `[FACT: ADR-006:90-92]` = **S1 ⊕ AR-8** (inbound backlinks). This head is one operand of that composition, not the whole space — a documented boundary, surfaced so no consumer reads S1's result as complete.

**Single backend slice** → the entity front matter collapses to one Verification-Gate iteration (Steps 3–11 run once). No frontend/shared slice yields a user-visible affordance in this head → Envision Gate N/A (stated, not skipped).

## Intent coverage (the one leg, fully homed)

| Intent (XCU-SP-27) | Home |
|--------------------|------|
| single association API over both tables | S1 (`resolveAssociations`) |
| unified = one association space, OS-computed | S1 unified branch `[FACT: ADR-006:90-92]` |
| separate = two surfaces | S1 separate branch `[FACT: ADR-006:92-93]` |
| tables untouched (read-time derivation, reversible) | S1 reads only; Option-C merge REJECTED `[FACT: ADR-006:93-94,148-152]` |
| user owns the switch | `mode` parameter (IR-5); toggle storage + UI → P6 |
