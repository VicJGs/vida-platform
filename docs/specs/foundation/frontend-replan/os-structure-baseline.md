# OS Structure Baseline — documented skeleton (G1/G2 grounding reference)

> **Status:** REFERENCE snapshot (gathered 2026-10-01 during G1). NOT new decisions — this is the
> documented state of the OS's IA / structure / state, assembled from the sources below so the
> surface-first re-plan (and Victor's experience vision) build on a saved map, not scrollback.
> **Method:** three read-only agents over the doc set; every claim traces to a cited source.
> **Pairs with:** `process.md` (the flow), `_index.md` (the gate sequence), the G1 quality bar (next).
> **⚠ PENDING — the feel is NOT here:** the docs fix the *skeleton* (Structure plane), not the *feel*.
> Victor's experience/aesthetic vision is still owed and is the **blocking input for G1's aesthetic
> direction + the "feel" sections of the quality bar.** See §4.

## Sources
- `CLAUDE.md` §§1–9 (module inventory) · `apps/web/src/nav/module-map.ts` (nav placement)
- `docs/core/architecture/information-architecture.md` (dual-axis nav) · `shell-layout.md` (5 regions)
- `state-conventions.md` + `apps/web/src/state-conventions/{terminal-state,keyboard}.ts`
- `command-bar-and-search.md` · `home-journal-dashboard.md` · `onboarding.md`
- `docs/specs/foundation/ux-1-information-architecture/view-intent-harvest.md` (surface inventory)
- `docs/core/decisions/ADR-003` (sync/offline) · `ADR-006/007` (Spaces/Views) · `~/dev-toolkit/standards/{components,design,engineering,motion}.md`

---

## 1. Hierarchy

**Dual-axis navigation** (co-primary, `information-architecture.md §1`):
- **Module Dock axis** — content homes, grouped by life-domain.
- **Spaces axis** — user-composed `#tags` + saved views cutting across modules. M1.0 = designed seam (empty); live M1.1.

**Placement taxonomy** (`information-architecture.md §2`): `dock` · `global` · `secondary` · `non-nav` · `spaces-only`.

**Every module nests 3 levels:** `TOP VIEW (multi-mode)` → `STANDALONE ENTITY PAGE` → `TABS/SECTIONS`.

**The connective tissue** (`CLAUDE.md §8`): Journals (=Home `/`, temporal axis) + Purposes&Goals (meaning axis) + Notes/`[[wiki-links]]`/backlinks/Neural-Graph/Tags (cross-cutting fabric).

**18 dock items, 6 groups:**
```
Integration ──── Notes
Productivity ─── Tasks · Habits · Projects · Routines          (+ Pomodoro non-nav)
Knowledge ────── Learning · Books · Knowledge · Skills · Sessions  (+ Flashcards non-nav)
Personal Growth ─ Purposes&Goals · Health                      (+ Check-ins secondary)
Life Management ─ Finance · Relationships
Platform Svcs ── Gamification (conditional)                    (+ Notifications, Settings global)
```

## 2. Pagination map & structure

**5-region persistent shell** (`shell-layout.md`): Global Bar · Spaces Bar (reserved→M1.1) · Module Dock (drawer→rail→sidebar) · Content `<Outlet/>` (max-w 1280, gutters 16/24/32) · Overlay Host (⌘K + modals).

**7 global surfaces:** `Home /` · `Calendar` (cross-module `dueIn`) · `⌘K` palette · `Graph` · `Notifications` · `Settings` · `Spaces switcher`.

**Surface tree (top-view modes → entity pages):**
```
/ (Home=Journal)  Calendar·List·Gallery + live dashboard (summary + agenda, all modules)
/tasks            12 layouts → /tasks/{id}
/habits           dashboard·today·overview → /habits/{id}
/projects         dashboard·timeline·kanban → project→milestone→deliverable→task
/routines         dashboard·today·policy → /routines/{id}
/learning         10-tab hub → institution→program→term→subject(schedule·syllabus·exams)
/books            list·gallery·reader → /books/{id} (unified TOC, 3-mode reader)
/knowledge        list·graph·compound-set → topic/area (+ Flashcards nested)
/skills           skill-tree·library → /skills/{id}
/sessions         agenda·my-week·availability → session pages (+ Pomodoro Focus Mode)
/purposes         dashboard·by-domain·timeline → purpose→target→dream (vision board)
/health           metrics·goals·roles·adaptation (Core/Training/Nutrition)
/finance          Financial⇄Accounts → account/txn/asset/liability/investment
/people           dashboard⇄graph⇄contacts → contact/network
/checkins         (secondary) wizard·history·charts → check-in/review
/gamification     (opt-in) system dashboard → currency/achievement
/notifications · /settings · /graph
```

**Reachability:** nav dock · ⌘K ("Go to X") · contextual entry · cross-module entity link · (M1.1) Spaces.

## 3. IA · Interaction Dynamics · State Mapping

**① Information Architecture** — cognitive mapping via: life-domain groups (dock) · cross-cutting tags/Spaces · entity-link graph · temporal Journal anchor. Notes & Journals = the unifying layer, not a peer.

**② Interaction Dynamics** — keyboard-first spine:
- `⌘K`: Command mode (frecency "Go to…" + actions) / Search mode (FTS, grouped; M1.0 stub = `search-unavailable`).
- `FOCUS_CONTRACT`: overlay-open→first-focusable · overlay-close→trigger · page-nav→main-heading · toast→none.
- `OVERLAY_DISMISS`: Escape closes every overlay.
- ISO 9241-110: self-descriptiveness ✓ · controllability ✓ · error-tolerance ✓ · suitability ◑ (task view-modes deferred M1.1).

**③ State Mapping:**
- `TerminalState = loading · empty · error · success` — ONE canon across frontend + capability + views.
- `deriveTerminalState()`: isPending→loading FIRST · isError→error (beats stale data) · empty vs success.
- Component matrix: 8 states (default/hover/focus/active/disabled/loading/error/empty).
- Local-first: optimistic = NONE by default (local reads <10ms → invalidate+re-read); offline queue + field-level LWW + HLC fully DEFINED (engine-side).

## 4. What the docs DECIDE vs. leave OPEN  (the canvas for the experience vision)

| Area | Documented ✓ | Absent / deferred — OPEN |
|---|---|---|
| Structure | dual-axis nav, 5-region shell, 18 modules, placement taxonomy | **the feel** — no aesthetic, density, motion, or "what it's like to be in it" |
| Sync/local-first | offline queue, LWW, HLC, retry (engine) | **sync-status surfacing in UI** · **optimistic-write feedback** — ABSENT |
| Interaction | ⌘K spine, focus contract, Esc-dismiss | **global undo/redo** · **destructive-action confirm** — ABSENT |
| Movement | per-module reflow | **how it feels to move *between* modules** — undocumented |
| Home | 3-section model (summary/agenda/entry) | Victor's **4 regions** (schedule · stats · day-actions · quick-actions) — not yet in the model |
| Spaces | the axis is designed | Spaces bar **rendering** — M1.1 |

### ⏳ RESERVED — Victor's experience / feel vision (BLOCKING input, not yet captured)
The whole Surface plane — the *feel of the frontend and the OS experience Victor wants the user to
have* — is **owed and pending**. It governs: aesthetic & density direction (`_index.md §7 #1`), motion
between modules, how trust/reversibility are communicated (the sync/undo absences above), and whether
Home's 4-region intent reshapes the Journal model. **G1's aesthetic direction and the "feel" sections of
the quality bar cannot be drafted until this is captured.** Captured intent lands here + `_index.md`.

**Already-captured unannounced intent (holding for G2/Home surface):**
- Home must carry 4 concurrent regions: ① timed schedule · ② cross-OS stats entry · ③ undated day-actions (two tiers: must-do / can-do) · ④ user-customizable quick-actions (sibling of the global quick-capture gap, `_index.md §3`).
