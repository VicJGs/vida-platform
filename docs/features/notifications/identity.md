<!-- Identity — features/notifications · /documentation Phase 2 · sources: ADR-002 §5.16 · common.ts L70-99 · §5.17 Preferences · ADR-012 §3.1 · ../life-os (v1) · docs/intake/notifications.md RESOLUTION -->

# Identity — Notifications ("the System's out-loud voice") (level: Feature — the dead-last observer leaf)

**What it is.** The OS's **alerting layer** — the single place every module's "you should look at this" surfaces to the
user: reminders, achievement unlocks, warnings, due-dates, follow-ups. It is a **pure sink** in the dependency graph:
it **observes all** modules and **nothing depends on it** (in-degree = everything, out-degree = 0). Documenting it
**CLOSES** the documentation-blueprint task. `[FACT: dep-graph — Notifications is the terminal leaf; CLAUDE.md §9]`
`[INTENT: RESOLUTION — Victor]`

**What it does.** It turns two kinds of upstream signal into one user-facing stream, then delivers each through the
channel the user allows:

- **Event-driven** ("a thing happened") → a module writes a notification row via the ADR-012 **`surface_notification`**
  Additive effect (achievement unlocked, level-up, a consequence fired). `[FACT: ADR-012 §3.1; gamification GM-15]`
- **Time-driven** ("a thing is due") → the **`dueIn(range)`** provider seam (Sessions & Scheduling) aggregates what's
  coming across 8 modules; an **on-device dispatcher** fires a row **when a reminder actually comes due** — not before.
  `[FACT: sessions dueIn seam; intake producer sweep]`

**The desire behind it.** The OS is only useful if it reaches the user at the right moment — but as a **zero-knowledge,
local-first** product it must do so **without a server ever seeing what the alert says**. Notifications is where that
tension is resolved honestly: the server relays only a **content-free wake signal**; the device composes the real
notification **locally** after decrypting. The user gets timely nudges; the server learns _that_ there was activity,
never _what_. `[INTENT: RESOLUTION N3 — Victor; FACT: ZK-1; ADR-001 defers push to Phase 6.7]`

**Scope — a lean record + an on-device dispatcher (NOT a second engine).** `[INTENT: RESOLUTION]`

- **The `notifications` record** — a polymorphic inbox row (type · title[E] · message[E] · entity link · read/archive
  lifecycle · expiry), the durable history + the in-app inbox. `[FACT: ADR-002 §5.16]`
- **The dispatcher** — an on-device loop that reads `dueIn()`, checks **Preferences** gating (channel · quiet hours ·
  per-module toggle), materializes a row at fire time, and hands it to the platform delivery layer. `[INTENT: RESOLUTION N1/N2]`
- **Delivery under ZK** — **in-app = full fidelity · push = content-free wake-signal · email = generic nudge only ·
  SMS = dropped.** The channel matrix collapses to what ZK allows. `[INTENT: RESOLUTION N3 → ADR-013]`

**What it is NOT.** `[INTENT; FACT: docs/features/*; ADRs]`

- **Not the owner of delivery preferences.** Channels, quiet hours, and per-module push toggles are **Preferences**
  (`user_preferences` §5.17); Notifications **reads** them at dispatch. `[FACT: §5.17 L27-39; preferences/contract L35]`
- **Not a scheduler, and not the Global Calendar.** _When_ something is due is owned by **Sessions & Scheduling**
  (`dueIn`); the read-only cross-module **Global Calendar** (parked, Relationships G1) is a separate consumer of the
  same seam. Notifications **fires**, it does not schedule or aggregate an agenda view. `[FACT: sessions dueIn; relationships G1]`
- **Not a source of truth for any signal.** It reads streaks, due-dates, and events via seams; it **stores none of
  them**. A notification is a _derived alert_, never the canonical record of the underlying fact. `[FACT: INT-1; ADR-011 §3.6]`
- **Not a new write engine.** Event notifications ride the **ADR-004 §3.2.5** rail via `surface_notification` (Additive);
  it invents no event bus. `[FACT: ADR-012 §3.1; ADR-004 §3.2.5]`
- **Not a phantom-inbox.** Upcoming reminders are **derived** (`dueIn`), not pre-written future rows; a row exists only
  once a notification has actually fired. `[INTENT: RESOLUTION N1]`
- **Not able to leak through push.** A wake-signal carries **no `[E]` content and no entity refs** — the plaintext
  `entity_type`/`entity_id` never ride the push channel. `[INTENT: RESOLUTION N3; FACT: entity_type is P in §5.16]`

## Completion checklist

- [x] "what it is" + "what it does" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT/INTERP] · [x] no `{{…}}` remaining · [x] pure-sink + two-path + ZK-delivery stated
