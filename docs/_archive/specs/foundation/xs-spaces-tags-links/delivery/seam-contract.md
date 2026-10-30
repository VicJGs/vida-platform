# xs-spaces-tags-links — Seam Contract (the API P6/consumers depend on)

> The service surface the resolution UI (P6) and every module consume. Stable shape; the switch (`mode`) is supplied by the caller (IR-5).

```ts
// TaggableRef — an entity in the OPEN taggable/linkable registry (SP2). entityType validated (BR-2).
// NOT named `EntityRef`: foundation/measurement already owns an `EntityRef` ({type,id}, ADR-011);
// this head has no measurement dependency (decomposition.md:48), so it keeps the spaces vocabulary
// (entity_type/entity_id) under a distinct name rather than forge a cross-foundation type coupling.
export interface TaggableRef {
  entityType: string
  entityId: string
}

export type AssociationMode = 'unified' | 'separate'

// A tag membership this entity carries (from entity_tags).
export interface TagAssociation {
  kind: 'tag'
  tagId: string
}

// An outbound typed reference this entity (a page) authored (from entity_links).
export interface LinkAssociation {
  kind: 'link'
  target: TaggableRef // the entity the page links TO
  context: string | null // [E] snippet — plaintext in M1.0 (IR-4)
}

export type Association = TagAssociation | LinkAssociation

// mode = the behavioral resolution (ADR-006:90-92), NOT a shape toggle on one dataset:
//  unified  → ONE homogeneous relation the OS derives (each edge normalized, keeps its `kind`)
//  separate → TWO heterogeneous typed relations, operated on independently
// Each unified edge retains `kind` → the two primitives stay distinct inside the one space (BR-4).
export type AssociationResult =
  | { mode: 'unified'; associations: Association[] } // one association space (ADR-006:90-92)
  | { mode: 'separate'; tags: TagAssociation[]; links: LinkAssociation[] } // two surfaces (ADR-006:92-93)

export interface AssociationResolver {
  /** Resolve an entity's OUTGOING associations (its tag memberships + its outbound
   *  links) as one association space (unified) or two (separate). Reads only;
   *  tables untouched. Throws UnknownEntityType if ref.entityType is unregistered (BR-2). */
  resolveAssociations(ref: TaggableRef, mode: AssociationMode): Promise<AssociationResult>
}
```

**Boundary notes (grounded — read before consuming):**

- **PARTIAL BY DESIGN — outgoing half only.** `links` are **outbound only** (`entity_links.page_id = ref.entityId`). The **incoming** half ("what links here") is **AR-8 / `xs-backlinks-search-export`** (`current-spec.md:33`, `spaces.ts:66`), never returned here. The **complete bidirectional association space** = **this resolver ⊕ AR-8's backlink resolver**; a consumer needing the full space MUST compose both. Do not read an `AssociationResult` as an entity's _complete_ associations.
- A non-page entity has no rows in `entity_links` (page-anchored source, `spaces.ts:71`) → its `links` are `[]`; its `tags` still resolve. Direct consequence of the schema + the outgoing-only boundary above.
- **Query boundary:** this API is entity-centric. Querying the association space _by filter / tag / across entities_ is the views engine (ADR-007 / `xs-views`, `current-spec.md:17`), not this resolver.
- `mode` is caller-supplied; the service holds no switch state (the persisted toggle + surface are Preferences/Spaces + P6 — IR-5).
