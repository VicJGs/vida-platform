<!-- Entity Delivery Flow · Step 2.5 (INTENT COVERAGE GATE) · Notes & Pages · base flow (§3).
     Purpose: prove the WHOLE described intent is homed and WILL be built before the backend/frontend fork.
     Distinct from the Decomposition Gate (that checked slices are well-formed; this checks the plan covers
     100% of the intent corpus, INCLUDING intent routed away at earlier gates). A route is honest only if the
     named home actually owns it — else it is a hand-wave that means "never built." Governed by No-Guessing.
     Sources: 5 aspect docs · intake.md · baseline.md (NP-1..9) · interpretation.md (N1-9, IR-1..13) ·
     envision.md (EC-1..11, 12 vision points, 3 new-intent) → mapped to slice-map.md (A1-A8, B1-B7) +
     seam-contract.md + the routed/deferred homes. Built 2026-08-24. -->

# Intent Coverage Gate — Notes & Pages

**Disposition legend:** ✅ BUILT (names the exact slice) · ➡️ ROUTED (named home + is the home doc-verified to own it?) · ⏳ DEFERRED-HOMED (named tracked home) · ⚠ FLAG (needs critic adjudication — candidate silent-drop) · ❌ UNHOMED (=BLOCKER → re-slice).

**Assertion under test:** 0 ❌ UNHOMED · every ➡️/⏳ home doc-verified · ⋃(slices + verified homes) ⊇ whole intent.

---

## 1. Backend ① — Service Contract Methods (seam-contract.md, 29 methods)

| Intent (method) | Disposition | Slice / Home |
|---|---|---|
| `createPage` (6 types) + `JournalExistsError` (NP-2) | ✅ BUILT | A1 |
| `getPage` · `updatePage` (.strict, IR-9) · `softDeletePage` | ✅ BUILT | A1 |
| `getPageByJournalDate` · `getPagesByType` · `getPagesForEntity` | ✅ BUILT | A1 |
| `listPages({favorite,archived,tag})` (EC-9) | ✅ BUILT | A1 |
| `createPageLink` (idempotent, IR-11) · `removePageLink` · `getPageLinksFrom` · `getPageLinksTo` (ex-AR-8 reverse read) | ✅ BUILT | A2 |
| `resolveWikiLink(text)` (create-on-miss = caller compose, IR-4) | ✅ BUILT | A3 |
| `ensureEntityNote` (NP-8, pure-deterministic IR-5) | ✅ BUILT | A4 |
| `getEntitiesByTag` · `getTagsForEntity` (net-new tag reads) | ✅ BUILT | A5 |
| `createEntityLink` · `removeEntityLink` · `tagEntity` · `untagEntity` (facade → AR-6, IR-2 registry-validate, `UnregisteredEntityTypeError`) | ✅ BUILT | A5 (delegates to AR-6 ✅) |
| `getEntityLinksFrom` (facade → AR-8) · `getBacklinks` (①-merge page_links+entity_links, G6/C4) | ✅ BUILT | A5 (← A2) |
| `addAttachment` · `getAttachments` · `removeAttachment` | ✅ BUILT | A6 |
| `getSummaryConfig` · `setSummaryConfig` (plain-text IR-8) · `buildJournalSummary(date,config)` today 5-section block | ✅ BUILT | A7 (engine = MOD-journals, consumed) |
| page-delete **cascade** (page_links/entity_links/entity_tags/attachments), non-atomic N8/IR-13 | ✅ BUILT (gated) | A8 (g1 decision) |

**§1 verdict:** every exposed ① method → a named A-slice. Backend contract fully covered.

✅ **F-1 — RESOLVED · ROUTED-VERIFIED (built elsewhere).** Tag-definition CRUD ships in AR-6 `SpacesService` (`foundation/spaces/service.ts:40-42` createTag/updateTag/deleteTag over `tags`, nestable `parent_tag_id` + name/color/icon/description at `:108-125`, cycle guard `:83-92`); the management UI is MOD-spaces ② (`m1.1-delivery-plan.md:232` "tags browser + inline entity-tag picker, nestable, color/icon"). Correctly EXCLUDED from Notes' 29 seam methods — not a Notes deliverable. No gap.

---

## 2. Frontend ② — Envision Checkpoints (EC-1…EC-11)

| EC | Disposition | Slice |
|---|---|---|
| EC-1 Neural note-edges connect two notes | ✅ BUILT | B5 (← A2) |
| EC-2 link-two-notes in-note, `[[` split from `/entity-link` | ✅ BUILT | B3 + B4 |
| EC-3 `[[` picker: search / resolve-by-id / create-on-miss | ✅ BUILT | B3 (← A3) |
| EC-4 4 baseline renderers + New Note + row actions | ✅ BUILT | B1 |
| EC-5 distinct terminal states + create-CTA + `/summary` degrade | ✅ BUILT | B1 + B7 |
| EC-6 real-editor blank-page mount | ✅ BUILT | B2 (@vida/editor ✅) |
| EC-7 collapsible detail rail | ✅ BUILT | B2 |
| EC-8 create-with-tags | ✅ BUILT | B6 (← A5) |
| EC-9 favorite/archive/tag filters | ✅ BUILT | B6 (← A1 listPages) |
| EC-10 (feel) linking immediate + undoable | ✅ BUILT | B3/B5 live-VG row |
| EC-11 (feel) soft, confirm-gated delete | ✅ BUILT | B2 live-VG row |

**§2 verdict:** all 11 ECs → ≥1 B-slice (already ratified at Decomposition; re-confirmed here).

---

## 3. The 12 Platform Blocks (identity.md · intake.md:84 "② scope = 12 blocks")  ⚠ KEY SCRUTINY

| Block | Disposition | Home |
|---|---|---|
| `/summary` | ✅ BUILT | B7 (block surface; engine MOD-journals) |
| `/entity-link` | ✅ BUILT | B4 (wires ADR-008 registry body) |
| `/backlink` | ✅ BUILT | B4 |
| `/pomodoro` | ⏳ DEFERRED-HOMED | Sessions realm (`focus_sessions`); IR-10 flag-only; block = consuming lens |
| `/tasks` `/events` `/classes` `/habits` `/timeline` `/chart` `/class-notes` `/milestone` (8 data-consuming blocks) | ⏳ DEFERRED-VERIFIED | MOD-notes ② renders all 12 as **E5 placeholders** + wires `entityLink`/`backlink` bodies at app-mount (B4); each other block's **real body → its data-owning module's ② pass** — `block-registry.md:20-21` + per-block owner column `extension-catalog.md:33-39` |

✅ **F-2 — RESOLVED · DEFERRED-VERIFIED (home WAS written down — my draft claim was wrong).** `docs/editor/block-registry.md:20-21` splits it: "wire the real CapabilityRegistry at app-mount → MOD-notes #31" but "each capability's REAL inline body (replaces the placeholder) → per-module MOD-* → ⏳ deferred." `extension-catalog.md:33-39` names the owner per block (`/tasks`→MOD-tasks, `/events`→MOD-relationships, `/classes`→MOD-learning, `/habits`→MOD-habits, …). MOD-notes ② ships all 12 as placeholders (`intake.md:100`) + the 2 link-block bodies (`intake.md:78`). Real per-module home — verified.

---

## 4. Page Types, Views, Entity-Note Navigation

| Intent | Disposition | Slice / Home |
|---|---|---|
| 6 page types create/read (journal·note·task_note·task_group_note·milestone_note·deliverable_note) | ✅ BUILT | A1 (backend) |
| Collection views List/Gallery/Calendar/Neural (4 hard-coded renderers) | ✅ BUILT | B1 (+ B5 neural) |
| `journal/[date]` + `note/[id]` routes | ✅ BUILT | B1/B2 |
| Entity-attached notes (task_note/milestone_note/…) reached **from parent's page** (structure-data:150) | ✅ ROUTED-VERIFIED | owning-module ② nav (`tasks/structure-data.md:33` "aggregated entry points from parent modules"; `tasks/contract.md:23` notes read via Notes' contract); backend supplied by A4/A1 |
| Templates = live-block reusable user-saved layouts (conventions:162, identity G7) | ⏳ DEFERRED-VERIFIED | ADR-009 (fork-on-instantiate) owns the model; DB-3 `templates` table; surfaced by MOD-spaces ② ("save any Space as a template", `spaces/README.md:11` + ADR-009 §3) |

✅ **F-3 — RESOLVED · ROUTED-VERIFIED.** From-parent nav is the owning module's ② scope (`tasks/structure-data.md:33`, `tasks/contract.md:23`); Notes supplies the backend (A4 `ensureEntityNote` + A1 `getPagesForEntity`).
✅ **F-4 — RESOLVED · DEFERRED-VERIFIED.** Templates are a fully-owned foundation concern (`ADR-009-templates-fork-on-instantiate.md` + `templates.ts:1-9`); live-ness comes from forked live blocks (bundle carries `views + enabled capabilities+config`); surfaced by MOD-spaces ②. Not a Notes deliverable.

---

## 5. Cross-Plane Invariants NP-1…NP-9

| NP | Disposition | Slice |
|---|---|---|
| NP-1 no inline notes columns | ✅ BUILT (convention) | all A-slices (pages-only) |
| NP-2 one journal per date (`JournalExistsError`) | ✅ BUILT | A1 |
| NP-3 sensitive fields `[E]` client-side | ⏳ DEFERRED-HOMED | M3/DB-5 (M1.0 empty-`[E]` pass-through, N9) |
| NP-4 content = Yjs CRDT not LWW (IR-7) | ✅ BUILT | A1 write path + B2 editor |
| NP-5 links unique id-based | ✅ BUILT | A2 |
| NP-6 entity links target registered types (IR-2) | ✅ BUILT | A5 |
| NP-7 wiki-links resolve by page id | ✅ BUILT | A3/B3 |
| NP-8 entity notes auto-exist, never blank | ✅ BUILT | A4 |
| NP-9 soft-delete cascade (service-driven IR-1) | ✅ BUILT (gated) | A8 |

**§5 verdict:** all 9 NPs homed (NP-3 correctly deferred to M3/DB-5 per the M1.0 pass-through boundary).

---

## 6. NEEDS N1…N9 (boot/dep constraints)

All 9 are ✅ HONORED inside slices (not standalone deliverables): N1 libsodium-boot + N2 deviceId + N9 empty-`[E]` → A1 factory (+ live-DB `hashContent` smoke at every Verification Gate); N3 registry-guard-on-write-only → A5; N4 injected deps → A1 factory signature; N5 migrated DB → A1 precondition; N6 RQ/Zustand → B-track; N7 soft-delete predicate → all reads; N8 cascade non-atomicity → A8 g1. **§6 verdict: covered.**

## 7. IMPLICIT RULES IR-1…IR-13

All 13 are ✅ EMBEDDED as slice constraints (not deliverables): IR-1/IR-13→A8 · IR-2→A5 · IR-3/N1→A1 · IR-4→A3 · IR-5→A4 · IR-6→all reads · IR-7→A1/B2 · IR-8→A7 · IR-9→A1 · IR-10→`/pomodoro` (Sessions) · IR-11→A2 · IR-12→every mutation (sync_queue coalesce). **§7 verdict: covered.**

---

## 8. Victor's 12 Vision Points (envision.md)

| Pt | Disposition | Home | Home doc-verified? |
|---|---|---|---|
| 1 create/edit/clone views + tag filters | ➡️ ROUTED | MOD-spaces ② (ADR-007 `views` builder/selector) | ⚠ verify MOD-spaces ② owns the view-builder |
| 2 list columns + per-page pagination | ➡️ ROUTED | MOD-spaces ② + Spaces Views design-pass | ⚠ (F-5) |
| 3 calendar wk/mo/yr + type colors | ➡️ ROUTED | MOD-spaces ② + design-pass + AR-6 color | ⚠ |
| 4 gallery cols; Kanban tag-cols + nest-by-type | ➡️ ROUTED | MOD-spaces ② + Spaces Views design-pass | ⚠ |
| 5 favorites as a space / saved filter | ➡️ ROUTED (baseline toggle → EC-9 ✅) | MOD-spaces ② | ⚠ |
| 6 sort-by-created + manual ordering | ➡️/⏳ | MOD-spaces ② + DB-11 order col | ⚠ |
| 7 neural under same view model | ➡️ ROUTED | MOD-spaces ② | ⚠ |
| 8 neural grouping + tag-coloring config | ➡️ ROUTED | MOD-spaces ② + AR-6 color | ⚠ |
| 9 set tags on create | ✅ BUILT | EC-8 → B6 | ✅ |
| 10 note page mounts real editor | ✅ BUILT | EC-6 → B2 | ✅ |
| 11 detail = collapsible rail | ✅ BUILT | EC-7 → B2 | ✅ |
| 12 `[[` wiki-link flow | ✅ BUILT | MOD-notes ② → B3 | ✅ |

✅ **F-5 — RESOLVED · ROUTED-VERIFIED (the big route holds).** MOD-spaces is a real tracked M1.1 module issue — **LIF-141** (`m1.1-delivery-plan.md:108`, Wave 2 `:116`) — whose ② scope explicitly owns the view builder+selector: `m1.1-delivery-plan.md:232-233` "saved-views builder + selector; view-selection Zustand store feeding the layout renderers." The backend already ships (`foundation/views/service.ts:25-28` createView/updateView/deleteView, ADR-007); MOD-notes ② keeps the 4 renderers hard-coded (`:192-193`), no overlap gap. The ADR-006 "Languages dissolved into Spaces" precedent is about Spaces-as-schema-substrate — it does NOT weaken MOD-spaces-as-deliverable (LIF-141 is a distinct UI-dominant issue). Sub-items verified too: pagination/nest-by-type → Spaces Views build-time design-pass (`:234`); manual-order → DB-11/ADR-002 reconcile at M1.4 (`m1.0-closeout.md:98`). Not a hand-wave.

---

## 9. The 3 New-Intent Items

| Item | Disposition | Home | Verified? |
|---|---|---|---|
| Per-page pagination | ⏳ DEFERRED-HOMED | Spaces Views design-pass (§9 L234) | ⚠ verify the design-pass is a tracked artifact |
| Nest-by-type inner-collection | ⏳ DEFERRED-HOMED | Spaces Views design-pass | ⚠ |
| Manual-order (needs order col) | ⏳ DEFERRED-HOMED | ADR-002 amendment / DB-11 | ⚠ verify DB-11 carry-forward lists it |

---

## 10. Other Deferred/Routed Items (catalog + home)

| Item | Disposition | Home | Verified? |
|---|---|---|---|
| FTS5 search UI | ⏳ DEFERRED-HOMED | DB-8 seam | ✅ (DB-8 = FTS5 engine, roadmap) |
| Field-level `[E]` encryption | ⏳ DEFERRED-HOMED | M3/DB-5 | ✅ (M1.0 pass-through boundary) |
| Wider `/summary` personalizable menu (G5) | ⏳ DEFERRED-HOMED | M1.4 | ✅ (business-rules G5) |
| PageLink/NoteAttachment interface reconcile (C2) | ⏳ DEFERRED-HOMED | DB-11 | ✅ (baseline C2) |
| `getPageLinksTo` reverse index | ✅ BUILT | A2 (`idx_page_links_target`) | ✅ |

---

## 11. Coverage Assertion — RESOLVED (independent critic adjudicated 2026-08-24)

- **BUILT** intent → explicit A1-A8 / B1-B7 slices: §§1,2,4-7 fully.
- **ROUTED/DEFERRED** with a doc-verified home: NP-3→M3/DB-5 · FTS5→DB-8 · field-`[E]`→M3 · G5→M1.4 · C2→DB-11 · `/pomodoro`→Sessions · manual-order→DB-11.
- **5 flags — ALL RESOLVED (0 UNHOMED):**
  - **F-1** `upsertTag` → ✅ ROUTED-VERIFIED — AR-6 `SpacesService` (`service.ts:40-42`) + MOD-spaces ② (`delivery-plan:232`).
  - **F-2** 8 data-consuming blocks → ⏳ DEFERRED-VERIFIED — per-module bodies (`block-registry.md:20-21` + `extension-catalog.md:33-39`).
  - **F-3** entity-note from-parent nav → ✅ ROUTED-VERIFIED — owning-module ② (`tasks/structure-data.md:33`).
  - **F-4** Templates → ⏳ DEFERRED-VERIFIED — ADR-009 + Spaces (`spaces/README.md:11`).
  - **F-5** routed view-system → ✅ ROUTED-VERIFIED — MOD-spaces LIF-141 ② (`delivery-plan:108,232-233` + `views/service.ts:25-28`).
- **Completeness sweep:** no silent drops between inventory and slices — all 11 ECs · 9 NP · 9 NEEDS · 13 IR · 12 vision points · 3 new-intent accounted for.

**GATE STATUS: ✅ PASS** — 0 UNHOMED; every ➡️/⏳ home doc-verified against its owning doc. ⋃(A1-A8 slices + B1-B7 slices + verified homes) ⊇ the whole described intent. **The backend/frontend fork is unblocked.** Every piece of intent will be built — here in a named slice, or in a named tracked home (AR-6 · MOD-spaces LIF-141 · per-module block bodies · ADR-009 · DB-8 · DB-11 · M3/M1.4).
