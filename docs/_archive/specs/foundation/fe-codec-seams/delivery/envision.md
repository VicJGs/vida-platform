# fe-codec-seams #13 — Envision Gate (Step 1.5) · **SKIP (stated)**

## Trigger test (entity-delivery-flow.md §3.75)

> "Is there a user affordance whose UI answer isn't already obvious from an existing shipped surface?"

**Answer: NO → the gate does not fire.** #13 renders **no user-facing surface** — it is the apps/web runtime-wiring +
convention layer that lets _other_ surfaces consume the four `@vida/core` engines [FACT: reconstructed-structure.md:33
"runtime wiring (consume @vida/core)"; interpretation §3 R-3 "no new rendered surface"]. There is no screen, no state,
no create/edit/delete/link/navigate affordance to greybox. The user-facing composition affordances live in the
surfaces that _consume_ these seams — the Spaces page (#20), Global Calendar (#19), Entity facet (#6), the module
②-tracks (#27+) — each of which fires its own Envision Gate.

This mirrors the SKIP precedents for the other wiring/convention codec units: `fe-codec-patterns` (pattern-kit +
conventions), `fe-codec-canvas-graph` (EXTEND a shipped primitive — Envision SKIP, Victor-confirmed) [FACT:
.claude/tasks/_index.md archive note fe-codec-canvas-graph "Envision SKIP"].

**Consequence for Step 2:** no `structural` EC set to carry as Visual-Gate MUSTs → the Decomposition Gate maps slices
to the seam contracts + implicit rules (§4), and each slice closes on a **Verification Gate**, not a Visual Gate.
