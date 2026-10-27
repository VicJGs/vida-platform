# Slice Map — Sessions & Scheduling · RESCOPE (sessions-rescope, LIF-248) · Re-scope Gate (Step 5)

> Entity Delivery Flow recovery variant, Step 5. Turns the DRY reconciliation ledger (`reconciliation.md`, R-1…R-49 +
> impact scan) into a corrected, plane-tagged slice plan. Supersedes the MOD-sessions ① build's slice-map (S1–S7, all
> shipped — `git show 5c961c4:docs/features/sessions-and-scheduling/delivery/slice-map.md`). Yardstick:
> `interpretation.md` rev 8.3 (Interpretation Gate PASS + delta gate) · inherited ECs (HUD EC-1…10 · Flow EC-1…11).
> **No ENTITY CLOSE here** — ELC-9 is fe-sessions' (debt-plan.md:25,51); this unit gates its legs live (ELC-3…7).
>
> **Every slice** runs the §XXVI double gate (PLAN → `/critique` → Approval 1 → `/preflight` → `/critique` → Approval 2)
> before code, then its per-plane blocking gate:
> - **backend (B)** → Verification Gate: Vitest (logic + failure paths) → typed-error assertions → live smoke on the real store.
> - **frontend (F)** → Visual Gate: real browser, every state × light/dark × 375/768/1440, §XIV a11y, the slice's EC MUSTs.
> - **shared (S)** → both.
> Each slice re-runs its impact-scan rows (`reconciliation.md` §2) at gate 2, flips the tests its leg invalidates,
> rewrites the stale comments it touches, records its §XXVIII items from the interpretation §5 register, and refreshes
> the `current-*` of every context it touches (§XXIX).

## Order and dependencies

```
X1 engine ─── X2 focus lifecycle + routines ─┬─ X3 reads ──────────┬─ X5 HUD live ─────┬─ X7 live close
                                             └─ X4 composition root ┴─ X6 runtime live ──┘
```
X1 first: every completion path's semantics (typed errors, keying, preflight) sit under X2. X2 carries the routines
adaptation + `listSessionsForEntity` WITH the focus-lifecycle change, so no slice leaves a suite red (impact §2 "fix all
in the same slice"). X3 before X5/X6 (they consume `findActiveSession` / the applied-effects read). X4 before X5/X6
(handlers + providers at the root). X7 last (the ELC-7 live leg needs everything).

**Not sliced:** R-1 · R-37 · R-38 (✅ aligned) · R-22 (edge → gamification-rescope) · R-40 + EC-5 `⋯` (routed to
fe-sessions' ENTITY CLOSE).

---

## X1 — Effect engine semantics · **B** · `foundation/sessions` + `foundation/effects`
- **Ledger:** R-7 (class keying) · R-9 (canTouch target typing + `PermissionDenied`) · R-10 (`EffectFailed`, completion
  commits) · R-11/R-44 (`AttachmentTargetMissing`, `missing[]`) · R-12 (preflight inside `transition`) · R-13
  (soft-deleted spine) · R-15 (`replayCompletionEffects` + derived unapplied) · R-42 (`fired` excludes projection) ·
  per-sub-type payload resolver seam (IR-S5) · optional `providers?: ViewProviderRegistry` on `TransitionDeps` (IR-S19).
  The optional `providers?` dep on `createSessionsService` (10 construction files, all SAFE) is added here too.
  Backend stale "#46" comments (R-48 part: `foundation/sessions/CLAUDE.md:20` · `foundation/effects/CLAUDE.md:22` ·
  `services/sessions/service.ts:30-32` · sessions-service.test 4c title `:296`).
- **IR:** S4 · S5 (seam) · S16 · S17(0) · S19.
- **§XXVIII:** #3 (BR-S3-5 narrowing) · #8 (continue past `EffectFailed`).
- **Tests flipped:** lifecycle.test A2/A4/A5 · sessions-service.test 4b.
- **Gate:** Verification — typed errors for each of the 4 outcomes; replay dedupes; 2nd focus run same task/day logs;
  `award_xp` still per occurrence; live smoke on a real store.

## X2 — Focus lifecycle, one door + routines adaptation · **B** · `services/sessions` (+ `services/tasks` handler, `services/routines`)
- **Ledger:** R-2 (`attach_pomodoro` handler, in-tx, self-target denied) · R-4/R-14 (`completeFocus` closes the spine,
  resume-close) · R-5 (`cancelFocus` → `skipped`) · R-6 (payload from persisted rows) · R-8 (tasks handler:
  `duration_seconds`, throw) · R-21 (`surface_journal` declared + allowed) · R-41 (start delegation · `updateSession` /
  `createSession` bans) · R-20 (`listSessionsForEntity(type, id, range)` — moved here: routines' retry needs it) ·
  R-32 (drop the N9 detach workaround) · R-33 (stamp-retry + re-entry + `isRunningMakeGood` vs a closed spine, via
  `listSessionsForEntity`) · R-34 (sessions/tasks/routines harnesses register focus handlers; tasks `:556,:582,:585` +
  sessions `:229,:636,:637` reworked).
- **IR:** S1 · S2 · S3 · S5 · S13 (service side) · S17 · S18.
- **§XXVIII:** #1 · #4 · #5 · #6 · #7 · #9 (tasks BR-TK-S4-6).
- **Impact:** every `completeFocus`/`cancelFocus` caller fixed IN this slice — routines `service.ts:975,1018,1065,1084`
  + tests sessions `:387,:393,:400,:422` · routines `:778,:792,:801,:1924`.
- **Gate:** Verification — focus start→pause→complete closes the spine, fires `attach_pomodoro` + `log_time` (real focus
  minutes in `task_time_logs`), `surface_journal` projection; cancel → `skipped`, no effects; every rejected door typed;
  routines suite green (a focus step completes → spine closed, attachment kept, stamp-retry after a stamp failure);
  live smoke. Currency: sessions + tasks + routines `current-*`.
- **Edge:** `award_xp` → gamification-rescope (focus def gains it with the handler).

## X3 — Reads · **B** · `services/sessions` (+ `ProviderUnavailable` shared home)
- **Ledger:** R-16 (`findActiveSession` — IR-S7 incl. terminal-run exclusion) · R-17 (applied-effects read, shared
  event-input construction, `detail` via providers) · R-18/R-19 (`dueInDetailed` additive; `ProviderUnavailable` moved,
  journals re-exports).
- **IR:** S7 · S11 · S12 · S19.
- **Gate:** Verification — each read on a real store, incl. soft-deleted, concurrent, and failed-lane cases; `dueIn`
  callers unchanged.
- **Edge:** Calendar adopts `dueInDetailed` for G17 lane state (fe-calendar is shipped → recorded edge, not built here).

## X4 — Composition root · **S** · `apps/web/src/db/composition-root.ts`
- **Ledger:** R-3 (`composeServices` async; `registerTasksTimer`; the sessions `attach_pomodoro` registration) · R-43
  (build the shared `ViewProviderRegistry`; register the existing tasks provider; pass `providers` to sessions) · R-48
  part (root comment).
- **Impact:** `composeServices` ×3 callers (root · calendar-readonly.test · composition-root.test).
- **Gate:** Verification (root boots on real OPFS, handlers + provider present, first-boot `work` row) + a no-regression
  Visual check that the Calendar and Home still load.

## X5 — Focus store + HUD live · **F** · `apps/web/src/{stores,session-hud}`
- **Ledger:** R-23 (`focus-runtime-ui-store.ts`) · R-24 (`useActiveSession` live) · R-25 (port binding by focus-row id /
  `startFocus({sessionId})`) · R-26 (paused-elapsed + Pause⇄Resume) · R-27 (title via providers, fallback
  `humanizeSubType`; `kindLabel` bare) · R-47 part (loading/failure → `hidden`; pause/resume invalidate
  `['session', id]` + `['active-session']`) · R-49 part · R-35 part.
- **IR:** S6 · S7 · S8 · S9 · S10 · S15.
- **§XXVIII:** #2 (HUD derivation).
- **ECs (MUST):** HUD EC-1…10.
- **Gate:** Visual — all HUD forms × light/dark × 375/768/1440 + a11y; countdown forms driven through the REAL store API.

## X6 — Runtime page live · **F** · `apps/web/src/{flow,session-runtime}`
- **Ledger:** R-28 (`useFlowSession` live) · R-29 (mark-done live; focus → `completeFocus`) · R-30/R-31 (attach only with
  a `deliverable_note` target; proof hidden) · R-46 (EC-5: subject title, `SyncStatus` from write outcome, `⋯` hidden) ·
  R-45 (**per Victor's EC-4 ruling**) · R-47 part (mark-done invalidates `['active-session']`) · R-49 part · R-35/R-48 part.
- **IR:** S8 · S11 · S13 · S14 · S15.
- **ECs (MUST):** Flow EC-2 (mark-done; attach-when-target) · EC-4 · EC-5 (minus `⋯`) · EC-6…9 · EC-10 · EC-11.
- **Gate:** Visual — every terminal state × light/dark × 375/768/1440 + a11y.

## X7 — Live close (ELC-3…7) · **S**
- **Ledger:** R-39 (ELC-7 live leg) · L19 seed harness (dev-server import of `db/composition-root`: a focus session on a
  task — start · pause · complete; a `work` session; a deleted-task subject for `AttachmentTargetMissing`) · R-36/R-48
  currency sweep · close-time edges (notes-rescope page `ReadProvider` · Linear relations).
- **Gate:** live Visual Gate on real OPFS (Brave): write → reload → persists (rows) · countdown degrades honestly to
  elapsed after reload · reopen with no spurious write · console clean · every inherited EC re-verified live except the
  routed divergences (EC-5 `⋯`, Flow EC-2 proof) → handed to fe-sessions' ENTITY CLOSE.

---

## Victor items at this gate
1. **Approve this slice plan** (X1…X7, order, planes, gates).
2. **R-45 — EC-4 re-pin:** where a session's unapplied/failed effect shows (see the options presented with this map).
