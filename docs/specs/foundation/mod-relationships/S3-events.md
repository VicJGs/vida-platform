# S3 — Events (mod-relationships #56 ①)

> Entity Delivery Flow ① · slice S3 of 9. Legs: REL-26, REL-27, REL-28, REL-29. Grounded in: `relationships.ts`
> (contact_events), contract.md:17-18, business-rules RL-8, decomposition REL-26…29.

## §1. Context

`contact_events` (REL-26…28) — time-anchored dates per person (birthday/anniversary/holiday/custom), recurring
year-agnostic (`MM-DD`) or one-time (`YYYY-MM-DD`). A **child of contact** (no `deleted_at` → cascade-purged on
contact soft-delete, already handled S1). `reminder_days` is a JSON array (`[1,3,7]`) → **view boundary** (like
`social_links`): reads parse → `EventView`. Deps unchanged. Global reads (feed the All-Events page + Calendar +
Journal `/summary`), not per-contact.

## §2. Business Rules (S3)

- **BR-RL-S3-1 (REL-26)** — `createEvent(input)` over `contact_events`; backfills NN-defaults (`event_type:'custom'`,
  `is_recurring:true`); `reminder_days` JSON serialize on write; re-reads → faithful `EventView`. Guards a live
  `contact_id` → `ContactNotFoundError`.
- **BR-RL-S3-2 (REL-28)** — `getAllEvents(): EventView[]` — every event (all belong to live contacts; events of a
  soft-deleted contact were cascade-purged). Sorted by `event_date`.
- **BR-RL-S3-3 (REL-27)** — `getUpcomingEvents(range): UpcomingEvent[]` where `UpcomingEvent = { event: EventView;
occurrence: string }` — the event + its concrete next-occurrence ISO date inside `range = {from, to}` (YYYY-MM-DD).
  **Projection:** a RECURRING event recurs on its `MM-DD` (the last 5 chars of `event_date`, whether the stored value
  is `MM-DD` or `YYYY-MM-DD`): `occurrence = nextOccurrence(mmdd, from)` = `${fromYear}-${mmdd}`, bumped to
  `${fromYear+1}-${mmdd}` if it precedes `from`; included iff `occurrence <= to`. A ONE-TIME event (`is_recurring=false`)
  uses its literal `YYYY-MM-DD`; included iff `from <= event_date <= to`. Sorted by `occurrence`. (Feb-29 projected
  literally — JS Date rolls a non-leap 02-29 to 03-01; a documented approximation, acceptable for a nudge surface.)
- **BR-RL-S3-4 (REL-29, RL-8 — events occur, don't complete; they spawn)** — a `contact_event` is never "completed"
  and S3 **never auto-creates a Task or reminder**. The event is **read-surfaced** (`getUpcomingEvents`/`getAllEvents`)
  for consumers (global Calendar, Journal `/summary`, and a future Tasks integration) to act on. The spawn mechanism
  (birthday → "buy present" task + nudge) is the deferred cross-module Tasks contract (Tasks unbuilt — decomposition
  UNKNOWN, resolve-by MOD-relationships/Tasks). No deny-safe port needed at S3 (spawn is the consumer's concern).
- **BR-RL-S3-5 (validation)** — `event_type`(4) validated via `ContactEventTypeSchema`; `event_date` required string
  (`MM-DD` or `YYYY-MM-DD`, RL-8 both accepted); `reminder_days` = `number[] | null`.

## §3. Surface (S3)

```ts
createEvent(input: CreateEventInput): Promise<EventView>                 // ContactNotFoundError if contact not live
getUpcomingEvents(range: EventDateRange): Promise<UpcomingEvent[]>       // resolved occurrence in [from,to], sorted
getAllEvents(): Promise<EventView[]>                                     // all events, event_date asc
```

- `EventView = Omit<ContactEventRow,'reminder_days'> & { reminder_days: number[] | null }`.
- `UpcomingEvent = { event: EventView; occurrence: string }`; `EventDateRange = { from: string; to: string }` (YYYY-MM-DD).
- `CreateEventInput` = Zod-inferred: `contact_id` + `event_date` required; `event_type`/`title`/`description`/
  `is_recurring`/`reminder_days` optional.
- **Not in the homed surface** (REL-26/27/28 = create + 2 reads): `updateEvent`/`deleteEvent`/per-contact event read.
  Events are removed via contact cascade (S1); single-event edit/remove is an un-homed surface gap (note, don't invent).

## §4. Acceptance

- [ ] `createEvent` persists + backfills (`event_type='custom'`, `is_recurring=true`); `reminder_days` round-trips object↔JSON.
- [ ] `createEvent` on a missing/soft-deleted contact → `ContactNotFoundError`; bad `event_type` → rejection.
- [ ] `getAllEvents` returns all events (event_date asc) across contacts.
- [ ] `getUpcomingEvents`: a recurring birthday `11-15` is upcoming in `[2026-10-01, 2026-12-31]` with occurrence `2026-11-15`; a birthday `01-10` wraps to `2027-01-10` (outside that range, inside `[2026-12-01,2027-02-01]`); a one-time `2026-11-20` included by literal date; events outside the range excluded; result sorted by occurrence.
- [ ] tsc 0 · eslint 0 · live-store green.

## §5. Implementation prompt

1. **Validators** — `CreateEventSchema` (contact_id+event_date required; event_type/title/description/is_recurring/
   reminder_days optional; `reminder_days: z.array(z.number().int()).nullable()`); inferred `CreateEventInput`.
2. **types.ts** — `EventView`, `UpcomingEvent`, `EventDateRange`; add 3 methods; import `ContactEventRow`.
3. **service.ts** — `eventsRepo` built (S1). `toEventView` (parse reminder_days). `mmdd`/`nextOccurrence` closures.
   `createEvent`: guard live contact → create (backfill defaults + stringify reminder_days) → re-read → toEventView.
   `getAllEvents`: findAll → sort event_date asc → map toEventView. `getUpcomingEvents`: findAll → for each compute
   occurrence (recurring=nextOccurrence(mmdd,from); one-time=event_date) → filter in [from,to] → sort by occurrence →
   map `{event: toEventView(row), occurrence}`.
4. **tests** — S3 describe block covering §4.
5. Verification Gate → inline g2 → currency BR-RL-S3-\* → commit.
