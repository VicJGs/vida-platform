<!-- Intake — Notifications (exec #10, the dead-last leaf) · captures INTENT, not ship-scope · sources: ADR-002 §5.16 · common.ts L70-99 · ../life-os/src/types/notifications.ts · §5.17 Preferences · 22-producer sweep -->

# Intake — Notifications ("the System's out-loud voice")

> The **dead-last leaf**: it OBSERVES ALL modules and **nothing depends on it** (in-degree = everything,
> out-degree = 0). Documenting it CLOSES the documentation-blueprint task. Intake captures full intent;
> ⚠ INTENDED-IMMATURE is flagged per item, never "ship now vs later".

## Current floor (v2 — FACT)
- **`notifications`** table (ADR-002 §5.16 / `common.ts` L81-99): `type` CHECK ∈ {info, success, warning,
  error, reminder, achievement} · `title[E]` · `message[E]` · `action_url` · `action_label[E]` ·
  polymorphic `entity_type`/`entity_id` · `is_read`/`read_at` · `is_archived`/`archived_at` · `expires_at`
  · `created_at` · `_sync_*`. One partial index `idx_notifications_unread (is_read) WHERE is_archived=0`.
- **Schema-only, 0 service logic** (`reminder-engine.ts` is 0 bytes; grep clean of `packages/core/src/services`).
- **Delivery config lives in Preferences, NOT here** `[FACT: §5.17 L27-39; preferences/contract.md L35]`:
  `notification_email`/`notification_push`/`notification_in_app` · `quiet_hours_enabled`/`_start`/`_end` ·
  per-module `push_habits`/`tasks`/`routines`/`contacts`/`study`. (`notification_frequency` = ⚠ INTENDED,
  not in §5.17 yet — preferences/business-rules L40.)

## v1 harvest (../life-os/src/types/notifications.ts — the fuller vision)
- `NotificationChannel = in_app | email | push | sms`; row carried **`channels[]`** + **`metadata` JSON** +
  `updated_at`. (v2 moved channels → Preferences; dropped metadata + updated_at.)
- `UnreadCounts { unread · error · warning · reminder }` — a badge/summary read.
- `NotificationPreferences` — email-on-{due,completion,comment,mention} · weekly-summary · per-module push ·
  `notification_frequency = realtime | daily | weekly` · quiet hours. (→ v2 = Preferences' job.)
- Filters (status/type) + pagination — a full inbox UI.

## Producer inventory (the in-edges — 22 producers / ~14 modules; sweep 2026-07-19)
Two production paths already exist in the docs:
- **Event-driven (push a row):** the ADR-012 **`surface_notification`** Additive effect (Gamification unlock/
  level-up; the generic write path). `[FACT: ADR-012 §3.1; gamification GM-15]`
- **Time-driven (pull via seam):** the **`dueIn(range)`** provider seam (Sessions & Scheduling) that **8
  modules** register with — Health (workouts·meals·exams), Finance (Commitments FN-14), Learning (study
  sessions·plan deadlines), Purposes (reviews), Routines (occurrences), Skills (practice/decay), Books
  (reading-plan deadlines), Relationships. `[FACT: sweep — sessions dueIn seam]`
- **Direct reminder tables:** Relationships `contact_reminders` + `reminder_groups` (birthday/event-anchored,
  snooze). `[FACT: relationships/contract L20; business-rules G11]`
- **Template-scheduled:** Check-ins per-template `schedule_days`/`preferred_time` (CK-8). `[FACT: check-ins/contract L28]`
- **Preferences-gated at fire:** Habits `times_of_day`+`push_habits`; Pomodoro interval boundary. `[FACT: habits/business-rules L26; pomodoro PD-7]`
- **Global Calendar** (Relationships G1) = a PARKED cross-module read-only aggregator; **Notifications ≠
  Calendar** (both independently read `dueIn`). `[FACT: relationships G1 forward-dep]`

## Open design questions (the intake dialogue — Victor's calls)
- **N1 — Materialized vs derived.** Event-driven notifications are real rows (surface_notification, ADR-012).
  But are **upcoming time-based reminders** stored rows, or a **derived agenda** from `dueIn()` that only
  materializes a row when it actually fires? (Storing the future = a phantom-row inbox.)
- **N2 — Preferences boundary (confirm).** Channels + quiet hours + per-module toggles = Preferences; Notifications
  reads them at dispatch and owns only the records + dispatch/gating logic. `[looks settled — confirm]`
- **N3 — ZK push delivery (the hard fork).** ADR-001 DEFERS the push service (Phase 6.7). Under ZK the server
  can't read `[E]` title/message. Options: (A) **content-free wake-signal** — relay "sync now", device composes
  the OS notification locally after decrypt (ZK-correct, Signal-style); (B) server sends readable content (breaks ZK);
  (C) generic content only ("activity in Vida"). Email is inherently plaintext-to-server → generic-only or out-of-ZK.
  May surface an ADR / ADR-001 amendment.
- **N4 — Restore channel-record / metadata?** Does a row record *which channel(s) it was delivered on* (audit/
  dedup) and carry entity-specific `metadata` JSON, or stay lean? (v1 had both.)
- **N5 — Digest / batching.** `notification_frequency` (realtime/daily/weekly) → group N reminders into one
  digest? In scope or ⚠ INTENDED-later?
- **N6 — Types adequacy.** All 22 producers fit the 6 existing types; confirm no new type (e.g. a distinct
  `mention`/`system` beyond `info`).
- **N7 — Lifecycle.** `expires_at` exists — auto-archive/auto-purge policy + retention?

## RESOLUTION (Victor, 2026-07-19)
- **N1 = DERIVED-UNTIL-FIRE.** Upcoming time-based reminders are a **derived agenda** over `dueIn(range)` (no
  stored rows); a real `notifications` row **materializes only when the reminder fires**. Event-driven
  notifications (`surface_notification`, ADR-012) are always rows. Matches the ADR-011/012 derive-not-store
  house rule; kills the phantom-inbox; keeps `dueIn`/Global Calendar the single "what's coming" source.
- **N2 = CONFIRMED.** Delivery config (channels · quiet hours · per-module toggles) is **Preferences** (§5.17);
  Notifications reads it at dispatch and owns only the records + the on-device dispatcher + gating logic.
- **N3 = CONTENT-FREE WAKE SIGNAL** (→ surfaces **ADR-013**). The server relays a **content-free "sync now"**
  ping; the device syncs, decrypts, and composes the OS notification **locally** — server never sees `[E]`
  content **or** entity refs. Channel fidelity under ZK collapses: **in-app = full · push = wake-only · email
  = generic nudge only ("activity in Vida") · SMS = DROPPED.** Cross-cutting (server + ADR-001 Phase-6.7 +
  ADR-003 transport) → its own gated ADR pass.
- **N4 = LEAN + delivery-audit + optional metadata.** Row stays lean; **restore a small delivery-audit**
  (which channels a row fired on) for multi-device dedup; add optional `metadata` JSON `[E]` for extensibility.
- **N5 = ⚠ INTENDED-IMMATURE.** Digest/batching (`notification_frequency` realtime/daily/weekly) is documented
  target vision, **not v1**; owes `notification_frequency` → Preferences §5.17 + a batching design pass.
- **N6 = 6 TYPES SUFFICIENT.** All 22 producers fit {info,success,warning,error,reminder,achievement}; no new type.
- **N7 = LIFECYCLE POLICY.** `expires_at` drives auto-archive; a retention purge (archived-older-than) reclaims
  space. Both build-phase defaults, ⚠ tunable.

## Completion checklist
- [x] current floor (FACT) · [x] v1 harvest · [x] producer inventory (in-edges) · [x] open questions surfaced · [x] N1-N7 resolved → 5 aspect docs · [x] surfaced ADR-013 (ZK notification delivery)
