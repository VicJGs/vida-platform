# S4 — Reminders + groups + dueIn seam (mod-relationships #56 ①)

> Entity Delivery Flow ① · slice S4 of 9 (the heaviest). Legs: REL-30…42. Grounded in: `relationships.ts`
> (contact_reminders, reminder_groups, reminder_group_contacts), sessions `DueItem`/`DueProvider`/`TimeRange`
> (types.ts:219-238), the purposes DueProvider precedent (journal.ts:56), S2 `next_contact_date`, S3 `nextOccurrence`.

## §1. Context
Three reminder mechanisms (REL-35) — (a) per-contact `contact_reminders`, (b) stay-in-touch cadence overdue nudge
(REL-36, derived from S2 `next_contact_date`), (c) `reminder_groups` batch nudge. **Relationships is a PRODUCER**:
it exposes `getDueReminders(range: TimeRange)` (the R7 `dueIn` seam that Notifications' dispatcher + the Calendar +
Journal read); it **never fires or sends** anything (REL-42 — the dispatcher is Notifications, built #53). The
**N2 content-free wake payload** (REL-37) is honored **downstream** in Notifications (NF-6 content-blind push); the
local `dueIn` `DueItem.label` MAY carry the decrypted title for on-device display (Journal/Calendar). Deps unchanged
at S4 (the `registerDueProvider` wiring is S9).

## §2. Business Rules (S4)
- **BR-RL-S4-1 (REL-30/31/32)** — `createReminder` (per-contact `contact_reminder`; guard live contact →
  `ContactNotFoundError`; backfill `is_recurring:false`/`is_completed:false`/`is_snoozed:false` NN-defaults;
  re-read). `completeReminder(id)` → `is_completed:true`. `snoozeReminder(id, until)` → `is_snoozed:true`,
  `snoozed_until:until`. Both guard → `ReminderNotFoundError`. `contact_reminders` has no `deleted_at` (child).
- **BR-RL-S4-2 (REL-39/40/41, groups)** — `createGroup` (`reminder_group`; `days_of_week` JSON → `ReminderGroupView`;
  backfill `is_active:true`/`anchor_type:'schedule'`). `addMembers(groupId, contactIds)` / `removeMembers(...)` over
  `reminder_group_contacts` (idempotent — UNIQUE(group,contact); blind-insert, skip existing). `setBirthdayAnchor(groupId,
  daysBefore)` → `anchor_type:'birthday'`, `anchor_days_before:daysBefore`. Group ops guard → `ReminderGroupNotFoundError`.
- **BR-RL-S4-3 (REL-34, referential — group delete)** — `deleteGroup(groupId)` hard-deletes the group AND **sets
  `reminder_group_id` NULL** on its member `contact_reminders` (the reminder survives, ungrouped) AND removes its
  `reminder_group_contacts` rows. App-layer (no-FK), defensive/idempotent.
- **BR-RL-S4-4 (REL-33/36 — the `dueIn` producer)** — `getDueReminders(range: TimeRange): DueItem[]` (range = Unix-ms
  window; convert to ISO day bounds `fromISO`/`toISO`). Produces `DueItem{source_module:'relationships', ref_id, label,
  est_minutes:0, urgency, hard_deadline?}` from:
  1. **Explicit reminders** — `contact_reminders` not `is_completed`, effective-due = `is_snoozed && snoozed_until ?
     snoozed_until : reminder_date`; include iff effective-due ∈ [fromISO,toISO]. `ref_id`=reminder.id, label=title.
  2. **Stay-in-touch overdue (REL-36, the canonical case)** — contacts with `next_contact_date != null &&
     next_contact_date <= toISO` (overdue-through-end-of-window). `ref_id`=contact.id, label=first_name.
  3. **Birthday-anchor groups** — for each `anchor_type='birthday'` group, each member with a `birthday` event:
     occurrence = `addDaysISO(nextOccurrence(birthday_mmdd, fromISO), -anchor_days_before)`; include iff ∈ range.
     `ref_id`=`${group.id}:${contact.id}`.
  4. **Daily/weekly schedule groups** — `anchor_type='schedule'`: `daily` → every day in range; `weekly` → the
     `days_of_week` weekdays in range. `ref_id`=`${group.id}:${iso}`.
  - **⚠ Flagged gap (grounded, not a manufactured cut):** biweekly/monthly/quarterly/yearly SCHEDULE groups need a
    phase-anchor the schema does NOT carry (no `start_date`) → **not projected** at S4; homed forward (FE/Notifications
    scheduling or an ADR-002 amendment). Birthday-anchor + daily/weekly are deterministic and shipped.
  - Every item carries `hard_deadline` = its due moment (ms) + `urgency:0` (no urgency algorithm at M1 — sessions
    dueIn precedent; deferred). Sorted by `hard_deadline` (due date) asc.
- **BR-RL-S4-5 (REL-42, invariant)** — a group reminder **never auto-sends**; `getDueReminders` only SURFACES. No
  write, no transmit.
- **BR-RL-S4-6 (REL-37/38 — honored downstream)** — N2 content-free push = Notifications (NF-6); N7 quiet-hours =
  Preferences/Notifications (S9 light-honor). S4 produces the due items only.
- **BR-RL-S4-7 (validation)** — `frequency`(6)/`priority`(5) via canonical Zod; `reminder_date`/`snoozed_until` =
  `YYYY-MM-DD`; `days_of_week` = `number[]` (0-6).

## §3. Surface (S4)
```ts
createReminder(input: CreateReminderInput): Promise<ContactReminderRow>   // ContactNotFoundError
completeReminder(id: string): Promise<ContactReminderRow>                 // ReminderNotFoundError
snoozeReminder(id: string, until: string): Promise<ContactReminderRow>    // ReminderNotFoundError
createGroup(input: CreateGroupInput): Promise<ReminderGroupView>
addMembers(groupId: string, contactIds: string[]): Promise<void>         // ReminderGroupNotFoundError; idempotent
removeMembers(groupId: string, contactIds: string[]): Promise<void>      // ReminderGroupNotFoundError
setBirthdayAnchor(groupId: string, daysBefore: number): Promise<ReminderGroupView>  // ReminderGroupNotFoundError
deleteGroup(groupId: string): Promise<void>                              // SET NULL + junction purge (idempotent)
getDueReminders(range: TimeRange): Promise<DueItem[]>                     // the R7 dueIn producer
```
- `ReminderGroupView = Omit<ReminderGroupRow,'days_of_week'> & { days_of_week: number[] | null }`.
- `TimeRange`/`DueItem` imported from `../sessions` (the shared seam types). `CreateReminderInput`/`CreateGroupInput`
  Zod-inferred. Errors: `ReminderNotFoundError`, `ReminderGroupNotFoundError` (new).

## §4. Acceptance
- [ ] createReminder (guard live contact, backfill defaults); completeReminder flips is_completed; snoozeReminder sets snooze fields; unknown → ReminderNotFoundError.
- [ ] createGroup (days_of_week JSON round-trip, backfill is_active/anchor_type); addMembers idempotent (dup → 1 row); removeMembers; setBirthdayAnchor sets anchor; group ops unknown group → ReminderGroupNotFoundError.
- [ ] deleteGroup: group gone, member reminders' reminder_group_id NULL (reminder survives), junction rows gone.
- [ ] getDueReminders: an explicit reminder due in window surfaces (ref_id=reminder.id); a snoozed reminder uses snoozed_until; a completed reminder excluded; a stay-in-touch-overdue contact surfaces (next_contact_date<=toISO); a birthday-anchor group member surfaces at birthday−daysBefore; a weekly schedule group surfaces on its days_of_week; biweekly schedule group NOT projected (flagged).
- [ ] tsc 0 · eslint 0 · live-store green.

## §5. Implementation prompt
1. **Validators** — `CreateReminderSchema` (contact_id required; title required [notNull]; reminder_date/is_recurring/
   frequency/reminder_group_id/priority optional), `CreateGroupSchema` (name required; message_template/time_of_day/
   frequency/days_of_week/anchor_type/anchor_days_before optional; `days_of_week: z.array(z.number().int()).nullable()`).
2. **types.ts** — `ReminderGroupView`; 9 methods; `ReminderNotFoundError`/`ReminderGroupNotFoundError`; import
   `ContactReminderRow`/`ReminderGroupRow`, `TimeRange`/`DueItem` from `../sessions`.
3. **service.ts** — repos: `remindersRepo` (S1), `reminderGroupsRepo` (new), `reminderGroupContactsRepo` (S1). Helpers:
   `toGroupView` (parse days_of_week), `msToISO`. Build the 9 methods per §2; `getDueReminders` composes the 4 producers.
4. **tests** — S4 describe block covering §4.
5. Verification Gate → independent g2 (dispatch — heaviest slice) → currency BR-RL-S4-* → commit.

## Open calls (resolved/flagged, No-Guessing)
- **getDueReminders return = `DueItem[]`** (not a bespoke type) — fits the sessions seam directly (S9 registers
  `fetch: r => svc.getDueReminders(r)`). FACT (seam contract).
- **label carries title/name** — local dueIn consumers decrypt on-device; N2 stripping is Notifications' push path. FACT.
- **biweekly+ schedule groups** — genuine schema gap (no phase anchor) → flagged forward, NOT invented. (Grounded per
  [[dont-manufacture-a-deferral-to-cut-build-phase-scope]]: this is a real missing column, not a scope cut.)
