---
Session 1 — 2026-08-19
Goal: DB-4 — run the 5-phase lifecycle for domain group #2 (Preferences) to completion.
Profile: Add Backend Component (scenario: schema-foundation build — 5-phase lifecycle)
---

## Accomplished
- **Group #2 Preferences — full 5-phase lifecycle DONE** (branch `db-4-per-domain-schema`, NOT committed).
- **Authored 3 tables, ALL plaintext (ZERO `[E]`, PR-1)** — `schema/preferences.ts` + `migrations/013_preferences.ts`
  (`user_preferences` singleton · `nav_preferences` singleton · `command_bar_history` many) + barrel + runner +
  5 enum-parity rows + ADR-002 §5.17/§5.20 amendment + §XXIX docs. `@vida/core` **198 green** · typecheck 11/11 ·
  lint 0-err · `LATEST_VERSION`=13. Spec `docs/specs/foundation/db-4-preferences/`.
- **P1 intent intake** — read the full 5-aspect feature spec + `entities/user.ts` + ADR-002 §5.17/§5.20 + ADR-012 §3.10.
  **Key finding:** the feature-doc's "no `@vida/types` preferences file exists" is STALE — the tuples
  (THEME/TIME_FORMAT/DOCK_POSITION/DOCK_SIZE/PERSONA) + interfaces already exist → FACT floor is a clean mirror.
- **First group to AUTHOR build-phase intent, not defer it:** 5 FIXED CHECK enums; G4 six columns; PB-2
  `module_visibility` (JSON); **E9 `user_profile` split** (`persona`[CHECK]/`motivation_style`/`active_modules`/
  `onboarding_completed` → Preferences single-writer owner, ADR-012 §3.10) authored on `user_preferences`.
  `font_size`/`notification_frequency` = OPEN plain TEXT no-CHECK (vocab undefined — No-Guessing).
- **§XXVI double-gate:** gate-1 REVISE (1 material: `json<T>()`→plain `text()`, the live convention; +6 minor) → fixed →
  Approval 1 · preflight PASSED (fixed §XXIX doc-path `docs/infrastructure/…` not `docs/core/…`) · gate-2 SHIP → Approval 2.
- **P5 post-impl critique REVISE→SHIP:** caught `time_format` NOT NULL type-lie (mirror + interface non-null, SQL/§5.17
  nullable — a §5.17 gap a CHECK-only parity test is structurally blind to) → added NOT NULL to migration + §5.17.
  Foundation-readiness MOD-preferences (#32) contract — every column authored — PASS.

## Decisions Made (all P3, grounded in cited intent — resolved at the gate, not guessed)
- **E9 storage:** the 4 routed fields authored as columns on `user_preferences` (its single-writer home), NOT a
  satellite table (single-user + no-FK → a 2nd singleton buys nothing). persona → CHECK from PERSONA tuple.
- **module_visibility:** a JSON `text()` column on `user_preferences` (not a table); kept distinct from `active_modules`
  / `feature_gamification` (documented in the schema header, PR-7).
- **G4:** 4 clear columns (2 bool + 2 TEXT); `font_size`/`notification_frequency` OPEN plain TEXT (vocab undefined).
- **`time_format` NOT NULL** = a §5.17 gap-fix (interface + sibling FIXED enums are non-null), same class as N-R2.

## ⚠ Drift Victor caught + corrected (this session)
- I first recommended a **strict FACT-floor mirror + DEFER** of G4/E9/visibility (treating their `⚠ INTENDED` /
  `[DEFERRED — build phase]` flags as later-issue deferrals). Victor: "both are important since we are in the build
  phase … you read and interpret the documentation based on what we are doing." The flags are forward-pointers TO the
  build phase; DB-4 IS the build phase → author now.
- Memory saved: **[[build-phase-flags-mean-resolve-now-not-defer]]**. Only a genuine domain-ownership boundary
  (ADR-014 Layer-3 integration tables, `connection_config` is `[E]`) keeps an item out — a boundary, not a time-defer.

## ⚠ Cross-group constraint (record for group ~#19 Gamification)
`user_profile`, when authored, MUST omit `persona`/`motivation_style`/`active_modules`/`onboarding_completed` (now
Preferences-owned) + `check_in_streak*` (→ Check-ins). It keeps PII (`[E]`) + `focus_areas[E]` + `life_stage` +
`skipped_modules` + `timezone` + derived counters. No field with two writers. ⚠ `conventions.md:27` mislabels
`life_stage`/`timezone`/`skipped_modules` as `[E]` — only `focus_areas` is (§5.15 L3376); do not propagate.

## Next session
- **FIRST ACTION: open domain group `#3 Sessions & Scheduling (+Pomodoro)`, Phase 1 intent intake** — FRESH
  clean-context session. Sources: `docs/features/sessions-and-scheduling/` + `pomodoro/`. Group #3 authors the session
  sub-type 1:1 extensions DEFERRED from DB-3 (`focus_sessions` incl. the pomodoro re-home, BR-DB3-3).
- **Mirror groups #1/#2 as the pattern:** `schema/{notes,preferences}.ts` + `migrations/012_notes.ts`/`013_preferences.ts`.
- Reload: task "## P0 Output" (22-group table) · flow doc §2 · memories [[build-phase-flags-mean-resolve-now-not-defer]] ·
  [[stale-source-plus-live-convention-is-fact-not-a-decision]] · [[open-vocab-columns-take-no-sql-check]].
- **2 of 22 groups done; 20 remain.** DB-4 authors ALL 22 (M1.0) before M1.1 opens (Model B).
  ⚠ CI red repo-wide (known pnpm infra; local green).

## Post-completion (same session)
- **Group #2 COMMITTED** — `0bc1508` (`feat(db-4): author Preferences schema (group #2)`), 13 files +820, gitleaks clean.
- **Group #1 oversight gate (Victor-requested) — CLEAN.** An independent critic introspected `012_notes.ts` with
  in-memory `PRAGMA table_info` and diffed all 3 tables (pages/page_links/note_attachments) across SQL ↔ Drizzle mirror
  ↔ `@vida/types` for the `time_format` bug class → **no nullability/default/column/type drift**; the only divergences
  are the known DB-11-deferred interface items. The type-lie was group-#2-specific (a §5.17 ADR oversight), not systemic.
- **Flow-doc P5 hardened** — added a MANDATORY "DDL-introspection parity check" step to
  `docs/roadmap/schema-foundation-build-flow.md §Phase 5` (PRAGMA table_info diff vs mirror + interface on
  nullability/default/column-set/type). Committed `65b3939`. Every remaining DB-4 group runs it.
