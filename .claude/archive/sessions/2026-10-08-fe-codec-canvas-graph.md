# Session 2026-10-08 — fe-codec-canvas-graph (#8, LIF-205)

Task initialized. Goal: build the CODEC Canvas: Graph surface (Neural Graph archetype) end-to-end as
Entity Delivery Flow ② — EXTEND the shipped `@vida/ui` NeuralGraph primitive (ink voice + conformance)
+ an `apps/web` adapter.

Starting from the existing LIF-205 stub which carries 3 deferred audit findings (from LIF-230):
hard-coded WebGL colors (neural-graph.tsx:47-48), no empty?/error? consumer slots, unresolved
reduced-motion for the forceAtlas2 layout.

Branch `fe-codec-canvas-graph` off main @ 08ff2ef. Next: Step 0 document-context BASELINE.
