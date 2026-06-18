# Intake: Preferences
<!-- /documentation Phase 1 (Intake). Harvest from 3 sources → gap map. No-Guessing: every claim cited. -->
Context: features/preferences (Wave 0 — foundational config provider; consumed by many modules)
Sources: v2 (ADR-002 §5.17, 3 tables) · v1 (life-os src/features/settings — substantial) · user intent (gap map)
Session: 2026-06-18 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)
**Data model — 3 tables, ALL plaintext (no `[E]`)** `[FACT: ADR-002 §5.17 L3474-3574; L1097-1101 "All P"]` — preferences are structural config, not user content.
- `user_preferences` (~single-row config): appearance (`theme` {light,dark,system}, `accent_color`), locale (`date_format`, `time_format` {12h,24h}, `week_starts_on` int, `currency`), `dashboard_layout` (JSON), tasks (`show_completed_tasks`, `default_task_priority`), pomodoro (`pomodoro_work_minutes`/`break`/`long_break`/`sessions_before_long`), notifications (`notification_email`/`push`/`in_app`, `quiet_hours_enabled`/`start`/`end`), per-module push (`push_habits`/`tasks`/`routines`/`contacts`/`study`), features (`feature_gamification`). `[FACT: ADR-002 L3479-3525]`
- `nav_preferences`: `dock_position` {bottom,left,right}, `dock_auto_hide`, `dock_size` {small,medium,large}, `mobile_nav_items` (JSON array of module keys), `show_labels`, `haptic_feedback`, `reduce_motion`. `[FACT: ADR-002 L3531-3552]`
- `command_bar_history`: `command_key` (UNIQUE), `command_label`, `command_category`, `use_count`, `last_used_at`, `is_pinned` — a command-palette frecency + pinning store. `[FACT: ADR-002 L3558-3573]`
- ⚠ **No `@vida/types` file exists** for preferences yet (no `preferences.ts`/entity). Types must be authored in the build phase from this schema. `[FACT: packages/types/src — no pref/setting/nav file]`

## B. WHAT v1 DID — life-os settings (legacy, for intent + lessons)
`[FACT: life-os src/features/settings/{API.md, hooks/usePreferences.ts, utils/settingsSearchIndex.ts, components/*}]`
- **State pattern (clean, worth keeping):** `usePreferences` (React Query, 10-min stale, syncs `theme` → Zustand `themeStore` on load) · `useMergedPreferences` (merges DB row with `DEFAULTS` → never undefined) · `useUpdatePreferences` (**debounced 500ms, optimistic, batched** auto-save).
- **Settings UI:** tabbed (`SettingsTabs`) + **searchable** (`settingsSearchIndex` — every setting has label/description/keywords) + sectioned cards.
- **Config fields (v1):** theme, **font_size**, **compact_mode**, date_format, time_format, first_day_of_week, currency, **number_format**, **default_dashboard_view**, show_completed, **show_archived**, email/push notifications, **notification_frequency**, quiet_hours.
- **Profile / account / security (bundled into "settings" in v1):** avatar upload, display name, timezone, password change, **biometric** settings, **data import/export**, **delete account**, log out.
- **Module management:** "Active Modules" — per-module enable toggles (Purpose / Projects / Tasks / Habits / Finances). Check-in templates section.
- **Social / privacy (v1):** public_profile, show_activity, show_stats.
- **AI (v1):** ai_suggestions, auto_categorization, smart_scheduling.

### Key v1→v2 deltas (what changed, why it matters)
1. v2 **adds** `nav_preferences` (dock + mobile nav customization) and `command_bar_history` (Cmd+K palette frecency/pinning) — **no v1 equivalent**. `[FACT: ADR-002 vs life-os]`
2. v2 **adds** per-module push toggles, pomodoro config in prefs, `feature_gamification`, `accent_color`. `[FACT: ADR-002]`
3. v1 **social/privacy** (`public_profile`/`show_activity`/`show_stats`) is **moot in v2** — single-user, zero-knowledge, no server profile to expose. `[INTERP: constitution ZK/single-user]`
4. v1 **AI** (`ai_suggestions`/`auto_categorization`/`smart_scheduling`) **conflicts with ZK** — no server-side AI permitted; any AI must run on-device. `[INTERP: ZK-1]`
5. v1 had config fields **absent from v2's ADR-002 schema**: font_size, compact_mode, number_format, default_dashboard_view, show_archived, notification_frequency. Keeping any = a schema addition. `[FACT: ADR-002 user_preferences omits these]`
6. v1 "settings" **bundled** profile/account/security/import-export; v2's ADR-002 prefs tables are **config-only** (no avatar/password/account fields). The module boundary changed. `[FACT: ADR-002 §5.17 has no profile/auth columns]`

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)
G1 — **Module boundary**: what belongs to **Preferences** vs **Account/Profile** (avatar, display name, password change, biometric, delete account, log out) vs **Data** (import/export)? v2's prefs tables are config-only — do profile/account/security live in a *separate* module/page, or does the Preferences feature own the whole "Settings" screen and just delegate?
G2 — **v1 social/privacy fields** (public_profile/show_activity/show_stats): drop entirely in v2 (single-user ZK)? (Assumed drop unless you want them.)
G3 — **v1 AI fields** (ai_suggestions/auto_categorization/smart_scheduling): drop, or keep **on-device only**? (ZK forbids server AI.)
G4 — **v1 extra config fields** (font_size, compact_mode, number_format, default_dashboard_view, show_archived, notification_frequency): add these to the v2 schema, or intentionally drop? (Each kept field = a schema/type addition.)
G5 — **Per-module enable/disable**: v1 had "Active Modules" toggles; v2 has only `feature_gamification`. Do you want a general per-module on/off system (tied to nav visibility), or just the gamification flag?
G6 — **Command palette** (`command_bar_history`): confirm it's a global Cmd+K palette with frecency (`use_count`/`last_used_at`) + pinning. Which actions populate it (navigation, entity creation, search)?
G7 — **Settings UX**: keep v1's **searchable + tabbed** settings screen for v2? (the `settingsSearchIndex` pattern.)
G8 — **State pattern**: confirm v2 keeps v1's merge-with-defaults + **debounced optimistic auto-save** (no explicit Save button), and theme→store sync.

## Resolution `[INTENT: Victor, 2026-06-18]`

> **SCOPE:** complete v1 (not MVP). Preferences owns the **Settings screen** but delegates account/security/data.

**G1 — Module boundary.** The **Preferences feature owns the Settings screen** (single destination) but **delegates data ownership**:
- Account/Security (display name, password change, biometric, delete account, log out) → **Auth/Account domain** (SRP + encryption, separate per ADR-001). Preferences *renders* these sections, does not own their data.
- Data import/export → **Data/Sync** surface. Rendered in Settings, owned elsewhere.
- Preferences owns only: `user_preferences`, `nav_preferences`, `command_bar_history`. Cross-domain access via documented integration points (§6). `[INTENT G1]`

**G2 — Social/privacy fields DROPPED.** `public_profile`, `show_activity`, `show_stats` removed — meaningless in single-user zero-knowledge v2. `[INTENT G2; INTERP ZK/single-user]`

**G3 — AI fields DROPPED for v1.** `ai_suggestions`, `auto_categorization`, `smart_scheduling` removed — imply server inference (ZK forbids). Any future AI must be on-device. `[INTENT G3; INTERP ZK-1]`

**G4 — KEEP ALL config fields (full superset).** Every field in the intake inventory stays, including the v1 additions:
- ADD to schema: `font_size`, `compact_mode`, `number_format`, `default_dashboard_view`, `show_archived`, `notification_frequency`, plus a **per-module visibility** store (G5).
- `feature_gamification` retained.
- ⚠ **FLAGGED DELTA (rule 8):** ADR-002 `user_preferences` does NOT contain the 6 added fields or the visibility store, and **no `@vida/types` preferences file exists**. The aspect docs record the **target** schema; authoring the columns + types is a build-phase change → **candidate ADR-002 amendment**. Fields not in ADR-002 are labelled ⚠ INTENDED. `[INTENT G4; FACT: ADR-002 §5.17]`
- Note: `notification_frequency` overlaps quiet-hours + per-module push (kept per "keep all"; treat as digest cadence).

**G5 — Per-module system + gamification flag (both, distinct concerns).**
- **Per-module visibility**: each of the 17 modules can be shown/hidden, driving nav. Stored as a JSON map (`module_key → bool`) on `user_preferences` (or dedicated store) — ⚠ INTENDED, build-phase structure decision.
- `feature_gamification` is **separate**: it functionally enables XP/achievement tracking (the gamification module reads it), independent of whether the module is *visible*. Both retained. `[INTENT G5]`

**G6 — Command palette confirmed.** `command_bar_history` backs a global **Cmd+K palette** with frecency (`use_count`/`last_used_at`) + pinning (`is_pinned`). Populated by navigation targets, entity-creation actions, and search; pinned first, then frecency-ranked. `[INTENT G6; FACT: ADR-002 L3558-3573]`

**G7 — Settings UX = Option A (tabbed + searchable), flexible grouping.** Base pattern is tabbed categories + a search box over all settings (`settingsSearchIndex`). **Not every category must be a top-level tab** — some may be sections/cards within a tab or nested. Pairs with the G6 Cmd+K palette. `[INTENT G7]`

**G8 — State pattern (keep all three).** `[INTENT G8; FACT: life-os usePreferences/useMergedPreferences/useUpdatePreferences]`
1. **Merge-with-defaults** — overlay DB row on a complete `DEFAULTS` object; consumers never see `undefined`.
2. **Debounced optimistic auto-save** — no Save button; UI updates instantly, writes batched 500ms after the last change.
3. **Theme→store sync** — theme pushed into a Zustand store on load so the whole UI repaints instantly.

### Intake status: ✅ WHOLE. Open carry-forwards:
1. **Schema/type catch-up** — 6 new `user_preferences` fields + per-module visibility store + the entire `@vida/types` preferences definition (candidate ADR-002 amendment, build phase).
2. **Per-module visibility storage shape** — JSON-on-user_preferences vs dedicated store (build-phase decision).

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-18 | documentation-blueprint | intake harvested (v2 ADR-002 §5.17 + v1 life-os settings); gap map G1–G8 raised |
| 2026-06-18 | documentation-blueprint | gaps resolved (Victor); G1 boundary set, G2/G3 dropped, G4 keep-all (superset flagged), G5 dual system, G7 Option A, G8 keep pattern; intake WHOLE |
