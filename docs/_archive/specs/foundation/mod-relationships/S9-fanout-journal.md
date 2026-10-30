# S9 — Fan-out + Journal + deny-safe seams (mod-relationships #56 ① — the ① closer)

> Entity Delivery Flow ① · slice S9 of 9 (the closer). Legs: REL-51, REL-52, REL-53, REL-57, REL-33/36/38, N7.
> Composes the BUILT Journals registry + sessions DueProvider seam. Grounded in: the purposes-S9 `journal.ts`
> precedent, [[event-fanout-pull-push-split-and-occurrence-grain]], the C1/C2 guards (no measurement, no economy).

## §1. Context

Relationships is a **PULL-only contributor + a DueProvider lane** — it registers (a) a `JournalContribution` into the
Journals registry (`summary(date)` feeds the daily recap, PULL at render) and (b) `getDueReminders` (S4) as a sessions
**DueProvider** lane (SS-7). It has **NO effect-rail PUSH**: health is NOT a measurement (C1), and the
interaction-streak→Gamification emit is deferred (C2 — 012 not a driver, no economy contract this pass). REL-51/57/N7
are documented seams (the OWNER modules consume our data / apply downstream). The registry handles are PARAMS to the
register helpers (not service deps — the purposes/projects precedent), so no unused registry field.

## §2. Business Rules (S9)

- **BR-RL-S9-1 (REL-53 — Journal `/summary`)** — `getDayRelationshipsDigest(date): { interactionsToday, eventsToday,
remindersDue }`: interactions logged on `date`; events occurring on `date` (recurring `MM-DD` match OR one-time
  `event_date===date`); explicit `contact_reminders` due on `date` (effective-due = snoozed_until if snoozed else
  reminder_date, not completed). `createRelationshipsJournalContribution(svc)` → a `JournalContribution`
  (`module:'relationships'`, `sectionKey:'summary'`); `summary(date)` returns `SectionData` — `state:'success'` iff
  any activity, else `'empty'` (never throws; reuses the `TerminalState` canon BY TYPE, purposes precedent).
  `registerRelationshipsJournal(registry, svc)` registers it.
- **BR-RL-S9-2 (REL-33/36/38 — DueProvider lane)** — `registerRelationshipsDueProvider(sessions, svc)` registers
  `{ module:'relationships', fetch: r => svc.getDueReminders(r) }` into the sessions SS-7 due-work seam (S4 built the
  producer; S9 wires the lane). Notifications' dispatcher + the Calendar read it transitively via `sessions.dueIn`.
- **BR-RL-S9-3 (REL-51 — Tasks follow-up, seam)** — follow-ups are **Tasks-owned**; relationships surfaces
  `interaction.follow_up_needed`/`follow_up_date` (S2 fields). Tasks READS them when built — no relationships code
  (documented seam; Tasks is the consumer).
- **BR-RL-S9-4 (REL-52 — Gamification streak, deferred C2)** — interaction-streak→Gamification is an `[INTENT]` edge
  owned by Gamification; **no emit / no economy contract this pass** (C2). A documented deferred seam (no effect rail).
- **BR-RL-S9-5 (REL-57 / N7 — Preferences / quiet-hours, seam)** — reminder-defaults / closeness definitions are a
  Preferences override at M2 (S6 closeness already derives from relationship_type+is_favorite without Preferences);
  N7 quiet-hours is Notifications/Preferences-owned (applied downstream). No relationships code at M1.

## §3. Surface (S9)

```ts
// service method:
getDayRelationshipsDigest(date: string): Promise<RelationshipsDayDigest>   // { interactionsToday, eventsToday, remindersDue }
// journal.ts (register helpers — params, not deps):
createRelationshipsJournalContribution(svc): JournalContribution
registerRelationshipsJournal(registry: JournalRegistry, svc): void
registerRelationshipsDueProvider(sessions: SessionsService, svc): void
```

- `RelationshipsDayDigest = { interactionsToday: number; eventsToday: number; remindersDue: number }`.
- Barrel exports the 3 register helpers. No new deps.

## §4. Acceptance

- [ ] `getDayRelationshipsDigest`: counts interactions on the date, events occurring that day (recurring MM-DD + one-time), explicit reminders due that day (snoozed→snoozed_until; completed excluded).
- [ ] `createRelationshipsJournalContribution(svc).summary(date)` → `state:'success'` on an active day, `'empty'` on an idle day (never throws).
- [ ] `registerRelationshipsJournal` registers into a JournalRegistry; `registerRelationshipsDueProvider` registers the lane and `sessions.dueIn(range)` then surfaces relationship due items.
- [ ] tsc 0 · eslint 0 · live-store green.

## §5. Implementation prompt

1. **types.ts** — `RelationshipsDayDigest`; add `getDayRelationshipsDigest` to the interface.
2. **service.ts** — `getDayRelationshipsDigest(date)`: direct repo queries (interactions on date; events via `mmdd`
   match; reminders effective-due on date). Uses existing helpers (mmdd); no intra-object method calls.
3. **journal.ts** (new) — `createRelationshipsJournalContribution` / `registerRelationshipsJournal` /
   `registerRelationshipsDueProvider` (purposes `journal.ts` mirror). `index.ts` barrel re-exports them.
4. **tests** — S9 describe block covering §4 (register into a real JournalRegistry + sessions, assert dueIn surfaces).
5. Verification Gate → inline g2 → full-suite checkpoint (pre-PR) → currency BR-RL-S9-\* → commit → **PR the whole ①**.

## Open calls (resolved, No-Guessing)

- **PULL-only + DueProvider; NO effect-rail PUSH** (C1 no measurement, C2 no economy) — [[event-fanout-pull-push-split-and-occurrence-grain]].
- **REL-51/52/57/N7 = documented seams** (owners consume / deferred) — grounded in the decomposition homing, not manufactured cuts.
