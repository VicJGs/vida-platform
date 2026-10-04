# apps/web/src/reach — Capability reachability (fe-codec-patterns S5)

**Owning issue:** fe-codec-patterns (LIF-211) · **Authority:** `frontend-quality-bar §2.4` (≥2 reachable paths).

## What lives here
- `reachability-registry.ts` — `createReachabilityRegistry()` (factory): `register`/`getReach`/`isReachable`/`assertReachable`
  + `ReachPath` (`dock·command-bar·contextual·link·spaces`) + `UnreachableCapabilityError`.

## Rules
- **Capability axis, not module axis.** `ReachPath` = how a capability is reached; distinct from `nav/module-map.ts`
  `NavPlacement` (where a module home sits). Don't conflate them.
- **≥2 is a hard floor.** `assertReachable` throws below 2 distinct paths — a **dev/test/CI invariant assertion** (the
  runtime companion to the G4 set-cover), NOT a per-render guard (never crash a user's render on it).
- **Factory, not a global singleton** (testable; no `this.` intra-calls — the factory-service rule).
- **Per-module reach WIRING is the modules' job** (M1.2.2+) — this ships the mechanism + the floor, not the entries.
