# PLAN — P4 · Coverage Gate (set-cover proof: ⋃issues ⊇ corpus · 0 unhomed · nothing smuggled)

> **Phase:** P4 of the backend-replan campaign (`docs/roadmap/backend-consolidation-plan.md`, ADR-021 — the
> **flagship gate**, plan §63-64 / §111). Per ADR-021 §3.6 this phase runs its own plan + §XXVI gates;
> campaign approval ≠ phase authorization.
> **Profile:** project-foundation / milestone-delivery-planning · **Authored:** 2026-09-15
> **Consumes:** `corpus.md` (+ 34 `parts/*.md`) [P1 ground truth — the denominator] · `decomposition.md`
> [P3 issue set — the coverage] · `traceability.md` [P3 item→bucket matrix — the *claim* P4 falsifies, not
> trusts] · `schema-audit-deferred-homes.md` [the named DEFERRED homes] · `PLAN-p3-decomposition.md` §1
> D1–D5 [the well-formedness contract P3 asserted].
> **Deliverable:** `coverage-report.md` — the authoritative canonical id-set (denominator reconciled), the
> three set-relation results, the homed-out legitimacy audit, and the SHIP/REVISE/RETHINK verdict.

---

## 1. Goal & the coverage contract (what "covered" must mean)

P4 is a **verification** phase, not a carve. It proves — **independently, from disk, not from P3's asserted
numbers** — that the P3 issue set loses nothing and invents nothing relative to the P1 corpus. It is the last
gate before P5 reshapes Linear, so a false PASS here silently ships lost or smuggled intent into the build.

"Covered" is the conjunction of **three set-relations** over one authoritative canonical id-set (§2), plus a
**legitimacy** predicate on the homed-out items (§3-C5). Done when all hold:

- **C-COVER (completeness): `canonical ⊆ ⋃(issue-covered ∪ homed-out)`** — every canonical corpus id (each
  SPLIT service-leg individually) lands in ≥1 destination: an XS issue, a MOD issue, or a named homed-out
  bucket (P6 UI-track · a DEFERRED build-home · RIDE-substrate). **0 UNHOMED.** This is the plan-§63 assertion.
- **C-SOUND (anti-smuggle, the direction P3's D1 under-checks): `⋃(issue-covered) ⊆ canonical`** — no id in
  any issue that is **not a real corpus row**. Catches an invented id, a typo'd id, a mis-namespaced id, or an
  issue quietly absorbing intent that was never intaked. "Nothing smuggled" (plan §63) = C-SOUND **and** the
  edge-soundness check (C6).
- **C-PARTITION (no double-home): each canonical service-leg id maps to exactly one XS/MOD issue** — P3's D1.
  Re-verified from disk, not re-asserted. (A UI leg is never in a backend issue; a SPLIT's two legs are two
  keyed rows, not a double-home.)

The set-cover is a **join over a fixed denominator** — so the denominator (§2) must be nailed to a single
authoritative number with **every delta from the four in-flight counts explained by a cited row**, before any
relation is computed. A cover asserted over a fuzzy denominator proves nothing.

## 2. The denominator problem (P4's first and load-bearing task)

Four counts are live and **not yet reconciled** — the corpus itself flags this (`corpus.md:47-50`) and
`traceability.md` **explicitly defers the residual to P4** ("P4's exact set-cover reconciles the residual
against a fresh on-disk sweep"):

| Count | Source | What it measures |
|---|---|---|
| **1194** | reader-declared header (`corpus.md:47`) | 1168 across 33 readers + 26 recovered gamification — "authoritative for the corpus header" |
| **1201** | assembly sweep (`corpus.md:48-49`) | mechanical sweep across 34 files; +7 = continuation/note rows |
| **1192** | naive base-id sweep | a `[A-Z]+-[0-9]+` regex over `parts/*.md` — **undercounts (see below)** |
| **1200** | P3 namespaced canonical (`traceability.md` header) | reader-extracted unique `slug:itemId` |

**The load-bearing subtlety — the `-u` UI-leg rows (the known `*u` rake, [[deterministic-assembler-workflow-cheap-gate-iteration]]).**
A naive `[A-Z]+-[0-9]+` sweep of `parts/*.md` yields **1192**, and the 8-id gap to 1200 is **not** noise — it is
8 genuine Part A rows whose id carries a `u` suffix (a `boundary=UI` companion row), which a suffix-dropping
regex collapses onto its base id and dedups away. Verified on disk this session — all 8 are real rows homed to
P6:
`projects:PRO-05u` (`parts/projects.md:17`) · `xcut-ingestion-ai:XCU-03u/06u/10u/16u/18u/19u/25u`
(`parts/xcut-ingestion-ai.md`). So the fresh sweep is authoritative **only if its id regex preserves the `u`
suffix** — `PRO-05` and `PRO-05u` are two distinct canonical ids. With a suffix-preserving regex the parts
sweep reaches 1200, reconciling exactly with `traceability.md` (1192 base + 8 `-u`). A prior gate stepped on
this same rake (MEMORY: "critic undercounted `*u` rows"); the plan names it so P4 does not.

**Leg-partition identity (replacing the earlier mis-stated "anomaly").** `traceability.md` legs =
`single 968 · service 229 · ui 213` (Σ 1410). This **closes**: canonical ids = one-leg-ids + two-leg-ids,
where two-leg-ids are the SPLIT rows carrying a paired `service`+`ui` leg, and one-leg-ids are the `single`
rows (a service-only row **or** a standalone `-u`/UI row that is its own `single` P6 leg). P4 **computes** the
partition from disk and asserts `oneLeg + twoLeg = D*` and `Σlegs = 1410` — it does **not** assume
`service = ui` (they differ legitimately: a SPLIT may carry a service leg with no separate `-u` row, and a
`-u` row may stand alone as a `single` UI leg). The earlier draft's "16 orphans / 1197 ≠ 1200 / does not
close" was a misdiagnosis (it wrongly equated `single` with all non-split ids); it is struck.

**Resolution rule (a FACT-derivation, not a decision — [[stale-source-plus-live-convention-is-fact-not-a-decision]]):**
P4 performs a **fresh, independent extraction** of the canonical id-set directly from the 34 `parts/*.md`
(one id per Part A row, **id regex `[A-Z]+-[0-9]+u?` — suffix-preserving**, `slug:ID` namespaced, before each
file's Local flag index), reconciles it against 1194/1201/1192/1200 with **every delta enumerated and cited to
a file:line** (the +8 `-u` rows, the +7 assembly continuation rows, the −2 note rows), and declares **one
authoritative denominator D***. The **corpus per-file header counts are NOT a check input** — they are known
wrong in at least one place (`corpus.md:60` lists projects = 47; the file has 46 rows, `traceability.md`
agrees at 46), which is itself the motivation for the row-level re-sweep. Only the row-level sweep +
`traceability.md` are inputs. `traceability.md`'s own numbers are the *claim under test*, never the ground
truth ([[discontinued-impl-and-frozen-decomposition-are-reference-not-authority]]). If D* ≠ 1200 with
un-explainable residual, that is a P3 traceability defect surfaced by the gate (→ §5), not a P4 adjustment to
make quietly.

## 3. What P4 verifies (the checklist — each is mechanical + independently critic-audited)

- **C1 · Denominator D*** — the reconciled canonical id-set (§2). Output: D* + a delta table (each of the
  1194/1201/1192/1200 residuals resolved to specific cited ids: the 8 `-u` rows, continuation rows, note
  rows, mis-namespacings). **`-u` integrity sub-check:** each of the 8 `-u` ids in `traceability.md` must map
  to a real `parts/*.md` Part A row (verified `boundary=UI`, homed P6) — a `-u` id present in traceability but
  absent from parts is a **synthetic-leg smuggle** (blocking), the inverse failure the naive-sweep artifact
  masks.
- **C2 · C-COVER** — `D* ∖ (⋃ issue-covered ∪ homed-out) = ∅`. Any element = an UNHOMED id = **blocking**.
- **C3 · C-SOUND** — `⋃(issue-covered) ∖ D* = ∅`. Any element = a **smuggled/invented id** = blocking. (This is
  the relation P3's own gate under-tested — P3 proved coverage *outward*; P4 proves soundness *inward*.)
- **C4 · C-PARTITION** — no service-leg id appears in two XS/MOD issues; the 985 in-issue count and the
  `985 + 401 − 186 = 1200` partition identity re-derived from disk (not copied from the header). splitOverlap
  (186) independently recomputed.
- **C5 · Homed-out legitimacy** (the highest-risk surface — a homed-out id is only "covered" if its home is
  **real and named**, else "DEFERRED" is a synonym for "lost"). Audit all three homed-out buckets:
  - **P6 (222 legs)** — every P6 id is a genuine UI leg of a SPLIT or a `boundary=UI` row (cross-checked to
    the corpus `service|UI` column), not a service leg dumped to P6 to dodge a MOD home.
  - **DEFERRED (105 legs, ~70 distinct home strings)** — **each distinct DEFERRED home must match an
    accepted-home-form allowlist** (the legitimacy predicate, made falsifiable rather than hand-wavy):
    **(a)** a named MOD/XS issue id from `decomposition.md`; **(b)** an `ADR-NNN`; **(c)** a named milestone
    (`M1.x`/`M2`/`M3`/`DB-N`); **(d)** a `schema-audit-deferred-homes.md` bullet quoted verbatim; or
    **(e)** an explicit "design-pass" bound to one of (a)–(d). `schema-audit-deferred-homes.md` is **prose
    with named-home bullets, not a keyed matrix** (verified — 0 table rows), so (d) is a verbatim-string match,
    not a join. **Any home matching none of (a)–(e)** — e.g. `KNO-46`'s "future cross-module rules ADR
    (undocumented surface)", which corpus Part D itself marks "no owning ADR / not designed / later"
    (`corpus.md:477`) — is flagged as an **intent-loss risk for Victor**, not silently passed. Cross-check the
    corpus DEFERRED-flag census (P1 counted 608 deferred-flags / 105 landed here) — the gap must be explained
    (most deferred-*flags* ride into a live issue; only true build-deferrals home to DEFERRED).
  - **RIDE (98 legs)** — every RIDE id maps to a Part B.1 substrate row that is **built OR forward-homed to
    M3/DB-5** (the built-substrate-rides rule, PLAN-p3 §3); no live service work hides in RIDE.
- **C6 · Edge referential integrity (light — P3 gate-2 already checked D3/D4)** — every
  `build-dep`/`runtime-seam` target in `decomposition.md` is a real issue-id (**no dangling edge** — this is
  the load-bearing cheap check: it catches a typo'd issue-id). Acyclicity is only **spot-confirmed**, not
  re-derived: `decomposition.md` already reports `danglingDeps:0, acyclic:true` and **no P4 input changes the
  edge set**, so a full `assertAcyclic` re-run would be ceremony — confirm the reported result, don't
  reproduce it. The 5 seam-owner MOD folds (journals/sessions/knowledge/notes-and-pages/gamification) are
  consistent with the edge targets.
- **C7 · The intake-omission boundary (state it honestly — do not overclaim).** Set-cover proves nothing was
  lost **between corpus and issues**; it is **blind to intake omissions** (a source-doc intent that never
  entered the corpus) — exactly the caveat the consolidation plan flags at g1-N1 (§108: "not resting on P4's
  downstream set-cover, which is blind to intake omissions"). That backstop was P1's job (the mechanical
  `⚠ INTENDED`/`[DEFERRED]`/`→service`/`design-pass` flag-grep). P4 **re-runs that grep as a sampled
  defense-in-depth** — confirm a sample of flags across `docs/features/*` + `docs/intake/*` each trace to a
  corpus id — but the report **explicitly scopes C7 as sampled, not exhaustive**, and names P1 as the exhaustive
  owner. No silent cap ([[no-silent-caps]] discipline).

## 4. Method — deterministic set-cover script + independent adversarial critic (the two-layer pattern)

Mirrors the cheap-iteration lesson [[deterministic-assembler-workflow-cheap-gate-iteration]]: **all set
arithmetic is deterministic and re-runnable; the LLM does judgment (legitimacy, anti-rig), not counting.**
This is cheaper and more falsifiable than a reader Workflow, because the inputs are three on-disk files, not
34 prose docs to re-read.

1. **Layer 1 — deterministic set-cover script** (I author; Node 24 / `python3`; committed as
   `tools/backend-intent/p4-set-cover.mjs` or a `parts/`-local script):
   - Fresh-extract **D*** from the 34 `parts/*.md` (the corpus schema regex), namespaced `slug:ID`.
   - Fresh-extract **issue-covered** from `decomposition.md` (the `item-ids` column, both XS + MOD tables).
   - Fresh-extract **homed-out** from `traceability.md` (buckets P6/DEFERRED/RIDE, keyed by `{id, leg}`).
   - Compute C-COVER, C-SOUND, C-PARTITION, the partition identity, splitOverlap; **fail loud** (non-zero
     exit + the offending id list) on any unhomed / smuggled / double-homed id. Emit the delta table for C1.
   - The script is the *evidence generator*; it is deliberately dumb set-algebra so the critic can audit its
     logic in one read (no heuristics, no fuzzy matching — exact id-string joins only).
2. **Layer 2 — independent adversarial critic** (fresh agent, on-disk, the **flagship coverage gate** =
   P4's §XXVI gate-2): does **not** trust Layer 1. It (a) re-derives a **sample** of the denominator + cover
   by hand against `parts/*.md` to confirm the script isn't measuring a rigged/normalized denominator — the
   sample **must include the 8 `-u` ids and the `projects` 46-vs-47 case** (the two seams where a naive
   re-derivation diverges; a sample that skips them proves nothing); (b) runs the **C5 legitimacy audit**
   (semantic — does each DEFERRED home match the C5 allowlist?); (c) confirms fail-loud actually fires (inject
   a known-missing id **and** a synthetic `-u` id absent from parts, prove the script rejects both — the
   mirror-drift technique P2/P3 gate-2 used); (d) checks C7's sampled backstop. Verdict SHIP / REVISE / RETHINK
   against `corpus.md`/`parts/*.md`, not this plan's prose. (Independence note: the plan author writes Layer 1;
   the mandatory-sample pinning above is what keeps Layer 2 from inheriting Layer 1's blind spots.)

## 5. Verdict semantics — a failed cover is a P3 defect, not a P4 patch

P4 **finds and reports**; it does not repair. If C-COVER, C-SOUND, or C-PARTITION fails, or C1 lands D* ≠ 1200
with un-explainable residual, or C5 surfaces an intent-loss home:

- **REVISE** → the defect is in **P3's carve** (`decomposition.md`/`traceability.md`). Per §XXVIII, re-enter
  **P3** to fix the carve at its source (re-home the id, correct the namespacing, name the real home), then
  re-run P4 from the top. **Do not** edit `traceability.md` inside P4 to make the join pass — that is the exact
  silent-drift §XXVIII forbids, and it would make the flagship gate self-certifying.
- **RETHINK** → the failure is structural (e.g. the denominator can't be reconciled because the corpus schema
  is ambiguous) → re-enter **P1**.
- **SHIP** → the cover holds; D* is authoritative; `coverage-report.md` is the join key P5 reshapes Linear
  against.

The reconciled **D*** replaces 1194/1200 everywhere downstream (corpus header note + `traceability.md` header
get a one-line currency correction **only after** SHIP, as a §XXIX currency fix — not as a way to pass the gate).

## 6. Gate (P4's own — §XXVI, two points)

- **Gate 1 · Method (Approval 1 — THIS plan, before execution):** `/critique` (design-director) + `/preflight`
  on this plan's contract (§1), denominator method (§2), checklist (§3), and two-layer method (§4). Fix every
  finding before authoring the script. **← we are here.**
- **Gate 2 · Coverage Gate (post-execution — the flagship):** the Layer-2 independent adversarial critic (§4)
  proves the cover on disk. Verdict SHIP / REVISE / RETHINK. This IS the plan-§111 flagship gate.

## 7. Acceptance (P4 done when)

- [ ] **D*** declared — one authoritative denominator (suffix-preserving id regex) with every
  1194/1201/1192/1200 residual resolved to cited ids (the 8 `-u` rows enumerated + `-u` integrity sub-check),
  and the leg-partition identity `oneLeg + twoLeg = D*` / `Σlegs = 1410` computed from disk (§2).
- [ ] `coverage-report.md` — C-COVER (0 unhomed), C-SOUND (0 smuggled), C-PARTITION (0 double-home), partition
  identity re-derived, all from disk; the C5 homed-out legitimacy audit (P6/DEFERRED/RIDE) with every DEFERRED
  home resolved or flagged; C6 edge referential-integrity + acyclicity re-confirmed; C7 boundary stated +
  sampled backstop run.
- [ ] `tools/backend-intent/p4-set-cover.*` — the deterministic, re-runnable proof script (fail-loud verified).
- [ ] Coverage Gate (gate 2) **SHIP** from an independent on-disk critic.

## 8. Out of scope for P4

- **Linear reorg** (create/reshape projects/milestones/issues; retire the module-vertical #31–#48; mod-notes
  LIF-131 disposition) — that is **P5**; it consumes P4's SHIP'd `coverage-report.md` as its join key.
- **The frontend track plan** — the P6 UI-leg items are audited-for-legitimacy here (C5), not scoped; **P6**.
- **Re-carving / re-homing** — P4 verifies P3's carve; any needed re-home is a P3 REVISE (§5), not P4 work.
- **Exhaustive intake-completeness** — C7 is sampled defense-in-depth; P1's g1-N1 grep is the exhaustive owner.
- **Sub-milestone / wave sequencing** — P5 re-derives `#` edges + HARD-* deps from the SHIP'd issue set.

## 9. Execution note

Env: Node 24 (`export PATH="$HOME/.nvm/versions/node/v24.17.0/bin:$PATH"; corepack pnpm`). Branch
`backend-replan` (8 commits ahead of main, not pushed). The script + critic (§4) run only after Approval 1.
