# Critique Gate — ADR-001…010 (whole-set architectural review)

**Date:** 2026-07-15
**Run by:** documentation-blueprint · Verify/critique detour before exec #8 (Purposes & Goals capstone)
**Scope:** All ten ADRs, sequenced — Phase A = ADR-001…005 (base architecture), Phase B = ADR-006…010 (Spaces set), then a holistic cross-ADR pass.
**Method:** One focused reader-critic per ADR (line-cited findings) + human-owned cross-ADR synthesis. Three sharpest technical claims re-verified against source (see §Verified).
**Output mode:** Report + verdict only. **No ADR was edited.** Decisions D1–D7 left to Victor (offline). Any future fix runs its own per-step build gate + `/adr-new` amend flow.

---

## Verdict in one line

The constitution is **architecturally sound in its decisions** but **not yet internally consistent as a set**. All ten ADRs return **REVISE** — zero RETHINK (no core decision is wrong), zero clean SHIP (every document has fixable gaps).

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
- From **005**: RETIRE `flashcard_decks` (ADR-002:L2625-2650), `flashcard_reviews` (L2690-2710), SM-2 columns on `flashcards` (L2664-2673); ADD generic engine tables (`study_methods`, `review_curves`, `method_bindings`, `review_events`). Note `study_topics` still carries its own SM-2 columns (L2578-2583).
- From **006**: `entity_tags` (retire `page_tags`), `parent_tag_id` on tags, `spaces`; open `entity_links.entity_type` CHECK → registry.
- From **007**: `views`; retire INTENDED `task_views` + Preferences per-module custom-views store.
- From **008**: capability registry table(s) + `block_instances`; amend `editor.ts` closed `BlockType` union.
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

Remaining: 🔴 architectural, one gated sub-session each — **F2/D2** (O1 registry boundary) → **F3/D3** (O2) → **F6/D4** (LWW clock) → **F7/D7** (encryption-vs-query) → **F4-body/D5** (ADR-002 full consolidation). 🟢 F10–F15 tracked-for-build (**F10 now load-bearing** — owns the cross-device effect-merge F1 hands it).

---

## Method note (why this pass caught what the Spaces Transform didn't)

The 2026-07-15 Spaces Transform critiqued each ADR *as it was drafted* (draft→critique→revise→accept) + one holistic Verify. That loop structurally cannot catch defects that appear only once all N docs are frozen and read together — cross-ADR delegation chains that never terminate (②), competing registries (O1), representational conflicts (O2), and the ADR-002 divergence (①). This gate closes that gap. The failure signature across the set: **mechanisms are named and delegated ("→ handled at build", "→ see ADR-N") but the delegation sometimes loops (008→004→008) or dead-ends** — a whole-set-only finding.
