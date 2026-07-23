# Re-run PLAN — sessions-and-scheduling (Part 1.2, Tier 1)

**Type:** doc-realignment unit PLAN (LITE gate — §XXVI LITE variant; non-code scenario).
**Status:** ✅ IMPLEMENTED (2026-07-23) — LITE gate passed (critique **SHIP** / 0 blocking → 3 cite notes folded → Victor approved); edits landed across 4 of 5 aspect docs (structure-data, business-rules, contract, conventions; identity untouched); §4 acceptance verified mechanically (R1 tokens `effect_event_id`/`UNIQUE`/`applied_effects` present on spine + handlers; S4 catalogue + S5 7-state enum named; forward `xp_history` retired → `consequence_ledger`; no residual capability-ID mis-tag; `applied_effects` code home deferred).
**Date:** 2026-07-23 · **Session:** build-roadmap-resequence (foundation-realignment campaign, Part 1.2).
**Context:** `docs/features/sessions-and-scheduling/` (5 aspect files). **Verdict (sweep):** **gap** — drivers 004, 002.
**Grounded in:** `staleness-sweep.md` (row 6 + Part 1.2 Tier-1 order), `capability-framework.md` §2 (R1/R2) + §3 ADR-004 (S1–S7) + §5, and all 5 current aspect docs (read this session — the No-Guessing ground truth).
**No-Guessing:** every forward token below is one an ADR actually names (cited); no invented tokens. Code/directory homes are `[DEFERRED — Part 2]`, never decided here.

---

## §1. Context — why this re-run, and the true gap shape

Sessions & Scheduling is the **effect-producing foundation** many modules ride (out-edges: Habits · Tasks · Projects · Purpose · Gamification · Knowledge · Education · Notes · Calendar). The sweep verdict is **gap** — the doc is structurally the strongest in the corpus (S1 supertype, S2 plan↔actual FK, S3 4-dim contract, S7 co-sync, R6 two-tier, R7 read-seam all **pass**; anti-signals quarantined) — but as the effect foundation it is silent on parts of the effect machinery it OWNS: the **S4 effect catalogue**, the **S5 lifecycle enum**, and the **R1 idempotency rail**.

**Ground-truth refinement (the load-bearing correction — the sweep scored only `structure-data.md`, its stated scope L8; this PLAN reads all 5 aspects):**

| Cap | Framework tokens (owning ADR) | Present today? | Where the fill lands |
|---|---|---|---|
| **S4** Effects catalogue | fixed set `complete_habit_occurrence·log_time·emit_measurement_signal·contribute_purpose_metric·award_xp·surface_journal·surface_calendar·attach_pomodoro`, each via **R2** (ADR-004 §3.2.2) | **PRESENT** — `contract.md` L23 (all 8) + targets table L42–51. **ABSENT** on the schema spine (`structure-data.md` `session_effects` = "type→effect catalog bindings", catalogue unnamed) | `structure-data.md` only (name the catalogue on `session_effects`) |
| **S5** Lifecycle state machine | status enum `scheduled/planned → in_progress → completed·skipped·missed·rescheduled` + per-type hooks (ADR-004 §3.2.3) | **PRESENT** — `business-rules.md` L83 terminal states names the full enum. **NOT** enumerated as the `status` CHECK in `structure-data.md`; `contract.md` L24 cross-refs "SS-8 states" (loose — SS-8 is the block↔session rule, the states live in SS-1/terminal) | `structure-data.md` (`status` CHECK) + `contract.md` (fix the SS-8→SS-1 cross-ref) |
| **R1** Idempotency rail | deterministic **`effect_event_id`** = `derive(subject_natural_key ‖ transition ‖ effect_type)`; local-only **`applied_effects`** dedup ledger; **`UNIQUE effect_event_id`** on each effect output row (ADR-004 §3.2.5) | **PARTIAL** — `business-rules.md` SS-6 L37 names `effect_event_id` + "dedup ledger" conceptually + cites §3.2.5. **`applied_effects`** and **`UNIQUE effect_event_id`** named **nowhere**; no R1 token on `session_effects` / the effect-handler surface | **the genuine gap** — `structure-data.md` (`session_effects` columns) + `contract.md` (effect-handler idempotency) + `business-rules.md` (name `applied_effects` in SS-6) |

**Fix shape:** this is a **gap re-run = additions, not retirements** (contrast notes-and-pages, which was wrong-model stale). The As-is FACT floor is already correct and stays; the work is to carry the S4 catalogue + S5 enum + R1 rail onto the schema spine and the effect-handler contract, so the effect foundation names the machinery it owns. Cite the owning ADR (ADR-004 §3.2.2/§3.2.3/§3.2.5); **defer every code/directory home to Part 2.**

**M\* (measurability) is `n/a` as an owner** — this module is a *signal source*, never a measure owner (SS-10); it EMITS `emit_measurement_signal`/`contribute_purpose_metric` effects but does not carry `measurement_kind`/`binding_mode`. No M-gap to fill here.

---

## §2. What changes — the three gap fills + two flagged corrections

### Primary — the S4 / S5 / R1 additions (drivers 004, 002)

| # | Cap | Forward tokens to add (`[INTENT]`) | Owning ADR (cite; home deferred) | Aspect(s) |
|---|---|---|---|---|
| G-S4 | **Effects catalogue** | on `session_effects`: the effect `type` is drawn from the fixed catalogue `complete_habit_occurrence·log_time·emit_measurement_signal·contribute_purpose_metric·award_xp·surface_journal·surface_calendar·attach_pomodoro`; each fires via a named effect handler (**R2**), never a direct target-table write | ADR-004 §3.2.2 | structure-data |
| G-S5 | **Lifecycle enum** | on `sessions.status`: CHECK ∈ the framework's 7-state enum `scheduled·planned·in_progress·completed·skipped·missed·rescheduled`; per-sub-type legal transitions + hooks declared in the registry. (`empty`/`error` at business-rules L83–84 stay the doc's own runtime tail — NOT framework-S5 members, do not add them to the persisted CHECK) | ADR-004 §3.2.3 | structure-data (+ contract cross-ref fix) |
| G-R1 | **Idempotency rail** | on `session_effects` (the effect *output* row): **`effect_event_id`** `= derive(subject_natural_key ‖ transition ‖ effect_type)` + a **`UNIQUE`** constraint on it; a local-only **`applied_effects`** dedup ledger; SS-6 names `applied_effects` explicitly (it already names `effect_event_id`) | ADR-004 §3.2.5 (rail R1) | structure-data + business-rules + contract |

### Secondary — flagged corrections surfaced by grounding (flag, don't silently skip — the notes-and-pages B3 pattern)

| # | Finding | Fix | Cite | Scope guard |
|---|---|---|---|---|
| C1 | `contract.md` L49 names **`xp_history`** as the `award_xp` forward write target — a **retired** token (ADR-012 E3 → `consequence_ledger`). A live forward anti-signal sitting in the exact effects-target table the R1/S4 pass edits. | retarget the row to **Gamification's documented write API** (R2) over **`consequence_ledger`** (via the `grant_currency` Additive effect — the E2 feeder effect, E4 Additive class) — name no retired physical table | ADR-012 §3.3 (E3, `consequence_ledger`) + §3.1 (E4, four Additive effects) | bounded to the one table row; ADR-012 is not this context's *driver*, but a forward retired token is a live anti-signal regardless of driver (As-is exemption does NOT cover it — it is a *forward* target, not an As-is floor) |
| C2 | Capability-ID self-citations drift from the framework IDs: `structure-data` L27 "(S4)" on table-per-type = **S1**; L42 Integration-Contract tables `[INTENT S5]` = **S3**; `business-rules` SS-3 L25 `[INTENT S5]` (4-dim contract) = **S3**; `contract` L16/20/23/25/26 `S5`/`S5-dim1..4` conflate the whole 4-dim contract under S5 (correct split: contract=**S3**, dim2 Effects=**S4**, dim3 Lifecycle=**S5**) | correct the tags to the framework IDs so the doc's self-citations match the predicates a future sweep greps | framework §3 ADR-004 | **cleanly separable** — labels only, zero model change; the critique/Victor may veto C2 without touching G-S4/S5/R1 |

**Scope guards (do NOT over-apply):**
- **This is a gap fill — the As-is FACT floor is correct and untouched.** No token is retired here except the one flagged forward regression (C1). The 6-table FACT base + all `[INTENT]` shape stays.
- **Conceptual home only.** R1 tokens (`effect_event_id`/`applied_effects`), the S4 catalogue, and the S5 enum are cited to ADR-004; **which package the `applied_effects` ledger and effect handlers physically live in is `[DEFERRED — Part 2]`** (boundary rule). `packages/core/services/<module>` appears in the framework as the handler *pattern* (S6) — cite it as the pattern, do not fix the directory.
- **No schema-level reconciliation.** Table counts / consolidated DDL / whether `session_effects` is one table or a per-type binding is a build-phase (DB) job — the PLAN names the tokens + constraints, not the final DDL.
- **`award_xp` stays a valid S4 catalogue member** (ADR-004 names it). Only its *target* (`xp_history`) is retired (C1). The effect name and the E4 `grant_currency` mechanism are distinct layers — do not rename the S4 effect.
- **M\* / X\* / AI\* out of scope** — not sweep drivers for this context; it is a signal source, not a measure/ingest/AI owner.

---

## §3. Per-aspect edit map (structure-data = spine; siblings only where a gap reaches)

**`structure-data.md`** (spine — all three gaps land here)
- **G-S4** — on the `session_effects` line (L41): replace "type→effect catalog bindings" with the **named catalogue** (the 8 effects) + "each fired via a named effect handler (R2), never a direct target-table write." `[INTENT S4]`.
- **G-S5** — on the `sessions` spine (L28–31): make `status` an enumerated **CHECK ∈ `scheduled·planned·in_progress·completed·skipped·missed·rescheduled`** (+ per-type hooks in the registry); `[INTENT S5]`.
- **G-R1** — on `session_effects`: add **`effect_event_id`** (`derive(subject_natural_key ‖ transition ‖ effect_type)`) with a **`UNIQUE`** constraint, and name the local-only **`applied_effects`** dedup ledger as a sibling System table; `[INTENT R1 — ADR-004 §3.2.5]`.
- **C2** — fix the L27 "(S4)" → S1, L42 `[INTENT S5]` → S3 (see §2 C2).
- Confirm the ADR list already names 004/002/001/003 (R6) — it does (L64–69); no R6 work.

**`business-rules.md`**
- **G-R1** — in SS-6 (L32–38): name the **`applied_effects`** dedup ledger token alongside the already-present `effect_event_id` (SS-6 already cites §3.2.5 + the mechanism; this makes the ledger token explicit). `[INTENT R1]`.
- **G-S5** — SS-3/terminal already enumerate the states (L83); confirm the enum wording matches the framework exactly (`rescheduled`, not "reschedule"); light touch only.
- **C2** — SS-3 L25 `[INTENT S5]` → S3.

**`contract.md`**
- **G-R1** — in the Effects surface (L22–23) + the effect-targets table (L42–51): state that each effect handler stamps the deterministic **`effect_event_id`** and is idempotent on it (`applied_effects` dedup); a replayed effect no-ops. `[INTENT R1]`.
- **C1** — the effect-targets table L49: `award_xp → Gamification → `xp_history` write` → **`award_xp → Gamification → documented write API over `consequence_ledger` (grant_currency Additive effect)`**; cite ADR-012 §3.3 (E3) + §3.1 (E4). Retire `xp_history` (forward regression).
- **G-S5** — L24: fix the "SS-8 states" cross-ref → **SS-1 / terminal-states** (the actual home of the lifecycle enum); the transition API stays.
- **C2** — L16/20/23/25/26: correct `S5`/`S5-dimN` tags to S3 (contract) / S4 (dim2) / S5 (dim3).

**`identity.md`** — no gap reaches identity (the module's identity as effect foundation is already stated); **no edit** unless the critique finds a contradiction.

**`conventions.md`** — light touch: add one landmine — "every cross-module effect carries a deterministic `effect_event_id` and is idempotent via the `applied_effects` ledger (R1); an effect NEVER writes a target table directly (R2)." `[INTENT R1/R2]`.

---

## §4. Acceptance (the definition-of-aligned §5 lines this unit must pass)

- [ ] **S4** — `structure-data.md` names the full 8-effect catalogue on `session_effects`, each via R2; no effect outside the catalogue with no handler.
- [ ] **S5** — `sessions.status` is an enumerated CHECK ∈ the framework's 7-state enum in `structure-data.md`; the `contract.md` cross-ref points at SS-1/terminal (not SS-8).
- [ ] **R1** — `effect_event_id` + `UNIQUE` + `applied_effects` all named on the schema spine; SS-6 names `applied_effects`; the effect-handler contract states idempotency-on-replay.
- [ ] **C1 (forward regression retired)** — no forward `xp_history`; `award_xp` targets Gamification's documented write API over `consequence_ledger` (ADR-012 cited).
- [ ] **C2 (label hygiene, if approved)** — the corrected capability-IDs (S1/S3/S4/S5) match the framework; no `(S4)`/`S5` mis-tag remains. *(separable — may be deferred without affecting G-S4/S5/R1.)*
- [ ] **Boundary rule** — every code/directory home (`applied_effects` package, effect-handler home) is `[DEFERRED — Part 2]`; only conceptual ADR homes asserted.
- [ ] **As-is untouched** — the 6-table FACT floor + all existing `[INTENT]` shape preserved; this is an addition, not a rewrite (except C1).
- [ ] **R6** — the As-is/`[INTENT]` split + named ADRs (004, 002, 001, 003) intact (already present; confirm not regressed).
- [ ] **Rails** — `[E]` on `key_learnings`/free-text preserved (R3); `_sync_*`/`deleted_at` statements intact (R4); reads via `dueIn()` (R7) unchanged.
- [ ] **No new anti-signal** introduced; **no structural call made**; no schema-level reconciliation (DDL/table-count) attempted.
- [ ] **No contradiction** with any ADR 001–017, nor with the aligned neighbors that link here (`journals` reads `/summary`; `pomodoro` is the `focus` runtime `[[../pomodoro/*]]`; `health/training` `workout_sessions` sub-type).

---

## §5. Out of scope (explicit)

- **The `pomodoro` context's own re-run** — it is a separate Tier-1 unit (sweep row 5, "reframe-in-progress"). This unit only keeps the `[[../pomodoro/*]]` cites + the `focus`/`session_id` reframe already present; it does not finish pomodoro's own S4/R1 gaps.
- **ADR-012 economy substrate beyond C1** — this unit retires the one forward `xp_history` token it edits; it does NOT add the full E-layer (`grant_currency`/`consequence_ledger`/`store`) contract — that is Gamification's own aligned doc + the receiver-side detail.
- **Code/directory homes** — `applied_effects` ledger, effect handlers, `session_effects`/`session_type_registry` package homes → Part 2 structural.
- **Schema-level reconciliation** — final DDL, whether `session_effects` is one table vs per-type binding, table counts → DB build phase (ADR-016).
- **M\*/X\*/AI\*** — not this context's drivers (signal source, not measure/ingest/AI owner).
- **The ADR-002 amendment content** — the doc references a pending ADR-002 amendment for the INTENDED tables; authoring that amendment is a separate ADR job (`/adr-new` if a decision surfaces), not this doc re-run.

---

## Change Log
| Date | Change |
|------|--------|
| 2026-07-23 | Initial PLAN drafted from the ground read (sweep row 6 + framework §2 R1/R2 + §3 ADR-004 S1–S7 + all 5 aspect docs). Ground-truth refinement: the sweep scored only `structure-data.md`; S4 is present in contract, S5 in business-rules, R1 only partial (SS-6 names `effect_event_id`, not `applied_effects`/`UNIQUE`) — so the real fills are narrower and the genuine gap is R1's concrete tokens on the spine + effect-handler contract. Two corrections surfaced (C1 forward `xp_history` regression, C2 capability-ID label drift). Presented for the LITE gate. |
| 2026-07-23 | Independent adversarial critique (fresh subagent) → **SHIP**, no blocking findings. Critic verified against source: ADR-004 §3.2.2/§3.2.3/§3.2.5 exist with every cited token (no fabrication); the present/absent diagnosis is correct at every line; `applied_effects`/`UNIQUE` genuinely absent from all 5 aspects; C1 `xp_history` is a forward `[INTENT]` target (As-is exemption does not cover it) → C1 correctly IN-SCOPE; no boundary/DDL violation. 3 non-blocking cite-precision notes folded in: **N1** (E4 pin → §3.1, not §3.3), **N2** (`empty`/`error` kept as the doc's runtime tail, NOT framework-S5 CHECK members), **N3** (`grant_currency` = E2 feeder / E4 Additive class). C1 + C2 both IN-SCOPE (C2 separable). |
