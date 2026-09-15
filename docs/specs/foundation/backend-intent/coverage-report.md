# P4 — Coverage Gate report (set-cover proof)

> **Phase:** P4 of the backend-replan campaign (ADR-021 — the flagship gate). Method: `PLAN-p4-coverage-gate.md`.
> **Evidence generator:** `tools/backend-intent/p4-set-cover.mjs` (deterministic, re-runnable, fail-loud —
> Node 24). **Status:** Layer-1 (deterministic) COMPLETE → below. Layer-2 (independent adversarial critic =
> §XXVI gate-2) pending.
> **One-line verdict (Layer 1):** the P3 carve **covers 100% of the corpus and smuggles nothing** — D* = 1200
> in exact bijection with `traceability.md`; C-COVER/C-SOUND/C-PARTITION all 0-defect; both identities close.

---

## C1 · Denominator D* — reconciled to 1200 (authoritative)

Fresh suffix-preserving sweep of the 34 `parts/*.md` Part A tables (id regex `[A-Z][A-Z0-9]*(-[A-Z]+)*-\d+u?`,
namespaced `slug:ID`, rows before each file's `## Local flag index`):

| Count | Value | Disposition |
|---|---|---|
| **D\* (disk, suffix-preserving)** | **1200** | **AUTHORITATIVE** — = corpus per-file table sum = `traceability.md` distinct ids (bijective) |
| naive suffix-dropping sweep | 1192 | undercounts by 8 — collapses the `-u` UI rows onto their base id (the known `*u` rake) |
| reader-declared prose (`corpus.md:47`) | 1194 | stale self-declaration undercount (readers summed 1168+26 headers but wrote 1200 rows) |
| assembly mechanical (`corpus.md:48`) | 1201 | over-counts by 1 — a continuation/note row double-counted |

- **The 8 `-u` rows** (the delta 1192→1200), all real Part A rows homed to P6, all present in D* **and**
  `traceability.md` (`-u` integrity: 0 synthetic legs):
  `projects:PRO-05u` (`parts/projects.md:17`) · `xcut-ingestion-ai:XCU-03u/06u/10u/16u/18u/19u/25u`.
- **D* ∖ trace = ∅ · trace ∖ D* = ∅** — the canonical set and the P3 matrix are the *same 1200 ids*.
- **Corpus per-file header is accurate** where checked (all 22 module files match disk, incl. `projects=47` —
  the 47th is `PRO-05u`; a naive `-u`-dropping count wrongly reads 46). Only the summary prose "1194" is stale.

## C2–C4 · Set-relations (all 0-defect)

| Check | Relation | Result |
|---|---|---|
| **C-COVER** (completeness) | `D* ∖ (issueCovered ∪ homedOut) = ∅` | **0 unhomed ✅** |
| **C-SOUND** (anti-smuggle, issue) | `issueCovered ∖ D* = ∅` | **0 smuggled ✅** |
| **C-SOUND** (anti-smuggle, trace) | `traceIds ∖ D* = ∅` | **0 ✅** |
| **`-u` integrity** | every `-u` trace id ∈ D* (real parts row) | **0 synthetic ✅** |
| **C-PARTITION** (no double-home) | no id in two XS/MOD issues | **0 ✅** |
| decomposition ↔ trace agreement | issue-covered ids = trace in-issue ids | **0 diff both ways ✅** |

## Identities (independently re-derived from disk — match P3's self-reported guards to the digit)

- **Partition:** `inIssue(985) + homedOut(401) − splitOverlap(186) = 1200` = D* ✅
- **Leg partition:** `single 968 + service 229 + ui 213 = 1410` legs; `oneLeg 990 + twoLeg 210 = 1200` = D* ✅
  (the corrected §2 identity — the earlier draft's "orphan legs / does not close" was a misdiagnosis, struck.)

## C5 · Homed-out legitimacy (401 homed-out legs)

- **P6 (222 legs) ✅** — 212 `ui` split-legs + 10 `single` UI-boundary rows; **zero `service` legs** dumped to
  the frontend track (a service leg homed to P6 would be intent evasion — none found).
- **RIDE (98 legs) ✅** — bucket string uniform `RIDE:substrate`; leg breakdown = 96 `single` + 2 `service`
  (`skills:SKI-40` `[E]` encryption pass-through forward-homed to M3/DB-5; `skills:SKI-41` local-first/sync
  riding the built foundation sync substrate). Both satisfy the built-substrate-rides rule (built **or**
  forward-homed to M3/DB-5). (Layer-2 currency correction — the earlier "all single" phrasing under-described
  the 2 service rides.)
- **DEFERRED (105 legs · 68 distinct homes)** — **67 match the C5 accepted-home-form allowlist** (a named
  MOD/XS issue e.g. `MOD-knowledge (M1.2)` ×14; an ADR e.g. `ADR-014`/`ADR-015`/`ADR-011`; a milestone e.g.
  `DB-8 FTS5 (M1.4)`, `M3/DB-5`, `M1.2 Notifications`; a design-pass bound to one of these e.g.
  `review-engine design-pass (journals build/M1.4+)`; or a documented leaf issue — **`#85 CAP-authoring` (9
  legs) = capability issue #85, DF-12, `docs/specs/fixes/home-deferred-substrate-pieces/PLAN.md:44` +
  `schema-audit-deferred-homes.md:299` — Layer-2 CONFIRMED real, flag closed**). **1 flagged for Victor**
  (not smuggled — honestly deferred, but not target-verifiable):
  - ⚠ **`future cross-module rules ADR (undocumented surface)`** (1 leg, `knowledge:KNO-46`) — corpus Part D
    itself marks it "no owning ADR / not designed / later" (`corpus.md:477`); homed verbatim in
    `schema-audit-deferred-homes.md:164`. A genuine open intent with **no named target** (homed, so not lost —
    but undesigned). Recommend: park as an explicit `M2+ undesigned` backlog item at P5 so it is tracked.

## C6 · Edge referential integrity (light)

- **0 dangling edges** — every `build-dep`/`runtime-seam` target across the 33 issues resolves to a real
  issue-id. `assertAcyclic` **spot-confirmed** from `decomposition.md` guards (PASS, no cycles; 17 XS→MOD
  citations correctly recorded as contributor notes, not build edges) — not re-derived (no P4 input changes
  the edge set).

## C7 · Intake-omission boundary (stated, not overclaimed)

Set-cover proves nothing was lost **between corpus and issues**; it is **blind to intake omissions** (a
source-doc intent that never entered the corpus). That exhaustive backstop is **P1's** job (the mechanical
`⚠ INTENDED`/`[DEFERRED]`/`→service`/`design-pass` flag-grep, consolidation plan g1-N1 §54). **Sampled
defense-in-depth (this phase):** a sample of `docs/features/tasks` + `docs/features/finance` deferral flags
(INTENDED views/recurrence/`completed_at`/`kind`) each trace to a live corpus id (TAS-28/21/06/24…). Sample
passed; **P1 remains the exhaustive owner** — C7 here is not a re-run.

## Fail-loud verification

`node p4-set-cover.mjs --inject-smuggle` → **exit 1**, flags `books:BOO-999` (smuggled-issue),
`fake:ZZ-01u` (smuggled-trace + `-u` synthetic). The gate rejects a planted defect — it is not vacuously green.

## Verdict

**Layer-1 (deterministic):** PASS — complete, sound, non-overlapping cover of the 1200-id corpus; denominator
authoritative and fully reconciled.

**Layer-2 (independent adversarial critic, §XXVI gate-2): SHIP.** Every property re-derived from disk (not the
script's word): C-COVER / C-SOUND / C-PARTITION all 0-defect; the two pinned divergence seams (8 `-u` ids,
projects 46-vs-47) re-derived by hand; script audited un-rigged; fail-loud proven; gate not self-certifying
(P3 artifacts untouched, `git` HEAD `4c1560d`). The `#85` flag closed (real documented issue). **Zero blocking
findings.** One non-blocking Victor-ack item: `KNO-46`'s undesigned-surface disposition (park at P5, do NOT
re-enter P3).

**P4 = SHIP.** `coverage-report.md` is the certified join key for P5 (Linear reorg).
