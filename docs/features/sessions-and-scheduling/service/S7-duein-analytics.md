<!-- S7 forward spec — MOD-sessions ① · slice S7 (dueIn aggregator + analytics). The §XXVI g1 gate object.
     The shared platform primitive (IR-2) + derived analytics (SS-12/PD-11/IR-6). REFERENCES aspects + S1/S5. -->

# S7 — dueIn aggregator + analytics (forward spec · g1 · THE FINALE)

**Home:** extends `services/sessions/service.ts`. Reuses the S5 `batchRepo`-adjacent `plannedBlocks` table (a
new `plannedBlocksRepo`) + the S1 `sessionRepo`/`focusRepo`. New in-memory provider registry (empty seam, N5).

## §1 Operations (signatures → `delivery/seam-contract.md`)
- `dueIn(range: TimeRange): Promise<DueItem[]>` — the **shared platform primitive** (IR-2; Journals consumes
  `dueIn(today)`, the future Calendar the full range): own `planned_blocks` in range ∪ live provider reads.
- `registerDueProvider(provider: DueProvider): void` — add a live-read provider (empty registry in M1.1 — N5).
- `getSessionAnalytics(range: TimeRange): Promise<SessionAnalytics>` — derived-on-read (SS-12/IR-6), never stored.

## §2 Operation-flow & invariants
- **`dueIn` (SS-7 — aggregate, never duplicate).** Own blocks: `plannedBlocksRepo.findWhere(scheduled_start ≥
  range.start ∧ ≤ range.end)`, filter `deleted_at == null` (findWhere is soft-delete-blind; `planned_blocks`
  HAS `deleted_at` → `softDelete:true`). Map each block → `DueItem`. Then each registered provider's
  `fetch(range)` is awaited and unioned. **Fail-per-lane (SS-7/N5):** a provider that throws degrades **that
  lane only** — caught + skipped, `dueIn` never throws and returns the rest. In M1.1: no `planned_blocks`
  (S5/algorithm deferred) + empty registry → `dueIn` returns `[]` (correct — nothing due yet). **The contract's
  `ProviderUnavailable` typed error (contract.md:61) SURFACES the degraded lane to the ② agenda ("couldn't
  load") — that surfacing is DEFERRED until a consumer needs the failed-lane list; S7 degrades silently
  (catch+skip), defining no unused error class.** `[FACT: contract.md:33-34,61; business-rules.md:42-45 SS-7; scheduling.ts:30]`
- **`DueItem` mapping (from a `planned_block`).** `{ source_module:'sessions', ref_id:block.id, label:
  block.sub_type ?? 'session', est_minutes: block.scheduled_end ? round((end−start)/60000) : 0, urgency: 0
  (no urgency column — the deferred algorithm computes it), hard_deadline: block.scheduled_end ?? undefined }`.
  Lossy where the block lacks a field (label/urgency) — the algorithm enriches these in M1.2.
- **Analytics (SS-12/PD-11/IR-6 — derived, never stored).** `getSessionAnalytics(range)` reads the session log
  (`sessions` with `started_at` in range **∧ `isNull(deleted_at)`** — `findWhere` is soft-delete-blind, so a
  soft-deleted session must be excluded explicitly) + `focus_sessions`; computes on-read, writes nothing:
  `{ total, completed, completionRate (completed/total, 0 when total 0), avgFocusRating (mean of non-null
  focus_rating, null if none), totalFocusSeconds (Σ focus_sessions.duration_seconds for in-range focus
  sessions) }`. **Richer cuts deferred:** per-module time (needs attachment joins), planned-vs-actual (needs
  `planned_blocks` — S5/algorithm deferred), streaks (needs day-bucketing) → later getters, noted not built.
  `[FACT: business-rules.md:67-69 SS-12; pomodoro/business-rules.md:51-53 PD-11]`
- **`DueItem`/`DueProvider` home.** Defined in `services/sessions/types.ts` (exported via the `@vida/core`
  barrel — Journals imports from there). The seam-contract sketched "canonical in `@vida/types`"; deferring that
  promotion until a **non-core** consumer needs it (only `@vida/core` services consume it now — simpler-solution
  rule). `[INTERPRETATION: seam-contract.md; @vida/types is enum-tuples + interfaces, no runtime need yet]`

## §3 Contract (delta)
Adds `dueIn`/`registerDueProvider`/`getSessionAnalytics` to `SessionsService`. Types: `TimeRange
({start:number,end:number})`, `DueItem`, `DueProvider ({module:string, fetch(range):Promise<DueItem[]>})`,
`SessionAnalytics`. No new factory deps (provider registry is a closure-held array). No `ProviderUnavailable`
class (degrade is catch+skip; its typed-error surfacing is deferred — §2).

## §4 Acceptance criteria (Verification Gate — live unlocked vault)
1. Empty world: `dueIn({start,end})` → `[]` (no blocks, no providers).
2. Own blocks: insert two `planned_blocks` (one in range, one out) → `dueIn` returns one `DueItem` mapping the
   in-range block (`source_module:'sessions'`, `ref_id`, `hard_deadline`); a soft-deleted block is excluded.
3. Providers: `registerDueProvider` a stub returning 1 item → `dueIn` unions it; register a **throwing**
   provider → its lane degrades (its items absent), `dueIn` still returns the others and does **not** throw.
4. Analytics: create 3 sessions (2 completed w/ focus_rating, 1 in_progress) via S1/S3 → `getSessionAnalytics`
   returns `total:3, completed:2, completionRate:2/3, avgFocusRating` = mean of the two; a range with no
   sessions → `total:0, completionRate:0`. No aggregate row is written (IR-6).
5. `tsc` clean; full `@vida/core` suite green.

## §5 Implementation prompt (order)
1. `types.ts` — `TimeRange`, `DueItem`, `DueProvider`, `SessionAnalytics`.
2. `service.ts` — `plannedBlocksRepo` (`softDelete:true`) + a closure-held `dueProviders: DueProvider[]`; the 3
   methods. `dueIn` filters `deleted_at == null`, maps blocks, unions provider reads (try/catch per provider).
   `getSessionAnalytics` reads `sessionRepo`/`focusRepo` + computes.
3. Wire into the `SessionsService` interface.
4. `__tests__` — AC1–AC4 on a live vault (insert `planned_blocks` directly for AC2; stub providers for AC3).

## §6 Out of scope (homed)
Live providers (Books/Flashcards/Knowledge/Education/Language `dueIn` lanes) → their owning modules (SS-7; the
registry is the seam) · planned-vs-actual / per-module time / streaks analytics → later getters (some blocked on
`planned_blocks` / attachment data) · Global Calendar consuming `dueIn(range)` → M2 · Journals consuming
`dueIn(today)` → MOD-journals (imports the primitive S7 ships).
