# G1 — Debt Census (shipped `fe-*` units vs the Entity Live Close)

> **Status:** G1 output, 2026-10-21. Method: `_index.md` §3 G1 + R8 (EC column). Yardstick: `process.md` ELC-1…9.
> **Evidence:** four parallel auditors on one schema (`census/_schema.md`). Every row cites `path:line` in its section file:
> [A notes/home](census/a-notes-home.md) · [B system/features](census/b-system-features.md) ·
> [C shell + composing CODEC + #69](census/c-shell-codec.md) · [D foundation CODEC](census/d-foundation-codec.md).
> **Limit (honest):** the EC checks are code-level plus Visual-Gate-ledger level. `⏳` = feel/live-only; it is verified
> at each debt unit's ELC-9 close in the running app.
> **Code base:** branch `golive-replan` = `main @ 3b0ecc8`. Only `notes` + `journals` are exposed in `Services`
> (`apps/web/src/db/composition-root.ts:33-36`).

## 1. Unit verdicts (24 shipped units; fe-calendar is in flight and not audited)

| Unit                           | ELC         | Legs S/P/L | ORPHAN | EC ✅/❌/⏳/?                                            | The debt in one line                                                                                                                                                                                                                 |
| ------------------------------ | ----------- | ---------- | ------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fe-notes-and-pages             | **PARTIAL** | 10/1/4     | 13     | 14/**8**/8/0 (6 ⏳ = RIDE-homed to fe-tasks/fe-projects) | List/open/create/write live; attachments · metadata · `[[` picker · summary · templates · view-config stub/DEV-only **although `updatePage`/`getAttachments`/`getBacklinks` exist** (backlinks → HARD-3, borrowed); no rename/delete |
| fe-home                        | **PARTIAL** | 4/1/2      | 4      | 4/**2**/2/1                                              | Journal entry live; EC-3 inline blocks + "/" hint unreachable; EC-4 dashboard not personalized (HARD-1 + orphan selection storage)                                                                                                   |
| fe-settings                    | **STUB**    | 6/0/0      | 5      | 8/**2**/2/0                                              | Nothing persists (no `preferences` registration); dock ignores show/hide · rename · reduce-motion                                                                                                                                    |
| fe-notifications               | **STUB**    | 3/0/0      | 3      | 5/**2**/1/1                                              | #46 delivery engine is BUILT (`foundation/notifications`, LIF-174); construct it + sessions at the composition root                                                                                                                  |
| fe-onboarding                  | **PARTIAL** | 2/0/2      | 2      | 8/**1**/1/0                                              | `EmptyState` slot has 0 consumers                                                                                                                                                                                                    |
| fe-gamification                | **STUB**    | 7/0/0      | 4      | 9/**2**/1/0                                              | **Backend gap:** no `listConsequences` read; fail-closed flag hides it from ⌘K (the dock is unmounted anyway, C#1)                                                                                                                   |
| fe-session-hud                 | **STUB**    | 3/0/0      | 2      | 11/0/2/0                                                 | **Backend gap:** no `findActiveSession`                                                                                                                                                                                              |
| fe-session-runtime             | **STUB**    | 4/0/0      | 1      | 10/0/1/0                                                 | mark-done · attach · proof are no-ops                                                                                                                                                                                                |
| fe-shell                       | **PARTIAL** | 2/0/0      | 2      | 12/0/0/0                                                 | Placement never persists; Modules panel empty; carried #69's wiring Goal but never sliced it (§3)                                                                                                                                    |
| fe-shell-scope                 | **STUB**    | 2/0/0      | 2      | 5/**2**/1/0                                              | **Backend gap:** no `listSpaces`; EC-3/4: Victor's re-pins recorded in `decisions.md:1155` (D-S3-1) but not in `envision.md`                                                                                                         |
| fe-codec-seams (#13)           | N/A-by-role | —          | 1      | —                                                        | All 4 engines unwired; owning consumers exist except #20 (Spaces page, unbuilt)                                                                                                                                                      |
| fe-codec-flow-session          | N/A         | —          | 1      | 10/0/1/0                                                 | **Backend gap:** no applied-effects read API (consumer #23 STUB)                                                                                                                                                                     |
| fe-codec-entity-facet          | N/A         | —          | 1      | 7/0/1/0                                                  | Mode memory orphan; **owns the `offersEditor` defect** (§4)                                                                                                                                                                          |
| fe-codec-dashboard             | N/A         | —          | 2      | 8/0/0/0                                                  | Consumer Home STUB                                                                                                                                                                                                                   |
| fe-codec-collection            | N/A         | —          | 1      | 6/**1**/1/0                                              | EC-5 `degraded` state dropped                                                                                                                                                                                                        |
| fe-codec-canvas-editor         | N/A         | —          | 2      | 9/0/2/0                                                  | `CanvasEditor` + `page-binding` have no runtime consumer                                                                                                                                                                             |
| fe-codec-canvas-graph          | N/A         | —          | 1      | — (Envision skipped)                                     | —                                                                                                                                                                                                                                    |
| fe-codec-canvas-reader         | N/A         | —          | 1      | 13/**1**/1/0                                             | EC-8 photo-pending state never built                                                                                                                                                                                                 |
| fe-codec-canvas-board          | N/A         | —          | 0      | 7/**1**/1/0                                              | EC-2 reference tile never built                                                                                                                                                                                                      |
| fe-codec-theme                 | N/A         | —          | 2      | —                                                        | Theme persistence = fe-settings' leg                                                                                                                                                                                                 |
| fe-codec-patterns              | N/A         | —          | 2      | —                                                        | `SyncStatus` renders nowhere live (→ notes ELC-6)                                                                                                                                                                                    |
| fe-codec-viewmodes             | N/A         | —          | 0      | —                                                        | —                                                                                                                                                                                                                                    |
| fe-codec-controls-refinement   | N/A         | —          | 1      | —                                                        | mobile (M4)                                                                                                                                                                                                                          |
| fe-codec-primitives-refinement | N/A         | —          | 1      | —                                                        | Calendar "Today" SR label                                                                                                                                                                                                            |

**Totals (corrected after critique):** **10 feature surfaces: 0 fully live** (4 PARTIAL · 6 STUB) · **ORPHANs: 59 rows → ~52
distinct → ~44 roots** (A20 · B17 · C16 · D6, after the corrections below; dedupe table §1b) · **≈196 EC rows audited →
22 ❌ diverged** (A11 · B7 · C3 · D1) · 14 CODEC units N/A-by-role, confirmed with evidence.

### §1b Corrections + de-duplication (G1 critique)

| Change                                                                                                                                                                                | Effect                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Backlinks split out of A ORPHAN #1 → **BORROWED (HARD-3)** (`hard-3-graph-backlinks.md:9`; process.md §3)                                                                             | A ORPHAN rows unchanged, but backlinks leave the "never flipped" set |
| fe-notes EC-18b/c/d/e, EC-20, EC-21 → **⏳ RIDE-homed** (A §C marks them HOMED to fe-tasks/fe-projects, `a-notes-home.md:73-74`)                                                      | A ❌ 17 → 11 · total ❌ 28 → 22                                      |
| C ORPHAN #2 "#17 fe-cmdk never minted" **dropped**: #17 shipped gated via UI-4/UX-2 reuse (`decisions.md:1156`; `fe-shell.md:13`); residual = BSE-15                                  | C 17 → 16                                                            |
| A#13 SP-29 ≡ C #69 SP-29 · A#11 mode memory ≡ C#7 · A#8 templates ≡ C#5 · A#19 export ≈ C BSE-19…22                                                                                   | **~52 distinct** (A's duplicate of C counted once)                   |
| #31/ui-3 root (6 rows) · #69 export cluster (5) · Spaces (SP-29 + `listSpaces`)                                                                                                       | **~44 roots**                                                        |
| One leg, one status: mode memory = **PARTIAL** (in-memory only); home arrangement = **PARTIAL** (owned by fe-home, persisted by fe-settings); SavedView config = **BORROWED → notes** | single status per leg                                                |
| A ORPHAN count: 21 → 20 (the backlinks row moves to BORROWED)                                                                                                                         | 59 rows total                                                        |

### §1c Systematic gaps the schema missed (added, not left implicit)

- **ELC-6 (honest states):** fake-success states are debt. `usePreferences` hard-codes `state:'success'`, home widgets
  hard-code `success`, and gamification sets `isPending:false`. Each entity-rescope sweep checks ELC-6 explicitly.
- **ELC-7 (live on real OPFS):** no unit recorded a live-store Visual Gate, so **every** entity owes one at its close (by
  definition; nothing to census).
- **ELC-8 (currency homes):** every entity has its `current-*` pair: notes · journals · preferences · notifications ·
  gamification (`docs/modules/*`) · sessions (`docs/features/sessions-and-scheduling/`) · spaces (`docs/core/spaces/`).
  App-shell surfaces (shell, onboarding, settings UI) use their layer `CLAUDE.md`.
- **ELC-4 vs a pinned optimistic EC (doc-resolved, not a question):** BR-RT-4 is "no optimistic updates **by default**"
  (`web-client-runtime/current-business-rules.md:18`). A Victor-pinned EC that mandates optimistic + revert (fe-settings
  EC-7) is the explicit exception and is honored. Gamification's optimistic-local is checked against its own ECs at its unit.

## 2. What the census proves (the triage, now measured)

1. **"Done" ≠ usable, everywhere.** No shipped feature surface meets the ELC. Even notes, after three go-lives, is PARTIAL.
2. **Registration is necessary but not sufficient.** Notes _is_ registered, and the service methods exist, yet 10 of its legs are still stub or DEV-only.
   Go-lives flipped a few hooks; nobody owned the rest of the entity.
3. **The debt reaches the backend (group work).** Four surfaces need `@vida/core` reads that **don't exist**:
   `findActiveSession` (nearest: entity-scoped `findOpenSessionForEntity`) · a gamification ledger read (`listConsequences`) · a spaces list read · an applied-effects read. Verified absent under any name. Notifications' #46 engine is built; it only needs constructing.
4. **The Envision route was lost exactly where Victor said.** fe-notes diverges on **8 of 30** ECs (another 6 are planned rides into fe-tasks/fe-projects); fe-home EC-3
   (the inline-block journal) diverges, and #151 SKIPped without carrying it.
5. **#69's wiring obligation is real debt:** of 11 legs, 2 landed, 2 are borrowed (DB-8 · HARD-3), and **7 are ORPHAN**.
   The scope was copied into fe-shell's task Goal and never into its slice-map. (#17's ⌘K shipped by reusing UI-4/UX-2, `decisions.md:1156`; the residual is BSE-15.)

## 3. Old #69 RIDE-leg trace (summary; full table → census/c-shell-codec.md §Old #69)

Landed: BSE-16, BSE-24 · Borrowed: BSE-14 → DB-8, BSE-23 → HARD-3 · **ORPHAN (7):** BSE-15 search-provider consumer
swap · BSE-19/20/21 MD/PDF/DOCX serializers · BSE-22 export dialog · SP-29 Space add-menu · XCU-14 view degradation.

## 4. Cross-unit defects (fix at the owner, `cross-unit → owning doc`)

- **`offersEditor` rejects 4 of 6 page types** (`apps/web/src/entity/adapter.ts:33-34` gates on `ENTITY_TYPES`, which lacks
  `task_note`/`task_group_note`/`milestone_note`/`deliverable_note`, `packages/core/src/db/schema/_registry.ts:5-8`).
  Those pages would open with **no editor** (fe-notes EC-15). It is **latent**: no live surface creates those types yet, but it
  blocks the fe-tasks/fe-projects overviews. Owner: fe-codec-entity-facet. Fix direction: gate on **page type**
  (`@vida/types note.ts:27`, CHECK `033_notes.ts:42`), not on `ENTITY_TYPES`, which is the polymorphic-reference registry.
- **TZ bug:** `notes/live-mappers.ts:25-27` derives the calendar date via `toISOString()` (UTC), so notes file on the
  wrong day near midnight in BRT (the TZ-forced-test class).
- **Empty excerpts:** `live-mappers.ts:43` sets `excerpt: ''`, so every live list card shows an empty line.
- **journals registered but idle:** `useJournalSummary` never calls `buildDashboard`. When HARD-1 providers land, the
  hook still has to be flipped; it is not automatic.
- **One "#31 / ui-3" orphan root** behind 6 orphan rows (A#4,5,6,7,14,18) (integration-block real bodies · palette compute · `[[` trigger),
  cited by fe-notes, fe-home and canvas-editor. Home it **once**.
- **Stale "M1 stub / would throw" comments** in live code (`use-notes-rows.ts:5-9`, `use-note-entity.ts:3-5`,
  `note-entity.tsx:9`, `preferences-store.ts:7-9`), plus dead or duplicated seams (`canvas-editor.tsx`,
  `page-binding.ts`, `home/journal-contribution.ts`). Currency debt.

## 5. For Victor's review (the two lists)

- **ORPHAN list (~52 distinct; see §1b):** per-section, de-duplicated within each: [A §ORPHAN](census/a-notes-home.md) ·
  [B §ORPHAN](census/b-system-features.md) · [C §ORPHAN](census/c-shell-codec.md) · [D §ORPHAN](census/d-foundation-codec.md).
  G2 homes every one (a debt unit · an existing issue · HARD-1/HARD-3/DB-8 · or a documented `⚠ INTENDED-later`).
- **EC divergence list (22 ❌):** per section §EC divergence. **Each needs your call at its debt unit: correct the build
  back to the EC, or re-pin the EC** (process.md §2.5 rule 3). Two are re-pins you already made (shell-scope EC-3/EC-4,
  recorded in `decisions.md:1155` but not in `envision.md`), so they only need writing into `envision.md`.

## 6. Feeds G2 (the shape the decomposition will take)

Debt units = **entities run through entity-rescope**, closing on the ELC, reusing existing homes first:
notes · home (+journals) · settings/preferences (+theme persistence) · notifications (← #46 engine) · gamification
(+ backend read) · sessions (hud + runtime + flow-session; + backend reads) · shell (+ placement, modules panel, the
#69 orphans or #17 fe-cmdk) · spaces/shell-scope (+ `listSpaces`; + the #13 engines via first consumers) · onboarding
(EmptyState consumers). Cross-unit: entity-facet `offersEditor` · the #31 root · the TZ/excerpt bugs. Borrowed:
HARD-1 (dashboard/summary) · HARD-3 (graph/backlinks) · DB-8 (search).

## 7. Gate record

- Census assembled from 4 auditor sections (2026-10-21).
- Independent critic: **REVISE** (82 rows verified directly + all 61 ORPHAN / 28 ❌ rows reconciled, ≈33% touched; 6/82 wrong ≈ 7%). Blocking 1–4 fixed (double counting · backlinks → HARD-3 · 6 RIDE ECs → ⏳ · #17 drop); nits 5–10 folded; systematic ELC-6/7/8 gaps added as §1c; ELC-4 conflict doc-resolved (BR-RT-4 "by default").
- Victor review of §5 → pending.
