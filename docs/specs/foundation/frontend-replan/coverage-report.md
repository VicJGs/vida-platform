# Coverage Report — ≥2 reachable paths (G4 output)

> **Status:** G4, 2026-10-01. Ratifies the **≥2-reachable-paths** surfacing rule and proves it over the capability
> set via a set-cover tool. Resolves open-decision #4 ("ratify ≥2-paths as a G4 criterion, or replace"). **Verdict:
> PASS** (after a REVISE round the gate itself caught + remediated). Tool: `tools/frontend-intent/set-cover.py` +
> `capabilities.json`. Run output: `coverage-run.txt`.

## 1. The ratified rule

**≥2 reachable paths per capability** — a **hard floor**: a capability reachable only one way is one most users never
find → it **fails** the coverage gate. Above the floor, more paths = a **soft signal** (richer discoverability), not a
block. This operationalises Victor's "features can't hide" as a *testable* constraint (Quality Bar §2.4). It replaces
nothing — it *is* the G4 criterion.

**Path types** (independent entry kinds, from the nav model): `dock` · `global-bar` · `cmdk` · `home-quick` ·
`contextual` · `link` · `space` · `scope-selector` · `cross-module` · `calendar` · `session-hud`.

**⌘K is universal by design** ("jump anywhere · do anything · search"), **but** the codec's `ReachabilityRegistry`
only grants the ⌘K path once a capability is **registered** — unregistered ≠ reachable. So the gate's real teeth:
*every capability needs a visible home AND a ⌘K registration (or a 2nd visible path).*

## 2. The run

**Pass 1 — REVISE.** 59 capabilities · 52 PASS · **7 FAIL** (single `contextual`-only path):
`grading-builder · physical-companion · compound-set-builder · import-statement · manage-reminders · author-rule ·
notification-channels` — all deep/niche actions reachable only from one parent surface.

**Remediation.** Applied the `ReachabilityRegistry` primitive (decomposition §1.3): each of the 7 registers a **⌘K
command** (the honest 2nd path — these are "do-anything" actions). *(physical-companion, grading-builder etc. also gain
their natural nav entry at build; ⌘K is the guaranteed floor.)*

**Pass 2 — PASS.** 59 capabilities · **59 PASS · 0 FAIL**.

```
capabilities: 59  ·  PASS (≥2): 59  ·  FAIL (<2): 0
VERDICT: PASS — ≥2 paths for every capability
```

## 3. Set-cover spread (which entry types carry the cover)

| Path type | Capabilities | Role |
|---|---|---|
| `cmdk` | 53 | the universal spine — every registered capability |
| `dock` | 31 | content homes |
| `contextual` | 25 | drill from a parent surface |
| `home-quick` | 10 | Home quick-actions ④ |
| `calendar` | 9 | the cross-module `dueIn` lane |
| `global-bar` | 7 | the 6 global surfaces |
| `link` | 4 | `[[wiki-link]]` lateral |
| `cross-module` | 4 | reached from another module |
| `scope-selector` | 2 | the Spaces scope |
| `session-hud` | 1 | the persistent runtime |
| `space` | 1 | a saved-view lens (M1.1) |

**Reading:** ⌘K + dock + contextual carry most of the cover — healthy. The thin rows (`space`, `session-hud`) are the
M1.1 / net-new seams; they add paths but nothing depends on them as a *sole* path (no capability relies on them alone).

## 4. What this binds at build

- The **`ReachabilityRegistry`** codec primitive (decomposition §1.3) is now a **gate**: a capability shipped without a
  2nd path fails CI against this tool. `capabilities.json` is the living registry; the build extends it per module.
- Every *new* capability (incl. user-authored Spaces/capabilities) inherits the rule — the registry check runs on the
  set, so additions can't silently create a 1-path feature.
- The soft signal (path-richness) is advisory: capabilities with 3–4 paths (tasks, contacts, sessions) are the
  well-surfaced spine; 2-path capabilities are fine but flagged as the minimum.

## 5. Feeds G5

Coverage is proven; the surface/capability set is whole and reachable. **G5** turns the `decomposition.md` build tiers
(codec → shell+cross-cutting → schema-gated modules) into the ordered surface `#` sequence in
`reconstructed-structure.md`.
