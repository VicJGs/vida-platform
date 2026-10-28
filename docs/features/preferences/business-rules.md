<!-- Business Rules — features/preferences · /documentation Phase 2 (realigned Part 1.2) · sources: ADR-002 §5.17 · ADR-012 §3.10 · ADR-013 §3.2/§3.4 · ADR-014 §3.2 · life-os settings · intake -->

# Business Rules — Preferences (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3. Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **PR-1 — Preferences are plaintext config, never `[E]`.** All three tables are structural configuration, not user content; no field is field-level encrypted. (SQLCipher L1 still encrypts the DB at rest; sync blobs still encrypt in transit — but no L2 field encryption.) `[FACT: ADR-002 L1097-1101 "All P"]`
- **PR-2 — Reads are never `undefined` (merge-with-defaults).** A consumer always receives a complete settings object: the DB row (or absence of one) is overlaid on a hardcoded `DEFAULTS`. First run with no row returns full defaults, not null. `[FACT: life-os useMergedPreferences; INTENT G8.1]`
- **PR-3 — Single-row config.** `user_preferences` and `nav_preferences` are effectively singletons (one config per user/vault); there is no multi-row preferences list. `[INTERP: ADR-002 single-user model]`
- **PR-4 — Auto-save is debounced + optimistic; no Save button.** A change applies to the UI immediately and persists automatically, batched 500ms after the last change. There is never a manual Save action. `[INTENT G8.2; FACT: life-os useUpdatePreferences]`
- **PR-5 — Theme applies app-wide instantly.** On load and on change, `theme` is synced into a Zustand store the whole UI subscribes to; the app repaints without a DB round-trip. `[INTENT G8.3; FACT: life-os themeStore sync]`
- **PR-6 — `command_key` is unique; palette ranks pinned-then-frecency.** `command_bar_history.command_key` is UNIQUE; the Cmd+K palette surfaces `is_pinned` first, then orders by frecency (`use_count`, `last_used_at`). `[FACT: ADR-002 L3560; INTENT G6]`
- **PR-7 — Module visibility ≠ feature flag.** Per-module visibility controls whether a module appears in nav; `feature_gamification` separately controls whether gamification _logic_ runs. A module may be hidden yet functionally enabled, or shown yet feature-off. `[INTENT G5]`
- **PR-8 — Preferences delegates, never owns, account/data.** It may render account/security/data-export sections but must not store account credentials, profile, or export state in its tables — those belong to Auth/Account and Data/Sync (coupling budget, §6). `[INTENT G1]`
- **PR-9 — Writes succeed locally first; config syncs LWW.** Every preference change persists locally and is functional offline; multi-device reconciliation is Last-Writer-Wins on the structured columns. `[FACT: core LF-2; ADR-003 LWW]`
- **PR-10 — Preferences is the single-writer owner of the E9 config split.** It owns `persona`/`motivation_style`/`active_modules`/`onboarding_*`, migrated off the overloaded `user_profile` (ADR-012 §3.10). It **never** writes the other owners' slices (System's per-currency total+level; Check-ins' `check_in_streak*`) and **never** receives **PII** (`display_name`/`avatar_url`/`birth_date` stay in `user_profile` ⚠) or the sibling `[E]` field `focus_areas` — the four routed families are plaintext, so PR-1 holds. No field ends with two writers. `[FACT: ADR-012 §3.10; GM-12; CK-11]`
- **PR-11 — Notification channels are `in_app` · `push` · `email` — never `sms`.** The channel config Preferences owns enumerates exactly in-app (full) · push (wake-only) · email (generic nudge); SMS is dropped platform-wide (un-encryptable, carrier-visible). Per-module push toggles ride the `push` channel. `[FACT: ADR-013 §3.4 N6; §5 L74]`
- **PR-12 — Owns the integration _management surface_, delegates the mediated _guard_.** Preferences hosts the ADR-014 Layer-3 user-managed integration surface (webhooks + external-API + cookbooks); the device-mediated fetch/parse/encrypt/egress and credential custody are ADR-014's — `connection_config` is `[E]` under the OS mediator, never a plaintext preferences column (PR-1 preserved). Each user connector is an ADR-010 sandboxed capability. Delegated like Account/Data (PR-8 sibling). `[FACT: ADR-014 §3.2/§3.4; ADR-010]`

## Validation & edge cases

- Enum fields reject out-of-set values via CHECK: `theme`∈{light,dark,system}, `time_format`∈{12h,24h}, `dock_position`∈{bottom,left,right}, `dock_size`∈{small,medium,large}. `[FACT: ADR-002 L3483,3487,3534,3537]`
- `quiet_hours_start/end` are `HH:MM` strings, meaningful only when `quiet_hours_enabled=1`. `[FACT: ADR-002 L3505-3506]`
- **N7 — quiet-hours are pre-applied at registration, not enforced at fire.** Preferences owns `quiet_hours_*`; the Notifications dispatcher consumes them **when it registers a local-scheduled OS alert** (a reminder landing inside quiet hours is scheduled shifted/suppressed) — a pre-scheduled alert fires with the dispatcher not running, so it cannot gate live. A **change to a quiet-hours preference triggers a reschedule** of affected reminders. Mechanism is Notifications' (cite-not-own); Preferences is the config source. `[FACT: ADR-013 §3.2 L51 N7]`
- `mobile_nav_items` and `dashboard_layout` are JSON TEXT; a malformed value must fall back to default, not crash (ties to PR-2). `[FACT: ADR-002 L3491,3538; INTERP PR-2]`
- Hiding all modules (PR-7) must still leave Settings reachable — visibility can never hide its own escape hatch. `[INTERP: terminal/empty state]`

## Terminal states (enumerated before build)

| Capability                  | loading                      | empty                             | error                                                                              | success                       |
| --------------------------- | ---------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| Settings screen load        | skeleton sections            | n/a (defaults always exist, PR-2) | typed read error → render defaults read-only + flag                                | full settings rendered        |
| Auto-save a change          | optimistic (already applied) | n/a                               | save fails → revert optimistic value + typed toast; never lose user input silently | persisted, batched            |
| Command palette (Cmd+K)     | querying history             | "no commands yet" / "no match"    | query error, keep typing                                                           | pinned-then-frecency list     |
| Settings search             | filtering index              | "no setting matches '<q>'"        | n/a (local index)                                                                  | matching settings highlighted |
| Per-module visibility apply | —                            | —                                 | invalid module key ignored + flagged                                               | nav updates live              |

## Failure behavior (fail loud — constitution §5)

- A failed auto-save **reverts the optimistic value** and surfaces a typed error — it never silently drops the change (PR-4). `[INTENT G8.2]`
- A malformed JSON config field degrades to its default (PR-2) and is flagged, never a crash. `[INTERP PR-2]`
- Reading a not-yet-migrated field returns its default (PR-2), so older rows never break newer code. `[INTENT G4]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)

- The 6 added `user_preferences` fields (`font_size`, `compact_mode`, `number_format`, `default_dashboard_view`, `show_archived`, `notification_frequency`) and the **per-module visibility store** are **⚠ INTENDED** — not in ADR-002 §5.17, and **no `@vida/types` preferences file exists**. PR-\* hold for the current schema; the additions require a build-phase schema + type change (candidate ADR-002 amendment). `[FACT: ADR-002 §5.17; INTENT G4]`

## Completion checklist

- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
