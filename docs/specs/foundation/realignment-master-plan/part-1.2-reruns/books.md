# Re-run PLAN — books (Part 1.2, Tier-2 · mixed case + S1 reframe)

**Type:** doc-realignment unit PLAN (LITE gate — §XXVI LITE variant; non-code scenario).
**Status:** 🟢 CRITIQUE-CLEAN — independent adversarial critic (fresh code-aware subagent, prompted to refute) → **SHIP / 0 blocking** (8th consecutive clean unit); all three sharpest calls ruled **CORRECT**: the **S1 reframe** (framework L79 lists `reading_sessions` AND `study_sessions` as *separate* base-`sessions` extensions + retires "`reading_session` standalone" → BK-10's "never a `study_session` reuse" survives verbatim; mode-adaptive capture becomes extension columns, base carries the shared spine), the **two R6 reframes** (the sweep's "clean of live retired tokens" genuinely understated it — both anti-signals live), and **AI4-NA** (OCR/TTS/transcription = scoped model calls, not agentic; the auto-write transcription probe explicitly ruled non-agentic). Every X3/X11/AI5 verbatim hit + all guards (C-E2/C-M1/C-POS/C-PART) grep-verified. **1 note folded (N1):** the `books.progress` cite was off by one (`:650`, not `:649` = `current_page`) — corrected across the PLAN. **✅ IMPLEMENTED — edits live across all 5 aspects; re-verified by the Part-1 EXIT gate (2026-07-25); LITE gate closed.**
**Date:** 2026-07-24 · **Session:** build-roadmap-resequence (foundation-realignment campaign, Part 1.2).
**Context:** `docs/features/books/` (5 aspect files: identity, structure-data, business-rules, contract, conventions).
**Verdict (sweep):** **gap** (row 10) — drivers **014, 015, 011, 006, 004**. *("Clean of live retired tokens, but heavy ingest+AI+measurement module naming none of X*/AI*/M*; `reading_sessions`↔`sessions` supertype linkage not stated in-doc.")*
**Grounded in:** `staleness-sweep.md` (row 10 + Tier-2 order), `capability-framework.md` §3 ADR-014 (X1–X11) / ADR-015 (AI1–AI6) / ADR-011 (M1/M2/M3) / ADR-006 (SP1) / ADR-004 (S1) + §4 applies-to (ingest L245, AI L246, **S1 timed-activity L234** name Books; pursuable L240 + feeder L242 do **NOT**) + §5, **all 5** current aspect docs, **and the live schema** (`books:641`, `book_chapters:661`; grepped this session).
**No-Guessing:** every forward token below is one the framework/ADR actually names (cited); no invented tokens. **This is a MIXED case, NOT the "clean" the sweep claimed** — grep confirms the live `books` table carries **inline `tags` `[E]` (`schema.ts:657`)** + **`progress NOT NULL DEFAULT 0` (`:650`)**, both live anti-signals → R6 two-tier; and the S1 predicate names **"`reading_session` standalone" as a retired form**, so BK-10's "Books' own entity" is a soft anti-signal → S1 reframe. No other retired tokens (`page_tags`/`xp_history`/`grant_currency` absent). Code/directory homes + the entity-family DDL + the base-`sessions` extension + `import_staging`/`ai_connections`/grant-field wiring + the ADR-002 amendment are `[DEFERRED — Part 2 / build phase]`.

---

## §1. Context — why this re-run, and the true shape

Books is the OS's **reading Universe** — an own module (extracted from Learning 2026-07-03, B1–B16) with a rich intended family (assets, 3 annotation types, reading sessions, adaptive plans, cross-format mapping, an Education partition). Its **live floor is 2 tables** (`books`, `book_chapters`); the rest is `[INTENT]`.

**The sweep's "clean of live retired tokens" is wrong** (the learning/education lesson — grep the schema floor): the live `books` table has **inline `tags` `[E]`** (SP1 anti-signal) + **`progress NOT NULL DEFAULT 0`** (M3 anti-signal). The docs already *flag* these as superseded (structure-data L12-14; BK-3, BK-16) — but name no framework token. So books is a **mixed case**: 2 live-FACT R6 reframes + an **S1 reframe** (the sweep's named `reading_sessions`↔`sessions` gap) + additive X*/AI*/M1-M2 layering. It **inherits the skills X*/AI* pattern** (ISBN public-reference + OCR/AI split) **and the skills S1 pattern** (session sub-type + extension).

**Ground-truth refinement (read all 5 aspects + the schema):**

| Cap | Framework token (owning ADR) | Present today? | Fix shape |
|---|---|---|---|
| **S1 (004)** | base `sessions` (`sub_type`) + 1:1 extension keyed `session_id`; framework names **`reading_sessions`** as the form AND **"`reading_session` standalone" as RETIRED** | **SOFT ANTI-SIGNAL** — BK-10 "Reading sessions are Books' **own entity**… Never a `study_session` reuse" (business-rules L44); identity L27, structure-data L24, contract L23 all frame it standalone | **reframe in `[INTENT]`** → `reading_sessions` = base `sessions` `sub_type='reading'` + a 1:1 **Books-owned extension** keyed `session_id`. **BK-10's "not a `study_session` reuse" STAYS TRUE** (reading ≠ study — both are distinct sub-types with their own extensions; the framework agrees) |
| **SP1 (006)** | `entity_tags` primitive | **WRONG-MODEL (live FACT)** — inline `books.tags` `[E]` (`schema.ts:657`) + `books.genre`; BK-16 "shared scoped tags… supersedes `books.genre`/`tags`" | **retire in `[INTENT]`** → `entity_tags` (Books-scoped); As-is inline kept as floor. R6 two-tier |
| **M3 (011)** | stored progress = nullable override (`NULL ⇒ derive`) | **WRONG-MODEL (live FACT)** — `books.progress NOT NULL DEFAULT 0` (`schema.ts:650`); BK-3 "unified progress derives… supersedes `books.current_page`/`progress`" | **retire the anti-signal in `[INTENT]`** → nullable override + derived-on-read; As-is column kept as floor. R6 two-tier |
| **M1/M2 (011)** | pursuable carries `measurement_kind` × `binding_mode` | **GAP (light)** — reading has goals/targets (BK-11 reading plans) + a unified-progress measure, naming no M token | **light add (disclosed membership)** — the unified reading progress is a `quantitative` × `derived-pull` measure; the pursuable **reading-plan goal** (BK-11) carries M1/M2 (a target). Books not in L240 — disclosed |
| **X1–X11 (014)** | device-mediated ingest, layers, whole-set, grant, split | **GAP** — ISBN/metadata lookup (BK-9/BK-14, `lookupBook`) named a "governed convenience" but no X token; framework X3 names **"Books ISBN" verbatim** | **gap-add** — ISBN lookup = X1 device-mediated + **X2 `public-reference`** + X3 (Books ISBN dataset) under `external_in_ok` (X5), X9 revoke; OCR/TTS/transcription split via **X11** ("Books OCR" verbatim) |
| **AI1–AI6 (015)** | modes, egress+scope-min, injection-bounding, provenance | **GAP** — TTS/transcription/OCR (BK-14, BK-4) named "opt-in" with no AI token | **gap-add** — AI1 `on_device`/`cloud`; AI3 cloud=egress+scope-min; **AI5 (OCR page is untrusted-origin — framework names "OCR page" verbatim)**; AI6 `source=ai` on OCR/AI-derived rows. **AI4 disclosed NA** (OCR/TTS/transcription = scoped model calls, not a Projects agent) |

**Fix shape:** a **mixed** unit — **2 live-FACT R6 reframes** (SP1 `books.tags`, M3 `books.progress`) + **an S1 reframe** (`reading_sessions` standalone → base-sessions sub-type + extension — the 004 driver) + **X*/AI* layering** (ISBN = X1/X2-public-reference/X3/X5; OCR/TTS = X11 → AI1/AI3/AI5/AI6) + light M1/M2. **No E2** (Books not a feeder — reading grants ride the Sessions sub-type, not Books).

---

## §2. What changes — 2 R6 reframes + S1 reframe + X*/AI* layering + guards

### Primary A — the two live-FACT reframes (R6 two-tier; drivers 006/011)

| # | Cap | Retire (As-is FACT floor) → add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-SP1 | **inline `books.tags` (+`genre`) → `entity_tags`** | As-is FACT: `books.tags` inline `[E]` (`schema.ts:657`) + `books.genre`. `[INTENT]`: retire → **`entity_tags`** (Books-scoped; publisher/genre/category = tags per BK-16); As-is inline kept | ADR-006 §3.2 (SP1) | structure-data (L9/L12-14) · business-rules (BK-1, BK-16) · contract (L38) · conventions |
| G-M3 | **`books.progress NOT NULL DEFAULT 0` → nullable override** | As-is FACT: `books.progress NOT NULL DEFAULT 0` (`schema.ts:650`, M3 anti-signal). `[INTENT]`: retire the anti-signal → nullable override (`NULL ⇒ derive`) — unified progress derives from asset positions (BK-3); As-is column kept | ADR-011 §3.4 (M3) | structure-data (L9/L12-14/L37) · business-rules (BK-3) · conventions |

### Primary B — the S1 reframe (driver 004; the sweep's named gap)

| # | Cap | Retire (soft anti-signal) → add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-S1 | **`reading_sessions` "Books' own entity" → base-`sessions` sub-type + 1:1 extension** | Soft anti-signal: BK-10 "Books' own entity" reads toward the framework's **retired "`reading_session` standalone"**. `[INTENT]`: **`reading_sessions` = a base `sessions` row (`sub_type='reading'`) + a 1:1 Books-owned extension keyed `session_id`** (mode-adaptive capture / position-delta / photos are the extension columns) — the shared timer/scheduling/runtime rides the base. **BK-10's "Never a `study_session` reuse" STAYS TRUE** — `reading` and `study` are *distinct* sub-types, each with its own extension; the framework itself lists `reading_sessions` and `study_sessions` as separate extensions | ADR-004 §3.1 (S1) | identity (L27) · structure-data (L24) · business-rules (BK-10) · contract (L23) · conventions |

### Primary C — external-ingestion + AI layering (drivers 014/015; ISBN + OCR/TTS/transcription)

| # | Cap | Forward token to add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-X1/X2/X3/X5 | **ISBN/metadata lookup = device-mediated public-reference** | `lookupBook(isbn\|query)` fetches **on-device** (X1) from the **X2 `public-reference`** Books ISBN dataset (X3 — framework names "Books ISBN"; whole-set-vs-per-item = a build call) under `external_in_ok` (X5); manual fallback always open (BK-14) | ADR-014 §3.1/§3.2/§3.4 (X1/X2/X3/X5) | business-rules (BK-9, BK-14) · contract (`lookupBook`) · identity (L43-44) |
| G-X9 | **Revoke = stop-future, keep-imported** | revoking the lookup grant halts future fetches; already-imported metadata stays | ADR-014 §3.4 (X9) | business-rules (BK-14) |
| G-X11 | **LLM calls split to ADR-015** | OCR (page-photo), TTS, and transcription (cross-format mapping) are model pipelines: **ADR-014 moves the data, ADR-015 governs the model call** (framework names "Books OCR" verbatim) — not folded into the connector | ADR-014 §3.7 (X11) | business-rules (BK-4, BK-14, BK-15) · identity (L45-46) · contract (L42-43) |
| G-AI1/AI3 | **Two modes, server-blind + cloud egress/scope-min** | OCR/TTS/transcription offer `on_device`/`cloud` per-use modes (AI1); a cloud call sends only the needed slice (AI3, X4 egress) | ADR-015 §3.1/§3.3 (AI1/AI3) | business-rules (BK-14) · conventions |
| G-AI5 | **Prompt-injection bounding (load-bearing)** | an **OCR'd page is untrusted-origin content** (framework AI5 names "OCR page" verbatim) → provenance into any prompt; can't auto-widen scope | ADR-015 §3.4b (AI5) | business-rules (BK-10, BK-14) · conventions |
| G-AI6 | **AI-authorship provenance** | OCR-extracted / AI-derived rows (a mapped position, an extracted TOC) carry **`source=ai`** (the `manual\|ai\|import` triad) | ADR-015 §3.6 (AI6) | business-rules (BK-4, BK-10) · structure-data |

### Primary D — measurability (driver 011; light, disclosed membership)

| # | Cap | Forward token to add (`[INTENT]`) | Owning ADR (cite) | Aspect(s) |
|---|---|---|---|---|
| G-M1/M2 | **reading measure + plan-goal pursuable** | the unified reading progress is a **`quantitative`** measure with **`binding_mode`=`derived-pull`** (from asset positions/sessions, BK-3); the pursuable **reading-plan goal** (BK-11, manual/auto to a target) carries `measurement_kind` × `binding_mode` (a target). Books not in L240 — the *plan goal* is the pursuable (disclosed) | ADR-011 §3.1/§3.5 (M1/M2) | business-rules (BK-11) · structure-data · contract (`createPlan`) |

### Secondary — findings + guards surfaced by grounding

| # | Finding | Fix | Cite | Scope guard |
|---|---|---|---|---|
| C-S1 | **BK-10 "Never a `study_session` reuse" must survive the S1 reframe.** The framework lists `reading_sessions` AND `study_sessions` as **separate** base-`sessions` extensions — so naming the reading sub-type does NOT reuse `study_session`. | **Reframe to base+extension, keep BK-10's guard verbatim in intent** — the reading sub-type ≠ the study sub-type; both extend the base. The "standalone Books entity" reading is the retired form. | framework §3 S1 (L79 — lists both extensions + retires standalone) | **disclosed reframe** — the sharpest call; preserves BK-10 while fixing the anti-signal |
| C-M1 | **Books is NOT in the M1 pursuable set (L240).** | **Light M1/M2 (Primary D):** the reading measure is quantitative/derived-pull; the pursuable is the **reading-plan goal** (BK-11) — Purpose/target-owned. Do NOT assert a stored `books.measurement_kind`. **Disclosed.** | framework §4 L240; BK-11 | **membership disclosure** |
| C-AI4 | **AI4 (agentic envelope) does NOT apply** — OCR/TTS/transcription are scoped model calls (extract/convert), not a Projects-style tool-wielding agent. | **Do NOT add AI4.** The "governing principle" (BK-14) is a consent gate (X4/AI1), not an agent envelope. | framework §3 AI4 (Projects-only); BK-14 | **scope guard** — the education/skills C-AI4 mirror |
| C-E2 | **No E2** — Books is absent from the feeder list (L242); BK-10's "Gamification reads sessions" is the **Sessions sub-type** granting (Sessions IS a feeder), not Books. | **Do NOT add `grant_currency`/E2** to Books; the reading-session completion grants via its base-`sessions` sub-type (S4/E2 on Sessions), not Books. | framework §4 L242; BK-10 | **scope guard** — economy rides the session, not the book |
| C-POS | **`books.current_page` supersession is already done** (BK-3: single position → per-asset native position). | **Verify-only** — the M3 reframe is on `progress`; the position model (per-asset) is already reframed; don't re-open. | BK-3; structure-data L12-14 | **scope guard** — no double-work |
| C-PART | **The Education partition (`book_subjects`, BK-13) is Books-owned, read-across.** | **Do NOT touch** — cite the Education contract; the partition is done. | BK-13; contract L30-32 | **scope guard** — boundary held |

**Disclosed calls (critic VERIFIES, not catches):**
1. **S1 reframe (C-S1)** — BK-10's "Books' own entity" is reframed to the base-`sessions` sub-type + extension; BK-10's "not a `study_session` reuse" stays TRUE (reading ≠ study — the framework lists both extensions separately). The sharpest call — verify the reframe doesn't contradict BK-10's intent.
2. **M1/M2 membership (C-M1)** — Books absent from L240; the pursuable is the reading-plan goal (BK-11), not the book row.
3. **AI4 NA (C-AI4)** — OCR/TTS/transcription = scoped model calls.
4. **X3 whole-set-vs-per-item** — ISBN lookup is named X3 public-reference; whether the ISBN dataset bundles whole-set or queries per-item is a build call (disclosed, not decided).

**Scope guards (do NOT over-apply):**
- **R6 two-tier applies to TWO tokens + one soft-anti-signal reframe** — `books.tags` inline + `books.progress NOT NULL DEFAULT 0` (live FACTs) + the `reading_sessions` standalone framing (soft anti-signal). Everything else (M1/M2, X*/AI*) is `[INTENT]` additive.
- **Conceptual home + owning ADR only.** Every new token (`entity_tags`, `sessions`/`session_id`, `measurement_kind`, `external_in_ok`, the AI modes/provenance) is cited to its ADR; physical home `[DEFERRED — Part 2]`.
- **Cite-not-re-spec the owned substrates.** `entity_tags` = Spaces-owned; the base `sessions` + `sub_type` + `session_id` = **Sessions-owned** (Books adds only the `reading` extension columns); the measurement axes = ADR-011; `external_in_ok` = ADR-010 grant field (no new column — X5); the AI layer = ADR-014/015; the Education partition = Books-owned but reads Education's contract.
- **No E2** (C-E2), **no AI4** (C-AI4), **no stored `books.measurement_kind`** (C-M1). **No re-opening** the per-asset position model (C-POS) or the Education partition (C-PART). **No schema-level reconciliation** — the entity-family amendment / format split / consolidated DDL → build phase (ADR-016).
- **ZK-1 held** — ISBN lookup device-mediated, OCR/TTS/transcription on_device/BYO-key (never server plaintext); BK-14's governing principle IS the X4/AI1 consent gate — name the tokens it enforces.

---

## §3. Per-aspect edit map (all 5 aspects touched)

**`identity.md`**
- **G-S1** — L27-28 ("Reading sessions (Books' own entity, mode-adaptive)"): reframe → a base `sessions` `sub_type='reading'` + a Books-owned extension keyed `session_id` (ADR-004 S1); the mode-adaptive capture + photos are the extension. `[INTENT; ADR-004 S1]`
- **G-X1/X2/X3/G-X11/G-AI1** — L43-46 ("ISBN/metadata lookup is a governed convenience"; "TTS/transcription/lookup/OCR run under Books' governing principle"): name it — lookup = X1 device-mediated public-reference (X2/X3, Books ISBN) under `external_in_ok` (X5); OCR/TTS/transcription split to ADR-015 (X11), `on_device`/`cloud` (AI1), **not** an AI4 agent. `[INTENT; ADR-014 X1/X2/X3/X5/X11; ADR-015 AI1]`
- **G-SP1/G-M3** (light) — "highlights, bookmarks, quotes, notes, photos, sessions, statistics" + the progress framing: tags = `entity_tags` (SP1); unified progress derives (M3). `[INTENT; ADR-006 SP1; ADR-011 M3]`

**`structure-data.md`**
- **Keep the As-is floor** (L9): `books` (inline `tags`, `progress NOT NULL DEFAULT 0`) + `book_chapters` — but the two anti-signals are the SP1/M3 floors.
- **G-SP1/G-M3** — L12-14 (the "three superseded FACT columns"): name the targets — `books.genre`/`tags` → `entity_tags` (SP1); `books.progress` → nullable override (M3); `current_page` → per-asset native position (BK-3, already reframed — C-POS). `[INTENT; ADR-006 SP1; ADR-011 M3]`
- **G-S1** — L24 (`reading_sessions` "Books' own entity"): reframe → base `sessions` `sub_type='reading'` + 1:1 extension keyed `session_id`; the columns (time/position-delta/statistics/photos) are the extension. `[INTENT; ADR-004 S1]`
- **G-X*/AI*** — the ⚠ INTENDED family + cross-cutting (L26-30): note ISBN lookup = X1/X2-public-reference/X3/X5; OCR/mapping = X11 → AI1/AI3/AI5/AI6; auto-derived rows carry `source=ai`. `[INTENT; ADR-014/015]`
- **Named-ADR set** — extend the ADRs block (L74-80) → +004/006/011/014/015. `[INTENT]`

**`business-rules.md`**
- **G-SP1** — BK-1 (L10, `books.tags`/`genre` `[E]`) + BK-16 (L69-72, "shared scoped tags… supersedes `books.genre`/`tags`"): name `entity_tags` (SP1), Books-scoped; retire inline. `[INTENT; ADR-006 SP1]`
- **G-M3** — BK-3 (L18-21, unified progress derived, supersedes `books.progress`): the live `books.progress` → nullable override (`NULL ⇒ derive`, M3). `[INTENT; ADR-011 M3]`
- **G-S1** — BK-10 (L44-48, "Reading sessions are Books' own entity… Never a `study_session` reuse"): reframe → base `sessions` `sub_type='reading'` + a 1:1 Books-owned extension (`session_id`); **keep "not a `study_session` reuse"** (reading ≠ study — distinct sub-types; the framework lists both extensions). `[INTENT; ADR-004 S1]`
- **G-X*/G-AI*** — BK-14 (L62-65, governing principle: TTS/transcription/lookup/OCR opt-in) + BK-4 (mapping via transcription) + BK-9 (ISBN lookup): the governing principle IS the X4/AI1 consent gate — lookup = X1/X2-public-reference/X3/X5/X9; OCR/TTS/transcription = X11 → AI1/AI3/AI5(OCR page untrusted)/AI6; **not** AI4. `[INTENT; ADR-014 X1/X2/X3/X5/X9/X11; ADR-015 AI1/AI3/AI5/AI6]`
- **G-M1/M2** — BK-11 (reading plans, goals to a target): the plan goal is a pursuable target (`measurement_kind` × `binding_mode`); unified progress = quantitative/derived-pull. `[INTENT; ADR-011 M1/M2]`
- ⚠ Flagged-delta (L119-127): add the SP1/M3 reframes + the S1 reframe + X*/AI*/M1-M2 adds; BK-1/BK-18/`UNIQUE(book_id,chapter_number)` stay the live FACTs.

**`contract.md`**
- **G-S1** — `startSession`/`endSession`/`attachPhoto` (L23-24): the session surface creates a base `sessions` `reading` sub-type (`session_id`) + the Books extension; not a standalone table. `[INTENT; ADR-004 S1]`
- **G-X*/G-AI*** — `lookupBook(isbn|query)` (L16-17) + the Extension layer (L42-43): lookup = X1 device-mediated public-reference (X2/X3) under `external_in_ok` (X5); TTS/transcription/OCR = X11 → AI1/AI5; **not** AI4. `[INTENT; ADR-014 X1/X2/X3/X5/X11; ADR-015 AI1/AI5]`
- **G-M1/M2** — `createPlan({…goal…target})` (L25): the goal is a pursuable target (M1/M2). `[INTENT; ADR-011 M1/M2]`
- **G-SP1** — "Shared scoped tags" (L38): name `entity_tags` (SP1), Books-scoped. `[INTENT; ADR-006 SP1]`
- **C-E2 guard** — "Gamification/statistics read them" (via BK-10): the grant rides the base-`sessions` sub-type (S4/E2 on Sessions), not Books — no `grant_currency` on Books. `[guard]`

**`conventions.md`**
- **G-SP1** — new/naming rule: publisher/genre/category via `entity_tags` (SP1), Books-scoped; retire inline `books.tags`/`genre`. `[INTENT; ADR-006 SP1]`
- **G-M3** — unified progress + pace are derived (BK-3): `books.progress` is a nullable override that derives, never a `NOT NULL DEFAULT 0` counter. `[INTENT; ADR-011 M3]`
- **G-S1** — a reading session IS a base `sessions` `reading` sub-type (`session_id`) + a Books extension — never a standalone table, never a `study_session` reuse. `[INTENT; ADR-004 S1]`
- **New landmine** — **Never route lookup/OCR/TTS/transcription through the server; never fold the model call into the connector.** Lookup is device-mediated public-reference (X1/X2/X3); OCR/TTS/transcription split to ADR-015 (X11), on_device/BYO-key (AI1), OCR pages carry provenance (AI5); never an AI4 agent. `[INTENT; ADR-014 X1/X11; ADR-015 AI1/AI5]`

---

## §4. Acceptance (the definition-of-aligned §5 lines this unit must pass)

- [ ] **SP1** — inline `books.tags` (+`genre`, live `schema.ts:657`) retired → `entity_tags` (Books-scoped) in `[INTENT]`; As-is inline kept as floor.
- [ ] **M3** — `books.progress NOT NULL DEFAULT 0` (live `schema.ts:650`) reframed → nullable override (`NULL ⇒ derive`); As-is column kept; unified progress derives (BK-3).
- [ ] **S1** — `reading_sessions` reframed → base `sessions` `sub_type='reading'` + 1:1 Books-owned extension keyed `session_id`; the standalone-entity framing retired; **BK-10's "not a `study_session` reuse" preserved** (reading ≠ study, distinct sub-types).
- [ ] **X* (014)** — ISBN lookup named X1 device-mediated + **X2 public-reference** + X3 (Books ISBN) + X5 `external_in_ok` + X9; OCR/TTS/transcription split via **X11**.
- [ ] **AI* (015)** — AI1 `on_device`/`cloud`; AI3 cloud=egress+scope-min; **AI5 OCR-page-untrusted provenance**; AI6 `source=ai` on AI-derived rows.
- [ ] **M1/M2** — the reading-plan goal named a pursuable target (`measurement_kind` × `binding_mode`); unified progress = quantitative/derived-pull; **no stored `books.measurement_kind`** (C-M1).
- [ ] **C-AI4 guard** — **no AI4 agent-envelope tokens** (OCR/TTS/transcription = scoped model calls).
- [ ] **C-E2 guard** — **no `grant_currency`/E2** on Books (grants ride the base-`sessions` sub-type).
- [ ] **C-POS guard** — `books.current_page` per-asset supersession left as-is (already reframed, BK-3).
- [ ] **C-PART guard** — the Education partition (`book_subjects`, BK-13) left as-is (Books-owned, reads Education's contract).
- [ ] **Boundary rule** — every code/directory home + the entity-family DDL + the base-`sessions` extension + `import_staging`/`ai_connections`/grant-field wiring + the ADR-002 amendment is `[DEFERRED — Part 2 / build]`; only conceptual ADR homes asserted (Sessions owns the base + sub_type; Spaces owns `entity_tags`; ADR-010 owns the grant fields; the AI layer owns the modes).
- [ ] **R6** — the As-is (live FACT floor: 2 tables incl. the two anti-signals) / `[INTENT]` split intact for the two reframed tokens + the S1 soft-anti-signal; named-ADR set extended to +004/006/011/014/015.
- [ ] **ZK-1** — lookup/OCR/TTS/transcription device-mediated / on_device / BYO-key; no server-plaintext path.
- [ ] **No new anti-signal**; **no structural call made**; no schema-level reconciliation attempted.
- [ ] **No contradiction** with any ADR 001–017 nor neighbors (Sessions owns the base session + sub_type; Spaces owns `entity_tags`; ADR-011 owns the measurement axes; the AI layer owns the modes; Education owns the partition's schedule data; Study Planner consumes, never writes — BK-12).

---

## §5. Out of scope (explicit)

- **The reframed entity family** — assets, 3 annotation types, cross-format mapping, plans, conflict resolution (BK-2…BK-17, the 2026-07 reframe); not re-litigated. The format split (`ebook`→pdf/epub) + `books.current_page` per-asset move = build-phase design passes.
- **The base `sessions` table + `sub_type` + `session_id`** — **Sessions-owned** (ADR-004); Books adds only the `reading` extension columns; this unit names the S1 linkage, does not author the base or the extension DDL.
- **The cross-format mapping design pass** — transcription/TOC-anchor matching (BK-4) → build phase; this unit names it splits to ADR-015 (X11), does not spec the mapping.
- **The AI substrate + `import_staging`** — `ai_connections`, the two modes, the ISBN dataset ingest are ADR-014/015-owned; referenced, not authored.
- **The ADR-010 grant fields** — `external_in_ok` (X5, no new column); referenced.
- **The Education partition** — `book_subjects` + the Books→Education API (BK-13) is Books-owned, read-across; cited, not re-authored.
- **The reading-plan measurement design pass** — the exact `measurement_kind`/`binding_mode` defaults for a reading goal → build; this unit names the axes.
- **Economy (E2)** — Books is not a feeder (L242); the reading-session completion grants via its base-`sessions` sub-type (Sessions IS the feeder). Correctly not added.
- **Code/directory homes + schema reconciliation** — final DDL, the entity-family amendment, the ADR-002 amendment → build phase (ADR-016).

---

## Change Log
| Date | Change |
|------|--------|
| 2026-07-24 | Initial PLAN drafted from the ground read (sweep row 10 + framework §3 ADR-014 X1–X11 / ADR-015 AI1–AI6 / ADR-011 M1/M2/M3 / ADR-006 SP1 / ADR-004 S1 + §4 applies-to [ingest L245, AI L246, S1 timed-activity L234 name Books; pursuable L240 + feeder L242 do NOT] + §5, all 5 aspect docs, and the live schema — `books:641` [inline `tags:657`, `progress NOT NULL DEFAULT 0:650`], `book_chapters:661`). **A MIXED case, NOT the "clean" the sweep claimed** (the learning/education lesson — grep the floor): inline `books.tags` + `books.progress NOT NULL DEFAULT 0` are live anti-signals. Fix = 2 live-FACT R6 reframes (SP1 `books.tags`/`genre`→`entity_tags`; M3 `books.progress`→nullable override) + an **S1 reframe** (the framework S1 predicate names `reading_sessions` as the base+extension form AND "`reading_session` standalone" as RETIRED — so BK-10's "Books' own entity" is a soft anti-signal → base `sessions` `sub_type='reading'` + 1:1 extension keyed `session_id`; BK-10's "never a `study_session` reuse" STAYS TRUE, reading ≠ study) + X*/AI* layering (ISBN lookup = X1/X2-public-reference/X3 [Books ISBN verbatim]/X5/X9; OCR/TTS/transcription = X11 [Books OCR verbatim] → AI1/AI3/AI5 [OCR page verbatim]/AI6) + light M1/M2 (reading-plan goal pursuable, membership disclosed). Inherits the skills X*/AI* + S1 patterns. No E2 (Books not a feeder — reading grants ride the Sessions sub-type). Guards/disclosures: C-S1 the reframe preserves BK-10's "not a study_session reuse", C-M1 measurement membership, C-AI4 no agent envelope, C-E2 no economy, C-POS current_page already reframed, C-PART Education partition untouched. Presented for the LITE gate. |
| 2026-07-24 | Independent adversarial critique (fresh code-aware subagent, prompted to refute) → **SHIP / 0 blocking** — 8th consecutive clean unit. Explicit rulings, all CORRECT: **(1) the S1 reframe** — framework L79 verified to list `reading_sessions` AND `study_sessions` as *separate, co-equal* base-`sessions` extensions and to retire "`reading_session` standalone"; because they are distinct sub-types, naming the reading sub-type does NOT reuse `study_session` → BK-10's guarantee survives verbatim; the mode-adaptive capture (physical/braille manual vs digital granular + photos) becomes extension columns while the base carries the shared timer/scheduling spine — not "forcing Sessions onto something kept separate". **(2) the two R6 reframes** — both live anti-signals verified (`books.tags` inline `[E]` `:657`; `books.progress NOT NULL DEFAULT 0` `:650`); the sweep's "clean of live retired tokens" genuinely understated it (the learning/education lesson); no other retired token missed (grep clean). **(3) AI4-NA** — OCR/TTS/transcription = scoped `askModel(scoped_slice)`-shaped calls governed by AI1/AI3/AI5, not tool-wielding agents; the auto-write transcription probe explicitly ruled non-agentic (a bounded pipeline output carrying `source=ai`/AI6, gated by AI5), mirrors the accepted skills C-AI4. Full citation ledger verified exact (X3 "Books ISBN" + X11 "Books OCR" + AI5 "OCR page" verbatim; S1/SP1/M3 tokens; L234 names Books for S1, L240/L242 exclude Books → no stored measurement / no E2; C-E2 "grant rides the base-sessions sub-type" sound; C-M1 pursuable on the reading-plan goal sound). No structural/code-home call; no missed driver. **1 note folded (N1):** `books.progress` cite off-by-one → `:650` corrected across the PLAN (the `tags:657` cite was already correct; ironically `current_page`, the C-POS "don't re-open" column, sits at the mis-cited `:649`). Ready for Victor's LITE-gate approval. |
