# Spaces — the Personalization & Composability Foundation

**Level:** CORE / foundation (a tier **beneath** Notes & Pages — N&P consumes it). `[ADR-006 §3.1]`
**Status:** ✅ **Accepted 2026-07-15** — Transform (5-ADR set + PC-1…PC-4 + EX-1/EX-2 constitution rules) + foundation gate PASS + Victor sign-off. ADR-006…010 = Accepted.

Spaces is the layer that lets a user assemble his own module-like surfaces — a "Languages" hub, a "#before-i-die"
vision board, a "Duties" tab — out of **generic primitives** instead of bespoke per-feature code. It is the generic
version of v1's per-feature "Hub" pages, done as composition rather than one bespoke page per module.

**A Space** = `{ a root tag (membership) · its Views (surfaces) · its enabled capability Blocks (tools) · name/icon }`,
optionally born from a Template, nestable via tag hierarchy. A lightweight `spaces` record makes it nav-addressable.

## The four primitives + the guard (the ADR set)

| ADR | Primitive / decision | One line |
|-----|----------------------|----------|
| [ADR-006](../decisions/ADR-006-spaces-foundation-universal-tags.md) | **Universal tags** + the tier + `spaces` entity | tag *anything*, open-registry, nestable; tags vs links are distinct in storage, unified in the OS on the user's choice |
| [ADR-007](../decisions/ADR-007-saved-views.md) | **Saved views** | one `views` primitive (filter × layout × grouping), Space-owned or global, over documented read APIs |
| [ADR-008](../decisions/ADR-008-capability-block-registry.md) | **Capability-Block registry** | open registry; a capability declares render targets (inline/standalone); placement is the user's choice |
| [ADR-009](../decisions/ADR-009-templates-fork-on-instantiate.md) | **Templates** | portable seed bundles; instantiate = fork (deep copy, no live link); captures authored-not-accumulated → ZK-clean |
| [ADR-010](../decisions/ADR-010-capability-authoring-security.md) | **Capability-authoring security** | user-authored capabilities run under a declare→grant→enforce envelope inside a no-ambient-authority sandbox |

**Constitution:** the invariant lives in [`../business-rules.md`](../business-rules.md) → **Personalization &
Composability (PC-1…PC-4)** — personalization never breaks ZK; ship defaults + user personalizes; untrusted
capability code runs guarded; community is external (import/export only).

## Worked-examples (SP7) — validating, not modules

These were dissolved from the module list into Spaces; they *validate* that the primitives compose into real
surfaces. Their captured intent is preserved in `docs/intake/`; full example write-ups are a **build-time
deliverable** (they demonstrate the built primitives, so they are authored when the primitives exist).

| Worked-example | What it demonstrates | Preserved intent |
|----------------|----------------------|------------------|
| **Languages** | tags (`#languages/spanish`) + a hub view + a dictionary view + capability Blocks (A-B-A pronunciation · immersion plan · base-words) + a starter Template (Victor's method) | [`intake/languages.md`](../../intake/languages.md), [`intake/spaces.md`](../../intake/spaces.md) SP7 |
| **Duties / Obligations** | the **preset** primitive — a thin tab = a saved View over a `tasks` filter + per-type UI + defaults + optional Template, bound to a task *type* | [`intake/duties.md`](../../intake/duties.md), [`intake/tasks.md`](../../intake/tasks.md) ADDENDUM |
| **Bucket List** | a Space over **Dreams** — `#before-i-die` tag + a vision-board Gallery view + derived progress + a Template | [`intake/bucket-list.md`](../../intake/bucket-list.md) |

## What settles at build (not decided here)

- The tag/link unify ⇄ separate **resolution layer** surface (ADR-006 §3.3).
- Each **view layout**'s visual/interaction spec (the standing per-module views review pass).
- The **sandbox runtime** per platform + the **safe-authoring surface** (language/UI) + grant/consent UX (ADR-010).
- The **ADR-002 amendment** for the new tables: `entity_tags` · `views` · `spaces` · `block_instances` ·
  `capability_grants` (+ open the `entity_links` `entity_type` enum).
- The **Notes & Pages reconciliation** — retire `page_tags` → consume `entity_tags` (see `docs/README.md` Notes).
