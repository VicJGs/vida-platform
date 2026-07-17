# PLAN — F3/D3: `spaces.enabled_blocks` ↔ `block_instances` (O2)

- **Unit:** ADR revision (doc-only; foundation profile; LITE gate + full §XXVI adversarial pass, per F1/F2 precedent)
- **Fix:** F3 (report `docs/reviews/2026-07-15-adr-critique-gate.md` §Unified Fix Menu) — resolve the dangling
  forward-reference between ADR-006's `spaces.enabled_blocks` and ADR-008's `block_instances`.
- **Decision:** D3 (report §The 7 decisions).
- **Sources loaded (ground truth):** the report (throughline ③/O2 · L58 · D3 L104 · owed-ledger L37-44 · sync note
  L71) · ADR-006 §3.3/§3.4 · ADR-008 §3.1/§3.3/§3.4/data-model/§4-Option-C/§5/§6 · ADR-009 §3.1 + capability-config
  invariant · ADR-007 (checked: no `block_instances` ref) · `docs/intake/spaces.md` SP4/SP5/SP6 · `docs/core/spaces/README.md`.
- **Scope guard:** F3 is the **instance/placement** seam (F2 handed it here explicitly, F2 PLAN §F). It touches
  ADR-006 + ADR-008 (+ light cross-ref in ADR-009, README, report ledger). It does **not** re-open the dual-target
  *rendering* internals (still deferred to "the first dual-target capability", ADR-008 §6) and does **not** write DDL
  into the stale ADR-002 body (D5).

---

## §1. Context — the gap (grounded, not paraphrased)

O2, verbatim from the whole-set gate (report L58):

> ADR-006 §3.4 puts `enabled_blocks` on the `spaces` row (ADR-006:L101, "→ ADR-008"); ADR-008 defines
> `block_instances` (L92-94) and never mentions `enabled_blocks`. Undefined in both directions — dangling
> forward-reference.

The two current texts:

- **ADR-006 §3.4** (L98-103): a `spaces` row binds `{ id · root_tag_id · name[E] · icon · default_view_id?(→007) ·
  enabled_blocks (→ ADR-008) · parent_space_id? }`; its "*identity, name, and **enabled tooling** are the record*."
  So `enabled_blocks` = the Space's **enabled tooling** — but the forward-ref "→ ADR-008" points at a concept
  ADR-008 never defines.
- **ADR-008 data-model** (L119-124): the **registry** holds capability *definitions*; an **instance** = a placed
  capability. `inline` instance → page-doc editor node (Yjs, no table); `standalone` instance → a `block_instances`
  row **"referenced by a Space/view"**. ADR-008 **never names `enabled_blocks`** — the back-direction of the same
  dangling ref, and "referenced by a Space" is asserted with no reciprocal definition of *how* a Space references.

**The semantic fork D3 must settle:** is `enabled_blocks` an **authored allow-list / palette** (which capability
kinds a Space *offers* as tooling) or a **derived placement-summary** (the distinct kinds among a Space's placed
`block_instances`)? The report offers both ("allow-list … or drop `enabled_blocks` as derivable", L104).

**The intake settles it — two airtight `[FACT]` legs (B1: SP4 is *not* a third — see below):**
1. **SP6** (`intake/spaces.md` L10-11): *"A **Space** = { root tag (membership) · Views (surfaces) · its enabled
   **Blocks** (tools) · name/… }"* — enabled Blocks are a **first-class constituent** of a Space, alongside Views.
2. **SP5 + ADR-009** (`ADR-009` §3.1 L46-47): a Template bundle serializes `{ root_tag · seed entities · views ·
   **enabled capabilities + their config** (ADR-008) · child Space structure }`, and the **Capability-config
   invariant** (ADR-009 §3.1) treats that set as **authored configuration**. A freshly-forked template Space
   therefore carries an enabled-capability set **with zero placements** → cannot be a projection of `block_instances`.

**`[inference, not FACT]` (B1 correction):** SP4 (intake L113-122) says only that a *Block declares which render
targets it supports* — it does **not** say a Space "offers a subset" or use palette/curation language (a grep of the
intake for `offer|subset|curat|palette|allow-list` in this sense returns nothing). The "Space offers a palette" is my
**inference from SP6** (enabled Blocks are a Space constituent), *not* sourced intake text. It is therefore **not** an
independent third leg — the grounding is two-legged (SP6 + SP5/ADR-009), and that is enough.

**Conclusion (`[DECISION]`, D3):** keep both, **distinct**. `enabled_blocks` = the Space's authored capability
**allow-list / palette**; `block_instances` = the actual **placements**. Reject "drop as derivable" — it breaks the
template model (ADR-009) and the SP6 Space definition. This is the report's first D3 branch, now *grounded* rather
than recommended.

**Terminology note (`[FACT]`):** ADR-006's `enabled_blocks` and ADR-009's "enabled capabilities + their config" are
**the same concept** under two names. The fix unifies them (they refer to one allow-list).

---

## §2. Invariants this unit must satisfy (business rules)

- **BR-1 (distinctness).** `enabled_blocks` (a Space's offered-capability set — a set of capability **definition**
  refs, the registrable unit per ADR-008 §3.1; `kind` is queryable metadata, not the ref granularity — **R3**) and
  `block_instances` (placed standalone instances) are **distinct primitives** — one is the *menu*, the other the
  *placements*. Stated in **both** ADR-006 and ADR-008; no reader can conflate them.
- **BR-1a (render-target-agnostic membership; the user chooses the form per instance — R1, Victor).** `enabled_blocks`
  offers capabilities **regardless of render target**. Each offered definition carries its own ADR-008 §3.2 declared
  targets (`inline` and/or `standalone`); **per instance the user chooses the form** — an `inline` block inside a page
  or a `standalone` widget on the Space surface ("as a type"). This is ADR-008 §3.2's existing per-instance placement
  choice, not new mechanism.
- **BR-1b (the palette's teeth differ by surface — B2).** "Offering" is not toothless. Enforcement splits by render
  target because the two surfaces have different conflict profiles:
  - **Standalone (Space surface):** a widget lives on **one** Space's surface — no multi-Space ambiguity — so
    `enabled_blocks` **is** the authoritative add-menu for that surface. **A `standalone` placement (`block_instances`)
    on a Space is drawn from that Space's `enabled_blocks`** (real teeth). *This is the concrete thing the field does.*
  - **Inline (page slash-menu):** a page can carry tags of **multiple** Spaces, so here the palette is **additive /
    non-restrictive** — the slash-menu surfaces the **union** of the page's Spaces' offered capabilities + the global
    editor base. No "which palette wins" conflict; the global editor is never per-Space-gated.
- **BR-2 (stored authored state, not a query-time projection — B3).** `enabled_blocks` is **stored authored
  configuration**, part of the Space's identity record (SP6) and carried by templates (SP5/ADR-009). It is **not a
  query-time projection over `block_instances`** — a forked template Space persists the set with **zero** placements,
  so no projection over placements can reconstruct it. (Persisting a template seed *is* storing the field — that is
  the authored-state reading, not a derivation.)
- **BR-3 (placement drawn from the palette at add-time; curation ≠ lifecycle — R2).** Adding a capability to a Space
  draws from that Space's `enabled_blocks` (per BR-1b: enforced for standalone, additive for inline). Curating the
  palette (removing a capability) governs the **menu of what can be added**, and does **not** force-delete existing
  placements (`block_instances` or inline nodes) — placed instances are **grandfathered**. The palette gates *adding*,
  not the *lifecycle* of what is already placed.
- **BR-4 (both directions land).** After the fix, ADR-006's `enabled_blocks (→ ADR-008)` resolves (008 reciprocally
  names it) **and** ADR-008 mentions `enabled_blocks` — the dangling forward-reference is closed on both sides.
- **BR-5 (sync-robust representation — respect the ADR-006 §3.3 precedent, but hand the storage strategy to F10).**
  `enabled_blocks` is a **set of capability references**, best carried **row-based** (a Space↔capability-def
  junction) — the same reason ADR-006 §3.3 stored `entity_tags` as rows: rows survive concurrent multi-device edits,
  whereas a JSON-array column on the `spaces` row reintroduces the field-LWW clobber hazard (report L71). F3 records
  the **lean** and the **rationale**; the exact sync/storage strategy for Spaces' ordered fields is **F10's turf**
  (report L91) and the DDL is **build-phase** (D5). No storage religion is forced into the decision.
- **BR-6 (no ADR-002 body edit; no code).** Per D5 the amendment stays deferred; F3 reconciles only the **report's**
  owed-ledger + the README table. Zero code.
- **BR-7 (seam honored from the other side).** F3 does not re-open the dual-target *rendering* model (deferred to the
  first dual-target capability, ADR-008 §6); it settles only the *allow-list vs placement* representation O2 named.

---

## §3. Design — the mechanism (`[DECISION]`, direction D3 = keep-both-distinct)

### Part A — Close the ref in ADR-006 §3.4 (the Space owner)
Clarify `enabled_blocks` in the `spaces` binding: it is the Space's **enabled-capability set** — *which registry
capabilities (ADR-008) this Space offers as tools* — i.e. the "enabled tooling" already named in the record. State
it is **stored authored config** (SP6 constituent; carried by templates, ADR-009), **distinct from** ADR-008's
`block_instances` (placements), and **not a query-time projection over them** (B3). It is a **set of capability
definition refs** (the registrable unit, ADR-008 §3.1 — **R3**), **render-target-agnostic in membership** (each
offered definition carries its own `inline`/`standalone` targets; the user chooses the form per instance, ADR-008
§3.2 — **R1**). State the **teeth-by-surface** rule (B2): the palette is the authoritative add-menu for the Space's
**standalone** surface; for **inline** it contributes additively to the page slash-menu (union with the global base),
not a restriction. Note the storage is a set of refs (lean row-based per §3.3's sync-robustness rationale; strategy →
F10; DDL @ build). Keep the "→ ADR-008" forward-ref — it now lands.

### Part B — Reciprocate in ADR-008 §3.4 / data-model (the registry owner)
Add the missing half: name the Space's **`enabled_blocks`** as the *per-Space set of capability **definitions** the
Space offers* (the palette, owned by ADR-006's `spaces`; **R3** — definitions, not kinds). State the **teeth-by-surface
placement rule (B2 + R2):** a **standalone** placement (`block_instances`) on a Space is **drawn from that Space's
`enabled_blocks`** (the palette is the surface's add-menu — enforced, this is what the field concretely *does*); an
**inline** placement (page-doc node) is chosen additively from the union of the page's Spaces' offered capabilities +
the global editor base (non-restrictive — a page can belong to several Spaces). Whether a capability renders `inline`
or `standalone` is the §3.2 per-instance choice (**R1**). Curating the palette gates *adding*, **not** the lifecycle
of existing placements (grandfathered — **R2**). This is what makes ADR-008's "a `block_instances` row referenced by a
Space" concrete. **Strike/soften the "/view" in the L123 phrase itself** (B4-nit — change the source string, not just
annotate): reference "a Space"; the **view**-placement half is not corroborated by ADR-007 (verified: ADR-007 defines
`filter × layout × grouping` over read APIs — no widget-placement slot), so flag it as an open build seam, do not
invent it.

### Part C — Terminology unification (ADR-009, light)
One clause so the naming is unified: ADR-009's **"enabled capabilities + their config"** = the Space's
**`enabled_blocks`** set being forked (ADR-006). No structural change to ADR-009 — it already treats the set as
authored (Capability-config invariant); this only ties the two names together so the whole set reads as one concept.

### Part D — Owed-tables ledger (edit the *report* — NOT ADR-002's body)
Reconcile the report's owed-ledger:
- **From 006:** add the **enabled-capability set** storage (a Space↔capability-def junction, e.g.
  `space_enabled_blocks`; row-based lean per BR-5; references ADR-008 registry defs; DDL @ build, strategy → F10).
- **From 008:** keep `block_instances` = *placements* (clarify vs the 006 palette so the two ledger lines don't read
  as the same table).
ADR-002 body untouched; its header already points at this ledger (F4-header, done).

### Part E — README consistency (two spots — B5)
`docs/core/spaces/README.md`: (1) **L44** lists the ADR-002-amendment table set (`entity_tags · views · spaces ·
block_instances · …`) → add the **enabled-capability junction** so the front-door list matches the ledger; (2)
**L10** ("What a Space is") says "enabled capability **Blocks (tools)**" → one-clause align so the front-door
definition uses the same vocabulary the ADRs now settle (the Space's `enabled_blocks` palette of capability
definitions). Both, so the README does not drift from the clarified ADRs (B5).

### Part F — Business-rules assessment (explicit: NO new PC — B6 argument, corrected)
No new constitution invariant — but the *reason* is the enforcement **scope**, not "the field has no teeth" (B2 gave
it teeth). The enforced rule ("a standalone placement on a Space is drawn from that Space's `enabled_blocks`") is
**subsystem-local** — it governs the Spaces/capability-placement surface only. A **PC** is a constitution invariant
**every level inherits** (ZK, single-user, guarded-write, PC-2a's *single capability registry* which every
capability-bearing module obeys). BR-1b's placement rule is not inherited by Tasks/Finance/Health/etc.; it is an
ADR-006/008-local contract. That is the real distinction from F2's PC-2a (a platform-wide registry unification), and
it is now **argued, not asserted** (B6). BR-1…BR-3 live in ADR-006/008. No `business-rules.md` edit (no PC changed).

---

## §4. Acceptance

- [ ] **Both directions of the dangling ref are closed:** ADR-006 §3.4's `enabled_blocks (→ ADR-008)` now lands
      (ADR-008 reciprocally names `enabled_blocks`), **and** ADR-008 — which never mentioned it — now defines it. A
      grep for `enabled_blocks` hits **both** ADRs with a coherent, mutually-referencing definition.
- [ ] **BR-1 distinctness is stated in BOTH ADRs:** `enabled_blocks` = the Space's offered-capability **palette**;
      `block_instances` = the **placements**. Neither ADR lets a reader conflate menu with placements.
- [ ] **BR-1a render model (R1):** both ADRs state `enabled_blocks` is **render-target-agnostic in membership** (a
      definition's `inline`/`standalone` targets + the per-instance form choice are ADR-008 §3.2's job).
- [ ] **BR-1b teeth-by-surface (B2)** is stated in ADR-008: a **standalone** placement (`block_instances`) is **drawn
      from** the Space's `enabled_blocks` (the palette is the surface add-menu — the concrete thing the field does);
      **inline** is additive (page slash-menu = union of the page's Spaces' offered caps + global base), non-restrictive.
      A reader can name what `enabled_blocks` *does* — it is not a cosmetic list.
- [ ] **R3 granularity:** `enabled_blocks` is stated as a set of capability **definition** refs (registrable unit,
      ADR-008 §3.1); `kind` is metadata, not the ref granularity — no "enable a kind" ambiguity survives.
- [ ] **BR-2 stored-not-projected (B3):** the text states `enabled_blocks` is **stored authored state, not a
      query-time projection over `block_instances`**, grounded on the forked-template case (persisted set, zero
      placements). The weaker/refutable "not derivable" phrasing does not survive.
- [ ] **B1 honesty:** the SP4 citation is marked `[inference, not FACT]` (it supports render-target *declaration*
      only); the grounding is explicitly **two-legged (SP6 + SP5/ADR-009)**, not a padded three.
- [ ] **BR-3 add-from-palette (R2)** is stated in ADR-008: adding a capability to a Space draws from its
      `enabled_blocks`; curating the palette gates *adding* and does **not** force-delete existing placements
      (grandfathered). No hard cascade-delete invariant survives.
- [ ] **BR-5 representation:** `enabled_blocks` is described as a **set of capability refs**, row-based lean with the
      **ADR-006 §3.3 sync-robustness rationale** cited, the storage strategy **handed to F10** (report L91), DDL
      deferred to build. F3 does **not** force a JSON-vs-junction religion into the decision, and does **not** cross
      into F10's sync-strategy turf beyond stating the lean + why.
- [ ] **Terminology unified:** ADR-009's "enabled capabilities + their config" is tied to ADR-006's `enabled_blocks`
      (same concept, two names) — the set reads as one thing.
- [ ] **"referenced by a Space/view" reconciled:** ADR-008 references a **Space** concretely (via `enabled_blocks` +
      placement); the **view**-placement claim is flagged as an open build seam (ADR-007 doesn't corroborate it), not
      left as an unbacked assertion and not invented.
- [ ] **BR-6:** the **report's** owed-ledger is reconciled (enabled-capability junction under 006; `block_instances`
      stays 008, clarified) and `spaces/README.md` **L44 + L10** updated (B5 — table list *and* the front-door
      definition); **ADR-002 body untouched**; **zero code**.
- [ ] **BR-7 / seam:** F3 does **not** touch the dual-target rendering internals (ADR-008 §6 trigger intact) and does
      **not** re-open F2's registry-definition boundary; it settles only the instance/placement representation.
- [ ] **No new PC** (Part F reasoning present); INT-1a/INT-2/PC-2a untouched.
- [ ] **Build items tracked, not built:** the `space_enabled_blocks` junction + `block_instances` table + the
      placement ⊆ palette enforcement point live in the owed-ledger, DDL @ build.

---

## §5. Implementation prompt (after Approval 2)

Edit, in order:
1. **ADR-006 §3.4** — expand the `enabled_blocks` clause per Part A: enabled-capability set = the Space's offered
   tooling (a set of capability **definition** refs, ADR-008, R3), **stored authored config** (SP6/ADR-009),
   **distinct from & not a projection of** `block_instances` (B3); **render-target-agnostic in membership** + the
   **teeth-by-surface** rule (B2 — standalone add-menu enforced, inline additive/union); row-based lean (cite §3.3
   sync-robustness), strategy → F10, DDL @ build. "What this does NOT do" touch: does not fix storage strategy (F10);
   does not gate the global editor's inline blocks (R1/B2).
2. **ADR-008 §3.4 / data-model** — Part B: define the Space's `enabled_blocks` (palette of **definitions**, R3) +
   `block_instances` (standalone placements); state the **teeth-by-surface placement rule** (B2 — standalone drawn
   from the palette; inline additive from the union); curating gates *adding*, not the lifecycle of placed instances
   (grandfathered, R2); the `inline`/`standalone` form is §3.2's per-instance choice (R1). Make "referenced by a
   Space" concrete; **change the L123 source string** — strike/soften "/view" (B4-nit), flag view-placement as an
   open build seam. Add the "menu vs placements" line in **§5 Consequences** for the skeptical reader (N2).
3. **ADR-009 §3.1** — Part C: one clause tying "enabled capabilities + their config" ≡ ADR-006 `enabled_blocks`.
4. **report** — Part D: reconcile owed-ledger "From 006"/"From 008"; then tick **F3** in the Resolution-progress log
   with the D3 decision + the adversarial catches (B1–B6).
5. **`docs/core/spaces/README.md`** — Part E (B5): add the enabled-capability junction to the **L44** amendment list
   **and** align the **L10** front-door definition ("enabled capability Blocks (tools)" → the `enabled_blocks` palette).
Then **Verify** (grep + read): `grep -rn "enabled_blocks\|block_instances\|enabled capabilit" docs/core` shows a
coherent, mutually-referencing definition in **both** 006 and 008 (dangling ref gone both directions); no doc frames
`enabled_blocks` as a projection of placements; the palette-vs-placement distinction + teeth-by-surface appear in both
ADRs; the "/view" string is gone from ADR-008 L123; README L10+L44 aligned; ADR-002 body diff = 0; `packages/` diff = 0.

---

## §6. Decisions (Approval 1 — pending Victor)

- **D3 (direction) — RECOMMEND (A) keep-both-distinct:** `enabled_blocks` = authored offered-capability **palette**;
  `block_instances` = **placements**. **Reject** "drop as derivable" — grounded dead by SP6 (Space constituent) +
  SP5/ADR-009 (template carries the set with zero placements). Report's first D3 branch, now grounded.
- **D3-a — RECOMMEND:** `enabled_blocks` is a **set of capability refs, row-based lean** (ADR-006 §3.3
  sync-robustness precedent); the **sync/storage strategy is F10's**, DDL is build-phase (D5). F3 states the lean +
  rationale, does not cross into F10.
- **D3-b — RECOMMEND:** **no new constitution invariant** (ADR-level representational reconciliation; BR-1…BR-3 live
  in ADR-006/008). Contrast F2's PC-2a (a registry unification, genuinely constitution-level).
- **D3-c — DECIDED (Victor, R1) + REFINED (B2, needs Victor sign-off):** `enabled_blocks` is **render-target-agnostic
  in membership** — a block can be **both** `inline` and `standalone`, and **the user chooses the form per instance**
  ("as a type"), reusing ADR-008 §3.2 (no new mechanism). **Refinement the adversarial critic forced (B2):** "additive,
  not a restriction" would leave the field with no enforced meaning (the global editor base is always in the union), so
  the palette's **teeth split by surface** — it **is** the enforced add-menu for the Space's **standalone** surface
  (`block_instances` drawn from it), while **inline** stays additive/union (non-restrictive, which is what made
  multi-Space pages safe). This *keeps* your render-agnostic + inline-additive intent and *adds* a concrete function
  for standalone. **⚠ Flagging for your Approval-2 sign-off** since it nuances the "not a restriction" you ratified.

## §7. Status
- [x] Spec written (gate 1)
- [x] /critique run → **REVISE (R1/R2/R3)** → all fixed (R1 = Victor's render-agnostic framing; R2 add-time not ⊆;
      R3 definition-granularity); N1/N2 folded
- [x] Approval 1 — **D3 / D3-a / D3-b / D3-c RATIFIED by Victor 2026-07-17**
- [x] /preflight → **PASSED** (4 assumptions surfaced, none blocking; all resolved by ratified direction)
- [x] Independent adversarial critique → **REVISE** → closed: **B1** (SP4 citation demoted to inference; grounding
      now honestly two-legged) · **B2** (teeth-by-surface — standalone enforced, inline additive — the field now has a
      function) · **B3** (BR-2 restated stored-not-projected) · **B5** (README L10 added) · **B4-nit** (strike "/view"
      string) · **B6** (no-PC re-argued as subsystem-local). **B4/B7 held; core keep-both-distinct survived.**
- [x] **Approval 2** — **B2 teeth-by-surface refinement RATIFIED by Victor 2026-07-17**
- [x] **Implement + Verify — DONE 2026-07-17.** 5 doc edits (ADR-006 §3.4 palette paragraph + binding notation ·
      ADR-008 §3.4/data-model reciprocal + "/view" struck + §5 menu≠placements · ADR-009 §3.1 terminology tie ·
      report owed-ledger + F3 resolution entry · `spaces/README.md` L10+L44). **Verify PASS:** dangling ref closed
      both directions; only "projection" hit is the negation; no stray "Space/view"; ADR-002 body + `packages/`
      diff = 0 (D5, zero code). §XXIX N/A (foundation profile, no code module — the ADRs *are* the durable docs).
