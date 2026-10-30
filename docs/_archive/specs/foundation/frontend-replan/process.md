# Frontend Surface-Build Process — the Tier-1 Flow (surface-first ②)

> **Status:** LOCKED (G0 output, 2026-09-30). The operating manual for the frontend re-plan (G1–G6)
> and for every per-surface build that follows.
> **Authority:** Tier-1 flow doc. Rides the global STANDARDS process spine
> (`~/dev-toolkit/standards/process.md` §XXVI/§XXVII/§XXVIII/§XXIX). Composes
> `frontend-source-of-truth.md` (code-first) + `frontend-visual-gate.md` (the empirical loop).
> **Extended by:** the G1 **Vida Frontend Quality Bar** (`frontend-quality-bar/`) — the _yardstick_
> this flow measures against. This doc owns the **loop**; G1 owns the **bar**.
> **Source:** crystallizes `_index.md §2` (gate-1-approved 2026-09-30) into a standalone, executable manual.
> **Supersedes** the P6 module-twin grain (24 `fe-*`, LIF-178…201) as the frontend _unit of work_
> (surface, not module); P6's 222-leg coverage is reused (`_index.md §1`).

---

## 1. What this document is

The **frontend unit of work is a _surface_** — a page/tab/panel the user navigates — which **composes
features from many modules**. (The backend's unit is a _service_, owned by one module.) This doc is the
flow that turns a finished backend into a surface the user can actually reach and operate, with **zero
design/logic guesses**.

It governs two things:

1. **The re-plan gates (G0–G6)** — how the surface set itself is harvested, mapped, coverage-gated, ordered,
   and reshaped into the tracker. (This doc is G0; it is the first thing G1–G6 read.)
2. **The per-surface build loop** (§6) — how each surface, once planned, becomes merged code.

Read with `_index.md` (the establishment record + the G0–G6 gate table) and the global process spine. Where
this doc and `_index.md` agree, `_index.md` is the _why_ and this doc is the _how_.

## 2. The job — three models, zero guessing

The build bridges three models (from the design-process sketch, `_index.md §2`):

- **Implementation Model** — the finished `@vida/core` service. Already built, merged to `main`, frozen
  (its `§XXIX current-*` docs are the contract).
- **Representational Model** — the UI: what we build. The surface.
- **Mental Model** — how Victor expects the task to work. Partly in the docs, partly unannounced in Victor's
  head (e.g. global quick-capture, `_index.md §3`).

**The flow's purpose is to make the build pure execution.** Guessing — filling a design or logic gap by
assumption instead of resolving it — is what gets a module torn down (mod-notes: ~34 commits of churn; the
discarded knowledge branch). Every gap is surfaced and **resolved by Victor before code**, never guessed. This is the
**No-Guessing Principle** (STANDARDS §XXVI/§XXVII) applied to the frontend.

## 3. The process — Five Planes as four stages

Garrett's Five Planes, expressed as Victor's four stages (an order of operations, bottom → top):

| Stage            | Plane(s)                            | Establishes                                                                                                 | Output / asset                                                                                            |
| ---------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **FOUNDATION**   | Strategy + Scope                    | why/who/context-of-use + the foundation systems layer                                                       | context = single-user, local-first, offline, complex-OS (`_index.md §3`); foundation backend twins merged |
| **ORGANIZATION** | Structure                           | IA (dual-axis nav) · surfacing/discoverability · interaction models · full state mapping                    | UX-1 IA (built) + the **surface map** (G2, produced)                                                      |
| **PRESENTATION** | Skeleton + Surface                  | responsive grid + Gestalt + screen-archetype catalog; tokens + components + WCAG 2.2 AA + aesthetic/density | DS-\*/UI-1/UI-2/UI-3/shell (built) + archetypes + feel (produced, G1-anchored)                            |
| **DEVELOPMENT**  | Intake→Process→Output + gated build | the per-surface construction manual, then the build                                                         | the 3-lens audit (§4) + the build loop (§6)                                                               |

**Entry/exit between stages.** A stage starts only when the stage below it has produced its asset. FOUNDATION
is complete (all M1.2.1 backend twins merged — `_index.md §3`). ORGANIZATION completes at G2 (surface map) /
G4 (coverage). PRESENTATION's _shared_ assets exist (DS/UI/shell); its _per-surface_ feel is decided in each
surface's intake against the G1 bar. DEVELOPMENT runs §6 per surface, one at a time, dependency-ordered (G5).

## 4. The 3-lens gap audit (the core of DEVELOPMENT)

> The canonical lens definitions live in `_index.md §2`; the table below is the _executable_ expansion
> (examples + how the audit runs). If the lenses are ever refined, `_index.md §2` is the authority to change first.

The intake is an **audit, not a transcription**. For each surface:

1. **Derive the doc-stated model** — walk Implementation → Representational: what the backend service(s)
   offer, what the feature docs + IA + state conventions say the surface should present.
2. **Audit it against the standards + templates + the G1 bar**, producing three lists:

   | Lens            | Definition                                                                  | Examples                                                                                                                                                                                     |
   | --------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **WRONG**       | Contradicts a standard                                                      | an interaction that breaks the a11y/WCAG bar; a state not in the 8-state machine; a component used against its API; a layout off the responsive grid; copy that overclaims (ZK copy-honesty) |
   | **MISSING**     | Docs silent, but the bar or Victor's mental model requires it               | a keyboard path; an empty/loading/error state; a skeleton; global quick-capture; a second reachability path; an offline/optimistic state                                                     |
   | **OVERFLOWING** | Scope past the bar / over-engineered / a concern the surface should not own | a feature that belongs on another surface; premature config; a capability no doc or user asks for                                                                                            |

3. **Victor resolves the gaps** — fills unannounced intent, cuts the overflow. **No guessing**: an unresolved
   MISSING/WRONG item blocks the build; it is never assumed away.
4. **Build** → **Visual Gate** → verify → PR → merge (§6).

**The audit is the mechanism that catches hidden features.** Organizing frontend work by surface means a
module-owned feature must land on the page where the user looks; the audit's MISSING list is where an
unannounced capability (or an aggregator surface the leg count never itemized) gets surfaced. _A gap not
spotted here stays a gap_ — so Victor's review of the MISSING list is a hard gate (`_index.md §6`).

## 5. Two adaptations of ISO 9241-210

The sketch assumes a team + a design tool we do not have; two adaptations to Vida's reality:

1. **"Usability testing with representative end-users" → single user.** Vida is single-user; there is no user
   panel. **The Visual Gate _is_ the empirical evaluation loop** — Victor runs the real screen and iterates
   (`frontend-visual-gate.md`).
2. **"High-fidelity Figma prototype" → code-first.** The repo is code-first
   (`frontend-source-of-truth.md`: documented intent is truth; the coded realization is the interim source;
   Figma is deferred to M4 P2-⑦). **Our reference prototype _is_ the running screen at the Visual Gate** — so
   "what Victor approves visually" and "what ships" are the same artifact, by construction.

## 6. The per-surface build loop (DEVELOPMENT execution)

Each surface is a §XXVI-gated unit on its own branch.

**Entry:** the next surface in **G5 order** whose backend feed is merged to `main`. One surface runs at a time.

The loop:

1. **Intake — 3-lens audit** (§4). Derive the model; produce WRONG / MISSING / OVERFLOWING against the G1 bar.
2. **Victor resolves the gaps.** Unresolved WRONG/MISSING blocks the build. Record resolutions in the surface spec.
3. **§XXVI build gate** (exact spine order, `standards/process.md:361-369`):
   PLAN → `/critique` → Approval 1 → `/preflight` → `/critique` → Approval 2 → **build** (the double gate —
   both approvals land _before_ implement). Deviations run §XXVIII. The build consumes **frozen** backend
   contracts (the services' `§XXIX current-*` docs); if a contract looks wrong, STOP — do not patch the
   frontend around it.
4. **Visual Gate** (`frontend-visual-gate.md`, for any surface that renders) — its four stages, in order:
   preflight → independent critique (+ `victor:quality-gate-design` lens) → **visual render from the shipped
   code** → **Victor's visual approval** (the terminal human gate; `visual-approved: <date>` recorded). A
   non-rendering unit (pure logic/model) takes the normal §XXVI gate only — no visual stage.
5. **Verify — performance + a11y/responsive ("responsible") + quality** against the G1 bar (perf budgets,
   WCAG 2.2 AA, reduced-motion, focus management, offline/optimistic states, dark mode — the exact checklist
   is G1's output).
6. **PR → merge** — own branch off latest `main` → PR → `gh pr merge --merge --delete-branch`.
7. **§XXIX currency** — the surface's `current-*` docs never lag the merged code.

## 7. Where this sits — the G0–G6 sequence + the global spine

**G0–G6** (gate table + output homes in `_index.md §5`). This doc is **G0**. Each gate starts from zero
assumptions by reading the prior gate's output:

- **G1** adds the **Vida Frontend Quality Bar** — the yardstick §4's audit and §6's Visual Gate measure
  against. This doc defines _when_ we measure; G1 defines _what good is_.
- **G2–G5** produce the surface map → composition map → coverage gate → order. The 222 P4 legs are the
  **floor**; G2's audit discovers cross-module aggregator surfaces + unannounced intent (the **ceiling** is a
  superset) — `_index.md §G2–G6`.
- **G6** (semi-destructive, Victor-approval-gated) reshapes Linear: retire the 24 module-twin `fe-*`, create
  surface issues, re-point `HARD-4 ← all frontend`.
- **builds** then run §6 above, per surface, in G5 order.

**Global spine integration:** §XXVI (per-step build gate) · §XXVII (session path — each build session surfaces
this loop) · §XXVIII (deviation protocol) · §XXIX (currency rule) · the Visual Gate · the code-first
source-of-truth.

**G1 input carried from `_index.md §7`:** the **aesthetic & density direction** (information-dense power-tool
vs. calm/spacious) is _not_ needed to lock this process — it is an input to the **bar**. Decide it at G1.

## 8. Scope & invariants

- **Web-only for M1.** M1.2.\* targets `apps/web`. Mobile (Expo) / desktop (Tauri) affordances are re-audited
  at M4 (multi-device/venues); G4 coverage is **web**, with a separate mobile/desktop coverage gate at
  M4-start (`_index.md §6`).
- **Isolation.** This track runs in the `frontend-track` worktree off `main`; `main` holds only _merged_
  backend, so the frontend never builds on churning code. Planning/campaign work (G0–G6) = its own branch →
  merge to `main`; each surface build = its own branch → PR.
- **Frozen contracts.** Once a surface build starts, the backend services it consumes are frozen (their
  `§XXIX current-*` docs).
- **Nothing-left-behind (the M1 guarantee).** (a) the 222-leg floor + G4 set-cover = every module capability
  surfaces; (b) surface ← backend edges = no building on unfinished backend; (c) `HARD-4 (#95) ← all frontend`
  = "M1 done needs both tracks" (ADR-019 §3.2). **This is process-gated, not structural** — it holds only if
  G2's 3-lens audit actually surfaces the missing/unannounced. Victor's review of the MISSING list is the hard
  gate before G3.

## 9. References

- `docs/specs/foundation/frontend-replan/_index.md` (establishment + G0–G6 gate table + output homes)
- `docs/specs/foundation/frontend-source-of-truth.md` (code-first; running screen = reference prototype)
- `docs/specs/foundation/frontend-visual-gate.md` (the four-stage empirical gate)
- `~/dev-toolkit/standards/process.md` §XXVI/§XXVII/§XXVIII/§XXIX (the global spine)
- `docs/specs/foundation/ux-1-information-architecture/view-intent-harvest.md` (surface inventory, nav axes)
- `docs/core/decisions/ADR-019*.md` §3.2 (M1 scope, both-tracks) · ADR-021 (campaign, frontend split)
- Sketch: `~/Documents/Idea-of-the-process-for-design-to-frontend.rtf` (ISO 9241-210 · Five Planes · Intake→Process→Output)
