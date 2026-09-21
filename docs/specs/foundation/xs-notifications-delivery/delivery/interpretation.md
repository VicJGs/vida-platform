# Interpretation Layer — XS-notifications-delivery (#46, LIF-174)

> Entity Delivery Flow front matter · Step 1. Makes the implicit explicit before decomposing.
> Owning ADR: **ADR-013** (ZK notification delivery). Decomposition source: `decomposition.md:47` — **17 legs**
> `xcut-notifications:XCU-01…12, 14, 15, 16, 17, 18` (XCU-13 excluded — device-registry columns, ADR-003-owned).
> No-Guessing: every claim is `[FACT: path:line]` or grounded `[INTERPRETATION]`.

## 0. What this entity is (one sentence)
The **delivery MECHANISM** — how a notification reaches the user off-device without the server reading it — as a
pure decision/routing tier over deny-safe ports; NOT the notification records, dispatch policy, or *what/when* is
due. `[FACT: xcut-notifications.md:3-7; ADR-013 §3.6 L69-74]`

## 1. DEPENDENCIES (what must already exist)
> **This XS has ZERO build dependencies** — `decomposition.md:47` blocked-hard/soft = `—`, `—`. It is a pure
> decision/routing engine over caller-supplied inputs + deny-safe ports. That is precisely why it is a ready head.
> **Correction (gate-1, self-caught + independent critic B1):** an earlier draft made egress guard #43 a dependency
> and routed off-device transmit through `assertEgressPermitted`. **That was wrong** — see IR-2. Neither ADR-013 nor
> `xcut-notifications.md` reference egress/ADR-014, egress is NOT in this issue's dep set, and egress's mandatory
> `userInitiation:{kind:'user_action'}` (`egress/types.ts:36-41`) + step-1 never-auto-transmit would deny every
> arrival-triggered notification push. Mechanical shape-copying from the egress/ingestion/ai triad — dropped.

- **Caller-supplied inputs (NOT build deps) — the engine receives, never fetches:**
  - the **already-gated `DeliveryDecision`** (the dispatcher has already checked channel-enabled / permission /
    quiet-hours — gating is MOD-notifications', NF-5). `[FACT: NF-5 business-rules:27-30; ADR-013 §3.6 L74 "does NOT own gating"]`
  - the ADR-012 **`effect_event_id`** for an event notification — the dedup key is passed through, not re-derived
    here (effect-rail #32 owns it). `[FACT: NF-8 business-rules:39-42; ADR-012 §3.1]`
  - **`dueIn`** occurrences (MOD-sessions) + **Preferences §5.17** quiet-hours (read-only) — supplied as args/ports.
    `[FACT: xcut-notifications.md:19-21; NF-3:20-23; NF-4:24-26]`
- **SEAM — ADR-003 relay + device registry (M2/server).** Online wake reuses the existing per-user WebSocket room;
  closed-device wake + push tokens ride ADR-003. XCU-13 columns are ADR-003-owned → out of scope; the **server
  wake-relay (Hono) is server-owned, M2** (XCU-07 candidate home = "server wake-relay (Hono)"). `[FACT: ADR-013 Amends L10, §3.3 L53-55; xcut-notifications.md:34]`
- **Substrate status: greenfield.** `reminder-engine.ts` = 0 bytes; server has no notification route;
  `foundation/notifications/` = directory home only (CLAUDE.md, no code). Structural build, not a migration.
  `[FACT: xcut-notifications.md:8-9; foundation/notifications/CLAUDE.md:13-15; ADR-013 §2 L35]`

## 2. NEEDS (what the entity requires to deliver its intent)
- **A tier-selection derivation** — pick { in-app · local-scheduled OS alert · content-free wake-signal } from
  (notification nature × platform). This is the engine's central routing decision. `[FACT: XCU-01; ADR-013 §3.1 L39-47]`
- **A channel matrix invariant** — in-app (full) · push (wake-only) · email (generic) · **no SMS**. `[FACT: XCU-12; ADR-013 §3.4 L59]`
- **A content-minimal push payload contract** — zero `[E]` content, zero `type`, zero subject entity; only ADR-003
  routing metadata. `[FACT: XCU-08; ADR-013 §3.3 L53, §3.5 L61-65]`
- **Scheduling derivations** — quiet-hours **baked at registration** (not fire-time gated, because the OS fires with
  the app closed) `[FACT: XCU-05; ADR-013 §3.2 L51]`; reschedule (cancel+re-register) on schedule/pref change
  `[FACT: XCU-04; ADR-013 §3.2 L49]`; idempotency dedup key (per `dueIn` occurrence / ADR-012 id) `[FACT: XCU-14; NF-8:41-42]`;
  materialize-at-fire trigger `[FACT: XCU-18; NF-3:20-22]`.
- **Delivery execution** — routes a tier decision to the real reach; in-app fallback + flag on external failure
  `[FACT: XCU-15; NF-7:23, business-rules:85]`; the metadata-bound honesty invariant governs every tier
  `[FACT: XCU-16; ADR-013 §3.5 L61-67]`; a no-third-party opt-out mode (in-app + native local-scheduled only)
  `[FACT: XCU-17; ADR-013 §3.5 L67]`.

## 3. ORGANIZATION (how it composes — the M1 vs M2 split)
**The deny-safe shape-class** (mirrors xs-egress #43 / xs-ingestion #44 / xs-ai #45 — memory
`[[xs-security-services-deny-safe-port-build-shape]]`): a foundation service tier is **M2-facing**. M1 builds the
**pure decision engine + deny-safe/fail-closed default ports + NO schema**; M2/M4 swap in real reach + durable
stores with **zero signature change**.

- **M1 (this build) — pure DECISION legs + deny-safe PORTS:**
  - *Pure derivations:* XCU-01 (tier router), XCU-12 (channel matrix), XCU-08 (payload contract builder + content-zero
    assertion), XCU-05 (quiet-hours baking), XCU-04 (reschedule decision), XCU-14 (idempotency key), XCU-18
    (materialize-at-fire trigger decision), XCU-15 (fallback decision), XCU-16 (metadata-bound assertion), XCU-17
    (opt-out posture), XCU-02 (in-app leg = "decrypt+surface locally" decision).
  - *Deny-safe ports (the real-reach effect legs — no-op/deny until M2 wires the platform/server):* XCU-03 (OS local
    scheduler register/cancel), XCU-06/07 (wake-signal / server wake-relay), XCU-09 (closed-device generic push +
    replace-on-open), XCU-10 (web service-worker push), XCU-11 (email nudge send). Each is a port the engine calls; the
    M1 default port **denies/no-ops** and the decision is still made + auditable. `[FACT: ADR-013 §5 L111-115 "Owed build"; egress ports precedent docs/core/egress/current-spec.md]`
- **M2/M4/build-phase (NOT here):** Expo/Tauri/Web-Push/APNs/FCM real reach; the Hono server wake-relay; email
  provider; push vendor + retry/coalescing policy; **schema** — delivery-audit columns on `notifications` + push-token
  columns on the device registry (ADR-002 §5.20). `[FACT: xcut-notifications.md:52-53, 78; ADR-013 §5 L111-115, §3.6 L76]`
- **No permission gate here — gating is upstream.** The engine executes an already-gated decision; it does NOT run
  `external_out` / never-auto-transmit / channel-enabled checks (those are the dispatcher's, NF-5). The engine's own
  postures are the **content-zero payload** (XCU-08), the **metadata bound** (XCU-16), and the **opt-out mode** (XCU-17,
  restricts the tier set) — none of which is a capability call. `[FACT: NF-5; ADR-013 §3.6 L74]`
- **All-pure at M1 (no live-store).** The engine reads no DB (no grant reads — gating is upstream) and writes none
  (no schema — DEL-10); deny-safe ports make no network call. So there is **no persistence/crypto seam to smoke** —
  the Verification Gate is functional Vitest across all slices (stated, not a skipped live gate). `[FACT: DEL-9/DEL-10; xcut-notifications.md:52-53]`
- **First-consumer-pull:** consumed by MOD-notifications #53 (dispatcher/records) + MOD-sessions (`dueIn`) + 10 MOD
  feature modules. This XS ships the mechanism; the dispatcher/gating is MOD-notifications ②. `[FACT: decomposition.md:69,93-102; ADR-019 §3.5]`

## 4. IMPLICIT RULES (caught here so they don't surface as runtime crashes)
- **IR-1 — Quiet-hours is a REGISTRATION-time transform, not a fire-time gate.** A pre-scheduled OS alert fires with
  the dispatcher not running, so "respect quiet hours" must be pre-applied (shift/suppress) at scheduling; a
  quiet-hours *pref* change triggers a reschedule of affected reminders. `[FACT: XCU-05; ADR-013 §3.2 L51]`
- **IR-2 — The off-device PERMISSION gate is upstream (dispatcher), not this engine.** "Is the channel enabled? is the
  user permitted to push?" is checked by the **MOD-notifications dispatcher before it hands a decision to delivery**
  (NF-5); ADR-013 §3.6 L74 states delivery "does NOT own gating." This engine therefore does **not** call the egress
  guard or the capability enforcer — it receives an already-gated `DeliveryDecision` and executes it. The egress guard
  #43 is the *ingestion/AI content-egress* gate: it demands a `userInitiation:{kind:'user_action'}` proof
  (`egress/types.ts:36-41`) and denies non-user-initiated acts (step 1) — a fit for an interactive data-send, a
  category error for an arrival-/schedule-triggered, content-zero notification push. The **server wake-relay's** own
  transmit governance is a **Hono-server, M2** concern, not this client engine's. `[FACT: NF-5 business-rules:27-30; ADR-013 §3.6 L74; egress/types.ts:36-41; egress service/_index.md step-1]`
- **IR-3 — Content-zero is an INVARIANT the payload builder must ENFORCE, not assume.** The payload contract builder
  strips/refuses any `[E]` content, `type`, or entity ref — a builder that *could* carry content is a ZK hole. `[FACT: XCU-08/XCU-16; ADR-013 §3.5 L61-65]`
- **IR-4 — Fail-loud, never a dropped alert.** External delivery failure → in-app fallback + flag; a wake-signal that
  can't be delivered is a benign no-op (no content was staked on it). The deny-safe M1 ports return "not delivered"
  → the engine falls back to in-app, which is the always-on local channel. `[FACT: XCU-15; NF-7; business-rules:85,88]`
- **IR-5 — In-app is unconditional.** In-app is fully local, has no ZK limitation, and is never gated away — it is the
  baseline every notification has and the fallback for every failed external tier. `[FACT: XCU-02; NF-7:36-38]`
- **IR-6 — The engine is content-blind end to end.** It decides *when* (arrival/due) and *to whom* (routing metadata),
  never *what*. Even the server wake-relay reads no blob. `[FACT: ADR-013 §3.3 L55, §3.6 L72]`
- **IR-7 — No schema, no `this`.** Factory-of-closures (`createNotificationDeliveryEngine(...)` → object literal;
  intra-service calls via hoisted closures, not `this` — breaks on destructure). `[FACT: memory factory-service-no-this; foundation/egress service.ts pattern]`
- **IR-8 — SMS is a removed vocabulary, not a disabled channel.** The engine must never attempt an SMS channel; the
  channel matrix has three members. `[FACT: XCU-12; ADR-013 §3.4 L59]`

## 5. Envision Gate (Step 1.5) — N/A
Pure-backend service tier: renders no surface a user forms a mental model of (`entity-delivery-flow.md §3.75`). The
user-visible notification affordances (inbox, banners) are **MOD-notifications' UI ②** / platform chrome, not this
mechanism. Stated, not silently skipped. `[FACT: decomposition.md:69 MOD-notifications owns records/UI]`

## 6. UNKNOWNs (deferred — not homed to an M1 build leg)
- Rich/actionable push, notification-history server backup, digest/batching (N5) — ⚠ INTENDED-later, post-M1.
  `[FACT: xcut-notifications.md:75-77; ADR-013 §3.6 L76]`
- Push vendor + runtime policy (Expo vs OneSignal vs raw APNs/FCM; retry/coalescing; reschedule debounce) —
  build-phase; the contract is locked, the runtime is deliberately open. `[FACT: xcut-notifications.md:78; ADR-013 §5 L111]`
- Silent-vs-visible closed-device wake reliability — platform-dependent, build-phase (XCU-09 contract locked).
  `[FACT: xcut-notifications.md:79]`
