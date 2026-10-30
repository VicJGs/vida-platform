# Part 3 — IMPLEMENTATION-PLAN (gate 2)

**Type:** implementation spec (foundation) — executable steps for Part 3. Gate-1 SPEC = `_index.md` (Approved 1, Victor 2026-07-25). Decision record = `ADR-019`.
**Status:** 🟢 **gate-2 critique (REVISE) + preflight (BLOCKED) folded + re-verified — awaiting Approval 2.** No file rewritten, no tracker touched until Approval 2.
**Date:** 2026-07-25 · **Units:** U2 (rewrite `docs/roadmap.md`) · U3 (re-projectize Linear, gated). U1 = ADR-019 (authored).
**No-Guessing:** the rewrite carries over **every** old deliverable per the `_index.md §2.1` ledger; nothing is invented or dropped. Provenance counts verified: **19 ADRs** (`ls docs/core/decisions/` = ADR-001…019) · **24** `structure-data.md` contexts (ADR-016 §4).
**Reversibility:** U2 is a single doc rewrite (one commit, clean revert). U3 is gated per-cluster and creates external Linear state — **not run until each cluster is explicitly approved** (`--approve-cluster`).

---

## U2 — Rewrite `docs/roadmap.md` features-first _(one commit)_

Rewrite in place, preserving the document's role (deliverables map, mirrors to Linear). Section-by-section:

**S1. Header / provenance** — refresh the stale counts: _"15 ADRs + 21 documented contexts"_ → **"19 ADRs (001–019) + 24 documented contexts"**; add the ADR-018 structure + ADR-019 sequencing to the "Provenance" note. Keep the source-of-truth precedence line.

**S2. The spine** — replace the 3-phase table's _internal ordering_ with the **M1→M4 milestone spine** (`_index.md §1`), keeping the human "state reached" phrasing:

- M1 = "I open Vida daily on localhost and run my life in it — manually." (whole OS, internally integrated, unencrypted)
- M2 = "External data flows in — I stop doing everything by hand." (integrations + boundary)
- M3 = "It's encrypted end-to-end; safe to share." (whole-OS encryption → release gate)
- M4 = "It runs everywhere — web, desktop, mobile, self-host, cloud." (venues/multi-device)
- Keep the load-bearing fact (no server/sync for single-user localhost) + the HLC-encoding deferred-decision caveat.

**S2b. Rewrite the "Cross-cutting principle — 5-layer Structural Foundation" block** (roadmap §34-47) — it currently reasserts substrate-first "built once at the head of Phase 1." Reframe to features-first: substrates land by first-consumer pull (the hubs pull them early), not a monolithic upfront layer. Also fold the tiered "Dependency map" table (roadmap §49-57) into the `_index.md §4` edges.

**S3. Replace "Phase 1.0 Structural Foundation" (substrate-first)** with **M1** organized features-first per `_index.md §3`: M1.0 boot & connective base → M1.1 hub + foundation modules → M1.2 feature modules → M1.3 depth → M1.4 internal-integration hardening. Each deliverable keeps its ID (DB-_/AR-_/DS-_/UI-_/UX-\*/modules) but is placed per the **§2.1 ledger** — including the splits: **DB-8b blind-index → M3**, **DB-10 seed → M1**, **UX-5b vault-unlock → M3/M4**, crypto (AR-3/DB-5) → M3, sync-activate (AR-9) → M4. State the AR-8 boundary (module-owned engines stay in their module). **Pomodoro** (roadmap §123) folds into **Sessions & Scheduling** as a `sessions` sub-type (ADR-004), not a standalone module.

**S4. New M2 section** — external integrations + security boundary, provider-selection as head; carry the integration register (6 DEFINED / 16 UNDEFINED) here; ICS module-surface(M1) vs live-feed(M2) split.

**S5. New M3 section** — whole-OS encryption pass (AR-3, DB-5, DB-8b, SQLCipher), ingestion-guard re-verification, the **plaintext-window tradeoff + hard release gate** (cite ADR-019 §3.4).

**S6. M4 section** — the old Phase-2 venues (P2-①…⑥) as multi-device, encryption-beneath. P3-⑦ (2nd-level capability blocks) as the post-M4 personality tail.

**S6b. Carry the "Doc-hygiene backlog"** (roadmap §182-186) forward — do not drop it: the `module-dependency-graph.md` refresh is **already done** (Part 1.3, mark complete); the `docs/platform/{web,mobile,desktop}-app-spec.md` stubs → **M4** (they spec the platform apps); the `docs/editor/serialization-spec.md` stub → **M1** (editor UI-3). Keep as a small "Housekeeping" tail with these dispositions.

**S7. Dependency map + sequencing rules** — update to `_index.md §4` (Notes-first, foundation-before-consumers, capstones-last, M2⊃provider-selection, M3-gates-release, M4-needs-M3). Keep the "no server until multi-device / no provider until M2-head" rules, re-milestoned.

**S8. Linear mapping section** — update to the new clusters (M1 waves · M2 integration families · M3 encryption · M4 venues); note the LIF-61…95 re-scope is U3.

**S9. Verify + commit.**

- Ledger check: every ID in `_index.md §2.1` appears in the rewritten roadmap at its M-home (grep each ID).
- No residual "RP" `[UNKNOWN]`; provenance counts correct (19/24).
- No substrate-first language survives; crypto is in M3, integrations in M2.
- Commit: `docs(roadmap): resequence features-first (M1→M4) per ADR-017/019 (Part 3 U2)`.

---

## U3 — Re-projectize Linear _(GATED — per-cluster, not run until approved)_

**S10. Build the re-scope mapping** (old LIF-61…95 → new M-clusters) as a table in the roadmap's Linear section — **doc only**, no push. Every old issue → its new cluster/milestone, or explicitly "re-scoped / merged / deferred." Record; do not duplicate.

**S11. Gated push** — `/track-sync --approve-cluster` **one cluster at a time**, each with explicit Victor approval before it creates Linear state. Start with M1.0, then M1 waves. **Nothing pushed without per-cluster sign-off** (external, durable — roadmap §173).

> U3 may be **deferred** — the roadmap rewrite (U2) stands alone as the campaign deliverable; projectizing can happen when Victor wants to work the tracker. Flag at Approval 2.

---

## §4 Acceptance (from `_index.md §8`)

| Criterion                                        | Check                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| roadmap rewritten M1→M4                          | section structure = M1/M2/M3/M4; no "Phase 1.0 substrate-first"     |
| every old deliverable re-mapped (§2.1)           | grep each ID present at its M-home; none dropped                    |
| schema per-feature · crypto M3 · integrations M2 | grep: DB-5/AR-3 in M3, P3-integrations in M2, DB-4 per-module in M1 |
| provenance refreshed                             | "19 ADRs … 24 contexts"; ADR-018/019 cited                          |
| ADR-019 accepted; tradeoff + release gate stated | roadmap M3 cites ADR-019 §3.4                                       |
| Linear re-scope mapping recorded (U3)            | old→new table present; push gated per-cluster                       |
| no residual `[UNKNOWN]`                          | "RP"=Real Product everywhere                                        |

---

## On divergence (§XXVIII)

Any step that can't run as written (a deliverable with no clean M-home, a Linear conflict) → STOP, `victor:triage`, critique the revised step, re-approve. Update this file + task Build Steps + Route History. No silent drift.

---

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-25 | Initial gate-2 DRAFT — U2 roadmap-rewrite steps (S1–S9) + U3 gated projectize (S10–S11, deferrable).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-07-25 | **Gate-2 critique (REVISE) + preflight (BLOCKED) → folded.** Critique VERIFIED the ZK-safety + amendment scope of ADR-019 (ZK-1=server-blindness=L3/sync=M4; deferring L1/L2 at-rest touches no ADR-014/015 invariant). Both caught: **count 19≠18** ("18 ADRs (001–019)" was off-by-one → fixed to 19 everywhere, incl S9 grep target). Preflight caught 2 silent drops: **doc-hygiene backlog** (roadmap §182-186 → S6b + ledger row: dep-graph done in Part 1.3, app-specs→M4, serialization→M1) and **Pomodoro** (no line-item home → folds into Sessions & Scheduling as an ADR-004 sub-type, S3 + ledger). Non-blockers: ADR-019 §6(b) overreach recharacterized + EN-1 clause added; S2b added for the cross-cutting-principle block + dependency-map table. Awaiting Approval 2. |
