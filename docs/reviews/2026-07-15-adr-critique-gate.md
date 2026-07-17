# Critique Gate — ADR-001…010 (whole-set architectural review)

**Date:** 2026-07-15
**Run by:** documentation-blueprint · Verify/critique detour before exec #8 (Purposes & Goals capstone)
**Scope:** All ten ADRs, sequenced — Phase A = ADR-001…005 (base architecture), Phase B = ADR-006…010 (Spaces set), then a holistic cross-ADR pass.
**Method:** One focused reader-critic per ADR (line-cited findings) + human-owned cross-ADR synthesis. Three sharpest technical claims re-verified against source (see §Verified).
**Output mode:** Report + verdict only. **No ADR was edited.** Decisions D1–D7 left to Victor (offline). Any future fix runs its own per-step build gate + `/adr-new` amend flow.

---

## Verdict in one line

The constitution is **architecturally sound in its decisions** but **not yet internally consistent as a set**. All ten ADRs return **REVISE** — zero RETHINK (no core decision is wrong), zero clean SHIP (every document has fixable gaps).

> **✅ RESOLUTION (2026-07-17): the F1–F15 revise pass is COMPLETE.** Every REVISE is resolved through the full §XXVI gate (see § "Resolution progress" + § "Revise pass F1–F15 — COMPLETE" below). The per-ADR verdict table below is the **point-in-time 2026-07-15 record** (kept as the audit trail); the ADRs have since been amended. No 🔴 architectural fix remains; only 🟢 F10–F15 build-phase items are tracked.

## Per-ADR verdicts

| ADR | Verdict | One-line |
|-----|---------|----------|
| 001 tech-stack | REVISE | Stack sound; HKDF drift + mobile-SQLCipher presented-as-decided-but-deferred + Yjs-payload-encryption unstated |
| 002 data-model | REVISE | Complete, coherent v1 schema — but **stale vs every newer ADR** + 3 encryption-vs-query contradictions |
| 003 sync-protocol | REVISE | Sound spine; **wall-clock LWW vs "logical"** + no cross-blob referential ordering + coarse merge gate |
| 004 session-framework | REVISE | Supertype model holds; **Effects/guarded-write never specified** + owed Pomodoro amendment unwritten |
| 005 study-method-service | REVISE | "Keep the seam" clean; **O1 boundary (service vs ADR-008 capability) unaddressed** + "reviewable" undefined |
| 006 spaces/universal-tags | REVISE | Tier-inversion genuinely breaks the cycle; **O2 (`enabled_blocks` vs `block_instances`)** + open-registry has no schema + §3.3 resolution layer deferred |
| 007 saved-views | REVISE | Best ZK/EN-2 handling in the set; **provider seam asserted-reused not shown to carry generic predicates** + views-JSON lost-update |
| 008 capability-block-registry | REVISE | Right calls (open registry, discipline-not-effects); **O1 + O2 unaddressed** + guarded-write mechanism absent for shipped capabilities |
| 009 templates-fork | REVISE (light) | Fork model sound, T1 fix holds (§3.1↔§3.4 consistent); **"ZK-clean by construction" overclaimed** (own text walks it back) |
| 010 capability-authoring-security | REVISE | Exfiltration bound genuine + honest; **enforces a guarded-write/idempotency mechanism that doesn't exist upstream** + S2 wording |

---

## The five throughlines (only the whole-set read reveals these)

### ① ADR-002 has drifted out from under everything built on it 🔴 (spine problem)
Still ships the schema 004/005 retire (flat `study_sessions`, §5.11 planner, `flashcard_decks`/`flashcard_reviews`/SM-2 columns, page-only `tags`+`page_tags`, closed `entity_links` CHECK). Owns **none** of the ~15 tables 004–010 declare it must hold. Its "Amended-by" header names only 004/005 — silent on 003, 006–010. Every Spaces ADR ships *prose field-lists, not DDL*. The "consolidated amendment pending in build phase" is real but **under-scoped**. → The Purposes capstone will reference tables that exist only scattered across ADR prose.

**Owed-tables ledger (declared elsewhere, absent from ADR-002):**
- From **004**: `sessions` spine, per-sub-type extension tables (`reading_sessions`/`class_sessions`/`workout_sessions`/`work_sessions`/`focus_sessions`/redefined `study_sessions`), `planned_blocks`, `session_attachments`. Supersedes flat `study_sessions` (ADR-002:L2522-2553) + §5.11 planner (ADR-002:L2744-2883).
- From **005**: RETIRE `flashcard_decks` (ADR-002:L2625-2650), `flashcard_reviews` (L2690-2710), SM-2 columns on `flashcards` (L2664-2673); ADD review-engine tables (`review_curves`, `method_bindings`, `review_events`). **`study_methods` is NOT a base table (F2/D2): it is the `kind='study_method'` partition of the capability registry (owed from 008), queryable via a kind-partition read / optional view — the leaf cites depend on that name staying queryable.** Note `study_topics` still carries its own SM-2 columns (L2578-2583).
- From **006**: `entity_tags` (retire `page_tags`), `parent_tag_id` on tags, `spaces`; open `entity_links.entity_type` CHECK → registry. **The Space's `enabled_blocks` offered-capability palette (F3/D3) = a Space↔capability-definition junction (e.g. `space_enabled_blocks`), row-based per §3.3 sync-robustness; references the ADR-008 registry defs; storage strategy → F10.**
- From **007**: `views`; retire INTENDED `task_views` + Preferences per-module custom-views store.
- From **008**: capability registry table(s) + `block_instances` (**the standalone *placements* — distinct from 006's `enabled_blocks` *menu*, O2/F3/D3**); amend `editor.ts` closed `BlockType` union. **The registry's `kind` column carries `study_method` among others (F2/D2), so the study-method partition needs no separate table.**
- From **010**: `capability_grants` (+ a **granted-envelope hash** field the TOCTOU delta-check silently depends on).
- From **003**: `_sync_field_ts TEXT` added to every syncable table (unratified cross-ADR schema edit).

### ② The guarded-write / idempotency mechanism never grounds out 🔴 (deepest finding)
Three-ADR delegation chain that never terminates in a spec: **ADR-010 enforces → ADR-008 inherits → ADR-004 §3.2.4 asserts → nobody specifies it.**
- ADR-004 Effects (§3.2.2, L57-60) = a catalogue + a "never a direct table write" rule; §3.2.4 (L64-67) = a "no double-count" *assertion*. No write-API contract, no idempotency mechanism (event-id/dedup ledger), no definition of "documented module write API."
- ADR-008 (L64-70) re-cites the same invariants verbatim as inherited; specifies no mechanism.
- ADR-010 (L73-76, L85) names the "mediated capability API" as the enforcement locus but defers the *how* to build (L108-111), and only for *user-authored* code.

**Consequences:**
- ADR-010 **over-claims** on the corruption threat (L39, L75-76): it can enforce "user code can't bypass the API," but not "the API is idempotent" — that mechanism exists nowhere.
- **Shipped capabilities run *outside* the ADR-010 sandbox** (ADR-010:L23) → their write-discipline is honor-system, unenforced by design.

### ③ Two ambiguous seams the Spaces set left dangling 🔴
- **O1** — ADR-005's Knowledge-owned `study_methods` registry (ADR-005:L46) and ADR-008's capability registry are the *same shape* (both "drive a Session, own Effects"), related only by **analogy** (ADR-008:L48, L58); boundary never stated → two competing composability registries. ADR-008 rejects exactly this two-registry split in its own Option C (L117-119) yet leaves it standing across the 005 boundary.
- **O2** — ADR-006 §3.4 puts `enabled_blocks` on the `spaces` row (ADR-006:L101, "→ ADR-008"); ADR-008 defines `block_instances` (L92-94) and never mentions `enabled_blocks`. Undefined in both directions — dangling forward-reference.

### ④ Base-layer correctness contradictions 🟡 (Phase A — all verified against source)
- **HKDF drift**: ADR-001:L74 & L76 still say `Vault Key = HKDF(...)`; code (`vault.ts`) uses BLAKE2b-256 ("replaces HKDF").
- **Wall-clock LWW mislabeled "logical"**: ADR-002:L124 comment says `-- Logical timestamp for LWW`, but L131/L1205 and ADR-003:L653-655 set it to `Date.now()`. Constitution (CLAUDE.md:L186) promises "logical timestamps." No Lamport/hybrid clock anywhere → cross-device clock skew silently loses writes.
- **Encryption-vs-query trio (ADR-002)**: encrypted-`INTEGER` money fields (`current_balance` L2011, `amount` L2040, `dreams.estimated_cost` L1920) can't be SQL-aggregated for the promised charts; indexes over randomized-nonce ciphertext (`idx_transactions_category` on `category -- [E]`, `idx_contacts_name`) can't function; FTS5 external-content (`content='pages'`, L3646) indexes ciphertext (`pages.content -- [E]`) and references phantom columns (`content_text` L3645, `contacts.notes` L3665).

### ⑤ ZK claims the documents themselves walk back 🟡
- **ADR-009**: "ZK-clean by construction" (L63, L67-68) contradicted by its own "the one real risk" (L121-122) + deferred capture transform (L89-91) + "empty logger targets" (L45) proving strip-on-capture. Plus the capability-instance-references-accumulated-data hole (L46, unaddressed) and exported capability *code* inside shared templates (untrusted-import surface, not touched).
- **ADR-010**: flat "cannot leak the vault" (L24) vs S2 sandbox-escape residual (L164-167) — true only for the *server* invariant; the *local* vault is S2-bounded. Should be stated honestly.
- **ADR-006**: PC-1 is framing-only here, enforced in ADR-010 + business-rules (L105, L108) — acceptable, noted.

**Also carried (systemic, lower tier):**
- **Sync assumes a flat fixed table set**; new junctions (`entity_tags`, `purpose_habits`) hit the no-causal/FK-ordering hazard (a row can sync before its endpoints); naive field-LWW on JSON ordering columns (`spaces.enabled_blocks` if a JSON array; `views` filter JSON) silently drops one device's concurrent edit. (ADR-006's *row-based* tags are actually sync-robust — rows survive; the JSON-column cases reintroduce the hazard.)
- **Provider seam** (ADR-007): *intends* to reuse the `dueIn()`/`summary()` registry (good — not a fork) but never shows a purpose-built reader can carry a generic `query(filter)`, and defines no provider capability-advertisement → a mistyped predicate is indistinguishable from an unrecognized one and silently returns wrong data.

---

## Unified Fix Menu

Severity: 🔴 blocking (capstone builds on it) · 🟡 correctness/accuracy · 🟢 track-for-build

| ID | Fix | Where | Sev | Decision |
|----|-----|-------|-----|----------|
| **F1** | Ground out guarded-write + **idempotency mechanism** (event-id + dedup); decide shipped-capability write discipline | ADR-004 §3.2 (008/010 inherit) | 🔴 | **D1** |
| **F2** | State the `study_methods` ↔ capability-registry **boundary** (O1) | 005 + 008 | 🔴 | **D2** |
| **F3** | Reconcile `spaces.enabled_blocks` ↔ `block_instances` (O2) | 006 + 008 | 🔴 | **D3** |
| **F4** | ADR-002 consolidation: fix amended-by header, write owed-tables ledger, decide write-now vs track | 002 | 🔴 | **D5** |
| **F5** | HKDF → BLAKE2b-256 | 001 §Key Model + CLAUDE.md | 🟡 | **D6** (sign-off) |
| **F6** | LWW clock: resolve "logical" label vs `Date.now()` + skew | 002/003 + constitution | 🟡 | **D4** |
| **F7** | Encryption-vs-query trio (money aggregation, ciphertext indexes, FTS5) | 002 | 🟡 | **D7** (mini design-pass) |
| **F8** | ADR-009 ZK-precision: downgrade "by construction", reconcile "empty logger targets", add capability-instance invariant + exported-code forward-ref | 009 | 🟡 | batchable |
| **F9** | ADR-010 honest-bound wording (S2 local-vs-server) + attachment-into-sensitive re-consent + name the envelope-hash field | 010 | 🟡 | batchable |
| **F10** | Sync: causal/FK ordering across blobs + ordered/JSON-field strategy for Spaces | 003 | 🟢 | track |
| **F11** | Provider seam: generic `query(filter)` contract + provider capability-advertisement | 007 | 🟢 | track |
| **F12** | Design the named-but-undesigned mechanisms: open-registry schema, §3.3 resolution layer, predicate DSL, capture transform, sandbox runtime, Effects plugin registry | 006/007/009/010/004 | 🟢 | track |
| **F13** | Mobile SQLCipher + SRP-lib: presented-as-decided but actually deferred | 001 | 🟢 | track |
| **F14** | Master-password re-key mechanics (rewrite every blob) | 003 | 🟢 | track |
| **F15** | The two standing ZK-integration ADRs (external-data; AI/LLM) — EX-2 references them unwritten | new | 🟢 | track |

---

## The 7 decisions (Victor — offline), with recommendations

- **D1 (F1) — the big one.** *Recommend:* back-port a real guarded-write model into ADR-004 (write-API = the module service method; idempotency = an `effect_event_id` + a dedup ledger / unique constraint), so 008/010 *inherit* rather than re-assert. Rule that shipped capabilities ride the **same** module-write-API chokepoint (not an honor-system exception).
- **D2 (F2).** *Recommend:* a study-method service **is** a capability (one registry; `study_methods` becomes a typed view over the capability registry) — avoids the two-registry split ADR-008 itself rejects in Option C.
- **D3 (F3).** *Recommend:* `enabled_blocks` = allow-list (which capability *types* a Space offers); `block_instances` = actual placements. Distinct, stated in ADR-008 — or drop `enabled_blocks` as derivable.
- **D4 (F6).** *Recommend:* adopt a hybrid logical clock (or server-timestamp reconciliation) and keep the "logical" wording honest — wall-clock LWW silently loses writes on skew (corrupts data, not just docs).
- **D5 (F4).** *Recommend:* keep the consolidated ADR-002 amendment deferred to its own build-phase session (it's large), **but** fix the header + write the owed-tables ledger now so the divergence stops being invisible.
- **D6 (F5).** Sign-off to amend ADR-001 + CLAUDE.md (code is authoritative — deliberate BLAKE2b choice).
- **D7 (F7).** *Recommend:* a small design-pass — decrypt-in-memory aggregation for charts; blind-index or plaintext-derived FTS column for search. Own mini-intake.

---

## Verified against source (not taken on a subagent's word)

- **Wall-clock LWW** — confirmed: ADR-002:L124 labels the field "Logical timestamp"; L131/L1205 + ADR-003:L653-655 set `Date.now()`; constitution promises logical (CLAUDE.md:L186); no logical clock exists.
- **FTS5 over ciphertext** — confirmed: `fts_pages USING fts5(... content='pages', content_rowid='rowid')` (ADR-002:L3642-3647) over `pages.content -- [E]`; `content_text` (L3645) is not a real column.
- **HKDF drift** — confirmed: ADR-001:L74 & L76 both state HKDF for the Vault Key.

## Resolution progress (revise pass — started 2026-07-16)

Safe 🟡 batch — **DONE 2026-07-16** (LITE gate, doc-only, no code touched; each edit grounded in source):
- **F5 / D6 ✅** — Victor signed off (BLAKE2b explained + approved). ADR-001 §6 Key Model + amendment header, `CLAUDE.md:163`, and ADR-003 key-chain diagram now say `BLAKE2b-256(key=Master, msg=Account)`; rationale + domain-separation forward-flag added. Verified against `vault.ts:78-95` (tested). Closed the 2026-06-13 business-rules HKDF flag (Change Log row added).
- **F8 ✅** — ADR-009 headline downgraded "ZK-clean *by construction*" → "by design, **enforced at capture**" (all four bare "by construction" instances reconciled: §1, §3.4 headline + body, §5); added **capability-config invariant** (§3.1, closes the capability-instance-references-accumulated-data hole) + **untrusted-imported-code forward-ref** → ADR-010 §3.1.
- **F9 ✅** — ADR-010 §2 flat "cannot leak the vault" → honest two-bound wording (server-unconditional ZK-1 vs local sandbox-strong, §5 residual); named **`granted_envelope_hash`** in the `capability_grants` record (the field the delta-check depends on); added **attachment-into-sensitive re-consent** clause (§3.3.4).
- **F4-header ✅** (D5) — ADR-002 "Amended by" now lists **003–010** (each from its own `Amends:` declaration) + a **consolidation-status note** pointing at this report's owed-tables ledger. Body consolidation remains **deferred** to its own build-phase session (per D5).

🔴 **F1 / D1 — DONE 2026-07-16** (full §XXVI gate: PLAN → critique → Approval 1 [D1-a/b/c ratified] → preflight → **independent adversarial critique** → REVISE [B1–B4 + N1–N4 closed] → Approval 2 → implement). Grounded the guarded-write + idempotency mechanism into **ADR-004 §3.2.5** (owner); ADR-008/010 now inherit by reference (loop `010→008→004→010` broken). Key design call: **`effect_event_id` is deterministic** — closes same-device double-count via a local `applied_effects` ledger, and *enables* cross-device convergence via a UNIQUE output-row column (merge enforced by sync = F10). Added constitution **INT-2** (write-discipline; PC-3 specializes it). Effect **taxonomy** (write/additive/projection/intra-realm) added so projection effects (`surface_journal/calendar`, no write) aren't force-fit. Honest bound stated: F1 closes same-device, F10 owns cross-device merge. Feature hinge **SS-6** grounded at §3.2.5. New tables → ADR-002 owed-ledger (local-only `applied_effects` + `effect_event_id` columns), no DDL into stale body (D5). Spec: `docs/specs/adr-revisions/f1-guarded-write-idempotency/PLAN.md`.

🔴 **F2 / D2 — DONE 2026-07-16** (full §XXVI gate: PLAN → /critique [REVISE: R1 anatomy-crosswalk · R2 owed-ledger-location · R3 BR-6-scope] → Approval 1 [D2=A one-registry-is-a + D2-a=PC-2a ratified] → /preflight → **independent adversarial critique** [is-a survived; REVISE: **B1** dropped `role` axis · **B2** `registerMethod`/`listMethods` second chokepoint the noun-grep missed · B3 gather unbound-read · B4 `review_events` own-domain-write · B5 render eligibility-not-gain · B6 leaf-cite view-contingency — all closed] → final /critique + /preflight → Approval 2 → implement). **Decision D2=A:** one composability registry (ADR-008 = supertype); `study_methods` is a `kind=study_method` **specialization**, not a parallel registry — the two-registry split ADR-008's own Option C rejects, now generalized to cover 005. **`kind`-metadata carries the `role` axis; the review engine (curves/bindings/`review_events`/mastery) stays Knowledge's; `review_events` is an own-domain write, its downstream effects ride §3.2.5 (F1).** Grounded via ADR-008 §3.1 + **§3.3a anatomy crosswalk** (is-a *shown*) + ADR-005 amended-by + constitution **PC-2a** (INT-1a-shaped). Owed-ledger reconciled (`study_methods`→kind-partition, no base table; ADR-002 untouched, D5). Feature cites regrounded incl. the `registerMethod`/`listMethods` API surface. Spec: `docs/specs/adr-revisions/f2-o1-registry-boundary/PLAN.md`.

🔴 **F3 / D3 — DONE 2026-07-17** (full §XXVI gate: PLAN → /critique [REVISE: R1 inline-vs-standalone scope · R2 hard-⊆-vs-lifecycle · R3 kind-vs-definition granularity] → Approval 1 [D3=keep-both-distinct + D3-a row-based-lean/F10 + D3-b no-PC + D3-c render-agnostic, Victor] → /preflight PASSED → **independent adversarial critique** [core survived; REVISE: **B1** SP4 [FACT] was an inference (grounding is two-legged SP6+SP5/ADR-009, not three) · **B2** "additive not a restriction" left the field toothless → **teeth-by-surface** (standalone add-menu enforced, inline additive) · **B3** "not derivable"→"stored, not a query-time projection" · **B5** README L10 drift · **B4-nit** strike the "/view" string · **B6** no-PC re-argued as subsystem-local; **B4/B7 held**] → all closed → Approval 2 [B2 refinement signed off] → implement). **Decision D3 = keep both, distinct:** `enabled_blocks` = the Space's authored offered-capability **palette** (a set of capability *definition* refs, ADR-006 §3.4); `block_instances` = the standalone **placements** (ADR-008). Render-target-agnostic membership (form = §3.2 per-instance choice); teeth split by surface (standalone drawn from the palette; inline additive/union-safe). Dangling forward-ref closed **both directions** (006 now defines the palette; 008 now names `enabled_blocks`). Grounded via ADR-006 §3.4 (new palette paragraph) + ADR-008 §3.4/data-model (reciprocal + "/view" struck) + §5 Consequences (menu≠placements) + ADR-009 §3.1 (terminology tie) + owed-ledger (junction under 006; `block_instances`=placements under 008) + `spaces/README.md` L10+L44. No new PC (subsystem-local rule); ADR-002 body untouched (D5); zero code. Spec: `docs/specs/adr-revisions/f3-o2-enabled-blocks-block-instances/PLAN.md`.

🟡 **F6 / D4 — DONE 2026-07-17** (full §XXVI gate: PLAN → /critique [REVISE: **R1** packing math wrong — `physical_ms × 2ᵏ` overflows JS 2⁵³ *now*, not year 6000 → representation demoted to build-phase · **R2** §3/Part C now carry the full 4-case HLC receive rule, not a gloss · **R3** Yjs scope bound] → Approval 1 [D4=HLC + D4-a governs both `_sync_lww_ts`/`_sync_field_ts` + D4-b global device-id tiebreak + D4-c no-new-PC/sharpen-SU-2 + D4-d doc-only, Victor] → /preflight PASSED [device-id tiebreak = lexicographic TEXT, folded] → **independent adversarial critique** [core HLC survived — algorithm confirmed canonically correct incl. backwards-clock case, convergence + R1 math confirmed; REVISE: **B1** representation not client-only — couples to wire header (`types/sync.ts:45,49`) + server `blob_index` (§9.4) · **B2** honest F10 boundary (representation shares F10's surface) · **B3** §6.3 delete-vs-edit compared raw wall-clock `deleted_at` = same skew hole → **BR-9** deletes ride the HLC field-timestamp · **B4** `types/sync.ts:23` carries the same "Logical" label → inventoried-as-interim, not edited (would invert the lie); agent's `schema.ts:26` claim refuted · **N1** push flow is §10.1 not §3 · **N2** `sync/field-lww.ts` is the ADR's proposed path, real dir = 0-byte stubs · **N3** BR-5 server-invariance regrounded on §9.4 + made contingent · **N4** `updated_at`-stays-wall-ms + HLC-state-persistence named owed] → all closed → Approval 2 [B3 delete-scope addition signed off] → implement). **Decision D4 = adopt a Hybrid Logical Clock** for every LWW stamp (`_sync_lww_ts` + `_sync_field_ts`): orders by causality not raw wall time (skew self-corrects on merge), 100% client-side (local-first + ZK + dumb relay intact), makes the constitution's "logical" promise *true* (SU-2 sharpened, no new PC). Global lexicographic-TEXT device-id tie-break replaces §6.1's per-device "keep local" (closed a permanent-divergence path); deletes ride the same clock (BR-9). Grounded via ADR-003 §6.1 (new HLC subsection = the clock's home: full local + 4-case receive rule + causal property + skew failure + Yjs bound + representation/interim notes; `mergeFieldLWW` snippet + §6.3 delete case + §4.1/§10.1/§17 reconciled) + ADR-002 §3 (L134/L141/L143 HLC-precise) + business-rules SU-2 + CLAUDE.md L186. Rejected: (B) server-timestamp (breaks dumb-relay) · (C) honest-wall-clock (ships silent loss). Build-phase (tracked, F10 cross-ref): HLC module `sync/hlc.ts`; `repository.ts:234` `ts()`→`hlc.now()` + fix `types/sync.ts:23` label in the same edit; field-LWW merge (HLC compare + device-id tiebreak + HLC-ordered deletes); **storage representation** (string / BigInt / two-column — *not* a free INTEGER pack, coupled to wire header + `blob_index`); `updated_at` stays wall-ms; HLC state (`last_l`/`last_c`) persistence home. ADR-002 body DDL untouched (D5); zero code (`packages/` diff = 0). Spec: `docs/specs/adr-revisions/f6-d4-lww-clock/PLAN.md`.

🟡 **F7 / D7 — DONE 2026-07-17** (full §XXVI gate: PLAN → /critique [REVISE: **R1** FTS leg self-contradictory (persisted-in-SQLCipher **and** rebuilt-each-unlock) + dodged the fork → split **FTS-1 vs FTS-2** as the search analogue of the money fork · **R2** indexes leg skipped `category→P` → blind-index-vs-P rationale made explicit · **R3** money-flip scope self-contradictory → marking-correction happens in F7] → Approval 1 [**A1** money stays E + decrypt-in-memory · **FTS-2** ephemeral rebuilt-on-unlock · **category = E + blind index** · D7-scope, Victor] → /preflight PASSED [L168 already carries the rule → Part D = sharpen the E-row; `estimated_cost` ×2 + summary rows → A1 handled centrally] → **independent adversarial critique** [core survived — trio confirmed vs source (`vault.ts` random-nonce `crypto_secretbox_easy`), L168 quoted verbatim, A1+FTS-2+blind-index coherent; REVISE: **B1** money defect is **domain-wide** (~16 E numeric fields across accounts/transactions/assets/liabilities/investments/income_streams/dreams, feeding net-worth/portfolio/income charts), not the 3 the report named → generalized · **B2** the citation catch: my "HMAC_vaultsubkey" was wrong twice — codebase PRF is **keyed BLAKE2b** (`crypto_generichash`, ADR-001:76) not HMAC, and ADR-001:77's **domain-separation forward-flag** applies → blind-index key = domain-separated labelled subkey · **B3** FTS-2 "never writes to disk" overclaim → downgraded to "no persistent plaintext tokens + torn down on lock," OS-swap/temp-spill named + `PRAGMA temp_store=MEMORY` · **N1/N2** line-cites (`amount` L2050, `category` L2052, `content_text` L3655, `title` also E) · **N3** `analytics.ts`/`search-service.ts` = 0-byte placeholders] → all closed → Approval 2 [B1 domain-wide + B2 BLAKE2b key signed off] → implement). **Decision D7 = keep-encrypted, pay-compute-cost** across all three legs: **money** stays E (all Finance E-numeric fields), aggregated **decrypt-in-memory** (never SQL `SUM`); **indexes** — dropped both dead ciphertext indexes, `category` gets an **equality-only blind index** (P side column `category_bidx = keyed-BLAKE2b PRF`, **domain-separated** key per ADR-001:77, leaks only equality to a local-DB reader); **FTS** — standalone content-less FTS5 fed decrypted plaintext, **FTS-2** ephemeral/rebuilt-on-unlock (honestly bounded, not "never to disk"), phantom columns fixed. Grounded via ADR-002 §P/E classification (E-row sharpened = the binding rule; sensitivity note: non-sensitive aggregates stay P, sensitive Finance numbers E+decrypt-in-memory) + dropped indexes + §5.19 FTS rewrite. Build-phase (owed-ledger): `category_bidx` column + keyed-BLAKE2b derivation · `analytics` decrypt-in-memory path · FTS-2 rebuild routine · contact-notes-from-`pages` feed. ADR-002 owed-**table** consolidation stays F4-body/D5; zero code (`packages/` diff = 0). Spec: `docs/specs/adr-revisions/f7-d7-encryption-vs-query/PLAN.md`.

🔴 **F4-body / D5 — DONE 2026-07-17** (full §XXVI gate: PLAN → /critique [REVISE: **R1** the ledger claimed "single source of truth / every owed change" but was scoped only to ADR-003–010 + F1/F6/F7, silently omitting the documentation-blueprint **module-reframe** schema (the invisible-divergence F4 exists to kill) → BR-1 reframed to two owed streams · **R2** opening `entity_links.entity_type`'s CHECK was mis-filed under RETIRE (it's an AMEND) → moved · **R3** acceptance didn't require the module sweep → added] → Approval 1 [**D5-a = TRACK** (defer the §5 DDL rewrite; the §5.20 ledger is the tracked artifact) + **D5-b = new ADR-002 §5.20** (durable home), Victor] → /preflight PASSED [doc-only; sweep paths confirmed to exist → folded into §5] → **independent adversarial critique** [core survived — No-Redesign + Grounding both clean (every cite accurate incl. ADR-008:9 verbatim, the RETIRE §5 locations, the §5.20 slot); REFUTED on completeness + the TRACK justification: **B1** (the load-bearing catch) bucket (ii) as first-drafted (Health/Languages/Duties) was a *sliver* — a grep proved **19 `docs/features/*/structure-data.md` docs** owe ADR-002 amendments, none reachable by the sweep → stream (ii) reframed to the **complete 19-doc module tier, named-not-enumerated** (enumerating it IS the deferred build session, per TRACK) · **B2** owed `fts_knowledge` missed + "§5.19 handled by F7" was a blanket claim → scoped to F7's tables, new-domain FTS noted owed · **B3** the TRACK *justification* overstated "the ADRs defer their shapes" (`templates`/`capability_grants`/`entity_tags`/`views`/`spaces` are fully-specified) → softened to "a *material subset* defers" + added a **✓/⏳/↔ per-row readiness marker**; TRACK decision unaffected · **N1** ADR-003 has no `Amends:` line (its `_sync_field_ts` is in §17) → corrected] → all closed → Approval 2 [B1 named-not-enumerated scope signed off, Victor] → implement → **Verify**). **Decision D5-a = TRACK.** Produced the durable **owed-tables ledger** at **ADR-002 §5.20** (Pending Consolidation): Stream (i) — the ADR-003 §17 + ADR-004…010 + F1/F6/F7 slice, fully enumerated as RETIRE/ADD/AMEND with readiness markers; Stream (ii) — the **19-module documented target schema** named as the build-session input checklist (not enumerated — that IS the deferred rewrite). Repointed the ADR-002 ⚠ note from this review doc → §5.20; forward-notes on §7 count + §8 map. `_sync_field_ts` formally ratified. Zero code (`packages/` diff = 0). Spec: `docs/specs/adr-revisions/f4-body-d5-adr002-consolidation/PLAN.md`.

---

## ✅ Revise pass F1–F15 — COMPLETE (2026-07-17)

All 🔴 blocking + 🟡 correctness fixes are resolved and gated. **No architectural fix remains.** The 10 ADRs' cores were sound throughout; the revise pass closed the drift, the ungrounded delegations, the two dangling seams (O1/O2), the base-correctness contradictions, and the ADR-002 spine divergence — each through the full §XXVI gate with an independent adversarial pass. The standing lesson held every time: **self-critique caught structural/precision gaps; the fresh refuter caught the load-bearing ones** (F1 B3 multi-device double-count · F2 B1/B2 dropped axis + 2nd chokepoint · F3 B2 teeth-by-surface · F6 R1 packing-overflow + B1 wire coupling · F7 B1 domain-wide + B2 the BLAKE2b citation · **F4-body B1 the 19-doc tier**).

**🟢 F10–F15 — tracked-for-build** (no ADR edit owed; these are build-phase specs):
- **F10** (load-bearing) — sync causal/FK ordering across blobs; the `space_enabled_blocks` junction's sync/storage strategy; **+ the HLC storage representation / wire-header / `blob_index` coupling from F6/D4**.
- **F11** — provider seam: generic `query(filter)` contract + capability-advertisement (ADR-007).
- **F12** — design the named-but-undesigned mechanisms (open-registry schema, §3.3 resolution layer, predicate DSL, capture transform, sandbox runtime, Effects plugin registry).
- **F13** — mobile SQLCipher + SRP-lib (presented-as-decided, actually deferred; ADR-001).
- **F14** — master-password re-key mechanics (rewrite every blob; ADR-003).
- **F15** — the two standing ZK-integration ADRs (external-data; AI/LLM) that EX-2 references unwritten.
- **Plus** the ADR-002 build-phase schema session (§5.20 consolidation), the F1/F6/F7 build columns, and the `B3` gather source-pick read channel from F2.

---

## Method note (why this pass caught what the Spaces Transform didn't)

The 2026-07-15 Spaces Transform critiqued each ADR *as it was drafted* (draft→critique→revise→accept) + one holistic Verify. That loop structurally cannot catch defects that appear only once all N docs are frozen and read together — cross-ADR delegation chains that never terminate (②), competing registries (O1), representational conflicts (O2), and the ADR-002 divergence (①). This gate closes that gap. The failure signature across the set: **mechanisms are named and delegated ("→ handled at build", "→ see ADR-N") but the delegation sometimes loops (008→004→008) or dead-ends** — a whole-set-only finding.
