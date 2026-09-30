<!-- Entity Delivery Flow (v1) · Step 2 — Decomposition Gate · books ① backend (#51, LIF-117) -->
<!-- The slices (backend|frontend|shared) + the gate ledger. Approved before per-slice work (Approval 1). -->

# Slice Map — Books ① backend  (mod-books #51, LIF-117)

> **Mode: RATIFY + DETAIL** (§8). 48 backend-intent legs (`BOO-01..48`) → **10 backend slices**, scaled to the
> 2nd-largest module (knowledge=8, finance=8 precedent). Every SPLIT leg contributes only its **service half**;
> the UI half (Reading Hub, Bookshelf, Reader, wizards, all render halves) = the `fe-books` P6 track — tagged
> `→P6` below, NOT built here. M2-deferred reach = **deny-safe ports** homed in their slice (zero-signature swap).

## Slice ledger

| Slice | Name | Legs (BOO) | Tables / seams | Tag |
|---|---|---|---|---|
| **S1** | Works CRUD + reframe + capability-gating | 01, 02·, 03·, 48· | `books`; `validators/books.ts`; ENTITY_TYPE inject; progress nullable (no write); plannable-vs-readable gate | backend (·→P6 render) |
| **S2** | Chapters/TOC + ISBN lookup port | 05·, 06·, 07·, 08 | `book_chapters` (UNIQUE, no `deleted_at`); `ingestion?` deny-safe `lookupBook`; grant-revoke; manual fallback | backend (·→P6) |
| **S3** | Assets + positions + R2 port + mapping absent-state | 09·, 10·, 11, 12·, 44· | `book_assets`; `attachment?` deny-safe upload; `updatePosition` SSOT; `getMappedPosition`→`NotSyncedState`; `AssetFileError` | backend (·→P6) |
| **S4** | Annotations + notes/links | 15·, 16·, 17·, 18, 19·, 20· | `book_bookmarks`/`book_highlights`/`book_quotes`; compose `spaces`(links)+`notes`(pages); BK-6 asymmetry | backend (·→P6) |
| **S5** | Quote-embed feed + toggles | 21·, 22 | `getEmbeddableQuotes` + toggle precedence (`preferences?` port); `QuoteEmbedDisabledError` | backend (·→P6) |
| **S6** | Reading sessions + Reader orchestration + photo/OCR port + statistics | 23·, 24·, 25·, 26·, 39· | `sessionRegistry.register('reading', [])` + `registerBooks()` + compose `sessions` base + own `reading_sessions` extension; **Reader service face** (decrypt+auto-session+position orchestration, BOO-39); `ai?`/`attachment?` for photo; `getStatistics` derivation; **C-E2 guard** | backend (·→P6 Reader chrome) |
| **S7** | Reading plans / Quota Planner | 27·, 28·, 29·, 30·, 31, 32·, 33· | `reading_plans`+`reading_plan_books`; goal-as-target (**no stored axes, C-M1**); quota/auto-goal/projection derivations (Calendar stub); `TargetUnreachableProposal` | backend (·→P6) |
| **S8** | Unified progress + conflict resolution | 13·, 34·, 35 | unified-progress DERIVATION (nullable override); derived conflict queue (no table); `preferences?` preset-rule; `PositionConflictPending`; conflict **blocks** progress | backend (·→P6) |
| **S9** | Education partition + measurement source + tags + linkable-target | 04, 14, 36, 37, 38·, 46 | `book_subjects`; `linkSubject`/`listBooksForSubject`; `getPaceStatus`→deny-safe `null`; `entity_tags` classification; reading measure source; linkable-target identity | backend (·→P6 pace render) |
| **S10** | Integration close-out + fan-out + Journal | 40·, 41, 42, 43·, 45, 47 | TTS/transcription `ai?` ports; consent-gate invariant (`IntegrationConsentError`); Study-Planner read-provider; local-first invariant; `effects?` fan-out (measurement-only, **C-E2**); `registerBooksJournal` (composes BOO-30's provider) + reading-session signal (composes BOO-26) | backend (·→P6 consent dialog) |

**Coverage:** all 48 `BOO` legs homed, each exactly once (S1:4 [01,02,03,48] · S2:4 [05,06,07,08] · S3:5
[09,10,11,12,44] · S4:6 [15,16,17,18,19,20] · S5:2 [21,22] · S6:5 [23,24,25,26,39] · S7:7 [27,28,29,30,31,32,33]
· S8:3 [13,34,35] · S9:6 [04,14,36,37,38,46] · S10:6 [40,41,42,43,45,47] = **48**). BOO-26 (S6) + BOO-30 (S7)
are *composed by* S10's fan-out/Journal but counted only at their home slice — no double-count. Cross-cutting
invariants (BK-14 consent gate over BOO-07/25/40/41/42; BK-18 local-first over all mutations) declared once in
S10, honored per-slice. `·` = a SPLIT leg (service half here, UI→P6).

## Deferred-by-design (homed, not built in ① — EACH is the documentation's own deferral)

> **Grounding.** Every row is deferred by (a) a doc line that explicitly defers it AND/OR (b) a FACT about the
> composed substrate's M1 state (the substrate itself ships M1-dormant/deny-safe). This is NOT the knowledge/finance
> pattern imported — it is `parts/books.md:7` ("Books **rides — never authors**" the R2 pipeline / ADR-014
> ingestion / ADR-015 AI layer; "this campaign homes the **SERVICE intent only**") + the doc's own deferral index
> (`parts/books.md §4a:62-92`) + `rerun §5` out-of-scope (`:149-160`). No deferral is a build-time choice of mine.

| Deferral | Home (as a port/state) | Doc grounding (the doc defers it) | Substrate FACT (M1 state) |
|---|---|---|---|
| ISBN lookup real reach (X1/X2/X3/X5/X9) | S2 `ingestion?` ⇒ `lookup-unavailable` | `parts/books.md:7` "ADR-014 external-ingestion … rides, never authors"; BOO-07 `parts:17` "ingestion-owned"; `rerun §5:154` "the ISBN dataset ingest … referenced, not authored" | `ingestion` = PERMITTED-but-`parser-unavailable`, "the real M1 seam" `[FACT: knowledge/types.ts:128]` |
| OCR/TTS/transcription (X11→AI1/AI3/AI5/AI6) | S6/S10 `ai?` ⇒ `ai-unavailable` | `parts:7` "ADR-015 AI layer … rides"; BOO-40/41/42 `parts:50-52` "AI-layer-owned; cite-not-re-spec"; `rerun §5:154` | `ai` = "M1-dormant (askModel throws AiDenied)" `[FACT: knowledge/types.ts:76]` |
| R2 file/photo upload (ADR-003) | S3/S6 `attachment?` ⇒ `attachment-unavailable` | `parts:7` "the R2 attachment pipeline … rides"; BOO-09/25 `parts:19,35` "R2 = ADR-003-owned"; `rerun §5:141` "R2 = ADR-003" | **NO attachment/R2 foundation built** `[FACT: foundation/ grep = none]` |
| Cross-format mapping algorithm (BK-4) | S3 `getMappedPosition`⇒`NotSyncedState` | `structure-data.md:21` "**design pass required**"; `business-rules.md:135-136`; `rerun §5:153` "→ build phase"; `parts §4a:84-85` | (M1 ships the honest absent-state; BK-4 fail-loud) |
| Reading-plan goal measurement defaults | S7 (names axes, stores none) | `BOO-14 parts:24` "referenced, not authored" (C-M1); `parts UNKNOWN:139`→`rerun §5:157` "the reading-plan measurement design pass … → build" | `reading_plans` has **no measurement column** `[FACT: schema/books.ts:165-174]` |
| Calendar-slot reconciliation | S7 auto-goal = arithmetic; Calendar stubbed | `BOO-28 parts:38` "Calendar reconciliation renders **visibly stubbed** (forward dep)"; `parts §4a:90`; `rerun §5` | (Calendar entity not built — forward-dep) |
| Education pace (subject_schedules/assessments) | S9 `getPaceStatus`⇒`null` (deny-safe) | `BOO-38 parts:48` "⚠ INTENDED-immature … reads Education's contract"; `business-rules.md:65-68` (BK-13) | Education module not built (#52, not Done); the `MasterySource` null precedent `[FACT: knowledge/types.ts:161-169]` |
| Journal page-photo aggregation direction | S10 (both halves homed) | `parts UNKNOWN:141` "seam-direction is a Part-B cross-cutting call … Resolution owner: P3 decomposition + Journals owner" | (both halves homed: BOO-25 service + Journal `/summary`) |

## Per-slice gate cadence (each slice, before the next begins)

Every slice runs the full §XXVI + Entity Delivery Flow loop:
`PLAN → /critique (g1) → build (types→logic→errors) → tsc 0 → **live-store Verification Gate** (Vitest + real
SQLite persistence probe) → independent code-review → /critique SHIP → §XXIX currency`. **No batching, no owed
gate.** The M1.0 live-store gate is load-bearing — it exercises the encrypt/persist + JSON-boundary seams a
mocked test bypasses (`[FACT: visual-gate-catches-worker-rpc-bugs; repository-create-returns-input-row]`).

## Gate ledger (filled as slices land)

| Slice | g1 | Verification Gate | code-review | SHIP | commit |
|---|---|---|---|---|---|
| S1 | — | — | — | — | — |
| S2–S10 | — | — | — | — | — |

## Decomposition Gate (Approval 1)

- [x] All 48 legs homed to a slice, each exactly once (recounted; BOO-39 service face homed to S6 — critic B1).
- [x] Backend/frontend split explicit (every `·` leg's UI half → `fe-books` P6; BOO-39 chrome→P6, service→S6).
- [x] Deferred reach homed as deny-safe ports (zero-signature M2 swap), not dropped.
- [x] The 8 IMPLICIT RULES (interpretation §4) each land in a slice (sub-type reg + `registerBooks()` + `[]`
      envelope → S6 · C-E2 S6/S10 · C-M1 S7 · BK-6 asymmetry S4 · work-anchor S4 · derived-conflict S8 ·
      Books-owns-plans S7).
- [x] Critic REVISE folded: B1 (BOO-39 homed + honest 48 recount) · B2 (`sessionRegistry` dep + `registerBooks()`
      + `allowed_effects:[]` envelope). NITs 1–3 addressed.
- [ ] **Awaiting Victor's Approval 1** (this gate).
