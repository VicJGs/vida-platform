<!-- Conventions — features/notifications · /documentation Phase 2 · sources: ADR-002 §5.16 · §5.17 · ADR-012 §3.1 · ADR-004 §3.2.5 · docs/intake/notifications.md RESOLUTION · CLAUDE.md Conventions -->

# Conventions — Notifications ("the System's out-loud voice")  (level: Feature — observer leaf)

## How to build here
- **One write path: `notifications.fire`.** Every notification — event or time-driven — enters through the `fire` handler
  (the ADR-012 `surface_notification` Additive receiver). **Never** insert a `notifications` row from another module or a
  raw query. `[FACT: ADR-004 §3.2.5 single-write-path; ADR-012 §3.1]`
- **Derive upcoming, store fired.** Read what's coming from `dueIn(range)`; **materialize a row only at fire time**. Never
  pre-write future-dated rows (no phantom inbox). `[INTENT N1; FACT: ADR-011 §3.2 derive-not-store]`
- **Gate against Preferences on every fire.** Check channel · per-module toggle · quiet hours (§5.17) before external
  delivery. A suppressed notification is **still recorded in-app** — suppression ≠ loss. `[FACT: §5.17]`
- **ZK delivery: never put content on the wire.** Push = a **content-free wake signal**; the device composes the OS
  notification locally after decrypt. Never hand `title[E]`/`message[E]` **or** `entity_type`/`entity_id` to the push/
  email path. Email = a **generic nudge** only; **no SMS**. `[FACT: ZK-1; RESOLUTION N3 → ADR-013]`
- **In-app is the always-on, fully-local channel.** It has no ZK limitation; only external channels can be toggled off.
  `[FACT: ZK-1; LF-1]`
- **Idempotent by `effect_event_id`.** Rely on the ADR-012 deterministic key + a delivery-audit for multi-device dedup;
  never trust wall-clock to decide "already fired". `[FACT: ADR-004 §3.2.5 Additive; ADR-003 HLC]`
- **Link, don't copy.** Point at the subject via `entity_type`/`entity_id` + `action_url`; never duplicate the subject's
  data beyond the `[E]` title/message the producer supplied. `[FACT: INT-1]`
- **Data conventions (inherit CLAUDE.md):** UUIDv7 TEXT PKs · Unix-ms INTEGER timestamps · booleans as INTEGER 0/1 ·
  `[E]` on `title`/`message`/`action_label`/(INTENDED)`metadata` · structural fields (type, entity refs, action_url,
  flags, delivery-audit) plaintext · `_sync_*` on the table · soft archive/expire, not hard delete. `[FACT: CLAUDE.md
  Conventions; ADR-002 §5.16 E-marks; ZK-1]`

## Naming & layout
- Invariants are `NF-N`; aspect docs = the canonical 5. `[FACT: docs/features/*]`
- Types: `type` ∈ {info, success, warning, error, reminder, achievement} — **fixed for v1**, no new type. `[FACT: §5.16 CHECK]`
- Effect: `surface_notification` (Additive, owned by ADR-012; handler = `notifications.fire`). `[FACT: ADR-012 §3.1]`
- Service: the on-device dispatcher is `reminder-engine.ts` (headless `tick()` loop) — **not** a server cron (local-first).
- Delivery channels (Preferences-gated): `in_app` (always) · `push` (wake-only) · `email` (generic). SMS dropped.

## Pitfalls / local "never do"
- **Never write the `notifications` table directly** — always via `fire` (NF-2).
- **Never pre-write future reminders** — derive from `dueIn`, materialize at fire (NF-3).
- **Never put `[E]` content or entity refs on a push/email** — wake-signal only (NF-6).
- **Never drop a suppressed notification** — in-app fallback always (NF-5/NF-7).
- **Never store delivery preferences here** — that's Preferences (NF-4).
- **Never treat Notifications as a scheduler or the Global Calendar** — it fires; Sessions schedules, Calendar aggregates (identity).
- **Never let another module depend on Notifications** — it's the terminal sink, out-degree 0 (NF-1).

## Completion checklist
- [x] how-to-build · [x] naming/layout · [x] pitfalls · [x] inherits CLAUDE.md conventions · [x] [FACT/INTENT] per claim · [x] one-write-path + derive-until-fire + ZK wake-signal enforced
