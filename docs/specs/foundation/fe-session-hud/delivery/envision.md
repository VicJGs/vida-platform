<!-- Envision Gate — fe-session-hud #16 (Entity Delivery Flow §3.75). Greybox: apps/web/envision.html +
     src/__envision__/ (THROWAWAY — deleted after the gate). Reviewer: Victor (blocking, before decomposition).
     STATUS: ✅ APPROVED — Victor, 2026-10-16 (live Brave review, localhost:5199/envision.html).
     Open questions RESOLVED as the leads: (1) idle HIDDEN in M1 prod — the stub's honest-empty renders no HUD;
     all states demoable via DEV `?sample` (no dead "Begin" affordance). (2) un-timed sessions COUNT UP, plain
     `1:07:12`, eyebrow carries meaning; countdown only for timed focus intervals (EC-3b). (3) pause/resume
     ALWAYS-VISIBLE ghost at ≥768 (keyboard/SR parity).
     Post-approval contract FACT (sharpens EC-4/EC-5): SESSION_STATUS has NO 'paused' — pause exists ONLY in
     the focus runtime (focus_sessions POMODORO_STATUS; pauseFocus/resumeFocus). The paused form + the pause
     affordance therefore apply to focus-timed sessions only; generic in_progress sessions show count-up with
     no pause control (canPause=false). [FACT: packages/types/src/session.ts:58-66 · services/sessions/types.ts:115] -->

# Envision — Session HUD (#16)

**Concept:** *the OS's pulse.* A quiet, persistent indicator of the active session, hard-right in the
reserved top strip — present on every surface, honest when nothing runs, one tap from the full runtime page.

Greybox: real `AppShell` + tokens + `@vida/ui` `Button`, Brave-rendered, 3 states × 4 presets × light/dark ×
375/768/1440.

## Checkpoints (EC-n — structural = greybox-provable, carried as Visual-Gate MUSTs; feel = live per-slice)

| EC | Type | Checkpoint |
|----|------|-----------|
| EC-1 | structural | The HUD is a persistent strip region (the shipped `hudSlot`), hard-right, on EVERY routed surface; Bar-1 keeps `flex:1` — the HUD is content-fit and never evicts Bar-1/toggles. |
| EC-2 | structural | Three DESIGNED states — idle · running · paused (with two running/paused sub-forms per EC-3c: interval-complete and frozen — five render forms total). Idle is an invitation (hollow ring + "Begin a session" ≥768), never a blank dead region; never a phantom session. |
| EC-3 | structural | Running = living progress ring (preset-aware accent, hairline track) + `tabular-nums` time + uppercase kind eyebrow + truncated title (≥768). The whole pill is ONE link → `/sessions/$id`. |
| EC-3b | structural | Time semantics are honest: **countdown** only for a timed focus interval; **count-up elapsed** for an un-timed session (a `'work'` session has no planned end). No invented remaining-time. |
| EC-3c | structural | *(g1-B3 amendment, DOC-GROUNDED — pending Approval 1)* Zero-cross follows the **shipped V5 widget precedent, not overtime**: at `00:00` the countdown HOLDS (`00:00`, ring full) and the eyebrow flips to the completion cue (`FOCUS · DONE` — the widget's "${phase} complete" voice `[FACT: v5-pomodoro-widget.md:67,75-76,104]`), awaiting the engine/user advance — interval-boundary behaviour is PD-7 preference-owned (`auto_start_*`), never HUD-invented; intervals are fixed-length (PD-4) and overrun is NOT focus credit (PD-5), so no `+m:ss` count-up. Never negative. A **paused** countdown is FROZEN (`endAt − pausedAt`, PD-5), never draining. |
| EC-3d | structural | *(doc-grounded refinement)* The eyebrow reflects the interval PHASE — a break interval is a first-class countdown (`focus · short-break · long-break`, PD-4; "Break" is a capability terminal state `[FACT: pomodoro/identity.md:54-58]`) — the HUD never shows a break as focus. |
| EC-4 | structural | Paused = same geometry; ink falls to muted TOKENS (never opacity on text); eyebrow flips to `PAUSED`; affordance flips pause→resume. |
| EC-5 | structural | In-strip control is minimal: ONE ghost pause/resume at ≥768. Everything richer lives on the runtime page. The HUD never writes — intents via the `SessionsPort` binding (BR-FS-2). |
| EC-6 | structural | ≤375 condensation: ring + time only (running/paused); idle = ring glyph only. Full `aria-label` preserved. Co-fits beside icon-only toggles + compact Bar-1 — no overflow. |
| EC-7 | structural | Honest data discipline: M1 = stub hook (honest-empty + DEV `?sample`), the `useFlowSession` pattern; the live "what's running" read is a ①-tier first-consumer seam (F-finding → MOD-sessions). No fake ticking. |
| EC-8 | structural | A11y: pill = link semantics with a full state-bearing `aria-label`; the ticking digits are NOT an `aria-live` region — state CHANGES announce politely; pause/resume labeled; `$colorFocusRing` focus outline. |
| EC-9 | feel | The pulse feels alive-but-calm: no alarm chrome, no badge-red; subtle motion allowed on the running ring, `prefers-reduced-motion` honored. |
| EC-10 | feel | Dark + warm-dark presets hold AA on time/eyebrow/title (measured at each Visual Gate). |

## Open questions for the review (answers pin or amend ECs)

1. **Idle "Begin a session" click-through in M1** — no start-flow surface is shipped (`fe-sessions` #34).
   Options: (a) idle affordance present but routes to the runtime-page-less `/sessions/$id`? (no), (b) idle
   VISIBLE but inert in M1 behind the stub (dead affordance — violates the honest-affordance rule), (c) idle
   rendered only when a start-capable target exists; in M1 the stub yields idle-hidden (HUD absent) and
   `?sample` demos all states. **Lead: (c)** — region empty in M1 prod, fully alive under `?sample`.
2. **Elapsed form** — count-up shown as `+1:07:12` vs plain `1:07:12`? Lead: plain, eyebrow carries meaning.
3. **Hover-reveal vs always-visible pause** at ≥768 — greybox shows always-visible (quieter chrome would
   hover-reveal; SR/keyboard needs it reachable regardless). Lead: always-visible ghost.

## Review artifacts
- Live: `http://localhost:5199/envision.html` (state × preset × mode switcher; resize for 375/768/1440).
- Shots: scratchpad `shots/` (18 strip crops + 1 full-page).
