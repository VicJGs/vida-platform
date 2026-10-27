# Task: notes-rescope
# Status: in-progress — Step 6: R1 page frame DONE (Visual Gate ACCEPTED by Victor 2026-10-27); next R2 mode memory (§XXVI gate 1)
# Worktree: .claude/worktrees/notes-rescope (branch notes-rescope, pushed; Node 24)
# Linear: LIF-245
# Profile: Add Frontend Component
# Scenario: entity-rescope
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: golive-replan G2 debt-plan.md rev 3 + G3 g3-order.md
# Title: Notes & Pages live close: remaining legs, #31 inline blocks, 8 diverged ECs

## Goal
Notes & Pages live close: remaining legs, #31 inline blocks, 8 diverged ECs. Run the entity through `entity-rescope` and close on the Entity Live Close
(`docs/specs/foundation/golive-replan/process.md` ELC-1…9): every pinned Envision EC (incl. inherited) re-verified live;
each ❌ EC corrected or explicitly re-pinned by Victor.

## Scope (census rows → `docs/specs/foundation/golive-replan/coverage-report.md`)
metadata · attachments · `[[` picker + trigger · link preview · templates · view-config · rename/delete · mode memory · the #31/ui-3 root (integration-block bodies · palette · `[[` trigger) · ❌ EC-5/7/10/11/13/15/18/18a · offersEditor page-type gate · TZ date bug · empty excerpt · collection `degraded` + XCU-14 · SyncStatus live · dead seams · `useJournalSummary` hook flip · backend: templates S3–S5 (append to docs/features/templates/delivery/slice-map.md, RATIFY) + XCU-14 view fields (docs/features/views/delivery/slice-map.md)

## Ledger home
docs/features/notes-and-pages/delivery/ — entity-rescope writes reconciliation.md + slice-map.md here

## Dependencies
- blocked by `data-plane-wiring`
- ~~soft: preferences-rescope~~ — DROPPED at the Interpretation Gate: mode memory lives in `app_state`; Preferences are singletons (PR-3, `preferences/business-rules.md:11`) (interpretation.md §5 #3)
- depended on by: journals-rescope · fe-tasks · fe-projects

## Active Tasks (slice-map R0…R10 — `docs/features/notes-and-pages/delivery/slice-map.md`)
- [x] R0 — data safety (2026-10-26 · 853570e · 84b7f58 · a6bd158 · f2c35cc)
- [x] R1 — page frame (2026-10-27 · 532e5ce · 82b0a0d · 6e54402 · 1e8105b)
- [ ] R2 — mode memory  ← NEXT (§XXVI gate 1)
- [ ] R3 — metadata + rename
- [ ] R4 — attachments
- [ ] R5 — delete, undo, OS-wide Trash (must call `useNoteContent.cancel()` before the soft delete — R0 forward obligation)
- [ ] R6 — collection + saved views
- [ ] R7 — editor seams + `[[` links
- [ ] R8 — blocks as widgets + capability registry
- [ ] R9 — entity-based templates (the template writer must clear `latestBody(id)` first — R0 forward obligation)
- [ ] R10 — Entity Live Close

## Knowledge Loaded (session 2)
- standards/{process,engineering,components,design,motion}.md — Step 6 open
- memory: visual-gate-playbook · tracker-sync-from-worktree-is-unsafe · tracker-sync-task-header-gotchas ·
  better-sqlite3-abi-must-match-running-node · heavy-tamagui-shell-tests-flake-under-concurrent-load ·
  mutation-check-restore-from-copy-never-git-checkout · worktree-apps-web-ui-symlink-resolves-to-main — R0 build/gates

## Failures This Session (session 2)
- F001 — better-sqlite3 ABI 137 vs Node 20 (shell didn't keep `nvm use 24`) — resolved: `nvm use 24` in every command
- F002 — full suites killed/"no tests" under concurrent load (dev server + parallel preferences-rescope session) — resolved: run suites alone
- F003 — live B-53 warm FAILED (flush-time write-through too late; route swap renders incoming first) — resolved: §XXVIII DEV-R0-1
- F004 — live "no write on mere open" FAILED (normalized `content: []` ≠ ProseMirror toJSON) — resolved: drop empty content key
- F005 — `/tmp/vg` playwright-core gone; scratchpad removed mid-session — resolved: repo pnpm-store playwright-core, `.playwright-mcp/` (ignored)
- F006 — `@testing-library/user-event` not an apps/web dep — resolved: `fireEvent`
- F007 — status header `in_progress … DONE` would sync LIF-245 as Done (substring match) — resolved: `in-progress … shipped`

## Route History
- 2026-10-26 (Step 0 — baseline) — Worktree `.claude/worktrees/notes-rescope` off origin/main @ 78d02d8. document-context BASELINE over BOTH planes (① services/notes full; ② apps/web/src/notes 31/31 non-test full). Refreshed `docs/modules/notes/current-{spec,business-rules}.md`: ① citations re-anchored, `ensureJournal` + BR-7b (listPages includes archived) + BR-7c (writes ignore deleted_at) added, BR-10 wording corrected; ② surface plane documented (hooks LIVE/STUB table, components, editor gate, BR-SUR-1…9). Baseline findings feeding reconciliation: `offersEditor` excludes the 4 `*_note` types (EC-15) · UTC `ymd` row date (TZ bug) · empty excerpt · `degraded:[]` + no SyncStatus · no `[[` input rule · 8 stale "no composition root" headers · journals registry empty in apps/web.
- 2026-10-26 (Step 1 — Documentation Gate: FAIL → remediated → PASS) — Audit FAIL (9 blocking): the 5 N&P aspect docs + intake were deleted by the MOD-notes teardown (eaf64f8, 2026-09-13) and never restored though features/README:36 + docs/README:96 list them ✅. Restored to the original paths from eaf64f8^ and realigned to the rebuilt schema (3 owned tables, no FKs, entity_links/tags = AR-6 substrate), ADR-004/006/007/008/009/021 and the Step-0 baseline; intake kept as-is (append-only notes). Grounded 14 "UNKNOWN" items: 7 doc-resolved (offersEditor → page type per debt-census:84-88 = NP-10; delete = undo + Trash 30 days per quality-bar P4; rename = updatePage; `[[` = suggestion surface; preview M1 = EC-11; SyncStatus M1 states; G6 backlinks half = EC-6). Independent critique round 1 REVISE (8 blocking — incl. an unsupported CAP-12 re-home of mine, REVERTED; archived-hidden + NP-12 overclaims retagged), round 2 REVISE (2 line-shift cite defects → notes moved to file ends, append-only verified by diff) → PASS. EC-18a re-homed fe-journals → notes-rescope in fe-notes slice-map (per coverage-report:64). 13 UNKNOWNs remain, each homed to a named step of THIS unit: Interpretation Gate ×8 (delete-leg scope, archived/journals in /notes, mode-memory storage + per-type defaults, has_pomodoro setter, block bodies vs placeholder, /notes views row, G6 creation half, CAP-12 page applicability → Step 4) · slice PLANs ×4 (purge timing, excerpt rule, summary_config→JournalSelection, icon domain/cover ref, attachment upload UX) · Step 5 templates append ×1 (page-doc authored line). Recorded deltas incl. BR-SUR-3 data-loss risk (malformed content → null → next edit overwrites).
- 2026-10-26 (Step 2 — Interpretation) — Rewrote docs/features/notes-and-pages/delivery/interpretation.md as the cross-plane RESCOPE interpretation (supersedes the ① build's, kept at ef8c1ed): dependencies per plane + borrowed legs, a NEEDS-per-leg table (missing ① ops: restorePage + deleted read; missing editor `[[` suggestion seam; missing mode store; templates instantiate/capture), OWNS/CONSUMES/DELEGATES, IR-R1…R12 (incl. delete must cancel the pending body flush; malformed-content overwrite guard; Home shares the body), and 8 items for the Interpretation Gate.
- 2026-10-26 (Step 3 — Interpretation Gate, round 1) — Critique REVISE (10 blocking: un-composed Views/Templates/Capability (ELC-3) · ADR-008 registry dep · closed @vida/editor (no injection, no wikiLink node) · IR-R1 contradicted the per-panel ladders · restore vs NP-2/NP-8 clash · soft delete doesn't cascade · every update moves the calendar row · listPages can't exclude archived · scope rows :81/:228-274 + DEPENDED-ON-BY · ELC-9 EC→leg map). Grounding: items 6/8 RESOLVED, 4 OUT-OF-SCOPE, 1/2/3/5/7 resolved from the docs (Empty Trash IN + notes-scoped Trash; /notes default = live `note` pages; mode memory → app_state, preferences edge dropped; bodies here = /summary /entity-link /backlink; `[[` creates entity links per cross-module-integration:125). Interpretation rewritten; aspect-doc UNKNOWNs pointed at §5. Open for Victor: Q1 per-type default mode values · Q2 EC-10 re-pin.
- 2026-10-26 (Step 3 — Interpretation Gate PASS) — Round 2 REVISE (journals vs G3 · EC-16/17 · entity_links in IR-R12 · mode-memory grounding) + Victor's two rulings ("check the documentation"): Journals is its own module → journals out of /notes, EC-18a journal Overview + ORPHAN#12 + journal views/day surface re-homed to journals-rescope (coverage-report, debt-plan, fe-notes slice-map, journals-rescope task amended); `[[` candidates = every OS entity that is a page → EC-10 re-pinned (page → page_links, entity → entity_links). Consequence: EC-1 re-pinned to List · Gallery · Neural (no Calendar in /notes). Q1 closed by EC-4 (note = tabbed, editor active). Round 3 REVISE (EC-1 Calendar leftover, Envision carry list) → fixed → PASS. Memory: 9th repeat of ground-before-asking recorded.
- 2026-10-26 (Step 3.5 — Envision Gate APPROVED) — Greybox (real @vida/ui + shipped notes views, fake data) reviewed by Victor; picks: rename = inline title AND ⋯ Rename; Trash = one OS-wide system surface. Changes requested + grounded: graph lands with HARD-3 (M1.4, #118) → /notes Graph stays honest-empty; templates are entity-based (EC-13 re-pin, ADR-009 bundles; module writers register per entity type); blocks are widgets + `/task` creates-or-binds (EC-32 rewritten, EC-36 added). EC-25…36 pinned. Greybox deleted; screenshots in delivery/envision-evidence/. Step-5 carries: OS-wide Trash surface + IA row + deleted-items seam; /task + /habits body ownership; capability-framework:239 template row.
- 2026-10-26 (Step 4 — Reconciliation, DRY) — Ledger docs/features/notes-and-pages/delivery/reconciliation.md: 184 rows over both planes (A ① · B ② · C editor · E/F/G dry-pass adds) + EC sweep (fe-notes EC-1…24, EC-25…36, inherited CODEC ECs) + impact scan (12 shared contracts, 0 untreated). Dry passes 10→10→1→0. Headline: data-loss paths (B-50/C-46, E-1, B-52/53), EC-15 live bug, dead prod affordances, first-consumer engines (views, templates, capability, Trash seam), fe-shell-scope EC-3 collides with the OS-wide Trash (re-pin at Re-scope Gate).
- 2026-10-26 (Step 5 — Re-scope Gate, slice-map drafted) — delivery/slice-map.md: R0 data safety → R1 page frame → R2 mode memory → R3 metadata+rename → R4 attachments → R5 delete+OS-wide Trash → R6 collection+views → R7 editor seams+[[ → R8 blocks as widgets+capability → R9 entity templates → R10 live close; every ledger row + every structural EC mapped. Awaiting Victor: plan approval + fe-shell-scope EC-4 re-pin (Trash in the System list).
- 2026-10-26 (Step 5 — Re-scope Gate APPROVED) — Victor approved slice-map R0…R10; fe-shell-scope EC-4 re-pinned (Trash in the System panel; EC-3 strip unchanged), recorded in fe-shell-scope envision.md. Next: Step 6 R0 data safety — §XXVI PLAN (gate 1).
- 2026-10-26 (Step 6 · R0 gate 1 — APPROVAL 1) — 1a: docs/editor/current-* refreshed (#7 S1 drift: `chrome`, EC-7 text colour, blockquote/taskList; BR-E1-6). PLAN-R0-data-safety.md rev 3: independent critique r1 REVISE (4 blocking: B-53 needs write-through · always-on check rejects our own seeds `{doc,content:[]}`/empty text — reproduced on 3.30.0 · no-write mechanism (setEditable emits update) · headers+journals currency) → r2 REVISE (B-53 cold cache → read-after-write barrier) → r3 SHIP (+3 impl conditions = BR-R0-8b). Victor approved.
- 2026-10-26 (Step 6 · R0 data safety — DONE) — Gate 2: IMPLEMENTATION-PLAN (preflight PASSED; critique r1 REVISE → r2
  SHIP) → Approval 2. Build steps 1–6 green; step 7 live leg (Brave + playwright-core, real OPFS — macOS 12 can't run
  Playwright Chromium) caught B-53 STILL OPEN for warm caches (route swap renders the incoming body before the outgoing
  unmount flush) → §XXVIII **DEV-R0-1** (seed-point latest-body overlay + ownership re-save; deviation critique r1 REVISE
  → r2 SHIP) → Victor approved. Found + Victor-approved **DEV-R0-2** (undo-to-stored within the debounce wrote the undone
  doc — pre-existing). Post-impl /critique r1 REVISE (in-flight undo window → `expected` dedupe; a11y live region narrowed;
  setContent measured + pinned) → r2 SHIP (+ sticky inherited handover). Live OPFS 18/18 · Visual Gate 18/18 + ACCEPTED by
  Victor (VoiceOver trace not done — accepted on automated a11y) · core 2049/2049 · editor 237+ · web 832/832 · tsc/lint
  clean. Commits 853570e (core) · 84b7f58 (editor) · a6bd158 (web+e2e) · f2c35cc (docs). Forward obligations: R5 delete
  calls `cancel()`; R9/import/M4 body writers clear `latestBody(id)` first. Noted out of scope: `/favicon.ico` 404 (main too).
  Next: R1 page frame — §XXVI gate 1.
- 2026-10-27 (Step 6 · R1 gate 1) — 1a: notes current-* current (no apps/packages commit since f2c35cc; surface plane
  already covers entity/adapter + home region). PLAN-R1-page-frame.md: independent critique r1 REVISE (6 blocking: "Untitled
  task" false — the seed H1 carries the parent title → "<Type> note"; 2 statuses on a locked page → chip hides; observer =
  subscriptions + tabbed-Overview case; Retry vs retry:1 → `retrying`; live-smoke methods; EC map) → rev 2 → r2 SHIP → rev 3
  (non-blocking folded). Grounded, not asked: page gate = new fn + `gate` field (entity gate unchanged); ⋯ hidden until R3
  (no dead affordance), EC-34 "beside ⋯" closes at R3; journal Overview stub removed (EC-18a + journal /summary → journals-
  rescope); parentName fed by R7's A-33 label seam (forward obligation); DEV `?readerror` flag. Victor: APPROVED (Approval 1).
- 2026-10-27 (Step 6 · R1 gate 2) — /preflight PASSED (5 assumptions resolved). IMPLEMENTATION-PLAN-R1: critique r1 REVISE (2
  blocking: v5 resets a no-data query to pending on refetch → R-6 errorUpdateCount-based `retrying`; Home chip 34 px +
  self-aligns left → R-3) → rev 2 → r2 one leftover (Step 5 Home bullet) → rev 3 = SHIP. Victor: APPROVED (Approval 2).
- 2026-10-27 (Step 6 · R1 build) — Steps 1–7 tests-first, green: web 890/890 · tsc 0 · lint 0 errors · 532e5ce. Live leg
  (Brave, real OPFS): e2e/notes-page-frame.spec.ts 2/2 (B10–B12) · R0 spec still green · prod build: 0 `readerror` in
  dist. Visual Gate script 34/34 (axe 0 · one chip per host · Retry by keyboard). Own screenshot review found DEV-R1-1:
  375 px title squeeze (chip shares a no-wrap TitleRow; the greybox had it too) + a pre-existing EntityView title
  lineHeight bug → @vida/ui change proposed (plan said untouched) → awaiting Victor with the Visual Gate.
- 2026-10-27 (Step 6 · R1 close) — Victor: DEV-R1-1 "Fix it now" → EntityView title row wraps + title lineHeight (6e54402),
  re-shoot 34/34 (one run discarded: Vite reload sent the page Home). Full suite: 4 unrelated files timed out under load
  avg 52–89, 30/30 alone. /component-audit 8.5. Final /critique SHIP; folded: A5 UI test, EntityView line-height test
  (mutation-killed), lineheight-unpaired entry closed, citation/header nits, formatting; follow-ups homed: R3 focus-after-
  Retry + ⋯ panel labelledby, R5 notifyError/toast bound, M4 save-status clear(id).
- 2026-10-27 (Step 6 · R1 — DONE) — Visual Gate ACCEPTED by Victor (re-shoot after DEV-R1-1). Next: R2 mode memory.
