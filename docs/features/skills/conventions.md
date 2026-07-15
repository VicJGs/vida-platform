<!-- Conventions — features/skills · Phase 2 · sources: intake/skills.md + platform baselines + core patterns. -->

# Conventions — Skills

Platform baselines apply (UUIDv7 · Unix-ms · dates `YYYY-MM-DD` · INTEGER booleans · `_sync_*` · soft-delete · no
inline `notes` · enums = SQL CHECK + Zod). Skills specifics:

- **Ladder = data, not code.** A skill's levels are rows (configurable per skill, template-seedable) — never a
  hard-coded scale. Add a ladder, not a schema. `[INTENT SK-2]`
- **Derived over stored.** `current_level`/`progress`/mastery are **computed**; stored values are caches, override
  is flagged. `[INTENT SK-4]`
- **Dispatch by `Activity.Type`.** Practice→Sessions · Study→Knowledge · Project→Projects · Assessment/Review→
  Knowledge. Skills references the created entity by id; never duplicates it. `[INTENT SK-6]`
- **A practice Action IS a Session.** Model as a `practice` sub-type (ADR-004) + a `skill_actions` extension — no
  standalone action-timer. Dev-logs compose the **shared reflective/Adaptation engine** (with Health). `[FACT ADR-004; INTENT SK-7]`
- **Cross-domain via entity_links + the Composer.** Retire the course/book-only junction; a skill's tracked
  components are chosen in the Composer and linked via `entity_links`. `[INTENT SK-5/SK-6]`
- **Graph scope is explicit.** `skill_dependencies.scope` distinguishes the **global canonical** graph (our library +
  community) from the **user's personal** instance. `[INTENT SK-8]`
- **Fill-source + locale labeled.** Every definition/activity carries `fill_source` (manual/llm/import) + locale
  variant; AI/external-DB/community paths are opt-in, consent-gated (extension-model). `[FACT SK-12]`
- **Advisory, never gatekeeping.** Decay flags + path-recommendations + synergy hints **advise** — the user is
  sovereign (autonomy-with-clarity). `[INTENT SK-9]`
- **`entity_type` additions** register in the polymorphic enums so pages/tags/links/graph work uniformly. `[INTENT SK7]`

## Completion checklist
- [x] platform baselines · [x] Skills specifics · [x] [FACT/INTENT] · [x] no `{{…}}`
