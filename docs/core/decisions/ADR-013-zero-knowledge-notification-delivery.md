# ADR-013: Deliver notifications under zero-knowledge via three tiers — local-scheduled OS alerts for time-based reminders, a content-free wake-signal for event-driven cross-device alerts, and in-app always — the server never sees notification content

**Status:** Accepted
**Date:** 2026-07-19
**Decision Makers:** Victor J.
**Context:** Vida Platform — surfaced by the **Notifications** capstone (exec #10, the dead-last observer leaf), which closed the documentation-blueprint module tier and exposed the one unresolved cross-cutting question: how does a ZK app alert the user off-device without the server reading the alert?
**Tags:** architecture · zero-knowledge · sync · notifications · platform-delivery
**Amends:**

- **ADR-001 (Tech Stack)** — **resolves the deferred "Push notification service (Expo Notifications vs OneSignal)"** (Phase 6.7): the choice is not _which push vendor sends content_ but _that push carries **no** content_ — a wake-signal only. The vendor decision (Expo vs OneSignal vs raw APNs/FCM) stays build-phase; the **contract** (content-free) is locked here.
- **ADR-003 (Sync Protocol)** — **adds a server responsibility** (a **wake-relay**: an empty OS push to a user's closed devices on blob-push arrival) beyond blob-store+relay+auth, and **extends ADR-003's existing device registry** (`device_id · name · platform · …`, §12) with **`push_token` + `push_platform`** columns rather than a parallel table; token registration rides the **existing** `/api/devices/register`, not a new route. ADR-003 is the sync protocol's single source of truth, so this delta is declared here per its amendment rule. `[FACT: ADR-003 device registry §12/L83; "single source of truth" L1100]`
- **ADR-002 (Data Model)** — adds the `notifications` **delivery-audit** columns (which channels a row fired on; Notifications N4). The push-token columns land on ADR-003's device registry (above). DDL tracked in ADR-002 **§5.20**, no DDL into its body per D5.
  **Inherits:** ADR-003 (Sync Protocol) — the server is a **blob store + relay + auth** with **per-user WebSocket rooms** that already notify _online_ devices on every blob push; the wake-signal reuses that relay + per-user routing, adding OS-push only for _closed/offline_ devices. · ADR-001 (SQLite/libsodium; Hono/CF-Workers/R2 server). · Notifications **NF-3/NF-6/NF-7** (derived-until-fire; in-app is the always-on local channel; push never carries `[E]` content or entity refs). · constitution **ZK-1, ZK-2, ZK-3, LF-1, LF-2, INT-1, EX-1/EX-2**.

---

## 1. Summary

A zero-knowledge OS has a delivery problem a normal app doesn't: the server has **never seen the user's data**, so it cannot compose "Sarah's birthday is tomorrow" and hand it to APNs/FCM. This ADR locks how notifications reach the user **without the server ever reading one** — by splitting delivery into **three tiers by nature-of-notification**, each pushing the least possible off-device:

- **In-app (always, fully local).** A notification is a local encrypted row; rendered on-device after decrypt. **Zero server involvement**, zero ZK exposure. This is the baseline every notification has.
- **Local-scheduled OS alert (time-based reminders, native platforms).** A _future, already-known_ reminder (from the `dueIn` seam) is **pre-scheduled with the device OS** on **native platforms** (Expo Notifications on mobile · Tauri on desktop). The OS fires it locally at the due time **even when the app is closed** — **no server, no network, fully ZK**. **Web is the exception:** browsers have no reliable background local scheduling, so on web a time-based reminder falls back to the wake-signal tier (service worker + Web Push). Most reminders on the devices people carry never touch the server for delivery.
- **Content-free wake-signal (event-driven cross-device; and web time-based).** When _something happens on device A_ that another device should surface (an achievement unlock, a consequence), **online** devices already learn it through ADR-003's existing per-user WebSocket relay (they sync the blob and compose locally). For a **closed/offline** device, the server sends a **content-minimal OS push** — **no title, no body, no entity ref** — via APNs/FCM/Web Push; the device syncs, decrypts, and composes the OS notification **locally**. (On iOS a _silent_ `content-available` wake is best-effort/throttled, so a fully-closed device uses a **generic user-visible push** — an empty-detail banner the device _replaces_ with real content on next open — rather than relying on silent wake; §3.3.)

Email is a **generic nudge only** ("You have activity in Vida — open the app") carrying zero `[E]` detail; **SMS is dropped** (un-encryptable, carrier-visible). **The honest bound (content-zero, not observer-zero):** the wake-signal never leaks content — but it **does introduce a new third-party observer**. The push travels through **APNs/FCM (Apple/Google)**, who learn per-device notification **timing/frequency** they never previously received; the app's own server (Cloudflare) additionally holds **push tokens**. Content, type, and subject entity are never exposed to anyone. This is a real, named exposure — not "the same metadata the relay already saw" — and it is the accepted price of off-device delivery under ZK (§3.5).

## 2. Context — what triggered this

Documenting Notifications forced the question ADR-001 explicitly deferred (Phase 6.7) and no doc had answered:

- **The server is defined as blind:** "the server is a **blob store + relay + auth**; all merge logic runs on the client" and "stores and relays only **opaque encrypted blobs** — it cannot read, index, or query user data." `[FACT: ADR-003 §Principles L22/L25; ADR-001 L35]`
- **So the normal push path is illegal here.** A standard app's server composes push content; ours **structurally cannot** — `title`/`message` are `[E]`, decryptable only client-side (ZK-1). `[FACT: constitution ZK-1; notifications §5.16 E-marks]`
- **Notifications NF-6 already committed to the answer's shape** (content-free wake-signal, device composes locally) but left the mechanism — tiers, tokens, the online-vs-closed split, the metadata bound — to an ADR. `[FACT: notifications/business-rules NF-6]`
- **Half the problem needs no server at all.** Time-based reminders are _known in advance_ (the `dueIn` derived agenda, NF-3), so they can be handed to the OS's **local** scheduler — a fact that dramatically shrinks what must ride the network. `[FACT: sessions `dueIn`; notifications NF-3 derived-until-fire]`

Because the code is greenfield (the server has `auth`/`sync`/`billing` routes and **no notification route**; `reminder-engine.ts` is 0 bytes), this is a **structural decision, not a migration**. `[FACT: apps/server/src/routes; grep clean packages/core/src/services]`

## 3. Decision

**3.1 Three delivery tiers, chosen by the notification's nature — push the least off-device.**

| Tier                         | Applies to                                                                                                      | Mechanism                                                                                                                                                                     | Server role                  | ZK exposure                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| **In-app**                   | every notification                                                                                              | local encrypted row → decrypt → render                                                                                                                                        | none                         | **none**                                                                     |
| **Local-scheduled OS alert** | time-based reminders (known via `dueIn`) — **native platforms only** (mobile/desktop)                           | device pre-schedules an OS-local notification; OS fires at due time even when app is closed                                                                                   | **none**                     | **none** (nothing leaves device)                                             |
| **Content-free wake-signal** | event-driven cross-device (a change on device A → alert device B); **and web time-based** (no local scheduling) | _online_ B: existing ADR-003 WebSocket relay → sync → compose local. _closed_ B: server sends **content-minimal** OS push via APNs/FCM/Web Push → wake → sync → compose local | relay + content-minimal push | **timing to a new 3rd party (APNs/FCM) + tokens**; never content/type/entity |

The tier is a property of the notification **and platform**: a reminder on a native device is _pre-known_ → local-scheduled (server-free); an event, or anything on web, is _reactive_ → wake-signal. In-app underlies both.

**3.2 Time-based reminders are LOCAL-SCHEDULED on native platforms — the server is not in the loop.** Because `dueIn(range)` yields upcoming reminders on-device (NF-3), the dispatcher **registers them with the native platform's local scheduler** (Expo Notifications' scheduled trigger on mobile · Tauri notification on desktop) at their due time. The OS delivers them even when the app is backgrounded or killed, **offline, with zero network** — the ZK-cleanest path. **Web is exempt:** browsers/PWAs have no reliable background local scheduling (the `Notification` constructor needs the page alive; `showTrigger` is not shipped cross-browser), so a **web** time-based reminder is delivered via the wake-signal tier (service worker + Web Push, §3.3) — accepting that path's metadata cost. On any change to the underlying schedule, the device **reschedules** (cancel + re-register).

**Quiet-hours must be baked into the schedule, not enforced at fire.** A pre-scheduled OS alert fires **without the dispatcher running** (app closed), so the dispatcher cannot gate it live. It therefore **pre-applies Preferences quiet-hours at registration** — a reminder that would land inside quiet hours is scheduled shifted/suppressed per the user's setting — and a change to the quiet-hours preference triggers a **reschedule** of affected reminders. This keeps the Notifications contract's "respect quiet hours" invariant true for a channel the live dispatcher never touches. A reminder that fires while the app is open also creates its `notifications` row (materialize-at-fire, NF-3). `[INTENT; FACT: NF-3; §5.17 `quiet*hours*\*`; notifications/contract quiet-hours gate; ADR-001 platform layer]`

**3.3 Event-driven cross-device alerts use a CONTENT-FREE wake-signal; the device composes locally.** When device A writes a notification (`surface_notification`, ADR-012), the blob syncs. **Online** peer devices are _already_ notified by ADR-003's per-user WebSocket room, sync the blob, and compose the OS notification locally — **no new mechanism**. For a **closed/offline** peer, the wake-relay sends a **content-minimal OS push** whose payload contains **no `title`, no `message`, no `entity_type`/`entity_id`**.

**The trigger reads nothing.** The wake-relay fires purely on **"a blob for this user arrived"** — routed by the **per-user room** ADR-003 already maintains (the server authenticates connections by `device_id` and rooms by user). Deciding _whom_ to wake needs the blob's **owner routing metadata the server legitimately holds**, never the blob's **contents**. "Server composes nothing" and "server sends a push" are consistent: the server decides _when_ (arrival) and _to whom_ (routing), never _what_. `[FACT: ADR-003 per-user rooms L74-76 + auth `device_id` L262/L273]`

**Reliability is bounded honestly (not the silent-push overclaim Option D was rejected for).** A _silent_ `content-available` wake is **throttled and not guaranteed** to run code on a fully-killed iOS app. So a closed device receives a **generic, user-visible push** ("You have activity in Vida") — a real banner that renders with **zero `[E]` detail** — which the app **replaces with the real, locally-composed notification** on next sync/open. Delivery of the _banner_ is thus reliable (a normal visible push); delivery of _rich local content_ is best-effort (on wake). This is strictly better than Option D (a killed app receives _nothing_), and it never stakes content on a silent wake. `[INTENT: docs/intake/notifications.md RESOLUTION N3; FACT: ZK-1; iOS content-available is best-effort]`

**3.4 Email is a generic nudge; SMS is dropped.** Email inherently reaches a plaintext-visible SMTP server, so it can carry **only** a fixed, content-free template ("You have new activity in Vida — open the app"); it never includes `[E]` detail and is opt-in. **SMS is removed** from the platform (un-encryptable, carrier-plaintext, no wake-signal possible). This **collapses v1's four-channel matrix** (v1 offered `in_app | email | push | sms`) to: **in-app (full) · push (wake-only) · email (generic) — no SMS.** `[FACT: v1 `NotificationChannel`had`sms` — ../life-os/src/types/notifications.ts]` `[INTENT: docs/intake/notifications.md RESOLUTION N3 — dropping sms is this ADR's decision]`

**3.5 The honest metadata bound (content-zero, NOT observer-zero).** The wake-signal path leaks **no content** — but it is **not** metadata-free, and crucially it introduces a **new third-party observer**. Naming both exposures precisely:

- **First-party (the app's own Cloudflare server):** holds **device push tokens** (device-identifier class, a column on ADR-003's existing device registry) and, as always, sees **blob-push timing** for routing. No new _first-party_ surface beyond the tokens.
- **NEW third-party (Apple/Google via APNs/FCM; a push service on web):** every wake-signal hands **APNs/FCM a per-device, timestamped "this user has activity now" event** — an observer that **previously received nothing** from Vida. This is a **genuinely new metadata surface**, not "the same timing the relay already saw": the sync relay is _first-party_ (your server); APNs/FCM are _Apple/Google_. Equating them would be the ZK self-deception this ADR must not make.
- **Email** additionally exposes the user's **email address + delivery timing** to the mail provider — strictly weaker again, which is why email is generic-only and opt-in.
- **Never exposed to anyone:** the notification's content, `type`, or subject entity.

**The accepted bound:** off-device delivery under ZK costs **notification timing/frequency to Apple/Google + a token held by our server** — content, type, and subject stay client-only. A user who refuses even that runs **in-app + native local-scheduled** only (no third party, ever). `[FACT: ADR-003 relay sees blob-push timing + device registry §12; ZK-1/ZK-2]` `[INTERP: APNs/FCM as a new third-party observer]`

**3.6 Ownership boundaries.**

- **Owns:** the three-tier delivery contract · the content-minimal push payload spec · the per-channel ZK-fidelity rule (in-app/push/email/no-SMS) · the **wake-relay** capability + the metadata bound.
- **Extends ADR-003, does not fork it:** push tokens are **columns on ADR-003's existing device registry** (`push_token`/`push_platform`), registered through the **existing** `/api/devices/register` — **no parallel device table, no new route.** `[FACT: ADR-003 device registry §12/L83]`
- **Adds ONE narrowly-bounded server responsibility (honestly):** a wake-relay that, on blob-push arrival, sends a **content-minimal** push to a user's closed devices. It **composes nothing, reads no blob, gains no query capability** — the server stays a blind relay; this is an _added_ relay behavior, not a _relaxed_ trust boundary. `[FACT: ADR-003 §Principles L25 minimal-server-logic; ZK-1]`
- **Does NOT own** _what_ to notify or _when it's due_ — that is Notifications (the dispatcher) + Sessions (`dueIn`). Delivery mechanism, not policy.
- **Does NOT own** notification records or gating — the `notifications` table is Notifications'; channel/quiet-hours config is Preferences' (§5.17).

**What this decision does NOT do:** it does not pick the push vendor (Expo vs OneSignal vs raw APNs/FCM), the silent-push retry/coalescing policy, the local-scheduler reschedule debounce, the push-token table's exact columns/rotation, or the email provider — those are **build-phase** (owed to ADR-002 §5.20). It locks the **contract + tiers + ZK bound**, not the runtime. Rich/actionable push (buttons, images), a notification-history server backup, and digest/batching delivery (Notifications N5) are **⚠ INTENDED-later**.

## 4. Options Considered

### Option A — Three tiers: local-scheduled (time) + content-free wake-signal (event cross-device) + in-app always (CHOSEN)

- **Rationale:** pushes the least possible off-device. Time-based reminders — the bulk — never touch the server on **native** platforms (local OS scheduling, fully ZK, works offline/closed). Event alerts (and web time-based) reuse ADR-003's existing relay for online devices and add only a **content-minimal** push for closed ones. The server composes nothing and gains no read power; the only new custody is push tokens (a column on the existing device registry).
- **Tradeoffs accepted:** off-device push exposes notification **timing to a new third party (APNs/FCM = Apple/Google)** + a token on our server (§3.5) — content stays client-only; email degrades to a generic nudge (+ address to the mail provider); SMS is dropped; web loses server-free local scheduling; the dispatcher must manage native local-scheduler (re)registration + quiet-hours baking per platform.

### Option B — Server composes and sends readable push/email content (REJECTED)

- **Why rejected:** it **breaks ZK-1** — the server would receive plaintext `title`/`message`. This is the entire thing a zero-knowledge OS exists to prevent. Non-negotiable.

### Option C — In-app only; no OS push or email at all (REJECTED)

- **Why rejected:** a life-management OS whose core value is _timely reminders_ that only appear when you already have the app open is nearly useless for its primary job. It "solves" ZK by abandoning the feature. Local-scheduled OS alerts (Option A) give real, offline, backgrounded delivery with **the same** zero ZK exposure — so there is no ZK reason to accept C's cost.

### Option D — No server push; each device keeps a persistent background socket / poll to self-generate all alerts (REJECTED)

- **Why rejected:** mobile OSes **kill background sockets and throttle background polling**; a fully-closed app receives nothing. It is battery-hostile and unreliable precisely when delivery matters (app closed overnight → miss the morning reminder). Option A is strictly better on exactly this axis: a **user-visible push reliably renders a banner** on a closed device (native push delivery is reliable, unlike D's dead socket), and the app upgrades it to locally-composed content on wake (§3.3). A carries no more content than D's socket would have pulled — and unlike D, it actually arrives.

## 5. Consequences

**Easier:**

- Timely, offline, backgrounded reminders with **zero** off-device exposure on native platforms (local OS scheduling) — the common case needs no server, no network, and no third party.
- Event alerts reuse the sync relay already built (ADR-003); closed-device wake is a narrow, content-minimal addition.
- The ZK **content** guarantee survives delivery intact: server composes nothing, reads no blob, and no observer (first- or third-party) ever sees notification content, type, or subject.
- Resolves ADR-001's deferred push question with a _contract_ (content-minimal) that outlives any vendor choice.

**Harder:**

- The dispatcher must manage **native** local-scheduler registration + reschedule-on-change + **quiet-hours baking** (per platform); **web has no server-free local scheduling** and falls to the wake-signal tier.
- The server gains a small **wake-relay** responsibility (its first beyond sync/auth/billing) + **APNs/FCM/Web-Push integration** — minimal, and it stays content-blind.
- **A new third-party observer:** APNs/FCM (Apple/Google) learn per-device notification timing they never had. Honest cost, not hidden.
- Email is a weak, generic channel; users wanting rich off-device detail cannot have it under ZK (an accepted, honest limit).

**Explicitly accepted tradeoffs:**

- Content-zero, **not** observer-zero: off-device push reveals notification **timing to Apple/Google (APNs/FCM)** + a token to our server, in exchange for real off-device delivery **without content leakage**. A user who refuses runs in-app + native local-scheduled only.
- Dropping SMS and de-scoping email to a nudge, in exchange for never leaking content to a carrier/mail server.

**Owed schema/build** (build-phase — tracked in ADR-002 **§5.20**, no DDL into its body per D5):

- **AMEND (ADR-003 device registry):** add `push_token` + `push_platform{apns,fcm,web}` columns to the **existing** device record — **not** a new table; registration rides the existing `/api/devices/register`.
- **AMEND (`notifications`):** **delivery-audit** columns (which channels a row fired on; multi-device dedup) — shared with Notifications N4.
- **SERVER:** a **wake-relay** on the Hono server (send a **content-minimal** APNs/FCM/Web-Push to a user's registered devices on blob-push arrival, by per-user routing) — composes/stores/reads **no** content.
- **CLIENT:** the dispatcher's native local-scheduler (re)registration + quiet-hours baking per platform; the wake→sync→compose-local flow; web service-worker + Web Push.

## 6. Review Date / trigger

Reconsider if: (a) a platform removes reliable local scheduled notifications (→ lean harder on the wake-signal, accepting more server timing-metadata); (b) the timing/frequency metadata proves to be a meaningful fingerprint (→ add jittered/coalesced wake-signals, or a constant-rate heartbeat); (c) users demand rich off-device content badly enough to accept a reduced guarantee (→ an explicit, opt-in "readable push" mode outside the ZK core, per the EX-1/EX-2 guarded-extension model — never the default); or (d) the push vendor/runtime choice forces a payload that can't be content-free (→ change vendor, not the contract). Otherwise revisit at the Phase-6.7 mobile-push build session.
