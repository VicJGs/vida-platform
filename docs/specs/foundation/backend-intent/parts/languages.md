# Backend Intent — Part A: languages

> **Reader disposition.** The 5 NON-STANDARD aspect docs (`docs/features/languages/{component-catalog,module-spec,
> page-map,service-contract,state-management-map}.md`) are all **0-byte placeholders** — never authored. The
> live/authoritative intent is `docs/intake/languages.md` (S2) + the Spaces accumulator `docs/intake/spaces.md`
> (S1/S10, SP7 + requirements accumulator). Languages **DISSOLVED into Spaces 2026-07-13** (LG1 resolved,
> `docs/intake/languages.md:148-154`): it is NOT a standalone module. Most generic capabilities ROUTE AWAY to
> composed foundations — vocab→Knowledge (generic review engine, KN-8/KN-10), practice/daily→Sessions sub-types
> (ADR-004), flashcards→Knowledge study-method service (ADR-005). The rows below capture (a) the irreducibly-
> language-specific backend intent that survives as capability Blocks/composition, and (b) the ROUTED items —
> recorded so no intent drops at the seam even though the final home is a cross-cutting engine or a Space.
> The service stub `packages/core/src/services/languages/CLAUDE.md` is a directory home only (ADR-018), no logic.

| id | description | source (file:line) | evidence | boundary | cross-cutting | candidate home |
|----|-------------|--------------------|----------|----------|---------------|----------------|
| LAN-01 | Vocabulary CRUD (word/translation/pronunciation/part_of_speech/example_sentence/meaning_in_target_language + language-specific fields) — language-owned fields kept, SRS cols retired | intake/languages.md:20-22,90-96 (LG2) | INTERPRETATION | service | shared (Knowledge — vocab word becomes a Knowledge object kind=`word`/`vocabulary`) | Knowledge service (composed) + Languages Space fields |
| LAN-02 | Vocabulary mastery **DERIVED** via generic review engine (retire `mastery`/`review_count`/`next_review_date` cols; mastery derived KN-10), not a bespoke per-vocab SRS | intake/languages.md:42-44,92 (LG2), :20-22 | FACT | service | shared (Knowledge review engine — KN-8/KN-10; ADR-005) | Knowledge review engine (ROUTED) |
| LAN-03 | Vocabulary emits **`review_events`** for review scheduling (→ Knowledge derived mastery) | intake/languages.md:132-134 (LG9) | FACT | service | shared (Knowledge review engine; contributors: knowledge, books, skills) | Knowledge review engine (ROUTED) |
| LAN-04 | **Base-words** CRUD + curated foundational word-set with `is_learned`/`learned_at`/`display_order` and **base-words progression** readout (learned N of M) | intake/languages.md:32-34,96 (LG2); spaces.md:159 | FACT (fields) / INTERPRETATION (progression derivation) | service | module-local (Languages Space capability Block) | Languages Space capability Block |
| LAN-05 | Base-word↔vocabulary linkage (`linked_vocabulary_id`) — a base word may be a subset/promote-to vocabulary entry | intake/languages.md:33-34,96 (LG2) | FACT | service | module-local | Languages Space |
| LAN-06 | **Practice sessions** CRUD (skill_type, activity_type, duration_minutes, new_words_learned, accuracy_percentage, focus_rating, energy_level) → routes to an ADR-004 Session `practice` sub-type + language extension table | intake/languages.md:17-19,45-46,98-102 (LG3) | FACT (fields) / INTERPRETATION (route to sub-type) | service | shared (Sessions supertype ADR-004; contributors: sessions, knowledge, pomodoro, health) | Sessions service (ROUTED) + Languages extension |
| LAN-07 | **Daily-practice sessions** CRUD (weekly_topic, day_number, completion flags: grammar_video…vocabulary_journal, *_video_url, song/bible recording ids) → ADR-004 Session `daily` sub-type | intake/languages.md:23-25,45-46,98-102 (LG3) | FACT (fields) / INTERPRETATION (route to sub-type) | service | shared (Sessions supertype ADR-004) | Sessions service (ROUTED) + Languages extension |
| LAN-08 | **Daily-practice wizard methodology** — the structured ordered step set (grammar video · vocabulary · conversation · song · Bible · vocab-journal) as either a fixed sub-type extension or a **configurable session template** | intake/languages.md:98-102 (LG3), :104-108 (LG4) | INTERPRETATION | service | shared (Sessions templates G6; Templates ADR/spaces SP5) | Languages starter Template / Sessions template (ROUTED) |
| LAN-09 | **Phased methodology framework** — phases/roadmap (`current_day_number`, `learning_phase`, `phase_started_at`, weekly topic rotation) as a user-configurable practice framework shipped pre-configured with Victor's system as default | intake/languages.md:14-16,58-60,104-108 (LG4) | INTERPRETATION | service | module-local (Languages Space) w/ Templates seam | Languages Space + Template (SP5) |
| LAN-10 | **Weekly immersion plans** CRUD (week_start_date, topic, song title/artist/url/lyrics + current_song_day, bible book/chapter/verses, planned_videos, videos_watched, days_completed) | intake/languages.md:29-31,110-114 (LG5) | FACT (fields) / INTERPRETATION (keep vs fold) | service | module-local (Languages Space capability Block) | Languages Space capability Block |
| LAN-11 | Weekly-plan **reflections** (weekly_reflection / highlight_moments / challenges_faced) — either fold into the generic review mechanism (Purposes PG3) + Journals, or keep inline | intake/languages.md:30-31,110-114 (LG5) | INTERPRETATION | service | shared (Purposes generic review PG3; Journals) | generic review seam (ROUTED, undecided) |
| LAN-12 | Immersion content (songs/lyrics, Bible passages, videos) as generic references / `entity_links` vs language-owned fields | intake/languages.md:113-114 (LG5) | UNKNOWN | service | shared (entity_links / Notes-and-Pages linking) | Notes-and-Pages entity_links (ROUTED, undecided) |
| LAN-13 | **Recordings** CRUD (recording_type, title, audio_blob, duration_seconds, transcript, metadata) — genuinely language-specific, no generic equivalent | intake/languages.md:27-28,116-119 (LG6) | FACT | service | module-local (Languages Space) | Languages Space capability Block |
| LAN-14 | **A-B-A pronunciation comparison** — native-vs-self comparison via `compare_with_id` (record self, compare to native); the surviving irreducibly-linguistic capability Block | intake/languages.md:27-28,116-119 (LG6); spaces.md:119,158-159 | FACT | service | module-local (Languages Space capability Block — a "first Block") | Languages Space capability Block |
| LAN-15 | Recording audio blobs ride the **attachments/R2 pipeline** (Books photo/asset precedent) + encrypt (L2/L3, SP8 ZK invariant) | intake/languages.md:118-119 (LG6); spaces.md:136-138 (SP8) | FACT | service | shared (attachments/R2 ingestion ADR-014; extension-model guard) | ingestion / attachments pipeline (ROUTED) |
| LAN-16 | Recording↔session tie (a recording made *during* a practice session; bible_recording_id / song_recording_id on daily session) | intake/languages.md:24-25,119 (LG6) | INTERPRETATION | service | shared (Sessions) | Sessions + Languages extension |
| LAN-17 | **Proficiency derivation** — per-skill levels (listening/speaking/reading/writing/vocabulary/grammar + overall) DERIVED from practice minutes + vocab mastery (mirroring Purposes PG2 / derived-mastery) | intake/languages.md:56-59,121-125 (LG7) | INTERPRETATION | service | shared (measurement/derived-mastery — Purposes PG2, Knowledge KN-10) | measurement rollup engine (ROUTED) + Languages |
| LAN-18 | **CEFR self-assessment** — user CEFR target/self-rating (a1…c2/native) reconciled with derived signals (hybrid model); skill-taxonomy reconcile (v1 4-skill vs v2 6-skill) | intake/languages.md:56-57,121-125 (LG7) | INTERPRETATION | service | module-local (Languages Space) | Languages Space |
| LAN-19 | **Daily progress aggregation** — `language_daily_progress`: per-skill minutes + aggregates + `goal_met` flag computed per date | intake/languages.md:26 (daily_progress), :14-16 (goal/streak/count fields) | FACT (table) / INTERPRETATION (aggregation is a service op) | service | shared (measurement rollup; Journals summary provider) | measurement rollup / Languages provider |
| LAN-20 | **Streak computation** — language streak/goal/count fields (`goal/streak/count`, `current_day_number`) recomputed on practice completion | intake/languages.md:14-16,133-134 (LG9); spaces.md (streak family) | INTERPRETATION | service | shared (Gamification streak engine; contributors: habits, routines, check-ins) | Gamification/streak engine (ROUTED) |
| LAN-21 | **Video-playlist / watch-queue** CRUD (playlist_url, total_videos, watched_count, current_video_index) + `planned_videos` tracking — language-specific for now | intake/languages.md:35-36,127-129 (LG8) | FACT (fields) / INTERPRETATION (generic-vs-specific undecided) | service | module-local (revisit if generic media-queue emerges) | Languages Space |
| LAN-22 | **Journal contribution provider** — registers practice minutes / new words per date for the daily summary (Languages = a provider) | intake/languages.md:75,131-134 (LG9) | FACT | service | shared (Journals summary aggregation; contributors: tasks, habits, sessions, finance, relationships) | Journals summary provider (ROUTED) |
| LAN-23 | **`dueIn()` scheduled-practice provider** — exposes scheduled practice via `dueIn()` (→ Calendar / Journals agenda) | intake/languages.md:131-134 (LG9) | FACT | service | shared (Sessions `dueIn()` ADR-004; Global Calendar; contributors: sessions, tasks, relationships) | Sessions dueIn provider (ROUTED) |
| LAN-24 | **Gamification streak feed** — feeds streaks → Gamification | intake/languages.md:133-134 (LG9) | FACT | service | shared (Gamification; contributors: habits, routines, check-ins) | Gamification service (ROUTED) |
| LAN-25 | **Dictionary read model** — full dictionary view of all vocab (groupable / filterable) as a derived read model (generalizes v1 LanguageWithProgress/VocabularyWithLanguage views → a saved View) | intake/languages.md:66,136-138 (LG_notes); spaces.md:141,158 (SP9/SP3) | FACT | service (query/derive) + UI (view render) — SPLIT | shared (Views/saved-view primitive SP3; Notes list/gallery) | Saved View primitive (ROUTED) + Languages query |
| LAN-26 | **Language / vocabulary / recording standalone pages** — polymorphic `pages` via reserved `entity_type IN ('language','language_practice_session','language_recording')`; attached notes + shared scoped tags, no bespoke notes columns | intake/languages.md:37-38,136-138 (LG_notes) | FACT | service (page resolution) + UI (page render) — SPLIT | shared (Notes-and-Pages polymorphic pages; entity_tags) | Notes-and-Pages service (ROUTED) |
| LAN-27 | **Language (root) CRUD** — `languages` record: language_name, language_code(UNIQUE), flag_emoji, status, start_date, resources[E,JSON], vocabulary_count; a Space root (`#languages`⊃`#languages/spanish`) | intake/languages.md:14-16,12; spaces.md:12-13 | FACT | service | module-local → becomes a Space record (SP6/SP7) | Languages Space / Spaces service (ROUTED) |
| LAN-28 | **`vocabulary_count` maintenance** — count field on `languages` kept in sync as vocab is added/removed (a derived/denormalized counter) | intake/languages.md:14-16 (fields) | INTERPRETATION | service | module-local | Languages Space / Knowledge count |
| LAN-29 | **Starter Template** — a shipped "Languages" starter Template = Victor's method (Knowledge kinds + daily-practice Session template + Goal template + immersion Blocks); fork-on-instantiate (SP5) | spaces.md:119,122-124,158-160 (SP5/SP7); intake/languages.md:150-154 | FACT | service | shared (Templates primitive SP5 — contributors: health, skills, duties, routines) | Templates service (ROUTED) |
| LAN-30 | **Field-level encryption invariant** — encrypted fields ([E]) on vocab (word/translation/pronunciation/example/meaning/source_activity), recordings (title/audio_blob/transcript/metadata), practice content, weekly-plan reflections, base-words, video playlists honored by the service seam (validate→repo→encrypt-seam) | intake/languages.md:17-36 ([E] markers); services/languages/CLAUDE.md:11-13 | FACT | service | shared (encryption seam — all modules) | @vida/core encrypt seam (ROUTED) |

## Local flag index (§4a deferred + §4b live-intent) — every flag/verb → the item id that homes it
- `intended` (proof of intended depth, v1 Hub) → intake/languages.md:52 → context only (module dissolved; depth realized across LAN-01..LAN-29, no separate deferral) — NON-deferral sense ("intended depth"), no orphan.
- `derived` (Knowledge review_curves + derived mastery) → intake/languages.md:5 → LAN-02
- `streak/goal/count fields` → intake/languages.md:15 → LAN-20 (streak), LAN-19 (goal_met), LAN-28 (count)
- `derived mastery` (KN-8/KN-10 duplicate surface) → intake/languages.md:43 → LAN-02
- `derived read models` (v1 views) → intake/languages.md:66 → LAN-25
- `derived mastery` (engines Languages composes) → intake/languages.md:74 → LAN-02
- `provider` (Journals reads sessions; Languages = a provider) → intake/languages.md:75 → LAN-22
- `mastery derived (KN-10)` → intake/languages.md:92 → LAN-02
- `proficiency DERIVED / derived signals` → intake/languages.md:121,124-125 → LAN-17
- `provider registration` (LG9) → intake/languages.md:131 → LAN-22, LAN-23, LAN-24
- `derived progress` (Bucket-List accumulator, cross-ref for progression pattern) → spaces.md:196 → LAN-04 (base-words progression pattern echo)
- `progress readout` (Space progress) → spaces.md:194 → LAN-04, LAN-19
- BR/LG ids:
  - LG1 (composition reframe, DISSOLVED→Spaces) → intake/languages.md:82,90,98,148 → disposition note (header) + spread across LAN-01..LAN-29
  - LG2 (vocabulary Knowledge-object) → intake/languages.md:90,153 → LAN-01, LAN-02, LAN-04, LAN-05
  - LG3 (practice/daily → Session sub-types) → intake/languages.md:98 → LAN-06, LAN-07, LAN-08
  - LG4 (methodology fixed vs configurable) → intake/languages.md:104 → LAN-08, LAN-09
  - LG5 (weekly immersion plans) → intake/languages.md:110 → LAN-10, LAN-11, LAN-12
  - LG6 (recordings + pronunciation comparison) → intake/languages.md:116 → LAN-13, LAN-14, LAN-15, LAN-16
  - LG7 (proficiency derived vs self-assessed) → intake/languages.md:121 → LAN-17, LAN-18
  - LG8 (video playlists / watch queue) → intake/languages.md:127 → LAN-21
  - LG9 (integration / provider registration) → intake/languages.md:131,88 → LAN-22, LAN-23, LAN-24
  - LG_notes (standalone pages + dictionary view) → intake/languages.md:136 → LAN-25, LAN-26
  - KN-8 / KN-10 (Knowledge review engine — Languages composes) → intake/languages.md:6,43-44,74,92 → LAN-02, LAN-03 (ROUTED to Knowledge)
  - PG2 (derived-mastery mirror for proficiency) → intake/languages.md:124 → LAN-17
  - PG3 (generic review mechanism for reflections) → intake/languages.md:112 → LAN-11
  - SP5 (Templates) → spaces.md:121-124 → LAN-08, LAN-29
  - SP6/SP7 (Space entity + worked-example drop) → spaces.md:90-91,131-134 → LAN-27
  - SP8 (ZK / encrypt personalization) → spaces.md:136-138 → LAN-15, LAN-30
  - SP9 (dictionary = saved view; Space consumes dueIn + journal contributions) → spaces.md:140-143 → LAN-25, LAN-22, LAN-23
  - SP3 (saved views — dictionary/hub) → spaces.md:107-111,158 → LAN-25

## UNKNOWNs
- LG5 immersion **content** (songs/lyrics, Bible passages, videos): generic references/`entity_links` vs language-owned fields — undecided → intake/languages.md:113-114 → blocker: needs Victor intent (folded into Spaces design per :153); resolve-by P3 decomposition (Spaces worked-example). [LAN-12]
- LG5 weekly-plan **reflections**: fold into generic review mechanism (PG3) + Journals vs keep inline — undecided → intake/languages.md:110-114 → blocker: depends on Purposes generic-review seam design; resolve-by P2/P3. [LAN-11]
- LG7 **proficiency model**: derived vs self-assessed vs hybrid, and skill-taxonomy reconcile (4 vs 6 skills) — `[likely hybrid]` not confirmed → intake/languages.md:121-125 → blocker: needs Victor confirm + measurement-engine binding; resolve-by P2 (schema reconcile). [LAN-17, LAN-18]
- LG8 video-playlist: language-specific vs a generic cross-module "watch queue"/media-queue — `[likely language-specific for now]` → intake/languages.md:127-129 → blocker: no generic media-queue primitive exists yet; resolve-by P3. [LAN-21]
- Whole-module homing: as a DISSOLVED context, whether each surviving Languages capability is authored as a Spaces capability Block, a Sessions/Knowledge composition, or a Template preset is a P3 decomposition decision, not P1 — the aspect docs that would normally close these are 0-byte placeholders → intake/languages.md:148-154 + spaces.md SP7 → blocker: Spaces foundation must be decomposed first (execution ordering); resolve-by P3.
</content>
</invoke>
