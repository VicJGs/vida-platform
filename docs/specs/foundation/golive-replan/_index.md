# Go-Live Re-plan — Establishment & Master Plan (the "live" definition + the half-wired fe-* debt)

> **Status:** ESTABLISHMENT (planning), rev 2. Authored 2026-10-21 with Victor after a STRUCTURAL triage.
> rev 1 went to an independent adversarial critique (REVISE: 6 blocking, 4 nits) and **all 10 were folded in**
> (§7 gate record).
> **Profile:** Project Foundation / Delivery Structure Reconstruction, run on the **frontend-replan establishment
> model** (master plan → numbered gates, each with a fixed output home; only the final gate writes to Linear).
> **Isolation:** worktree `.claude/worktrees/golive-replan` (branch `golive-replan`) off `main @ 3b0ecc8`.
> **Supersedes (at G4):** the ad-hoc `module-go-lives` queue as the way shipped surfaces become usable. Its
> *direction* is preserved; its *form* (out-of-structure units, one at a time) is retired.
> **No-Guessing:** every claim is `[FACT: path:line]`, `[INTERP]`, or `[UNKNOWN]`.

---

## 1. Context & the problem (the 2026-10-21 triage)

**Symptom (Victor):** "the modules are not getting the designed features to go live while programming and
developing the rest of the OS … we keep going around in circles."

**Root cause (one sentence):** the **entity** stopped being the unit of delivery. Backend ① and frontend ② units
each closed on their own track: surfaces planned against a stubbed service, which is a legitimate *planning*
convenience. But **ENTITY CLOSE, the step that requires both tracks together, never ran**, so FE units were
marked Done while **"done" ≠ "usable"**. That is the exact failure the Entity Delivery Flow exists to prevent:
"an entity gets split into a backend track and a frontend track *at the top* … per-slice verification gets
batched or 'owed'" `[FACT: entity-delivery-flow.md §1, :49,53]`. `[INTERP — grounded]` The frontend-replan
surface grain (G6) re-homed FE work to surfaces with no ENTITY CLOSE binding them back to their entity
`[FACT: frontend-replan/_index.md:22-23]`.
(A contributing gap: the shell-wiring row #69 was split away at frontend-replan G6. Its legs were M1.0 shell
wiring, not the per-module data legs, which ride their MOD twins.) Every go-live since then is minted *outside* the
structure to repay that debt.

| # | Finding | Evidence |
|---|---|---|
| F1 | The canonical structure has **no go-live layer**: each `FE-*` "rides its M1.1.x backend twin 1:1", with outcomes "over the finished service" | `[FACT: delivery-structure-reconstruction/reconstructed-structure.md:137,140-171]` |
| F2 | FE plans declared their data leg a stub and homed it to a phantom ("UI-3 / M1.1+"; UI-3 is the closed editor). Proven for notes; settings and notifications follow the same pattern. Whether **every** surface does is a G1 result | `[FACT: docs/specs/fixes/notes-dataplane-orphan-deferral/_index.md:15-21]` · `[FACT: .claude/docs/decisions.md:9,21]` · `[INTERP — G1 confirms]` |
| F3 | This is the **db-10 / DF-12 failure class** (a deferral with no proven issue home). The fix unit left its milestone `[UNKNOWN]` | `[FACT: same :22,47]` · `[FACT: reconstructed-structure.md:47]` |
| F4 | **The go-live units sit outside the `#` order.** There were three go-lives: PR #149 `fe-notes-golive`, #150 `notes-entity-usability`, #151 `home-journal-go-live`. Together with `data-plane-wiring` (#148, which does carry a real milestone, M1.1.3) and the `module-go-lives` queue, **none has a `#` row or edges**. `notes-entity-usability`/`home-journal` use undefined milestone labels ("M1.1.3+", "M1 — per-module usability"). In the committed tree the LIF ids are still "pending". LIF-237/238/239 (data-plane · `note-open-behavior-preference` · notes-entity-usability) exist only in uncommitted main-checkout edits; home-journal has none | `[FACT: .claude/tasks/data-plane-wiring.md:3,7]` · `[FACT: notes-entity-usability.md:3,6]` · `[FACT: module-go-lives.md:4]` · `git log origin/main` (#149 `a59eef5`) |
| F5 | **Stale headers.** `data-plane-wiring` says "planning … nothing built" but shipped as PR #148, edited `client.ts` (which its revised scope said to leave untouched), and never filled its Build Steps. `home-journal-go-live` says "uncommitted … awaiting PR", but #151 is merged. TASKS.md lists fe-gamification and fe-shell as "PR open", but #140 (`8c1070d`) and #118 (`2613a35`) are merged | `[FACT: data-plane-wiring.md:2,16,42,45]` · `[FACT: home-journal-go-live.md:2]` · `[FACT: TASKS.md:12,14]` |
| F6 | **Two structures, never reconciled, and the wiring row was lost.** The initiative structure still lists the superseded 24 `FE-*` rows (with `#64`/`#65` used twice). The 42-unit order lives separately in `frontend-replan/reconstructed-structure.md`. The old row **#69 `FE-shell-integration-wiring`, "wire built M1.0 UI to services"**, was **split** into chrome units #14–17 at frontend-replan G6, and the wiring obligation disappeared there. Neither structure has a data-plane row | `[FACT: delivery-structure-reconstruction/reconstructed-structure.md:124-125,140-141,145]` · `[FACT: frontend-replan/g6-edge-ledger.md:33]` · grep "data-plane" → 0 in both |
| F7 | `MVP-PATH.md` (2026-10-12) still says the data plane is a stub and fe-calendar is ✅ done | `[FACT: docs/roadmap/MVP-PATH.md:10-15,122]` |
| F8 | **The flow lets a stub close.** Entity Delivery Flow: the frontend "plans against a *known* service API (**real or stubbed**)", and ENTITY CLOSE requires only "both tracks green, every slice's gate PASS". Nothing swaps the stub for the real service. The backend gate has "live smoke on the REAL data store", and the Visual Gate has nothing like it. The add-frontend-component scenario carries no live criterion either. The quality bar already *implies* the rule ("writes are instantly real locally") but no gate enforces it | `[FACT: ~/dev-toolkit/…/entity-delivery-flow.md:49,53,176]` · `[FACT: ~/dev-toolkit/claude-profiles/add-frontend-component/scenarios/default.md]` · `[FACT: frontend-quality-bar/_index.md:50]` |
| F9 | The composition root's `Services` exposes only **2** of **22** `create*Service` factories (notes, journals). Spaces/backlinks/registries are built only as internal dependencies | `[FACT: apps/web/src/db/composition-root.ts:33-36,68-76]` · grep `packages/core/src` → 22 |

**Are the go-lives making the drift bigger?** Yes, in their current form. Each re-opens a Done unit
out-of-band, creates an issue the tracker can't order, and adds an undefined label. Because the flow (F8) still
lets a stubbed surface close, every future surface can repeat it. **The debt is bounded, though:** the data plane
exists now (PR #148). Once the flow is fixed, the debt is only the already-shipped surfaces. `[INTERP]`

## 2. The job
1. **Ratify, from the docs, how a frontend unit behaves from now on, and write it into the governing flow
   immediately** (before any more surfaces close).
2. **Census the debt**: exactly which legs of which shipped surfaces are live / stub / partial, plus seam defects.
3. **Home the debt** as db-10-proof units inside the one canonical structure, reusing existing homes first.
4. **Projectize** through one ledger-gated Linear write.

## 3. The gate sequence (EST → G0–G4 → builds)

Every gate runs §XXVI: a persisted plan, `/critique` with an **independent adversarial critic** (fresh subagent,
cross-checks code and ADRs, not this doc), `/preflight`, then **Victor's approval**.

| Gate | Purpose | Output home | Writes outward? |
|---|---|---|---|
| **EST** | This master plan | `golive-replan/_index.md` | no |
| **G0** | **Ratify the Definition of Live (DoL) + propagate it into the governing flow** | `golive-replan/process.md` + the edits below | **semi**: the toolkit edit goes via `/toolkit-task` with Victor's approval |
| **G1** | **Debt census**: surface × leg → LIVE / STUB / PARTIAL + seam defects + DF-12 deferral sweep | `golive-replan/debt-census.md` | no |
| **G2** | **Debt decomposition + coverage**: units (homes + edges), set-cover both ways as its acceptance | `golive-replan/debt-plan.md` | no |
| **G3** | **Order + one structure + the G4 ledger**: interleave the debt; reconcile the two structure docs; refresh MVP-PATH; author the migration ledger | both `reconstructed-structure.md` · `MVP-PATH.md` · `golive-replan/g4-edge-ledger.md` | no (docs) |
| **G4** | **Linear reshape** from the approved ledger | Linear + task files | **YES — needs Victor's approval** |
| builds | each debt unit through Entity Delivery Flow ②, closing under the DoL | per-unit `docs/specs/…/<unit>/` | — |

*(rev 1 had G0–G6. G3-coverage folded into G2 as its acceptance, and G5-propagation folded into G0 so the rule
binds immediately; critic findings 5 and 8.)*

### G0 — Ratify the DoL + make it bind now
- **Pre-solved inputs (G0 RATIFIES these against the docs, it does not re-gather them):**
  - the per-surface live checklist: register the service in the composition root (dep-order) → flip the stub hooks to
    `useQuery`/`useMutation` (BR-RT-2/4; keep `?sample` for the Visual Gate) → wire the interactions → verify live
    in Brave on real OPFS + tests + §XXIX + the known gotchas `[FACT: .claude/tasks/module-go-lives.md:18-27]`;
  - "a flip is an owned completion of that module's done unit" `[FACT: data-plane-wiring.md:23]` ·
    `[FACT: docs/specs/foundation/data-plane-wiring/_index.md:17,19]`;
  - the two worked precedents #150/#151 (checked against the docs, not taken as law: BR-NEU-5 almost regressed in
    #151 and the docs caught it).
- **Governing set to check them against:** ADR-019 §3.2 "coherent and usable" `[FACT: ADR-019:35]` · BR-RT-2/4
  `[FACT: docs/infrastructure/web-client-runtime/current-business-rules.md:13,18]` · `ProviderRead`, "do not
  re-invent" `[FACT: apps/web/src/seams/CLAUDE.md:31]` · quality-bar "writes are instantly real locally"
  `[FACT: frontend-quality-bar/_index.md:50]` · `frontend-visual-gate.md` · `frontend-replan/process.md` ·
  first-consumer-pull homing `[FACT: home-deferred-substrate-pieces/PLAN.md:9-12]`.
- **Doc-fixed answers (G0 cites them; nothing is asked; Victor 2026-10-21: "already answered in the
  documentation, on the architecture and organization of the OS"):**
  - (a) **Stubs:** "real or stubbed" is a *planning* convenience so the tracks need not run serially
    `[FACT: entity-delivery-flow.md:53]`. It is never a close state: the entity closes only when "both tracks
    [are] green" `[:49]` and nothing is "owed" `[§1]`, and M1 ships "coherent and usable" `[ADR-019:35]`. Any
    deferral carries a proven home (DF-12).
  - (b) **Registration is group work, part of the ENTITY's joint delivery:** backend ① done → frontend ② built on
    its seam contract → the feature wired live so Victor can **use and test it through the end of M1**.
    Registering in the composition root is how the seam contract gets realised ("adding a module appends its
    construction" `[FACT: web-client-runtime/current-business-rules.md:60-64]`), and it lands at ENTITY CLOSE. It
    is not a MOD-vs-FE fork.
  - (c) **CODEC units keep their defined roles** (Wave 0 #1–13 `[FACT: frontend-replan/reconstructed-structure.md:17-33]`)
    and are **shaped toward the M1 live end goal by role**: all 13 are satisfied when their consuming surfaces
    close live. This includes #13 composition seams, whose recorded decision is "Option A — convention + defer
    live" to the first consumer `[FACT: .claude/docs/decisions.md:1106-1108]`, so each engine is wired in its
    first consuming entity's closing slice. *(Corrected at G0 rev 2, §XXVIII: rev 3 had invented a separate
    engine-wiring close for #13.)*
- **So the DoL is an ENTITY-level close (the "Entity Live Close"):** an entity is Done for M1 when its ① service
  is merged, its ② surfaces are built on the seam contract, the service is registered, the hooks are live, the
  interactions are wired, and the whole thing is verified live on real OPFS, so it is usable and testable from then
  to M1's end. Surfaces composing several entities close when every entity they consume is live (or the leg carries
  a proven home).
- **Propagation (inside G0, so it binds before G1 runs):**
  - **Toolkit** (affects every project → `/toolkit-task` + Victor's approval): `entity-delivery-flow.md`, i.e.
    ENTITY CLOSE gains "stub swapped for the real service" and the Visual Gate gains a live-data leg mirroring the
    backend's "live smoke on the REAL data store" `[FACT: :49,176]`; the "real or stubbed" clause `[:53]` gains the
    legitimate-stub rule; the add-frontend-component default scenario's Done-when.
  - **Repo:** `frontend-quality-bar/_index.md` (the enforcing criterion next to `:50`) · `frontend-visual-gate.md`
    · `.claude/docs/decisions.md` (precedent entry) · layer docs `apps/web/src/seams/CLAUDE.md` +
    `apps/web/src/db/CLAUDE.md`.
- **"Go-live" retires as a unit type:** debt units are completions of an existing home (§G2); new surfaces close live.

### G1 — Debt census (a checked table; no new tooling)
- **Population** (shipped = merged to main `[FACT: git log origin/main]`; a merged PR outranks TASKS.md `[FACT: MVP-PATH.md:205]`):
  - **Feature surfaces:** fe-home · fe-notes-and-pages · fe-settings · fe-notifications · fe-onboarding ·
    fe-session-runtime · fe-session-hud · fe-shell (#118 merged) · fe-shell-scope · fe-gamification (#140 merged).
  - **CODEC units, audited individually:** fe-codec-seams (#13, wiring-purpose) · fe-codec-flow-session (effect-rail
    log) · fe-codec-entity-facet · plus the rest of `fe-codec-*`.
  - **Traced obligation:** old #69's 11 RIDE legs (⌘K search · export dialog · serializers · neural-graph · Spaces
    menu) through fe-shell and chrome units #14–17 `[FACT: g6-edge-ledger.md:33]`.
  - **In flight, recorded not audited:** fe-calendar (its own S7 is the data leg).
- **Method:** seed the table from `module-go-lives.md`'s 5-item enumeration and the composition root. Per unit,
  classify each leg (stub = returns empty / `?sample`-only / throws; live = `getServices()` + query). Add what grep
  can't see: interaction no-ops, seam defects, and each plan's declared deferrals (DF-12 sweep: every
  "stub/deferred/out" line → homed or ORPHAN). A script is **not** built: about 15 units is a checked table, and
  HARD-4 inherits the ELC once G4 re-edges it. (Critic finding 8.)
- **EC-conformance column (G0 R8):** for each unit, every pinned Envision EC (≈185 across 16 of 17 `envision.md`)
  is checked against the code and the running app: ✅ met · ❌ diverged · ⏳ feel (unverifiable until live). Inherited
  ECs count for completion units that SKIPped Envision (#150/#151) `[FACT: process.md §2.5]`.
- **Teeth:** the independent critic re-checks ≥30% of rows against code; Victor reviews the ORPHAN list **and the EC
  divergence list**.

### G2 — Decompose + cover
- **Reuse existing homes first (no duplicates).** Debt that belongs to an existing issue is **re-edged, not
  minted**: home summary/dashboard providers → HARD-1 (`hard-1-summary-registry`, LIF-112); graph/backlinks →
  HARD-3; live search → DB-8 `[FACT: reconstructed-structure.md:176,178,179]`. Only the rest becomes new units.
- New units are completions of their FE surface, grouped by shared seam (one service registration + every consuming
  hook = one unit), db-10-proof: ADR-018 homes, real `←` edges (data-plane ✅, the surface, the service).
- **Acceptance = coverage (set-cover both ways):** every STUB/PARTIAL leg → exactly one home; every new unit →
  ≥1 real leg; every ORPHAN deferral → a home or a documented `⚠ INTENDED-later` tail.

### G3 — Order + one structure + the ledger
- Make the initiative structure the single canonical: replace the 24 superseded `FE-*` rows with the 42-unit order;
  fix the `#64`/`#65` collision; add the data-plane row (✅ #148, `← AR-2, AR-4`, `→` the FE surfaces); interleave
  the debt units, dependency-correct. Refresh MVP-PATH with the archived-inclusive census
  `[FACT: MVP-PATH.md:195-205]`.
- Author `g4-edge-ledger.md` (the frontend-replan G6 precedent `[FACT: frontend-replan/_index.md:153-157]`): the
  affected issues + edges, the create / re-home / re-edge / retire map, and a rollback contingency.

### G4 — Linear reshape (the only tracker write)
- **Victor approves the ledger** → dry-run `tracker_sync --status` must show zero warnings → write.
- **In scope:**
  - mint the new debt units;
  - re-home `data-plane-wiring` (LIF-237), `note-open-behavior-preference` (LIF-238) and `notes-entity-usability`
    (LIF-239), after committing those LIF headers from the main checkout;
  - mint/home `home-journal-go-live`, and record #149 `fe-notes-golive`;
  - retire the `module-go-lives` queue;
  - re-edge HARD-4.
- **Header hygiene:** F5's stale headers · TASKS.md rows for #140/#118 · db-10's stale "superseded/Phase 1.0" header
  `[FACT: db-10-seed-and-fixtures.md:7-14]` · the session-log line calling mod-routines "not started".

## 4. Parallelism, isolation & integrity
- **Paused:** the `module-go-lives` queue. No new go-live until G4 homes the debt.
- **mod-routines** (backend ①, S3/8 in its worktree; main-tree status line reads `paused`
  `[FACT: .claude/tasks/mod-routines.md:2]`): **resumes as the ① track of the routines entity.** Its ① close is
  unchanged (S1–S8, backend verification gate). The routines *entity* closes live only when FE-routines ② lands
  and the service is registered and wired (G0(b): group work).
- **fe-calendar:** S5/S6 (renderers) continue. Its **unit close (S7, `useCalendar` over `ProviderRead`, the data
  leg)** must meet the ratified DoL `[FACT: fe-calendar worktree docs/specs/foundation/fe-calendar/delivery/slice-map.md:40]`.
- **Per-gate merge cadence (preflight fix):** the rule must bind on `main`, because other sessions (fe-calendar)
  read `main`. So **G0 lands as its own PR to `main`** the moment it is approved (the toolkit edit binds globally
  via `/toolkit-task`). G1–G3 land per gate on the same branch line; G4 executes from `main` (frontend-replan G6
  precedent). Each debt unit = its own branch off latest `main` → PR → merge.
- **Pre-G0 checks:** the toolkit tree is currently dirty (the auto-update skipped), so confirm G0's toolkit edits
  don't collide. Commit the main checkout's uncommitted LIF headers before G4.
- **M1 integrity:** HARD-4 requires all FE units `[FACT: reconstructed-structure.md:183]`, but today it is blocked by
  the superseded 24-unit list `[FACT: .claude/tasks/hard-4-polish.md:12-30]`. G4 re-points it to the 42-unit set
  with the ELC as its close bar; only then can HARD-4 not close on half-wired surfaces.

## 5. Open decisions
- **None.** G0(a)–(c) are doc-fixed (§3 G0). A genuine fork found later is raised at its gate only after the
  governing-docs sweep fails to answer it.
- **Web-only for M1** (doc-fixed); the DoL is re-audited for mobile/desktop at M4 `[FACT: frontend-replan/_index.md:167-169]`.

## 6. Acceptance (EST)
1. F1–F9 each cite a real `path:line` (or are labeled), and the critic re-verified them.
2. Every gate has a purpose, an output home and the §XXVI double-gate; outward writes are flagged (G0-toolkit semi,
   G4 full).
3. Pre-solved inputs and the G0(a)–(c) answers are cited as doc-fixed; §5 open decisions = none.
4. Every in-flight unit (mod-routines, fe-calendar) has a disposition; merged PRs are in the shipped population.
5. Critique SHIP + `/preflight` PASSED, then Victor's approval → G0 opens.

## 7. Gate record
- **rev 1 → independent adversarial critique: REVISE** (6 blocking · 4 nits). Folded:
  - B1 G0 now ratifies the pre-solved checklist instead of re-gathering it;
  - B2 #140/#118 moved to the shipped population (merged), stale rows added to hygiene;
  - B3 the fe-calendar disposition now targets S7, not S5;
  - B4 the population gained fe-codec-seams/flow-session/entity-facet and the #69 trace;
  - B5 propagation folded into G0;
  - B6 the toolkit write is flagged and routed via `/toolkit-task`, and the layer-doc paths are corrected;
  - N7 existing homes (HARD-1/HARD-3/DB-8) are reused first;
  - N8 G3 folded into G2 and the census script dropped;
  - N9 mod-routines status and registration ownership carried as G0(b);
  - N10 evidence lines tightened, and LIF-238 and #149 named.
  - Corrections to rev 1: F2 downgraded to `[INTERP]`; F4 milestone/LIF claims fixed; F9 corrected (2 exposed / 22 factories, not 3 / ~15).
- **rev 2 → `/preflight`: BLOCKED (1 gap: the G0 rule only binds once on `main`)** → fixed (per-gate merge cadence,
  §4) → **PASSED**.
- **rev 2 → re-critique: SHIP** (all 10 RESOLVED · all new citations verified · 2 nits folded: the root-cause
  sentence no longer overclaims #69; the shipped-population cites `git log` and not stale TASKS.md).
- **rev 3 — Victor's correction at Approval 1:** the three "open" G0 questions were doc-answered. They are re-written as
  cited facts. Registration = the entity's group work (① → ② → wired live, usable until M1 end). CODEC units are
  shaped by role. Root cause sharpened: the entity stopped being the unit of delivery, so ENTITY CLOSE never ran.
