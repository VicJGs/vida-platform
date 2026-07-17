# ADR-008: Replace the closed BlockType union with one open capability registry; a capability declares its render targets, placement is the user's choice

**Status:** Accepted *(foundation gate PASS + Victor sign-off, 2026-07-15)*
**Date:** 2026-07-15
**Decision Makers:** Victor J.
**Context:** Vida Platform — Spaces (Personalization & Composability foundation). ADR 3 of 5 in the Spaces set. Covers the **render model + registry** of SP4; user-*authored* capability safety is [ADR-010](ADR-010-capability-authoring-security.md).
**Tags:** architecture · extensibility · editor · personalization
**Builds on:** [ADR-005](ADR-005-study-method-service-framework.md) (the 6-part plugin anatomy + "keep the seam, retire the instance") — **which this registry subsumes: `study_methods` is a `kind` of this one registry, not a parallel registry (F2/D2, §3.1/§3.3a)** · [ADR-004](ADR-004-session-framework.md) §3.2.4 (permission envelope: scoped to bindings, consent for sensitive) **+ §3.2.5** (the **write-API contract + idempotency** a capability inherits — write only via documented module handlers, no double-count via deterministic `effect_event_id`; INT-2) (a capability that produces a *timed/measurable outcome* drives a **Session**, which owns its Effects, rather than duplicating the effect channel) · [ADR-006](ADR-006-spaces-foundation-universal-tags.md) (a capability is a taggable, note-linkable citizen; standalone instances live on Spaces)
**Amends:** ADR-002 / `editor.ts` — retires the closed `BlockType` union + the hand-kept `packages/editor/src/extensions/` set as the *definition of what a capability is*; introduces the capability registry (definition) + instance model. Exact tables settle at build.

---

## 1. Summary

Capabilities — the OS's interactive units (a `/tasks` block, a Pomodoro widget, a pronunciation comparer, a workout
logger) — become an **open registry** instead of a **closed `BlockType` union** hand-maintained one file at a time.
A capability is a **plugin** defined by a 6-part anatomy (mirroring ADR-005's service anatomy). Crucially, a
capability **declares its render targets** — `inline` (an editor block inside a page) and/or `standalone` (a widget
on a Space surface / dashboard) — and **placement is the user's per-instance choice**. The packaging is
**non-dogmatic and "A-shaped"**: one capability, one or more render surfaces, not a religious "everything is a block"
vs "everything is a widget" split. A capability does **not** reinvent write channels: it writes only through
documented module APIs under ADR-004's **guarded-write discipline**, and when it produces a timed/measurable outcome
it drives a **Session** (which owns its Effects) rather than duplicating the effect catalog. **Shipped capabilities
are fully authored by us; user-*authored* capabilities are
in the vision but gated by ADR-010** (sandbox + permission envelope). The first user-facing Blocks are the Languages
residue (A-B-A pronunciation, immersion plan, base-words) and the Health/Skills accumulator surfaces.

## 2. Context — what triggered this

The capability set is **closed and hand-kept**, in two disconnected halves:
- **Editor blocks:** `BlockType = StandardBlockType | IntegrationBlockType` — a fixed TS union (summary/tasks/events/
  classes/habits/timeline/chart/pomodoro/entity-link/milestone…), one file per block in
  `packages/editor/src/extensions/`. **No registry, not user-composable.** `[FACT: editor.ts L12-39;
  packages/editor/src/extensions/]`
- **Widgets:** `@vida/ui` ships interactive widgets (`pomodoro-widget`) but there is **no widget registry** and no
  shared notion of "a capability that can render inline *or* standalone." `[FACT: packages/ui/src/components/]`

So adding a capability means editing a core union + writing a bespoke file, and a capability is welded to **one**
surface (a block *or* a widget), never "declared once, placed anywhere." This is the same closed-enum, per-instance
rigidity that **Knowledge** retired (`resource_type` CHECK → registry) and **ADR-005** generalized ("keep the seam,
retire the instance"). Meanwhile the documented modules keep surfacing capabilities that need *both* surfaces: a
workout logger (standalone on a Health Space **and** inline in a journal), a chart, a Skill-tree graph, the
Languages pronunciation tool. `[FACT: docs/intake/spaces.md L33-37, SP4; L152-198 accumulator]`

## 3. Decision

**3.1 One open capability registry — the single canonical composability registry.** Retire the closed `BlockType`
union as the *definition of what a capability is*. A capability **registers** here; the OS's block/widget set is the
registry's contents, not a core enum. Adding a shipped capability = registering a definition, not editing a union.
This registry is the **supertype** for every pluggable unit that drives a Session + owns Effects — and there is
**exactly one**. In particular, **Knowledge's `study_methods` (ADR-005) is _not_ a parallel registry; it is a typed
specialization (`kind=study_method`) of this one** (F2/D2). A study-method service **is a capability**; its
review-engine machinery (curves · `method_bindings` · `review_events` · mastery, KN-8/KN-10) is that kind's
extension — exactly as an ADR-004 Session sub-type extends the Session supertype. Knowledge owns the *engine*; this
foundation owns the *registry*. The is-a is *shown* in the anatomy crosswalk (§3.3a), not asserted.

**3.2 A capability declares its render targets; the user chooses placement.** A definition declares which of
`inline` (editor block) and `standalone` (widget / Space surface / mini-app) it supports (one or both). **Per
instance, the user chooses where to place it** among the targets it supports. The model is **non-dogmatic (A-shaped)**
— it can lean toward inline-blocks or standalone-widgets as the product matures, without re-architecting; the
registry does not force a single packaging religion. `[FACT: intake SP4 render-model — "declares render targets …
placement is the user's per-instance choice … not hard to be on about; will lean B if we want"]`

**3.3 A capability is a plugin — 6-part anatomy.** A study-method service (ADR-005) does not merely *resemble* this
anatomy; it **instantiates** it as `kind=study_method` (§3.3a shows every ADR-005 part landing).
1. **Identity / kind** — its registered id + kind (display, config surface).
2. **Config (inputs)** — per-instance settings (e.g. a chart's metric, a logger's target).
3. **Entity bindings** — which OS entities it attaches to / reads, via `session_attachments`-style links + universal
   tags/`entity_links` (ADR-006); **scoped** — a capability sees only what it is bound to.
4. **Render targets** — `inline` and/or `standalone` (§3.2).
5. **Emitted signals (writes)** — a capability writes **only through the target module's documented write API —
   never a direct table write** (INT-2), under ADR-004 **§3.2.5's write-API contract + idempotency** (scoped to its
   bindings via §3.2.4; no double-count via the deterministic-`effect_event_id` mechanism; consent for sensitive
   modules = the extension-model principle). When the outcome is a
   *timed/measurable* one (a logged workout, a focus interval, a practice rep), the capability **drives a Session**,
   and that **Session** owns the catalogued Effects (`award_xp · log_time · contribute_purpose_metric ·
   surface_journal · …`, ADR-004 §3.2.2). A pure-render capability (a chart, a graph) emits nothing. A capability
   never invents its own effect channel.
6. **Universal properties** — a capability instance is a first-class citizen: taggable, note-linkable, attachable
   (ADR-006). Never an island.

**3.3a A study-method is a `kind` of capability — the is-a, shown (F2/D2).** ADR-005 defines a study-method by its
six parts **plus a `role` axis** (retention/gathering — ADR-005 §6 names a service as `content unit + role +
bindings`). Not every ADR-005 concept maps to a *positional* part here; this crosswalk resolves **all** of them, and
is honest where a mapping needs a mechanism this ADR doesn't already carry:

| ADR-005 study-method concept | Capability model (this ADR) | Resolution |
|---|---|---|
| 1. Content unit (reviewable) | data the capability owns (its content table) + config (part 2) | the card is **owned data, not a capability**; the *method* is the capability (§3.3 part 5's BR: a reviewable ≠ a capability) |
| 2. Run surface = a Session sub-type | part 5 **"drives a Session"** | same axis — a drill *is* the capability driving a `review_session` (ADR-004) |
| 3. Registration (`study_methods`) | part 1 **identity/kind** — `kind=study_method` | the registration record lives in this one registry; curve/level **binding** (`method_bindings`, KN-8) is the kind's review-engine extension |
| **`role` axis** (retention · gathering · …) | part 2 **config / kind-metadata** — declares `roles: retention\|gathering\|…` | a kind-declared config field (the open registry already carries kind-specific config), so ADR-005 §6's test lands |
| 4a. Gather — **write** (create content units) | part 5 **emitted-signals** — a §3.2.5 guarded write to its own content table | clean: the capability write contract applied to content creation |
| 4b. Gather — **read from OS sources** (Book quotes, notes) | **not** part-3's bound-scoped read | gather reaches *across* to unbound sources → a **user-initiated source pick** (a selection/consent act), a distinct read channel *tracked for build* — not "no new mechanism" |
| 5. Emitted signals (`review_events`) | an **own-domain write** to Knowledge's `review_events`, **not** a §3.2.5 cross-module effect | the review-session's own-domain output; its *downstream* effects (`emit_measurement_signal`, `award_xp`, `log_time`, `surface_journal`) ride §3.2.5 (§3.2.2 catalogue) |
| 6. Universal properties | part 6 **universal properties** | identical (tags · `entity_links` · attachments) |
| *(none in ADR-005)* | part 4 **render targets** (`inline`/`standalone`) | **inherited eligibility** — a study-method *may* now declare render-targets; **whether/where a drill renders as a placed instance is the instance/placement model (§3.4/§3.2), settled with the first dual-target capability**, not here |

**Layering.** Knowledge (a **feature** module) registering into this registry (a **foundation**, beneath N&P per
ADR-006) is a legal **downward** dependency; the review *engine* stays up in Knowledge, only the *registration
record* lives down here. The reverse would be an inversion and does not occur — this is what makes "the foundation
owns the registry" safe rather than an ownership grab.

**3.4 One registry spanning both packages — the home question, resolved.** The registry is the single source of a
capability's definition; **`@vida/editor` provides the `inline` render surface** (a registered capability with an
`inline` target is exposed as a TipTap node + slash-menu entry) and **`@vida/ui` provides the `standalone` render
surface** (a widget on a Space/dashboard). Neither package *is* the registry; both are renderers it drives. This
answers SP4's "editor block vs widget vs both under one registry" — **both, under one registry.** `[FACT: intake
SP4(a); L46-47 "home to be resolved THIS session"]`

**3.5 Shipped capabilities are fully authored; user-authored capabilities are gated by ADR-010.** Every shipped
capability ships with all 6 parts authored by us (parallel to ADR-004 §3.3 — the user never wires the main ones).
The **first user-facing Blocks** are the Languages residue (**A-B-A pronunciation comparer · weekly immersion plan ·
base-words progression**) plus the Health/Skills accumulator surfaces (workout logger, photo-analyze, chart,
Skill-tree graph). **User-*authored* capabilities are in the vision** but their safe-authoring surface — sandbox +
permission envelope — is **[ADR-010](ADR-010-capability-authoring-security.md)**, not this ADR. `[FACT: intake SP4;
accumulator]`

**Data model (decision-level; tables settle at build).** The **registry** holds capability **definitions**
(id · kind · declared render-targets · declared bindings · declared effects · config schema). Shipped definitions are
**code-registered**; user-authored definitions are **stored** (ADR-010). An **instance** = a placed capability +
config + bindings: an `inline` instance lives in the **page document** (editor node attrs, synced via Yjs per
ADR-003 — no table); a `standalone` instance is a lightweight **`block_instances`** row referenced by **a Space**,
carrying `_sync_*` + `deleted_at` (DATA-4). Instance config with user literals encrypts per EN-2. *(Whether a saved
`view` (ADR-007) can also host a placed instance is an open build seam — ADR-007 defines `filter × layout × grouping`
over read APIs, with no widget-placement slot today; not asserted here.)*

**A Space's `enabled_blocks` — the offered palette vs the placements (O2 resolved, F3/D3).** ADR-006's `spaces` row
carries **`enabled_blocks`**: the *per-Space set of capability **definitions** (this registry) the Space offers as
tools* — its **menu**, distinct from `block_instances`, which are the **placements**. The palette is **authored
config** (carried by Templates as ADR-009's "enabled capabilities + their config" — the same set) and
**render-target-agnostic in membership** (an offered definition may be placed `inline` or `standalone` per its
declared targets; the form is the §3.2 per-instance choice). Its **teeth split by surface**: a **standalone**
placement (`block_instances`) on a Space is **drawn from that Space's `enabled_blocks`** (the palette is that
surface's authoritative add-menu — the concrete thing the field enforces); an **inline** placement is chosen
additively from the union of the page's Spaces' offered capabilities + the global editor base (non-restrictive — a
page can belong to several Spaces). Curating the palette gates *adding*; it does **not** force-delete existing
placements (grandfathered). This is what makes "a `block_instances` row referenced by a Space" concrete. Storage of
the offered set (a Space↔definition junction) settles at build under the ADR-002 amendment + sync work (F10); its
row-based lean follows ADR-006 §3.3's sync-robustness rationale.

**Terminal states.** Every capability declares **loading / empty / error / success** for each render target it
supports (a standalone chart with no data ≠ a crash); specified at the contract level.

**What this decision does NOT do:** it does not build the user-authoring surface or its sandbox (ADR-010); it does
not design each shipped Block's visual/interaction spec (build-time views pass); it does not migrate the existing
TipTap extensions (they *become* registered `inline` definitions — a build-time re-home, not a rewrite).

## 4. Options Considered

### Option A — One open registry; capability declares render-targets; placement is the user's choice (CHOSEN)
- **Rationale:** ends the closed union + per-file rigidity; unifies blocks and widgets under one definition so a
  capability is "declared once, placed anywhere"; reuses ADR-005's anatomy and ADR-004's effects/permissions rather
  than inventing mechanisms; non-dogmatic packaging survives product evolution.
- **Tradeoffs accepted:** an instance's storage differs by render target (page-doc node vs `block_instances` row);
  the registry must be robust enough to drive two render surfaces; a definition's declared effects must be validated
  against the permission envelope (ADR-010) at author-time.

### Option B — Keep the closed `BlockType` union + separate widget list (REJECTED)
- **Why rejected:** every capability edits a core union + a bespoke file and is welded to one surface; no
  user-authoring is possible; reproduces the closed-enum rigidity Knowledge/ADR-005 already retired.

### Option C — Two registries of the same shape (REJECTED)
- **Why rejected:** duplicates the anatomy, splits "the same capability, two surfaces" across two systems, and makes
  "placement is the user's choice" impossible — the very thing SP4 asks for. One registry, N render surfaces, N kinds.
- **This principle also folds in the ADR-005 `study_methods` case (F2/D2)** — not just editor-blocks-vs-widgets. A
  Knowledge-owned `study_methods` registry running *parallel* to this one is exactly the two-registries-of-the-same-shape
  split rejected here; instead `study_methods` is a `kind` of this registry (§3.1/§3.3a).

## 5. Consequences

**Easier:**
- A new capability = one registered definition; it can appear inline, standalone, or both, by declaration.
- Blocks and widgets stop being two worlds; a Space surfaces the same capabilities a page embeds.
- Outcome integration is inherited, not rebuilt: an outcome-producing capability drives a Session and is
  Journal/Gamification/Calendar-integrated for free (ADR-004); a pure-render one carries no write surface at all.

**Harder:**
- A capability's instance lives in two possible homes (page-doc vs `block_instances`); the registry drives two
  renderers; consistency across them is real work.
- Two Space-level concepts must stay distinct in every renderer and doc: a Space's **`enabled_blocks`** (the offered
  *menu* — authored, ADR-006 §3.4) vs its **`block_instances`** (the *placements*). Conflating menu with placements is
  the O2 confusion this ADR now closes; keep them separate at the data + UI layer.
- Opening the set is what *enables* user-authoring — which is exactly why it **requires** ADR-010's guard before any
  non-shipped definition runs.

**Explicitly accepted tradeoffs:**
- Dual instance-storage + a two-surface registry, in exchange for one capability model, user-choosable placement,
  and a path to user-authored capabilities.

## 6. Review Date / trigger
Reconsider when the **first dual-target capability** (a workout logger rendering both inline and standalone) and the
**first user-authored capability** (under ADR-010) are built. If "declared once, placed anywhere" cannot hold across
the page-doc/`block_instances` split without leaking render-specific assumptions into the registry, revisit the
instance model.
