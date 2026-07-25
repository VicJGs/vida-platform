<!-- Conventions — features/knowledge · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · intake -->

# Conventions — Knowledge  (level: Feature / own module)

## How to build here
- **Never impose an ontology.** Ship `topic / concept / definition` as **default kinds**, then let the user
  extend the kind registry + nest objects below Topic (KN-3). Code against `object_kinds`, never a hard-coded 3-kind enum.
- **Realm drives method, as a default only.** A kind's `learning_realm` picks the default study method
  (`memorize`→drills, `understand`→elaboration, KN-4); always let the user override per level (KN-8).
- **Mastery is computed, never written.** Record `review_events`; let the bound curve derive `mastery_level`
  (KN-9). Never expose a setter for mastery.
- **One object entity, not per-kind tables.** All kinds are rows of `knowledge_objects` discriminated by
  `kind_id` — the personalization comes from data, not schema (avoids migrations when the user invents a kind).
- **Notes go through Pages.** A knowledge note is a `pages` row of the knowledge `entity_type` with a
  personalizable render (KN-5) — never an inline column, never the retired `knowledge_notes` table.
- **Relate through the link graph.** Cross-module ties use `entity_links` (KN-6); never write `resource_type`.
  A single `linked_book_id` is a landmine — support **many** book links per object.
- **Containers nest by tags, regroup by view.** Module ⊃ Area ⊃ Subject membership rides the `entity_tags`
  primitive (ADR-006 SP1, scoped; many-to-many, KN-7); an Area can serve multiple OS-modules. Never model it as a
  rigid `parent_id` chain.
- **Compound sets: builder + default.** Every consumer gets a shipped default set so no one is forced to
  personalize (KN-11, anti-lost). AI-assist only via the extension-model path (opt-in, consent, user-owns-risk).
- **Education plans, Knowledge holds.** Link to Education's planning Topics; never fold a Knowledge object into
  an Education hierarchy Topic (KN-2). Expose mastery as a **source**; never write Education's rollup (KN-10).
- **Ship defaults with every personalizable view.** Personalization is unlimited, but a default schema/kind
  tree/container always renders — sparse data renders gracefully (ED-15 family).

## Naming & types
- Invariants: **KN-n**. Enums as TEXT + CHECK in SQL, canonical Zod in `@vida/core` (`learning_realm`,
  `container_type`, method/curve ids). `[FACT: CLAUDE.md Conventions]`
- PKs UUIDv7 TEXT; timestamps Unix ms; booleans 0/1; JSON as TEXT; `mastery_level` INTEGER 0-100; soft-delete
  `deleted_at`; sync metadata on every syncable table. `[FACT: CLAUDE.md Conventions]`
- `[E]` free-text (titles, descriptions, note content, key_concepts) per KN-1; structure/enums/curve params
  plaintext.

## Landmines specific to this module
- The v2 FACT base is a **downgraded** slice — do not treat `study_topics`/`topic_reviews`/`knowledge_notes`
  as the target model. `study_topics` = the `topic`-kind row; SM-2 columns = one preset's state; `mastery_level`
  = derived; `knowledge_notes` + `resource_type` CHECK = retired; `resource_urls` → `references`. `[FACT
  superseded: ADR-002 L2557-2621, L2715-2738]`
- `is_exam_topic` (boolean) → a topic↔assessment **link** once Education's `assessments` exists (K8) — don't
  cement the boolean.
- **OS-level automations** (penalties/rewards/self-testing/real-time analysis) need a cross-module automation
  surface **not yet documented** — stub the hooks, don't invent the surface. `[INTENT 07-06]`
- **Views** (All-Knowledge Page, per-object pages, neural-graph) are **INTENDED-IMMATURE** — build the default
  now, run the build-time views review + `/critique` before finalizing (per-module views pass, backlog).

## Related
`[[identity]]` · `[[business-rules]]` · `[[contract]]` · `[[structure-data]]` ·
`[[../learning/education/contract]]` (measurement source + planning-Topic link) · `[[../books/contract]]` ·
`[[../notes-and-pages/contract]]` · `[[../../core/business-rules]]`.
