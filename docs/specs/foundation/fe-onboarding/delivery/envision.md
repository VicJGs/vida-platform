# fe-onboarding — Step 1.5 ENVISION (gate PASSED)

**Unit:** fe-onboarding (LIF-216) · ② Frontend · M1.2.1 · `ext UX-5`
**§3.75 fire-test:** FIRES (guided-setup Flow = novel design-led surface — interpretation.md §F).
**Gate:** greybox built + driven in Brave, reviewed by **Victor** → **APPROVED 2026-10-11**. Reviewer = the human (vision review).
**Greybox (THROWAWAY — deleted before the build):** `apps/web/envision.html` · `apps/web/src/__envision__/{onboarding-greybox,envision-main}.tsx`
· `apps/web/__envision-shot.mjs`. Evidence: `/tmp/envision/*.png` (editorial/reader/quietDesk × light/dark × 1440/390).

> Scope of this gate = the NET-NEW guided-setup Flow. The shipped first-run render + copy contract are RATIFY (carry no
> greybox; interpretation IR5/IR7).

---

## Approved direction

The greybox established the doc-grounded foundation (6 scenes: reach · pick-modules · pick-theme · done · 2nd-reach-slot ·
the FlowSessionView-as-is fit question). Victor approved the foundation and gave one shaping directive:

> **"Leave the stages to the left part of the view so the user can see where he is at in the onboarding."**

→ The guided-setup Flow carries a **persistent LEFT-rail vertical stage indicator** (step 1→3 + current position),
with the step content to its right. This is the primary layout contract (EC-3).

**Scene-F resolution (flagged for Decomposition):** the shipped `FlowSessionView` #11 bakes unsuppressable SESSION
affordances (Mark done · Require proof · Attach doc/photo/audio) + a deliverable Timeline into the current stage — a
genuine misfit for a setup flow, AND the left-rail-beside-content layout isn't its stacked-Timeline shape. The left-rail
directive + the misfit point to a **lighter purpose-built flow frame** (left stepper + content pane), with the
`fe-codec-flow-session` dependency honored as a **build-order blocked-by** (reshape `dep` column), not a literal
component-import mandate. Decomposition grounds + ratifies this (Approval 1).

---

## Anchored checkpoints (EC-n)

Type: `structural` = greybox-provable → decomposition coverage + a blocking Visual-Gate MUST · `feel` = deferred to the
live per-slice Visual Gate.

| EC        | Type       | Anchored to      | Checkpoint                                                                                                                                                               |
| --------- | ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **EC-1**  | structural | Scene A + E      | Guided setup is reachable **opt-in from ≥2 paths**: (a) a post-first-run invitation, (b) the shipped `EmptyState.guidedSetup` slot on empty surfaces. Never auto-forced. |
| **EC-2**  | structural | Scenes A–D       | **Never a wall** — every step is skippable and a persistent "Skip setup →" escape is always present; skipping lands the user in the app.                                 |
| **EC-3**  | structural | the flow frame   | **LEFT-rail vertical stage indicator** (Victor's directive) — shows the ordered steps + the current position, persistent across the flow; content sits to its right.     |
| **EC-4**  | structural | Scene B (Step 1) | **Pick modules** — the `MODULE_MAP` dock roster as toggle controls, grouped by `ModuleGroup`; an enable-set (not nav placement). Optional.                               |
| **EC-5**  | structural | Scene C (Step 2) | **Pick a theme** — the `THEME_PRESETS` (reader/editorial/quietDesk) as selectable swatches; selection live-previews. Optional.                                           |
| **EC-6**  | structural | Scene D (Step 3) | **Honest completion** — a copy-honest "you're set" + a single "Enter Vida" hand-off. No ZK/encryption claim.                                                             |
| **EC-7**  | structural | all copy         | **Copy-honesty (BR-4)** — M1 local-first only; new guided-setup strings pass `VoiceCopy`/`lintCopy`; no stub/dev strings rendered.                                       |
| **EC-8**  | structural | responsive       | **Responsive** — the left-rail + content reflow cleanly at 375 (rail condenses; no overflow) → 768 → 1440.                                                               |
| **EC-9**  | structural | matrix           | **AA across the matrix** — 3 presets × light/dark, incl. warm-dark; all text + the stage-indicator states ≥ AA.                                                          |
| **EC-10** | feel       | flow pacing      | Step transitions + the theme live-preview feel calm/instant-under-reduced-motion (live Visual Gate).                                                                     |

**RATIFY (no greybox, no EC):** the shipped first-run 4-screen render (`onboarding.tsx`) + the `OnboardingCopyContract`
`m1/m3` model. fe-onboarding does not re-skin them (IR5/IR7).

---

## Coverage handoff to Decomposition (Step 2)

Every `structural` EC (1–9) must map to ≥1 frontend slice (plane-aware) as a Visual-Gate MUST. EC-10 (feel) rides the
per-slice live gate. The scene-F fork (lighter frame vs FlowSessionView) is resolved + grounded in the slice-map.
