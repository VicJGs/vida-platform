# PLAN — F1/D1: Guarded-write + idempotency mechanism

**Unit:** ADR revision F1 (the deepest gap, throughline ②)
**Gate:** §XXVI full Per-Step Build Gate — this file = gate 1 (the SPEC)
**Owner ADR:** ADR-004 (Session Framework) · inherited by ADR-008, ADR-010 · constitution: business-rules
**Source of truth read (Step 1a):** ADR-004 §3.2 dims 2+4 · ADR-008 §anatomy part 5 + Builds-on · ADR-010 §3.3.2/3.3.3 + §2 · business-rules INT-1
**Decision record:** `docs/reviews/2026-07-15-adr-critique-gate.md` F1/D1

---

## §1. Context — the gap (grounded, not paraphrased)

Cross-module writes in the OS are called **Effects** (ADR-004 §3.2 dim 2) and capability **emitted signals** (ADR-008 anatomy part 5). Two properties are **asserted but never specified**, and the delegation to specify them **loops and dead-ends**:

- **Guarded-write** — ADR-004 §3.2 dim 2: *"Effects go through each target module's documented write API — never a direct table write."* → "documented write API" is **named, never defined**.
- **No double-count** — ADR-004 §3.2 dim 4: *"no double-count (one XP / one habit-occurrence per event)."* → an **assertion with no idempotency mechanism**.
- **ADR-008** part 5 (L64-66): writes *"only through the target module's documented write API… under ADR-004 §3.2.4's guarded-write discipline"* → **inherits** the assertion.
- **ADR-010** §3.3.2 (guarded-write) + §3.3.3 (*"no double-count — enforced at the write API, as for sessions (ADR-004 §3.2.4)"*) → **enforces** a mechanism that its upstream never defined.
- **INT-1 mis-citation** — ADR-008/010 cite **INT-1** as the guarded-write source. But INT-1 (business-rules:50) is a **connection/read** rule (*connect via `pages`+`entity_links`; no direct cross-table reads*). It does **not** define a write contract. The write rule is attributed to a rule that isn't about writes.

**Two consequences (from the report):**
1. **ADR-010 over-claims** the corruption bound — it can enforce "user code can't bypass the API," but not "the API is idempotent," because that mechanism exists nowhere.
2. **Shipped capabilities run outside the ADR-010 sandbox** → their write-discipline is **honor-system**, unenforced by design.

**No-Guessing labels:** everything in §1 is `[FACT]` (read from the cited ADR lines this session). The design in §3 is `[DECISION]` (new, needs Approval).

---

## §2. Invariants this unit must satisfy (business rules)

- **BR-1 (single write path).** For any cross-module effect, the **owning module's documented service method is the only code that writes that module's tables.** No session, capability (shipped or user), or other module issues a direct table write across a module boundary.
- **BR-2 (idempotent effects).** Applying the same lifecycle event's effect twice produces the **same state as applying it once** — "no double-count" holds *mechanically*, not by assertion. Scoped honestly: F1 closes **same-device replay** unconditionally; **cross-device** convergence is *enabled* by the deterministic key (§3B.1) but *enforced* by the sync layer (F10) — see BR-6.
- **BR-3 (fail closed).** A handler call that fails validation (scope, consent, payload) **rejects with no partial write**.
- **BR-4 (no trust exemption for the contract).** Shipped and user code obey the **same** write contract (BR-1/BR-2). Trust tier changes *how enforcement is achieved*, never *whether the contract applies*.
- **BR-5 (effects fire at origin, not on sync-receipt).** Effects are applied by the device that **originates** the lifecycle event; a device that **receives** a synced output row never re-fires effects. (Two devices can still each *originate* a distinct event for the same semantic outcome while offline — that convergence is BR-6, not this rule.)
- **BR-6 (cross-device convergence via a deterministic key).** Because `effect_event_id` is **deterministic** (derived from the semantic event's stable identity — §3B.1), two devices that independently originate the *same* semantic outcome compute the *same* id. Every effect's **output row carries `effect_event_id` as a UNIQUE column**; on sync, the collision converges the two to one outcome. This covers **both** keyed effects (a habit-occurrence) **and additive effects** (`award_xp`, `log_time`) — the additive ones have no other natural key, so the deterministic id *is* their convergence key. The **enforcement** of that collision-merge is a sync-layer concern (`[FLAG → F10]`); F1 supplies the deterministic key that makes it *possible* and states the requirement.
- **BR-7 (effect-type taxonomy — not every effect writes).** The effect catalogue splits three ways; the idempotency machinery applies per class (see §3B table). **Write-effects** carry the id + ledger + UNIQUE output column. **Projection-effects** (`surface_journal`, `surface_calendar`) **write no row** — the Journal/Calendar are *pull-aggregated* at render (`journals/contract.md:18`), so they are idempotent **by construction** and carry no id/ledger. Applying them "twice" mutates nothing.

---

## §3. Design — the mechanism (`[DECISION]`)

### Part A — The write-API contract (grounds "documented module write API")
1. Each effect-receiving module exposes a set of **effect handlers** = named service methods in `packages/core/services/<module>` (e.g. `gamification.awardXp`, `habits.completeOccurrence`, `finance.emitMeasurement`). **This set IS the module's "documented write API" for effects.**
2. A **routing registry** maps each declared effect-type (the §3.2 dim-2 catalogue) → exactly one handler. "Documented" = present in this registry. An effect with no registered handler **fails closed** (never a silent drop).
3. Each handler **validates** caller scope/binding, permission envelope (sensitive-module consent), and payload (Zod) before any write; failure ⇒ BR-3.
4. **Single-write-path invariant (BR-1):** these handlers are the only cross-boundary writers of the module's tables.

### Part B — Idempotency (grounds "no double-count")

**Effect taxonomy first (BR-7) — the machinery is per-class, not uniform:**

| Class | Effect types | Writes a row? | Idempotency |
|---|---|---|---|
| **Keyed write** | `complete_habit_occurrence` · `contribute_purpose_metric` · `emit_measurement_signal` | yes, once-per-`(subject, period)` | deterministic id + ledger (replay) + UNIQUE domain key **and** UNIQUE `effect_event_id` on the output row (cross-device) |
| **Additive write** | `award_xp` · `log_time` | yes, append (no domain natural key) | deterministic id + ledger (replay) + UNIQUE `effect_event_id` on the output row (this **is** their only convergence key, BR-6) |
| **Projection** | `surface_journal` · `surface_calendar` | **no** — pull-aggregated at render | idempotent **by construction**; no id, no ledger, out of scope (BR-7) |
| **Intra-realm** | `attach_pomodoro` | yes, within Sessions realm | same handler-registry path — **no direct-write exemption for being same-owner** (N2); deterministic id from the timer/session |

1. **`effect_event_id` — DETERMINISTIC, not random.** It is **derived from the semantic event's stable identity**, e.g. `derive(subject_natural_key, transition, effect_type)` — `derive(habit_id ‖ date, "completed", "award_xp")`, `derive(session_id, "completed", "log_time")`. Two devices originating the *same* outcome compute the *same* id ⇒ cross-device convergence (BR-6); a retry recomputes the same id ⇒ replay-dedup (BR-2). It identifies the **event**, not the effect; one event fans out to N effects, each keyed `(effect_event_id, effect_type, target_ref)`. **Persisted as a UNIQUE column on each output row** (so the sync layer can converge collisions). *(Rationale: a random UUIDv7 would make every re-origination look distinct — the exact multi-device double-count hole B3. Determinism is load-bearing.)*
2. **Dedup ledger** — a new table `applied_effects`:
   ```
   applied_effects (
     effect_event_id TEXT NOT NULL,
     effect_type     TEXT NOT NULL,
     target_ref      TEXT NOT NULL,
     applied_at      INTEGER NOT NULL,   -- Date.now()
     PRIMARY KEY (effect_event_id, effect_type, target_ref)
   )
   ```
   Before applying, the handler **checks-and-inserts the ledger key in the same local transaction as the write**; a PK conflict ⇒ the effect is a **no-op** (already applied). ⇒ BR-2.
3. **Replay sources defended (BR-2):** offline-queue flush + retry (ADR-003), crash mid-apply then re-run, any accidental double-dispatch. Because dedup is **content-keyed (did we apply THIS event?)**, it is **robust under clock skew** — independent of the LWW clock (relevant to F6: this idempotency is orthogonal to the clock fix).
3. **Replay sources defended (BR-2):** offline-queue flush + retry (ADR-003), crash mid-apply then re-run, any accidental double-dispatch. Content-keyed dedup ⇒ **robust under clock skew** (orthogonal to F6).
4. **Two idempotency layers — one deterministic key drives both:**
   - **Replay** (same device, same event, BR-2) → the local `applied_effects` ledger above. Closed by F1 unconditionally.
   - **Cross-device** (two devices, same outcome, BR-6) → the **UNIQUE `effect_event_id` column on the output row**; because the id is deterministic, both devices write the same value → sync-time collision converges them. `[FLAG → F10]` the collision-**merge** (constraint-violation-on-apply → merge, not error) is owned by the sync conflict-handling design; F1 supplies the deterministic key + the UNIQUE requirement that make convergence *possible*, and does **not** claim to enforce the merge itself. **This is the honest bound: F1 closes same-device double-count; F10 closes cross-device.**
   - Where a domain natural key *also* exists (`UNIQUE(habit_id, date)`), keep it — it is a second, semantically-meaningful convergence key. Additive effects (`award_xp`, `log_time`) have **only** the `effect_event_id` key (BR-6).
5. **Ledger scope → `[DECISION D1-a, ratified]`:** `applied_effects` is **local-only** (like `sync_queue`, ADR-002 §NOT-synced). It defends *replay* (local); *cross-device* convergence rides the synced output rows' UNIQUE `effect_event_id` (BR-6), not a synced ledger — so the ledger never needs to sync. Determinism (§3B.1) is what lets the local ledger stay local without reopening B3. Revisit only if a future feature applies the same id on >1 device *without* a synced output row.

### Part C — Shipped capabilities are not exempt (closes the honor-system hole)
1. The contract (A+B) binds **all** effect producers — session Effects, shipped capabilities, user capabilities. No honor-system tier for the *contract* (BR-4).
2. **Enforcement differs by trust tier, contract does not:**
   - **User-authored** (ADR-010): the sandbox gives **no ambient DB access**; the only channel is the mediated capability API → the same handlers. **Bypass impossible by construction.**
   - **Shipped** (trusted, in-process): bound by the **same single-write-path invariant**, enforced by (a) the effect handlers being the only exported cross-module write surface, (b) code review, and (c) `[DECISION D1-c]` a **dev/test guard** that fails CI if a module directly writes another module's tables. **Structural + review-enforced, not honor-system.**
3. **ADR-010 corruption bound restated honestly:** the sandbox guarantees user code *cannot bypass* the API; the API's *idempotency* (Part B) guarantees no-double-count — and that property **now exists**, so the bound is real for **both** tiers.

### Part D — Delegation fixed (the chain terminates)
0. **N1 — number the dimensions first.** ADR-004 §3.2's four dimensions are currently list-items 1–4 (L55-67), so inbound "§3.2.4" cites are ambiguous (they mean *dimension 4*, but the guarded-write text is in *dimension 2*). Promote them to real subsection headers **§3.2.1 Attachment · §3.2.2 Effects · §3.2.3 Lifecycle · §3.2.4 Permissions** so the new §3.2.5 is a coherent sibling and every cite resolves unambiguously.
1. **ADR-004 §3.2** gains **§3.2.5 "The write-API contract + idempotency"** (Parts A+B+C). ADR-004 becomes the **owner**.
2. **ADR-008** part 5 + Builds-on: "under ADR-004 §3.2.4's guarded-write discipline" → "under ADR-004 **§3.2.5's write-API contract + idempotency**" (inherits the *mechanism*).
3. **ADR-010** §3.3.2/3.3.3 point at §3.2.5; §3.3.3 "enforced at the write API" now references a real mechanism; §2 corruption bound restated per Part C.
4. **business-rules `[DECISION D1-b, ratified]`:** add a **new write-discipline invariant INT-2** — the **general** rule: *"every cross-module effect writes only via the owning module's documented service method (the single write path), idempotent per a deterministic `effect_event_id`; binds shipped and user code alike."* **N4:** word it so **PC-3 *specializes* INT-2 for untrusted code** (PC-3 already says capabilities run "guarded-write only, no double-count") — cross-link, don't duplicate. ADRs cite **INT-2** for the write rule; **INT-1 stays** about connection/reads.
5. **ADR-002:** add to the owed-tables ledger (no DDL into the stale body — respects D5 deferral): (a) `applied_effects` (local-only dedup ledger); (b) an **`effect_event_id` column (deterministic) on effect-triggering rows**; (c) a **UNIQUE `effect_event_id` column on each effect *output* row** (the cross-device convergence key, BR-6) + any domain natural keys where they exist; projection-effects (`surface_journal/calendar`) add nothing. Specific keys settle per-module at build.
6. **B4 — ground the feature-tier hinge, not every mention.** Feature docs mostly cite **SS-6** (Sessions' own guarded-write/permission rule) — the correct feature-tier specialization — plus a few *direct* `ADR-004 §3.2 dim-4` / "documented write API" cites (`pomodoro/contract.md:35`, `pomodoro/business-rules.md:56`, `pomodoro/conventions.md:20`). Fix: **(a)** at SS-6's *definition* (in `docs/features/sessions-and-scheduling/business-rules.md`), add the grounding cite → §3.2.5/INT-2, so every downstream "inherit SS-6" is transitively grounded; **(b)** repoint the ~3 direct dim-4/write-API cites to §3.2.5. Do **not** rewrite every SS-6 mention — SS-6 is a legitimate local rule. §4's "no dangling cite" is scoped to **ADR/constitution tier + SS-6's definition + the direct cites**; a `docs/features/**` Verify grep confirms the rest route through SS-6.

---

## §4. Acceptance

- [ ] ADR-004 §3.2's dimensions are numbered §3.2.1–§3.2.4 (N1); §3.2.5 exists and specifies Parts A+B+C — a builder can implement the write API + ledger from it with no further design.
- [ ] §3.2.5 carries the **effect taxonomy** (BR-7): write / additive / projection / intra-realm — so no builder tries to mint a ledger key for a projection effect (B1) or expects a domain key for an additive one (B2).
- [ ] `effect_event_id` is specified as **deterministic** (§3B.1); the **multi-device additive double-count (B3)** is honestly bounded — F1 closes same-device replay, F10 owns cross-device merge — with **no prose implying a full global guarantee**.
- [ ] ADR-008 + ADR-010 **inherit by reference** to §3.2.5 — no re-assertion; the loop `010→008→004→010` is broken (004 terminates it).
- [ ] INT-1 mis-citation corrected: write rule cites **INT-2**; INT-2 worded as the general rule that **PC-3 specializes** (N4); INT-1 unchanged.
- [ ] ADR-010 §2 corruption bound no longer over-claims (honest per Part C).
- [ ] `applied_effects` + the two `effect_event_id` columns appear in ADR-002's owed-tables ledger, marked local-only / UNIQUE-output; no DDL added to the stale body.
- [ ] **B4:** the four feature-doc cites repointed; a `docs/features/**` Verify grep shows no lingering guarded-write cite at any tier.
- [ ] Three decisions (D1-a, D1-b, D1-c) ratified (done); zero code changed; build-time items (CI guard, ledger DDL) tracked, not built.

## §5. Implementation prompt (after Approval 2)

Edit, in order: (1) ADR-004 — number dims §3.2.1–4 (N1), insert §3.2.5 (taxonomy + Parts A/B/C), point §3.2.4's no-double-count line at §3.2.5; (2) business-rules — add INT-2 (general; PC-3 specializes), cross-link PC-3, add Change Log row; (3) ADR-008 — repoint part 5 + Builds-on to §3.2.5/INT-2 (keep the §3.2.2 effects-catalogue cite); (4) ADR-010 — repoint §3.3.2 (INT-1→INT-2) + §3.3.3 (§3.2.4→§3.2.5) + Builds-on + the §2 `[FACT]` cite, restate §2 corruption bound per Part C; (5) ADR-002 — add `applied_effects` + the two `effect_event_id` columns to the owed-tables note; (6) feature docs — repoint the four B4 cites; (7) report — tick F1 in the resolution log. Then Verify: grep `docs/**` for lingering `§3.2.4`-as-guarded-write + `INT-1`-as-write cites; confirm no doc at any tier re-asserts the mechanism.

---

## §6. Decisions (RATIFIED by Victor 2026-07-16)
- **D1-a** ✅ — `applied_effects` **local-only** (cross-device rides synced output rows' UNIQUE `effect_event_id`).
- **D1-b** ✅ — introduce **INT-2** write invariant; **PC-3 specializes it** for untrusted code.
- **D1-c** ✅ — **CI direct-write guard** for shipped code, tracked-for-build.

## §7. Status — IMPLEMENTED + VERIFIED 2026-07-16
Full §XXVI gate run: PLAN → /critique → Approval 1 (D1-a/b/c) → /preflight → **independent adversarial critique** (REVISE: B1 projection-effects · B2 additive-no-key · B3 multi-device double-count · B4 feature-doc cites · N1 dim-headers · N4 INT-2/PC-3) → all closed → Approval 2 → 7-step implement → Verify grep (no lingering §3.2.4-as-mechanism / INT-1-as-write cite; loop broken). Zero code changed. Build-time items tracked: `derive()` hash, CI guard, sync collision-merge (F10).
