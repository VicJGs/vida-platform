<!-- Business Rules — features/knowledge · /documentation Phase 2 · sources: ADR-002 §5.10 Learning (study_topics L2557-2621, knowledge_notes L2715-2738) · schema.ts · CLAUDE.md §7 · docs/intake/knowledge.md -->

# Business Rules — Knowledge (level: Feature / own module)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3 + the extension-model
> principle. Every rule below complies. Invariants are **KN-n** (numeric); the intake's KN-A/B/C are the
> resolution notes those rules encode.

## Invariants (what is ALWAYS / NEVER true)

- **KN-1 — Encrypted content.** Object `title`/`description`/`key_concepts`/`resource_urls`, note
  `content`/`title`/`topic`/`subtopic`/`tags`, review payloads, and any user free-text are `[E]` (ZK-1);
  kinds, realms, enums, dates, counters, mastery numbers, and sort orders are plaintext. All INTENDED entities
  follow the same split. `[FACT: ADR-002 §5.10 Learning (study_topics L2557-2621, knowledge_notes L2715-2738) [E] marks]`
- **KN-2 — Education plans, Knowledge holds (⚠ INTENDED).** A Knowledge object is NEVER the same row as an
  Education hierarchy Topic. The two are **separate entities, linked** via the Education compound set; deleting
  an Education planning Topic never deletes the acquired knowledge. `[INTENT KN-A]`
- **KN-3 — Knowledge lives on the `Subject › Unit › Topic` spine; the user grows his own kinds BELOW Topic
  (⚠ INTENDED).** The fixed academic spine _to reach_ a Topic is **Subject › Unit › Topic** — "very important
  for the environment of the knowledges" (Subject = the container-org leaf, KN-7). **Below** a Topic the user
  grows his own hierarchy of knowledge objects via `parent_object_id` — the "whole hierarchy of entities below
  topics" Victor described. Every object has a **`kind`**; the kind registry is **user-extensible** —
  `concept`/`definition` ship as editable/removable defaults and the user may add new kinds (KN-4). No kind set
  is imposed. `[INTENT K1; Subject›Unit›Topic: Victor 2026-07-10]` Whether the kind _registry itself_ nests
  (`parent_kind_id`) or stays flat is an open modeling choice. `[INTERP — validate at build]`
- **KN-4 — Every kind declares a learning-realm (⚠ INTENDED).** Each kind carries `learning_realm`
  (`understand` | `memorize` | user-defined). Realm is the DEFAULT driver of study method (KN-8): `memorize`
  → spaced-rep drills (Flashcards family); `understand` → elaboration (Feynman/self-assessment). The default is
  always user-overridable. `[INTENT K1↔K5]`
- **KN-5 — Knowledge notes are a Pages type, not a table (⚠ INTENDED, supersedes `knowledge_notes`).** A
  knowledge note is a `pages` row with a knowledge-specific `entity_type` and a **personalizable UI/UX** — the
  task-notes precedent ("alike but not the same as Tasks"). The standalone `knowledge_notes` table **retires**
  into the platform `pages` + `entity_links` pattern (no inline notes columns, platform convention). `[INTENT K3;
FACT superseded: ADR-002 L2715-2738]`
- **KN-6 — Cross-module reach is via the link graph (⚠ INTENDED, supersedes `resource_type` CHECK).** Objects
  relate to courses, books, skills, languages, finance, health, … through **`entity_links`**. The narrow
  `study_topics`/`knowledge_notes` `resource_type` CHECK (`course`/`book`/`topic`) is **retired** — it cannot
  scale to every module. `[INTENT K4; FACT superseded: knowledge_notes resource_type CHECK L2717]`
- **KN-7 — Containers organize by tags, not rigid parents (⚠ INTENDED).** The container hierarchy **Module ⊃
  Area ⊃ Subject** has **many-to-many membership at every step** (one Area may belong to multiple Modules; a
  "Module" here = an **OS module**). Nesting is expressed through the **`entity_tags` primitive** (ADR-006 SP1,
  scoped) and rendered through different views — never a single `parent_id` chain. `[INTENT KN-B, K12; FACT: ADR-006 SP1]`
- **KN-8 — Study methods & curves are pluggable at every level (⚠ INTENDED).** Methods (flashcards, Feynman,
  self-test, …) and decay/review/test **curves** are user-selectable and **mixable** per Area / Subject / Unit
  / Topic / kind. **SM-2 is one preset** in the scheduling family, not the model. The v2 fixed SM-2 columns on
  `study_topics` become one preset's state. `[INTENT K5; FACT reinterpreted: study_topics SM-2 columns L2570-2590]`
- **KN-9 — Mastery is derived and rolls UP the spine, never hand-set (⚠ INTENDED).** `mastery_level` is
  COMPUTED at the leaf from whichever active methods report (reviews, drills, self-assessment) under the
  object's chosen curve, then **rolls up `kind → Topic → Unit → Subject`** (KN-3 spine) — the user tunes the
  curve, not the number. `[INTENT K5 + Victor 2026-07-10; FACT reinterpreted: study_topics.mastery_level L2565]`
- **KN-10 — Knowledge mastery is an Education measurement SOURCE (⚠ INTENDED, cross-module contract).**
  Education's measurement consumes Subject-level Knowledge mastery (rolled up the `Subject › Unit › Topic`
  spine, KN-9), compounded from **(1) object mastery + (2) assessment results + (3) pace-vs-syllabus**
  (acquiring on schedule vs. faster than the subject's syllabus-as-calendar). Knowledge exposes the source;
  Education owns the Program-level rollup. `[INTENT K10 + Victor 2026-07-10]`
- **KN-11 — Compound sets are user-built with a shipped default (⚠ INTENDED).** A compound set (the per-consumer
  partition + the user's rules/methods/params) is assembled in a **builder**; a **default set ships** so no
  user is forced to personalize (anti-lost, ED-15 family). AI may ease the build **only** under extension-model
  (opt-in, consent-gated, user-owns-risk). `[INTENT KN-C]`
- **KN-12 — Reproducible, never social.** Nothing publishes from within the OS; there is no community surface.
  Setups are **reproducible by mimicry** (follow the steps), not shared objects. `[INTENT Victor 07-06]`

## Terminal states per capability

| Capability                   | Empty                                                 | Error                                            | Success                                         |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| Catalog / All-Knowledge view | default kind tree + one starter container (anti-lost) | typed load error, no partial silent state        | objects grouped by container/tag across areas   |
| Create object                | —                                                     | invalid kind / broken parent-object ref rejected | object placed in the hierarchy under a Topic    |
| Study/review a level         | "nothing due" (not blank)                             | scheduler/method error surfaced                  | review logged → mastery re-derived              |
| Knowledge note (page type)   | new personalizable page shell                         | save reverts optimistic write                    | page persisted via `pages` + link               |
| Mastery → Education source   | "no signal yet"                                       | contract mismatch flagged, not guessed           | 3-signal mastery exposed to Education           |
| Knowledge Lab entry          | empty lab canvas                                      | —                                                | hypothesis + data → conclusion → catalog object |

## ⚠ INTENDED / forward-dependency ledger

- **KN-5/KN-6/KN-8/KN-9** reinterpret or retire FACT-base columns (`knowledge_notes` table, `resource_type`
  CHECK, fixed SM-2 columns, hand-set `mastery_level`) → **ADR-002 amendment** (consolidated).
- **KN-10** references the **subject SYLLABUS-as-calendar** — an **Education-owned** entity + Education's
  measurement design pass. Forward dep. `[INTENT K10]`
- **OS-level automations** (K/reframe): financial penalties on misses, self-generated rewards on adherence
  (Finance + Gamification), self-testing, real-time analysis of own data vs. own theories. Requires a
  **cross-module automation/rules surface not yet documented anywhere** — flagged, not designed. `[INTENT 07-06]`
- **K7 views** (All-Knowledge Page, per-object pages, neural-graph inclusion) = **INTENDED-IMMATURE** (need
  Skills/Languages/Health documented). Ship graceful defaults; refine at the build-time views review pass.
- **K9 auto-population** (objects from syllabus/TOC/schedule) = extension-model, device-side, opt-in.
