# Reconstructed Structure — the ordered build sequence (G5 output) → POINTER

> **Status: SUPERSEDED AS A STRUCTURE — now a pointer (golive-replan G3 part 2, 2026-10-21).**
> The 42-unit surface order is merged into **the one canonical structure**:
> **`docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md`**, Milestones
> **M1.2.1 (#72–96) · M1.2.2 (#97–103) · M1.2.3 (#104–113)**. There each unit carries its global `#`, slug + LIF, homing,
> `←`/`→` edges, profile and status. Next to it are the `data-plane-wiring` row (#59) and the **M1.2.4 — Live Close**
> debt milestone (#60–66 + #115). **Do not order work from this file.** Each unit's `[G5 #n]` tag in the canonical doc
> maps back to the numbering below. What remains here is the G5 **method** and **wave rationale**, kept as history.
> Original: G5, 2026-10-01 (input to G6, the Linear reshape executed 2026-10-02, `g6-edge-ledger.md` §6).

## 0. Method (history — still how the surface order was derived)

**Order = dependency, not module priority.** Each `#` is an issue-sized buildable unit. Heavy units (Health,
Finance, Learning, Books, Sessions) are marked `⊕split`: they fan into sub-issues at G6/build. `⛔<x>` = gated on a
schema amendment (`surface-map.md §6.4`). Every unit inherits the Tier-0 codec, so nothing in Wave 1+ starts before
its codec deps exist. Sources: `decomposition.md` · `surface-map.md §6` · `coverage-report.md` ·
`frontend-quality-bar/_index.md`.

## Wave rationale (history)

| Wave | G5 #s | Canonical #s | What / why |
|---|---|---|---|
| **W0 — the CODEC** | 1–13 | 72–84 | ThemeProvider · pattern-kit + 8-state · view-modes · Collection/Dashboard/Entity shells · canvases (Editor·Graph·Reader·Board) · Flow/Session · System · composition seams. Everything depends on it. |
| **W1 — shell + cross-cutting** | 14–26 | 85–96 (+ #25 → 97) | Shell frame · Bar 1 + Spaces scope · Session HUD · ⌘K · Home · Global Calendar · Spaces page · Sync log · Feature Atlas · Session runtime · Settings · Notifications · Onboarding. No module owns these. |
| **W2a — floor-ready modules** | 27–32 | 98–103 | Notes · Tasks · Habits · Projects · Check-ins · Gamification. They need no schema work, so they validate the codec on real modules early. |
| **W2b — schema-gated modules** | 33–42 | 104–113 | Routines · Sessions · Learning · Books · Knowledge · Skills · Purposes · Health · Finance · Relationships. Built after their ⛔ amendment lands. |

- **The codec (W0) is the critical path.** Nothing visible ships until the shells + pattern-kit + view-modes exist;
  once they do, Wave 1 and every module inherit them in parallel. **#6 (Entity+facet)** and **#11 (Flow/Session)** are the
  two highest-leverage codec units (every entity page + every session depend on them).
- **Wave 1 is reachable-shell first:** #14→#15→#17 (shell + bar + ⌘K) must precede any surface being *navigable to*;
  #18 (Home) is the landing and should lead the visible surfaces.
- **Wave 2a** needs no schema work, so it validates the codec on real modules early. **Wave 2b** is blocked on the §6.4
  amendments. **Health (#40)** is the biggest (schema 0%) and should start its schema amendment earliest, in parallel.
- **Session surfaces** (#16 HUD, #23 runtime) are codec-tier reuse: built once in Wave 1, consumed by Sessions (#34),
  Health workouts (#40), Pomodoro, Routines (#33).

## What changed after G5 (recorded in the canonical doc)
- **G6 (2026-10-02):** the 42 units superseded the 24 `fe-*` (LIF-178…201). 4 were retired (LIF-189 · 186 · 184 · 185), 4
  renamed, 20 created (LIF-202…221), and LIF-234 (#7) was minted late. #12 `fe-codec-system` and #17 `fe-cmdk` were
  never minted (⊘ dissolved). fe-notifications (#25) is homed in M1.2.2 in Linear.
- **golive-replan G3 (2026-10-21):** the unit order merged into the canonical structure. The debt the shipped surfaces
  left (FE units closed without ENTITY CLOSE, DF-13) is homed in M1.2.4.
