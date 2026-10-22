# G3 — Order: where the debt sits in the build sequence

> **Status:** G3 part 1 (order), 2026-10-21. Inputs: `debt-plan.md` rev 3 (G2, APPROVED) · the initiative structure
> `delivery-structure-reconstruction/reconstructed-structure.md` · the 42-unit frontend order
> `frontend-replan/reconstructed-structure.md` (G5). Feeds: the structure reconciliation (part 2) + `g4-edge-ledger.md` (part 3).

## 1. Placement rule (grounded)
- **`#` = a topological order: every `←` has a strictly lower `#`** (`delivery-structure-reconstruction/reconstructed-structure.md:235-239`).
- **Debt sits right after the data-plane row and before the next unbuilt surfaces.** Debt units repair *Done* units.
  Their only hard blockers are the data plane (✅ #148) and each other, so a low `#` is legal. **Routing is not by `#`:**
  `tracker_sync --next` orders by `_projects.md` milestone index, then topo, then direct-dependents (`tracker_sync.py:1130`).
  So **M1.2.4 is listed right after M1.1.2** in `_projects.md` (mod-routines finishes first, then the debt routes ahead of M1.1.3
  and the new surfaces), which is Victor's stated goal: "so that
  everything is working seamless" (2026-10-21). New surfaces still close live under the G0 rule, so building them in
  parallel adds no new debt.
- **A new Milestone, M1.2.4 "Live Close: shipped-surface debt"**, holds the 7 units: a showcase-able slice ("every
  shipped surface usable live"), per ADR-016's Milestone = delivery-slice (`reconstructed-structure.md:11`).

## 2. The order (waves; within a wave = parallel)
| Wave | Units | Why here |
|---|---|---|
| **L0** | `data-plane-wiring` ✅ (#148): its missing row is added | the shared root (`← AR-2, AR-4`) |
| **L0′** *(added 2026-10-22)* | **fix-data-plane-boot-open** (structure `#60`) | a repair of the Done data plane, found by the fe-calendar S7 live gate (dev boot intermittent · prod build never opens) — every live surface sits behind the boot, so it routes ahead of L1 (§1 rule: debt right after the data-plane row) · bug unit `docs/specs/fixes/data-plane-boot-open/` |
| **L1** | **preferences-rescope** · **notes-rescope** · **sessions-rescope** | no debt blockers: preferences = the hub; notes' only edge to preferences is soft; sessions is independent |
| **L2** | **gamification-rescope** · **shell-rescope** · **notifications-rescope** · **journals-rescope** (slices before the dashboard) | ← preferences (all) · notifications ← sessions · journals ← notes + preferences |
| **late** | **journals-rescope·dashboard** (sub-issue: EC-4 + 11 widgets + the **journals ENTITY CLOSE**) | ← HARD-1 (M1.4, ← every `MOD-*`). Encoded as a **⊕split sub-issue** of journals-rescope (same unit, same ledger, `frontend-replan/reconstructed-structure.md` §0 "⊕split → sub-issues"), so the early slices aren't held at the tail. *§XXVIII note: G2 rev 3 said "final slices"; G3 encodes them as a sub-issue so the late blocker stays db-10-proof. Scope unchanged.* |
| **downstream edges** | fe-sessions ← sessions-rescope (holds the sessions ENTITY CLOSE) · fe-tasks / fe-projects ← notes-rescope · note-open-behavior-preference ← preferences-rescope · **HARD-4 ← all 7 units + the dashboard sub-issue** | from debt-plan §1/§2/edge-only notes |

> **Renumbered 2026-10-22:** `fix-data-plane-boot-open` (LIF-250) took structure **#60** (L0′), so the structure now runs
> **1→144** and every later `#` shifted +1 (the debt units are #61–67, the dashboard sub-issue #116, HARD-4 #123). `#` values
> quoted in this doc's gate log and in `g4-edge-ledger.md` are records of 2026-10-21 and predate the shift.

**Parallel tracks keep running:** mod-routines (① backend, M1.1.2) and fe-calendar (S5–S7, in flight) are independent
of L1/L2. fe-calendar's S7 closes under the ELC.

## 3. Critical path (debt)
`data-plane ✅ → preferences-rescope → {shell · gamification · journals-rescope}` and
`sessions-rescope → notifications-rescope`. The longest debt chain is **2 units** after the data plane; the only late
item is the dashboard sub-issue, which is bounded by HARD-1, not by the debt.

## 4. Structure reconciliation (part 2): the rules the edit must satisfy
1. **One canonical structure:** the initiative doc's 24 superseded `FE-*` rows (M1.2.1–M1.2.3) are replaced by the 42-unit
   surface order (LIF ids from `frontend-replan/g6-edge-ledger.md` + `.claude/tasks/.tracker-map.json`); the frontend-replan
   G5 doc becomes a pointer to the canonical one.
2. Add the **data-plane-wiring** row (✅, M1.1.3 per its own header, `← AR-2, AR-4`, `→` M1.2.4 units) and the
   **M1.2.4** milestone with the 7 units + the dashboard sub-issue, placed per §2.
3. Fix the **`#64`/`#65` collision**; re-number **contiguously**, prove acyclic in §5 (every `←` lower, every `→` higher).
4. Refresh status glyphs from the **merged-PR oracle** (a merged PR outranks Linear, which outranks the `# Status:` line;
   `MVP-PATH.md:205`). M1.1.1 is not "◻".
5. HARD-4's `←` becomes the real set: all M1.2.* surfaces + all M1.2.4 debt + hardening.

## 5. G3 critique corrections
- Routing claim corrected (above); `_projects.md` gains M1.2.4 after M1.1.2; structure renumbered so M1.2.4 = #60–66.
- Dashboard slug = `journals-rescope-dashboard`, ← journals-rescope · hard-1-summary-registry · notes-rescope.
- HARD-4: 35 existing blockers (28 fe-* + 7 hardening, no fe-codec) + the 8 M1.2.4 issues.
- shell-rescope search done-when restored (GAP-1's definition): SearchProvider seam swap + honest `search-unavailable`; live FTS at DB-8 (soft).
