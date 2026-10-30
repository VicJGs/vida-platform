<!-- Conventions — features/skills · Phase 2 · sources: platform baselines + core patterns. -->

# Conventions — Skills

Platform baselines apply (UUIDv7 · Unix-ms · dates `YYYY-MM-DD` · INTEGER booleans · `_sync_*` · soft-delete · no
inline `notes` · enums = SQL CHECK + Zod). Skills specifics:

- **Ladder = data, not code.** A skill's levels are rows (configurable per skill, template-seedable) — never a
  hard-coded scale. Add a ladder, not a schema. `[INTENT SK-2]`
- **Derived over stored.** `current_level`/`progress`/mastery are **computed** (`binding_mode`=`derived-pull`); stored
  values are caches, override is flagged (M3). The Composer's `measurement_config` draws the ADR-011 `measurement_kind`
  taxonomy — **no stored pursuable column** (the pursuable target lives in Purposes). `[INTENT SK-4; ADR-011 M1/M2/M3]`
- **Dispatch by `Activity.Type`.** Practice→Sessions · Study→Knowledge · Project→Projects · Assessment/Review→
  Knowledge. Skills references the created entity by id; never duplicates it. `[INTENT SK-6]`
- **A practice Action IS a Session.** Model as a `practice` sub-type (ADR-004) + a `skill_actions` extension — no
  standalone action-timer. Dev-logs compose the **shared reflective/Adaptation engine** (with Health). `[FACT ADR-004; INTENT SK-7]`
- **Cross-domain via entity_links + the Composer.** Retire the course/book-only junction; a skill's tracked
  components are chosen in the Composer and linked via `entity_links`. `[INTENT SK-5/SK-6]`
- **Graph scope is explicit.** `skill_dependencies.scope` distinguishes the **global canonical** graph (our library +
  community) from the **user's personal** instance. `[INTENT SK-8]`
- **Fill-source + locale labeled.** Every definition/activity carries `fill_source` (manual/llm/import) + locale
  variant; the `import` path is device-mediated public-reference ingest (ADR-014 X1/X2/X3) under `external_in_ok`
  (X5, add-only dedup X8, revocable X9, normalization X10); the `llm` path is ADR-015 (X11 split, `on_device`/`cloud`
  AI1, cloud egress+scope-min AI3); rows carry `source=ai` (AI6). AI/external-DB/community paths are opt-in,
  consent-gated (extension-model). `[FACT SK-12; ADR-014/015]`
- **Advisory, never gatekeeping.** Decay flags + path-recommendations + synergy hints **advise** — the user is
  sovereign (autonomy-with-clarity). `[INTENT SK-9]`
- **`entity_type` additions** register in the polymorphic enums so pages · **tags (`entity_tags`, SP1)** · links ·
  graph work uniformly. `[INTENT SK7; ADR-006 SP1]`
- **Never route ingest/AI through the server; never auto-transmit on export.** The Skill-DB fetch + AI draft are
  device-mediated / BYO-key (X1/AI1, server-blind — a server-plaintext fetch is refused, not downgraded); the
  template export is user-consented X4 egress, never a silent community push (SK-3). The economy emit is
  `grant_currency(XP)` (E2) — skills emits the signal, **never writes XP directly**. `[INTENT; ADR-014 X1/X4; ADR-015
AI1; ADR-012 E2]`

## Completion checklist

- [x] platform baselines · [x] Skills specifics · [x] [FACT/INTENT] · [x] no `{{…}}`
