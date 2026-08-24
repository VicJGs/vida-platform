<!-- Entity Delivery Flow · Step 0 (INTAKE) · Notes & Pages · base flow (§3) · ground-zero rebuild.
     Purpose: an EXHAUSTIVE, tagged index of every source that feeds the rebuild — for review + source
     organization BEFORE the Baseline (Step 1) reads deeply. This file asserts a source SET, not a design.
     Method: 3 parallel read-only Explore sweeps (docs / packages / apps+config+.claude), 2026-08-23,
     reconciled against direct on-disk checks. Governed by the No-Guessing Principle. -->

# Intake — Notes & Pages (whole-entity source organization)

**Flow:** Entity Delivery Flow — **base flow (§3)**, ground-zero rebuild (NOT the recovery variant §10).
**Branch:** `mod-notes-rebuild` (off `main` @ `d478341`). **Task:** LIF-131 / MOD-notes.
**Directive (Victor):** rebuild from ground zero — *do not derive from the built-then-removed ①/②*; the
`current-*` docs are residue, not intent.

## 0. How to read this — tag legend

| Tag | Meaning | Consumed at |
|-----|---------|-------------|
| **INTENT AUTHORITY** | the design yardstick the Documentation Gate gates | Baseline → Interpretation → all downstream |
| **KEPT SUBSTRATE** | ground-zero survivors on disk (`[FACT]`) — schema/types/validators | Baseline; the tracks build ON these |
| **GOVERNING ADR** | cross-cutting constitution the entity must obey | Interpretation (IMPLICIT RULES), Decomposition |
| **DELIVERY/SCOPE** | what/how-much/ordering this entity ships | Decomposition (mode + slice cover) |
| **CONSUMED SEAM** | already-built service/surface the entity composes (do NOT rebuild) | Interpretation (ORGANIZATION: OWNS/CONSUMES/DELEGATES) |
| **⚠ RESIDUE** | built-then-removed ①/② — **excluded from derivation**; regenerated later by §XXIX | never as intent |
| **METHODOLOGY** | the flow being run | — |

---

## 1. Source groups (tagged)

### A · INTENT AUTHORITY — the 5 canonical aspect docs (`docs/features/notes-and-pages/`)
| File | Covers |
|------|--------|
| `identity.md` | hub role · 6 page types · 12 platform blocks · 4 views · in-degree 14 |
| `business-rules.md` | NP-1…NP-9 · terminal states · failure behavior · ZK/LF constitution inheritance |
| `contract.md` | the entity contract (service factory shape, methods, Row returns, error signatures) |
| `structure-data.md` | as-is FACT floor (owned tables) + `[INTENT]` retirements (ADR-006/004/007) + state/route map |
| `conventions.md` | editor integration · page-type taxonomy · entity-note seeding rules · polymorphic pattern |

> These 5 are the sole design authority. The Documentation Gate (Step 1.25) gates THIS corpus + the baseline.

### B · KEPT SUBSTRATE — ground-zero survivors (`[FACT: exists]`)
**Schema — OWNED (`packages/core/src/db/schema/notes.ts`, ~110 L; migration `012_notes.ts`):**
- `pages` — polymorphic 6-type hub. Cols: `...baseColumns`, `type`(FIXED CHECK PAGE_TYPE, default `note`),
  `title`[E], `content`[E] (TipTap JSON, Yjs-CRDT synced), `parent_id`(self-ref, no FK), `entity_type`(OPEN,
  registry-validated, no CHECK), `entity_id`, `journal_date`(YYYY-MM-DD, journal only), `is_favorite`,
  `is_archived`, `icon`, `cover_image`[E], `summary_config`[E] (plain TEXT JSON), `has_pomodoro`, `word_count`,
  `deleted_at`. Idx: type · journal_date · entity · deleted · **partial-UNIQUE journal_date** (SQL-only, NP-2).
- `page_links` — wiki page↔page. Cols: `...baseColumns`, `source_page_id`(no FK), `target_page_id`(no FK),
  `context`[E], `deleted_at`. Idx: target. Constraint: UNIQUE(source,target) (SQL-only).
- `note_attachments` — encrypted files. Cols: `...baseColumns`, `page_id`(no FK), `filename`[E],
  `mime_type`, `encrypted_blob`[E], `thumbnail_blob`[E], `size_bytes`, `deleted_at`. Idx: page.
- Row types: `PageRow`/`PageInsert` · `PageLinkRow`/`PageLinkInsert` · `NoteAttachmentRow`/`NoteAttachmentInsert`.

**Schema — CONSUMED (AR-6-owned, `schema/foundation/spaces.ts`):** `entity_links` (page-anchored cross-entity
ref: `page_id`, `entity_type` OPEN, `entity_id`, `context`[E]; idx on (entity_type,entity_id)) · `entity_tags`
(universal tag assoc: `tag_id`, `entity_type` OPEN, `entity_id`). **Notes does NOT own these** — see Group E.

**Types (`packages/types/src/note.ts`, 172 L):** enums `PAGE_TYPE`(6) · `ENTITY_LINK_TARGET`(~58, incl
`knowledge_note`) · `POMODORO_TYPE`/`POMODORO_STATUS`/`POMODORO_ENTITY_TYPE`. Interfaces `Page` · `PageLink` ·
`EntityLink` · `Tag` · `PageTag` · `NoteAttachment` · `PomodoroSession` · `JournalSummaryConfig`. Barrel:
`types/src/index.ts:13 export * from './note'`. Editor block attrs in `types/src/editor.ts` (`entityLink`,
`backlink` in `INTEGRATION_BLOCK_TYPE`; `EntityLinkBlockAttrs`).
> ⚠ `packages/types/src/notes.ts` (plural) is an **EMPTY 0-line stub** — NOT a source. All types live in `note.ts` (singular).

**Validators (`packages/core/src/validators/note.ts`, DB-9, kept):** `PageTypeSchema` +
`EntityLinkTargetSchema` + 3 Pomodoro enum schemas; `createPageSchema` (journal_date required iff
`type='journal'`) · `updatePageSchema` (`.strict()`).

### C · GOVERNING ADRs
| ADR | Section | Bearing on Notes |
|-----|---------|------------------|
| **ADR-002** Data Model | §5.2 (+ §2.7 no-inline-notes; FTS5 `fts_pages`) | authoritative table def; polymorphic entity-note pattern |
| **ADR-006** Spaces / Universal Tags | §3.1–3.3 | Spaces sits BENEATH Notes; Notes is a **consumer** of `entity_tags`/registry (owned `tags`/`page_tags` RETIRED); open taggable-type registry (SP2) |
| **ADR-004** Session Framework | §3.1 | `pomodoro_sessions` → `focus_sessions` extension; `/pomodoro` block is a widget-lens, not Notes-owned timer |
| **ADR-007** Saved Views | — | List/Calendar/Gallery/Neural selectable via `views` row (Notes consumes; selection deferred design-pass) |
| **ADR-003** Sync Protocol | — | `pages.content` = the only Yjs-CRDT column; rest LWW; `note_attachments` via attachment pipeline |
| **ADR-001** Tech Stack | — | export (md/PDF/DOCX) for notes/journals |
| **ADR-008** Capability/Block Registry | — | editor inline blocks (`entityLink`/`backlink`) resolve via the registry; MOD-notes wires it at app-mount |

### D · DELIVERY / SCOPE
- **`docs/roadmap/m1.1-delivery-plan.md` §9 + row #105** — the deferred-to-build ledger. ① service scope
  (page CRUD 6 types + `JournalExistsError` NP-2 · page_links/entity_links idempotent NP-5/7 · `resolveWikiLink`
  + create-on-miss · entity-note auto-seed NP-8 · `/summary` today 5-section · open `entity_type` registry SP2 ·
  `entity_tags` reads · AR-8 backlink consume) and ② UI scope (TipTap mount + 12 blocks · List/Calendar/Gallery/
  Neural hard-coded renderers · `[[` picker + create-on-miss · backlink/entity-link panels · page metadata ·
  FTS5 search UI). Deferred: `[E]` wiring → M3/DB-5 · wider `/summary` menu → M1.4 (G5) · saved-view selection → design-pass.
  ✅ **The split is DOC-FIXED** (`m1.1-delivery-plan.md §2` — every `MOD-*` = 2 gated increments ① backend ⊕ ② UI;
  row #105 profile chain `add-backend-component → add-frontend-component`). Decomposition (Step 2) runs in **Ratify
  mode**: it records the fixed ①/② plane split and details the finer within-track slices under each track's own §XXVI
  gate (§9 grain note). The old `②a–②e` lettering was recovery-era **residue** (from the removed `current-spec.md:9`) — dead; not resurrected.
- **`reconstructed-structure.md`** — MOD-notes = `#31`, M1.1 head; deps `{DB-6, DB-9, AR-6}` ✅.
- **`docs/specs/foundation/realignment-master-plan/part-1.2-reruns/notes-and-pages.md`** — the realignment rerun (① + ② scope).
- **`docs/specs/foundation/db-4-notes-and-pages/`** — the DB-4 schema authoring record (Model B, upfront).

### E · CONSUMED SEAMS — already built (compose, do NOT rebuild)
| Seam | File | Role |
|------|------|------|
| **AR-6 `SpacesService`** | `core/src/foundation/spaces/service.ts` | entity-link + tag **WRITES** — `createLink`/`removeLink` (SP4) · `tagEntity`/`untagEntity` (SP1); idempotent, registry-validated (`UnknownEntityType`) |
| **AR-8 `BacklinkResolver`** | `core/src/services/search/backlink-resolver.ts` | entity-link **READS** — `getBacklinksTo` · `getLinksFrom` · `resolveLink`; M1.0 scope = entity_links only, `page_links` reads DEFERRED to M1.1 (= this rebuild) |
| **`@vida/editor`** | `packages/editor/src/` | TipTap block editor (UI-3, v0.8.0); `entityLink`/`backlink` are **E5 placeholder** nodes — MOD-notes #31 wires the real registry + bodies (`integration-blocks.tsx:6`, `slash-commands.ts:171`) |
| **`@vida/ui` views** | `packages/ui/src/components/` | `ListView`/`GalleryView`/`Timeline`/`CalendarView`/`NeuralGraph`/`ExportDialog` (UI-2, generic `<T>`, presentational, no `@vida/core` import) |
| **`apps/web` routes (AR-4 stubs)** | `app/notes/{index,[id]}.tsx` · `app/journals/{index,[date]}.tsx` · `app/class-notes/*` | `<h2>` placeholders; `routes.tsx:53-66` `notesRoute`(/notes lazy)+`graphRoute`(/graph); `nav/module-map.ts:24` Notes dock entry (`hasStandalonePages`, `hasMultiModeTopView`) |
| **Home/journal seam** | `apps/web/src/home/` | `section-model.ts:33` `entry` = `editor-seam` (Notes owns the mount) · `journal-contribution.ts` registry (`JournalSeamNotActivated`); `/summary` **engine is Journals-owned**, Notes provides the block surface |
| **Mobile stubs** | `apps/mobile/app/note/[id].tsx` · `app/journal/[date].tsx` · `(tabs)/notes.tsx` | empty placeholders (out of M1.1 web scope; noted) |

### F · ⚠ RESIDUE — built-then-removed ① (EXCLUDED from derivation)
| File | Why residue |
|------|-------------|
| `docs/features/notes-and-pages/current-spec.md` | describes the REMOVED `services/notes/` (cites deleted files) |
| `docs/features/notes-and-pages/current-business-rules.md` | records the removed ①'s enforced rules |
| `docs/specs/features/mod-notes/_index.md` | the old ① unit spec (add-backend-component increment) |
| `.claude/tasks/mod-notes.md` old `## Build Steps` S1–S6 | the discarded ① build ledger (marked discarded 2026-08-23) |

> **Confirmed removed:** `core/src/index.ts:135-137` carries the removal comment; **zero** `NotesService`/
> `createNotesService`/`services/notes` references remain (Explore sweep). The `current-*` are regenerated by the
> **Currency Rule (§XXIX)** once the new tracks build — they will then describe the fresh code, not the old ①.

### G · METHODOLOGY
- `docs/specs/foundation/entity-delivery-flow/_index.md` — the flow (base flow §3; Envision Gate §4.75).

---

## 2. Exhaustive mention index (by region)

### 2.1 `docs/`
- **`docs/core/decisions/`** — ADR-002 §5.2 (L1292–1458, table def + 6 page types + FTS5 `fts_pages` L3706–3710) ·
  ADR-006 (L8,23,59,64,174 tag-ownership superseded) · ADR-004 §3.1 (pomodoro re-home) · ADR-007 (saved views) ·
  ADR-003 (`pages.content` Yjs; attachments L183) · ADR-001 (export).
- **`docs/core/`** — `business-rules.md` INT-1 (L52–82 integration hub invariant) · `architecture/cross-module-integration.md`
  §3.3 page_links (L142–154) + table map (L30–32) · `architecture/security-model.md` (`page_links.context`[E];
  `note_attachments` [E] set) · `backlinks/current-spec.md` (AR-8; L28 page_links = M1.1; L34 barrel) + `current-business-rules.md` (BL-4 composite identity).
- **`docs/editor/`** — `extension-catalog.md` (L35 `/summary`, L43 `/entity-link`, L44 `/backlink`) · `block-registry.md`
  (L20/L28 MOD-notes #31 wires CapabilityRegistry) · `current-business-rules.md` (L46 attachments pipeline deferred; L155 BR-E5-7 no core import yet) · `serialization-spec.md` (L96 attachments src contract).
- **`docs/roadmap/`** — `m1.1-delivery-plan.md` (row 105 + §9 L186–196 ①/② scope; L56–57 Wave-1 hub; L115–121
  critical path; L132–133 `/summary` provider owned by journals) · `m1.0-delivery-plan.md` (L150 AR-6←AR-8) ·
  `m1.0-closeout.md` (L28,42,127 deferrals) · `roadmap.md` (L76–78 done-when; L92 DB-4; L93 AR-6 substrate).
- **`docs/infrastructure/`** — `database-layer/current-spec.md` (L190 `012_notes.ts`) + `current-business-rules.md`
  (L117 DB-4 group #1) · `storage-build-plan.md` (L48–53 table plan) · `database-schema-reconciliation.md` (L25 notes base).
- **`docs/specs/`** — `features/mod-notes/_index.md` (① spec — **residue**) · `foundation/db-4-notes-and-pages/`
  (schema authoring) · `foundation/realignment-master-plan/part-1.2-reruns/notes-and-pages.md` (rerun) ·
  `foundation/ux-1-information-architecture/` (views baseline) · `infrastructure/ar-8-foundation-services/backlink-resolver.md`
  (L35 page_links = M1.1) · `infrastructure/qa-1-e2e-harness-opfs/_index.md` (L10 MOD-notes downstream consumer).
- **`docs/_legacy/architecture.md`** — v1 reference (§3.6 Obsidian linking L262–302; §3.10 task/milestone notes
  L446–500; 12 blocks L210–220). ⚠ legacy — superseded; historical intent only.

### 2.2 `packages/`
- **schema** `db/schema/notes.ts` (header L1–29 "hub, in-degree 14"; tables L36–101; Rows L104–109) ·
  `db/migrations/012_notes.ts` (hand-SQL DDL + CHECK + partial-UNIQUE + idx) · `db/schema/foundation/spaces.ts`
  (`entityTags` L51–61, `entityLinks` L67–79) · `db/schema/_registry.ts` (ENTITY_TYPES seeds `page`/`note`/`journal` L5–10).
- **types** `types/src/note.ts` (enums + 8 interfaces) · `types/src/editor.ts` (entityLink/backlink block types + attrs) · `types/src/index.ts:13` barrel · ⚠ `types/src/notes.ts` EMPTY stub.
- **validators** `core/src/validators/note.ts` (5 enum schemas + create/update page schemas).
- **consumed seams** `foundation/spaces/service.ts` (SpacesService, L38–61 interface) · `services/search/backlink-resolver.ts` (BacklinkResolver, L23–30) — see Group E.
- **editor** `editor/src/extensions/integration-blocks.tsx` (ENTITY_LINK_SCHEMA L49–53; schema-less backlink L86–88; MOD-notes #31 comment L6) · `editor/src/slash-commands.ts` (L171/L204) · `editor/src/commands.ts` (`INTEGRATION_BLOCK_COMMANDS`).
- **ui** `ui/src/components/{list,gallery,timeline,calendar}-view.tsx` · `neural-graph.tsx` · `export-dialog.tsx` · `internal/data-view.tsx` · `ui/src/index.ts:40–46` barrel.
- **removed-service** `core/src/index.ts:135–137` removal comment (**zero** live NotesService refs — clean).

### 2.3 `apps/`
- **web routes/shell** `routes.tsx:9,53–68` (notesRoute/graphRoute lazy) · `nav/module-map.ts:24–25` (Notes dock + Graph owned-by-notes) · `shell/nav-icons.ts` (Notes→`StickyNote`) · `shell/nav-link.test.tsx` + `command-bar.test.tsx` + `App.integration.test.tsx` (/notes nav assertions).
- **web home/journal** `home/CLAUDE.md:8–10,35` · `home/section-model.ts:28,33` (`entry` editor-seam) · `home/journal-contribution.ts:1–5,35,56–58` (registry seam, `JournalSeamNotActivated`).
- **web route stubs** `app/notes/{index,[id]}.tsx` · `app/journals/{index,[date]}.tsx` · `app/class-notes/{index,[id]}.tsx` — all AR-4 `<h2>` placeholders.
- **mobile** `app/note/[id].tsx` · `app/journal/[date].tsx` · `(tabs)/notes.tsx` — empty placeholders.
- **desktop / server** — no explicit notes refs (inherit core via shared packages).

### 2.4 Root config
- `CLAUDE.md:7` (integration-layer overview) · `:112–129` (§8 Notes & Journals full spec) · `:249` (data-domains row: `pages`,`page_links`,`entity_links`,`tags`,`entity_tags`,`note_attachments`).
- `REPO.md:23` (mobile entries) · `:44` (no-inline-notes convention).
- `turbo.json` / `pnpm-workspace.yaml` — no notes-specific config.

### 2.5 `.claude/`
- `tasks/mod-notes.md` (LIF-131, this task — realigned to ground-zero base flow 2026-08-23) · `tasks/mod-journals.md` (LIF-127, planned, ← notes+prefs; owns `summary(date)`) · cross-refs in `db-5`/`db-8`/`db-10`/`db-11`/`hard-1-summary-registry` + module tasks.
- `.claude/docs/decisions.md` — 2026-08-23 Envision Gate + MOD-notes reset rows; ① delegation decisions.
- `.claude/docs/components.md` — GraphRoute lazy-split / empty-state note.
- *(`.claude/sessions/` intentionally NOT swept — historical logs, not entity sources.)*

---

## 3. Cross-module consumers — the in-degree-14 hub (who pulls Notes)

Every module below reaches Notes via the polymorphic `pages` (`entity_type`/`entity_id`) + `entity_links`
backlinks (INT-1: modules never read each other's tables directly — they connect THROUGH Notes). Relevant to
the Interpretation ORGANIZATION section (what Notes must expose) and the Envision "link two entities" affordance.

| Consumer | How it uses Notes | Page type / link |
|----------|-------------------|------------------|
| **Journals** (MOD-journals ①, ← notes) | reads `pages` (journal rows); owns `/summary` engine + provider registry; `entry` = Notes editor seam | `journal` |
| **Tasks** | task notes; task backlinks | `task_note`, `task_group_note`, `entity_type='task'` |
| **Projects** | project/milestone/deliverable notes | `milestone_note`, `deliverable_note` |
| **Knowledge / Books / Learning** | entity notes, quotes, chapter links, FTS5 search | `entity_type='knowledge_note'/'book'/'course'`, `entity_links` |
| **Relationships** | contact notes; tag migration → `entity_tags` (SP1) | `entity_type='contact'` |
| **Habits / Routines / Sessions / Finance / Health / Purposes / Check-ins / Gamification / Skills** | entity notes + backlinks + summary contributions | `entity_type=<domain>`, `entity_links` |
| **Preferences** (MOD-prefs, ← notes) | dep only (wave order) | — |

---

## 4. Corrections applied (Explore-agent claims vs on-disk ground truth)
1. **`types/src/notes.ts` is EMPTY** (0 lines) — one sweep implied it holds `PageType`/`Page`/etc.; those live in `note.ts` (singular). Corrected.
2. **① is REMOVED, not "COMPLETE"** — a sweep read the stale task-file build-steps (S1–S6) as current. The service was deleted at `d478341`; `core/index.ts:135-137` + zero live refs confirm.
3. **`current-*` are RESIDUE, not "durable ground truth"** — they cite deleted files; excluded from derivation, regenerated by §XXIX later.

## 5. Issue / increment ownership ledger (DOC-RESOLVED — no open decisions)

Everything the entity does is bound to an owning issue/increment by `m1.1-delivery-plan.md §9` (the deferred-to-build
ledger) + §2 (the 2-increment grain) + §5 (sequencing). **Nothing here is an open decision** — each row is `[FACT]`
traced to the plan/aspect docs. (Corrected 2026-08-23: an earlier draft mis-framed these as "open items for Victor";
the docs already own them — [[decide-dont-ask-when-docs-give-the-answer]].)

### MOD-notes ① — backend service (`core/src/services/notes`, add-backend-component)
| Capability | Source |
|------------|--------|
| page CRUD (all 6 types) + journal-date conflict `JournalExistsError` | §9 · business-rules NP-2 |
| `page_links` + `entity_links` **create**, UNIQUE-idempotent | §9 · NP-5/NP-7 |
| `resolveWikiLink` + create-on-miss (G2) | §9 |
| entity-note auto-seed, client-deterministic | §9 · NP-8 |
| `/summary` aggregation for **today** (5 sections) — but the `summary(date)` **registry engine is MOD-journals ①** (§5 L132-133); the exact ①↔journals seam is homed to the ① unit spec (§9 grain note), not re-litigated | §9 · §5 |
| open `entity_type` registry validation `UnregisteredEntityTypeError` (SP2) | §9 |
| `entity_tags` **read query** — **net-new** (`getEntitiesByTag`); AR-6 owns tag WRITES only, ships **no read method** (Doc-Gate B1) | §9 · `spaces/service.ts:40-60` |
| **consume** AR-8 `BacklinkResolver`; author the `page_links` **read** path deferred from AR-8 → M1.1 | §9 · `backlink-resolver.ts:11-15` |

### MOD-notes ② — UI surface (`apps/web/src/app/notes`, add-frontend-component)
| Capability | Source |
|------------|--------|
| TipTap editor mount + standard blocks + 12 platform blocks | §9 |
| List / Calendar / Gallery / Neural collection views (renderers **hard-coded**) | §9 |
| **`[[` picker + create-on-miss** ⟵ *the "how does a user link two notes?" affordance* | §9 |
| **backlink / entity-link panels** ⟵ *same affordance (the visible link surface)* | §9 |
| page metadata (favorite / archive / icon / cover) | §9 |
| FTS5 search UI (over the DB-8 seam) | §9 |

> **"How does a user link two notes?" is DOCUMENTED, not open:** ① provides `resolveWikiLink` + `page_links` create +
> the `createEntityLink` facade; ② provides the `[[` picker + create-on-miss + the backlink/entity-link panels + the
> Neural view. The Envision Gate (Step 1.875) *greyboxes* this to pin the exact shape as a leading contract — it does
> not *decide* whether the affordance exists (the plan already says it does).

### Deferred — HOMED elsewhere (NOT MOD-notes; do not pull in)
| Capability | Owner |
|------------|-------|
| field-level `[E]` encryption wiring | M3 / DB-5 (M1.0 = pass-through) |
| wider personalizable `/summary` menu (G5) | M1.4 |
| ADR-007 saved-view **selection** primitive | deferred design-pass (Victor 2026-07-23) |
| neural-graph **data-prep** | AR-8 future increment / Views design-pass |
| FTS5 engine | DB-8 |
| `summary(date)` provider **registry/engine** | MOD-journals ① (Notes consumes) |

### Consumed — built, owned by other (closed) issues
| Seam | Owner |
|------|-------|
| entity-link + tag **WRITES** (`SpacesService`) | AR-6 ✅ |
| entity-link **READS** (`BacklinkResolver`) | AR-8 ✅ |
| block editor (`@vida/editor`) | UI-3 ✅ |
| platform views (`@vida/ui`) | UI-2 ✅ |
| route registration + app shell | AR-4 / UI-4 ✅ |

### Scope boundaries (doc-fixed FACTs, not questions)
- **Home = `apps/web/src/app/notes`** (web-first). Mobile note/journal screens are stubs — **OUT** of this M1.1 entity (§2/§3, row #105).
- **Decomposition mode = Ratify** (①/② split doc-fixed, §2 + row #105). The `②a–②e` lettering is dead residue.
- The **NEEDS interpretation** (Step 1.5) must still surface implicit boot preconditions (keyless `_sync_hash`/libsodium/device-id/registry) — that is *authoring work in the flow*, owned by this session, not a decision for anyone.
