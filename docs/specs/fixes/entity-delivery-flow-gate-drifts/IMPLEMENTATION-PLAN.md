# IMPLEMENTATION-PLAN — Entity Delivery Flow gate drifts (gate-2)

> Fixes the three drifts diagnosed in `_index.md` (A cross-plane recovery · B Documentation Gate · C ordering).
> STRUCTURAL · 4 files, one coherent change. No product code — methodology/process docs only.
> Resolves gate-1 carry-ins CI-1 (standards seam) · CI-2 (additivity cite) · CI-3 (DESIGN §10/§11).

---

## Design decisions locked before edits

- **DD-1 (CI-1) — cross-plane standards seam = an explicit `## Workflow` load ACTION, not prose (gate-2 fix).**
  Standards load **by profile**, not by scenario (`[FACT: STANDARDS.md:57-73]` — profile→domain map; kickoff reads
  the active profile). So editing a scenario's "Why here" prose to claim it "loads the union" loads nothing — the
  exact descriptive-not-wired drift this fix kills. The real wiring:
  - `[FACT: STANDARDS.md:69]` the **FE profile already loads all 5** (design·components·motion·engineering·process)
    = the full cross-plane union → for a FE entry (MOD-notes), the backend plane's standards (engineering·process)
    are **already present**; the scenario load-action is a **verify/no-op**, and the "Why here" prose is corrected
    to state the profile loads all 5 (it currently understates as 3).
  - the **BE profile** is NOT in the map (`STANDARDS.md:67-85`) → it loads the narrower engineering·process set,
    **missing design·components·motion** → the BE scenario MUST add a real load action: **Read
    `standards/{design,components,motion}.md`** when the recovery begins (cross-plane).
  - Mechanism = fold a "cross-plane standards load" action into **Step 0** of both scenarios (no new numbered step,
    no renumber churn): FE = verify all 5 loaded (no-op); BE = Read the 3 frontend domains. Step 6 still dispatches
    the per-slice GATE by tag. `/task-switch` per slice = documented isolation fallback, not primary.
  - **`motion` justification (gate-2 NIT):** motion is a legitimate frontend-plane domain (the Visual Gate checks
    §IX motion per DoD) — it belongs in the frontend load, not scope creep.
- **DD-2 (CI-2) — the two yardstick gates are additive to §XXVI g1/g2.** `[FACT: standards/process.md:362]`
  (exact anchor; the block is :361-364) — §XXVI step 2 critiques *the slice's own spec* against *its own §2
  Business Rules + §4 Acceptance*. (Corrects the diagnosis's original `:358`, which pointed at the grandfathered
  `_index.md` clause, not the critique step.) The
  Documentation Gate gates the *upstream entity aspect corpus + front matter* (the yardstick); the Interpretation
  Gate gates the *interpretation artifact*. Different objects → additive. Every edit that introduces the gates
  states this so a reviewer can't collapse them into g1.
- **DD-3 — gate names + order (canonical).** `Baseline → ░Documentation Gate░ → Interpretation → ░Interpretation
  Gate░ → ░Decomposition Gate░`. Per track: `spec-set → ░Documentation Gate (spec-set)░ → per-slice g1/g2/build/
  Verification|Visual`. Recovery: `… → ░Documentation Gate░ → Interpretation(+built code) → ░Interpretation Gate░
  → Reconciliation(sweep ①+②, tag) → ░Re-scope Gate░ → resume by tag`.
- **DD-4 — what the Documentation Gate validates (definition, reused verbatim across all 4 files):** the source
  aspect corpus (identity·structure-data·business-rules·contract·conventions·current-*) + the baseline are
  complete, coherent, and No-Guessing-clean (every UNKNOWN resolved) BEFORE interpretation reads them or the
  ledger judges code against them. Per-track instance gates each spec-set before its build. Blocking.
- **DD-5 — what the Interpretation Gate validates:** the `delivery/interpretation.md` output — every DEPENDENCY/
  NEED/IMPLICIT-RULE surfaced, every UNKNOWN flagged not guessed — before decomposition/reconciliation rests on it.

---

## File 1 — `docs/specs/foundation/entity-delivery-flow/_index.md` (vida SoT)

**E1a · §2 "What is new" bullet (lines ~34-36).** Extend to name the two yardstick gates + the ordering:
add "the **Documentation Gate** (on the source corpus + baseline) and the **Interpretation Gate** (on the
interpretation output) — an escalating-trust chain `Baseline → Documentation Gate → Interpretation →
Interpretation Gate → Decomposition`; additive to §XXVI g1/g2 (DD-2, cite process.md:362)."

**E1b · §3 unified-flow ASCII (lines ~43-64).** Front matter becomes:
```
│  1 · BASELINE                 — one consolidated map: data + service + UI together
│  1.25 · DOCUMENTATION ░GATE░ ★ — gate the SOURCE aspect corpus + baseline (the yardstick) before it is read/judged
│  1.5 · INTERPRETATION LAYER  ★ — make the implicit explicit (see §4), from a TRUSTED source
│  1.75 · INTERPRETATION ░GATE░ ★ — gate the interpretation output before decomposition rests on it
│  2 · DECOMPOSITION ░GATE░    ★ — decide the slices AND the backend/frontend split
```
Per-track lines gain a spec-set doc gate: `3A · SERVICE SPEC SET → ░Documentation Gate (spec-set)░ → per slice …`
and `3B · UI/UX SPEC SET → ░Documentation Gate (spec-set)░ → per slice …`.

**E1c · new §4.5 "The yardstick gates (Documentation Gate + Interpretation Gate)".** Insert after §4. Content =
DD-4 + DD-5 + DD-2 (additivity, cite process.md:362) + one line on why the order is strict (input-before-
output; interpretation *consumes* the source per `:74`).

**E1d · §7 recovery ASCII (lines ~160-177).** Rewrite to:
```
INTAKE → BASELINE → ░DOCUMENTATION GATE░ → INTERPRETATION (+ built code is a source) → ░INTERPRETATION GATE░
│
╠═ AUDIT / RECONCILIATION layer ═══ ★variant-only★
│    sweep BOTH planes (① service + ② surface) vs INTERPRETATION, item by item, each cross-checked code ↔ its
│    doc layer AND tagged {backend | frontend | shared}: ✅ aligned · ❌ wrong · 📄 undocumented · 🕳 gap · ⛔ ungated-owed
│    EXHAUSTIVE — exit on a DRY pass
╠═ RE-SCOPE ░GATE░ ═══ tagged slice-map (every ❌/📄/🕳/⛔ → a scoped slice + its gate + its plane)
╚═ resume by tag: backend slices → ░Verification Gate░ · frontend slices → ░Visual Gate░ (shared → both)
```
Add a sentence: the front-matter gates run ONCE cross-plane; standards union loaded at kickoff (DD-1).

**E1e · §10 MOD-notes table (lines ~213-225) — re-cut (CI-3).** Add a **Plane** column; add two rows for the new
gates; retag the vault row. Corrected rows (illustrative):
| Item | Plane | Bucket | Action |
| notes aspect corpus + `delivery/` front matter | shared | 📄 → ░Documentation Gate░ | gate before the sweep |
| `core-vault-init-on-db-open` | **backend** | 🕳 gap (homed) | Service slice → Verification Gate (the cross-plane instance Drift A stranded) |
| ②b `/notes` · ②c editor | frontend | ⛔ ungated-owed | Visual Gate |
…retag every existing row with its plane; note the ledger itself passes the Interpretation Gate.

**E1f · §11 next-steps (lines ~229-236).** Reorder the "first artifact" chain: `reconciliation.md` is now preceded
by `baseline.md → ░Documentation Gate░ → interpretation.md → ░Interpretation Gate░`; reconciliation sweeps both
planes. Keep the naming-open item.

## File 2 — `~/dev-toolkit/…/reference-docs/entity-delivery-flow.md` (codified)

**E2a · §2 unified-flow ASCII (lines ~25-45).** Front-matter gate insertions as E1b (Documentation Gate +
Interpretation Gate). **NB (preflight NIT-4):** File-2's §2 ASCII track blocks are `TRACK A · BACKEND` /
`TRACK B · FRONTEND` with **no `3A/3B · SPEC SET` line** (unlike File-1) — so E2a must ADD a `spec-set →
░Documentation Gate (spec-set)░` line to each track block, not just insert a gate into an existing line.
**E2b · new §3.5 "The yardstick gates".** Mirror E1c (DD-4/DD-5/DD-2).
**E2c · §6 recovery ASCII (lines ~118-130).** Same rewrite as E1d (doc/interp gates before reconciliation;
cross-plane tagged sweep; resume-by-tag). Keep the "rejoins the normal tracks" prose but make the diagram show it.

## File 3 — `~/dev-toolkit/…/add-frontend-component/scenarios/entity-rescope.md`

> **Preflight gap-1 correction:** the scenario currently has **Steps 0–6** (`:18-33`; Step 5 = `/critique`,
> Step 6 = §XXIX Currency), NOT 0–4. Inserting the two gate steps pushes the tail: `/critique` → **Step 7**,
> Currency → **Step 8**. Every mapping below uses the true 0→8 result.

**E3a · Workflow Steps — re-cut (source 0–6 → result 0–8):**
- Step 0 Baseline (was 0) — refresh current-* for BOTH contexts touched (service + surface); built code a source.
  **+ cross-plane standards load (DD-1):** the FE profile already loads all 5 (`STANDARDS.md:69`) → verify, no-op.
- **NEW Step 1 · ░Documentation Gate░** — critique the source aspect corpus + baseline complete/coherent
  (DD-4); blocking; additive to §XXVI g1 (cite process.md:362).
- Step 2 Interpretation (was Step 1, `:19-21`) — read reference-doc **§3/§4/§5/§6** (was §3/§6). **Rationale
  (preflight gap-3):** §4 is the *Backend track* lens and §5 the *Frontend track* lens; the FE recovery adds the
  **other plane's track lens (§4 backend)** because the recovery is cross-plane (DD-1) — not a "missing §4".
- **NEW Step 3 · ░Interpretation Gate░** — critique `interpretation.md` (DD-5); blocking.
- Step 4 Reconciliation (was Step 2) — **sweep BOTH planes**, tag each item {backend|frontend|shared}.
- Step 5 Re-scope Gate (was Step 3) — **tagged** slice-map.
- Step 6 Resume (was Step 4) — **dispatch by tag**: frontend slice → Visual Gate (here); backend/shared slice →
  Service Build Flow's Verification Gate (standards already loaded per DD-1; `/task-switch` fallback noted).
- Step 7 `/critique` (was Step 5) · Step 8 §XXIX Currency (was Step 6) — content unchanged, renumbered.

**E3b · Skills Invoked — TWO edits:**
- (b-i) "Session open" skill: correct the "Why here" prose to state the FE profile **already loads all 5 domains**
  (design·components·motion·engineering·process, `STANDARDS.md:69`) — the full cross-plane union — so a backend
  slice's standards (engineering·process) are already present. (The real load is the profile mapping + the Step-0
  verify action per DD-1; prose only DESCRIBES it, never substitutes for it.)
- (b-ii) **(preflight gap-2) Renumber the step-label references** throughout `## Skills Invoked`: "Session open —
  Step 0/1" → covers Steps 0–1 (+ the new Documentation Gate); "Step 2/3 — Audit + Re-scope" → **Step 4/5**;
  every "Feeds into: Step 4" (per-slice resume) → **Step 6**; "Per-slice … (Step 4)" → **Step 6**. No skill label
  may point at a stale number.

**E3c · Task List.** Add rows: Documentation Gate PASS · Interpretation Gate PASS · reconciliation sweeps both
planes (tagged) · slice-map tagged · resume dispatches by tag.

**E3d · Anti-Patterns.** Add both: "**Judging code against an un-gated yardstick** — reconciliation without the
Documentation Gate can mark correct code `❌ wrong` when the DOC is what's stale." + "**Single-plane recovery** —
a UI-only sweep strands a backend-owned finding (the vault→core case)."

## File 4 — `~/dev-toolkit/…/add-backend-component/scenarios/entity-rescope.md`

**Symmetric to File 3** (same Steps 0–6 → 0–8 shift; same two gate inserts; same Skills-Invoke renumber b-ii;
same Task List rows). Mirror-tagged differences:
- Step 6 dispatch — **backend** slice → Verification Gate (here); **frontend/shared** slice → UI/UX Build Flow's
  Visual Gate.
- Step 2 reading: BE currently reads **§3/§4/§6** (`:21`) → add **§5** (the *Frontend track* lens — the other
  plane), result §3/§4/§5/§6. (Symmetric to FE adding §4.)
- **Step 0 cross-plane standards load (DD-1) — the REAL wiring on this side:** the BE profile does NOT load the
  frontend domains → add an explicit action **Read `standards/design.md` + `components.md` + `motion.md`** so a
  frontend/shared slice's Visual Gate has its standards. (This is the asymmetry — FE's Step-0 load is a no-op;
  BE's is a real Read.) The "Why here" prose is corrected to say so; it does not replace the Read action.
- **Anti-Patterns (preflight symmetry note): add BOTH** new entries, with the single-plane one mirror-worded —
  "a *service-only* sweep strands a **frontend**-owned finding."

---

## Verification (this fix's "acceptance")

1. `grep -in "documentation gate"` across all 4 files → **≥1 hit each** (Drift B closed).
2. Each recovery ASCII shows `Documentation Gate` before Interpretation and `Interpretation Gate` after (Drift C).
3. Each recovery ASCII shows a **both-plane tagged sweep** + **resume-by-tag** (Drift A); both scenarios symmetric.
4. Both scenarios' kickoff loads the union (DD-1); Step-2 reads reference-doc §3/§4/§5/§6.
5. DESIGN §10 has a Plane column + the vault row tagged backend (CI-3); §11 chain reordered.
6. `/toolkit-check` PASS on the touched toolkit surface (CHECKs 1/3/4/5/8/9/10/13/14).
7. No product code touched. After merge: note `/toolkit-sync` re-reconciles this repo's local copies.

## Route History
- 2026-08-22 · gate-1 diagnosis SHIP (independent critic) → Approval 1 (Victor) → this IMPLEMENTATION-PLAN.
