<!-- Entity Delivery Flow · Step 2 (DECOMPOSITION GATE) · Notes & Pages · base flow (§3), RATIFY mode (§9).
     The ①/② split is DOC-FIXED (m1.1-delivery-plan §2 = every MOD-* is 2 gated increments; row #105 profile chain
     add-backend-component → add-frontend-component). This does NOT re-decide it — it RECORDS + VALIDATES the fixed
     split and DETAILS the within-track slices, the per-slice gate ledger, the seam (→ seam-contract.md), and the
     envision coverage check. Every structural EC (envision.md) maps to ≥1 slice, plane-aware. -->

# Slice map — Notes & Pages (Ratify mode)

**Fork (doc-fixed):** TRACK A = ① `@vida/core` Notes **service** (add-backend-component) → TRACK B = ② `/notes` **UI**
(add-frontend-component). Backend precedes the UI that consumes it; both trace to the seam contract
(`delivery/seam-contract.md`). Grounded in `baseline.md §2/§3` + `interpretation.md` (NEEDS N1-N9, IR-1…IR-13).

## TRACK A · BACKEND — Entity Service Build Flow (① · `core/src/services/notes`)
| Slice | Scope | Tag | Deps | Closes with |
|-------|-------|-----|------|-------------|
| **A1 · pages CRUD + factory** | `createNotesService(db, deviceId, {spaces, backlinks, registry})` factory + `pages` repo (empty-`[E]`, soft-delete); `createPage`(6 types)/`getPage`/`updatePage`(`.strict()`, IR-9 immutable journal id)/`softDeletePage`/`getPageByJournalDate`/`getPagesByType`/`getPagesForEntity`/`listPages({favorite,archived,tag})`; `JournalExistsError` (NP-2). Honors N1 (libsodium boot), N2 (deviceId), N9 (empty-`[E]`). | backend | schema ✅, N1/N2/N9 | ░Verification Gate░ |
| **A2 · page_links (write + read)** | `createPageLink` (idempotent NP-5, **revive-or-noop** IR-11) · `removePageLink` · `getPageLinksFrom` · **`getPageLinksTo`** (the reverse-lookup **read** deferred from AR-8 → M1.1, `idx_page_links_target`) | backend | A1 | ░Verification Gate░ |
| **A3 · resolveWikiLink** | `resolveWikiLink(text)` → title candidates (LIKE over `pages`); create-on-miss is a **caller compose** (IR-4), not silent | backend | A1 | ░Verification Gate░ |
| **A4 · ensureEntityNote (NP-8)** | client-deterministic seed — **pure fn of parent local fields**, stable key order, no `Date.now`/random; idempotent (IR-5) | backend | A1 | ░Verification Gate░ |
| **A5 · tag reads + link/tag facade** | **net-new** `getEntitiesByTag`/`getTagsForEntity` read over `entity_tags` (AR-6 has NO tag-read, B1); facade → AR-6 `createLink/removeLink/tagEntity/untagEntity` (writes, IR-2 **registry-validate** `entity_type`, NOT `EntityLinkTargetSchema`) + AR-8 `getBacklinksTo/getLinksFrom` (reads); `getBacklinks` merges page_links+entity_links (G6) | backend | A1, A2 | ░Verification Gate░ |
| **A6 · note_attachments CRUD** | `addAttachment`/`getAttachments`/`removeAttachment` (blob + thumbnail, empty-`[E]`) | backend | A1 | ░Verification Gate░ |
| **A7 · today /summary config storage** | `summary_config` storage (a `pages` col, plain text IR-8): `getSummaryConfig`/`setSummaryConfig` (① reads/writes the column). ⚠ **`buildJournalSummary` (the today 5-section `/summary` BLOCK) is ② (B7), NOT ① — corrected 2026-08-24 (Victor drift-catch):** intent authority is unanimous — `contract.md:20` ("the `/summary` **block**"), `identity.md:19` ("the aggregation ENGINE behind this **block** is the Journals context"), `current-spec.md:40` ("the `buildJournalSummary` block-interface **is a ② surface**"). The engine is MOD-journals ①. | backend | A1 | ░Verification Gate░ |
| **A8 · cascade cleanup (IR-13)** | service-driven soft-delete **cascade** of a page's `page_links`/`entity_links`(via AR-6)/`entity_tags`/`note_attachments`, page **last**. **Handling doc-fixed by IR-13 (gated) — no open decision:** per-entity soft-deletes, **eventually-consistent** (per-entity LWW blobs, ADR-003), **re-drive** on partial failure (page-last + fail-loud → live re-drivable page), idempotent. NOT transactional / no `*InTx` — cross-entity atomicity is not the platform model (no-FK; the atomicity unit is one-entity + enqueue). *(An earlier "best-effort vs `*InTx` g1 decision" framing was drift; IR-13 already fixes the handling.)* | backend | A1, A2, A5, A6 | ░Verification Gate░ (live-DB partial-failure smoke) |

**Verification Gate (per backend slice, blocking):** Vitest (logic + failure paths) → typed-error assertions → **live smoke on the REAL DB** (not fixtures; exercises `hashContent` — catches N1) → persistence probe → §XXIX currency → PASS before the next slice.

## TRACK B · FRONTEND — Entity UI/UX Build Flow (② · `apps/web/src/app/notes`)
| Slice | Scope | Tag | EC(s) | Closes with |
|-------|-------|-----|-------|-------------|
| **B1 · /notes route + 4 baseline renderers** | replace the AR-4 `<h2>` stub; the collection surface hosting **hard-coded** List/Gallery/Calendar/Neural (@vida/ui) + the 4 **terminal states** (loading/empty-with-**create-CTA**/error/success) | frontend | **EC-4, EC-5** | ░Visual Gate░ |
| **B2 · note detail + real editor + collapsible rail** | `/note/[id]` route; mount the **real `@vida/editor`** (blank-page rows, `/` slash, `[[`); the **collapsible** detail rail; page-actions menu (favorite/archive/**soft-delete** confirm) | frontend | **EC-6, EC-7, EC-11** | ░Visual Gate░ |
| **B3 · `[[` note-link picker** | a `@tiptap/suggestion` picker (mirrors E4 slash-menu) → `resolveWikiLink` candidates → select binds `createPageLink`; **create-on-miss** explicit | frontend | **EC-3, EC-2, EC-10** | ░Visual Gate░ |
| **B4 · entity-link + backlink/link panels** | the `/entity-link` affordance (→ AR-6 write via ①) + the **Links-out / Backlinks** panels (page_links via A2 + entity_links via A5), kept **distinct** from `[[` | frontend | **EC-2** | ░Visual Gate░ |
| **B5 · Neural note-graph** | note-node graph over `getPageLinksFrom` (frontend fan-out; the DEF-N5-a `state`-dep fix re-surfaces here if needed); node-click → detail | frontend | **EC-1, EC-10** | ░Visual Gate░ |
| **B6 · metadata + filters + create-with-tags** | favorite/archive/icon/cover; the built-in **favorite/archived/tag filters** (① `listPages`); **New Note with tags** (delegates write → AR-6, composes the Spaces tag-picker) | frontend (shared → MOD-spaces picker) | **EC-8, EC-9** | ░Visual Gate░ |
| **B7 · journal /summary block + Home entry seam** | render the `/summary` block (**fail-loud per section**, never blanks) consuming MOD-journals; the journal `entry` editor mount seam | frontend | **EC-5 (journal)** | ░Visual Gate░ |

**Visual Gate (per frontend slice, blocking):** real browser (chrome-devtools/Brave), every state × {light｜dark} × {375·768·1440}, §XIV a11y, `/component-audit` + `victor:quality-gate-components` + `-engineering`, **+ the slice's anchored EC MUSTs** — FAILS on an unmet MUST independent of "console clean." No batching/owed.

## Envision coverage check (every `structural` EC → ≥1 slice · plane-aware)
| EC | Assertion | Slice(s) |
|----|-----------|----------|
| EC-1 | Neural note-edges connect two notes | B5 (+ A2 reads) |
| EC-2 | link-two-notes in-note, `[[` split from `/entity-link` | B3 + B4 (+ A2/A5) |
| EC-3 | `[[` picker: search/resolve-by-id/create-on-miss | B3 (+ A3) |
| EC-4 | 4 baseline renderers + New Note + row actions | B1 |
| EC-5 | distinct terminal states + create-CTA + `/summary` degrade | B1 + B7 |
| EC-6 | real-editor blank-page mount | B2 (+ @vida/editor ✅) |
| EC-7 | collapsible detail rail | B2 |
| EC-8 | create-with-tags | B6 |
| EC-9 | favorite/archive/tag filters | B6 (+ A1 `listPages`) |
| EC-10 (feel) | linking immediate+undoable | B3/B5 live VG row |
| EC-11 (feel) | soft, confirm-gated delete | B2 live VG row |
✅ All 9 structural ECs covered; both feel ECs carried as live-VG rows.

## Cross-references — NOT MOD-notes slices (routed at Envision, doc-fixed)
- **The configurable-view system** (create/edit/clone views · Table/Board-Kanban/Calendar-config/Neural-config · filter/sort/grouping · view builder+selector) = **ADR-007 `views` → MOD-spaces ②**. MOD-notes B1 ships the hard-coded renderers a Spaces view will later *select*; the view-selection store (MOD-spaces) feeds them. `[FACT: §9 MOD-spaces; ADR-007]`
- **NEW intent → the Spaces Views design-pass** (§9 L234; not a new track): per-page **pagination** · **nest-by-type** inner-collection · **manual-order** (needs a persisted order column → **ADR-002 amendment / DB-11**, schema frozen post-DB-4).
- **FTS5 search UI** → **DB-8** seam (deferred). **Field `[E]`** → M3/DB-5. **Wider `/summary` menu** → M1.4.

## Build order + gate ledger
```
① BACKEND:  A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8   (each ░Verification Gate░ before the next)
                                    │  seam-contract.md frozen here (② plans against it)
② FRONTEND: B1 → B2 → B3 → B4 → B5 → B6 → B7          (each ░Visual Gate░ + EC MUSTs before the next)
ENTITY CLOSE: both tracks green · every slice gate PASS · §XXIX currency · /session-end · /task-complete
```
Each slice is its own §XXVI unit (PLAN ░g1░ → IMPL ░g2░ → BUILD → its gate). **A8 implements IR-13's documented cascade handling** (per-entity, eventually-consistent, re-drive) — **no open decision** (the earlier "best-effort vs `*InTx`" framing was drift).
