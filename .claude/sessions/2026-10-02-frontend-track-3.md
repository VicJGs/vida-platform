---
Session 3 — 2026-10-02
Goal: Execute the staged G6 Linear reshape and make the frontend track correct LOCALLY, on GitHub, and on LINEAR.
Profile: Project Foundation · Scenario: Milestone Delivery Planning (execution tail — Steps 6–8)
Isolation: worktree .claude/worktrees/frontend-track; executed FROM the main checkout (authoritative map)
---

## Accomplished
- **Branch disposition** — mod-books was already done (PR #70 merged → main clean). ff-merged `worktree-frontend-track`
  → main (one append-conflict in `.claude/docs/decisions.md`, resolved keep-both). main carried all G0–G6 + reshape.
- **Reconciled the pre-staged files vs the runbook (Scenario Step 6/7) via the dry-run** — the dry-run was the diagnostic
  and caught THREE gaps the pre-staging left: (1) 3 spurious creates (frontend-replan doc · frontend-track w/ bogus
  `M1.2.*` milestone); (2) the 4 retired files still live in `.claude/tasks/` → would revert to Backlog on sync;
  (3) the 15 survivors were edge-rewired + re-milestoned but **never re-scoped/renamed** to the surface grain.
- **Fixes (git-only, committed `186987b`):** renamed 4 survivors to surface slugs (fe-journals→fe-home,
  fe-preferences→fe-settings, fe-shell-integration-wiring→fe-shell, fe-health-core→fe-health; **LIF preserved + map
  re-keyed**), updated 6 dependent edges, reshaped hard-4 BR-6 → 28 surfaces, archived 4 retirees + frontend-replan,
  homed frontend-track to a new cross-milestone `M1.2+ (frontend surface tier — cross-milestone)` (mirrors backend-replan).
- **Executed the Linear writes (from main):** `--retire` ×4 (LIF-189/186/184/185 → Canceled) → `--sync --allow-orphan-create`
  → **created 20** (frontend-track **LIF-202** + 19 codec/surfaces **LIF-203…221**) + 1 milestone → wired all edges →
  **converged 0-create / 115-exist · 0 dangling** → `--pull`. Write-back committed `62e4d57`; executed-ledger `d39e68b`.
- **GitHub:** pushed `worktree-frontend-track`, opened **PR #71** (worktree-frontend-track → main). Awaiting Victor's merge.

## Decisions Made
- **Survivor reshape = rename now** (Victor): fe-home/fe-settings/fe-shell/fe-health, LIF preserved (faithful to runbook §2).
- **Campaign issue = frontend-track, properly nested** (Victor: "follow the milestone + proper nesting"): new M1.2+
  cross-milestone mirroring backend-replan (LIF-163); frontend-replan archived (G0–G6 planning folds into the campaign).
- **--allow-orphan-create was correct** — the guard tripped on 3 PRE-EXISTING backend orphans (LIF-79 ar-8-foundation-services,
  LIF-159 m1-foundation-closeout, LIF-160 core-vault-init), verified unrelated to the 19 genuinely-new fe surfaces.

## Open Questions / Follow-ups (NOT blocking; pre-existing, out of frontend scope)
- **3 orphan map entries** (LIF-79/159/160) — backend map-hygiene, surfaces on any `--sync`'s guard. A backend session owns it.
- **Batch G stale edges** — add-only sync can't delete hard-4's old Linear relations to the 4 Canceled issues. Moot
  (a Canceled blocker doesn't gate); optional manual GraphQL `issueRelationDelete` (backend P5 precedent).
- **Local main is 16 ahead of origin/main.** When PR #71 merges, if GitHub makes a merge commit, reconcile local main
  via `git pull --ff` (or reset to origin/main). The branch == local main (d39e68b).

## Next Session
- **Merge PR #71**, then `git -C <main> pull` to sync local main.
- **Per-surface builds begin.** Computed head = **fe-codec-theme (LIF-213)** — the codec foundation everything inherits
  (M1.2.1, highest direct-dependent count). Each surface: 3-lens audit → build → Visual Gate → PR → merge
  (add-frontend-component / Entity Delivery Flow ② track). Run `/begin` fresh; `--next` confirms the head.
- Env: Node 24 via nvm; reshape artifacts in `docs/specs/foundation/frontend-replan/`.
