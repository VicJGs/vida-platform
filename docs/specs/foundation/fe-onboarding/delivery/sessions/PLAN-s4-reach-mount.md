# fe-onboarding — S4 PLAN · reach wiring + app-mount + unit PR (EC-1)

**Unit:** fe-onboarding (LIF-216) · ② Frontend · M1.2.1 · slice S4 of 4 — the integration slice (opens the unit PR).
**Covers:** EC-1 (guided setup reachable opt-in from ≥2 paths: the post-first-run invitation + the `EmptyState.guidedSetup` slot).
**Inputs:** slice-map §S4 · seam-contract (Seam C reach, Seam D first-run handoff) · interpretation IR2/N1/D6 · envision EC-1 · the shipped S1 frame + S2 module picker + S3 theme picker.

---

## Grounding (verified vs source)

- **Reach (N1/EC-1):** two opt-in paths — (a) a post-first-run **invitation**, (b) the shipped `EmptyState.guidedSetup`
  slot [FACT: packages/ui/src/components/empty-state.tsx:77]. NOT auto-forced.
- **Mount (D6/IR2):** the App-mount seam = `App.tsx`'s first-run branch area [FACT: App.tsx:24,72]. Guided setup is NOT
  boot-gated — reachable + skippable, an OVERLAY, **not a nav route** (slice-map §S4). IR2: never a mandatory 2nd gate.
- **Live preview (S3/IR4):** App.tsx passed a FIXED `THEME_DEFAULT` [FACT: App.tsx:72, pre-S4]; the theme picker's
  `preview` needs an app-owned selection setter. S4 makes App's selection minimally stateful (local `useState`) — the
  honest minimum; the full Zustand switcher stays deferred to Settings.

## Files (5 new + App.tsx — all `apps/web/src/onboarding/` unless noted)

1. **`guided-setup-store.ts`** — the `none|invited|running` launch phase (Zustand, ephemeral UI, BR-RT-6). Both reach
   paths drive it; `dismiss` returns to the app from any phase.
2. **`guided-setup-reach.ts`** — `createGuidedSetupReach()` registers TWO distinct `ReachPath`s (`link` = invitation,
   `contextual` = EmptyState slot) → the ≥2-path floor is met (dedup is by path value; two same-category would collapse).
3. **`guided-setup-entry.tsx`** — `GuidedSetupInvitation` (post-first-run opt-in; EmptyState title + `guidedSetup` slot
   "Set up" + `action` "Skip for now") + `GuidedSetupSlotButton` (the slot content for empty module surfaces). lintCopy-clean.
4. **`guided-setup-mount.tsx`** — `GuidedSetupTakeover`: lifts the module+theme selections to the flow (cross-step
   persistence the pickers deferred), maps `renderStepBody` (modules→ModulePickerView, theme→ThemePickerView with the
   **provider's active mode**, S3 g2 NIT-3), drives live preview via `onPreview`, commits both on finish (M1 no-op).
5. **`App.tsx`** — stateful `selection` (live preview) + the store subscription + a fixed opaque overlay over the
   still-mounted router (no route-state loss) + the onboarding handoff wrapped to `invite()` once post-completion.
6. **`guided-setup-s4.test.tsx`** — store transitions · the ≥2-path reach floor · both reach surfaces · the takeover
   wiring (pickers injected · live-preview lever · commit→onClose).

**NOT edited:** `onboarding.tsx` — the invitation is a post-completion overlay driven by the store, not a ready-step
button (lower blast radius; the handoff rejection still fires onboarding's own retry since `invite()` runs only after a
resolved `markComplete`).

## Deferred (homed)

- The `EmptyState.guidedSetup` slot's consumption by each real module surface → those surfaces' own units (S4 ships the
  reusable slot button + registers the path).
- Live module/theme PERSISTENCE (`commit`) → M1.1 (stub no-op now).
- The full Zustand theme-switcher store → Settings/fe-codec (App.tsx's local selection state is the M1 minimum).

## Visual Gate MUST (opens the PR)

invitation renders (opt-in + skip) · AA full matrix · **E2E live preview through App's wiring** (selecting a theme
re-roots the whole flow) · reflow 375/768/1440. [DONE — PASS: invitation AA 4.94–17.29 × 3 presets × L/D, 0 overflow;
E2E `` → `t_reader` on select.] Plus: onboarding 61/61 · App.tsx tests 8/8 · full @vida/web 508/508.
