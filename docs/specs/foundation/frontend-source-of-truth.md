# Frontend Source-of-Truth — Direction & Implementation Plan
Status: **approved** (planning layer · critique REVISE→fixed · guard built + smoke-tested · Victor-approved 2026-08-03)
Owner-decision: Victor 2026-08-03. Durable statement: `docs/ui/token-pipeline/current-spec.md §0`.
Scope grain: cross-cutting frontend governance (DS/UI/UX) — a standalone foundation concern
(precedent: `capability-framework.md`, `staleness-sweep.md`).

## Why this doc exists
The frontend source-of-truth was re-shaped mid-DS-2 (2026-08-03). The re-shape was then propagated by a set of
documentation/plan edits made **reactively**, without a persisted plan or a critique gate on those edits. This doc
is the missing **planning layer**: it states the direction, enumerates the full surface it governs from DS-2 to
delivery, and defines what "grounded & right" means at each — so the edits can be gated (plan → critique → approval)
before the DS-2 spec is approved and before any frontend unit builds on the direction.

## The direction (scope)
Four principles, verbatim intent — the root each governed artifact must agree with:
1. **Truth = documented intent.** The ADRs, specs, and design.md are the source of truth — not Figma-right-now,
   not a code seed in isolation.
2. **Code-first interim.** During M1, the hand-authored `tokens/*.json` seed (and, forward, the coded components)
   are the authored realization. Kept faithful to documented intent per-unit → **no doc/intent debt at the end**.
3. **Figma-later via MCP scripter.** The shareable, community-forkable Figma file (DS/UI/UX) is built later as a
   faithful reflection, synced via **Figma MCP + a custom scripter + docs** — **NOT Tokens Studio** (paid heavy-task).
4. **Release-gated bridge.** "Later" is pinned: `roadmap.md` **M4 P2-⑦** ("first public release" — when external
   users can use it). Not floating prose.

## Step 1 — Done when
**Done means:** the direction is grounded in the existing docs/plan and correctly reflected across **every** governed
artifact from DS-2 to delivery, such that (a) **zero** live doc still asserts "Tokens-Studio-as-source" or
"Figma-first-at-DS-2"; (b) every artifact that scopes *token/design source* states the code-first-interim +
Figma-later-via-MCP mechanism; (c) the Figma bridge is a **release-gated** issue with correct deps; and (d) a
**write-time inheritance rule** exists so forward specs (DS-3/4/5, UI-*) cannot silently drift from the direction.
**This does NOT include:** building the Figma bridge, authoring DS-2 token values, the DS-2 pipeline extensions, an
ADR, or decomposing M4 P2-⑦ into Linear now.

## Step 2 — Governed surface (dependency map: root → reflections → inheritors → endpoint)
| # | Artifact | Role | Current state | "Grounded & right" requires |
|---|----------|------|---------------|------------------------------|
| R | `token-pipeline/current-spec.md §0` | **root** statement | edited ✓ | states all 4 principles incl. gate M4 P2-⑦ |
| 1 | `token-pipeline/current-business-rules.md:29` | reflection (durable) | edited ✓ | code-first values; Figma-later NOT Tokens Studio |
| 2 | `ds-1-token-pipeline/_index.md :48/:129/:159` | reflection (upstream spec) | edited ✓ | supersede "Figma→Tokens Studio at DS-2"; keep as erratum-marked |
| 3 | `ds-1-token-pipeline/_index.md §3.1` | `$value`/`type` erratum | edited ✓ | live code uses `value`/`type` — flagged |
| 4 | `packages/ui/src/themes/CLAUDE.md:20` | reflection (layer-doc) | edited ✓ | code-first; MCP-scripter not Tokens Studio |
| 5 | `packages/ui/src/themes/build-tokens.mjs:14,164` | reflection (code comment) | edited ✓ | code-first; values vs mechanism split |
| 6 | `ds-2-foundations/_index.md §0` | reflection (active spec) | written ✓ | source model + modes-mirroring rationale |
| 7 | `docs/roadmap.md` M4 P2-⑦ | **delivery endpoint** (phasing) | added ✓ | release-gated; deps ← DS-2…DS-5 + UI-* |
| 8 | memory `frontend-source-of-truth-is-documented-intent` | recall carrier | written ✓ | gate pinned to M4 P2-⑦ |
| 9 | `.claude/tasks/archive/*` | historical residue | left as-is ✓ | inert; not rewritten (history) |
| 10 | `docs/core/decisions/ADR-001-tech-stack.md §9` | authority (swept) | checked — **silent** ✓ | §9 names only Tamagui; NO Tokens-Studio/Figma mention → no contradiction. Source model is deliberately spec-level, not an ADR (per "no ADR" call). |
| 11 | `REPO.md` | nav index (swept) | pointer added ✓ | one-line pointer to this doc under Docs & decisions |
| F | DS-3 / DS-4 / DS-5 / UI-* specs | **forward inheritors** | not yet written ⏳ — **MITIGATED (guard live)** | each must open with `## 0. Source model`; enforced **mechanically** by `pnpm check:frontend-source-model` (`tools/scripts/check-frontend-source-model.mjs`), NOT by prose. DS-2 = positive control (passes). |

## Endpoint placement — why M4 `P2-⑦` (not M3, not Post-M4 P3-⑦)
The bridge's dependencies are all **M1** artifacts (DS-2…DS-5 + UI-*), so it is *buildable* right after M1 — it is
deferred by **choice** (it documents the finished product for outside users), not by dependency. Given that, three
candidate homes:
- **M3 (the encryption "release gate", roadmap:129/:23).** Rejected: M3 completes encryption but the system is still
  **solo-localhost** — "encryption complete **before any other user**" (roadmap:139). No external user exists to
  *use* a community file at M3. M3's "safe to share" = your encrypted *data*, not publishing the design system.
- **M4 `P2-⑦` (first public release, roadmap:153).** **Chosen.** Victor's gate — verbatim — is *"ready for the
  release so that the users can use it."* The first moment external users exist to fork/use the community file is
  **first public release = M4**. Deps (all M1) are satisfied long before, so no risk of blocking M4.
- **Post-M4 P3-⑦ (community personality layer, roadmap:156).** Rejected: P3-⑦ is community *content* (Role/skill
  block libraries) that users build **with** the design system — so the DS community file must **precede** it, not
  sit beside it.
**RESOLVED (Victor 2026-08-03): M4 `P2-⑦`.** Decided from the documented order, not by assertion — the bridge's deps
are all M1 (satisfied ≫ before M4, so it disrupts nothing), and the first moment external users exist to fork the
community file is *first public release* = M4 (roadmap:153). M3 = encryption gate but still solo-localhost
(roadmap:139, no external users); Post-M4 P3-⑦ = community content built *with* the DS (must come after). M4 is the
one home that fits the organized order without reordering any edge.

## Step 3 — Verification steps (ordered: confirm root, then reflections, then endpoint, then the forward seam)
1. **Confirm root (R) is complete** — §0 states all 4 principles incl. the pinned gate. — depends on: nothing — risk: none (done; critique re-checks).
2. **Confirm no live contradiction** — repo-wide sweep for "Tokens Studio"/"Figma…source" returns only `NOT Tokens Studio` negations + the erratum marker + archive. — depends on: 1 — risk: a doc outside the sweep globs; mitigate = critique runs its own grep.
3. **Confirm reflections (1–6, 8) agree with R** — each states code-first + Figma-later-via-MCP where it scopes source. — depends on: 1 — risk: a reflection paraphrases loosely and drifts in nuance; mitigate = critique reads each line.
4. **Confirm endpoint (7)** — M4 P2-⑦ present, release-gated, deps `← DS-2…DS-5 + UI-*`, follows M4's `P2-N` convention. — depends on: 1 — risk: deps too vague to be actionable later; accept at roadmap grain (decomposed when milestone nears).
5. **Close the forward-inheritance GAP (F) MECHANICALLY** — the rule is *every future frontend spec (DS-3/4/5, UI-*, UX-*) MUST open with a `## 0. Source model` pointer to this doc.* Enforce it **by construction**, mirroring DS-1's B2 doctrine (`current-business-rules.md:22` — enforce mechanically, not by review): add `tools/scripts/check-frontend-source-model.mjs` (greps each `docs/specs/**/{ds-3,ds-4,ds-5,ui-*,ux-*}/_index.md` for the §0 heading; fail-loud, names the offender) + a root `pnpm check:frontend-source-model` script. Run it at each forward unit's Step 0 and at `/session-end`. Also add the pointer note to the DS-2 spec change log. — depends on: 1 — risk: no CI auto-runs it yet → it's a manual gate until a docs-lint job exists; stated honestly, not overclaimed. **NOT a fictional `/documentation-component` hook** (that skill is toolkit, out of project scope).
6. **Independent adversarial critique** — a fresh critic verifies grounded + complete + right-to-delivery against the actual repo. — depends on: 1–5 — risk: critic finds a real gap → re-plan before approval (expected; that's the gate working). **[DONE — REVISE, see log; findings folded in.]**

## Step 4 — Risks (consolidated)
- **Forward drift (highest).** DS-3/4/5 + UI specs are unwritten; the direction could be forgotten when they are. → Step 5 inheritance rule.
- **Vague endpoint deps.** M4 P2-⑦ "UI-*" is coarse. → acceptable at roadmap grain; decompose at M4.
- **Archive confusion.** Archived tasks show the old Figma→Tokens-Studio flow. → inert historical record, explicitly noted (row 9); not rewritten.

## Step 5 — Out of scope
Building the Figma bridge · authoring DS-2 token values · the DS-2 pipeline extensions (aux namespaces, dark overlay) ·
any ADR · creating Linear issues for M4 P2-⑦ · touching design.md.
> **design.md seam (nit #6):** design.md is a **toolkit standard vendored read-only** from `~/dev-toolkit/` — it is
> a source of truth (principle 1) but un-editable from this repo. If it drifts from the direction, that is a
> toolkit-sync concern, not a project edit. Recorded so the principle-1 ↔ out-of-scope tension is explicit, not silent.

## Acceptance for "grounded & right"
All of Steps 1–5 verified true AND Step 6 critique returns SHIP (or REVISE→fixed→SHIP). Only then: approve the DS-2
spec and proceed to Step 2 value-authoring.

## Critique log
| Date | Verdict | Findings |
|------|---------|----------|
| 2026-08-03 | **REVISE** | Mechanical propagation verified clean (0 surviving live contradiction; erratum correct; P2-⑦ present/depped/on-convention). **must-fix:** (1) Step-5 overclaimed a persisted rule + a fictional `/documentation-component` hook; (2) prose guard = weakest link (v1 failure mode) → build a mechanical check. **should-fix:** (3) M4 placement under-argued vs M3; (4) ADR-001 §9 + REPO.md not swept; (5) DS-1 spec cite `ADR-001:110,113` wrong. nits: (6) design.md out-of-repo seam; (7) `figma-to-code-ds` inverts direction. |
| 2026-08-03 | fixes applied | F1/F2 → Step 5 rewritten mechanical + honest (row F = unmitigated-until-guard-built; guard = `check-frontend-source-model.mjs`, to build on approval). F3 → "Endpoint placement" section (M4 recommended, M3 flagged as Victor's confirm-point). F4 → ADR-001/REPO.md rows added (swept-silent; REPO.md pointer owed). F5 → DS-1 cite → `111,114`. F6 → design.md seam note. F7 → memory caveat. **Re-critique or approval next.** |
| 2026-08-03 | **SHIP (approved)** | Victor approved. Guard built (`tools/scripts/check-frontend-source-model.mjs` + `pnpm check:frontend-source-model`) + **smoke-tested** (positive: DS-2 passes exit 0; negative: stripped §0 → exit 1, names offender). REPO.md pointer added; DS-2 change-log inheritance note added. Placement RESOLVED = M4 `P2-⑦` (grounded in the documented order). All must-fix closed. |
