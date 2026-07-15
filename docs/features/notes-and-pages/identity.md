<!-- Identity — features/notes-and-pages · /documentation Phase 2 · sources: CLAUDE.md §8 · ADR-002 §5.2 · @vida/types/note.ts · docs/intake/notes-and-pages.md -->

# Identity — Notes & Pages  (level: Feature)

**What it is.** The platform's **unifying integration layer**: a single polymorphic `pages` table plus its linking, tagging, and attachment satellites, rendered through a TipTap block editor. (⚠ The `pomodoro_sessions` timer, a v2 Notes satellite, **re-homes to the Sessions realm** — reframe 2026-07-15; the `/pomodoro` block stays as a **widget-lens** onto focus sessions. `[[../pomodoro/identity]]`) It is the daily dashboard (journals) and the connective tissue (`[[wiki-links]]`, entity links, neural graph) that ties every other module together. `[FACT: CLAUDE.md §8 "Notes & Journals (Integration Layer)"; ADR-002 §5.2 L1266-1268]`

**The desire behind it.** Every module produces dated, linkable knowledge; without one place to aggregate and cross-reference it, the platform is 17 disconnected silos. Notes & Pages exists so the user has a single daily surface (the journal `/summary`) and a single web of meaning (`[[links]]` + backlinks + graph) over all their life data — "this is NOT just another module, it is the unifying layer." `[FACT: CLAUDE.md §8; INTENT: Victor 2026-06-18]`

**Scope — full v1 (NOT an MVP; nothing deferred).** `[INTENT: Victor 2026-06-18, gap G1]`
- **All 6 page types:** `journal` · `note` · `task_note` · `task_group_note` · `milestone_note` · `deliverable_note`. `[FACT: note.ts PageType; ADR-002 L1274-1277]`
- **All 12 platform blocks:** `/summary` `/tasks` `/events` `/classes` `/habits` `/timeline` `/chart` `/pomodoro` `/entity-link` `/backlink` `/class-notes` `/milestone` (plus all standard blocks: paragraph, headings, lists, blockquote, code, divider, image, table, callout). `[FACT: CLAUDE.md §8 "Block Editor"]`
- **4 views:** Calendar · List · Gallery · Neural Graph (per type — see structure-data.md). `[FACT: CLAUDE.md §8; INTENT G3]`

**What it is NOT.**
- **Not collaborative.** Single-user, multi-device only — no shared/real-time multi-author editing. `[FACT: CLAUDE.md "Core Privacy Model"; business-rules ZK/LF]`
- **Not server-aware.** The server never sees page content; all rendering, search, summary aggregation, and the entity-note seed happen client-side (zero-knowledge). `[FACT: business-rules ZK-1]`
- **Not an open page-type system.** Only the 6 enumerated `type` values exist; new page kinds require a schema/enum change, not free-form types. `[FACT: ADR-002 CHECK constraint L1274-1277]`
- **Not a slug-based wiki.** v2 dropped v1's `slug`; links resolve by `target_page_id`, never by URL slug. `[FACT: ADR-002 page_links; intake delta #2; INTENT G2]`
- **Not a static-template journal.** The journal is built from a **live** `/summary` block that re-aggregates on open, not a frozen copy stamped per day. `[INTENT G7; intake delta #5]` ⚠ **Refined by Journals JR-6 (2026-07-12):** live applies to **today**; a **past** day shows the point-in-time **snapshot** of that day (+ optional live comparative). The aggregation ENGINE behind this block is the Journals context. `[[../journals/business-rules]]`
- **Not the home of component specs.** The TipTap editor and shared UI widgets are documented at the **components level** (`docs/editor/`, `docs/ui/`), not in this feature. `[FACT: docs/README.md manifest, Components level]`

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim has [FACT/INTENT: src] · [x] no `{{…}}` remaining
