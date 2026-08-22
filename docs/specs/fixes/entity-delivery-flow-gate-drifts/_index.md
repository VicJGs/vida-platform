# Bug-unit — Entity Delivery Flow: three gate drifts (single-plane recovery · missing Documentation Gate · gate ordering)

> Type: `bug` (methodology defect, surfaced during MOD-notes v1 validation). Status: **DIAGNOSIS (gate-1 PLAN)**.
> Profile: Add Frontend Component · Scenario: entity-rescope. Governed by the No-Guessing Principle.
> Discovered: 2026-08-22, MOD-notes recovery-variant session, via three consecutive Victor drift-catches.

---

## 1. Findings

The Entity Delivery Flow methodology (`docs/specs/foundation/entity-delivery-flow/_index.md`, DESIGN v1,
+ its codified toolkit copies) carries **three coupled defects** in its gate structure. All three are
divergences between Victor's stated intent and what was persisted — none is a code defect.

### Drift A — the recovery variant is a single-plane projection
The `entity-rescope` recovery variant is rendered as **two per-profile scenarios that each project the
shared, cross-plane front matter onto one track**. Each resumes only its own track and cannot route a
cross-plane divergence.
- `[FACT: ~/dev-toolkit/claude-profiles/add-frontend-component/scenarios/entity-rescope.md:26 (slice-map, untagged) + :27 (Step 4 "Resume the per-slice **UI/UX** track")]`;
  Step 1 (`:21`) reads only §3/§6, not §4 (the Service track).
- `[FACT: ~/dev-toolkit/claude-profiles/add-backend-component/scenarios/entity-rescope.md:28]` — mirror defect:
  Step 4 "Resume the per-slice **SERVICE** track."
- The reference doc itself is **cross-plane-correct** — `[FACT: reference-docs/entity-delivery-flow.md:28]`
  "spans BOTH planes"; `:143` slices "tagged backend|frontend|shared"; `:129` "resume the normal per-slice
  **tracks**" (plural). The scenarios FLATTENED it.
- Consequence: a divergence rooted in the other plane is stranded. Proven instance — the
  `vault-not-initialized` bug was frontend-surfaced but its proper fix is a **backend** re-scope (hoist
  `initVault()` into `@vida/core`'s DB-open path = the `core-vault-init-on-db-open` task); a UI-only ledger
  has no slice type and no Verification Gate to hold it.

### Drift B — there is no Documentation Gate
Victor explicitly specified a gate on the **documentation itself**; it was never persisted. Confirmed:
`grep -in "documentation gate"` returns **zero** hits across the DESIGN doc, the toolkit reference-doc, and
both scenarios. The only doc-approval points that exist are §XXVI **g1/g2 per *slice*** — which gate a
slice's PLAN, not the entity's documentation as a whole.
- `[FACT: docs/specs/foundation/entity-delivery-flow/_index.md:40-64]` — §3 flow shows only the Decomposition
  Gate + per-slice Verification/Visual gates + the recovery Re-scope gate. No gate on the source docs.
- Consequence: the recovery variant reconciles **built code vs the documentation** — but nothing gates the
  documentation (the *yardstick*). A `❌ wrong` verdict may be the DOC being wrong, not the code. "Documentation-
  first" is only a sequencing claim, never a quality claim, without this gate.

### Drift C — even once added, the gate was placed in the wrong slot
My first patch this session placed the Documentation Gate **after** Interpretation, leaving Interpretation
reading straight off an **un-gated** baseline. The gate must protect interpretation's **input** (the source
docs), then a second gate protects its **output**.
- Root of the mistake: reasoning "validate the artifact I just produced" (output-validation) instead of
  "trust the input before consuming it" (input-validation) — the same reasoning-from-the-artifact error that
  produced Drift A.

## 2. Facets

| Facet | Content |
|-------|---------|
| **Symptom** | The recovery flow I surfaced for MOD-notes was UI-only, gate-less on the docs, and mis-ordered. |
| **Root cause (one sentence)** | The methodology was persisted/codified by reasoning from the artifact in front of the author (per-profile scenario · just-produced doc) rather than from the dependency chain — flattening a cross-plane recovery, dropping the Documentation Gate, and misordering it against Interpretation. |
| **Affected layers** | Methodology definition (DESIGN doc) + its two codified toolkit scenarios + the toolkit reference-doc. Pure process/doc surface — **no product code**. |
| **Classification** | **STRUCTURAL** — same root cause in multiple files; lives in the seam between layers (front matter ↔ per-track resume; source docs ↔ interpretation ↔ decomposition); fixing one scenario leaves the mirror wrong. |
| **Blast radius** | Both `entity-rescope` scenarios · reference-doc §6 · DESIGN `_index.md` §3/§7. Downstream: running the MOD-notes recovery under the current definition would strand backend-owned findings and judge code against an un-gated yardstick. |
| **Reproduction** | `grep -in "documentation gate" <the four files>` → 0 hits (Drift B). Read either scenario's Step 4 → single track (Drift A). Read DESIGN `_index.md:40-64` → gate sits nowhere before Interpretation (Drift C). |

## 3. Files involved

Authoritative source of truth (this repo) — **fix here first (the validation SoT)**:
- `docs/specs/foundation/entity-delivery-flow/_index.md` — §3 flow, §7 recovery, §8 layout, **§10 + §11**
  (the MOD-notes worked example + next-steps demonstrate the OLD flow — no Documentation Gate, no plane tags,
  the `core-vault-init-on-db-open` row untagged at `:223`; must be re-cut or the SoT teaches the stale flow in
  its own example — gate-1 critique finding 6).

Codified copies (toolkit) — **fix to keep coherent (owed regardless; else a 4th divergence)**:
- `~/dev-toolkit/claude-profiles/project-foundation/knowledge/reference-docs/entity-delivery-flow.md` — §6.
- `~/dev-toolkit/claude-profiles/add-frontend-component/scenarios/entity-rescope.md` — Steps 0-4.
- `~/dev-toolkit/claude-profiles/add-backend-component/scenarios/entity-rescope.md` — Steps 0-4.

## 4. Root cause (canonical statement)

> The recovery variant's cross-plane nature, the Documentation Gate, and the source-before-interpretation gate
> ordering — all three specified by intent — were lost because the methodology was rendered by reasoning from
> the local artifact (a per-profile scenario, a just-produced doc) instead of from the dependency chain the
> gates enforce.

## 5. Fix direction (the corrected flows — detail belongs to the IMPLEMENTATION-PLAN, gate-2)

**Base flow:**
`Intake → Baseline → ░Documentation Gate░ → Interpretation → ░Interpretation Gate░ → ░Decomposition Gate░ (tagged slice-map + seam-contract) → fork → per track: spec-set → ░Documentation Gate░ → [per slice: PLAN g1 → IMPL g2 → build → ░Verification|Visual Gate░] → §XXIX → close`

**Recovery variant:**
`Intake → Baseline → ░Documentation Gate░ → Interpretation (+built code as source) → ░Interpretation Gate░ → Reconciliation (sweep ①+②, tag each item backend|frontend|shared) → ░Re-scope Gate░ (tagged slice-map) → resume by tag: backend→░Verification Gate░ · frontend→░Visual Gate░ → §XXIX → close`

Three edits, one coherent change:
- **A** — reconciliation sweeps both planes; slice-map tagged {backend|frontend|shared}; Step 4 dispatches by
  tag (backend→Verification Gate, frontend→Visual Gate) regardless of entry profile; both scenarios symmetric.
- **B** — add the **Documentation Gate** (blocking) on the source aspect corpus + front matter (and per-track
  on each spec set) before it builds or judges code.
- **C** — order it `Baseline → Documentation Gate → Interpretation → Interpretation Gate → Decomposition`
  (escalating-trust chain: source-doc gate protects interpretation; interpretation gate protects decomposition).

## 6. Gate plan (§XXVI, STRUCTURAL)

1. **This diagnosis = gate-1 PLAN.** `/critique` (independent) → **SHIP** (2026-08-22) — all three drifts
   verified real, STRUCTURAL justified, No-Guessing clean; NITs folded above → **Approval 1 (pending Victor)**.
2. **IMPLEMENTATION-PLAN** (the exact per-file edits) → `/preflight` → `/critique` → **Approval 2**.
3. **Implement** the four-file edit → `/toolkit-check` on the touched toolkit surface → re-sync note.
   **✅ DONE (2026-08-22):** all 4 files edited; gate-2 preflight BLOCKED→folded (3 gaps) + gate-2 critique
   REVISE→folded (standards seam re-wired from prose→real Step-0 load action; motion justified) → Approval 2 →
   implemented. Acceptance: `documentation gate` present in all 4 (12/6/3/3); both scenarios Steps 0–8 contiguous;
   read §3/§4/§5/§6; DESIGN §10 Plane column + vault→backend; toolkit-check CHECK 1/5/8/9/13/14 PASS on the
   touched surface (guide in sync). Uncommitted — ~/dev-toolkit (3 files) + vida SoT + this bug-unit await commit.
4. Maturity note: this is the **v1→v2** amendment the DESIGN doc's §11 anticipated; it is the first fruit of
   the MOD-notes validation run, not a separate initiative.

**Gate-1 critique carry-ins (must be resolved IN the IMPLEMENTATION-PLAN, gate-2):**
- **CI-1 (finding 3, MATERIAL) — the cross-plane standards seam.** The two `entity-rescope` scenarios live in
  separate profiles that load different standards at `victor:session-kickoff` (FE: design+components; BE:
  engineering). Dispatch-by-tag routes a `shared`/other-plane slice to the right *gate*, but that gate needs the
  other track's standards loaded. The IMPLEMENTATION-PLAN must specify the mechanism: either an explicit
  profile-switch/cross-track handoff per slice, OR make both `entity-rescope` scenarios load BOTH standard sets
  at kickoff (justified — the recovery variant is inherently cross-plane). Do NOT leave "dispatches by tag" to
  gloss the standards-loading seam.
- **CI-2 (finding 4, MATERIAL) — prove the Documentation Gate is additive to §XXVI g1.** Cite `standards/process.md:358`:
  g1 critiques the *slice's own spec* against its own §2/§4; the Documentation Gate gates the *upstream entity
  aspect corpus + front matter* (the yardstick). Different objects → additive, not redundant. State this in the
  edit so a reviewer can't collapse them.
- **CI-3 (finding 6, MATERIAL) — re-cut DESIGN §10/§11.** Already added to §3 Files involved above.
