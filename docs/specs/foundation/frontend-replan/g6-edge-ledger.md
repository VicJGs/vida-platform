# G6 Edge-Migration Ledger — the Linear reshape (DRY-RUN, for Victor's approval)

> **Status:** DRAFT / DRY-RUN, 2026-10-01. **No Linear changes made.** This is the full plan for the ⚠ semi-destructive
> reshape: how the **24 `fe-*` issues (LIF-178…201)** map onto the **42-unit build sequence** (`reconstructed-structure.md`),
> what's superseded / split / folded / retired / net-new, and the dependency edges to carry. **Execute only on Victor's
> approval**, item by item if needed. Nothing is silently dropped — every `fe-*` has a disposition below.

## 1. Disposition of the 24 `fe-*`

| Linear | fe-* issue | → disposition | New unit(s) |
|---|---|---|---|
| LIF-191 | fe-notes-and-pages | **supersede** | #27 Notes (+ codec #7 Editor · #8 Graph) |
| LIF-187 | fe-journals | **split** | #18 **Home** (now a cross-cutting W1 unit) + #27 (Wrapped reviews) |
| LIF-201 | fe-tasks | supersede | #28 Tasks `⊕split` |
| LIF-182 | fe-habits | supersede | #29 Habits |
| LIF-194 | fe-projects | supersede | #30 Projects (deliverables/vision → 2b) |
| LIF-179 | fe-check-ins | supersede | #31 Check-ins |
| LIF-181 | fe-gamification | supersede | #32 Gamification |
| LIF-197 | fe-routines | supersede | #33 Routines ⛔v2-service |
| LIF-198 | fe-sessions | **split** | #34 Sessions + #16 **HUD** + #23 **runtime** (HUD/runtime now codec/W1 reuse) |
| LIF-190 | fe-learning-education | supersede | #35 Learning `⊕split` |
| LIF-178 | fe-books | supersede | #36 Books `⊕split` (Reader = codec #9) |
| LIF-188 | fe-knowledge | supersede | #37 Knowledge `⊕split` |
| LIF-200 | fe-skills | supersede | #38 Skills |
| LIF-195 | fe-purposes-and-goals | supersede | #39 Purposes ⛔values/contributions/reviews |
| LIF-183 | fe-health-core | **fold** → | #40 Health (Core) ⛔~12 tables |
| LIF-185 | fe-health-training | **fold** → | #40 Health (Training sub) |
| LIF-184 | fe-health-nutrition | **fold** → | #40 Health (Nutrition sub) |
| LIF-180 | fe-finance | supersede | #41 Finance `⊕split` ⛔store/import/budget/currency |
| LIF-196 | fe-relationships | supersede | #42 Relationships ⛔networks/closeness |
| LIF-192 | fe-notifications | supersede | #25 Notifications (W1 cross-cutting) |
| LIF-193 | fe-preferences | **split** | #24 Settings + codec #1 ThemeProvider + #2 pattern-kit |
| LIF-199 | fe-shell-integration-wiring | **split** | #14 shell frame · #15 Bar1+scope · #16 HUD-placement · #17 ⌘K (+ reconcile codec shells) |
| LIF-189 | fe-languages | **RETIRE** | → dissolved into **Spaces** (ADR-006): a Languages **Space + Template** built via the Spaces engine (#13/#20), not a module surface-set |
| LIF-186 | fe-integrations-ai-surfaces | **RETIRE / distribute** | AI surfaces = **capability blocks within modules** (consent-gated: Books ISBN · Skills LLM · Education extract) + **M2-deferred** (xs-ai); not an M1 frontend module |

**Tally:** 20 supersede/split/fold · **2 retire** (languages, ai-surfaces) · health 3→1 fold.

## 2. Codec & shell — EXTEND the shipped foundation (grounded 2026-10-01)

The codec/shell are **~80% already shipped** (task index). The re-plan **extends** them; it does **not** rebuild.

| Unit | Shipped ancestor (status) | Action |
|---|---|---|
| #1 ThemeProvider (N themes × density) | **ds-2/ds-4** ✅ (1 placeholder theme) | **extend** → N theme families + density |
| #3 view-modes (7) | **ui-2** ✅ (list·gallery·timeline·calendar·graph) | **extend** → add **table · board** |
| #4 Collection shell | **ui-2** `internal/data-view` ✅ | extend |
| #5 Dashboard shell | — | **mint** |
| #6 Entity + **Layout/Editor facet** | — | **mint** (net-new) |
| #7 Canvas: Editor | **ui-3** ✅ | reuse |
| #8 Canvas: Graph | **ui-2** neural-graph ✅ | **extend** → editorial ink voice |
| #9 Canvas: Reader · #10 Vision-board/Calendar-grid | ui-2 calendar ✅ (reader/board net-new) | partial mint |
| #11 Flow/Session (deliverable/proof) + #16 HUD + #23 runtime | **ui-2** pomodoro-widget seam ✅ | **mint** the runtime+HUD on the seam |
| #12 System shell | **ui-4** ⌘K overlay ✅ | reuse |
| #2 pattern-kit (states) | **ux-4** state-conventions ✅ (TerminalState/8-state) | **extend** → empty/sync/motion/voice/reach primitives |
| #14–#17 shell | **ui-4/ux-3** ✅ (5-region AppShell + dock + global bar) | **extend** → 2 positionable panels + **Space-scope selector** + **HUD region 6** |
| #18 Home render | **ux-6** ✅ (design model) → "Phase-1b render" | **mint** the render (4-region) on the UX-6 model |

**Genuinely net-new issues (no shipped ancestor):** the Layout/Editor **facet system** (#6) · the **Flow/Session runtime
+ HUD** (#11/#16/#23) · and the **discovered surfaces** → **Spaces page** (#20) · **Sync & Activity Log `/sync`** (#21) ·
**Feature Atlas** (#22) · the **Space-scope selector** (in #15).

## 3. Dependency edges to carry (blocked-by)

From `reconstructed-structure.md` "Depends on" columns → Linear blocked-by:
- Every Wave 1+ unit **blocked-by its codec deps** (e.g. #18 Home blocked-by #5 #6 #7).
- Shell order: #15/#16/#17 blocked-by #14; visible surfaces blocked-by #17 (⌘K reachable).
- `⛔` module units **blocked-by their schema amendment** (Health/Purposes/Finance/Relationships/Routines — the §6.4
  tables; home these as DB/schema issues the frontend unit waits on).
- Retire the **stale fe-* edges** flagged pre-session (the `tracker --next` dangling blockers to `mod-sessions`,
  `ui-*`, `xs-*` etc.) as part of the reshape — they resolve to the new units or are dropped.

## 4. Decisions — RESOLVED by the documentation (grounded 2026-10-01)

Each was a candidate "choice"; the docs settle all five. Victor approves or overrides a *specific grounding*.

1. **Health fold 3→1 — YES (doc-determined).** One **umbrella dock module** with sub-contexts; **Victor confirmed the
   umbrella layout 2026-07-13.** `[health/README.md:1-5; view-intent-harvest.md:33]` → `#40 Health ⊕split` (sub-tabs).
2. **The splits — YES (they align to the SHIPPED foundation).** Home = **UX-6** (LIF-95 ✅, a distinct global surface, not
   the Journals module); shell = **UX-2/UX-3/UI-4** (all ✅); Theme = **DS-2/4** (✅); the session runtime = the **UI-2
   pomodoro-widget** deferred seam. The re-plan *extends* these, so the split **mirrors the real decomposition**.
3. **Retirements — doc-determined, not a choice.** fe-languages → **dissolved into Spaces** `[ADR-006:31;
   view-intent-harvest.md:50,71]` (close → forward to the Languages Space/Template). fe-integrations-ai-surfaces →
   **deferred to M2** (ADR-017 features-first: encryption/sync/auth/**AI** deferred) `[architecture/README.md:19,27]` —
   kept as a **DEFERRED** stub (real M2 work), AI faces land as consent-gated capability blocks when it ships.
4. **Net-new creation timing — create at reshape (recommended).** Per the ADR-016 delivery model, mint the net-new +
   discovered issues now so the **blocked-by graph is whole**; staging them later leaves dangling edges. *(The one
   genuine process call — my recommendation; override if you want them staged.)*
5. **Codec extend-vs-mint — RESOLVED (§2).** Extend the shipped **UI-1/2/3/4 · DS-2/3/4/5 · UX-2/3/4/5/6**; mint fresh
   only for the facet system (#6), the Flow/Session runtime+HUD (#11/#16/#23), N-theme ThemeProvider, and the 4
   discovered surfaces. Verified against the task index (all ancestors DONE).

## 5. Execution plan (ONLY after approval — the actual Linear ops)

1. For each superseded `fe-*`: update title/scope to its new unit, or close+recreate (your call on grain #2).
2. Fold the 3 health issues → 1 (close 2, retarget 1) if approved.
3. Create the ~5 net-new discovered-surface issues + any net-new codec issues.
4. Set blocked-by edges per §3.
5. Retire fe-languages + fe-integrations-ai-surfaces (close with a note → their new home) if approved.
6. Clean the stale dangling edges.
7. Write the executed-ledger (what actually changed, with new IDs) back into this file.

> **This is a dry-run. Nothing above has touched Linear.** Approve the whole plan, or steer the grain decisions (§4)
> and I'll revise the ledger before executing.

---

## 6. EXECUTION LOG — reshape EXECUTED from main (2026-10-02)

**Status: DONE.** Executed from the **main checkout** (authoritative 37 KB map) after ff-merging `worktree-frontend-track`
→ main. Sync converged: **0 creates / 115 exists · 0 dangling blockers**.

### Created (20 issues + 1 milestone)
| Unit | LIF | Milestone |
|---|---|---|
| frontend-track (campaign) | **LIF-202** | M1.2+ (frontend surface tier — cross-milestone) *(new, mirrors backend-replan M1.1+)* |
| fe-calendar | LIF-203 | M1.2.1 |
| fe-codec-canvas-board | LIF-204 | M1.2.1 |
| fe-codec-canvas-graph | LIF-205 | M1.2.1 |
| fe-codec-canvas-reader | LIF-206 | M1.2.1 |
| fe-codec-collection | LIF-207 | M1.2.1 |
| fe-codec-dashboard | LIF-208 | M1.2.1 |
| fe-codec-entity-facet | LIF-209 | M1.2.1 |
| fe-codec-flow-session | LIF-210 | M1.2.1 |
| fe-codec-patterns | LIF-211 | M1.2.1 |
| fe-codec-seams | LIF-212 | M1.2.1 |
| fe-codec-theme | LIF-213 | M1.2.1 |
| fe-codec-viewmodes | LIF-214 | M1.2.1 |
| fe-feature-atlas | LIF-215 | M1.2.1 |
| fe-onboarding | LIF-216 | M1.2.1 |
| fe-session-hud | LIF-217 | M1.2.1 |
| fe-session-runtime | LIF-218 | M1.2.1 |
| fe-shell-scope | LIF-219 | M1.2.1 |
| fe-spaces-page | LIF-220 | M1.2.1 |
| fe-sync-log | LIF-221 | M1.2.1 |

### Retired (4 → Canceled, map keys dropped)
LIF-189 fe-languages (→ Spaces) · LIF-186 fe-integrations-ai-surfaces (→ M2) · LIF-184 fe-health-nutrition (→ fold) ·
LIF-185 fe-health-training (→ fold).

### Renamed in place (LIF preserved, map re-keyed, retitled in Linear)
fe-journals → **fe-home** (LIF-187) · fe-preferences → **fe-settings** (LIF-193) · fe-shell-integration-wiring →
**fe-shell** (LIF-199) · fe-health-core → **fe-health** (LIF-183, umbrella).

### Superseded in place (15 survivors): edges re-wired to codec + re-milestoned (LIF unchanged).

### Edges: all `## Dependencies` blocked-by wired by slug (codec → surfaces → hard-4 BR-6 = 28 surfaces). 0 dangling.

### Follow-ups — RESOLVED (2026-10-02, Victor-authorized)
- **3 orphan map entries** (pre-existing backend debt): **LIF-79** ar-8-foundation-services → set **Done** (work merged
  `1da9ea9`+`fe4b70d`) · **LIF-159** m1-foundation-closeout → set **Done** (branch merged) · **LIF-160** core-vault-init-on-db-open
  → **claimed** with a stub task file homed M3.0 (legit future issue, no longer an orphan).
- **Batch G (stale edges):** DONE — deleted the 4 pre-reshape `hard-4-polish` → Canceled-issue relations via GraphQL
  `issueRelationDelete` (LIF-189/186/185/184). Verified 0 Canceled blockers remain on hard-4.
