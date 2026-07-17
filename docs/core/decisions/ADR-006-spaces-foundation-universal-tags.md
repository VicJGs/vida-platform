# ADR-006: Establish Spaces as a foundation tier — universal tagging above every module, with a lightweight `spaces` entity

**Status:** Accepted *(foundation gate PASS + Victor sign-off, 2026-07-15)*
**Date:** 2026-07-15
**Decision Makers:** Victor J.
**Context:** Vida Platform — Spaces (the Personalization & Composability foundation; documenting exec #7). First of the 5-ADR Spaces set (tags → views → blocks → templates → authoring-security).
**Tags:** architecture · data model · extensibility · personalization
**Builds on:** Knowledge KN-A / structure-data (open registry retiring `resource_type` CHECK — the precedent) · Notes & Pages (current owner of `tags`/`page_tags`/`entity_links`, becomes a consumer) · [ADR-002](ADR-002-data-model.md) §2.7 (polymorphic `entity_type`/`entity_id` pattern)
**Amends:** ADR-002 — retires the page-only `tags` + `page_tags` model for a universal `entity_tags`; opens the `entity_links` `entity_type` CHECK enum to a registry; adds the `spaces` and `entity_tags` tables.

---

## 1. Summary

**Spaces** is a new **foundation tier** for personalization and composability: the layer that lets a user assemble
his own module-like surfaces (a "Languages" hub, a "#before-i-die" vision board) out of generic primitives instead
of bespoke per-feature code. This ADR establishes the tier and its first, deepest primitive: **universal tagging**.

A tag stops being page-only and becomes a **universal association** — `entity_tags` links a tag to **any** OS
entity, through an **open registry** of taggable types (no CHECK enum) and a **nestable** hierarchy
(`parent_tag_id`, `#a/b`). A **Space** is a **lightweight first-class entity** (`spaces`) whose membership spine is
a **root tag**. Universalizing tags is precisely what *forces* the new tier: because a Space groups entities from
every module, the tag primitive must sit **below** every module — so **Notes & Pages becomes a consumer** of the
tier rather than its owner (mirrors the journal PAGE-vs-ENGINE split, Journals J1). Tags and links are **distinct
primitives at the storage layer** (grouping vs reference); above them, **the OS resolves them into one unified
association surface — or keeps them separate — on the user's choice** (a real behavioral resolution, not a cosmetic
toggle).

## 2. Context — what triggered this

Documenting Languages (2026-07-13) revealed that a whole "module" dissolves into a **configuration of generic
seams** — a tag-scoped surface + saved views + composed capabilities + an optional template. The real deliverable
is the **foundation that makes that composition possible**. Four primitives were missing; this ADR delivers the
first. `[FACT: docs/intake/spaces.md L1-13, pivot origin]`

**Current enforced reality — the tag primitive is page-only and closed:**
- **Tags attach only to a page.** `tags(name UNIQUE [E], color)` + `page_tags(page_id, tag_id)`; the N&P service
  exposes `upsertTag · tagPage · getPagesByTag` — all page-scoped. You cannot tag a Habit, Goal, Session, or
  Knowledge object. `[FACT: ADR-002 L1374-1402; notes-and-pages/contract.md L17]`
- **`entity_links` is a closed CHECK enum.** It links a page to ~34 entity types via a hard-coded
  `entity_type CHECK(...)` list — note-*linking*, not tagging. `[FACT: ADR-002 L1340-1352]`
- **No universal, cross-module, nestable tag exists.** `[FACT: docs/intake/spaces.md L15-25]`

**The precedent is already in the codebase.** Knowledge retired its closed `resource_type CHECK(...)` for an
**open registry** when it was documented — the identical anti-pattern, the identical fix.
`[FACT: docs/features/knowledge/structure-data.md; task file Knowledge entry]`

**Why a new tier, not a bigger N&P.** N&P (a Wave-0 foundation) currently owns tags + view components. If N&P owned
the *universal* versions, it would depend on the modules that depend on it — a **cycle**. Every downstream module
(Health, Skills, Purposes) needs to tag its own entities and needs the Purposes capstone to **ladder progress up
universal tags** (SP9). The primitive must therefore live **beneath** every module. `[FACT: docs/intake/spaces.md
L41-45, boundary]`

The v2 tag/link code is schema + thin service (no cross-module tag logic), so this is a **structural decision**,
not a data migration of live behavior.

## 3. Decision

**3.1 Spaces is a new foundation tier that sits *beneath* Notes & Pages; N&P becomes a consumer.** Spaces is a
Level-Foundation context, but in the dependency graph it sits **below** Notes & Pages — N&P (and every module)
*depends on* it for the tag/view/block/template primitives, so it is **not a flat sibling**: it is the lower
foundation the others consume. (Manifest re-sequence at Accept must place Spaces before N&P in fill order to reflect
this.) It owns the universal personalization primitives (tags here; views, blocks, templates in ADR-007…010). N&P
keeps *using* tags on pages (the journal/page tag UX is unchanged for the user) but no longer owns the tag
*primitive*. This **closes the standing "N&P tag-scoping: universal vs module-specific" backlog item.**
`[FACT: docs/intake/spaces.md SP1-CONFIRMED, boundary L41-45]`

**3.2 Universal tagging — `entity_tags`.** A tag attaches to **any** entity.
- **Model.** `entity_tags(tag_id, entity_type, entity_id)` — the same polymorphic pattern as `entity_links`
  (ADR-002 §2.7 / DATA-3), applied to grouping. Retire `page_tags`; its rows become `entity_tags` with
  `entity_type = 'page'`.
- **Open registration (no CHECK enum).** Taggable entity types are a **registry**, not a hard-coded SQL CHECK —
  the same call Knowledge made retiring `resource_type`. A new module's entities become taggable by registering,
  not by an ADR-002 schema edit. `[FACT: intake SP2(a), likely-OPEN → confirmed]`
- **Nestable.** `parent_tag_id` gives a hierarchy (`#languages ⊃ #languages/spanish`) — nesting is *how* Spaces
  sub-group. `[FACT: intake SP2(b)]`
- **Metadata.** A tag row carries `name [E]`, `color`, `icon`, `description [E]`. (Name/description are user
  content → encrypted per EN-2.)
- **Syncable.** `entity_tags` is a syncable table → carries the `_sync_*` metadata + `deleted_at` soft-delete per
  DATA-4 (orphan-tag cleanup rides the same soft-delete discipline as `entity_links`).

**3.3 Distinct primitives at the storage layer; the OS *resolves* them into one association surface on the user's
choice.** Two things are separate: the storage (always two tables) and the resolution (unify or separate, the user's
switch).
- **Storage — two open primitives.** `entity_tags` = **grouping / membership** (an entity belongs to a set);
  `entity_links` = **typed reference** (an entity points at another). The tables never merge. Crucially,
  `entity_links`'s `entity_type` CHECK enum is **opened to the same registry** as `entity_tags` (3.2) — **this is a
  prerequisite of the resolve below, not a side-change:** the OS cannot coherently present tags and links as one
  surface unless both sides draw from one open registry of entity types.
- **Resolution — a real OS behavior, user-owned.** The OS exposes a **resolution layer over both tables**. When the
  user chooses *unified*, the OS queries, displays, and traverses tags and links **together through a single
  association API/surface** — genuinely one association space, computed in the OS, not a display flag. When the user
  chooses *separate*, they stay two surfaces. The user owns the switch (home: Preferences/Spaces); the tables are
  untouched either way. **Capability (two distinct primitives) underneath, resolution (unify ⇄ separate) on top,
  user owns the switch.** `[FACT: intake SP2 — "the user will choose how he wants them to interact, if he wants them
  to be one or if not"]`

**3.4 A Space is a lightweight first-class entity — `spaces`.** So a Space is nav-addressable and nestable, not a
purely emergent "just a tag." A `spaces` row binds:
`{ id · root_tag_id (→ entity_tags membership spine) · name [E] · icon · default_view_id? (→ ADR-007) ·
enabled_blocks (→ its offered-capability set, ADR-008) · parent_space_id? }`. A Space nests two ways that agree: by
tag hierarchy (3.2) and by `parent_space_id`. Its *contents* are emergent (everything carrying the root tag); its
*identity, name, and enabled tooling* are the record. `spaces` is syncable → carries `_sync_*` + `deleted_at` per
DATA-4. `[FACT: intake SP6-CONFIRMED]`

**`enabled_blocks` — the Space's offered-capability palette (O2 resolved, F3/D3).** `enabled_blocks` is *which
capabilities from the one registry (ADR-008) this Space offers as tools* — the "enabled tooling" of the record above,
and a first-class constituent of a Space (`[FACT: intake SP6 — "a Space = { root tag · Views · its enabled Blocks
(tools) · name }"]`). It is **stored authored configuration**, carried into a Space by a Template (ADR-009's "enabled
capabilities + their config" is this same set — one concept, two names), **not** a query-time projection over placed
instances: a forked template Space persists the set with **zero** placements, so nothing derived from placements can
reconstruct it. It holds a **set of capability *definition* refs** (the registrable unit, ADR-008 §3.1; `kind` is
queryable metadata, not the ref granularity). It is **distinct from ADR-008's `block_instances`** — `enabled_blocks`
is the *menu* (what the Space offers), `block_instances` are the *placements* (widgets actually placed). Membership is
**render-target-agnostic** (an offered definition may support `inline`, `standalone`, or both — the user picks the
form per instance, ADR-008 §3.2); its **teeth split by surface**: it is the enforced add-menu for the Space's
**standalone** surface, while for **inline** it contributes additively to a page's slash-menu (union with the global
editor base — a page can belong to several Spaces, so inline is non-restrictive). **Storage:** a set of refs is best
carried **row-based** (a Space↔capability-def junction) for the same sync-robustness reason 3.3 stores `entity_tags`
as rows — rows survive concurrent multi-device edits where a JSON-array column would field-LWW-clobber one device's
change; the exact sync/storage strategy for Spaces' ordered fields settles with the sync work (F10), and the DDL is a
build-phase ADR-002 amendment (recorded in the durable owed-tables ledger, **ADR-002 §5.20**; F4-body/D5).

**3.5 Personalization never breaks zero-knowledge (framing; enforced in ADR-010 + business-rules).** Tag names and
descriptions are user content and encrypt (EN-2). This tier introduces *no* server-visible plaintext and *no*
sharing (SU-1 holds). The full personalization-within-ZK invariant is written into `core/business-rules.md` at
Accept and enforced for user-authored capabilities by ADR-010. `[FACT: intake SP8/SP9-CONFIRMED]`

**What this decision does NOT do:** it locks that the unify ⇄ separate **resolution** exists and is user-owned, but
does not specify the resolution layer's internals or its surface (build-time design-pass); it does not build views,
blocks, or templates (ADR-007…010); it does not specify a live data migration (the v2 model is schema-only, so this
is a schema decision recorded as an ADR-002 amendment).

## 4. Options Considered

### Option A — Universal `entity_tags` (open-registry, nestable) as a new foundation tier; N&P a consumer (CHOSEN)
- **Rationale:** one grouping primitive above every module makes cross-module Spaces possible; the open registry
  and `parent_tag_id` match the choices Knowledge and the Space-nesting model already require; keeping tags vs
  links distinct preserves both meanings while the *user* decides how they compose. Breaks no dependency cycle.
- **Tradeoffs accepted:** a polymorphic table (no per-type FK integrity — mitigated by the registry + the same
  discipline `entity_links` already lives under); one more foundation context to maintain.

### Option B — Keep page-only tags; add per-module tag tables where needed (REJECTED)
- **Why rejected:** every module re-implements tagging; there is **no cross-module set** for a Space to group by;
  it reproduces exactly the per-feature "Hub" sprawl that v1 failed with (`LanguageHubPage`, one bespoke page per
  module). `[FACT: intake L55-58, legacy]`

### Option C — Merge tags and links into one polymorphic association table (REJECTED)
- **Why rejected:** grouping ("belongs to #spanish") and reference ("this note cites that book") are genuinely
  different relations; collapsing them at the schema level **removes the user's SP2 choice** and forces one
  interpretation on everyone. Distinct primitives + a user-configurable **resolution layer** (§3.3) give the
  *option* to unify — computed in the OS, reversible — without hard-coding the merge into storage.

## 5. Consequences

**Easier:**
- Any entity in any module is taggable; a Space is "everything under a root tag" — cross-module by construction.
- The Purposes capstone can ladder progress up universal tags (SP9); the Global Calendar / dictionary become saved
  views over tag filters (ADR-007) instead of bespoke aggregators.
- New modules add taggable entities by registering a type — no core schema change.

**Harder:**
- The unify ⇄ separate **resolution layer** (§3.3) is real work: a single association API/surface over both tables
  plus the user switch — to design and support (build-time), not a display flag.
- A polymorphic grouping table has no referential integrity to each target; orphan-tag cleanup rides the same
  soft-delete discipline as `entity_links`.

**Explicitly accepted tradeoffs:**
- Retiring the shipped `page_tags` model (schema-only) and opening two CHECK enums, in exchange for one universal
  grouping primitive and the tier that makes Spaces possible.

## 6. Review Date / trigger
Reconsider when the **first non-page consumer** is built (e.g. tagging Health workouts or Skills nodes) — it is the
real test that the open registry + polymorphic model serve a module that is not Notes & Pages. If a consumer needs
per-type integrity the registry cannot give, revisit the polymorphic choice (3.2).
