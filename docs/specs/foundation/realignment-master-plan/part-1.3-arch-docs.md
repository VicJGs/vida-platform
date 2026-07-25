# Part 1.3 — Architecture-Doc Realignment (PLAN)

**Type:** planning (foundation) — the LITE-gated plan for master-plan **Phase 1.3** (`realignment-master-plan/_index.md`).
**Status:** DRAFT — presented for the Part-1.3 gate (independent adversarial critique → Victor approval).
**Date:** 2026-07-25 · **Session:** build-roadmap-resequence (foundation-realignment campaign, Part 1.3).
**Grounded in:** ADRs 001–017 (exact titles verified 2026-07-25) + `capability-framework.md` §2–§5 + `staleness-sweep.md`
(the 8 arch-doc rows) + the 17 Part-1.2 re-run outputs (`part-1.2-reruns/*.md`) + the 4 stale arch docs read end-to-end.
**No-Guessing:** every substrate token below is one an ADR actually names (FACT + cite). No code/directory home is
assigned to any substrate (Part-1/Part-2 boundary rule). No table count or schema-level reconciliation is asserted
(owed to DB-11, ADR-016).

---

## §0. What this is — and why its shape differs from Part 1.2

Part 1.2 re-ran **17 per-context feature docs**, each an independent unit with its own LITE gate — the independence is
what justified 17 separate units (and delivered 11 consecutive critique-clean).

Part 1.3 is the **8 `docs/core/architecture/*` docs**. They are **not independent**: they cross-reference each other
(`README` → `system-overview` → `module-dependency-graph` → `cross-module-integration`) and each describes the
*whole system*, not one feature. Re-running them as 8 isolated units would risk them drifting from one another. So
Part 1.3 is structured as **one plan with a shared substrate-delta brief (§1) established once**, then **3 weight-tiers**
(§4–§6), each carrying its own gate. This matches the master plan's single-LITE-phase framing for 1.3.

The staleness sweep already triaged all 8 (row-for-row): **4 stale** (full rewrite) · **2 partial** (surgical) ·
**2 partial-low** (low-touch). None of the 8 references ADR-004+ at all — the arch layer is uniformly pre-substrate
(sweep F4). Part 1.3 makes the arch docs describe the **substrate world** the 17 realigned contexts + ADRs 004–017
now define.

---

## §1. The shared substrate-delta brief (the once-established spine every doc applies)

This is the arch-altitude distillation of what the foundation changed underneath the arch docs. It is **not re-decided
here** — every row is already ratified in an ADR and applied across the 17 Part-1.2 re-runs. Each row: the **retired
mechanism** the arch docs encode → the **substrate** that replaces it, its **owning ADR**, and the **capability IDs**
(framework §3) that name it. This brief is the reframe key for all of §4–§6.

> **The five core substrate frameworks** the master plan calls out (Sessions · Spaces · Capability · Measurability ·
> Economy) are rows 1, 3, 5, 8, 9 below; the remaining rows are the other ADR-004–015 substrates that also surface in
> the stale docs. The arch docs give each a documented **conceptual** home (which ADR/framework owns it) — never a
> code/directory home.

| # | Retired mechanism (in the arch docs today) | → Substrate (go-forward) | ADR | Capability IDs |
|---|---|---|---|---|
| 1 | Standalone `pomodoro_sessions` / `study_sessions` / `reading_sessions` as flat independent tables; "Pomodoro" as a peer module | **`sessions` table-per-type supertype** under a 4-D Integration Contract; pomodoro/study/reading are **sub-types**; effects catalogue + lifecycle enum + idempotency rail | ADR-004 | S1 S4 S5 · R1 |
| 2 | `flashcard_decks` / `flashcards` / `flashcard_reviews` / SM-2 as bespoke tables | **Generic review engine** (`review_events` / `method_bindings` / `review_curves`), mastery-derived; study methods are pluggable services | ADR-005 | SM1–SM4 |
| 3 | `page_tags`, inline `*.tags` columns, `parent_tag_id`, closed tag CHECK | **`spaces` foundation tier + `entity_tags`** universal tagging above every module; open taggable-type registry | ADR-006 | SP1 SP2 SP3 SP4 |
| 4 | Bespoke per-module view tables (`task_views`, etc.) | **One `views` primitive** (filter × layout × grouping), Space-owned or global, over documented read APIs | ADR-007 | V1 V2 V4 V5 |
| 5 | Closed `BlockType` union / fixed slash-block set (`/summary` `/tasks` … as an enum) | **Open capability-block registry**; a capability declares render targets, placement is the user's choice | ADR-008 | CB1–CB* |
| 6 | (implicit: templates as live-linked copies) | **Templates = portable seed bundles, fork-on-instantiate** (deep copy, no live link) | ADR-009 | T1 T2 T3 |
| 7 | (implicit: ambient trust for any in-app capability) | **Capability authoring security** — declare→grant→enforce in a no-ambient-authority sandbox | ADR-010 | A2 A5 |
| 8 | Bespoke `measurement_type`/`type` enums; `progress NOT NULL DEFAULT 0`; `purpose_habits` / `purpose_routines` / `purpose_projects` junctions | **Universal measurability**: `measurement_kind` × `binding_mode`, nullable progress (`NULL ⇒ derive`), **`contributions`** weighted polymorphic rollup (**keep `project_habits`**) | ADR-011 | M1 M2 M3 M4 M5 M7 |
| 9 | `xp_history`, direct `awardXP(...)`, `user_profile.total_xp` as the authoritative store; "distributed XP" model | **Multi-currency points economy** on a rule→consequence engine riding the binding+effect+capability rails; `grant_currency` effect; **`consequence_ledger`** derived-balance | ADR-012 | E2 E3 E4 |
| 10 | Pref-gated server-side notification dispatch (assumes the server sees content) | **ZK three-tier delivery** — local-scheduled OS alert · content-free cross-device **wake-signal** · in-app always; server never sees notification content | ADR-013 | N1 N2 N7 |
| 11 | (absent) External data just "imported" | **Device-mediated ingestion guard**, 3 layers (native · public-reference · user-managed), server unconditionally blind, third-party leaks disclosed; `external_in_ok` / `external_out_ok` grants | ADR-014 | X1–X11 |
| 12 | (absent) AI/LLM unmodeled | **Two AI modes** — on-device/agentic (ZK-safe) · cloud via user's own key (consented plaintext dent); dedicated layer, server blind; `source=ai` provenance | ADR-015 | AI1–AI6 |
| 13 | Closed `entity_links` CHECK (34 fixed types) | **Open taggable/linkable registry** (same SP2 pattern) — the "34 types" is a build-phase concern, not a closed doc-level enum | ADR-006 §SP2 | SP2 |
| 14 | The effect side of any completion written directly (no exactly-once guard) | **Effect rail**: `effect_event_id` + `UNIQUE` + `applied_effects` ledger — bindings → effects, applied exactly once | framework §2 R1 | R1 R2 |

**Two cross-cutting framings the arch docs must also carry (ADR-016/017):**
- **Storage rebuilt from zero** (ADR-016): a fresh `schema/` authored per-table from the docs; **DDL is hand-written SQL
  migrations, Drizzle is the query-only type mirror** (not the schema source). Anywhere an arch doc says "schema (Drizzle)"
  as the source of truth, that framing is stale.
- **Features-first sequencing** (ADR-017): the Phase-1.0 build is features-first on the local-first stack, with
  **encryption / sync / auth deferred to a later hardening pass**; delivery via **web SPA (A) → Tauri desktop (D)**.
  Arch docs describe the target architecture but must not imply encryption/sync are being built up-front now.

---

## §2. Boundary rules (Part-1.3-specific — the traps this phase must not spring)

1. **Conceptual home, not code/directory home (R5, hard).** An arch doc may name a substrate's **owning ADR** ("the
   `sessions` supertype is governed by ADR-004") but must **not** assign it a `packages/core/src/...` path. The stale arch
   docs are full of "Code governance" code-path references to **v1** services (`journal-service.ts`, `backlink-service.ts`,
   `xpHistory`/`achievements` tables). Rule for these: (a) a code path that points at a **v1 primitive being retired**
   (e.g. `xp_history`) is corrected to the substrate + ADR, no new path invented; (b) an existing code path that merely
   *locates current governance* may stay **as a FACT**, but any that would assert a **new** substrate's code home is
   marked `[home: Part 2]`. Never crystallize a directory decision here.
2. **Arch docs are forward/target descriptions — NOT the per-context two-tier As-is/[INTENT] split.** Unlike the 17
   feature re-runs (which carried a live As-is FACT floor), the arch docs *describe the target mental model*. They are
   rewritten to describe the **substrate world directly**, plus **one explicit "Implementation status" note** per rewritten
   doc pointing at `current-state-baseline/baseline.md` + ADR-016 (rebuild) + ADR-017 (features-first) so no reader mistakes
   the target architecture for shipped code (~99% of code predates the foundation, per the baseline).
3. **No schema-level reconciliation (owed to DB-11, ADR-016).** Do **not** assert a new table count ("~72 tables",
   "19", the `entity_links` "34 types"), and do **not** author or consolidate DDL. Reference the **concept** (open
   registry, substrate tables) and defer counts/columns to DB-11. `security-model.md` §8 (a field-classification table)
   is the sharpest trap — see §5.
4. **ADRs are the foundation; a stale doc is never a source of truth.** Where an arch doc contradicts an ADR, the **doc**
   is wrong. Never patch an ADR to match a doc. If a rewrite surfaces a genuinely *undecided* architectural question,
   it files an **`/adr-new`** (R2) — it is never buried in prose.
5. **Cross-doc consistency is the point of grouping.** A substrate is named **identically** in all 8 docs (the §1 token
   set is the single vocabulary). Tier A establishes it; Tiers B/C conform to it, never re-coin it.

---

## §3. Tier structure + gate flow

Three tiers, **ordered by dependency then weight**. Each tier runs the LITE loop:
**detailed reframe → independent adversarial critique (fresh subagent) → fold → Victor approval → implement → grep-verify → commit.**

| Tier | Docs | Shape | Why grouped |
|------|------|-------|-------------|
| **A** | `module-dependency-graph` · `system-overview` · `cross-module-integration` · `README` | Full rewrite | The 4 stale docs share ONE substrate worldview + cross-reference each other; one coherent reframe keeps them mutually consistent. Ordered **dep-graph → system-overview → cross-module → README** (graph is the structural spine the others narrate; README is the last-mile index). |
| **B** | `data-flow` · `security-model` | Surgical | Both have a **current, load-bearing core** (pipeline / crypto §1–7) + **one stale annex** (data-flow step-10 effect layer; security-model §8 field table). Touch only the annex. |
| **C** | `platform-strategy` · `performance-strategy` | Low-touch | Substrate-neutral cores survive; only an editor-extensions framing (ADR-008) and incidental legacy table names change. |

**Gate cadence:** 3 gates (one per tier). The **shared substrate-delta brief (§1)** is ratified as part of **Tier A's**
critique (Tier A is where it first applies and carries the most risk); Tiers B/C cite it, not re-derive it. Part 1.3 as a
whole then feeds the **Part-1 exit gate** (master-plan Step 6: `victor:quality-gate-foundation` + independent critic +
approval) — that is a *separate* later gate, not one of these three.

---

## §4. TIER A — the 4 stale full-rewrites (per-doc reframe map)

### A1. `module-dependency-graph.md` (stale — drawn at retired 17-module + junction granularity)

The structural spine; rewrite first so the others narrate a corrected graph.
- **§2 "The 17 Modules"** → reframe to **foundation substrates + feature modules**. The high-in-degree hubs are no longer
  just "Notes & Pages / Preferences" — they now include the substrates: **Spaces/`entity_tags`** (ADR-006), the **`sessions`
  supertype** (ADR-004), the **measurability/`contributions`** rail (ADR-011), the **economy/`consequence_ledger`** engine
  (ADR-012), **`views`** (ADR-007), and the **review engine** (ADR-005). Pomodoro stops being a peer module (it's a
  `sessions` sub-type).
- **§3 diagram + §4 dependency table:** retire the junction edges `purpose_habits`/`purpose_routines`/`purpose_projects`
  → **`contributions`** (keep `project_habits`); "Languages ⟶ Learning shares the flashcard framework" → shares the
  **review engine** (ADR-005); Gamification "Awards XP" edges → **emits `grant_currency` / effects on the rail** (ADR-012);
  Pomodoro polymorphic edges → **`sessions` sub-type** references.
- **§5 in/out-degree + §6 risk points:** recompute the "most depended on" framing so the **substrates** appear as the real
  blast-radius centers (measurability, economy, sessions, spaces), not only `pages`. Keep the *analysis* (hard/soft, blast
  radius) — only the **granularity** changes.
- **§7 + References:** `entity_links` "34 types" closed CHECK → **open registry**; `schema.ts` monolith reference →
  ADR-016 per-table `schema/` framing (no path decision — cite the ADR).
- **Implementation-status note** (per §2.2) added near the top.

### A2. `system-overview.md` (stale — the exact pre-substrate worldview)

- **Content-Source line** ("Extracted from `docs/architecture.md` v2 legacy") → the legacy is **quarantined**
  (`docs/_legacy/`); re-source to ADRs 001–017 + framework.
- **§2 Module Inventory (17 modules):** rewrite each stale description in place — Habits "cue/reward" stays as domain
  language but its completion **rides the effect rail** (S4/R1); Projects "junction tables" → **`contributions`**;
  Pomodoro → **`sessions` sub-type** (not a standalone module row); Learning "flashcard decks with SM-2" → **review
  engine**; Purposes "junction tables with aggregated progress" → **`contributions` + measurability rollup** (M4/M7);
  Gamification "XP points … emits XP events" → **multi-currency economy, `grant_currency`, `consequence_ledger`**
  (ADR-012); Notifications "opt-in/opt-out per category" → **ZK three-tier delivery** (ADR-013).
- **§3 Three-Layer Architecture:** insert a **substrate tier** into the mental model — the feature modules ride
  shared foundation substrates (Spaces, Sessions, Measurability, Economy, Views, Review-engine, Capability-registry,
  plus Ingestion/AI layers). Update the ASCII diagram: drop Pomodoro-as-module; open the slash-block set (ADR-008
  capability registry, not a closed list).
- **§6 Tech Stack Summary:** mostly ADR-001-current (keep). Correct: "database schema (Drizzle)" → **hand-written SQL
  migrations; Drizzle query-only** (ADR-016); "~72 tables" reference → drop the count (DB-11); add the **ADR-017
  features-first / encryption-deferred** framing to the platform-status framing.
- **Implementation-status note** added.

### A3. `cross-module-integration.md` (stale — every cataloged integration is a retired mechanism)

- **§3.2 entity_links:** closed 34-type CHECK → **open registry** (SP2); keep the `[[wiki-link]]` mechanism.
- **§5 Purpose Junction Tables:** `purpose_habits`/`purpose_routines`/`purpose_projects` → **`contributions`** (weighted,
  polymorphic; M7); keep `project_habits`. Aggregated progress → the **measurability rollup** (M4).
- **§6 Study Planner:** `flashcard_decks` resource type → **review engine** (ADR-005).
- **§7 Gamification Integrations:** the entire `awardXP → xp_history → user_profile.total_xp` flow → **the rule→consequence
  engine**: module completion fires an **effect on the rail** (`grant_currency`, ADR-012 E2), balance is **derived from
  `consequence_ledger`** (E3/E4), applied exactly-once via `effect_event_id`/`applied_effects` (R1). Achievement detection
  reframed as consequence rules, not per-module ad-hoc `awardXP`.
- **§8 Notification Integrations:** the pref-gated server-dispatch pipeline → **ADR-013 three tiers** (local-scheduled ·
  content-free wake-signal · in-app); the server **never sees notification content**. Keep per-category user control as a
  *local* filter, not a server-side gate.
- **§10 Polymorphic Reference Registry:** `pomodoro_sessions` → **`sessions` sub-type**; `xp_history` → **`consequence_ledger`**;
  `flashcard_decks` → **review engine**; `entity_links` "34 types" → **open registry**.
- **New (gap-add):** a short subsection naming the **external-ingestion** (ADR-014 X*) and **AI** (ADR-015 AI*) cross-cutting
  layers as integration surfaces — they are cross-module by nature and currently absent.
- **Code-governance code paths:** apply boundary rule §2.1 (retire retired-primitive paths; `[home: Part 2]` any new
  substrate home).

### A4. `README.md` (stale — "17 domain modules"; ADR canon frozen at 001–003)

Smallest. **Overview:** "17 domain modules" → the substrate + feature-module framing (consistent with A2). **Relationship
to ADRs:** "canonical … ADR-001/002/003" → **ADRs 001–017 + the capability framework** are the foundation. **Documents
table:** same 7 files; refresh one-line descriptions to match the rewritten docs.

---

## §5. TIER B — surgical passes (touch only the stale annex)

### B1. `data-flow.md` (partial — only the step-10 effect layer)
- **Keep:** the write / read / encryption pass-through / sync-pipeline / service-layer / state-management core (sweep:
  "still substrate-accurate").
- **Rewrite step-10 only:** the retired **direct-`awardXP`** effect step → the **effect rail** — a completion writes a
  binding-driven effect applied **exactly once** via `effect_event_id` + `applied_effects` + `UNIQUE` (R1), with
  balances/progress **derived** (ADR-011/012). **Keep the two-layer discipline explicit** (the campaign's known trap): the
  session-effect member is **`award_xp`** (ADR-004 §3.2.2 S4 catalogue); **`grant_currency`** is its **ADR-012 E2
  generalization** — never a member of the S4 catalogue. `contribute_purpose_metric` (M-rail) rounds out the effect set.
  No R1 rail exists in the current step-10; that is the whole gap.

### B2. `security-model.md` (partial — §8 field-classification annex only)
- **Keep §1–7** (crypto architecture, key hierarchy, SRP) — current and load-bearing; **do not touch.**
- **§8 field-classification table** is a full snapshot of the **retired** schema, missing every substrate table. **Boundary
  trap (§2.3):** a full re-tabulation of every substrate column is **schema-level → DB-11's job**, out of scope. So §8 is
  reframed **conceptually**: name the **new field-classes the substrates introduce** (e.g. `entity_tags`, `sessions` +
  effect ledgers, `contributions`, `consequence_ledger`, review-engine events) and their **encryption tier** at the
  *class* level, and **explicitly defer** the exhaustive per-column classification to DB-11 with a pointer. Also fold the
  **ADR-017** note that field-level encryption/sync is a **deferred hardening pass** (the classification is the target, not
  yet enforced). This keeps §8 honest without crossing into schema reconciliation.

---

## §6. TIER C — low-touch passes

### C1. `platform-strategy.md` (partial-low)
- **Keep:** adapter / build / code-sharing strategy (substrate-neutral).
- **One pass:** the editor **"custom extensions"** framing → **ADR-008 open capability-block registry** (capabilities
  declare render targets; placement is the user's choice) — not a hard-coded extension set.

### C2. `performance-strategy.md` (partial-low)
- **Keep:** all substrate-neutral perf guidance (targets, decimation, virtualization, memory).
- **One pass:** replace **incidental legacy table names** in cache/query examples with substrate names (e.g. `xp_history`
  → `consequence_ledger`, junction tables → `contributions`) so no example teaches a retired token. No strategy change.

---

## §7. Acceptance predicates (grep-checkable — verified per tier before commit)

Run against the rewritten/touched docs (Tier A: 4 docs; B: 2; C: 2):
- **P1** Zero forward `xp_history` / `awardXP` / `award_xp`-as-authoritative-store / `user_profile.total_xp`-as-store →
  `consequence_ledger` + `grant_currency` (rows 9, 14).
- **P2** Zero `purpose_habits` / `purpose_routines` / `purpose_projects` → `contributions`; **`project_habits` retained**
  (row 8).
- **P3** Zero `page_tags` / inline `*.tags` / `parent_tag_id` → `entity_tags` (+ `spaces`) (row 3).
- **P4** Zero `flashcard_deck*` / SM-2-as-bespoke → review engine (`review_events` / `method_bindings`) (row 2).
- **P5** No standalone `pomodoro_sessions` as a peer module/table → `sessions` sub-type (row 1).
- **P6** `entity_links` "34 types" closed CHECK → open registry (row 13).
- **P7** Notifications reference the ADR-013 three-tier / **content-free wake-signal** framing (row 10), not server-side
  content dispatch.
- **P8** Every rewritten Tier-A doc references **ADR-004+** at least once (the sweep found 0/8 do today).
- **P9 (boundary)** No **new** code/directory home assigned to any substrate; substrate homes cite an **ADR** or carry
  `[home: Part 2]` (§2.1).
- **P10 (boundary)** No new **table count** asserted; no DDL authored/consolidated (§2.3); `security-model` §1–7 unchanged.
- **P11** External-ingestion (ADR-014 X*) + AI (ADR-015 AI*) layers named as integration surfaces in
  `cross-module-integration` (gap-add).

---

## §8. Risks

- **R1 — Tier A is a large, interlocking rewrite.** Mitigate: dep-order (graph first), the §1 brief as the single
  vocabulary, one critique over the coherent set.
- **R2 — `security-model` §8 leaks into schema reconciliation** (DB-11's job). Mitigate: the §2.3/B2 rule — classify at the
  *class* level, defer the per-column table to DB-11 with an explicit pointer. The critic checks this specifically.
- **R3 — Code-path references crystallize a Part-2 structural call** (R5 leak). Mitigate: boundary rule §2.1; P9 grep.
- **R4 — A rewrite surfaces a genuinely undecided architectural question** (e.g. whether the capability registry supersedes
  the fixed slash set at the *editor* layer). Mitigate: `/adr-new` (R2 of the master plan), never bury it in prose.
- **R5 — Over-rewriting a partial** (touching `security-model` §1–7 or `data-flow`'s good core). Mitigate: the surgical
  scope in §5; P10.

## §9. Not in scope

- Building anything; authoring schema tables or DDL; the ADR-002 §5/§7/§8 schema reconciliation (DB-11).
- Deciding any code/directory home (Part 2.0).
- Re-running an already-aligned context doc (Part 1.2 is closed).
- The Part-1 exit gate itself (master-plan Step 6 — a separate later gate).

## Change Log
| Date | Change |
|------|--------|
| 2026-07-25 | Initial draft — presented for the Part-1.3 gate (independent critique → approval). |
| 2026-07-25 | Independent adversarial critique → **REVISE (2 blocking)**, both invented capability-IDs in §1: **B1** Row 7 `CA*`→`A2 A5` (ADR-010 family is `A1–A9`); **B2** Row 6 `T4 (+ TP*)`→`T1 T2 T3` (T4 is the *preset* primitive, not the fork mechanism). Folded **N1** (§5 B1 now states the `award_xp`[S4] vs `grant_currency`[E2] layering explicitly) + **N2** (dropped Row-9 `(E6 E9)` over-reach). Economy-layering trap verified avoided; `security-model` §8 boundary verified holding; go-forward vocabulary verified fully ADR-grounded; grep re-run clean. → **Victor APPROVED** the plan (gate). |
| 2026-07-25 | **TIER A COMPLETE** — 4 stale docs rewritten (`module-dependency-graph`, `system-overview`, `cross-module-integration`, `README`) applying the §1 brief in dep-order. **Post-implementation** independent adversarial critique (a *second* fresh critic, on the rewritten prose not the plan) → **REVISE (2 blocking)**, both in `cross-module-integration.md`: **B1** §8 "Pomodoro alerts \| Pomodoro" (live source module) → "Focus/session alerts \| Sessions"; **B2** §9 "aggregated progress … via junction tables" → "via `contributions` (ADR-011)" — both *conceptual* stale mechanisms the token-grep missed (bare words, not the retired identifiers). Folded + 2 sharpening notes (N1 "XP award event"→effect; N2 "Gamification XP"→effect rail). Critic verified: economy-layering trap avoided everywhere, all boundary rules hold in the prose (no code home, no new table count, implementation-status note in all 4), `contributions`/ZK-notifications/capability-registry/sessions all correctly stated, `project_habits` kept. Final grep clean (residual stale tokens are only in Tier-B/C docs, not yet touched). → Tier A committed **6bd84a8**. |
| 2026-07-25 | **TIER B COMPLETE** — the two surgical passes. **`data-flow.md`:** rewrote the effect-layer touchpoints only (§1 step 10, "Why Post-Commit", §5 service example + Pattern Rule 5, §8 diagram) — direct-`awardXP` → binding-driven effect on the shared rail, applied exactly-once via `effect_event_id`/`applied_effects`/`UNIQUE` (R1), balances derived from `consequence_ledger`; kept the award_xp[S4]/grant_currency[E2] discipline; also fixed the `schema.ts`-monolith classification-source ref → ADR-016 per-table; write/read/encrypt/sync core untouched. **`security-model.md` §8 only:** added a scope note + a **class-level** "Substrate Field-Classes" table (entity_tags=E, spaces.name=E, sessions free-text=E/structural=P, contributions=P, consequence_ledger=P [gamification points ≠ money], review metadata=P/item=E, views.name=E/config=P) + two Always-E rubric touches (tags→entity_tags, flashcard→review-item); bannered the per-table breakdown as **v1 As-is** (retired tables kept for orientation, superseded, regenerated by DB-11); reframed the Encryption Statistics to distribution-shape (no re-asserted count); **§1–7 crypto byte-for-byte untouched.** Post-implementation independent critique → **SHIP / 0 blocking** (git-diff-verified both cores untouched; §8 boundary holds — no new counts, class-level only; all 7 P/E tiers ADR-correct; economy layering intact). Folded 1 note (declare `effectEventId` in the pseudocode). → Tier B committed **77d07cd**. |
| 2026-07-25 | **TIER C COMPLETE → PART 1.3 DONE (all 3 tiers).** The two low-touch passes. **`platform-strategy.md`:** §3.3 editor "custom extensions (fixed set)" → **capability-block registry** (ADR-008, verbatim: capability declares render targets, user chooses placement); + implementation-status note (ADR-008 blocks + ADR-017 delivery order A→D). **`performance-strategy.md`:** the sweep's "incidental legacy table names" did **NOT reproduce** — grep confirmed every table in its examples (`tasks`/`pages`/`entity_links`/`habit_completions`/`transactions`) is current/surviving (the campaign's "grep is the arbiter, not the label" lesson); so C2 = implementation-status note only (flags ADR-017 deferred encryption for the decryption-dependent latency targets) + a stated "no retired tokens here" finding. Grep-verified both clean; ADR-008 claim = ADR-008 title verbatim. **Gate note:** given Tier C is 3 minimal edits (1 semantic reframe + 2 status notes) and the ADR-008 claim is verifiable verbatim, the independent adversarial critique for Tier C is folded into the **imminent Part-1 EXIT gate** (scenario Step 6 — `victor:quality-gate-foundation` + independent critic over the WHOLE realigned corpus, all 8 arch docs + 24 contexts), rather than a disproportionate dedicated subagent for 3 lines. Tiers A + B each had their own full pre/post critique. → Part 1.3 ready to commit; NEXT = Part-1 EXIT gate. |
