# G0 — The Entity Live Close (how every frontend unit behaves from now on)

> **Status:** G0 spec (§XXVI g1), rev 3, 2026-10-21. Parent: `_index.md` (EST, APPROVED rev 3).
> rev 1 went to an independent critique (REVISE: 5 blocking, 4 nits); all 9 are folded in (§9).
> **Nature:** a **ratification**. Every rule below is stated in a governing doc or a recorded decision; G0 gathers
> them into one checkable definition and writes it into the flow so it binds from now on. Nothing here is an open
> decision (Victor, 2026-10-21: "already answered in the documentation, on the architecture and organization of
> the OS"). Two edits **raise a project precedent/directive into the global method** (T1's live leg; T1's §3.75
> items 4–5 + ELC-9 / §2.5 rules 2–3 from Victor's Envision directive); each is labeled as such,
> not dressed as ratification.
> **No-Guessing:** `[FACT: path:line]` · `[INTERP — grounded]` · `[UNKNOWN]`.

---

## 1. The rule: the ENTITY is the unit of delivery

An entity is built across two tracks and **closes once, as one unit**: "ENTITY CLOSE — both tracks green, every
slice's gate PASS" `[FACT: ~/dev-toolkit/…/entity-delivery-flow.md:49]`. The flow exists to prevent an entity
"split into a backend track and a frontend track *at the top* … per-slice verification gets batched or 'owed'"
`[:19-21]`. M1 must ship "coherent and usable" `[FACT: docs/core/decisions/ADR-019…:35]`.

**It is group work** (Victor): **① the backend is done → ② the frontend is developed on its seam contract → the
feature is wired live → Victor uses and tests it from then until M1 ends.** A ① track closing is **not** an
entity close, and neither is a ② surface alone.

## 2. The Entity Live Close (ELC) checklist

**Entry condition:** "ground every scope line in the docs first … never blanket-flip sight-unseen"
`[FACT: .claude/tasks/module-go-lives.md:15]`.

An entity is **Done for M1** only when every item holds:

| # | Criterion | Source |
|---|---|---|
| ELC-1 | **① service merged**, its per-slice Verification Gate passed (incl. "live smoke on the REAL data store") | `[FACT: entity-delivery-flow.md:157-177]` |
| ELC-2 | **② surfaces built on the seam contract**, "the service API the UI will consume" | `[FACT: entity-delivery-flow.md:37,52-53]` |
| ELC-3 | **Service registered** in the composition root, constructed once after the DB-ready gate ("adding a module appends its construction"), in dep-order per the service's `types.ts` | `[FACT: docs/infrastructure/web-client-runtime/current-business-rules.md:60-66]` · `[FACT: module-go-lives.md:18-19]` |
| ELC-4 | **Hooks live**: `useQuery`/`useMutation` over `getServices()`, structured keys, invalidate + re-read, no optimistic; `?sample` kept DEV-only for the Visual Gate | BR-RT-2 `[:13]` · BR-RT-4 `[:18]` · `[FACT: module-go-lives.md:20-21]` |
| ELC-5 | **Interactions wired**: the open/create/edit the surface needs, so no listed operation is a no-op | `[FACT: module-go-lives.md:22]` · `[INTERP — grounded: the entity's screen-flow lens enumerates them, entity-delivery-flow.md:185]` |
| ELC-6 | **Honest local-first states**: no fake spinners ("writes are instantly real locally"), honest sync status, the full 8-state machine | `[FACT: docs/specs/foundation/frontend-quality-bar/_index.md:50-52]` |
| ELC-7 | **Live leg of the Visual Gate**: the entity's closing slice is verified **in the running app on real OPFS** (Brave/Playwright, not jsdom): write → reload → persists → reopen with no spurious write; console clean | `[FACT: module-go-lives.md:23]` · `[FACT: home-journal-go-live/delivery/PLAN-S1.md:68-69]` · `[FACT: fe-calendar worktree …/fe-calendar/delivery/slice-map.md:40]` |
| ELC-8 | **Currency**: §XXIX `current-*` refreshed for every context touched, committed with the code | `[FACT: ~/dev-toolkit/standards/process.md §XXIX]` |
| ELC-9 | **Envision conformance at close**: **every** anchored checkpoint the entity carries (its own `envision.md`, plus the CODEC-unit ECs its surfaces actually exercise — `[INTERP — grounded: a surface composed from a CODEC unit inherits that unit's vision; scoped to exercised ECs to keep the close bounded]`) is re-verified **in the live app**. `structural` ECs: still met (no divergence since their slice passed). `feel` ECs: verified here, because their only home is "the LIVE per-slice Visual-Gate row". A diverging EC is ❌ wrong, and the entity is not Done | `[FACT: entity-delivery-flow.md:94-97]` (ECs = "a leading contract" the downstream gates are judged against) · `[:120]` (feel → LIVE row) · `[:127]` (Visual Gate FAILS on an unmet MUST) · `[:138-140]` (recovery sweep buckets against the pinned ECs) · **Victor's directive 2026-10-21** |

**Covered elsewhere (not dropped):** unit tests + tsc/eslint `[module-go-lives.md:23]` are the per-slice gates:
tsc 0 at Step 8 and `/component-audit` at Step 9 `[FACT: add-frontend-component/scenarios/default.md:46-47]`, plus the
Visual Gate's quality-gate-engineering `[entity-delivery-flow.md:190-192]`. The known seam gotchas `[module-go-lives.md:24-25]` stay as build-time
watch items: initVault is global now, and the editor mount-echo dedupe is caught by ELC-7's "no spurious write".

**Stays live until M1 ends.** A later change that breaks an ELC item is a regression, triaged under §XXIV.
**HARD-4 (M1 done)** inherits the ELC when G4 re-edges it. Today it is still blocked by the superseded 24-unit
FE list `[FACT: .claude/tasks/hard-4-polish.md:12-30; reconstructed-structure.md:183]`, so re-pointing it is a
G4 ledger item (§7 R7), not a claim made here.

## 2.5 The Envision route is a contract to the end, not a front gate

Victor's route for each entity is pinned at its Envision Gate as anchored checkpoints (EC-n). The record shows it
was not carried to the end:
- **16 of the 17** `fe-*` `envision.md` files pin ECs (≈185: 177 table rows + fe-codec-collection's 8 bullet ECs;
  fe-notes alone has 30, 4 with a `feel` component)
  `[FACT: docs/specs/foundation/fe-*/delivery/envision.md]` (only fe-codec-seams pins none).
- `notes-entity-usability` (#150) references **0** of fe-notes' 30 ECs `[FACT: grep EC- docs/specs/foundation/notes-entity-usability → 0]`.
- `home-journal-go-live` (#151) marked Envision **SKIP** ("no net-new affordance") and did not carry fe-home's
  existing ECs `[FACT: home-journal-go-live/delivery/PLAN-S1.md:28-30]`, though fe-home EC-3 pins "the journal
  page = prose + **inline** integration blocks + a '/' insert affordance" `[FACT: fe-home/delivery/envision.md:66]`.
- `feel` ECs were **unverifiable** while data legs were stubbed: their only home is the LIVE Visual-Gate row
  `[FACT: entity-delivery-flow.md:120]`.

**Rules (closing these two holes):**
1. **SKIP skips the greybox, never the checkpoints.** The one-question trigger test `[:104-107]` decides whether a
   *new* greybox is needed. A completion, re-scope or closing-slice unit with Envision SKIP **still inherits the
   entity's existing ECs** and carries every EC its slice touches as a named Visual-Gate MUST (`:124-127`). The PLAN
   lists them explicitly; "SKIP" with no EC list fails the PLAN gate.
2. **ENTITY CLOSE re-verifies the whole EC set live** (ELC-9). This is the end-of-route check: per-slice passes can
   drift as later slices land, and `feel` ECs only become checkable once the data is live.
3. **A diverging EC is resolved, never waived silently.** Either the build is corrected back to the EC, or Victor
   explicitly re-pins the EC (recorded in `envision.md` §Approval with the date). Divergence found in shipped units
   is ❌ wrong in the entity-rescope sweep `[:138-140]`.

## 3. Stubs: legitimate while planning, never at close

- **While building:** the frontend may plan against the API "real or stubbed", so the tracks don't run in sequence
  `[FACT: entity-delivery-flow.md:52-53]`. This is a *planning* convenience.
- **At close:** an unwired leg is allowed **only** with a proven issue home: a named issue with real edges (DF-12
  `[FACT: delivery-structure-reconstruction/reconstructed-structure.md:47]`). A stub homed to a closed or phantom
  unit (the "UI-3 / M1.1+" case `[FACT: docs/specs/fixes/notes-dataplane-orphan-deferral/_index.md:15]`) means
  the entity is **not Done**.
- **Multi-entity surfaces** (a surface composes features of many entities `[FACT: frontend-replan/_index.md:22-23]`):
  a leg that consumes another entity's data is homed, as an edge, to **that entity's ELC** or to its existing
  aggregator (summary/dashboard → HARD-1 · graph/backlinks → HARD-3 · search → DB-8
  `[FACT: reconstructed-structure.md:176,178,179]`). The surface closes for its own entity; borrowed legs light up
  as their owners close.

## 4. Who does the wiring

ELC-3…7 is the **entity's closing slice**. It runs after ① is merged, inside the entity's ② track, because it is
how the seam contract gets realised. In-flight units already plan it this way: fe-calendar S7 `useCalendar` over
`ProviderRead` `[FACT: fe-calendar slice-map.md:40]`, and notes #150 S2. A ① unit (e.g. mod-routines) closes its
**track** unchanged; its entity closes live when the ② closing slice lands.

## 5. CODEC units, shaped by role

All 13 Wave-0 CODEC units keep their defined roles `[FACT: frontend-replan/reconstructed-structure.md:17-33]`,
and **their ELC is met through their consumers**: a CODEC unit counts as live when the entity surfaces composed
from it close live. This includes **#13 composition seams**, whose recorded decision is "Option A — convention +
defer live", with the live mechanism chosen by the first consumer `[FACT: .claude/docs/decisions.md:1106-1108]`.
So each engine (SavedView · Capability · Template · Spaces) is wired in the **closing slice of its first consuming
entity**. It is not #13 debt. A CODEC defect found at a consumer's ELC is fixed in the CODEC unit.

## 6. The debt route (already-shipped, half-wired entities)

The flow already has the route: the **recovery variant, "Entity Re-scope Flow"**, for "an entity already partly
built, possibly wrong, possibly ungated". It sweeps both planes into ✅ · ❌ · 📄 · 🕳 · **⛔ ungated-owed**, then a
Re-scope Gate produces a corrected, tagged slice-map `[FACT: entity-delivery-flow.md:201-227, ⛔ at :218]`. It is
wired as the `entity-rescope` scenario in both build profiles `[FACT: ~/dev-toolkit/claude-profiles/add-{frontend,backend}-component/scenarios/entity-rescope.md]`.
- **Unmet ELC items are the ⛔ ungated-owed bucket.** Each debt unit = one entity run through entity-rescope,
  closing with its ELC.
- **"Go-live" is retired as a unit type.** The queue's items become entity-rescope units homed at G2–G4.

## 7. Propagation: the exact edits (applied after Approval 2)

**Toolkit** (global → `/toolkit-task`, Victor-approved; target files are clean in the toolkit tree; wording is
project-neutral: "the real data store", never "OPFS/Brave"):
- **T1** `claude-profiles/project-foundation/knowledge/reference-docs/entity-delivery-flow.md`:
  - `:49` (inside the ASCII box; exactly 75 chars, same as `:28`/`:39`): `╚═ ENTITY CLOSE — both tracks green, every gate PASS, entity LIVE ═════════`
  - after `:53` add the prose: "**A stub is a planning convenience, never a close state.** ENTITY CLOSE requires the
    entity *live*: its service wired into the app, every surface reading/writing it for real, verified on the real
    data store. An unwired leg at close needs a proven issue home (a named issue with real edges). A backend track
    closing is not an entity close."
  - §5, after `:195` (end of the Visual Gate paragraph, before the Reconciliation paragraph at `:197`) add: "**Live leg (the entity's closing slice):** the Visual
    Gate runs in the running app on the **real data store** (not fixtures/sample data): write → reload → persists
    → reopen with no spurious write. This is the UI twin of the backend's live smoke (§4)." *(Raises the Vida
    precedent, module-go-lives.md:23 / #150 / #151, into the global method; today the doc names a "live Visual
    Gate" only for feel ECs, `:120,:152`.)*
  - §6, after `:218` (inside the diagram code block) add the diagram line: `│    unmet live-close items (ENTITY CLOSE) → ⛔ ungated-owed`
  - §3.75 Propagation, after item 3 (`:127`) add two numbered lines *(second precedent-raise: Victor's 2026-10-21
    directive into the global method; the doc's own EC checks are per-slice only, `:124-127`)*:
    `4. **SKIP skips the greybox, never the checkpoints.** A later unit of the same entity (completion, re-scope, closing slice) that skips Envision still inherits the entity's pinned ECs and lists every EC its slices touch as named Visual-Gate MUSTs.`
    `5. **ENTITY CLOSE re-verifies the entity's EC set in the live app** — structural ECs still met, ` + "`feel`" + ` ECs verified here. A diverging EC is corrected or explicitly re-pinned by the human (dated in ` + "`envision.md`" + ` §Approval), never silently waived.`
  - "fired" → "fired **or inherited**" at every EC-consuming conditional: `:193` ("Where the Envision Gate fired" →
    "Where the entity has pinned ECs (Envision fired now or inherited)"), `:138` (recovery: "envision the TARGET" gains
    "or, if ECs already exist, sweep against the inherited set"), `:255` ("Envision coverage (when the Envision Gate
    fired)" → "(when the entity has pinned ECs, fired now or inherited)").
- **T2** `claude-profiles/add-frontend-component/scenarios/default.md` (amend, add no new Step, so Step 11 Currency stays last, CHECK 13.3):
  - add a sub-line under Step 10 after `:50`: `        → ENTITY CLOSE slice: + the LIVE leg — the service wired in, every surface on real data, verified in the running app on the real data store (write → reload → persist); an unwired leg needs a proven issue home (entity-delivery-flow.md §2)`
  - Task List, after the Visual Gate item: `- [ ] Entity live close — service wired · surfaces on real data · verified on the real data store (or each unwired leg has a proven issue home) · EVERY pinned EC (structural + feel, incl. inherited) re-verified live`
  - Task List, at the Envision item (`:61`): append "· if SKIP: the entity's inherited ECs are still listed as this unit's MUSTs"
  - Step 1.5, after the trigger-test sub-line `:24` add: `  → SKIP still lists the entity's inherited ECs (from earlier envision.md) as this unit's Visual-Gate MUSTs`
  - Step 2 `:31`: "Envision coverage (if the gate fired)" → "Envision coverage (if the entity has pinned ECs — fired now or inherited)"
- **T3b** `add-frontend-component/scenarios/entity-rescope.md` (Envision): `:31` "If the Envision Gate fired:" → "If the
  entity has pinned ECs (fired now or inherited):"; after `:26` add the same SKIP sub-line as T2; Task List `:48`
  append "· if SKIP: inherited ECs listed + swept".
- **T3** `claude-profiles/add-frontend-component/scenarios/entity-rescope.md`:
  - Step 4 `:30` reconciliation sweep: append "— incl. the ENTITY CLOSE live criteria (unmet → ⛔)";
  - Task List `:49`: append "· live-close items swept";
  - Step 6 `:36` FRONTEND dispatch + Task List `:52`: append "+ the live leg on the entity's closing slice".
- **T4** backend scenarios, one line each, so a backend-only session can't declare ENTITY CLOSE:
  `add-backend-component/scenarios/default.md` Task List after `:66`, and `entity-rescope.md` after `:52`:
  `- [ ] Track close ≠ entity close — the entity closes live only when its frontend closing slice lands (entity-delivery-flow.md §2)`
- **T0 (precondition, preflight fix):** the toolkit tree has uncommitted changes, and `generate-guide.js --check`
  is **already failing before any G0 edit** (verified 2026-10-21). So T5's regeneration would sweep unrelated
  pending work into the G0 commit. Victor resolves the toolkit's pending changes first (commit or park them), and
  then `--check` must be green on that baseline before T1. The G0 toolkit commit is path-scoped to T1–T5's files only.
- **T5** regenerate the guide: `node scripts/generate-guide.js` → commit the regenerated `docs/toolkit-guide.md`
  (CHECK 9 `[FACT: .claude/commands/toolkit-check.md:193-198]`); then `/toolkit-check` must pass. The regen diff
  must contain only the T2–T4 scenario changes.

**Repo** (lands on `main` as the G0 PR):
- **R1** `frontend-quality-bar/_index.md`: §0 MISSING lens (`:24-25`) gains "a data leg stubbed with no proven issue
  home"; §2.6 (`:50-52`) gains "enforced at entity close: `golive-replan/process.md` ELC-6/7".
- **R2** `frontend-visual-gate.md:45`: the Screens/layout row of the render table gains "+ the live leg on the entity's closing
  slice: the running app on real OPFS, not `?sample` (golive-replan ELC-7)".
- **R3** `web-client-runtime/current-business-rules.md:64`: "Per-module go-live (`register + flip`) consumes it" →
  "each entity's closing slice (`register + flip`, golive-replan ELC-3/4) consumes it".
- **R4** layer docs `apps/web/src/seams/CLAUDE.md` + `apps/web/src/db/CLAUDE.md`: a one-line pointer to the ELC.
- **R5** `.claude/docs/decisions.md`: a `golive-replan G0` section (ratification · "go-live" retired · #13 by consumer
  · Envision = contract to the end: SKIP ≠ skip ECs, ELC-9).
- **R8** `golive-replan/_index.md` §3 G1: the debt census gains an **EC-conformance column**. For each shipped unit,
  every pinned EC (≈185) is checked against the code and the running app: ✅ met · ❌ diverged · ⏳ feel (unverifiable
  until live). The divergence list goes to Victor with the ORPHAN list.
- **R6** `.claude/tasks/module-go-lives.md`: status → "SUPERSEDED by golive-replan (debt homed at G2–G4)"; the file
  stays as the G1 seed.
- **R7** live-code/doc wording: `apps/web/src/db/composition-root.ts:11` ("Per-module hook go-lives") →
  "each entity's closing slice"; `apps/web/src/home/CLAUDE.md:22` ("future module go-lives") → "future entity
  closes (HARD-1 providers)". **Historical** specs keep the term on purpose (`data-plane-wiring/_index.md`, the
  notes/home-journal PLANs, `notes/types.ts:66`): they are records of their time.
- **G4 ledger item (not a G0 edit):** re-point `hard-4-polish.md`'s blocked-by list to the 42-unit surface set, with ELC as the close bar.

## 8. Acceptance (G0)
1. Every ELC item and every rule in §3–§6 cites a governing doc or a recorded decision; the one precedent-raise (T1
   live leg) is labeled; zero open decisions.
2. The checklist covers `module-go-lives.md:15-25` in full: each line is an ELC item, the entry condition, or a
   named "covered elsewhere".
3. The edits are exact (file + location + literal text); toolkit wording is project-neutral; no scenario gains a Step.
4. After applying: `generate-guide.js --check` and `/toolkit-check` pass; the repo diff touches only R1–R8.
5. **Envision carried to the end:** ELC-9 + §2.5 rules 1–3 make every pinned EC a close-time check; SKIP can no longer
   drop inherited ECs.
6. Independent critique SHIP + `/preflight` PASSED → Victor's Approval 2 → apply → G0 PR to `main`.

## 9. Gate record
- **rev 1 → independent critique: REVISE** (5 blocking · 4 nits). Folded:
  - B1 #13 is no longer given its own engine-wiring ELC; it follows its recorded "Option A, defer live to first
    consumer" decision (`decisions.md:1106-1108`). The EST `_index.md` G0(c) carries the same correction
    (§XXVIII deviation, logged in the task's Route History).
  - B2 the HARD-4 claim was replaced by "inherits the ELC when re-edged at G4".
  - B3 citations corrected (ELC-2 `:37`, ⛔ `:218`, VG `:190-195`, §6 `:201-227`, FQB `:50-52`; ELC-5 re-sourced
    with INTERP labeled; ELC-3 dep-order sourced to `module-go-lives.md:19`).
  - B4 T5 regenerates the toolkit guide (CHECK 9); no new Steps (CHECK 13.3); the `:49` box line kept short.
  - B5 T2/T3 now literal, with locations; T4 adds the backend "track close ≠ entity close" line.
  - N6 R7 covers the live "go-live" wording; historical specs explicitly kept.
  - N7 entry condition + "covered elsewhere" added.
  - N8 ELC-7 re-sourced to FACTs; T1's live leg labeled a precedent-raise.
  - N10 §5 shrunk to one rule.
- **rev 2 → `/preflight`: BLOCKED** (toolkit guide already drifted before G0, so T5 would sweep unrelated work in) →
  **T0 precondition added → PASSED**.
- **rev 2 → re-critique: REVISE → fixed → SHIP-ready.**
  - Blocking: the T1 box line is now 75 chars (verified with `len`).
  - Nits folded: the Visual Gate insert moved to after `:195`; the §6 note is written as a `│` diagram line; tsc/eslint
    re-cited to scenario Steps 8–9; "G4" used throughout; R2 anchored at `:45`.
- **rev 3 → critique (delta): REVISE** → folded: every EC-consuming "if the gate fired" conditional → "fired or inherited" (T1 `:138,:193,:255` · T2 Step 1.5 `:24` + Step 2 `:31` · T3b entity-rescope `:26,:31,:48`); counts corrected (≈185 / 16 of 17 envision.md files); ELC-9 CODEC scope narrowed to exercised ECs (INTERP-labeled); second precedent-raise labeled; T1 items 4–5 as separate literal lines; acceptance renumbered.
- **rev 3 — Victor at Approval 2:** "the envision gate is not being properly checked at the end … the features …
  are all diverging from the route I established on the envision". Verified: ≈185 ECs across 16 of 17 envision.md files; #150
  carried 0 of fe-notes' 30, and #151 SKIPped without carrying fe-home's. Added ELC-9, §2.5 (SKIP ≠ skip ECs · close
  re-verifies all ECs live · divergence corrected or re-pinned), T1/T2 Envision edits, and R8 (EC column in the G1 census).
