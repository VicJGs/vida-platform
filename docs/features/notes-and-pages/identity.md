<!-- Identity — features/notes-and-pages · /documentation Phase 2 · sources: CLAUDE.md §8 · ADR-002 §5.2 · ADR-004 · ADR-008 · @vida/types/note.ts -->
<!-- Restored 2026-10-26 (notes-rescope LIF-245, Documentation Gate) from eaf64f8^ — deleted by the MOD-notes teardown
     (eaf64f8, 2026-09-13) and never restored though docs/features/README.md:36 lists it. Realigned to ADR-004/006/008/021
     + the as-built code (docs/modules/notes/current-*). backend-intent NOT-* line cites refer to the eaf64f8^ text. -->

# Identity — Notes & Pages (level: Feature)

**What it is.** The platform's **unifying integration layer**: a single polymorphic `pages` table plus its page-link and
attachment satellites, rendered through the TipTap block editor (`@vida/editor`). It is the daily surface (the journal)
and the connective tissue (`[[wiki-links]]`, entity links, backlinks, neural graph) that ties every other module
together. Tags and entity links are the **Spaces substrate** (ADR-006 — N&P consumes them); the `/pomodoro` timer is a
**Sessions** lens. `[FACT: CLAUDE.md §8; ADR-002 §5.2 L1292; ADR-006 §3.1 (L59); ADR-004 §3.1 (L50); sessions-and-scheduling/identity.md:66]`

**The desire behind it.** Every module produces dated, linkable knowledge; without one place to aggregate and
cross-reference it, the platform is 17 disconnected silos. Notes & Pages exists so the user has a single daily surface
and a single web of meaning (`[[links]]` + backlinks + graph) over all their life data — "this is NOT just another
module, it is the unifying layer." `[FACT: CLAUDE.md §8; INTENT: Victor 2026-06-18]`

**Scope — full v1 (NOT an MVP; nothing deferred by intent).** `[INTENT: Victor 2026-06-18, gap G1]`

- **All 6 page types, all editor-led:** `journal` · `note` · `task_note` · `task_group_note` · `milestone_note` ·
  `deliverable_note`. `[FACT: packages/types/src/note.ts:23-29]` Every page type opens with the editor facet.
- **Integration blocks = the ADR-008 open capability registry**, not a closed list. The 12 v1 blocks (`/summary`
  `/tasks` `/events` `/classes` `/habits` `/timeline` `/chart` `/pomodoro` `/entity-link` `/backlink` `/class-notes`
  `/milestone`) are the shipped seed of that registry; inline instances live inside the page document
  (ADR-008 L120-124); the inline palette offers the union of the page's Spaces' capabilities + the editor base
  (CAP-13, ADR-008 L134-137), plus all standard blocks. `[FACT: ADR-008 §3.1; CLAUDE.md §8 "Block Editor"]`
- **4 collection views:** Calendar · List · Gallery · Neural Graph, available per type (see structure-data.md).
  `[FACT: CLAUDE.md §8; INTENT G3]`

**What it is NOT.**

- **Not collaborative.** Single-user, multi-device only. `[FACT: CLAUDE.md "Core Privacy Model"]`
- **Not server-aware.** The server never sees page content; rendering, search, summary aggregation and the entity-note
  seed happen client-side (zero-knowledge). `[FACT: core business-rules ZK-1]`
- **Not an open page-type system.** Only the 6 `PAGE_TYPE` values exist (fixed SQL CHECK); new page kinds need a
  schema change. (Contrast: `entity_type` IS open — the ADR-006 registry.) `[FACT: note.ts:23-29; migrations/033_notes.ts:42]`
- **Not a slug-based wiki.** Links resolve by `target_page_id`, never by URL slug or title text. `[FACT: NP-7; INTENT G2]`
- **Not the summary engine.** The `/summary` aggregation ENGINE is the Journals context (`buildDashboard`); N&P owns
  only `summary_config` storage + the block. Live applies to **today**; a past day shows its snapshot (Journals JR-6).
  `[FACT: backend-intent NOT-32; ADR-021; [[../journals/business-rules]]]`
- **Not the owner of tags, entity links, views, templates or capabilities** — those are Spaces foundation primitives
  (ADR-006/007/009/008) that N&P consumes. `[FACT: ADR-006 §3.1]`
- **Not the home of component specs.** The editor and shared UI widgets are documented at the components level
  (`docs/editor/`, `docs/ui/`). `[FACT: docs/README.md manifest, Components level]`

## Completion checklist

- [x] "what it is" + "desire" + "what it is NOT" · [x] each claim [FACT/INTENT: src] · [x] realigned to ADR-004/006/008/021
