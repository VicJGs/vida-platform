<!-- Slice Map — fe-session-hud #16 · Entity Delivery Flow §2/§8. Decide-mode (net-new chrome unit).
     Per-slice: PLAN ░g1░ → IMPL ░g2░ → BUILD → blocking Verification/Visual Gate before the next slice.
     STATUS: ⏳ pending Approval 1. -->

# Slice Map — fe-session-hud (Session HUD, #16)

**Home:** `apps/web/src/session-hud/` (sibling of `session-runtime/` + `flow/`). All slices **frontend** (pure ②).
Envision ✅ APPROVED (EC-1…EC-10; 3 answers pinned — see envision.md header).

| Slice | Plane | Surface (what it builds) | ECs carried | Gate |
|-------|-------|--------------------------|-------------|------|
| **S1 — Substrate: types + tick + hook** | frontend (logic-only) | `session-hud/{types,use-active-session,use-hud-clock}.ts` — `HudRead` (tri-state, g1-B4) / `HudSource` / `HudTiming` (countdown carries `pausedAt?`, g1-B2) / `ActiveSessionRead` / `HudSessionsPort` (seam-contract §A/§B) · `useActiveSession()` (M1 stub: `{kind:'hidden'}` + DEV `?sample` seeds for idle / running-countdown (focus + break phases) / running-elapsed / **paused-frozen** / **interval-complete**; stable-signature live-swap header honestly noting the ① interval-clock gap [g1-B1]; no-op-safe port) · `useHudClock(timing)` — drift-free ~1s derive (imperative arm, §D trap) + paused freeze (`endAt − pausedAt`, PD-5) + **zero-cross → HOLD `00:00` + `complete` flag (EC-3c, the V5 widget precedent — never overtime)** + `mm:ss`/`h:mm:ss` formatting | EC-3b, EC-3c, EC-3d(phase on the type), EC-7, EC-5(port) | **Verification Gate** (renders nothing: vitest logic + failure paths + TZ-forced time math incl. pause-freeze + zero-cross-hold; no Visual Gate — the fe-codec-seams precedent) |
| **S2 — The HUD pill** | frontend | `session-hud/session-hud.tsx` — renders `HudRead`: `hidden` → null · `idle` (hollow ring + invitation ≥768 — `?sample`-only in M1 per answer 1, representable through the tri-state seam [g1-B4]) · `active` running (ring + tabular time + PHASE eyebrow [focus/break — EC-3d] + title ≥768; ring-arc only for `countdown`, elapsed shows ring-as-glyph) · paused (muted tokens, `PAUSED` eyebrow, FROZEN time) · interval-complete (held `00:00`, ring full, `<PHASE> · DONE` eyebrow — EC-3c) · pause/resume ghost ONLY when `canPause` (≥768, always-visible per answer 3; a DOM SIBLING of the link, never nested — §E) · pill = link → `/sessions/$id` · ≤375 ring+time condensation · reduced-motion · full aria-labels | EC-2, EC-3, EC-3b, EC-3c, EC-4, EC-5, EC-6, EC-8, EC-9, EC-10 | **Visual Gate** (component harness: 5 forms × 3+ presets × light/dark × 375/768/1440 — AA measured incl. warm-dark · axe [incl. no nested-interactive] · overflow) |
| **S3 — Shell mount + honest-empty wiring** | frontend | `routes.tsx RootComponent` gains `hudSlot={<SessionHud/>}` (the surface composes S1+S2; `hidden` ⇒ renders null — M1 prod shows NO HUD) · DEV `?sample` end-to-end incl. the deep-link carrying the `sample` param through to `/sessions/$id` (g1-B5, §D) · integration tests (strip co-fit, deep-link+param nav, hidden-in-prod; no per-unit tabIndex handling — the Bar-1 precedent, §E) · **delete `__envision__` harness + envision.html** (gate artifact) · file **F-HUD-1** (MOD-sessions first-consumer: `findActiveSession` read + the interval-clock persistence gap [g1-B1]) | EC-1, EC-6 (real strip), EC-7 | **Visual Gate** (REAL shell: 375 co-fit beside icon-only toggles + compact Bar-1 · 3 presets × light/dark · axe · no overflow; Victor-reviewed) |

## Order & rationale
S1 → S2 → S3 strictly: the pill renders S1's source; the mount needs both. One unit-wide PR (the #23 precedent).

## Envision coverage (structural ECs → slices)
EC-1→S3 · EC-2→S2 · EC-3/3b→S1+S2 · EC-3c→S1(clock)+S2(form) · EC-3d→S1(type)+S2(eyebrow) · EC-4→S2 ·
EC-5→S1(port)+S2(control) · EC-6→S2+S3 · EC-7→S1+S3 · EC-8→S2. Feel: EC-9/EC-10 = per-slice Visual Gates.
**0 structural ECs unmapped.**

## Gate-1 record
Independent critic (read-only, re-derived from code): **REVISE** — B1 (live countdown underivable from
persisted focus rows → seam §A re-derived) · B2 (paused freeze → `pausedAt` + clock freeze) · B3 (zero-cross
undesigned → EC-3c) · B4 (idle unrepresentable → tri-state `HudRead`) · B5 (`?sample` deep-link dead-end →
param carries through) · N1/N2 (sibling-not-nested control; Bar-1 tabIndex precedent → seam §E). **All folded;
confirm pass SHIP; slice cut unchanged.**

**Grounding pass (Victor-directed, post-confirm):** the pomodoro capability docs + the shipped V5 widget spec
doc-fix what B1/B3 had left as proposals — **(a)** EC-3c's overtime count-up was WRONG: zero-cross =
hold-`00:00` + completion cue (the V5 held "${phase} complete" precedent; PD-7 preference-owned boundary
behaviour; PD-4/PD-5 fixed-length intervals, overrun ≠ focus credit). **(b)** B1's "persist the interval
clock" ① widening was fighting the doc model — the ticking clock is client-ephemeral BY DESIGN (V5 owns the
ephemeral countdown; PD-11 derived-on-read); the live countdown source is a ②-plane shared focus-runtime
store shipping with the first live timer driver; F-HUD-1 re-scoped to the `findActiveSession` read (the
genuine ① gap), with reload-survivable countdown noted as a possible future ① amendment, not assumed.
**(c)** EC-3d added: break intervals are first-class countdowns (PD-4; identity terminal states) — the
eyebrow carries the phase.

## Deferred (homed, not owed)
- Live `ActiveSessionRead`/port binding → data plane (UI-3/M1.1+); **F-HUD-1** = the ① `findActiveSession`
  read (MOD-sessions first-consumer) + a NOTE on the optional interval-start persistence amendment.
- The shared focus-runtime client store → the first live timer driver (engine first-consumer).
- Session start flow → `fe-sessions` #34. Rich controls → `/sessions/$id` (#23). Focus Mode → its own
  INTENDED surface (pomodoro/identity.md:32-38) — the HUD only deep-links.
