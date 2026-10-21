# G4 Ledger — every tracker write, with rollback (the only outward gate)

> **Status:** G3 part 3 (draft), 2026-10-21. **Nothing here is executed until Victor approves this ledger** (G4).
> Precedent: `frontend-replan/g6-edge-ledger.md` (inventory → map → approval → rollback; no retire before its
> replacement exists). Inputs: `debt-plan.md` rev 3 · `g3-order.md` · the reconciled structure (part 2).
> **Execution venue:** the **main checkout** after PR #152 is merged and `main` pulled. `tracker_sync` from a worktree is
> unsafe (memory `tracker-sync-from-worktree-is-unsafe`). The map `.claude/tasks/.tracker-map.json` is gitignored there.

## 0. Preconditions (all must hold before any write)
1. PR #152 merged; main checkout on `main`, pulled; its uncommitted LIF headers (LIF-237/238/239) **committed first**
   (EST §4).
2. The §5 local edits are committed (8 new task files · `_projects.md` gains `M1.2.4` after `M1.1.2` · the header fixes).
   `tracker_sync.py --status` → **0 warnings** (an unlisted milestone prints "created (typo?)", hence the `_projects.md` entry).
3. `--sync --dry-run` is offline and prints every task. **Gate:** in its output, the only `CREATE` lines are the 8 §1 slugs
   (+ home-journal-go-live, §4), and the only new relations are §1/§2's. Anything else stops the run. If the orphan-create
   guard trips on unrelated pre-existing items, re-run with `--allow-orphan-create` only after naming each item (G6 precedent).

## 1. CREATE: 1 milestone + 8 issues (project M1 — Whole Manual OS)
**Milestone:** `M1.2.4 — Live Close: shipped-surface debt` (ProjectMilestone under M1), created by sync from `_projects.md`
(listed right after M1.1.2, so `--next` routes: mod-routines → M1.2.4 debt → M1.1.3 → surfaces). The task files are already
authored (`.claude/tasks/*-rescope*.md`, reviewed with this ledger).

| Slug (task file) | Title | Profile / Scenario | Blocked-by |
|---|---|---|---|
| preferences-rescope | Preferences live close: Settings + onboarding writes persist, the hub | Add Frontend Component / entity-rescope | data-plane-wiring |
| notes-rescope | Notes & Pages live close: remaining legs, #31 inline blocks, 8 ECs | Add Frontend Component / entity-rescope | data-plane-wiring |
| sessions-rescope | Sessions debt: HUD + runtime live, 2 core reads (entity close → fe-sessions) | Add Frontend Component / entity-rescope | data-plane-wiring |
| gamification-rescope | Gamification live close + ledger read | Add Frontend Component / entity-rescope | preferences-rescope |
| shell-rescope | Shell (X-CUT) live: dock mounted, placement, Modules panel, search swap, export | Add Frontend Component / entity-rescope | preferences-rescope |
| notifications-rescope | Notifications live close: #46 engine wired | Add Frontend Component / entity-rescope | sessions-rescope |
| journals-rescope | Journals live: EC-3 inline-block journal (early slices) | Add Frontend Component / entity-rescope | notes-rescope · preferences-rescope |
| journals-rescope-dashboard | Journals dashboard + ENTITY CLOSE: EC-4 + 11 widgets (⊕split sub-issue) | Add Frontend Component / entity-rescope | journals-rescope · hard-1-summary-registry · notes-rescope |

### §1b Manual steps sync can't do (GraphQL, recorded in §7)
- **Titles:** sync uses the slug as the title, so `issueUpdate(title)` sets each §1 Title (also in each task file's `# Title:` line).
- **Sub-issue link:** sync never passes `parent_id`, so `issueUpdate(parentId = journals-rescope)` on journals-rescope-dashboard.

Soft edges (notes ← preferences, notifications ← preferences, shell ~ DB-8) are **not** encoded as `blocked-by`. They
are recorded in each task file's Dependencies as `soft:` notes, so they don't false-block routing.

## 2. ADD RELATIONS on existing issues (blocked-by)
| Existing issue | Gains `← blocked by` | Why |
|---|---|---|
| fe-sessions (LIF-198) | sessions-rescope | holds the sessions ENTITY CLOSE |
| fe-tasks (LIF-201) | notes-rescope | `offersEditor` page-type fix + RIDE overviews |
| fe-projects (LIF-194) | notes-rescope | same |
| note-open-behavior-preference (LIF-238) | preferences-rescope | needs a Settings control |
| hard-4-polish (LIF-115) | all 8 new issues (local Dependencies lines + sync) | M1 can't close with debt open. Its **35** existing blockers = 28 `fe-*` surfaces + 7 hardening; **no fe-codec units** (CODEC met through consumers, process.md §5) |

## 3. SCOPE COMMENTS on absorbing issues (comment only, no description overwrite)
Sync has no comment support, so these are **manual `commentCreate`** calls, each id recorded in §7. The durable copy is the
local task file: the same text is appended to each absorbing task file's Goal (§5), so the debt doesn't live only in a Linear comment.
Each comment names the census rows it absorbs and links `debt-plan.md` §2: fe-spaces-page (LIF-220: `listSpaces` backend
slice via Service Build Flow · SP-29 · #13 Spaces engine · ADR-006 amendment · EC-3/4 re-pins → envision.md) · HARD-1
(LIF-112: provider data for journals-rescope-dashboard) · HARD-3 (LIF-114: backlinks · neural graph · 10K perf) · DB-8
(LIF-70: live FTS; re-verify ⌘K/notes search at close) · fe-tasks / fe-projects (RIDE ECs · entity-write Capability) ·
fe-books (LIF-178: reader EC-8 · BK-4) · fe-purposes-and-goals (LIF-195: board EC-2) · fe-calendar (LIF-203: "Today"
SR label; S7 closes under the ELC) · hard-4-polish (LIF-115: 4 low CODEC polish rows).

## 4. RE-HOME / STATUS (existing issues, the go-live history)
| Item | Action |
|---|---|
| data-plane-wiring (LIF-237) | **move project General → M1** (filed under a nonstandard milestone, MVP-PATH refresh 2026-10-21) · milestone **M1.1.3** · status Backlog → **Done** (PR #148) |
| notes-entity-usability (LIF-239) | milestone **M1.2.4** · status Backlog → **Done** (PR #150), recorded as repaid debt |
| fe-calendar (LIF-203) · mod-routines (LIF-138) | Backlog → **In Progress** (work live on unpushed branches; S4/S7 and S3/8) |
| home-journal-go-live (no LIF) | **mint as Done** in M1.2.4 (PR #151) so the history is tracked |
| fe-notes-golive (PR #149, no task) | no issue; recorded in notes-rescope's reconciliation ledger as already-landed |
| module-go-lives (no LIF) | local only: archive the task file (`SUPERSEDED`, R6 already applied) |
| Status drift (confirm with `--verify` first) | fe-gamification LIF-181 (PR #140) · fe-shell LIF-199 (PR #118) · fe-session-hud LIF-217 (PR #144) · fe-codec-collection LIF-207 · fe-codec-canvas-graph LIF-205 (structure §5) → **Done** where Linear lags the merged PR. *(#142 = fe-shell-content-inset, #143 = fe-session-runtime.)* Applied via each task file's `# Status:` line (sync re-applies file state). |

## 5. Local edits (committed BEFORE any write; precondition §0.2)
- **New:** the 8 task files (§1) · `_projects.md` gains `- M1.2.4 — Live Close: shipped-surface debt` after M1.1.2 (done in G3).
- **Re-home headers (what makes §4's moves actually happen; sync reads Project/Milestone from the file):**
  `data-plane-wiring.md` gains `# Project: M1 — Whole Manual OS` + `# Milestone: M1.1.3 — Depth & Recovered · Backend`
  (replaces the free-text milestone that filed LIF-237 under General) · `notes-entity-usability.md` gains `# Project: M1 …` +
  `# Milestone: M1.2.4 — Live Close: shipped-surface debt` · `home-journal-go-live.md` gains Project + Milestone M1.2.4 +
  `# Status: done`.
- **Absorbing issues' Goals** (fe-spaces-page · hard-1 · hard-3 · db-8 · fe-tasks · fe-projects · fe-books · fe-purposes-and-goals ·
  fe-calendar · hard-4-polish) gain the §3 scope text. `db-8-fts5-search.md` explicitly gains "re-verify ⌘K/notes search live
  at close (shell-rescope swapped the seam)".
- **Dependencies lines:** fe-sessions · fe-tasks · fe-projects · note-open-behavior-preference · hard-4-polish gain the §2 `blocked by`.
- **Status hygiene:**
`data-plane-wiring.md` (Status → done, Build Steps → "built via PR #148") · `home-journal-go-live.md:2` (→ MERGED #151) ·
`db-10-seed-and-fixtures.md:7-14` (drop the "superseded / Phase 1.0" lines; it is homed at M1.4 #93-equivalent) ·
TASKS.md rows for fe-gamification / fe-shell / fe-session-hud (→ ✅ merged) · `mod-routines.md:2` (paused → in_progress;
S3/8 in its worktree) · session-log: append a dated correction (mod-routines was S3/8, not "not started"). Never rewrite
an old entry.

## 6. Rollback (sync re-applies every task file's state on every run, so rollback is file-first)
- **Creates:** `tracker_sync --retire <slug>` (→ Canceled) **and** archive the task file. Canceling in Linear alone gets
  reverted by the next sync. The milestone can be deleted once empty; remove its `_projects.md` line too.
- **Relations:** GraphQL `issueRelationDelete` **and** remove the local Dependencies line in the same step (add-only sync re-adds it).
- **Status / project / milestone moves:** restore the prior header in the task file (recorded in §7), then sync.
- **Titles · parent link · comments:** `issueUpdate` back to the slug / `parentId: null` / `commentDelete` (ids in §7).
- **No existing issue is deleted or retired** by this ledger.

## 6b. Amendments found by the §0.2/§0.3 gates (2026-10-21, §XXVIII, logged before any write)
- **A1 · golive-replan tracked** as the campaign umbrella in the existing `M1.2+ (frontend surface tier — cross-milestone)`
  milestone (precedent: frontend-track LIF-202, backend-replan LIF-163). Its free-text header would have minted a junk milestone.
- **A2 · note-open-behavior-preference** gets `# Project: M1` and **no milestone header** until its milestone is derived. Its
  free-text `# Milestone:` would have minted a junk milestone. The text is kept as `# Milestone-note:`.
- **A3 · archived task files are never synced** (`tracker_sync.py:1044-1048`), so the status drift on LIF-217 / LIF-207 /
  LIF-205 is fixed by a **manual `issueUpdate(state=Done)`**, not by their `# Status:` lines.
- **A4 · `in_progress` (underscore) normalizes to BACKLOG** (`config/tracker.config.json` stateMap). That is the root of the
  fe-calendar/mod-routines drift; both now say `in-progress`.
- **A5 · post-write cleanup:** the three junk milestones under the General project (`M1 / M1.1.3 … DERIVED`, `M1 — per-module
  usability` ×2) are deleted **once empty**, after the re-homes move LIF-237/238 out.

## 7. Execution record (G4 executed 2026-10-21 from the main checkout, branch `golive-g4`)
| Step | Result | Linear ids |
|---|---|---|
| §0.1 local edits | committed `651b83e` (+ amendments `423a88a`) | — |
| §0.2 `--status` | 0 warnings (after A1/A2 header fixes) | — |
| §0.3 `--sync --dry-run` | matched ledger + A1 exactly | — |
| `--sync` run 1 | milestone M1.2.4 created · golive-replan created (LIF-240). **Orphan-create guard held the other 9** (named LIF-205/207/217) · 329 edges set · 0 failed · 28 deferred | LIF-240 |
| triage (ISOLATED) | the 3 "orphans" were archived Done units whose **local map** lagged (Linear already Done). A3 applied: map corrected (Linear `set_state` no-op). Guard kept ON, no `--allow-orphan-create` | LIF-205 · LIF-207 · LIF-217 (already Done) |
| `--sync` run 2 | 9 created · **357 edges set · 0 failed · 0 deferred** | preferences LIF-247 · notes LIF-245 · sessions LIF-248 · gamification LIF-241 · shell LIF-249 · notifications LIF-246 · journals LIF-244 · journals-dashboard LIF-243 · home-journal-go-live LIF-242 (Done) |
| re-homes (verified by query) | LIF-237 → M1 / M1.1.3 Done · LIF-239 → M1.2.4 Done · LIF-238 → M1 (no milestone) · LIF-242 → M1.2.4 Done | — |
| §1b titles | 10 set (8 debt + LIF-242 + LIF-240) | — |
| §1b parent | LIF-243 parent = LIF-244 | — |
| §3 comments | 10: LIF-220 `6462c43e` · LIF-112 `19ea6580` · LIF-114 `3c5b1d90` · LIF-70 `697c2d6f` · LIF-201 `f791412e` · LIF-194 `f7cada33` · LIF-178 `abb5b9f0` · LIF-195 `ee5339f3` · LIF-203 `46af6bdc` · LIF-115 `f9296b72` | — |
| A5 junk milestones | 3 deleted under General, after verifying they were empty | — |
| `--verify` | all 173 mapped issues live | — |
| `--pull` · `--next` | reconcile complete · next head = mod-routines (M1.1.2), then M1.2.4 L1 ready: preferences · notes · sessions | — |

**Rollback reference (prior states):** LIF-237 General/junk milestone/Backlog · LIF-239 junk milestone/Backlog · LIF-238
General/junk milestone · fe-calendar/mod-routines Backlog. Deleted milestones were empty (re-creatable by name).

## 8. Structure positions (from G3 part 2, `reconstructed-structure.md`, post-critique)
data-plane-wiring **#59** (M1.1.3) · M1.2.4 **#60–66**: L1 #60–62 (preferences · notes · sessions), L2 #63–66
(gamification · shell · notifications · journals) · M1.1.3 remainder #67–71 (EX-5: block split by the routing order) ·
journals-rescope-dashboard **#115** (after HARD-1 #114; EX-1) · HARD-4 **#122** (← 35 + 8 = 43). Total 143, contiguous,
acyclic, all reciprocals present.

## 9. Found during G3, outside this campaign's debt scope (tracked follow-up, not minted here)
- **GAP-2 (DF-12 risk):** the ⛔ schema-amendment gates on fe-routines · fe-purposes-and-goals · fe-health · fe-finance ·
  fe-relationships (`surface-map.md §6.4`) exist only as text, with no issue. They gate **unbuilt** surfaces, so they are not
  shipped-surface debt. Follow-up: a homing pass (first-consumer-pull: each gate lands with its surface's own build)
  before the first of those surfaces starts. Logged in the task Route History.
- **EX-4:** fe-codec-system and fe-cmdk have rows but no LIF: dissolved/folded, never minted (⌘K shipped via UI-4/UX-2
  reuse, `decisions.md:1156`). **No Linear write.** They stay documented in the structure only.
- **EX-3:** note-open-behavior-preference (LIF-238) gets its `#` when its milestone is derived (must be > #60).
