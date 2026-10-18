<!-- PLAN — fe-session-hud S3 (shell mount + honest-empty wiring) · §XXVI forward spec.
     Authority: delivery docs (Approval 1) · S1 d5d6f46 · S2 1377cd6 (Visual Gate PASSED, Victor). -->

# PLAN S3 — Shell mount

## §1 Context
The closing slice: the HUD enters the REAL shell via the shipped `hudSlot`, the gate harness is torn down,
and F-HUD-1 is filed. Blocking real-shell Visual Gate (Victor-reviewed) closes the unit.

## §2 Business rules (BR-HUD-S3-*)
- **BR-HUD-S3-1** `routes.tsx` `RootComponent` mounts `hudSlot={<SessionHudSurface/>}` — the surface is a
  thin composition of `useActiveSession` + `SessionHud` living in `session-hud/` (routes.tsx stays wiring-only,
  the GlobalBar1 precedent).
- **BR-HUD-S3-2** M1 prod renders NO HUD (`hidden` → null) — the strip is byte-identical to today without
  `?sample` (EC-7 / Envision answer 1). Proven by an integration test on the real `RootComponent`.
- **BR-HUD-S3-3** DEV `?sample=<form>` walks all 6 forms in the REAL strip; the pill deep-link lands on
  `/sessions/$id` WITH the `sample` param preserved (g1-B5) — integration-tested via real-router navigation.
- **BR-HUD-S3-4** No per-unit tabIndex/trap handling — the HUD rides the shell's own float-trap discipline
  exactly as Bar-1 does (§E; asserted: no `tabIndex` prop anywhere in `session-hud/`).
- **BR-HUD-S3-5** Gate-artifact teardown: `apps/web/envision.html` + `apps/web/src/__envision__/` are DELETED
  (the envision record lives in `delivery/envision.md` + the committed history).
- **BR-HUD-S3-6** **F-HUD-1 filed** at `delivery/findings.md`: (1) the ① `findActiveSession()` read
  (MOD-sessions first-consumer-pull, ADR-019 §3.5); (2) the ② shared focus-runtime client store (ships with
  the first live timer driver); (3) the optional ① interval-start persistence amendment (reload-survivable
  countdown) — NOTED, not assumed.

## §3 Files
- `apps/web/src/session-hud/session-hud-surface.tsx` (NEW, ~10 lines) + `routes.tsx` edit (hudSlot wire).
- `apps/web/src/session-hud/session-hud-surface.test.tsx` (NEW) — the integration leg.
- `docs/specs/foundation/fe-session-hud/delivery/findings.md` (NEW) — F-HUD-1.
- DELETE `apps/web/envision.html`, `apps/web/src/__envision__/*`.
- `apps/web/src/session-hud/CLAUDE.md` + delivery docs refreshed (§XXIX currency at close).

## §4 Acceptance
1. tsc 0 · eslint 0 · session-hud suite green · **full @vida/web suite green** (the mount touches the root).
2. Integration: no `?sample` → `RootComponent` strip has NO hudSlot content; `?sample=focus` → pill present;
   clicking the pill navigates the real router to `/sessions/sample-session?sample=focus`.
3. grep-proof: no `tabIndex` in `session-hud/`; no references to `__envision__` remain.
4. **Visual Gate (blocking, Victor-reviewed):** the REAL app (`pnpm dev` vite, real routes) with
   `?sample`: 375 co-fit (icon-only toggles + compact Bar-1 + ring+time pill, no overflow) · 768/1440 full
   pill · ≥2 presets × light/dark · axe 0 on the strip · the deep-link walk (pill → runtime page renders the
   sampled session).

## §4b Deviations + gate catches (§XXVIII record)
- **D-S3-1 (Victor-approved 2026-10-18) — the 375 strip-budget redistribution.** Victor's Visual-Gate review
  caught the ring overlapping the Search icon at 375 (editorial): with the HUD filling the previously-empty
  hudSlot, the strip's content overcommits ~80px (measured: Bar-1 `scrollWidth 179` vs `clientWidth 87` —
  content paints over the HUD; the page-level overflow probe can't see element overlap). Options presented
  (keep-time / glyph-strip / search-fold-only / hide-HUD); **Victor chose "Keep the time"**: scope-selector
  `compact` → GLOBE-ONLY (name in aria-label; `scope-selector.tsx`) + Search folds into the More menu as its
  FIRST row (still the ⌘K action, never a link — EC-3; `global-surfaces-strip.tsx`) + the HUD keeps
  ring+time (EC-6 unchanged). Touches #15-owned files (the shipped-primitive-fix precedent); 3 superseded
  tests updated to the new contract; shell suite 117/117.
- **Reactivity catch (gate, ISOLATED):** window.location sample-gate read was render-time-only → the surface
  now feeds the router-subscribed search (see hook header + S3 g2 review).
- **Gate-harness learnings:** dismiss the guided-setup invitation before screenshots; exclude sr-only text
  from the contrast probe (unrendered text, WCAG n/a).

## §5 Implementation prompt
Surface → routes wire → integration tests → teardown → findings.md → gates. The real-app gate rides the
first-run gating: seed the onboarding-done flag before navigation (the App.tsx branch), then drive `/`.
