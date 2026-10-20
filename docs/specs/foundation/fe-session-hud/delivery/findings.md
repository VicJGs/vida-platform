<!-- Findings — fe-session-hud #16 · deferred work surfaced by this unit, homed per ADR-019 §3.5
     (first-consumer-pull). Filed at S3 (BR-HUD-S3-6). -->

# Findings — fe-session-hud

## F-HUD-1 — the live "active session" data plane (homed: MOD-sessions first-consumer)

The HUD ships on the M1 stub (`useActiveSession` → `hidden`). Its live binding needs, in order:

1. **① `findActiveSession(): Promise<Session | null>`** — DOES NOT EXIST: `SessionsService` exposes
   `getSession(id)` only, no open/in-progress query `[FACT: packages/core/src/services/sessions/service.ts:118-166]`.
   Shape: most-recent `in_progress` session + its `focus_sessions` row when `sub_type='focus'`. Serves the
   coarse truth (which session · spine `started_at` ⇒ honest `elapsed` · `canPause`).
   **Home: MOD-sessions, first-consumer-pull** (the ADR-019 §3.5 rule — the consumer that needs it builds it
   against the owning service).
2. **② the shared focus-runtime client store** — the ticking interval truth (`endAt`/`phase`/`pausedAt`) is
   client-ephemeral BY DESIGN (the V5 widget owns the ephemeral countdown `[FACT: packages/ui/src/CLAUDE.md:298-306]`;
   analytics derived-on-read, PD-11). The strip HUD outlives routes, so the driver's clock must live in an
   app-level store both the driver (runtime page / Focus Mode) and the HUD read — the scope-store precedent.
   **Ships with the first live timer DRIVER** (the engine first-consumer), not with MOD-sessions.
3. **(NOTED, not assumed) ① interval-start persistence amendment** — today no interval start/planned length
   is persisted while running (`duration_seconds` is written at completion as DERIVED actual time
   `[FACT: service.ts:437,498-502]`; `nextInterval` persists no start `[FACT: service.ts:465-481]`), so a
   cold reload mid-interval cannot reconstruct the countdown and the live HUD honestly degrades to `elapsed`.
   If reload-survivable countdown is ever wanted, THAT is a ① schema/service amendment — a future decision,
   deliberately NOT smuggled here (the doc model keeps the clock client-ephemeral).

**The swap site:** `apps/web/src/session-hud/use-active-session.ts` — signature stable (the hook header
carries the two-source sketch); `HudRead`/`HudTiming` already carry everything the live binding produces.

## Queue note (not a finding of this unit)
`fe-codec-system` #12 is absent from Linear incl. archived (named "next FE head if untaken" in notes up to
2026-10-10; its dependents all shipped) — needs a one-line disposition at the next tracker reconcile.
