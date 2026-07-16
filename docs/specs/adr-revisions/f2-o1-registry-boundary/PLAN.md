# PLAN — F2/D2: The study_methods ↔ capability-registry boundary (O1)

**Unit:** ADR revision F2 (throughline ③, O1 — one of two dangling Spaces seams)
**Gate:** §XXVI full Per-Step Build Gate — this file = gate 1 (the SPEC)
**Owner ADR:** ADR-008 (capability registry — the *supertype* registry) · ADR-005 (amended — `study_methods` becomes a typed specialization) · constitution: business-rules PC-2 note
**Source of truth read (Step 1):** ADR-005 §1/§3.1(part 3)/§3.3/§4-OptC · ADR-008 §1/§3.1/§3.3/§4-OptC/Builds-on · business-rules PC-1…PC-4 + INT-1a + INT-2 · `docs/features/knowledge/{contract,structure-data}.md` + `flashcards/*` · report D2 + owed-tables ledger
**Decision record:** `docs/reviews/2026-07-15-adr-critique-gate.md` F2/D2
**Decision ratified pre-PLAN (Victor 2026-07-16):** **D2 = option (A)** — one registry; `study_method` is a **kind-specialization** of the capability registry (is-a), mirroring ADR-004's Session supertype/sub-type pattern.

---

## §1. Context — the gap (grounded, not paraphrased)

Two plugin registries were designed three days apart, each with a 6-part anatomy, each a "keep the seam, retire the instance" registry — and the boundary between them was **never stated**:

- **ADR-005 `study_methods`** (Knowledge-owned, 2026-07-12): a study-method *service* registers here (`§3.1` part 3, L46-47); the user binds it via `method_bindings` + a curve. Distinctive machinery: `review_curves` · `method_bindings` · `review_events` → mastery (KN-10). `[FACT: ADR-005 §3.1, §3.2]`
- **ADR-008 capability registry** (Spaces foundation, 2026-07-15): a *capability* registers here (`§3.1`, L47-49); it declares render targets (`inline`/`standalone`) and writes via ADR-004 §3.2.5. `[FACT: ADR-008 §3.1, §3.3]`

ADR-008 relates the two **by analogy only**: *"A capability registers (like Knowledge's `study_methods`, ADR-005)"* (`ADR-008:L48`) and *"6-part anatomy (mirrors ADR-005)"* (`ADR-008:L58`). The boundary — is a study-method service a capability? one registry or two? — is never resolved. `[FACT]`

**Two consequences (from the report):**
1. **Two competing composability registries of the same shape** — duplicated anatomy, duplicated ADR-010 author-time validation, duplicated effect/permission wiring; the second study-method service (assessments, the ADR-005 review trigger) and the first user-authored capability collide.
2. **Study-methods can't even *declare* a surface** — render-target eligibility lives only on the capability side; a flashcard drill has no way to say "I render `standalone`/`inline`" at all. (The is-a grants the *eligibility* to declare; SP4's per-instance *placement* is F3/O2, not F2 — B5.)

**The clincher:** ADR-008's own **Option C rejects a two-registry split** (`ADR-008:L118-120`) — for editor-vs-widget, but the principle ("one registry, two surfaces, not two systems") is exactly what the 005 boundary violates. The fix generalizes ADR-008's own rejected option to cover 005.

**No-Guessing labels:** everything in §1 is `[FACT]` (read from the cited ADR lines this session). The design in §3 is `[DECISION]` (ratified direction D2=A; the *encoding* needs Approval).

---

## §2. Invariants this unit must satisfy (business rules)

- **BR-1 (one composability registry).** There is **exactly one** registry of "pluggable units that drive a Session and own Effects" — the **capability registry** (ADR-008). No parallel registry of the same shape exists at any tier. `study_methods` is **not** a second registry.
- **BR-2 (study_method is-a capability).** A study-method service is a **capability of `kind=study_method`** — it registers in the one capability registry, inherits the anatomy (six parts + the `role` axis, per Part 0), the render-target **eligibility** (the *capacity* to declare `inline`/`standalone`; actual placement is F3/O2), and the ADR-004 §3.2.5 write contract. It is a **specialization**, exactly as an ADR-004 Session sub-type specializes the Session supertype.
- **BR-3 (the review engine is the kind's extension, not a registry).** Knowledge keeps owning the study-method-specific machinery — `review_curves`, `method_bindings`, `review_events`, mastery derivation (KN-10). These are the **`study_method`-kind's specialization** layered on the generic capability, **not** a registry. Knowledge owns the *engine*; the *foundation* owns the *registry*.
- **BR-4 (`study_methods` is a kind-partition, never a parallel base table).** A study-method service **is a row in the one capability registry** with `kind='study_method'` (the is-a). "The set of study-method services" is therefore a **kind-partition** (`WHERE kind='study_method'`); a SQL `study_methods` view over it is an optional read-convenience, **not** a second mechanism. No separate `study_methods` base table that could drift.
- **BR-5 (the content unit is data, not a capability).** The *reviewable* (a flashcard, an assessment item) is the **content entity the capability owns** — it is **not itself a capability**. "A flashcard *method* is a capability" ≠ "every flashcard is a capability." (Guards the anatomy-part-1 conflation.)
- **BR-6 (one authoring chokepoint; ADR-010 for *user-authored* only).** Because there is one registry, there is one authoring path — no separate Knowledge-side one. **Shipped** study-methods (all of them today, incl. Flashcards) are **code-registered/trusted** like any shipped capability — ADR-010 does not run for them (ADR-008 §3.5). **User-authored** study-methods, if ever, ride the **same single ADR-010 chokepoint** as every other user-authored capability.
- **BR-7 (no ownership regression — Knowledge still owns the seam-as-experienced).** Unifying the registry does **not** strip Knowledge of the study-method domain: Knowledge owns the engine, the mastery model, and the user-facing "study methods" surface. The change is *where the registration record lives* (the foundation registry), not *who owns study methods*.

---

## §3. Design — the mechanism (`[DECISION]`, direction D2=A ratified)

### Part 0 — The anatomy crosswalk (grounds the is-a; this is what makes D2=A true, not asserted)

The is-a only holds if ADR-005's whole model — its **six parts _plus_ its `role` axis** (retention/gathering, which ADR-005 §6 L108 names as one of the three things a service *is expressed as*: `content unit + role + bindings`) — actually *lands* on ADR-008's model. Not all of it maps to a *positional* ADR-008 part; the crosswalk resolves **every** ADR-005 concept, positional or not, and is honest where a mapping needs a mechanism ADR-008 doesn't already have. This table goes into ADR-008 §3.3 (or an appendix) so no reader takes the is-a on faith:

| ADR-005 study-method concept | Maps to ADR-008 capability model | Resolution |
|---|---|---|
| 1. Content unit (reviewable) | *data the capability owns* (its content table) + config (part 2) | **BR-5** — the card is owned data, **not** a capability; the *method* is the capability |
| 2. **Run surface = a Session sub-type** | part 5 **"drives a Session"** (when timed/measurable) | Same axis: a drill *is* the capability driving a `review_session` (ADR-004). No conflict — 005's "run surface" = 008's "drives a Session" |
| 3. Registration (`study_methods`) | part 1 **identity/kind** — registers as `kind=study_method` | The registration record moves to the one registry; the **curve/level binding** (`method_bindings`, KN-8) is the *kind's review-engine extension* (BR-3), not part of registration |
| **`role` axis** (retention · gathering · …) | part 2 **config / declared kind-metadata** — a `kind=study_method` capability declares `roles: retention\|gathering\|…` | **B1** — role is a **kind-declared config field**, not a positional part; ADR-008's open registry already carries kind-specific config (§3.3 part 2). Named here so ADR-005 §6's "content unit + role + bindings" test lands |
| 4a. **Gather — write** (create content units) | part 5 **emitted-signals** — a §3.2.5 guarded write to its own content table | Clean: the create *is* the capability write contract (F1) applied to content creation |
| 4b. **Gather — read from OS sources** (Book quotes, notes) | **NOT** part-3's bound-scoped read (which sees "only what it is bound to", ADR-008 §3.3 part 3) | **B3** — gather reaches *across* to unbound sources, so it is a **user-initiated source pick** (the user chooses the book/note = a selection/consent act), a distinct read channel from the runtime bound read. *This is a mechanism to name, not "no new mechanism."* Tracked for build |
| 5. Emitted signals (`review_events`) | **own-domain content write** (to Knowledge's `review_events`), **not** a §3.2.5 cross-module effect | **B4** — writing a `review_event` is the review-session's own-domain output (BR-5-like), governed by Knowledge. Its *downstream cross-module effects* — `emit_measurement_signal` (→ Education mastery), `award_xp`, `log_time`, `surface_journal` — **ride ADR-004 §3.2.5** (already in the §3.2.2 catalogue). N3 restated: effects ride §3.2.5; the `review_event` row itself is an own-domain write |
| 6. Universal properties | part 6 **universal properties** | Identical (tags · `entity_links` · attachments) |
| *(none — 005 didn't have it)* | part 4 **render targets** (`inline`/`standalone`) | **B5 — inherited *eligibility*, not a delivered gain.** As a capability, a study-method *may* declare render-targets; **whether/where a drill renders as a placed instance (page-doc node vs `block_instances`) is F3/O2 — not decided here.** F2 grants the capacity; F3 owns the placement |

**Layering check (N2).** Knowledge (a **feature** module) registering into the capability registry (a **foundation**, beneath N&P per ADR-006/008) is a **legal downward** dependency (feature → foundation). The reverse (foundation depending on Knowledge) would be the inversion — and does not occur: the review *engine* stays in Knowledge (BR-3); only the *registration record* lives in the foundation. This is what makes "foundation owns the registry" safe rather than an ownership grab.

### Part A — State the boundary in ADR-008 (the registry owner)

1. **§3.1 — upgrade analogy → unification.** Rewrite the parenthetical *"(like Knowledge's `study_methods`, ADR-005)"* into a **boundary statement**: the capability registry is the **single canonical composability registry** — the **supertype** for every pluggable unit that drives a Session + owns Effects. **Knowledge's `study_methods` (ADR-005) is not a parallel registry; it is a typed specialization (`kind=study_method`) of this one** (BR-1/BR-2). The study-method-specific machinery (curve, binding, review_events, mastery) is that kind's extension (BR-3), exactly as ADR-004 Session sub-types extend the Session supertype.
2. **§3.3 — frame the "mirrors ADR-005" line as is-a + embed the Part-0 crosswalk.** The 6-part anatomy doesn't merely *resemble* ADR-005's; a study-method service **instantiates** it as `kind=study_method`. Insert the **Part-0 crosswalk table verbatim** here (or as a short appendix ADR-008 references) so the is-a is *shown*, not asserted — including its honest edges: 005's "run surface = Session" = 008's "drives a Session"; the `role` axis = kind-config; `gather`'s *write* rides §3.2.5 while its *cross-source read* is a user-initiated **source pick** (unbound, tracked-for-build, B3); `review_events` is an own-domain write whose *downstream* effects ride §3.2.5 (B4); render-targets are inherited **eligibility**, placement deferred to F3 (B5).
3. **§4 Option C — generalize the rejection.** Extend the "two registries (REJECTED)" note: the same "one registry, not two" principle **also folds in the ADR-005 `study_methods` case** — not just editor-blocks-vs-widgets. One registry, N render surfaces, N kinds.
4. **Builds-on header — restate the ADR-005 relationship** from "the 6-part plugin anatomy" to "…which this registry **subsumes**: `study_methods` is a `kind` of this registry (F2/D2)."

### Part B — Amend ADR-005 (the now-specialized registry)

1. **§3.1 part 3 (Registration) — split registration from binding.** Registration moves to the **capability registry** (foundation) as `kind=study_method`; the **binding to a knowledge object + curve** (`method_bindings`, KN-8) stays Knowledge's review-engine specialization. Reword: *"registers as a capability of `kind=study_method` in the OS capability registry (ADR-008); the user then binds it (`method_bindings`) to any knowledge object/container, choosing a curve (KN-8) — the review-engine specialization of the `study_method` kind."*
2. **Amends/header — add "Amended by ADR-008 (F2/D2)"** noting `study_methods` is now a typed specialization of the capability registry, not a Knowledge-owned parallel registry. Knowledge continues to own the review **engine** (BR-3/BR-7).
3. **§1 Summary + §3.2 — one clause each** that the "seam" the study-method plugs into **is** the capability registry (the review engine remains Knowledge's). No change to the retire-decisions (`flashcard_decks`/SM-2/`flashcard_reviews`) — those are unaffected.
4. **§6 Review trigger — unchanged** (still: reconsider when assessments, the second service, is documented). Add one line: assessments is now *also* the test of "does the `study_method` kind hold as a capability specialization."

### Part C — Constitution reconciliation (business-rules)

1. **`[DECISION D2-a — RATIFIED]`** — add a **reconciliation sub-note under PC-2** (mirroring the INT-1a precedent under INT-1, where ADR-006 moved primitive *ownership* down a tier): *"PC-2a (ADR-005↔008 reconciliation, F2/D2) — there is one composability registry (the capability registry, ADR-008). ADR-005's `study_methods` is a typed specialization (`kind=study_method`), not a parallel registry; Knowledge owns the review engine, the foundation owns the registry."*
   - **Why the sub-note, not a standalone PC-5:** this is a *reconciliation of two existing ADRs* — the exact situation INT-1a handled with a sub-note; minting a full invariant for a boundary-clarification is invariant-sprawl.
2. Add a Change Log row.

### Part D — Owed-tables ledger (edit the *report* — the authoritative ledger; NOT ADR-002's body)

The authoritative owed-tables ledger lives in **the report** (`docs/reviews/2026-07-15-adr-critique-gate.md` §"Owed-tables ledger", the "From 005"/"From 008" lines). ADR-002's header only **points** at it (F4-header, last session) — so F2 edits the **report's** ledger, and touches ADR-002 not at all. The report's line currently reads (From 005): *"ADD generic engine tables (`study_methods`, `review_curves`, `method_bindings`, `review_events`)."* Under D2=A this is **stale**:
1. **Reconcile the report's "From 005" line:** `study_methods` is **no longer a standalone base table** — it is a **kind-partition of the capability registry** (`kind='study_method'`; owed from 008, BR-4). The other three (`review_curves` · `method_bindings` · `review_events`) **remain** Knowledge review-engine tables (the kind's extension, BR-3).
2. **Annotate the report's "From 008" line** (*"capability registry table(s) + `block_instances`"*): the registry's **`kind` column** carries `study_method` among others, so the study-method partition needs no new table.
3. **No edit to ADR-002** (body *or* header) — the header already points at the report ledger; no DDL, respecting D5. Ledger-note reconciliation only, in the report.

### Part E — Feature-doc cites (the F1 feature-cite discipline — ground the definition, let leaves inherit)

1. **Reground the two *definitional* statements** so they don't contradict the new ADR boundary:
   - `docs/features/knowledge/contract.md:60` — *"Knowledge's `study_methods` registry is that seam"* → *"Knowledge's `study_methods` — a typed specialization (`kind=study_method`) of the OS capability registry (ADR-008) — is that seam; Knowledge owns the review engine behind it."*
   - `docs/features/knowledge/structure-data.md:38` — *"`study_methods` | pluggable method registry"* → *"`study_methods` | kind-partition of the capability registry (`kind=study_method`); the review engine (curves/bindings/events) is Knowledge's."*
2. **`[B2 — the second chokepoint the first draft missed]` Reground the Knowledge API surface.** `docs/features/knowledge/contract.md:28` exposes `registerMethod(spec)` / `listMethods()` (⚠ INTENDED) — a **Knowledge-side registration entry point**. Under D2=A (BR-1/BR-6) this must not be a *second* registry. Reground it as **thin pass-throughs to the one capability registry**: `registerMethod(spec)` = "register a `kind=study_method` capability" (delegates to the foundation registry); `listMethods()` = "the `kind='study_method'` partition read." Note explicitly that these are convenience wrappers over the single registry, not a parallel store.
3. **Leaf cites stay + inherit.** The flashcard cites (*"registers in Knowledge's `study_methods`"* — `flashcards/contract.md:13,24`, `conventions.md:12`, `identity.md:8,50`, `structure-data.md:32`) remain accurate under the kind-partition model (registering a `kind=study_method` capability *is* appearing in `study_methods`). Do **not** rewrite them (F1-B4 discipline). **`[B6]`** their accuracy is contingent on `study_methods` staying a *queryable name* (the kind-partition read / optional view) — tracked in the owed-ledger so a build that skips the view doesn't silently orphan five leaf cites.
4. **Verify grep** (`docs/features/**` + `packages/`) confirms no doc/code still frames `study_methods` as a *standalone/parallel* registry **and** catches registration *verbs* not just the noun: grep `registerMethod|listMethods|study_methods.*registr|registr.*study_method` — every hit must route through the one registry (B2: the noun-only grep would have passed while `registerMethod` stood as a second chokepoint).

### Part F — Seam to F3 (do NOT do F3's work here)

O2 (`spaces.enabled_blocks` ↔ `block_instances`) is **F3/D3** — the *instance/placement* model. F2 touches only the **registry (definitions)** boundary vs `study_methods`. Note the adjacency in ADR-008 (§3.3 already references `block_instances`); **no edit to the instance model in F2.**

---

## §4. Acceptance

- [ ] **The Part-0 anatomy crosswalk is in ADR-008** (§3.3 or referenced appendix) and resolves **every ADR-005 concept — the six parts _and_ the `role` axis (B1)** — so ADR-005 §6's "content unit + role + bindings" test lands. It is **honest where a mapping needs a mechanism**: `gather`'s cross-source read = a user-initiated source pick, *not* "no new mechanism" (B3); `review_events` = an own-domain write whose *downstream effects* ride §3.2.5 (B4); render-targets = inherited **eligibility**, placement deferred to F3 (B5). **A skeptical reader can verify D2=A from the table alone** — including that it doesn't over-claim.
- [ ] **B2:** `knowledge/contract.md:28` (`registerMethod`/`listMethods`) is regrounded as thin pass-throughs to the one registry; the Verify grep catches registration **verbs** (`registerMethod|listMethods`), not just the noun "registry" — no second registration chokepoint survives.
- [ ] ADR-008 §3.1 states the boundary: **one capability registry (supertype); `study_methods` is a `kind`-specialization (is-a), not a parallel registry** — a reader cannot come away thinking two registries coexist.
- [ ] ADR-008 §4 Option-C rejection **generalized** to cover the ADR-005 case (not just editor-vs-widget).
- [ ] The **layering check (N2)** is stated: Knowledge→capability-registry is a legal feature→foundation dependency; the review engine stays in Knowledge.
- [ ] ADR-005 §3.1 part 3 **splits registration (→ capability registry) from binding (→ Knowledge review engine)**; header carries "Amended by ADR-008 (F2/D2)"; the retire-decisions are untouched.
- [ ] The **review engine stays Knowledge's** (BR-3/BR-7) — no doc implies unifying the registry stripped Knowledge of curves/mastery/study-method ownership.
- [ ] **BR-5 is explicit somewhere authoritative** (ADR-005 or ADR-008): the reviewable/content-unit is *data the capability owns*, **not** itself a capability. No "every flashcard is a capability" reading survives.
- [ ] Constitution carries the reconciliation as a **PC-2a sub-note** under PC-2 (D2-a ratified) + a Change Log row; INT-1a/INT-2 untouched.
- [ ] The **report's** owed-ledger **reconciled** (NOT ADR-002): `study_methods` = kind-partition (not a base table); `review_curves`/`method_bindings`/`review_events` remain; ADR-002 untouched (its header already points at the report); **no DDL** (D5).
- [ ] **E:** the two definitional feature cites regrounded + the `registerMethod`/`listMethods` API surface (B2); leaf cites left inheriting, their view-contingency noted (B6); the Verify grep (verbs + noun) shows no lingering *standalone/parallel-registry* framing at any tier.
- [ ] **F2 does not touch ADR-006 or the instance model** (that is F3); the F2↔F3 seam is noted, not crossed.
- [ ] Zero code changed; build-time items tracked in the owed-ledger, not built: the `study_methods` kind-partition/view, the registry `kind` column, **and the gather source-pick read channel (B3)** — a user-initiated source selection distinct from part-3 bound reads.

## §5. Implementation prompt (after Approval 2)

Edit, in order: (1) **ADR-008** — insert the **Part-0 crosswalk** at §3.3; §3.1 analogy→unification (supertype + `kind=study_method` specialization); §3.3 "mirrors"→is-a; §4 Option-C generalized; Builds-on restated (subsumes ADR-005); state the N2 layering check. (2) **ADR-005** — §3.1 part 3 split registration (→capability registry)/binding (→review engine); header "Amended by ADR-008 (F2/D2)"; §1/§3.2 one-clause "seam = capability registry"; §6 assessments-also-tests-the-kind line; add BR-5 content-unit-is-data clause. (3) **business-rules** — add the **PC-2a sub-note** under PC-2 (D2-a) + Change Log row. (4) **report** — reconcile the owed-ledger "From 005"/"From 008" lines (`study_methods`→kind-partition; others remain) **— ADR-002 not touched**. (5) **feature docs** — reground `knowledge/contract.md:60` + `structure-data.md:38` + `contract.md:28` (`registerMethod`/`listMethods` → pass-throughs, B2); note leaf-cite view-contingency (B6); leave the flashcard leaves. (6) **report** — tick F2 in the resolution log. Then **Verify**: grep `docs/**` + `packages/` for `registerMethod|listMethods|study_methods` framed as a standalone/parallel registry (verbs + noun, B2); confirm no doc/API at any tier presents two registries; confirm the review engine still reads as Knowledge-owned.

---

## §6. Decisions (Approval 1 — RATIFIED by Victor 2026-07-16)
- **D2 (direction)** ✅ — option **(A)**: one registry; `study_method` = kind-specialization (is-a).
- **D2-a** ✅ — constitution home = **PC-2a reconciliation sub-note** under PC-2 (INT-1a precedent); **not** a standalone PC-5. The "PC-5" branch is dropped from §3/§4/§5.

## §7. Status — gate 1 (spec) · both critiques run · Approval 1 ✅ · pre-Approval-2
- **/critique #1 (design-director + principal-engineer):** REVISE → closed. **R1** (added Part-0 crosswalk), **R2** (owed-ledger → *report*, ADR-002 untouched), **R3** (BR-6 scoped to user-authored). NITs **N1** (BR-4 kind-partition primary), **N2** (layering check), **N3** (`review_events`/§3.2.5 — later *refined by B4*: the row is own-domain, only its downstream effects ride §3.2.5).
- **Approval 1** ✅ (Victor 2026-07-16) — D2=A + D2-a=PC-2a sub-note ratified.
- **/preflight + independent adversarial critique** (subagent, prompted to *refute* the is-a): the is-a **survived** (verified against ADR-004 supertype/sub-type + INT-1a layering precedent), but **6 findings**, all closed:
  - **B1** 🔴 — crosswalk dropped ADR-005's **`role` axis** (retention/gathering; §6's "content unit + role + bindings" test) → added a `role → part-2 config/kind-metadata` row + widened acceptance. *(verified vs source: ADR-005 L49/L76/L93/L108, flashcards/contract.md:13)*
  - **B2** 🔴 — `knowledge/contract.md:28` `registerMethod`/`listMethods` = a **second registration chokepoint** the noun-only grep missed → added to Part E as pass-throughs; Verify grep now catches **verbs**. *(verified vs source)*
  - **B3** 🟡 — `gather`'s cross-source read is **unbound** (not part-3 scoped) → reframed as a user-initiated **source pick** (a named build mechanism, not "no new mechanism").
  - **B4** 🟡 — `review_events` is an **own-domain write**, not a §3.2.5 effect; its *downstream* effects (`emit_measurement_signal`, `award_xp`, …) ride §3.2.5 → crosswalk row corrected.
  - **B5** 🟡 — render-targets = inherited **eligibility**, not a delivered gain; **placement is F3/O2** → row + BR-2 + §1 downgraded, Part F boundary kept honest.
  - **B6** ⚪ — leaf-cite accuracy is **contingent on the `study_methods` name staying queryable** → noted + tracked in owed-ledger.
- → ready for **Approval 2** (cleared to implement).
- **Final /critique + /preflight (Victor-requested gate):** /critique = SHIP after closing 3 internal-drift items (Part A.2 stale summary, D2-a label, Part E "B4" ambiguity); /preflight = PASSED (all 6 layers targeted + source-cited).

## §8. Status — IMPLEMENTED + VERIFIED 2026-07-16
6-step edit applied: **ADR-008** (§3.1 unification · §3.3 is-a · **§3.3a anatomy crosswalk** + N2 layering · §4 Option-C generalized · Builds-on subsumes 005) · **ADR-005** (§3.1(3) registration/binding split · Amended-by header · §1/§3.2/§3.1(1) clauses · §6 kind-test) · **business-rules** (PC-2a sub-note + Change Log) · **report** (owed-ledger From-005/008 reconciled; F2 ticked in resolution log) · **feature docs** (`knowledge/contract.md:28`+`:60`, `structure-data.md:38` regrounded; flashcard leaves inherit). **Verify grep PASS** (verbs + noun): no unqualified parallel-registry framing at any tier; `registerMethod`/`listMethods` regrounded; review engine still Knowledge-owned. One leaf left by design (`journals/contract.md:14` = provider-registration pattern, F11 axis, not the capability registry). **ADR-002 untouched (D5); zero code.** Build-tracked: `study_methods` kind-partition/view, registry `kind` column, **gather source-pick read channel (B3)**.
