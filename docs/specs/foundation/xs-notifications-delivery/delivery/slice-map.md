# Slice Map — XS-notifications-delivery (#46, LIF-174)

> Entity Delivery Flow front matter · Step 2 (Decomposition Gate). Decide-mode (net-new engine; greenfield).
> 17 legs → **3 backend slices**, **0 frontend** (delivery is a mechanism; user affordances = MOD-notifications ②).
> Each slice tagged `backend`. Approved before per-slice build (Approval 1).

## Home
- Code: `packages/core/src/foundation/notifications/` (scaffold home confirmed — `foundation/notifications/CLAUDE.md`).
- Barrel: re-export from `packages/core/src/index.ts` (mirrors the other foundation services).
- Currency (D6): `docs/core/notifications-delivery/current-{spec,business-rules}.md`.

## Slices

### S1 — Tier routing · channel matrix · content-minimal payload contract  `[backend, PURE]`
The engine's decision core: given a notification's nature + platform, choose the delivery tier; enforce the
three-member channel matrix; build the content-zero push payload.
- **Legs:** XCU-01 (tier router), XCU-12 (channel matrix / no-SMS invariant), XCU-08 (payload contract builder),
  XCU-02 (in-app leg = decrypt+surface-locally decision), XCU-16 (metadata-bound types).
- **Files:** `types.ts` (tiers, channels, `DeliveryDecision`, `WakePayload`, ports interface, errors) · `tiers.ts`
  (`selectTier`, `channelsFor`) · `payload.ts` (`buildWakePayload` — asserts content-zero, IR-3) · `index.ts` barrel.
- **Verification:** Vitest pure — tier matrix (time×native→local, event/web→wake, in-app always); no-SMS refusal;
  payload rejects any content/type/entity field. No live store (pure). `[FACT: XCU-01/08/12/16]`

### S2 — Scheduling derivations (quiet-hours baking · reschedule · idempotency · materialize-at-fire)  `[backend, PURE]`
The pure math the local-scheduled tier needs before it touches any OS scheduler.
- **Legs:** XCU-05 (quiet-hours baking at registration), XCU-04 (reschedule decision), XCU-14 (idempotency dedup key),
  XCU-18 (materialize-at-fire trigger decision).
- **Files:** `scheduling.ts` (`bakeQuietHours(occurrence, prefs) → {action:'schedule'|'shift'|'suppress', at}` ·
  `reschedulePlan(old, new)` · `dedupKey(source)` · `shouldMaterialize(occurrence, now)`).
- **Composition:** reads `dueIn` occurrences + Preferences quiet-hours via **ports** (S3 wires the port objects);
  the derivations themselves are pure. `[FACT: XCU-05/04/14/18; ADR-013 §3.2 L49-51; NF-3/NF-8]`
- **Verification:** Vitest pure — a reminder inside quiet hours shifts/suppresses per setting; pref change →
  reschedule set; same occurrence → same dedup key (once across devices); past-fire → materialize now.

### S3 — Delivery dispatch: deny-safe ports · fallback→in-app · opt-out mode  `[backend, deny-safe ports]`
The executor that takes an **already-gated** `DeliveryDecision` (the dispatcher did the permission/channel/quiet-hours
gate, NF-5), routes it to the (M1 deny-safe) real-reach port, and guarantees fail-loud in-app fallback + the opt-out
posture. **No enforcer, no egress guard** — gating is upstream (IR-2). `[reframed gate-1: was "clears egress #43"]`
- **Legs:** XCU-03 (OS scheduler port), XCU-06/07 (wake-signal port; server relay is server-owned M2), XCU-09
  (closed-device generic-push port), XCU-10 (web SW push port), XCU-11 (email nudge port), XCU-15 (fallback→in-app),
  XCU-17 (opt-out mode), XCU-16 (metadata-bound governance applied at dispatch — content-zero + tier bound).
- **Files:** `service.ts` (`createNotificationDeliveryEngine(ports?)` — `deliver`, `scheduleLocal`, `cancelLocal`,
  `setDeliveryMode`) · deny-safe default ports in `ports.ts`.
- **Composition:** the engine calls a deny-safe port per off-device channel; opt-out mode restricts the tier set to
  {in_app, local_scheduled} and **never invokes** an off-device port (IR-5/XCU-17); any port `{delivered:false}` (incl.
  the M1 default) → in-app fallback + flag (IR-4). Default ports make **no network call**. `[FACT: XCU-03/06/07/09/10/11/15/17; DEL-9]`
- **Verification:** **functional Vitest (pure — no live-store).** No DB read/write at M1 (gating upstream + no schema),
  so no persistence/crypto seam to smoke — stated, not a skipped gate. Asserts: opt-out never hits an off-device port;
  a deny-safe default port → not-delivered → in-app fallback (loud); a spy port receives the correct tier/channel/payload.
  `[FACT: DEL-9/DEL-10; interpretation §3 all-pure-at-M1]`

## Non-goals (homed elsewhere — explicit)
- XCU-13 push-token registration columns → **ADR-003 device registry / sync** (not in this issue's 17-leg set).
  `[FACT: decomposition.md:47 omits XCU-13]`
- `notifications` records, dispatch policy, gating, `is_read` lifecycle → **MOD-notifications #53**. `[FACT: ADR-013 §3.6 L73-74]`
- quiet-hours / channel / opt-out **config storage** → **Preferences §5.17** (read-only here). `[FACT: NF-4]`
- Real platform reach + server wake-relay + email provider + all schema → **M2/M4/build-phase**. `[FACT: ADR-013 §5]`

## Coverage check (all 17 legs homed)
S1: XCU-01, 02, 08, 12, 16(types) · S2: XCU-04, 05, 14, 18 · S3: XCU-03, 06, 07, 09, 10, 11, 15, 16(gov), 17.
= XCU-01…12, 14, 15, 16, 17, 18 (17 legs). ✓ No leg unhomed; XCU-13 correctly out of set.
