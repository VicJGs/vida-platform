<!-- Interpretation Layer — fe-session-hud (LIF-217 · G6 unit #16) · Entity Delivery Flow ② §3.
     Make the implicit explicit BEFORE decomposing. Every claim FACT-cited or labeled INTERPRETATION/UNKNOWN
     (No-Guessing). Base: origin/main @ 8c1070d + PR #142 (shell content-inset) + PR #143 (session-runtime). -->

# Interpretation — fe-session-hud (Session HUD, shell region 6)

**Unit:** ② frontend CODEC chrome — "**Session HUD** (region 6) — persistent timer/stage, responsive placement"
`[FACT: docs/specs/foundation/frontend-replan/reconstructed-structure.md:41 — type "chrome", deps #11 #14]`.
Split out of LIF-199 (`#14 shell frame · #15 Bar1+scope · #16 HUD-placement · #17 ⌘K`)
`[FACT: g6-edge-ledger.md:33]`. Minted "on the ui-2 pomodoro-widget seam" `[FACT: g6-edge-ledger.md:53]`;
part of the ux-3/ui-4 extension set "2 positionable panels + Space-scope selector + **HUD region 6**"
`[FACT: g6-edge-ledger.md:56]`.

**What it is (one sentence):** the always-visible, shell-owned indicator of the user's ACTIVE session —
which session is running, its stage/phase and its timer — living in the reserved top strip, deep-linking to
the `/sessions/$id` runtime page, degrading honestly when nothing is active.

---

## 1. DEPENDENCIES (all shipped or stacked on this branch)

| Dep                                                                                                                                                                                              | State                | FACT                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------------------------- |
| **`hudSlot` placement seam** — `AppShell` prop + `data-region="hudSlot"` row in the reserved top strip, built by fe-shell #14 _for this unit_                                                    | ✅ merged            | `apps/web/src/shell/app-shell.tsx:71,95,298-299`                      |
| **Top-strip geometry** — `reservedTopInset(bp)` 52/56; strip already carries wordmark + System/Modules toggles (icon-only ≤375) + `bar1Slot` (scope `compact` + surfaces condensed ≤375)         | ✅ merged            | `apps/web/src/shell/CLAUDE.md` (regions/S3 notes); `global-bar-1.tsx` |
| **Flow seam + data-hook pattern** — `useFlowSession` (M1 stub: honest-empty + `?sample`, zero-signature live swap); fe-session-hud #16 is a NAMED first-consumer reuser                          | ✅ stacked (PR #143) | `apps/web/src/flow/CLAUDE.md:23-29`                                   |
| **`toFlowSource` assembler** — SessionLike → FlowSource (single-stage default, total status map)                                                                                                 | ✅ stacked (PR #143) | `apps/web/src/flow/flow-source.ts`                                    |
| **Runtime page `/sessions/$id`** — the HUD's deep-link target                                                                                                                                    | ✅ stacked (PR #143) | `apps/web/src/routes.tsx:89-93`                                       |
| **`@vida/ui` pomodoro-widget (UI-2 V5 + P1 refinement)** — drift-free `endAtRef` timer, intent-emitting callbacks (`onStart/onPause/…`), progress ring, tabular figures                          | ✅ merged            | `packages/ui/src/CLAUDE.md:298-328`                                   |
| **Sessions service ① (MOD-sessions S1–S7)** — `startFocus/pauseFocus/resumeFocus/nextInterval/completeFocus/cancelFocus` + lifecycle `transitionSession`; timer id = the `focus_sessions` row id | ✅ merged (headless) | `packages/core/src/services/sessions/service.ts:120-166`              |
| **Shell content-inset fix** (strip↔content breathing room the HUD sits above)                                                                                                                    | ✅ stacked (PR #142) | `apps/web/src/shell/breakpoints.ts` `CONTENT_V_INSET`                 |

**Base-risk note:** PRs #142/#143 are OPEN (CI billing outage blocks merge) — this branch stacked them;
the PR diff collapses once they land. `[FACT: gh pr list 2026-10-16 — #141/#142/#143 open]`

## 2. NEEDS (gaps this unit must resolve or home)

- **N1 — "What is active now?" read does not exist.** `SessionsService` has `getSession(id)` but NO
  open/in-progress query (`findOpenSessionForEntity` exists only on the unmerged `mod-tasks` branch and is
  entity-scoped) `[FACT: service.ts:120-166 — full interface; no list/open read]`. The HUD's live read seam
  (`listOpenSessions()` / `findActiveFocus()`) is a ①-tier first-consumer pull → **F-finding, homed
  MOD-sessions first-consumer**; M1 HUD runs the stub discipline (honest-empty + `?sample`), matching
  `useFlowSession` `[FACT: flow/CLAUDE.md:24-28 — no composition root + worker `values` seam throws]`.
- **N2 — Active-session CLIENT state.** With no live read, "active" in M1 is an ephemeral client concern.
  Precedent: the scope store (`stores/scope-store.ts`, `activeSpaceId|null`, emit-to-seam)
  `[FACT: shell/CLAUDE.md spaces-scope notes]`. INTERPRETATION: a `session-hud` store (activeSessionId|null)
  - a ProviderRead-shaped seam for the later live swap — decomposition decides the exact shape.
- **N3 — Responsive placement at ≤375.** The strip at 375 already co-fits: icon-only toggles + compact scope +
  condensed surfaces `[FACT: shell/CLAUDE.md global-bar-1/S3 notes]`. The HUD's 375 form (condensed pill? dot?
  relocation?) is a USER AFFORDANCE with no shipped answer → **Envision Gate input** (§3.75 YES).
- **N4 — Timer source of truth.** The V5 widget self-times an ephemeral countdown; the service owns the
  durable runtime (`focus_sessions` status/pauses) `[FACT: ui CLAUDE.md:298-306 · service.ts:239-248]`.
  The HUD displays and emits intents — it must NOT own a second timer-truth (BR-FS-2 analogue: the shell
  never writes; intents route to a port `[FACT: flow/CLAUDE.md:13-15]`).

## 3. ORGANIZATION

- **Home:** `apps/web/src/session-hud/` — sibling of `session-runtime/` + `flow/` (the #23 precedent;
  chrome-type unit so it may also touch `shell/` wiring in `routes.tsx` `RootComponent` where `bar1Slot`
  mounts) `[FACT: routes.tsx RootComponent mounts GlobalBar1; app-shell hudSlot unfilled today]`.
- **Plane:** pure ② apps/web. Expected ZERO `@vida/core` import in the HUD UI (port + stub hook, the flow
  discipline); `@vida/ui` composition only — the shell adds NO new `@vida/ui` component (rule-of-three unmet)
  `[FACT: shell/CLAUDE.md Rules]`.
- **Consumers downstream:** `fe-sessions` #34 depends on this unit `[FACT: g6-reshape-runbook.md:76]`;
  fe-check-ins #31 / fe-onboarding #26 share the `useFlowSession` reuse list `[FACT: flow/CLAUDE.md:29]`.

### Grounding addendum (Victor-directed, post-gate-1)

The **pomodoro capability docs are a first-class authority for this unit** — Pomodoro IS the focus
runtime the HUD surfaces (`[FACT: docs/features/pomodoro/identity.md:5-10 — "the runtime of the focus
Session sub-type"]`): PD-4 fixed interval/status enums (break intervals are first-class countdowns) ·
PD-5 pause excludes paused time (freeze) · PD-7 interval-boundary behaviour is Preferences-owned
(`auto_start_*`) — the HUD never invents boundary behaviour · PD-11 analytics derived-on-read (the ticking
clock is client-ephemeral; V5 owns the ephemeral countdown `[FACT: packages/ui/src/CLAUDE.md:298-306]`) ·
Focus Mode is the runtime's own INTENDED face (`identity.md:32-38`) — the HUD deep-links, never becomes it.

## 4. IMPLICIT RULES (inherited, will bind every slice)

1. **Chrome composes UI-1/UI-2, never rebuilds** — tokens only, no hex/invented spacing; lucide icons
   `[FACT: shell/CLAUDE.md Rules]`.
2. **Model/chrome split** — any new layout constant belongs in the model files, not JSX
   `[FACT: shell/CLAUDE.md Rules]`.
3. **The shell never writes** — HUD emits intents to a `SessionsPort`-shaped port; writes happen at the
   binding (`bindFlowIntents` precedent) `[FACT: flow/CLAUDE.md:13-15]`.
4. **Honest empty, never phantom** — no fake "no session" skeletons; nothing-active is a DESIGNED state
   (Envision decides visible-idle vs hidden) — the NF-3/notifications anti-phantom precedent.
5. **Degrade, never crash** — loading/error/empty are calm `role=status` states (scope-selector precedent)
   `[FACT: shell/CLAUDE.md scope-selector notes]`.
6. **Timer a11y** — live countdown must not spam SRs: `aria-live` off/`polite` on state CHANGES only, timer
   text `tabular-nums` (P1 convention) `[FACT: ui CLAUDE.md:314-318]`; stage/status announcements polite.
7. **Reduced motion** — any pulse/progress animation honors `prefers-reduced-motion` (§IX; fail-safe-visible
   per the shell-panel styles precedent) `[FACT: shell/CLAUDE.md shell-panel-styles]`.
8. **Dev-sample gating** — `?sample` seeds, DEV-only, the #23/#25 convention `[FACT: flow/CLAUDE.md:25-26]`.
9. **No barrel; direct imports** `[FACT: shell/CLAUDE.md Rules · STANDARDS §XX]`.

## 5. Envision Gate §3.75 trigger test

"Is there a user affordance whose UI answer isn't already obvious from an existing shipped surface?" —
**YES**: a persistent, always-on timer/stage indicator in the top strip is a NOVEL interaction surface
(idle form · active form · 375 condensation · click-through behavior · pause/complete affordances in-strip
vs deep-link-only). → **Envision Gate FIRES** (greybox from real `@vida/ui` primitives + fake data, EC-pins,
Victor-blocking) before decomposition.
