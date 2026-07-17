# ADR-009: Templates are portable seed bundles instantiated by fork — a deep copy with no live link to the template

**Status:** Accepted *(foundation gate PASS + Victor sign-off, 2026-07-15)*
**Date:** 2026-07-15
**Decision Makers:** Victor J.
**Context:** Vida Platform — Spaces (Personalization & Composability foundation). ADR 4 of 5 in the Spaces set.
**Tags:** architecture · data model · extensibility · personalization · zero-knowledge
**Builds on:** [ADR-006](ADR-006-spaces-foundation-universal-tags.md) (a bundle's root tag + `spaces`) · [ADR-007](ADR-007-saved-views.md) (bundled views) · [ADR-008](ADR-008-capability-block-registry.md) (bundled capability definitions/instances) · SU-1 / ZK-1 (single-user; no in-OS sharing) · the community-is-external constitution principle (import/export of generic, non-personal artifacts is the OS's only sharing bridge)
**Amends:** ADR-002 — adds a light `templates` store for user-saved bundles; shipped templates are bundled assets. No new cross-entity FK (fork means no back-link).

---

## 1. Summary

A **Template** is a **portable seed bundle** — a serialized `{ root tag · seed entities · views · enabled
capabilities · child structure }` — plus a **one-click instantiate**. Instantiation is a **FORK**: it **deep-copies**
the bundle into fresh entities (new UUIDs), and the instance keeps **no `template_id` link** back to its source.
Consequently instance edits never conflict with template updates, and template updates never mutate existing
instances — the two are independent from the first second. A template captures the user's **authored
structure + configuration** (his *method*), never his **accumulated runtime data** (logs, completions, real
entries) — which, because the capture transform includes only authored structure and never reads runtime data in,
makes it a **generic, non-personal artifact**, the one thing the OS can
export/import (user-initiated, outside the vault) without breaking single-user zero-knowledge. The OS **ships
presets** (the "Languages" starter = Victor's method) and the user can **save any Space as a template**. The related
**"preset" primitive** (a task-type tab, from the Duties worked-example) composes with — but is lighter than — a
full Template.

## 2. Context — what triggered this

Templates / bundle-instantiate **do not exist anywhere** in v1 or v2 — no table, no service.
`[FACT: docs/intake/spaces.md L39, "does not exist anywhere"]` Yet nearly every documented module asks for one:
- **Languages** (SP7): a shipped **starter Template = Victor's method** — Knowledge kinds + a daily-practice Session
  template + a Goal template + immersion Blocks. `[FACT: intake L124, L157-160]`
- **Health**: an imported exercise library / a shipped training program = a Template. **Skills**: a skill is a Space;
  import + community submission ride the extension-model + template pattern. **Routines**, **Duties/Obligations**,
  **Bucket List**: strong template/preset candidates. `[FACT: intake accumulator L161-198]`

Two questions the intake leaves for Transform: **update semantics** (does an instance track its template or diverge?)
and **shipped vs user-authored**. SP5 resolved the first — **FORK** — and this ADR records it and its ZK
consequence. `[FACT: intake SP5-RESOLVED — "FORK … deep-copies … no template_id link … portable seed docs"]`

## 3. Decision

**3.1 A Template is a serialized, portable seed bundle.** Its content is **structure + configuration**, not personal
data:
`{ root_tag (+ nested tags) · seed entities (e.g. Knowledge kinds, a starter Goal, empty logger targets) · views
(ADR-007) · enabled capabilities + their config (ADR-008) · child Space structure (ADR-006) }`. It is a **document**
(JSON), not a live graph of FKs into someone's vault. (The bundle's "enabled capabilities + their config" **is** the
target Space's `enabled_blocks` offered-capability palette — ADR-006 §3.4 / ADR-008; one concept, two names — carried
as authored config, which is exactly why a forked Space lands the palette with zero placements.)

**Capability-config invariant.** The captured "enabled capabilities + their config" carries **authored configuration
only** — parameters, bindings-*by-type*, cadence — and **never** a reference, handle, or embedded copy of
**accumulated runtime data** (no live entity ids, no log contents, no completion history). A capability config that
can only be expressed by pointing at accumulated data is **not capturable** into a template. This closes the
capability-instance-references-accumulated-data hole: a bundle cannot smuggle vault data in through a capability's
config the way it is barred from smuggling it in through seed entities.

**3.2 Instantiate = FORK (deep copy, no back-link).** Instantiation **deep-copies** the bundle into fresh entities
with new client-generated UUIDs (DATA-1); the resulting Space/entities carry **no `template_id`** and no reference to
the template. Therefore:
- instance edits **never** conflict with template updates (there is nothing to reconcile);
- template updates **never** propagate to existing instances (a fixed tradeoff — you re-instantiate to get a newer
  starter);
- the bundle stays a **portable seed doc**, decoupled from any instance's later life. `[FACT: intake SP5]`

**3.3 Shipped presets + user-authored templates; "save this Space as a template".** The OS ships curated Templates
(Languages starter, training programs). The user can **save any Space as a template** — export its structure +
configuration into a bundle — and instantiate it again elsewhere. Shipped templates are **bundled assets**;
user-saved templates are rows in a light **`templates`** store (id · name `[E]` · serialized bundle `[E]`),
syncable (`_sync_*` + `deleted_at`, DATA-4), the bundle encrypted per EN-2.

**3.4 Templates are the OS's *only* sharing bridge, and they are ZK-clean by design — enforced at capture, not literally "by construction".** The capture line is
**authored vs accumulated**: "save this Space as a template" captures the user's **authored structure +
configuration + starter seed** (the Knowledge kinds, the session cadence, a starter Goal's target — *Victor's
method*, which is the point of sharing) and **never** captures **accumulated runtime data** (real practice logs,
completions, actual journal text, live progress). This exclusion is **enforced at capture-time** — a template is
a **generic, non-personal artifact** because the capture transform draws the authored-vs-accumulated line and
**never reads accumulated runtime data into the bundle** in the first place. This cleanliness is a **correctness
property the capture transform must uphold** (it selectively captures the authored shell — e.g. an *empty* logger
target — while excluding that shell's accumulated rows), **not** a free consequence of the data shape. It is
therefore ZK-clean **by design + enforced at capture** — the one real risk (§5, Harder) is a capture bug that pulls
runtime data in, and it rides the same guard as ADR-010 + EN-2. Consequently it is the single kind of thing the OS
exports/imports. Sharing is **100% user-initiated, outside the
vault** (the user hands a bundle to someone by his own means); the OS never transmits vault data and has **no in-OS
sharing, feed, or marketplace** (SU-1, ZK-1 hold). What an *authored* value reveals is the user's own call — he
authored it, he chooses whether to share. This makes Templates the concrete instance of the **community-is-external**
constitution principle: Spaces templates, Skills templates, and the external Skill-DB are the same move — import/
export of authored, non-accumulated seeds. `[FACT: intake SP5, SP8; task-file "community is EXTERNAL, import/export
only"]`

**Forward-ref — imported capability *code* is untrusted.** A bundle may carry a **user-authored capability's code**
(ADR-008 anatomy), not only its config. Importing such a template therefore imports **executable, untrusted code** —
an untrusted-import surface. This is **not** an ADR-009 concern to solve: it is governed by **ADR-010 §3.1**, which
already declares "every non-shipped capability — user-authored *or* arriving inside an imported template — is
untrusted" and runs under the grant + sandbox. Importing a template is thus **never a trust escalation**; the
importer grants the capability's envelope exactly as if they had authored it. Shipped-preset capabilities stay
trusted (ours).

**3.5 A "preset" is a lighter sibling, not a Template.** The Duties worked-example surfaced the **preset** primitive:
a **thin tab** = `{ a saved View (ADR-007, e.g. over a `tasks` filter) + per-type UI/UX + default fields/deliverables
+ an optional starter Template }` bound to a **type** the owning module defines (Tasks owns the task *type*
discriminator; the preset is the Space-side tab). A preset is essentially **a lightweight Space over a filter** with
per-type defaults; it *may reference* a starter Template (§3.1) but is not itself a full bundle. So: **Template =
seed a whole structure; preset = a saved tab + defaults over existing entities.** They compose; they are not the same
thing. `[FACT: intake L170-177, Duties worked-example]`

**Terminal states.** Instantiation defines **in-progress / success / partial-failure** (a bundle referencing a
capability not present on this device seeds what it can and flags the rest — a declared degraded state, never a
crash), specified at the contract level.

**What this decision does NOT do:** it does not design the bundle's serialization schema in detail (build-time); it
does not build the capture transform that draws the authored-vs-accumulated line (build-time, but the invariant — a
bundle carries authored structure only, never runtime data — is locked here); it does not build any distribution
channel (there is none — sharing is out-of-OS by design).

## 4. Options Considered

### Option A — Fork: deep copy, no live link (CHOSEN)
- **Rationale:** matches SP5; zero reconciliation between instance and template (no merge conflicts, no CRDT across a
  template boundary); keeps a template a portable, standalone seed; and makes templates ZK-clean generic artifacts —
  the safe sharing bridge. Simplest correct model for a single-user local-first OS.
- **Tradeoffs accepted:** an instance does **not** receive later template improvements (re-instantiate to refresh);
  duplicated structure across many instances of one template.

### Option B — Track: instance keeps `template_id`, template updates propagate (REJECTED)
- **Why rejected:** re-introduces a live cross-reference that must be reconciled on every template edit — a
  distributed-merge problem the single-user fork model has no need for; and a propagating link is a channel through
  which one artifact could carry data into another's space, muddying the clean "generic seed" boundary.

### Option C — Reference: instance stays a thin pointer, renders the template live (REJECTED)
- **Why rejected:** the instance would not be independently editable (the whole point of instantiating), and it
  couples a user's live Space to an external artifact — the opposite of portable + ZK-clean.

## 5. Consequences

**Easier:**
- One primitive seeds any composed surface (a Language Space, a training program, a preset tab's starter).
- Templates are safe to share by design (enforced at capture) — generic structure, no vault data — with no new OS sharing machinery.
- Instance and template lives are fully decoupled; no reconciliation, no template-migration engine ever needed.

**Harder:**
- No automatic propagation of template improvements to existing instances (by design; user re-instantiates).
- The capture must correctly draw the **authored-vs-accumulated** line — the one real risk is capturing runtime data
  into a bundle the user then shares; it rides the same guard as ADR-010 + EN-2.

**Explicitly accepted tradeoffs:**
- Structure duplication + no live updates, in exchange for portability, ZK-cleanliness, and zero reconciliation.

## 6. Review Date / trigger
Reconsider when a **user-shared template** round-trips (export → someone else imports) for the first time — the real
test of the authored-vs-accumulated capture line. If users demand template-update propagation to live instances, revisit — but only with
an explicit, opt-in re-instantiate flow, never an automatic live link (that would breach the fork invariant).
