# Intake — spaces  (level: CORE / FOUNDATION — the Personalization & Composability layer)

> **Pivot origin (2026-07-13):** documenting Languages revealed that a whole "module" dissolves into a
> configuration of generic seams (Knowledge container + universal tag + saved view + composed capability +
> optional template). The real deliverable isn't Languages — it's the **foundation that lets a user assemble his
> own module-like surfaces**. Named **Spaces** (UX noun: a Space = a user-composed, tag-scoped surface with its
> own Views and Blocks). Four primitives. This replaces the "Languages module" slot; Languages becomes the
> **validating worked-example** (a shipped Space + the first capability Blocks). `[FACT: this session; conversation]`

## What a Space is (working definition — SP6 confirms)
> A **Space** = { a **root tag** (membership) · its **Views** (surfaces) · its enabled **Blocks** (tools) · name/
> icon } — optionally born from a **Template**. Nests via tag hierarchy (`#languages` ⊃ `#languages/spanish`).
> "Languages" is a Space; "Spanish" is a sub-Space. No module code.

## Current (enforced reality — authoritative source) — the four primitives are all NEW foundation

**1. Tags — page-only, flat, no hierarchy.** `tags(name UNIQUE[E], color)` + `page_tags(page_id, tag_id)`. A tag
attaches **only to a page** — you cannot tag a Habit, Goal, Session, or Knowledge object. `[FACT: ADR-002
L1374-1402]` N&P service exposes `upsertTag · tagPage · getPagesByTag` — all page-scoped. `[FACT:
notes-and-pages/contract.md L17]`

**2. `entity_links` — page↔entity, hard-coded CHECK enum.** Links a page to any of ~34 entity types via a
**closed `entity_type CHECK(...)`** list. `[FACT: ADR-002 L1340-1352]` This is note-linking, not tagging — and the
closed enum is the exact anti-pattern **Knowledge already retired** (`resource_type` CHECK → open registry).
`[FACT: knowledge/structure-data.md; task file Knowledge entry]`

**3. Views — components, not a saved entity.** `@vida/ui` ships `calendar-view · list-view · gallery-view ·
neural-graph · timeline` + page filters (`listPages({favorite,archived,tag})`, `getPagesByType`). But there is **no
saved, cross-module, tag-scoped view record.** INTENDED `task_views` (Tasks) + per-module custom views
(Preferences) were flagged but never generalized. `[FACT: packages/ui/src/components/; tasks + preferences
structure-data.md]`

**4. Blocks — fixed union + hand-kept extensions dir.** `BlockType = StandardBlockType | IntegrationBlockType`
(closed union: summary/tasks/events/classes/habits/timeline/chart/pomodoro/entity-link/milestone…) with one file
per block in `packages/editor/src/extensions/`. **No registry, not user-composable.** `@vida/ui` has interactive
widgets (`pomodoro-widget`) but no widget registry. `[FACT: editor.ts L12-39; packages/editor/src/extensions/;
packages/ui/src/components/]`

**5. Templates / bundle-instantiate — does not exist anywhere.** `[FACT: no such table/service in survey]`

## Boundary (who owns what — SP1 is the key decision)
- **Notes & Pages (Wave 0)** currently owns `tags/page_tags/entity_links` + view components. Spaces must
  **universalize** tags + views ABOVE every module → if N&P owned the universal versions it would depend on its
  own dependents (cycle). → **Spaces = a NEW foundation tier; N&P becomes a consumer** (mirrors journal PAGE vs
  ENGINE, Journals J1). Resolves the open **"N&P tag-scoping: universal vs module-specific"** backlog item.
- **@vida/editor** owns blocks; **@vida/ui** owns widgets + view components. The **capability-Block registry**
  (SP4) spans both — home to be resolved THIS session (Victor: "solve it in this session").
- **Preferences** owns module-visibility + per-module custom views → becomes where Space nav/visibility + default-
  view prefs live.
- **Knowledge** already uses "shared scoped tags" for containers (Module⊃Area⊃Subject) → universal tags
  **generalize** that idea platform-wide (Knowledge becomes a consumer of the same primitive).
- **Extension-model principle** (ZK core + guarded opt-in) governs any Block that captures media or reaches
  external data → Spaces inherits it (SP8).

## Legacy (life-os v1 — context only)
v1 had **per-feature "Hub" pages** (LanguageHubPage, etc.) — hard-coded aggregation surfaces, one per module. Proof
of the need (users want a per-topic hub) + proof of the failure (each was bespoke code, not composable). Spaces =
the generic version of "Hub." `[FACT: ../life-os per-feature pages]`

## GAP MAP (what the code cannot answer — for Victor, ONE batch)

`[likely …]` = my read; the rest need your intent. Big decisions: **SP1 (tier/ownership) · SP2 (tag model) · SP4
(Block registry + home) · SP5 (templates) · SP6 (is a Space a first-class entity).**

- [ ] **SP1 — Tier & ownership `[likely CONFIRM]`.** Spaces is a **new FOUNDATION tier** (sibling to Notes &
      Pages / Preferences); the universal-tag + saved-view primitives live here; **Notes & Pages becomes a
      consumer** (keeps the journal/page tag *usage*, not the tag *primitive*). Confirm the elevation + that this
      closes the N&P tag-scoping backlog item.

- [ ] **SP2 — Universal tags.** Retire page-only `page_tags` → a **universal `entity_tags` (tag ↔ ANY entity)**.
      Decisions: (a) **open registration vs CHECK enum** for taggable types `[likely OPEN — same call Knowledge
      made retiring resource_type]`; (b) **hierarchy/nesting** (`parent_tag_id`, `#a/b`) `[likely YES — nesting is
      how Spaces sub-group]`; (c) tag **metadata** (color ✅ + icon? description?); (d) relationship to
      **`entity_links`** — merge the two polymorphic mechanisms, or keep tag (grouping) vs link (reference)
      distinct? `[likely distinct: a tag groups, a link references]`.

- [ ] **SP3 — Saved views.** A first-class **`views`** entity: **filter** (tags + entity-types + predicates) ×
      **layout** (list · table · board · gallery · calendar · graph · timeline) × **grouping/sort**, cross-module.
      Generalizes the `@vida/ui` view components + INTENDED task_views + Preferences custom views into ONE
      primitive. Per-Space **default views**. Decision: are views **global saved objects** reusable across Spaces,
      or **owned by a Space**? `[likely: both — a view belongs to a Space but can be cloned/global]`.

- [ ] **SP4 — Capability Blocks + registry (framing-call #2, resolve now).** Retire the closed `BlockType` union
      + hand-kept extensions dir → a **Block/capability REGISTRY** (open registration, like Knowledge
      `study_methods`). Decisions: (a) **home** — is a user-composed capability an **editor block**, a standalone
      **widget/mini-app**, or **both under one registry**? `[lean: one registry, two render targets — inline
      (editor block) + standalone (widget), a Block declares which it supports]`; (b) what a Block **declares**
      (inputs/entity-bindings/render/emitted-signals — mirror ADR-005's 6-part service anatomy); (c) the
      **pronunciation A-B-A tool + immersion-plan + base-words** become the **first Blocks** (Languages residue).

- [ ] **SP5 — Templates / starter-packs (in scope this session).** A **Template** = a serialized bundle {root tag
      + seed entities + views + enabled blocks} + a **one-click instantiate** action. Ships **presets** — the
      **"Languages" starter = your method** (Knowledge kinds + daily-practice Session template + Goal template +
      immersion Blocks). Decisions: template **storage/format** (a portable doc?), **update semantics** (instance
      diverges from template — fork vs track?), **shipped vs user-authored** templates.

- [ ] **SP6 — Is a Space a first-class entity?** `[likely YES — lightweight]`. A `spaces` record binds { root_tag
      · name · icon · default_view · enabled_blocks · parent_space } so it's **addressable in nav** and nestable —
      vs purely emergent ("just a tag + views," nothing to click). Confirm the lightweight entity.

- [ ] **SP7 — Languages as worked-example (confirm the drop).** **Languages leaves the module list** → becomes
      (a) a **shipped Space/template** (reference impl of Spaces) + (b) its unique tools = the **first capability
      Blocks**. Its generic parts (vocab→Knowledge, practice→Sessions) are already covered. Confirm; decide where
      the worked-example doc lives (a `docs/features/` Space example, or inside the Spaces core docs).

- [ ] **SP8 — ZK / extension-model inheritance `[likely CONFIRM]`.** A user-composed Block that captures media
      stores it **encrypted** (L2/L3); one that reaches external data goes through the **extension-model guard**
      (opt-in, user-owns-risk). Personalization never breaks zero-knowledge. Confirm as a Spaces invariant.

- [ ] **SP9 — Underpins the documented seams `[likely CONFIRM]`.** Universal tags = the laddering key the
      **Purposes capstone** needs; a saved view = what the **Global Calendar** and **dictionary** already are; Space
      surfaces consume `dueIn()` + journal contributions. Confirm Spaces is the substrate beneath the seams already
      documented, not a competing mechanism.

### Not-blocking (resolved in Transform unless flagged)
- Terminal states per capability (loading/empty/error/success) — in the contract.
- **ADR set** this will likely produce: **universal tags · saved views · capability/Block registry · templates**
  (3–4 ADRs) + `core/business-rules.md` invariant (personalization-within-ZK) + manifest re-sequence (Languages
  off modules; Spaces as core). Confirmed at Accept via `/adr-new`.
- Nav/visibility (a Space appears in nav) → Preferences per-module-visibility generalizes to per-Space.

## Requirements accumulator (filled AS each remaining module is documented — grounds SP1-SP9)
> Spaces touches every module, so its gaps resolve **after** the modules (Victor 2026-07-13). As each module
> (Health · Skills · Duties · Routines · Pomodoro · Bucket List) is documented, record here its Spaces-relevant
> needs — the concrete taggable surfaces / view needs / specialized capabilities it surfaces — so the eventual
> Spaces design is built from real requirements, not speculation (No-Guessing).
- _(Languages, dissolved 2026-07-13):_ needs — taggable Knowledge objects+sessions+recordings under one `#language`
  group; a "hub" saved view + a dictionary (grouped/filtered) view; capability Blocks = **A-B-A pronunciation
  comparison**, **weekly immersion plan**, **base-words progression**; a shipped **starter Template** = Victor's
  method. `[FACT: docs/intake/languages.md]`
- _(Health — intake WHOLE #1, 2026-07-13):_ needs — capability Blocks: **workout logger** (sets/rest-timer/
  PR) · **photo-capture-and-analyze** (food + body measures, AI vision) · **meal/macro logger** · **body-metric/goal
  trend charts** · **exercise-library importer** · **program generator** (manual+AI); discipline/pillar Spaces
  ("Muay-Thai", "Nutrition"); imported library / shipped program = Template. Surfaces the **manual/AI/import
  authoring triad** as a candidate generalized pattern. `[FACT: docs/intake/health.md ⭐ Vision + HL11-HL15]`
- _(Skills — documented #2, 2026-07-14):_ needs — capability Blocks: **Life Skill Tree / dependency-graph view**
  (neural graph) · **Skill Composer** (definition/measurement builder, Quick+Advanced) · practice logger ·
  reflective dev-log · evidence/portfolio. A skill = a Space; **three-way authoring** (manual/LLM/import) + community
  submission = extension-model + template pattern. `[FACT: docs/features/skills/]`
- _(Duties — DISSOLVED into Tasks + Spaces, 2026-07-14):_ **second validating worked-example** (after Languages).
  Duty & Obligation = **task-type PRESETS** — surfaces the **"preset" primitive**: a preset = a **thin tab** =
  { saved View (SP3, over a `tasks` filter) + **per-type UI/UX** + default fields/deliverables + optional starter
  Template (SP5) } bound to a **task *type*** (Tasks owns the type discriminator; Spaces owns the preset). Needs —
  the preset/template model must express **"same entity, different tab + different patterns/contexts/deliverables"**
  and be **user-extensible** (users author new task types + preset tabs). Reinforces SP3 (saved views) + SP5
  (templates/presets) + SP6 (a preset tab is a lightweight Space over a filter). `[FACT: docs/intake/duties.md;
  docs/intake/tasks.md ADDENDUM]`
- _(Routines — intake resolving #3, 2026-07-14):_ **major personalization consumer.** Needs — **user-configurable
  policies** exposed as a personalization surface: routine **completion policy** (all-or-nothing · required-node ·
  threshold) · **miss policy + acceptance window** (how misses count, how long a miss stays make-good-able) ·
  **user-extensible session types + new segments** (extends the ADR-004 sub-type registry via Spaces) ·
  **step-scoping** (a repeatable action shared across all / one / a subset of routines). A routine = a composable
  ordered sequence of steps that drive entities; strong candidate for **templates/presets** (SP5) + saved views
  (SP3). Reinforces the "ship defaults, user personalizes everything" pattern (autonomy-with-clarity). `[FACT:
  docs/intake/routines.md §E]`
- _(Pomodoro — documented #5, 2026-07-15):_ **light personalization consumer.** Needs — the Pomodoro/interval
  config (`pomodoro_*` + `auto_start_*`/`notifications`/`sounds`) and **named focus templates** are surfaced as
  personalization (config = Preferences; templates = `focus` Session presets). Reinforces SP5 (templates/presets)
  applied to the Sessions `focus` sub-type. Pomodoro itself is a capability in the Sessions realm, not a Space.
  `[FACT: docs/intake/pomodoro.md]`
- _(**Bucket List — DISSOLVED into Spaces, 2026-07-15**):_ **THIRD validating worked-example** (after Languages,
  Duties). Victor's sincere reframe: Bucket List is just "a separated View of things I want to do before I die,
  with progress, to envision them" — i.e. a **Space**, not a module. Surfaces/reinforces: a Space = **a `#before-i-die`
  tag (SP2) + a saved Gallery/vision-board View (SP3) + a progress readout + an optional Template (SP5)** over the
  **Dreams** entity (Purposes & Goals owns Dreams; see PG8-resolved). Key need — a Space must render an entity as a
  **visual/vision-board Gallery** (imagery-first View), not just a list; and expose **derived progress** per item.
  Confirms SP6 (a curated tab = a lightweight Space over a filter). No new entity — the items are Dreams. `[FACT:
  docs/intake/bucket-list.md; docs/intake/purposes-and-goals.md PG8]`

---
**STATUS: PARKED 2026-07-13 — resume as execution #8 (foundation, immediately BEFORE the Purposes capstone).**
Gap map SP1-SP9 written + framed; **name locked = Spaces**; four primitives confirmed by Victor; Templates in
scope. Deliberately deferred: Spaces touches every module, so SP1-SP9 resolve against **documented** Health/Skills/
Duties/Routines/etc. (accumulator above), then Transform → the ADR set (universal tags · saved views · Block
registry · templates). Purposes capstone (#9) depends on Spaces' universal tags. This is CORE/foundation →
Transform produces ADRs + core docs, not feature aspect docs. Do NOT Transform until #1-7 are documented and the
gap map is whole.
