<!-- Business Rules — features/notifications · /documentation Phase 2 · sources: ADR-002 §5.16 L3468-3500 · common.ts L70-99 · §5.17 · ADR-012 §3.1 · ADR-004 §3.2.5 · docs/intake/notifications.md RESOLUTION -->

# Business Rules — Notifications ("the System's out-loud voice")  (level: Feature — the observer leaf)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3, SU-1/2, INT-1, INT-2, DATA-3/4.
> Every rule below complies. **Altitude note:** the v2 surface is 1 table (`notifications`), schema-only, 0 service
> logic (`reminder-engine.ts` = 0 bytes). The dispatcher · derived-reminder model · ZK wake-signal delivery below are
> **INTENDED**; live-vs-INTENDED is flagged per rule and in the ⚠ Flagged delta. Notifications is the **terminal sink**
> — it reads everything, is read by nothing.

## Invariants (what is ALWAYS / NEVER true)

- **NF-1 — Pure sink, zero out-edges.** Notifications reads signals from every module via seams and writes **only** its
  own `notifications` rows; **nothing in the OS depends on Notifications.** It can be fully disabled and no core function
  breaks. `[FACT: dep-graph terminal leaf; INT-1]`
- **NF-2 — Two production paths, one stream.** A notification is produced **either** by the ADR-012 **`surface_notification`**
  Additive effect (event-driven — a thing happened) **or** by the **dispatcher firing a due reminder** read from the
  `dueIn(range)` seam (time-driven). Both land as the same row shape in one user-facing stream. **No third path**; no
  module writes the table directly. `[FACT: ADR-012 §3.1; ADR-004 §3.2.5 single-write-path; sessions dueIn]` `[INTENT: RESOLUTION N1]`
- **NF-3 — Upcoming reminders are DERIVED, not stored (no phantom inbox).** A time-based reminder is a **derived view**
  over `dueIn()`; a durable `notifications` row **materializes only at fire time**. The OS never pre-writes future-dated
  notification rows. `dueIn`/the Global Calendar remain the single "what's coming" source; the notifications table is the
  history of what has **already fired**. `[INTENT: RESOLUTION N1; FACT: ADR-011 §3.2 derive-not-store; SS-12]`
- **NF-4 — Delivery config is Preferences-owned; Notifications only READS it.** Whether a channel is on, quiet-hours,
  and per-module push toggles live in `user_preferences` (§5.17). The dispatcher **gates** each fire against them; it
  **stores none** of that config. `[FACT: §5.17 L27-39; preferences/contract L35]`
- **NF-5 — Gate before deliver (Preferences respected on every fire).** Before delivering, the dispatcher checks: is the
  channel enabled? is the per-module toggle on? are we inside quiet hours? A suppressed notification is **still recorded
  in-app** (the inbox is the always-on channel) — suppression means *not pushed/emailed*, never *lost*. `[INTENT:
  RESOLUTION N2/N4; FACT: §5.17]`
- **NF-6 — ZK delivery: the server sees a WAKE SIGNAL, never content.** Push is a **content-free "sync now"** relay; the
  device syncs, decrypts, and composes the OS notification **locally**. The server never receives `title[E]`/`message[E]`
  **or** the plaintext `entity_type`/`entity_id`. **Channel fidelity under ZK:** in-app = full · **push = wake-only** ·
  **email = generic nudge only** ("activity in Vida — open the app") · **SMS = dropped.** `[INTENT: RESOLUTION N3 →
  ADR-013; FACT: ZK-1; ADR-001 defers push Phase 6.7]`
- **NF-7 — In-app is the always-available, fully-local channel.** In-app notifications are local encrypted rows decrypted
  on-device; they have **no ZK limitation** and are never gated away entirely (only external channels can be off). `[FACT:
  ZK-1; LF-1 local-first]`
- **NF-8 — Idempotent, no double-fire across devices.** An event notification carries the ADR-012 deterministic
  `effect_event_id` (Additive class) → a re-origination/retry/multi-device collision converges to **one** row. A
  time-based fire is keyed by its source `dueIn` occurrence so the same due reminder fires **once**, even if two devices'
  dispatchers wake. `[FACT: ADR-004 §3.2.5 Additive; ADR-012 §3.1]` `[INTENT: RESOLUTION N4 delivery-audit]`
- **NF-9 — Local-first: notify locally first, sync the record.** A fire succeeds on-device immediately; the row (and its
  `is_read`/`is_archived` state) syncs as an encrypted blob under LWW/HLC. Reading a notification on one device clears it
  unread on the others (an `is_read` LWW field). `[FACT: LF-2; ADR-003 HLC]`
- **NF-10 — Polymorphic entity link, no inline copy.** A notification points at its subject via `entity_type`/`entity_id`
  (plaintext structural refs) + a deep-link `action_url`; it **never copies** the subject's data beyond the `[E]` title/
  message the producer supplied. The subject stays canonical in its own module. `[FACT: ADR-002 §5.16; INT-1 no-duplication]`
- **NF-11 — Encryption.** `[E]` on all user-derived free text: `title`, `message`, `action_label`, and (INTENDED)
  `metadata`. Structural fields — `type`, `entity_type`/`entity_id`, `action_url`, read/archive flags, timestamps,
  delivery-audit — are plaintext. `[FACT: ADR-002 §5.16 E-marks; ZK-1]`
- **NF-12 — Six types, fixed for v1.** `type` ∈ {info, success, warning, error, reminder, achievement}; all 22 documented
  producers map onto these — **no new type** is added. `[FACT: ADR-002 §5.16 CHECK; intake producer sweep — all fit]`
- **NF-13 — Lifecycle: read → archive → expire → purge.** `is_read`/`read_at` on view; `is_archived`/`archived_at` on
  dismiss; `expires_at` auto-archives a stale row; a retention purge reclaims long-archived rows. Defaults are build-phase,
  ⚠ tunable. `[FACT: ADR-002 §5.16 fields]` `[INTENT: RESOLUTION N7]`
- **NF-14 — Achievement/level-up notifications come from Gamification, not computed here.** The `achievement` type is
  written by Gamification's `surface_notification`; Notifications **records and delivers** it, never evaluates the
  achievement predicate. `[FACT: gamification GM-15; ADR-012 §3.1]`
- **NF-15 — Digest/batching is INTENDED, not v1.** Grouping N reminders into a daily/weekly digest
  (`notification_frequency`) is documented target vision; v1 is **realtime per-notification**. `[INTENT: RESOLUTION N5]`

## Validation & edge cases
- Enum CHECK (v1 floor): `type` ∈ 6 values. `[FACT: ADR-002 §5.16]`
- A due reminder whose module is toggled off in Preferences → **recorded in-app, not pushed** (NF-5), never dropped.
- A device offline at a reminder's fire time → the dispatcher fires on next wake (local queue); idempotency key prevents a
  double-fire when it and another device both catch up. `[INTERP NF-8/NF-9]`
- A notification whose subject entity was deleted → the row survives with a dangling `entity_id`; `action_url` resolves to
  a "no longer available" state, never a crash. `[INTERP NF-10]`
- A push arriving while the app can't sync (no network) → the wake-signal is a **no-op nudge**; the real notification
  appears on next successful sync (no content was in the push to lose). `[INTERP NF-6]`
- `expires_at` in the past on creation → the row is created already-archived (an audit record), never delivered. `[INTERP NF-13]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Inbox (list/unread) | skeleton | "you're all caught up" | read error → cached + flag, retry | grouped read/unread list |
| Fire event notification | — | — | write fails → flagged, idempotent no-double | row appended + delivered per Preferences |
| Fire due reminder (dispatcher) | evaluating `dueIn` | nothing due | seam error → skip + flag, retry next tick | row materialized at fire time + delivered |
| Deliver (push/email) | dispatching | channel off → in-app only | delivery fails → in-app fallback + flag | wake-signal sent; device composes locally |
| Mark read / archive | — | — | sync conflict → LWW resolves | state updated + synced across devices |
| Expire / purge | — | nothing to purge | — | stale rows archived; retention purge reclaims |

## Failure behavior (fail loud — constitution §5)
- A failed external delivery **falls back to in-app** and flags it — never a silently dropped alert (NF-5/NF-7).
- A failed row write leaves state unchanged + flags it; the idempotent key blocks double-apply on retry (NF-8).
- A missing/stale `dueIn` source **suppresses** that reminder with a flag — never fires on fabricated due-data (NF-2/NF-3).
- A wake-signal that can't be delivered is a benign no-op (no content was staked on it) (NF-6).

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
INTENDED, not in ADR-002 §5.16 today (→ **ADR-013** + §5.20): **NF-2/NF-3** the two-path dispatcher + derived-until-fire
reminder model (the `reminder-engine.ts` service); **NF-6** the ZK **wake-signal delivery** (server relay + per-channel
fidelity collapse) → **ADR-013**; **NF-8/NF-4** a small **delivery-audit** (which channels fired, for multi-device dedup)
+ optional `metadata[E]`; **NF-15** digest/batching (`notification_frequency` → Preferences §5.17). **Live today (FACT
floor):** the `notifications` table (6 types, entity link, read/archive/expire lifecycle, `_sync_*`) — and **no service
logic**. `[FACT: ADR-002 §5.16; common.ts L81-99; grep clean packages/core/src/services]`

## Completion checklist
- [x] invariants with [FACT/INTENT/INTERP] · [x] terminal states enumerated · [x] failure is loud · [x] inherits constitution (ZK/LF/INT) · [x] spec/code drift flagged · [x] pure-sink + two-path + ZK wake-signal stated
