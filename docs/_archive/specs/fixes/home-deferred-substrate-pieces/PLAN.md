# PLAN (§XXVI g1) — Home the deferred substrate pieces (Phase 3)

> Docs-only structure fix (Project Foundation), like the DF-11 realignment. Closes the "un-homed deferral" gap the
> AR-7 capability increment surfaced: every deferred piece it cites must have a real ISSUE home (db-10-proof),
> **derived from the documentation's own homing rules**, not chosen. No AR-7 scope change.

## §1. Grounding — the homing rules the docs already fix

- **First-consumer-pull** (roadmap §"substrates by first-consumer pull"): a foundation substrate lands **when its
  first consuming module needs it**. Capability is a listed substrate. [FACT: roadmap.md:46-53]
- **Global build order** (reconstructed §4): `#` is a contiguous topological order; **every `←` has a strictly-lower
  `#`, every `→` a strictly-higher `#`** (both directions). New issues are legitimate additions (§6). [FACT: reconstructed §4:185-189, §5:196, §6:205]

## §2. The homing trace (derived, cited)

| AR-7 deferred piece                                                                                                    | Home                                                                           | Basis                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Capability registry runtime (block placement · inline instances · TipTap re-home · BlockType union · per-Block visual) | **MOD-notes `#31`** (M1.1 hub, first consumer) + **UI-3 `#29`** (@vida/editor) | first-consumer-pull; roadmap M1.1 [FACT: roadmap.md:93]   |
| `capability_grants` external semantics (`external_in_ok`/`out_ok`/`consented_sensitive_modules`)                       | **P3-boundary `#71`** (M2 security boundary)                                   | roadmap M2 [FACT: roadmap.md:121; ADR-014 amends ADR-010] |
| Views-hosting-instances seam                                                                                           | ADR-008 §6 conditional trigger                                                 | not an owed deliverable                                   |
| **ADR-010 safe-authoring runtime** (sandbox · DSL · authoring UI · grant enforce/re-grant/revoke)                      | **NEW `#85` CAP-authoring**                                                    | derived below                                             |

**Derivation of the one new issue's place (a deliberate deferral, honestly):**

- No M1→M4 module consumes user-authored capabilities (all use _shipped_ caps) → **first-consumer-pull gives it no
  earlier home**, so it is parked at the **tail** as a `⚠ INTENDED-later` deferral. That "it goes last" IS fixed by the
  order (nothing pulls it); the tail position is the deferral, not a forced blocker edge. [FACT: roadmap.md:46-53]
- Its **hard** dependencies are `← AR-7 #13` (the registry it enforces) + `UI-3 #29` (the authoring UI needs the
  editor) — both real edges, both strictly-lower `#`. The per-platform sandbox is a _pass that rides each venue_
  (ADR-010 §3.6 decouples the runtime from the venue apps — a web sandbox need not wait on Desktop/Mobile), so the
  venues are **not** hard blockers — noted in the row, not encoded as `←`.
- **Slug is `CAP-` not `MOD-`:** it is not an M1.1–M1.3 feature module, and a `MOD-*` at `#85` would be pulled by the
  unscoped "all `MOD-*`" aggregator blockers (HARD-1/DB-11/MIG-1/DB-5, all `# < 85`) → backward edges. `CAP-` avoids that.

## §3. Exact edits — `docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md`

**3a. §2 slug-prefix glossary (line 19) — add `CAP`:** append `· CAP Capability-authoring *(new — post-core extensibility, DF-12)*` to the prefix list.

**3b. §3 DF register — append DF-12:**

```
| **DF-12** *(this session)* | AR-7's cited deferrals had no proven issue HOMES (orphan-deferral risk, db-10-shaped) | homed by the docs' first-consumer-pull rule: registry-runtime → MOD-notes `#31` / UI-3 `#29`; `capability_grants` external-semantics → P3-boundary `#71` (M2); **new** `#85 CAP-authoring` for the ADR-010/SP4 safe-authoring runtime (its only un-homed consumer). `CAP-` slug (not `MOD-`) so the unscoped "all `MOD-*`" aggregators don't pull a `#85` backward-edge. |
```

**3c. New row — insert after `#84` (P2-6), in the M4 section:**

```
| 85 | ◻⚠CAP-authoring | User-authored capability safe-authoring surface — sandbox runtime · authoring DSL/UI · grant enforce/re-grant/revoke. ⚠ INTENDED-later: no M1–M4 consumer (first-consumer-pull) → deferred to the tail; the per-platform sandbox rides each venue's pass (ADR-010 §3.6, not a hard blocker) | `core/src/foundation/capability` + per-app sandbox (010/008 · SP4) | ← AR-7, UI-3 | leaf | Backend | user-authored Blocks run sandboxed; grants enforced; consumes `capability_grants` |
```

**3d. `→` edges gain `CAP-authoring` (bidirectional db-10-proof — only the two HARD `←` blockers):**

- **AR-7 (#13 · line 66):** `→` `MOD-purposes, MOD-gamification, HARD-2` → append `, CAP-authoring`.
- **UI-3 (#29 · line 82):** `→` `leaf` → `CAP-authoring`.
- _(P2-3 #82 / P2-4 #83 are NOT touched — the venue pass is a note, not a `←` edge; their `leaf` stays.)_

**3e. §4 build-order + §2 glossary + §5 counts:** `contiguous 1→84` → `1→85` (both §4:185-186 and the §2:22 "`#` runs 1→84" occurrence); §5 "84 issues" → `85`. **§5:196-197 stay TRUE as written** — "all `MOD-*` (#31–56) … last is #56" is still correct because `#85` is a `CAP-`, not a `MOD-*` (a second reason to prefer the rename). Confirm acyclicity: both `←` (13, 29) < 85; `#85` is `leaf`.

## §4. Acceptance

1. DF-12 present; `CAP` in the prefix glossary; `#85` row well-formed (9 columns, no stray `|`); the **two** `→` edges (AR-7, UI-3) updated.
2. Acyclic: `#85`'s every `←` (13, 29) < 85; `#85` is `leaf`. **Whole-corpus check (F1):** grep every "all `MOD-*`" / `⊕agg` wildcard blocker (⊕agg:27, HARD-1:127, DB-11:131, MIG-1:133, DB-5:161) — none resolves to `#85` (it's `CAP-`, not `MOD-*`), so no backward edge is introduced.
3. Counts updated (`1→85` in §4:185 + §2:22); §5:196-197 range/last-module claims verified still TRUE; no dangling `CAP-authoring` reference.
4. Every claim cited; the tail placement is an honest ⚠ INTENDED-later deferral (§2), not a manufactured forced edge; the venue coupling is a note, not a `←`.
5. Docs-only; no AR-7 code/scope change. **Linear issue create = a flagged follow-up** (tracker_sync --sync), not this docs edit.

## §5. Out of scope / flagged

- Creating the LIF Linear issue for `#85` — follow-up (`tracker_sync`), Victor's call.
- The upcoming **measurement/economy** increments' deferrals get the same first-consumer-pull homing check at THEIR gate-1 (the discipline, now established) — not pre-solved here.
