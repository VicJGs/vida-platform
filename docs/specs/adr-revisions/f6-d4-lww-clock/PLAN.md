# PLAN — F6/D4: LWW clock — "logical" label vs `Date.now()` wall-clock

- **Unit:** ADR revision (doc-only; foundation profile; LITE gate + full §XXVI adversarial pass, per F1/F2/F3 precedent).
- **Fix:** F6 (report `docs/reviews/2026-07-15-adr-critique-gate.md` §Unified Fix Menu, L87) — resolve the
  contradiction between the "Logical timestamp" label and the `Date.now()` wall-clock implementation, and the
  silent cross-device data loss it causes.
- **Decision:** D4 (report §The 7 decisions, L105).
- **Severity:** 🟡 correctness (not capstone-blocking like F1–F3) but **load-bearing for real multi-device data
  integrity** — wall-clock LWW silently loses writes on clock skew (corrupts *data*, not just docs).
- **Sources loaded (ground truth):** the report (throughline ④ L60/L62 · fix menu L87 · D4 L105) · ADR-002 §3
  Sync Metadata (L125-146: L134 label, L141/L143 `Date.now()`, L1200-1205 server-visible metadata) · ADR-003 **§10.1**
  push flow (L639-656: `_sync_lww_ts`/`_sync_field_ts` = `Date.now()`) + §4.1 blob header field_timestamps (L118,
  L137) + §6.1 field-level LWW merge (L314-398, incl. the L376 tie-break) + §6.3 delete edge case (L419) + §9.4
  `blob_index` (L599-611: server stores `sync_lww_ts INTEGER` + `field_timestamps TEXT`) · `docs/core/business-rules.md`
  **SU-2** (L29 "field-level LWW … logical timestamps") + DATA sync-metadata (L46) · `CLAUDE.md` L186 (constitution
  promise) · **code:** `packages/core/src/db/repository.ts` L234-236 (`ts() = Date.now()`), L243 + L361
  (`_sync_lww_ts = ts()`); `packages/core/src/db/schema.ts` L26; `packages/types/src/sync.ts:23,45,49` (the "Logical"
  comment + `SyncBlobHeader`); `packages/core/src/sync/` = empty stubs (`crdt.ts`/`queue.ts`/`resolver.ts`, 0-byte —
  no field-LWW/HLC logic built).
- **Scope guard.** F6 fixes the **clock model + its honest description** across ADR-002 §3, ADR-003 §10.1/§6, and the
  constitution (SU-2 + CLAUDE.md L186). It **decides** D4 and records it as the authoritative build direction; the
  HLC module + merge-time clock-update + tie-break are **build-phase** (no code this session — the `Date.now()` in
  `repository.ts` stays as the interim v0 stamp, flagged for replacement). F6 does **not** add DDL / owed tables to
  ADR-002's body (that stays D5's consolidation) and does **not** re-open the **cross-blob causal / FK-ordering**
  hazard or the JSON-ordered-field strategy — those are **F10** (report L91). F6 is the *intra-row clock*; F10 is
  *inter-row ordering*. Distinct.

---

## §1. Context — the contradiction (grounded, not paraphrased)

Throughline ④, verbatim from the whole-set gate (report L62):

> **Wall-clock LWW mislabeled "logical"**: ADR-002:L124 comment says `-- Logical timestamp for LWW`, but L131/L1205
> and ADR-003:L653-655 set it to `Date.now()`. Constitution (CLAUDE.md:L186) promises "logical timestamps." No
> Lamport/hybrid clock anywhere → cross-device clock skew silently loses writes.

The four current texts, verified against source:

- **ADR-002 §3** (L134): `_sync_lww_ts INTEGER NOT NULL, -- Logical timestamp for LWW resolution`; but the "How
  sync works" prose (L141) says *"set `_sync_lww_ts = Date.now()`"* and (L143) *"highest timestamp wins (LWW)."*
  `Date.now()` is a **wall clock**, not a logical clock. Label and mechanism contradict inside one section.
- **ADR-003 §3** (L653): push flow sets `_sync_lww_ts = Date.now()` and (L655) `_sync_field_ts[changedField] =
  Date.now()` — the **same wall clock**, applied per field.
- **ADR-003 §6.1** (L314-398): the actual merge is **field-level LWW** — `remoteTs > localTs → accept remote`
  (L371), else *"keep local (arbitrary but deterministic tie-break)"* (L376). The worked example (L321-339)
  assumes the two devices' `Date.now()` values are directly comparable — i.e. it assumes **zero skew**.
- **Constitution:** `business-rules.md` **SU-2** (L29) *"field-level **LWW** (last-writer-wins, logical
  timestamps)"* and **CLAUDE.md** L186 *"LWW … with logical timestamps."* The word **logical** is a promise the
  code does not keep.
- **Code (`[FACT]`):** `repository.ts` L234-236 `function ts() { return Date.now() }`, written to `_sync_lww_ts` on
  insert (L243) and update (L361). `sync/field-lww.ts` is a doc stub (ADR-003 §6.1) — **not built**. **No
  Lamport/HLC/logical clock exists anywhere in `packages/`.** The label is aspirational; the implementation is pure
  wall clock.

**Two distinct defects, one root.** (a) **Correctness** — a bare wall clock loses writes under cross-device skew
(the failure below); (b) **honesty** — the docs/constitution call it "logical" when it is not. Both trace to the
one missing primitive: **a clock that orders by causality, not by each device's uncorrected wall time.**

**The failure mode (why 🟡 is load-bearing, not cosmetic — `[FACT]` from the mechanism):** Device A's clock runs
ahead by δ. User edits field F on B at real time `t`; A last wrote F at real time `t − 2min`. LWW compares
`ts_A = (t − 2min) + δ` vs `ts_B = t`. If `δ > 2min`, `ts_A > ts_B` → A's **older-in-reality** value wins; B's
newer write is **silently discarded** — no conflict surfaced, no user prompt. Applies per field (ADR-003 §6.1) and
to the row-level `_sync_lww_ts`. Single-user lowers the *frequency* (one human rarely produces truly simultaneous
edits) but does **not** remove it: offline devices accumulate edits, clocks drift/DST-jump/get-manually-set, a
device that was off for a week rejoins. The loss is **silent and permanent** on irreplaceable personal data —
directly violating the constitution's *"all writes succeed locally / offline-resilient"* promise.

**Second, smaller defect the merge code carries (`[FACT]`, ADR-003 L376).** The tie-break *"keep local"* is
deterministic **per device**, not **globally**: if two devices set the same field to **different** values at the
**same** timestamp, each keeps its own → the rows **diverge permanently** (neither ever accepts the other; versions
fork). Low probability, real. A correct LWW needs a **global** tiebreak (e.g. higher `_sync_device_id` wins) so both
devices converge on the **same** winner. D4 folds this in — it is part of "make LWW actually correct," and an HLC
alone (equal `(physical, counter)` is still possible offline) does not remove the need for it.

---

## §2. Invariants this unit must satisfy (business rules)

- **BR-1 (one clock model, governing every LWW timestamp).** A single clock model produces **every** value compared
  by LWW: the row-level `_sync_lww_ts` (ADR-002 §3) **and** each entry in the field-level `_sync_field_ts` map
  (ADR-003 §4.1/§6.1). The fix is not "rename one column"; it is "define the clock that stamps all of them."
- **BR-2 (causal, not raw-wall, ordering).** The clock must order **causally**: if write X is observed before write
  Y is produced (on any device, via sync), then `ts(X) < ts(Y)`. A bare per-device wall clock does **not** provide
  this (skew breaks it); the chosen model must. This is the property that stops the silent-loss failure.
- **BR-3 ("logical" becomes true, precisely defined — in docs + constitution).** After the fix, the word **logical**
  in SU-2 / CLAUDE.md / ADR-002 / ADR-003 is **accurate** — because the model chosen (D4) *is* a logical clock — and
  the docs **define** what "logical" means here (not a bare adjective a reader could mistake for `Date.now()`). No
  document may both say "logical" **and** show an uncorrected `Date.now()` as the stamping rule without marking it
  interim. **Bound (B4):** the identical `/** Logical timestamp for LWW resolution */` label also lives in the shared
  type `packages/types/src/sync.ts:23`. F6 is doc-only (D4-d, ratified: zero `packages/` diff) — and correcting that
  comment to "HLC" *now*, while `repository.ts:234` still writes `Date.now()`, would just invert the lie. So the code
  label is **inventoried as interim** (BR-6), corrected in the same build edit that swaps `ts()`→`hlc.now()`; BR-3's
  "logical is true" claim is scoped to the **docs + constitution** this session, with the code contract flagged.
- **BR-4 (deterministic global tie-break).** Equal timestamps resolve by a **global** rule identical on every device
  (recommend: higher `_sync_device_id` wins), replacing ADR-003 L376's "keep local." No pair of devices can end a
  merge holding different values for the same field with the same timestamp.
- **BR-5 (local-first + ZK preserved — the model earns its keep by *not* breaking the architecture).** The clock's
  *ordering logic* is **client-side** (the receiving client merges, ADR-003 §6.1); the server remains a **dumb blob
  relay** (ADR-001/003) and gains **no new order-arbiter authority**. The LWW stamp is **already** on the plaintext
  blob header (`SyncBlobHeader.sync_lww_ts`/`field_timestamps`, `packages/types/src/sync.ts:45,49`) and **already**
  stored server-side in the `blob_index` (`sync_lww_ts INTEGER`, `field_timestamps TEXT`, ADR-003 §9.4 L599-611) —
  an HLC's physical part ≈ wall time, so it reveals **no more than the current wall-clock stamp does**. `[caveat, not
  FACT]` "adds nothing" holds **only if the representation stays numerically comparable** — a string/two-column
  encoding (§3/R1) would change the header type + the `blob_index` column, i.e. the *representation* is coupled to the
  wire + server surface (see BR-7 / B1). Any option that makes the **server** the order arbiter is rejected on
  **architecture** grounds (breaks local-first), not merely preference.
- **BR-6 (honest interim state — No-Guessing about the code).** The docs state plainly that the **current** code is
  the **pre-sync-engine v0 stamp** and that the D4 clock replaces it **when the sync/merge engine is built**. The
  interim inventory (labeled, not hidden): (1) `repository.ts:234` `ts() = Date.now()`; (2) the `sync/` dir holds only
  **empty stubs** (`crdt.ts`/`queue.ts`/`resolver.ts`, 0-byte) — no field-LWW/HLC logic exists (N2); (3) the shared
  type `types/sync.ts:23` carries the same aspirational "Logical timestamp" comment (B4). No doc may imply the correct
  clock already ships; all three are corrected at the build swap.
- **BR-7 (no ADR-002 DDL; no code; F10 boundary — honestly bounded).** Per D5, F6 does **not** write owed-table DDL
  into ADR-002's body and does **not** finalize the HLC storage representation — the `_sync_lww_ts` column definition,
  the physical/counter encoding (string vs BigInt vs two-column, §3/R1), the **wire header** type
  (`types/sync.ts:45,49`) and the **server `blob_index`** columns (ADR-003 §9.4) it couples to are **build-phase**,
  tracked in the ledger. Zero code this session. **Honest boundary (B2):** F6's *decision* (adopt HLC) is doc-only and
  intra-row; but the *representation half* of that decision shares F10's wire+server surface — so F6 does not claim a
  clean physical separation from F10 at build, only that **this session** touches prose/label/decision and nothing
  else. F6 does **not** touch cross-blob causal/FK ordering or the JSON-ordered-field strategy (**F10**, report L91).
- **BR-9 (deletes ride the same clock — close the residual skew hole, B3).** ADR-003 §6.3 currently resolves the
  *"row deleted on one device, edited on another"* race by *"delete wins if `deleted_at` timestamp > edit timestamp"*
  — but `deleted_at` is a plain wall-clock Unix-ms value (DATA-2), so this race carries the **same** skew bug F6
  exists to kill. Since `deleted_at` is a **field-tracked mutable field** (not in ADR-003 §6.1's excluded list,
  L387), it already receives an HLC stamp in `_sync_field_ts`. The fix: the delete-vs-edit comparison orders by the
  **HLC field-timestamps** (`_sync_field_ts['deleted_at']` vs the edited field's HLC ts), **not** the raw wall-clock
  `deleted_at` value. Reconcile §6.3's wording accordingly. Soft-deletes are then just field-level LWW under the same
  clock (consistent with BR-1) — no separate delete-ordering mechanism, no residual wall-clock comparison.
- **BR-8 (constitution: sharpen the existing promise, do NOT add a new PC — assessed, not assumed).** SU-2 **already**
  carries the LWW/"logical timestamps" invariant at constitution level; D4 makes it **true + precise**. So the
  constitution touch is a **wording sharpen of the existing SU-2** (+ CLAUDE.md L186), **not** a new platform
  invariant. (Contrast F1's INT-2 and F2's PC-2a, which added genuinely new inherited rules; contrast F3, which was
  subsystem-local so touched no PC. F6 is the third shape: an existing PC that was *lying*.) Recommended; Victor's call.

---

## §3. Design — the mechanism (`[DECISION]`, direction D4 = adopt a Hybrid Logical Clock)

### The clock model (recommended: HLC — see §6 for the A/B/C fork and rationale)

A **Hybrid Logical Clock** stamp is a pair `(physical_ms, counter)`. The canonical rules (Kulkarni/Demirbas) — the
full case split, because ADR-003 §6.1 is the clock's home and F6's mandate is precision (**R2**):
- **Local event (send/write):** `l' = max(last_l, pt)` where `pt = Date.now()`; `c' = (l' == last_l) ? last_c + 1 : 0`.
- **Receive/merge a remote stamp `(l_msg, c_msg)`:** `l' = max(last_l, l_msg, pt)`, then
  - `if l' == last_l == l_msg` → `c' = max(last_c, c_msg) + 1`
  - `elif l' == last_l`        → `c' = last_c + 1`
  - `elif l' == l_msg`         → `c' = c_msg + 1`
  - `else`                     → `c' = 0`
  The receive rule makes the local clock **jump past any remote time it has observed** — this is what yields **BR-2
  causal ordering**: a skewed clock self-corrects on first sync.
- **Compare:** lexicographic `(physical, counter)`, then **`_sync_device_id`** as the final global tiebreak (BR-4).
  Since `_sync_device_id` is `TEXT`, the tiebreak is **lexicographically-higher device id** (deterministic, no
  numeric parse) — state this explicitly in ADR-003 §6.1 (preflight assumption 1).
- **Scope (R3):** the HLC governs **structured LWW only** (`_sync_lww_ts` + `_sync_field_ts`, **including
  `deleted_at`** — a field-tracked mutable field, so delete-vs-edit races order by its HLC field-timestamp, see BR-9).
  Editor content uses **Yjs CRDT (§6.2), which is timestamp/clock-free** — the HLC does not touch page content.
- **Representation is a build-phase decision — NOT free (R1, corrected).** SQLite's `INTEGER` is a signed **64-bit**
  (`i64`) and *can* hold a packed HLC, **but** Drizzle/JS reads it into a `number` (float64), capped at
  `Number.MAX_SAFE_INTEGER = 2⁵³`. A naive pack `physical_ms × 2ᵏ + counter` **breaks**: `physical_ms` today
  ≈ 1.75×10¹² ≈ 2⁴⁰·⁷, so even `× 2¹²` (a 4096 counter) reaches 2⁵²·⁷ and overflows the JS safe range by **~2039**;
  `× 2¹⁶` overflows **today**. So the model does not "pack into the existing INTEGER for free." Build-phase picks
  among: **(i)** a zero-padded sortable **string** (`"<physical>:<counter>"`), **(ii)** a **`BigInt`-typed** column
  (i64 holds `physical × 2¹⁶ + counter` = 2⁵⁷ ≪ 2⁶³ with no float round-trip), or **(iii)** **two columns**
  (`_sync_lww_ts_physical`, `_sync_lww_ts_counter`). The `_sync_field_ts` values follow the same representation. This
  keeps D5 honest: the clock *model* is decided now; the *representation/DDL* is build-phase (like F3 → F10).

Result: the clock is a **logical** clock (BR-3 makes "logical" true), causal (BR-2), single-value-comparable,
100% client-side (BR-5), and stays ~wall-aligned so timestamps remain human-legible.

### Part A — ADR-002 §3 (Sync Metadata): fix the label + the stamping prose
- **L134 comment** — keep "logical" but make it precise: `_sync_lww_ts INTEGER NOT NULL, -- HLC (hybrid logical
  clock) stamp for LWW; packs (physical_ms, counter) — see ADR-003 §6.1`. The label now matches the mechanism.
- **L141 "How sync works" step 1** — replace *"set `_sync_lww_ts = Date.now()`"* with *"set `_sync_lww_ts =
  hlc.now()`"* and add a one-line pointer that the HLC (not raw `Date.now()`) is defined in ADR-003 §6.1. Mark that
  the **current code stamps `Date.now()` as the interim v0** until the sync engine lands (BR-6).
- **L143 "highest timestamp wins"** — clarify: highest **HLC** wins; ties broken by `_sync_device_id` (BR-4).
- **Do NOT** finalize the `_sync_lww_ts` storage representation or add DDL — the packing/encoding (string vs BigInt vs
  two-column, §3/R1) is build-phase (BR-7 / D5); note that inline as an open build detail, don't assert "INTEGER, no
  change."

### Part B — ADR-003 §10.1 push flow + §4.1 header
- **L653 / L655** — the push-flow diagram sets `_sync_lww_ts` and `_sync_field_ts[field]` via **`hlc.now()`**, not
  `Date.now()`; one-line note that `field_timestamps` values are HLC stamps (§6.1), same clock, per field.
- **§4.1 L137 note** — the field_timestamps in the blob header are **HLC** stamps (still schema-defined field names,
  still not sensitive — the ZK argument there is unchanged). One-line pointer that the **`blob_index`** (§9.4) which
  stores `sync_lww_ts`/`field_timestamps` server-side compares them as-is; the HLC's representation must keep them
  comparable (or the header + `blob_index` change is owed at build — BR-7/B1).

### Part C — ADR-003 §6.1 (field-level LWW merge): define the HLC + fix the tie-break
This is the **owner** section for the clock definition (both ADR-002 and the push flow point here).
- Add a short **"Clock: Hybrid Logical Clock"** subsection defining `(physical_ms, counter)`, the local + merge
  update rules (above), and the causal-ordering property (BR-2). State the wall-clock-skew failure it fixes.
- **Fix L376's tie-break:** replace *"keep local (arbitrary but deterministic)"* with the **global** rule — on equal
  HLC, higher `_sync_device_id` wins (BR-4). Update the `mergeFieldLWW` doc-snippet's tie-break comment + the
  `FieldTimestamps` note so the pseudocode reflects HLC compare + device-id tiebreak (still illustrative, not built).
- Reframe the worked example (L321-339) or add one line: the comparison is **HLC**, so a skewed device's stamp is
  corrected on merge — the example no longer silently assumes zero skew.
- **Deletes (BR-9):** reconcile **§6.3** (the "row deleted vs edited" edge case, L419) — the delete-vs-edit winner is
  decided by the **HLC field-timestamps** (`_sync_field_ts['deleted_at']` vs the edited field's HLC ts), not the raw
  wall-clock `deleted_at`. State that soft-delete is field-level LWW under the same clock.
- **Interim note (BR-6):** the field-LWW/HLC merge logic is **not built** — the `sync/` dir holds only empty stubs
  (`crdt.ts`, `queue.ts`, `resolver.ts`, all 0-byte); ADR-003 §6.1's code comment names `sync/field-lww.ts` as the
  *proposed* target path (not an existing file). When built it uses the HLC; today `repository.ts:234` stamps
  `Date.now()` (v0), and the shared type `types/sync.ts:23` still comments the field "Logical timestamp" (B4).

### Part D — Constitution (sharpen SU-2 + CLAUDE.md; NO new PC — BR-8)
- **`business-rules.md` SU-2 (L29)** — sharpen: *"field-level LWW … using a **hybrid logical clock (HLC)** — logical
  timestamps that order by causality, not raw wall time; ties broken by device id"* with `[FACT]` refs to ADR-003
  §6.1. The word "logical" is now backed by a definition, not a bare adjective.
- **`CLAUDE.md` L186** — one-clause tighten: *"LWW … with **logical (hybrid logical clock) timestamps**"* so the
  constitution root and the ADRs use one vocabulary.
- **No new PC / INT.** Part F assessment (below) argues why: the invariant already exists (SU-2); F6 de-lies it.

### Part E — Report resolution log + build-tracking (edit the *report*, not ADR-002 body)
- Tick **F6** in the report's Resolution-progress log with the D4 decision + the adversarial catches.
- Record the **build-phase items** (not built now): (1) an **HLC module** `packages/core/src/sync/hlc.ts`
  (`now()` + `receive(remoteHlc)` + `compare()`, per the §3 case split); (2) `repository.ts:234` `ts()` → `hlc.now()`
  + fix the `types/sync.ts:23` "Logical timestamp" comment in the **same** edit (B4); (3) the field-LWW merge (the
  empty `sync/` stubs, N2) uses HLC compare + device-id tiebreak + HLC-ordered deletes (BR-9); (4) **HLC storage
  representation** — string vs BigInt-column vs two-column (§3/R1); a naive `physical × 2ᵏ` pack overflows JS's 2⁵³
  and is **not** viable, so a real representation choice is owed — **coupled to the wire header (`types/sync.ts:45,49`)
  + server `blob_index` (§9.4), possibly a schema change** (B1/B2); (5) **`updated_at` stays wall-ms** — ADR-003 §6.1
  L388 sets `updated_at = max of merged timestamps`; with HLC stamps that must **not** pollute the user-facing wall-ms
  `updated_at` (DATA-2) — build keeps them distinct (N4); (6) **HLC state persistence** — `last_l`/`last_c` must
  survive app restart (monotonicity); needs a home (`app_state`, local-only) (N4). Cross-ref **F10** (sync build) —
  the clock is orthogonal to F10's cross-blob ordering but ships in the same sync-engine build + shares its wire/server
  surface (B2).

### Part F — Business-rules assessment (explicit: NO new PC — BR-8, argued not asserted)
The LWW clock is a **platform-wide** invariant (every syncable table inherits it) — which *would* normally argue for
a PC. But **SU-2 already is that PC** ("field-level LWW … logical timestamps"). F6 does not *introduce* a new
inherited rule; it **corrects a false one**. The right move is therefore to **sharpen the existing SU-2** (define
"logical" = HLC + causal + device-id tiebreak), not to mint a parallel PC that would duplicate it. This is the third
distinct shape in the F-series: F1/F2 *added* invariants (INT-2, PC-2a); F3 was subsystem-local (no PC); **F6
repairs an existing PC that was aspirational.** No `business-rules.md` *new-rule* edit — only SU-2's wording.

---

## §4. Acceptance

- [ ] **Contradiction gone in ADR-002 §3:** no reader finds "logical" and an uncorrected `Date.now()` stamping rule
      in the same section. L134 comment defines the HLC; L141 stamps `hlc.now()` with the interim-`Date.now()` note;
      L143 says highest **HLC** wins + device-id tiebreak.
- [ ] **ADR-003 §10.1/§4.1 aligned:** push flow (L653/L655) and the blob-header note (L137) stamp/carry **HLC**
      values, not `Date.now()`; field_timestamps ZK argument unchanged; §4.1 points at the §9.4 `blob_index`
      representation coupling (B1).
- [ ] **ADR-003 §6.1 is the clock's home:** a "Hybrid Logical Clock" subsection defines `(physical_ms, counter)` +
      the full **4-case receive rule + local-event rule** (not a gloss, R2) + the causal-ordering property (BR-2) +
      the skew failure it fixes + the Yjs scope bound (R3).
- [ ] **Tie-break fixed (BR-4):** L376's "keep local (arbitrary)" is replaced by the **global** rule
      (**lexicographically-higher `_sync_device_id` TEXT** wins — preflight #1); the `mergeFieldLWW` snippet's
      tie-break comment matches. No permanent-divergence path survives in the doc.
- [ ] **Deletes closed (BR-9 / B3):** §6.3's "row deleted vs edited" edge case (L419) orders by the **HLC
      field-timestamps**, not raw wall-clock `deleted_at`; soft-delete stated as field-level LWW under the same clock.
      No residual wall-clock comparison survives in the delete path.
- [ ] **BR-1 coverage:** the fix explicitly governs **both** `_sync_lww_ts` (row) and `_sync_field_ts` (per field) —
      not one column.
- [ ] **BR-3 "logical" is true + defined:** SU-2, CLAUDE.md L186, and ADR-002 use "logical (HLC)" with a definition
      reachable from each (pointer to ADR-003 §6.1). "Logical" is never a bare, undefined adjective next to wall-clock.
- [ ] **BR-5 local-first/ZK intact + honestly bounded (B1/N3):** the docs state the clock's *ordering* is client-side
      and the server gains no new **arbiter authority**; the stamp is already server-visible/stored (`blob_index`
      §9.4, `SyncBlobHeader` `types/sync.ts:45,49`); "adds no visibility" is stated as **contingent on a comparable
      representation**, not asserted unconditionally; the server-timestamp option is rejected-on-architecture (D4-b).
- [ ] **BR-6 honest interim (3 items):** the docs mark all three interim carriers — `repository.ts:234` `Date.now()`,
      the empty `sync/` stubs (N2), and `types/sync.ts:23`'s "Logical" comment (B4) — as v0, corrected at build; no
      doc implies the correct clock already ships.
- [ ] **BR-7 / D5 boundary + B2:** **no DDL / owed tables** added to ADR-002's body; the HLC storage representation
      is stated as an **open build-phase choice** (string / BigInt / two-column — NOT a free INTEGER pack, R1) that is
      **coupled to the wire header + `blob_index`** (not claimed cleanly separate from F10's surface); **zero code**
      (`packages/` diff = 0 — the `types/sync.ts:23` comment is inventoried, not edited this session).
- [ ] **BR-8 / Part F:** **no new PC/INT**; only SU-2's wording sharpened; the reasoning (existing-PC-repair, not
      new-rule) is present. INT-1a/INT-2/PC-1…PC-4/PC-2a untouched.
- [ ] **F10 boundary:** F6 does **not** touch cross-blob causal/FK ordering or JSON-ordered-field strategy; the
      report notes the clock ships in the sync-engine build alongside (not inside) F10.
- [ ] **Report reconciled:** F6 ticked in the resolution log with D4 + adversarial catches; build items (HLC module,
      `ts()`→`hlc.now()`, field-lww tiebreak, packed representation) recorded, F10 cross-ref present.
- [ ] **Grep verify:** `grep -rn "Date.now\|logical\|HLC\|hybrid logical\|_sync_lww_ts\|_sync_field_ts" docs/core
      CLAUDE.md` shows a coherent HLC story across ADR-002 §3 / ADR-003 §10.1/§4.1/§6.1/§6.3 / SU-2 / CLAUDE.md; the
      only `Date.now()` mentions remaining in a stamping role are explicitly labeled **interim v0**. Separately,
      `grep -rni "logical" packages/types/src/sync.ts packages/core/src/db` confirms the code label still exists **and
      is inventoried** in BR-6 (not silently edited — `packages/` diff = 0).

---

## §5. Implementation prompt (after Approval 2)

Edit, in order:
1. **ADR-003 §6.1** (the clock's home) — add the "Hybrid Logical Clock" subsection (definition + **full 4-case
   receive rule + local-event rule** + causal property + skew failure it fixes + Yjs scope bound); fix the L376
   tie-break to the **lexicographic-TEXT device-id** rule; update the `mergeFieldLWW` snippet's tie-break comment;
   **reconcile §6.3's delete-vs-edit edge case (L419)** to order by HLC field-timestamps not raw `deleted_at` (BR-9);
   add the 3-item interim inventory note.
2. **ADR-003 §10.1 push flow + §4.1 header** — L653/L655 stamp via `hlc.now()`; §4.1 L137 note = HLC values (ZK
   argument unchanged) + pointer to the §9.4 `blob_index` representation coupling (B1).
3. **ADR-002 §3** — L134 comment (HLC-precise, keep "logical"); L141 (`hlc.now()` + interim `Date.now()` v0 note);
   L143 (highest HLC + device-id tiebreak). **No** column-type/DDL change.
4. **`business-rules.md` SU-2 (L29)** — sharpen "logical timestamps" → "hybrid logical clock (HLC) … causal … device-id
   tiebreak," `[FACT]` ref ADR-003 §6.1. No new rule.
5. **`CLAUDE.md` L186** — "logical (hybrid logical clock) timestamps."
6. **report** — tick F6 in the resolution log (D4 + adversarial catches B1–B4 + N1–N4); record the 6 build items +
   F10 cross-ref + wire/server coupling.
Then **Verify** (grep + read): the acceptance greps are coherent; no "logical + uncorrected Date.now()" pair survives
in the docs; tie-break is global lexicographic-TEXT; delete path has no raw-wall-clock comparison; `types/sync.ts:23`
label still present **and inventoried** (BR-6); ADR-002 column type untouched + `packages/` diff = 0.

---

## §6. Decisions (Approval 1 — pending Victor)

**This is a foundational data-integrity call — the fork is real (unlike F1/F2/F3, where the direction was largely
forced). Laid out in full per your sign-off preference for foundational decisions.**

- **D4 (direction) — RECOMMEND (A) Hybrid Logical Clock.** Three options were on the table (report L105 offered A
  and B):
  - **(A) HLC — RECOMMENDED.** Fixes the silent-loss bug (BR-2 causal ordering), preserves local-first + ZK + dumb
    relay (BR-5), and **makes the constitution's "logical" promise true** (BR-3) — one fix closes both the correctness
    and the honesty defect. Cost: a small build-phase HLC module + merge-time clock update + a real storage
    representation (string / BigInt / two-column — *not* a free INTEGER pack; it couples to the wire header +
    `blob_index`, B1). Single-user makes the *runtime* cheap (no Byzantine actors; counter rarely advances).
  - **(B) Server-timestamp reconciliation — REJECT on architecture.** Server stamps order on receipt. It (1) does
    **not** remove the problem — offline concurrent edits still need a client tiebreak; (2) makes the server the
    **order arbiter**, breaking ADR-001/003's *"device is source of truth, server is a dumb relay."* Contradicts the
    constitution, not just taste.
  - **(C) Honest wall-clock — REJECT as insufficient.** Relabel the field "wall-clock," drop "logical," add a
    device-id tiebreak, accept skew loss. Cheapest (no clock build). But it **knowingly ships silent, permanent data
    loss** on a life-management OS whose #1 promise is "all writes succeed locally." The asymmetry — a small build
    cost now vs. irreversible loss of years of personal data later — kills it. This is the "honest but do-nothing"
    floor; honesty without the fix is not enough for 🟡-load-bearing.
  **My push: (A).** If you want the absolute-minimum-churn path and accept the risk, (C) is defensible for strict
  single-user — but I'd be recommending against my own read of the data-loss asymmetry. Your call.
- **D4-a — RECOMMEND:** the clock governs **both** `_sync_lww_ts` and every `_sync_field_ts` value (BR-1); ADR-003
  §6.1 is its canonical home; ADR-002 §3 + the push flow point there.
- **D4-b — RECOMMEND:** **global device-id tiebreak** replaces ADR-003 L376's "keep local" (BR-4) — fixes a real
  permanent-divergence path, independent of which clock model wins.
- **D4-c — RECOMMEND:** **no new PC**; sharpen the **existing** SU-2 (+ CLAUDE.md L186) to define "logical" = HLC
  (BR-8/Part F). Contrast F1/F2 (new invariants) and F3 (subsystem-local).
- **D4-d — RECOMMEND (D5 boundary):** **doc-only**; the clock *model* (HLC) is decided now, but its *storage
  representation* is **build-phase** — a naive pack into the existing INTEGER overflows JS's 2⁵³ (R1), so build picks
  string / BigInt-column / two-column (possibly a schema change). The HLC module + `ts()`→`hlc.now()` + field-lww
  tiebreak + representation are **build-phase**, tracked in the report + cross-ref'd to F10. `repository.ts`
  `Date.now()` stays as the flagged interim v0.

## §7. Status
- [x] Spec written (gate 1)
- [x] /critique run → **REVISE (R1/R2/R3)** → all fixed. **R1** = packing math wrong (`physical_ms × 2ᵏ` overflows
      JS 2⁵³ *now*, not year 6000) → representation demoted to build-phase (string/BigInt/two-column), which
      *strengthens* D5; **R2** = §3/Part C now carry the full HLC 4-case receive rule, not the gloss; **R3** = Yjs
      scope bound added (HLC governs structured LWW only; page content is Yjs/clock-free).
- [x] Approval 1 — **D4 / D4-a / D4-b / D4-c / D4-d RATIFIED by Victor 2026-07-17**
- [x] /preflight → **PASSED** (3 assumptions surfaced; #1 folded in — device-id tiebreak = lexicographic TEXT,
      stated in §6.1; #2/#3 non-blocking)
- [x] Independent adversarial critique (fresh refuter, given the source files) → **REVISE** → all closed. **Core HLC
      decision survived** (algorithm confirmed canonically correct incl. backwards-clock case; convergence confirmed;
      R1 overflow math confirmed). Catches, all verified against source before accepting:
      - **B1** (real) — the HLC *representation* is **not** a pure client-side detail: `_sync_lww_ts`/`field_timestamps`
        are on the plaintext wire header (`types/sync.ts:45,49`) **and** stored in the server `blob_index` (§9.4
        `sync_lww_ts INTEGER`/`field_timestamps TEXT`) → a string/two-column encoding changes both. → BR-5/BR-7/Part B
        regrounded; "adds no visibility" made contingent on a comparable representation.
      - **B2** (real, honesty) — the representation half of D4 shares F10's wire/server surface → dropped the "clean
        physical separation from F10" claim; this session stays doc-only, build-coupling stated honestly.
      - **B3** (real hole) — §6.3 delete-vs-edit compared **raw wall-clock `deleted_at`** = the same skew bug. →
        **BR-9** added: deletes order by the HLC field-timestamp (`_sync_field_ts['deleted_at']`); §6.3 reconciled.
      - **B4** (real, scoped) — `types/sync.ts:23` carries the identical "Logical timestamp" comment. Editing it now
        (while `repository.ts` still writes `Date.now()`) would invert the lie → inventoried as interim (BR-6),
        corrected at the build swap; BR-3 scoped to docs+constitution this session; `packages/` diff still 0.
        (The agent's parallel claim about `schema.ts:26` was **refuted** — no "logical" label there.)
      - **N1** push flow is **§10.1** not "§3" (relabeled throughout) · **N2** `sync/field-lww.ts` is the ADR's
        *proposed* path, not a file — real dir has 0-byte stubs (reworded) · **N3** BR-5 server-invariance was an
        inference → regrounded on §9.4 + labeled contingent · **N4** `updated_at`-stays-wall-ms + HLC-state
        persistence named as owed build items.
- [x] Approval 2 — **RATIFIED by Victor 2026-07-17** (B1–B4 folded; B3 delete-scope addition explicitly signed off;
      no direction change; core HLC + D4-a…D4-d intact)
- [x] **Implement + Verify — DONE 2026-07-17.** 6 docs edited (ADR-003 §6.1 HLC subsection [full local + 4-case
      receive rule + causal + skew failure + Yjs bound + representation/interim notes] · `mergeFieldLWW` snippet HLC
      compare + device-id tiebreak · §6.3 delete case · §10.1 push flow · §4.1 header · §17 schema note · ADR-002 §3
      L134/L141/L143 · business-rules SU-2 · CLAUDE.md L186 · report F6 entry). **Verify caught 2 drift misses the
      spec hadn't enumerated** (gate working, as F3's Verify caught README drift): (1) ADR-002 **§Sync-Flow L1215** —
      a *second* `_sync_lww_ts = Date.now()` stamping line → `hlc.now()` + interim note; (2) **`docs/core/architecture/
      data-flow.md`** L58/L60/L208 — the as-built data-flow doc → kept `Date.now()` (accurate to current code) but
      annotated **interim v0 → HLC target (ADR-003 §6.1)**, honest to its as-built type rather than made to lie the
      other way. **Verify PASS:** no unlabeled stamping `Date.now()` remains in docs/core; delete path has no raw
      wall-clock comparison; `types/sync.ts:23` "Logical" label present **and inventoried** (BR-6); ADR-002 column
      type intact; `packages/` diff = **0** (D4-d, zero code). §XXIX Currency Rule **N/A** (foundation profile, no
      code module — the ADRs *are* the durable docs, per F1/F2/F3).
