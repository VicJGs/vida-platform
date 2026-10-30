<!-- PLAN · mod-notifications ① · S4 — Dispatcher tick() + time-driven path (#53, LIF-132) ·
     Entity Delivery Flow v1 · §XXVI gate 1 (the SPEC) · grounds: slice-map.md S4 · seam-contract.md ·
     interpretation.md · built seams @ branch mod-notifications 6fed3c3 (S1–S3 shipped) -->

# PLAN — S4 · Dispatcher `tick()` + time-driven path

> The **time half** of the single write path (NF-2). S3 shipped the EVENT half (`applyNotificationEffect`
> rail handler) and the public `fire`. S4 adds the **headless dispatcher** `tick()` that reads the Sessions
> `dueIn` agenda, materializes **only time-pinned, already-due** occurrences into inbox rows (NF-3
> derive-until-fire — no phantom future inbox), dedups per occurrence in-service, and arms the local OS
> alert via the BUILT engine. Pure service tier — **no new schema, no migration** (every column shipped at
> DB-4; slice-map D-SCHEMA). Composes `sessions.dueIn` + the S2 gate + `engine.scheduleLocal`.

## §1 — Context (what exists, grounded)

- **`createNotificationsService(deps)`** factory-of-closures; deps so far `{ db, deviceId, engine, preferences? }`
  (S1 scaffold, S2 `engine`+`preferences?`). S4 **adds `sessions`**. `[FACT: services/notifications/service.ts:164-170; types.ts:25-32]`
- **S2 `deliver(id, ctx?)`** already gates channels vs `MergedPreferences` + quiet-hours (caller-supplied
  `nowMinuteOfDay`), routes through `engine.deliver`, persists the delivery-audit. `[FACT: service.ts:268-301]`
- **S3 `fire(input, ctx?)`** = the public TIME entry: `repo.create` (effect_event_id NULL) → `deliver` → return
  the view. Fail-loud on bad input. `[FACT: service.ts:305-312]`
- **Sessions `dueIn(range: TimeRange): Promise<DueItem[]>`** — aggregates own `planned_blocks` in range +
  live provider lanes (empty at M1.1). A `planned_block` yields `DueItem { source_module:'sessions', ref_id,
label, est_minutes, urgency, hard_deadline?: scheduled_end ?? undefined }`. A throwing provider lane is
  skipped internally (never fatal). `[FACT: services/sessions/service.ts:689-718; types.ts:219-232]`
- **`DueItem.hard_deadline?: number`** — OPTIONAL. Present ⇔ the block has a `scheduled_end` (a device-stable
  UTC-ms fire instant). Absent ⇒ no stable fire instant. `[FACT: sessions/types.ts:231; service.ts:706]`
- **Engine `scheduleLocal(occ: DueOccurrence, q: QuietHours): Promise<ScheduleResult>`** — bakes quiet-hours
  (`bakeQuietHours`: schedule | shift | suppress) then registers with the OS scheduler (**deny-safe M1 →
  `scheduled:false`, no OS call**). `DueOccurrence = { occurrenceId, at, minuteOfDay }`; `QuietHours =
{ enabled, startMinute, endMinute, policy:'shift'|'suppress' }`; `ScheduleResult = { action, scheduled,
at?, id? }`. `[FACT: foundation/notifications/service.ts:74-92; types.ts:115-132,195-201,238]`
- **`shouldMaterialize(occurrenceAt, now): boolean`** = `occurrenceAt <= now`. `[FACT: scheduling.ts:72]`
- **`dedupKey({kind:'due', occurrenceId})`** → `due:${occurrenceId}` (the engine/OS-scheduler key).
  `[FACT: scheduling.ts:63-67]`
- **`notifications` row** — time rows carry **NULL `effect_event_id`**; the UNIQUE is on `effect_event_id`
  alone, so NULLs are SQLite-distinct → the DB does **not** dedup time rows: "keyed by its dueIn occurrence
  = **dispatcher service**". `entity_type` is OPEN (no CHECK, registry-validated); links the subject (NF-10
  link-don't-copy). `[FACT: db/schema/notifications.ts:18-20,42,56,62-67]`

## §2 — Business Rules (candidate BR-NT-S4-\*, promoted at §XXIX on ship)

- **BR-NT-S4-1 (time path / NF-2)** — `tick(range?, now?)` is the time half of the single write path; it
  materializes rows ONLY through the existing `fire` time entry (no new insert site). `[NF-2; conventions.md:6]`
- **BR-NT-S4-2 (fire only time-pinned / OQ-1)** — a `DueItem` is materializable ONLY if it has a
  `hard_deadline`. An un-pinned item (no `hard_deadline`) has no stable fire instant ⇒ **skipped** (it is
  agenda/Journals work, not an alarm). `[slice-map OQ-1; sessions/types.ts:231]`
- **BR-NT-S4-3 (derive-until-fire / NF-3)** — a pinned item materializes ONLY when
  `shouldMaterialize(hard_deadline, now)` (deadline ≤ now). A future deadline is **not** written to the inbox
  (no phantom future rows); its OS alert is pre-armed via `scheduleLocal` instead. `[NF-3; scheduling.ts:72]`
- **BR-NT-S4-4 (occurrence identity / NF-8)** — the occurrence key is
  `${source_module}:${ref_id}:${hard_deadline}` → `dedupKey({kind:'due', occurrenceId})` for the engine's OS
  schedule. The **inbox-row** dedup is in-service: a fired row links `entity_type = source_module`,
  `entity_id = ref_id`; before firing, `tick` checks for an existing **time row** with that
  `(entity_type, entity_id)` AND `effect_event_id IS NULL` and SKIPS if present (a `planned_block.id` is 1:1
  with its single `hard_deadline` at M1). The `isNull(effect_event_id)` clause (g1 NIT-1 hardening) confines
  dedup to prior DISPATCHER (time) rows: a prior EVENT-path row on the same subject (an `applyNotificationEffect`
  linking the same `(entity_type, entity_id)`) carries a non-NULL `effect_event_id` → it does NOT false-skip
  the time fire. M1 collision window remaining: two dispatcher fires of the same `ref_id` with DIFFERENT
  `hard_deadline` (a rescheduled block) still converge to one row — benign because a `planned_block` is 1:1
  with its deadline at M1 and `dueIn` provider lanes are dormant. `[NF-8; schema/notifications.ts:56,62-64 UNIQUE-on-effect_event_id/NULLs-distinct; sessions/service.ts:709 lanes empty]`
- **BR-NT-S4-5 (two ticks ⇒ one row)** — re-running `tick` over the same due occurrence produces exactly one
  inbox row (the BR-NT-S4-4 in-service dedup). `[NF-8; slice-map S4 verification]`
- **BR-NT-S4-6 (gate rides deliver / NF-5)** — a materialized row goes through `fire`→`deliver`, so S2 channel
  gating + quiet-hours suppression apply unchanged (in-app always, NF-7). `tick` passes a `DeliverContext`
  derived from `now`. `[BR-NT-S2-*; service.ts:268-301]`
- **BR-NT-S4-7 (local OS arm, deny-safe M1)** — after materializing (and for a pinned occurrence), `tick`
  calls `engine.scheduleLocal(occ, quietHours)` to arm the native alert; at M1 the OS scheduler port is
  deny-safe (`scheduled:false`, no OS call). Quiet-hours baking may `suppress` the alert (in-app still
  recorded). `[BR-ND-* #46; service.ts:74-92]`
- **BR-NT-S4-8 (SignalUnavailable / failure-isolated)** — a throwing/absent `dueIn` source ⇒ `tick` returns a
  zeroed/partial result with the lane flagged; it NEVER fires on fabricated data and NEVER crashes. Per-item
  processing is isolated: one bad item does not abort the tick. `[contract.md:40; NF-2/NF-3; slice-map S4]`
- **BR-NT-S4-9 (TickResult accounting)** — `{ evaluated, fired, suppressed, skipped }`, DISJOINT on outcome:
  `evaluated` = DueItems seen; `fired` = new rows materialized with the OS alert scheduled/shifted;
  `suppressed` = new rows materialized but the OS alert quiet-hours-**suppressed** (in-app only);
  `skipped` = not materialized (un-pinned ∪ future ∪ duplicate ∪ unavailable-lane). `fired + suppressed` =
  total new rows. `[slice-map S4; engine ScheduleResult.action]`

## §3 — Interpretation (FACT / INTERP / UNKNOWN — No-Guessing)

- **[FACT]** `tick(range?: TimeRange, now?: Timestamp): Promise<TickResult>` — the ratified seam-contract
  surface (seam-contract.md:49). Signature is **fixed**; no extra params. `[seam-contract.md:49,81]`
- **[INTERP]** `range` default = `{ start: 0, end: now }` (materialize everything due up to `now`; a caller
  widening `end` past `now` only pre-arms future OS alerts, which are deny-safe at M1). `now` default =
  `Date.now()`. Rationale: `dueIn` filters on `scheduled_start`; a running block (start ≤ now, end > now)
  returns in range but `shouldMaterialize(end, now)` is false ⇒ correctly not materialized.
- **[INTERP]** `minuteOfDay` for `DueOccurrence` + `DeliverContext.nowMinuteOfDay` = UTC minute-of-day
  (`Math.floor((t % 86_400_000) / 60_000)`) as the **M1 approximation**. The backend holds no device TZ (the
  engine's TZ discipline is "caller resolves"); the OS scheduler is deny-safe at M1 so quiet-hours precision
  is moot until **M2** wires a real scheduler + device TZ. Documented, zero-signature-change at M2.
- **[INTERP]** `QuietHours.policy` — `MergedPreferences` exposes `quiet_hours_enabled/start/end` (read by S2)
  but no policy field was found. Default `policy: 'suppress'` (matches S2's suppress-external semantics).
  `[FACT: service.ts:91-103 reads no policy]` → **[UNKNOWN]** a user-chosen shift-vs-suppress → M2 pref; default suppress.
- **[FACT]** fired `FireInput` = `{ type:'reminder', title: item.label, entity_type: item.source_module,
entity_id: item.ref_id, metadata: JSON.stringify({ occurrenceId, hard_deadline }) }`. `reminder ∈
NOTIFICATION_TYPE`; `title` non-empty (label) — satisfies `fire`'s fail-loud guards. `[FACT: NOTIFICATION_TYPE; service.ts:306-307]`
- **[FACT]** `entity_type='sessions'` is valid — `entity_type` is OPEN (no CHECK). `[FACT: schema:42]`
- **[INTERP]** the slice-map sequences "gate (S2) → `fire` → `scheduleLocal`". `fire` already runs S2's gate
  internally (`deliver`); so `tick` = dedup-check → `fire(input, ctx)` → `scheduleLocal(occ, quietHours)`.
  Both honored; no re-architecture past the ratified decomposition.
- **[FACT]** `sessions` dep narrowed to `Pick<SessionsService,'dueIn'>` (read-only; `tick` never writes to
  Sessions). `[seam-contract.md:19]`

## §4 — Acceptance (live-store Verification Gate — real data store, Node 24)

1. **Pinned + due ⇒ one row, delivered.** Stub `dueIn` → one `DueItem` with `hard_deadline ≤ now`; `tick()`
   ⇒ `fired:1`; the inbox has one `reminder` row linked `(entity_type:'sessions', entity_id:ref_id)`,
   `delivered_in_app:true`.
2. **Un-pinned ⇒ skipped.** A `DueItem` with no `hard_deadline` ⇒ `skipped:1`, `fired:0`, zero rows.
3. **Future ⇒ not materialized (NF-3).** `hard_deadline > now` ⇒ `skipped:1`, zero inbox rows (OS arm is the
   deny-safe `scheduleLocal`, no row).
4. **Two ticks ⇒ one row (NF-8).** Two `tick()` calls over the same due occurrence ⇒ one inbox row; second
   tick reports it `skipped` (duplicate).
5. **Quiet-hours suppression records in-app.** `preferences` with an enclosing quiet window + `scheduleLocal`
   baking to `suppress` ⇒ the row still exists (in-app), `delivered_push/email:false`, counted `suppressed`.
6. **SignalUnavailable.** A `dueIn` that THROWS ⇒ `tick()` does not throw; returns zeroed counts with the lane
   flagged; no rows fired.
7. **Per-item isolation.** A batch with one malformed item (e.g. a provider that can't map) does not abort the
   other items.
8. **Metadata round-trip (g1 NIT-2a).** A fired row's `metadata` parses back to `{ occurrenceId, hard_deadline }`
   (written at §3; asserted readable as raw TEXT at this tier, seam-contract.md:80).
9. **Cross-path no false-skip (g1 NIT-2b).** A pre-existing EVENT-path row linking the same
   `(entity_type:'sessions', entity_id:ref_id)` with a non-NULL `effect_event_id` is present BEFORE `tick`;
   `tick` over the same due occurrence STILL fires the time row (`fired:1`) — the `isNull(effect_event_id)`
   dedup clause does not treat the event row as a duplicate.
10. Full green: `tsc --noEmit` 0 · `eslint` 0 · notifications suite (S1–S4) green · full `@vida/core` green.

## §5 — Implementation Prompt (strictly this; §XXVIII on any divergence)

1. **`types.ts`** — add `sessions: Pick<SessionsService, 'dueIn'>` to `NotificationsServiceDeps` (required,
   "deps grow per slice"); add `tick(range?, now?): Promise<TickResult>` to `NotificationsService`; add
   `export interface TickResult { evaluated; fired; suppressed; skipped: number }`; re-export/import
   `TimeRange` + `DueItem` from the sessions service types.
2. **`service.ts`** —
   - destructure `sessions` from deps;
   - `quietHoursFromPrefs(prefs): QuietHours` (reuse `hhmmToMinutes`; `policy:'suppress'`; `enabled:false` ⇒
     a benign window);
   - `utcMinuteOfDay(t): number`;
   - `occurrenceOf(item): string` = `${source_module}:${ref_id}:${hard_deadline}`;
   - `alreadyMaterialized(item): Promise<boolean>` = `findWhere(and(eq(entity_type, source_module),
eq(entity_id, ref_id), isNull(effect_event_id)))` non-empty (g1 NIT-1: the `isNull` clause confines
     dedup to prior DISPATCHER time rows — an event-path row on the same subject never false-skips); add
     `isNull` to the drizzle-orm import;
   - `tick(range?, now = Date.now())`: `const window = range ?? {start:0,end:now}` (body-level default so
     `now` is already resolved); `try { items = await sessions.dueIn(window) } catch { return zero }`; for each
     item (outer per-item `try` over the PRE-fire steps): no `hard_deadline` ⇒ `skipped++`;
     `!shouldMaterialize(hd, now)` ⇒ `skipped++`; `await alreadyMaterialized` ⇒ `skipped++`; else build
     `FireInput`, then **an inner try around `fire`** (`catch ⇒ skipped++; continue` — no row materialized),
     then — once the row is materialized — **a separate best-effort try around `engine.scheduleLocal({
occurrenceId, at: hd, minuteOfDay: utcMinuteOfDay(hd) }, quietHours)`** whose THROW is swallowed (the OS
     arm is best-effort; a materialized row must never be recounted `skipped` — g2 finding, BR-NT-S4-9);
     `alertSuppressed = sr.action === 'suppress'`; `alertSuppressed ? suppressed++ : fired++`.
   - add `tick` to the returned object.
3. **Tests** — update the shared service builder to inject a `sessions` stub (`{ dueIn: async () => [] }`);
   add the S4 `describe` covering §4.1–§4.7 with a controllable `dueIn` stub + a recording/deny-safe engine.
4. **§XXIX currency** — append `BR-NT-S4-1..9` to `current-business-rules.md`; move S4 from "Not yet built"
   to shipped in `current-spec.md`. Commit docs WITH code.

## Out of scope (unchanged homing)

- Real OS scheduler / wake-relay / email reach → **M2** (deny-safe ports, zero-sig swap).
- Device TZ resolution for `minuteOfDay` → **M2** (UTC approximation at M1).
- Digest/batching → **M2** (NF-15). Inbox render → **② fe-notifications**. `[E]` encryption → **M3**.
