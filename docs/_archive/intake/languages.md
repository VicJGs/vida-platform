# Intake — languages  (level: 3 — Higher-order; EXECUTION #1, Wave 3)

> Fill order: first context of the re-sequenced remaining set (2026-07-13). Languages **hard-depends on Learning**
> — but in Wave 2 the shared "Learning infrastructure" it depended on was extracted into **generic foundations**:
> Sessions & Scheduling (ADR-004 session supertype) ✅, Knowledge (generic study_methods/review_curves + derived
> mastery, KN-10) ✅, Flashcards (study-method service, ADR-005) ✅. So the central intake question is a
> **composition reframe**, not a from-scratch spec. `[FACT: module-dependency-graph.md L178, L298; Knowledge
> identity.md L32/L58 names "Languages" a future consumer compound set]`

## Current (enforced reality — authoritative source)

**9 tables, schema-only (0 service logic).** `[FACT: ADR-002 §5.12 L2887-2990; field tables L842-966]`

- **`languages`** — `language_name · language_code(UNIQUE) · flag_emoji · proficiency levels · status · start_date ·
  goal/streak/count fields · current_day_number · learning_phase · phase_started_at · resources[E,JSON] ·
  vocabulary_count`. `[FACT: ADR-002 L2890-2911; fields L844-858]`
- **`language_practice_sessions`** — `language_id · skill_type(listening|speaking|reading|writing|vocabulary|
  grammar) · activity_type · duration_minutes · new_words_learned · accuracy_percentage · focus_rating ·
  energy_level · content[E]`. `[FACT: ADR-002 L2934-2961; fields L860-870]`
- **`language_vocabulary`** — `word[E] · translation[E] · pronunciation[E] · part_of_speech · example_sentence[E]
  · meaning_in_target_language[E] · source_activity[E] · **mastery · review_count · next_review_date** (its own
  SRS)`. `[FACT: ADR-002 §"Vocabulary (with SRS)" L2964-2975; fields L872-888]`
- **`language_daily_sessions`** — `language_id · weekly_plan_id · session_date · day_number · weekly_topic ·
  completion flags (grammar_video … vocabulary_journal) · *_video_url[E] · song_day_number · bible_recording_id ·
  song_recording_id`. A **structured daily-practice wizard**. `[FACT: fields L890-903]`
- **`language_daily_progress`** — all-P per-skill minutes + aggregates + `goal_met`. `[FACT: L905]`
- **`language_recordings`** — `recording_type · title[E] · audio_blob[E] · duration_seconds · transcript[E] ·
  metadata[E] · **compare_with_id** (native-vs-self comparison)`. `[FACT: fields L907-919]`
- **`language_weekly_plans`** — `week_start_date · topic · **song**_title/artist/url/lyrics + current_song_day ·
  **bible**_book/chapter/verses · planned_videos[E] · videos_watched/days_completed · weekly_reflection[E] ·
  highlight_moments[E] · challenges_faced[E]`. Rich personal immersion plan. `[FACT: fields L921-940]`
- **`language_base_words`** — `category · english_word[E] · translation[E] · meaning_in_target_language[E] ·
  pronunciation[E] · is_learned · learned_at · display_order · **linked_vocabulary_id**`. A curated foundational
  word set. `[FACT: fields L942-956]`
- **`language_video_playlists`** — `playlist_url[E] · title[E] · total_videos · watched_count ·
  current_video_index`. `[FACT: fields L958-966]`
- **Polymorphic pages reserve** `entity_type IN ('language','language_practice_session','language_recording')`.
  `[FACT: ADR-002 L1348]`

## Redundancy against Wave-2 generic foundations (the reframe surface)

- `language_vocabulary`'s **`mastery` / `review_count` / `next_review_date`** duplicate Knowledge's generic
  **study_methods + review_curves + review_events + derived mastery** (SM-2 = one preset; KN-8/KN-10). `[FACT:
  knowledge/business-rules.md KN-8/KN-10; ADR-005]`
- `language_practice_sessions` + `language_daily_sessions` duplicate the **Session supertype** (ADR-004) — which
  already anticipates `practice` / `daily` sub-types. `[FACT: ADR-004; sessions identity.md]`
- v1 practice `activity_type` even includes a literal **`flashcards`** value → now the Knowledge Flashcards
  service (ADR-005). `[FACT: ../life-os languages.ts PracticeActivityType]`

## Legacy (life-os v1 — the "desire", context only)

v1's "Language Hub" is a **large, opinionated, working personal system** — proof of intended depth (9 API
modules, 30 components, 9 pages incl. LanguageHubPage · DailyPracticePage · VocabularyPage · BaseWordsPage ·
WeeklyPlanningPage · MonthlyReviewPage · PracticeHistoryPage). `[FACT: ../life-os/src/features/languages/]`

- **Methodology is the core**: CEFR `target_proficiency` (a1…c2/native), per-skill levels
  (listening/speaking/writing/vocabulary + overall), **phases** (BeginnerPhaseBadge, PhaseRoadmap,
  `current_day_number`, `learning_phase`), **daily practice wizard** (ActivityStep · VideoActivityStep ·
  MusicActivityStep · BibleActivityStep · VocabularyJournalStep), **ProficiencyRadar**, **StreakDisplay**.
  `[FACT: components/]`
- **Immersion content is personal**: WeeklySongTracker (song + lyrics + per-day), Bible passages, PlaylistManager
  (video immersion), AbaComparisonPlayer + AudioRecorder (record self, A-B-A compare to native). `[FACT:
  components/ + languages.ts weekly plan]`
- v1 vocab was richer: `example_translation · context_notes · category · tags[] · times_correct · audio_url ·
  image_url` (v2 dropped several). `[FACT: languages.ts LanguageVocabulary]`
- v1 had **views** (LanguageWithProgress, VocabularyWithLanguage, WeeklyLanguagePractice) — derived read models.
- No v2 `packages/types` language file exists yet (types live only in ADR-002 + v1). `[FACT: ls types/src | grep
  lang = empty]`

## Existing docs incorporated (D5b — do NOT duplicate/contradict)
- **Knowledge** identity already lists **Languages as a future "consumer compound set"** of its engine → the
  boundary is half pre-decided from Knowledge's side. `[FACT: knowledge/identity.md L58]`
- **ADR-004 Sessions** (session supertype + sub-types + `dueIn()`), **ADR-005 Flashcards/study-method service**,
  **Knowledge KN-8/KN-10** (generic curves + derived mastery) — the engines Languages composes.
- **Journals** reads study/practice sessions for the daily summary (Languages = a provider). `[FACT: journals]`

## GAP MAP (what the code cannot answer — for Victor, ONE batch)

`[likely …]` = my read of the evidence (needs your yes/no); the rest need your intent. The whole Wave-2 direction
+ Knowledge's own docs point hard at composition (B) over a standalone island (A).

- [ ] **LG1 — Scope & altitude / the composition reframe (THE central decision).** Is Languages **(A)** its own
      module with its own vocabulary-SRS + session tables (as v2 shipped), or **(B)** a **language-specialized
      partition that COMPOSES the generic foundations** — vocabulary → Knowledge objects + generic review engine;
      practice/daily → Session sub-types (ADR-004); flashcards → Knowledge service (ADR-005) — and **owns only the
      language-specific methodology layer** (phases, daily wizard, weekly immersion plans, recordings, base
      words)? `[likely B — consistent with Books' Education-partition, Flashcards' collapse, and Knowledge already
      naming Languages a consumer compound set]`. Sets the ceiling for LG2-LG9.

- [ ] **LG2 — Vocabulary: Knowledge object vs standalone table.** If LG1=B: retire `language_vocabulary`'s SRS
      columns (`mastery/review_count/next_review_date`) → a vocab word becomes a **Knowledge object** (kind =
      `word`/`vocabulary`) reviewed by the generic engine, mastery **derived** (KN-10), keeping the
      language-specific fields (pronunciation · part_of_speech · example_sentence + translation ·
      meaning_in_target_language). Restore v1's dropped `example_translation · context_notes · audio_url ·
      image_url`? And how do **base_words** relate — a curated "foundational N words" subset of vocabulary
      (`linked_vocabulary_id`), or their own thing?

- [ ] **LG3 — Practice & daily sessions: Session sub-types vs bespoke tables.** If LG1=B: `practice` and `daily`
      become **ADR-004 Session sub-types** with a language extension table (skill_type, activity_type,
      new_words_learned, accuracy). The **daily wizard's structured steps** (grammar video · vocabulary ·
      conversation · song · Bible · vocab-journal completion flags) — is that the language sub-type's fixed
      extension, or a **configurable session template** (Sessions restored rich templates, G6)?

- [ ] **LG4 — The daily/phased methodology: fixed vs user-configurable.** v1 hard-codes a phased beginner→advanced
      roadmap + weekly topic rotation + a specific daily activity set. Is this **your fixed personal system**, or a
      **user-configurable practice framework** (pluggable phases/activities, like Knowledge's pluggable methods)?
      `[likely: configurable framework shipped pre-configured with your system as the default — matches the
      "ship fully-configured, edit discouraged" pattern from Sessions/Flashcards]`.

- [ ] **LG5 — Weekly immersion plans (songs · Bible · videos · reflection).** Keep `language_weekly_plans` as a
      language-specific **weekly immersion plan**? Its `weekly_reflection / highlight_moments / challenges_faced`
      overlap the **generic review mechanism** (surfaced by Purposes PG3) + Journals — fold reflections into that
      generic seam, or keep inline? And the **content** (songs/lyrics, Bible passages, videos) — generic
      references/`entity_links`, or language-owned fields?

- [ ] **LG6 — Recordings & pronunciation comparison `[likely KEEP language-owned]`.** `language_recordings`
      (audio_blob · transcript · `compare_with_id` A-B-A native-vs-self) is genuinely language-specific and has no
      generic equivalent. Confirm it stays a Languages-owned capability; audio blobs ride the **attachments/R2**
      pipeline (Books photo/asset precedent). Ties to Sessions (a recording made *during* a practice session).

- [ ] **LG7 — Proficiency & skill model: derived vs self-assessed.** `languages` carries per-skill levels
      (listening/speaking/writing/vocabulary + overall) + CEFR target + streaks + goals + phase counters.
      Reconcile the **skill taxonomy** (v1 = 4 skills; v2 practice_sessions = 6, adds reading+grammar). Is
      proficiency **DERIVED** (from practice minutes + vocab mastery, mirroring Purposes PG2 / derived-mastery) or
      **self-assessed / CEFR-milestone**? `[likely: hybrid — derived signals + user CEFR self-rating]`.

- [ ] **LG8 — Immersion content tracking (video playlists / watch queue).** `language_video_playlists` +
      `planned_videos` track immersion watching. Generic (a Knowledge reference / cross-module "watch queue") or
      language-specific? `[likely: language-specific for now; revisit if a generic media-queue emerges]`.

- [ ] **LG9 — Integration / provider registration `[likely CONFIRM]`.** Languages **registers a journal
      contribution** (practice minutes/new words per date), emits **`review_events`** for vocab (→ Knowledge
      mastery), exposes scheduled practice via **`dueIn()`** (→ Calendar/Journals agenda), and feeds streaks →
      **Gamification**. Confirm it composes the generic seams rather than islanding.

- [ ] **LG_notes `[likely CONFIRM]`.** Language / vocabulary / recording get **standalone pages** (entity_type
      reserved) — LanguageHubPage + full **dictionary view** of all vocab (groupable/filterable) — with attached
      notes + shared scoped tags; no bespoke notes columns.

### Not-blocking (resolved during Transform unless flagged)
- Terminal states per capability (loading/empty/error/success) — enumerated in the contract.
- **ADR-002 amendment slice** (retire vocab-SRS cols + practice/daily tables → generic engines; new language
  extension tables) folds into the standing amendment.
- No v2 `@vida/types/language.ts` exists yet → structure-data doc defines it fresh.
- Any surfaced decision (e.g. "language as Knowledge compound set" formalization) → `/adr-new` at Accept.

---
**STATUS: DISSOLVED into Spaces 2026-07-13 — NOT a standalone module.** LG1 resolved (Victor): taken to its
conclusion, "Languages" is a **configuration of generic seams**, not a module — a **Space** (universal tag + saved
views + composed capability Blocks + a starter Template), with only 1–2 irreducibly-linguistic capabilities (A-B-A
pronunciation comparison) surviving as **capability Blocks**. → This intake is **preserved as the source for the
Languages worked-example** inside the **Spaces** foundation effort (`docs/intake/spaces.md`, SP7; requirements
accumulator). It is documented WHEN Spaces is resolved (execution #8), not as its own module. LG2-LG9 fold into
the Spaces design (vocab→Knowledge, practice→Sessions, drills→Flashcards, methodology→Template + Blocks).
