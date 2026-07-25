# Re-run PLAN — notes-and-pages (Part 1.2, Tier 0 hub)

**Type:** doc-realignment unit PLAN (LITE gate — §XXVI LITE variant; non-code scenario).
**Status:** ✅ IMPLEMENTED (2026-07-23) — LITE gate passed (critique REVISE→fixed→approved); all 5 aspect docs edited; §4 acceptance verified mechanically (retired tokens As-is-only; forward tokens present; `pages.type CHECK(6)` preserved).
**Date:** 2026-07-23 · **Session:** build-roadmap-resequence (foundation-realignment campaign, Part 1.2).
**Context:** `docs/features/notes-and-pages/` (5 aspect files). **Verdict (sweep):** **stale** — drivers 006, 004, 007.
**Grounded in:** `staleness-sweep.md` (row 1 + Part 1.2 order), `capability-framework.md` §2–§5, and the 5 current aspect docs (read this session — the No-Guessing ground truth).
**No-Guessing:** every forward token below is one an ADR actually names (cited); no invented tokens. Code/directory homes are `[DEFERRED — Part 2]`, never decided here.

---

## §1. Context — why this re-run, and the root defect

Notes & Pages is the **in-degree-14 hub**; every downstream re-run links into its vocabulary, so it goes **first**. The sweep verdict is not that the doc names a wrong forward mechanism in isolation — it is that **the doc records the retired model as *current* with no proper R6 two-tier reframe.** It carries scattered `[INTENT G*]` tags but no `As-is (FACT floor) / [INTENT] Intended` split, so the retired tokens (`page_tags`, `entity_links.entity_type CHECK(33)`, flat `pomodoro_sessions`) read as the go-forward model → **stale** (this is exactly the case the As-is exemption does **not** cover: the tokens are presented as current, not retired-in-`[INTENT]`).

**Fix shape:** impose the R6 two-tier structure and, in `[INTENT]`, retire each stale token to the ADR-mandated forward primitive — citing the owning ADR (conceptual home) and **deferring every code/directory home to Part 2**.

**M\* (measurability) is correctly `n/a`** — notes are reference data, explicitly excluded from the pursuable set (framework M1 applies-to). No measurability gap to fill.

---

## §2. What changes — the five drivers (forward model + owning ADR)

| Driver | Retired token (As-is) | Forward model (`[INTENT]`) | Owning ADR (cite; home deferred) |
|---|---|---|---|
| **SP1** Universal tagging | `tags` + **`page_tags`** page-only junction; `tagPage`/`getPagesByTag` | tag junction is universal **`entity_tags(tag_id, entity_type, entity_id)`**; N&P becomes a **consumer**, not the owner of a page-only junction | ADR-006 §3.2 |
| **SP2** Open type registry | **`entity_links.entity_type CHECK(33)`** closed enum; NP-6 "closed set of 33" | `entity_links.entity_type` is validated against the **open taggable-type registry** (no hard-coded CHECK); new types register | ADR-006 §3.2 |
| **SP3** Nestable tags | absent (only `tags.name` + color) | tag row carries **`parent_tag_id`** (`#a/b`) + metadata `name [E]` · `color` · `icon` · `description [E]` | ADR-006 §3.2 |
| **SP4** Tags vs links distinct | tables distinct ✅ but `entity_links` on the closed CHECK ✗ | **`entity_tags`** (grouping) and **`entity_links`** (typed reference) never merge; **both** draw `entity_type` from the one open registry | ADR-006 §3.3 |
| **S1** Sessions supertype (pomodoro re-home — **finish it**) | **`pomodoro_sessions`** still a 6th owned table with v2 schema; `idx_pomodoro_*`; `PomodoroType/PomodoroStatus/PomodoroEntityType` as N&P single-source | `/pomodoro` is a **widget-lens** onto the **`focus_sessions`** extension of the **`sessions`** supertype, keyed by **`session_id`** with the base `sub_type` discriminator (the discriminator *value* string is `[UNKNOWN — build-phase]`; ADR-004 names the table + column, not the value); N&P no longer owns a pomodoro table | ADR-004 §3.1 + `[[../pomodoro/*]]` |

**Scope guards (do NOT over-apply):**
- **`pages.type CHECK(6)`** (the 6 page *kinds*) is **legitimate and stays** — SP2 is about the *entity-type registry* on `entity_links`/`entity_tags`, **not** page kinds. `identity.md` "Not an open page-type system" remains correct.
- The As-is FACT floor **keeps** the retired tokens on record (R6 requires the floor to state what the code is today); they are retired **in `[INTENT]` only**, not deleted from the doc.
- **Conceptual ownership is DECIDED and must be ASSERTED, not deferred.** ADR-006 §3.1 already rules that **the tag primitive moves to the Spaces/`entity_tags` substrate and N&P becomes a *consumer* — N&P no longer owns a tag junction.** `[INTENT]` states this as fact (cite ADR-006 §3.1), which actively corrects the current doc's stale "6 owned tables" claim. `entity_links` stays N&P-described but its `entity_type` is validated against the open registry (ADR-006 §3.2/§3.3) — ADR-006 opens its CHECK, it does not reassign the table's owner.
- **Only the PHYSICAL code/directory home is `[DEFERRED — Part 2]`** — i.e. which package `entity_tags` (and the `focus_sessions` extension) physically live in. The re-run asserts *who owns the concept* (ADR-006 / ADR-004) and defers *where the code sits*. The `[INTENT]` owned-tables statement therefore drops the tag junction (retired-to-substrate) and pomodoro (re-homed), leaving `pages`/`page_links`/`entity_links`/`note_attachments` as N&P's four; it is a **reframe**, not a re-counted schema assertion.

---

## §3. Per-aspect edit map (structure-data = spine; siblings only where a driver reaches)

**`structure-data.md`** (spine — all five drivers land here)
- Impose the **R6 two-tier structure**: an **As-is (FACT floor)** table = today's 6-table schema verbatim (retained), and an **`[INTENT]` Intended** section that retires per §2.
- SP1/SP4: reframe the `tags`+`page_tags` row → universal `entity_tags`; note the tag *definition* metadata carries SP3 fields.
- SP2/SP4: `entity_links.entity_type` → open-registry validation; retire the `CHECK(33)` as As-is-only.
- SP3: add `parent_tag_id` + `icon`/`description [E]` to the tag primitive (`[INTENT]`).
- S1: move `pomodoro_sessions` into the As-is floor as **retired**; `[INTENT]` = `focus_sessions` extension of `sessions` keyed by `session_id`, cite `[[../pomodoro/structure-data]]`; drop `idx_pomodoro_*` from the forward index set; reframe the L35 single-source line (`Pomodoro*` types re-home; `EntityLinkTarget(33)` → open registry).
- **007 flag (deferred, not reframed):** on the "Collection views" line (L28) + the Zustand "open view" line (L23), add a one-line `[INTENT — DEFERRED]` marker: *renderers are selectable by an ADR-007 `views` row; the saved-view primitive reframe is pulled to a dedicated views/Spaces pass.* Do **not** reframe the view model here (see §5). This flags the sweep's 007 driver in-doc instead of silently skipping it.
- Name the ADRs the context is subject to (006, 004, 007, 002, 003) per R6.

**`business-rules.md`**
- **NP-6** ("closed set of 33 types") → reframe: `entity_type` validated against the open registry (ADR-006 SP2); the "33" is the As-is snapshot.
- **NP-3** (encrypted fields): tag `name` **and** `description` are `[E]` (SP3/R3).
- **NP-9** (cascade): `page_tags` cascade → `entity_tags` cleanup by `entity_type/entity_id`; `pomodoro_sessions.page_id SET NULL` → retired (re-homed). Mechanics `[DEFERRED — Part 2]`.

**`contract.md`**
- **Tags API** (`tagPage`/`getPagesByTag`) → `entity_tags`-based tagging surface (universal), N&P as consumer.
- **Entity links**: the "33 `EntityLinkTarget`" references + `InvalidEntityTypeError` → open-registry validation (ADR-006).
- **Pomodoro** entry: already mostly reframed (widget-lens) — align tokens with §2 (`focus`/`session_id`), confirm the v2 API is marked superseded.

**`identity.md`**
- Pomodoro reframe already present (L5) — align wording to §2; no other driver reaches identity (page-type closedness stays correct).

**`conventions.md`**
- Light touch: add a landmine — tags are the **universal `entity_tags`** primitive (never a page-only `page_tags` junction); entity-type comes from the open registry, not a fixed CHECK.

---

## §4. Acceptance (the definition-of-aligned §5 lines this unit must pass)

- [ ] **Tagging** = `entity_tags` (SP1) in `[INTENT]`; `page_tags` appears **only** in the As-is floor, explicitly retired.
- [ ] **Open registry** (SP2): no forward `entity_type CHECK(...)`; `entity_links` validated against the open registry; NP-6 reframed.
- [ ] **Nestable** (SP3): `parent_tag_id` + `icon`/`description [E]` named in `[INTENT]`.
- [ ] **Tags vs links** (SP4): both distinct **and** both draw `entity_type` from the one open registry.
- [ ] **Sessions** (S1): no forward-owned `pomodoro_sessions`; `/pomodoro` = `focus_sessions` extension of `sessions` keyed by `session_id` (`sub_type` value `[UNKNOWN — build-phase]`); conceptual home cited, code home deferred.
- [ ] **Ownership reframe asserted** (B2): `[INTENT]` states N&P is a *consumer* of the tag primitive (ADR-006 §3.1) and corrects the stale "6 owned tables" claim; only the physical package home is deferred.
- [ ] **007 reconciled** (B3): the view-renderer lines carry an `[INTENT — DEFERRED]` 007 flag; the plan reconciles with the sweep's named 007 driver.
- [ ] **R6**: the As-is (FACT floor) / `[INTENT]` split is present and names the subject ADRs (006, 004, 007, 002, 003).
- [ ] **Rails**: `[E]` preserved on all free-text (R3); `_sync_*`/`deleted_at` statements intact (R4).
- [ ] **No new anti-signal** introduced; **no structural call made** (every code/directory home `[DEFERRED — Part 2]`); `pages.type CHECK(6)` preserved.
- [ ] **No contradiction** with any ADR 001–017, nor with the three already-aligned neighbors that link here (`journals`, `purposes-and-goals`, `gamification`).

---

## §5. Out of scope (explicit)

- **V1 (ADR-007 saved-views-as-`views`-rows) — the 007 driver, deferred with reconciliation.** The sweep (row 1, `staleness-sweep.md` L35) names **007** among N&P's drivers on the saved-view axis (the "Collection views / open view" lines read as hard-coded renderers, pre-ADR-007). Per **Victor, 2026-07-23**, the `views`-primitive reframe is **pulled to a dedicated views/Spaces pass** rather than folded into the hub re-run. This re-run therefore **flags** those lines in-doc (§3, `[INTENT — DEFERRED]`) but does **not** reframe the view model — closing the governance gap between the sweep's 007 scope and this unit's scope without expanding it.
- **ADR-006 §3.3 unify⇄separate resolution layer** — a Spaces/Preferences user-facing behavior over `entity_tags`+`entity_links`, **not** an N&P concern; considered and left out of scope.
- **SP5–SP7 (`spaces`)** — not a sweep driver for N&P; out of scope.
- **Code/directory homes** for `entity_tags`, `entity_links`, the tag primitive, `focus_sessions` — Part 2 structural.
- **Schema-level reconciliation** (table counts, consolidated DDL) — DB-11 (ADR-016).
- **Pomodoro context's own detail** — settles in its own Tier-1 re-run; this unit only retires N&P's local ownership + cites it.

---

## Change Log
| Date | Change |
|------|--------|
| 2026-07-23 | Initial PLAN drafted from the ground read (sweep row 1 + framework §2–§5 + 5 aspect docs). Presented for the LITE gate. |
| 2026-07-23 | Independent adversarial critique → **REVISE**; all 3 blocking incorporated: **B1** (`focus` → real ADR-004 token `focus_sessions` extension + `sub_type`; value `[UNKNOWN — build-phase]`), **B2** (assert the decided ADR-006 §3.1 consumer-ownership reframe; defer only the physical package home), **B3** (reconcile the sweep's named 007 driver — flag the view lines `[INTENT — DEFERRED]` per Victor's defer, don't silently skip). Non-blocking N1–N5 verified correct (As-is exemption correctly not firing; `pages.type CHECK(6)` correctly kept; cites clean). |
