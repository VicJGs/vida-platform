# G6 Reshape Runbook — the turnkey Linear execution plan

> **Status:** PLAN, 2026-10-01. The concrete, ordered, verifiable runbook for executing the approved reshape
> (`g6-edge-ledger.md`) in Linear. **Not yet executed.** Drives `tracker_sync.py` from the task files. **Run from the
> MAIN checkout** (`/Users/victor/Documents/CODE/vida-platform`), never a worktree (empty map → duplicates the backlog).

---

## 0. Pre-flight (safety — do every one before any write)

1. `cd` to the **main checkout**; confirm branch = `main` and clean, and the frontend-track docs are present (merge or cherry-pick first if needed — this runbook + the task-file edits must exist on main).
2. **Map intact:** `wc -c .claude/tasks/.tracker-map.json` ≈ 37 KB (NOT the 239-byte skeleton) and `--verify` lists the real issues (≈135).
3. **Dry-run clean:** `tracker_sync.py --sync --dry-run` shows **no unexpected `[+ create]`** for existing issues (only the genuinely-new reshape units). If it wants to create existing issues → STOP (map stale).
4. Snapshot: `git stash list`, note HEAD; the reshape is reversible in git (task files) but Linear retirements are manual to undo — hence the batches below are small + verified.

## 1. Milestone target structure (where the 42 units live)

| Milestone | Units | Rationale |
|---|---|---|
| **M1.2.1 — Hub & Foundation · Frontend** | Wave 0 codec (#1–13) + Wave 1 shell & cross-cutting (#14–26) | the codec + shell everything inherits |
| **M1.2.2 — Feature Modules · Frontend** | Wave 2a floor-ready modules (#27–32) | validate the codec on real modules |
| **M1.2.3 — Depth & Recovered · Frontend** | Wave 2b schema-gated modules (#33–42) | gated on §6.4 schema amendments |

## 2. The 42-unit master table (the issues to exist after the reshape)

> `origin`: **new** = create · **sup LIF-x** = supersede/retitle existing · **ext UI/DS/UX** = extend a shipped issue (new fe-track issue blocked-by it) · **fold** = merge. `slug` = the task-file name. `dep` = blocked-by slugs.

### Wave 0 — Codec → M1.2.1
| # | slug | title | origin | dep |
|---|---|---|---|---|
| 1 | fe-codec-theme | ThemeProvider — N theme presets × density | ext DS-2/DS-4 | — |
| 2 | fe-codec-patterns | Pattern-kit (empty·sync·motion·voice·reach·provider) + 8-state | ext UX-4 | fe-codec-theme |
| 3 | fe-codec-viewmodes | View-mode renderers — add table + board | ext UI-2 | fe-codec-theme, fe-codec-patterns |
| 4 | fe-codec-collection | Collection shell | ext UI-2 | fe-codec-viewmodes |
| 5 | fe-codec-dashboard | Dashboard shell | new | fe-codec-patterns |
| 6 | fe-codec-entity-facet | Entity shell + Layout/Editor facet (merged/tabbed) | **new** | fe-codec-patterns, fe-codec-collection |
| 7 | fe-codec-canvas-editor | Canvas: Editor (block canvas) | reuse UI-3 | fe-codec-patterns |
| 8 | fe-codec-canvas-graph | Canvas: Graph — editorial ink voice | ext UI-2 | fe-codec-theme, fe-codec-patterns |
| 9 | fe-codec-canvas-reader | Canvas: Reader (read·listen·annotate) | new | fe-codec-patterns |
| 10 | fe-codec-canvas-board | Canvas: Vision-board + Calendar-grid | new | fe-codec-patterns, fe-codec-viewmodes |
| 11 | fe-codec-flow-session | Flow/Session shell — deliverable·attach·proof·log | **new** | fe-codec-patterns, fe-codec-entity-facet |
| 12 | fe-codec-system | System shell | reuse UI-4 | fe-codec-patterns |
| 13 | fe-codec-seams | Composition seams (SavedView·Capability·Template·Spaces) | new | fe-codec-viewmodes, fe-codec-collection, fe-codec-canvas-editor |

### Wave 1 — Shell & cross-cutting → M1.2.1
| # | slug | title | origin | dep |
|---|---|---|---|---|
| 14 | fe-shell | Shell — two positionable content-fit panels + regions | ext UI-4/UX-3 (sup LIF-199) | W0 |
| 15 | fe-shell-scope | Bar 1 + Space-scope selector + 6 global surfaces | new (from LIF-199) | fe-shell |
| 16 | fe-session-hud | Session HUD (region 6) | **new** | fe-codec-flow-session, fe-shell |
| 17 | fe-cmdk | ⌘K command bar (nav spine) | reuse UI-4/UX-2 | fe-codec-system, fe-shell-scope |
| 18 | fe-home | Home — 4-region + arrangement toggle + journal facet | new on UX-6 (sup LIF-187) | fe-codec-dashboard, fe-codec-entity-facet, fe-codec-canvas-editor |
| 19 | fe-calendar | Global Calendar — dueIn cross-module lane | new | fe-codec-canvas-board, fe-codec-seams |
| 20 | fe-spaces-page | Spaces page + create/edit | **new** | fe-codec-collection, fe-codec-seams |
| 21 | fe-sync-log | Sync & Activity Log /sync | **new** | fe-codec-collection, fe-codec-patterns |
| 22 | fe-feature-atlas | Feature Atlas /features | **new** | fe-codec-canvas-graph, fe-codec-dashboard |
| 23 | fe-session-runtime | Session runtime page (deliverable-per-stage) | **new** | fe-codec-flow-session |
| 24 | fe-settings | Settings — net-new controls + searchable index | sup LIF-193 | fe-codec-system, fe-codec-theme |
| 25 | fe-notifications | Notifications inbox + channel matrix | sup LIF-192 | fe-codec-collection, fe-codec-system |
| 26 | fe-onboarding | Onboarding + guided setup | ext UX-5 | fe-codec-flow-session, fe-codec-patterns |

### Wave 2a — floor-ready modules → M1.2.2
| # | slug | title | origin | dep |
|---|---|---|---|---|
| 27 | fe-notes-and-pages | Notes surfaces (Collection+Graph·Note Entity·/summary) | sup LIF-191 | fe-codec-collection, fe-codec-canvas-graph, fe-codec-entity-facet, fe-codec-canvas-editor |
| 28 | fe-tasks | Tasks ⊕split (12-layout·Entity facets·All-Tasks) | sup LIF-201 | fe-codec-collection, fe-codec-entity-facet |
| 29 | fe-habits | Habits (Dash+Collection·per-habit Entity) | sup LIF-182 | fe-codec-dashboard, fe-codec-collection, fe-codec-entity-facet |
| 30 | fe-projects | Projects (Dash+Collection·project Entity·milestones) | sup LIF-194 | fe-codec-dashboard, fe-codec-entity-facet |
| 31 | fe-check-ins | Check-ins (entry Flow·history/trends·Journal widget) | sup LIF-179 | fe-codec-flow-session, fe-codec-collection |
| 32 | fe-gamification | Gamification (System Dash·rule-authoring) | sup LIF-181 | fe-codec-dashboard, fe-codec-flow-session |

### Wave 2b — schema-gated modules → M1.2.3
| # | slug | title | origin | dep (+ ⛔ schema) |
|---|---|---|---|---|
| 33 | fe-routines | Routines (Collection·routine Entity·run-flow) | sup LIF-197 | fe-codec-*, ⛔ routines-v2-service |
| 34 | fe-sessions | Sessions ⊕split (Agenda·Availability·config·templates) | sup LIF-198 | fe-codec-collection, fe-session-runtime, fe-session-hud |
| 35 | fe-learning-education | Learning ⊕split (hub·subject·grading·assessments) | sup LIF-190 | fe-codec-* |
| 36 | fe-books | Books ⊕split (Bookshelf·Hub·Reader·Plans·wizards) | sup LIF-178 | fe-codec-collection, fe-codec-canvas-reader, fe-codec-entity-facet |
| 37 | fe-knowledge | Knowledge ⊕split (Catalog·Lab·Topic·Flashcards·FTS·compound-set) | sup LIF-188 | fe-codec-*, fe-codec-canvas-graph |
| 38 | fe-skills | Skills (landing·Skill Entity·Skill Graph·Def Library) | sup LIF-200 | fe-codec-*, fe-codec-canvas-graph |
| 39 | fe-purposes-and-goals | Purposes ⊕split (Purpose/Target/Value/Dream·Dreams board·Contributions·Reviews) | sup LIF-195 | fe-codec-*, ⛔ purposes-values-contributions-reviews |
| 40 | fe-health | Health ⊕split (Core·Training·Nutrition, umbrella) | **fold** LIF-183 (+retire 184/185) | fe-codec-*, ⛔ health-schema |
| 41 | fe-finance | Finance ⊕split (Dash·account·All-*·Chart·Store·Commitments·Import) | sup LIF-180 | fe-codec-*, ⛔ finance-store-import-budget-currency |
| 42 | fe-relationships | Relationships (Dash⇄Graph⇄Contacts·contact Entity·Network·Reminders) | sup LIF-196 | fe-codec-*, fe-codec-canvas-graph, ⛔ relationships-networks-closeness |

**Retired:** LIF-189 fe-languages (→ Spaces) · LIF-186 fe-integrations-ai-surfaces (→ M2 DEFERRED).

## 3. Operation batches (ordered, atomic, verify after each)

- **Batch A — Retirements (2).** `--retire LIF-189`, `--retire LIF-186`; add a forwarding note on each. Verify closed.
- **Batch B — Health fold.** Retitle LIF-183 → `fe-health` (umbrella, M1.2.3); `--retire LIF-184`, `--retire LIF-185` with a "folded into fe-health" note. Verify.
- **Batch C — Supersede the 1:1 modules (16).** Edit each surviving fe-* task file: retitle to its unit, set `# Milestone:` per §1, update scope + `## Dependencies` blocked-by per §2. `--sync --task <slug>` one at a time; verify.
- **Batch D — Splits.** Author the split-out task files: `fe-home` (from 187), `fe-shell`/`fe-shell-scope`/`fe-session-hud` (from 199), `fe-session-runtime` (from 198), (`fe-settings` is the 193 survivor). `--sync` each; verify.
- **Batch E — Net-new creation.** Author the codec (#1–13) + discovered (`fe-spaces-page`·`fe-sync-log`·`fe-feature-atlas`) task files with full headers (no `# Linear:` → tool assigns). `--sync`; verify new LIFs land.
- **Batch F — Edges.** With all units present, `--sync` resolves `## Dependencies` blocked-by by slug. Verify the graph (`--status`).
- **Batch G — Clean stale edges.** Remove the pre-session dangling blockers (to `mod-sessions`, `ui-*`, `xs-*`) that don't resolve; manual Linear delete + local removal (add-only sync won't drop them).
- **Batch H — Write-back.** Capture the real new LIF IDs into `g6-edge-ledger.md §6` (the executed-ledger) + `--pull` to reconcile.

## 4. Task-file work to pre-stage (can be done on the branch NOW, synced from main later)

The reshape is **task-file-driven**, so the *authoring* is safe to do here (git-tracked, no Linear writes). To pre-stage:
1. **Create** the ~16 net-new unit task files (codec + shell + discovered) with full headers (`# Task/# Status: planned/
   # Profile: Add Frontend Component/# Project: M1 — Whole Manual OS/# Milestone: <per §1>/## Dependencies`).
2. **Edit** the 18 surviving fe-* (retitle, re-milestone, rewrite `## Dependencies` to the codec slugs).
3. **Mark** fe-languages + fe-integrations-ai + fe-health-nutrition/training for retirement (a `# Status: retired` + note).
Then the only step left on main is: pre-flight → Batches A–H (mostly `--sync`).

## 5. Rollback

Task-file changes revert via git. Linear retirements (A/B) are the only manual-undo ops → done first, in their own
small batch, verified before proceeding. If a batch surprises, STOP and reconcile before continuing.
