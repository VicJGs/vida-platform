<!-- Conventions — features/check-ins · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · intake -->

# Conventions — Check-ins  (level: Feature)

## How to build here
- **One check-in per (date, type).** Key/upsert on (`check_in_date`, `check_in_type`) — never on date alone
  (CK-2, the schema bug to fix). `[INTENT G2]`
- **Default-template-first.** Seed a default template per check_in_type so a user can check in with zero setup;
  only build a custom template when he personalizes (CK-3/CK-4). `[INTENT G3]`
- **Columns are the default template; `custom_data` is for extras.** Write the standard fields to their columns
  (queryable, trendable); store only *additional* template answers in `custom_data` JSON — never duplicate a
  standard field there (CK-4/CK-5). `[INTENT G5]`
- **Reviews read other modules through integration points.** weekly/monthly/yearly reviews aggregate
  Purpose/Project/Task progress via documented APIs, never direct table reads; degrade to free reflection if a
  module isn't available (CK-6, §6). `[INTENT G7]`
- **Feed the Journal, link don't copy.** On save, link the check-in to its day's Journal `pages` row via
  `entity_links` (`entity_type='daily_check_in'`); reviews backlink reviewed entities. The Journal reads from the
  check-in, it isn't a second copy (CK-7). `[FACT: ADR-002 L1350; INTENT G10]`
- **Schedule via the template, fire via Preferences + Notifications.** Per-type/per-template `preferred_time` +
  `schedule_days`, editable in the template's standalone editor; reminders go through Preferences + Notifications
  (CK-8). `[INTENT G8]`
- **Keep scales plaintext, reflection encrypted.** mood_score/energy_level stay plaintext (trend charts);
  everything user-written is `[E]` (CK-1). `[FACT: L970-997]`
- **Links, not tags.** Check-ins carry no tag vocabulary — an SP1-consistent opt-out from `entity_tags` (no bespoke
  store); relationships are `entity_links` (SP4, tags≠links; CK-9). `[INTENT G10; ADR-006 SP1/SP4]`
- **Emit, don't write, the economy.** On completion, **emit** `grant_currency(XP)` (E2) → Gamification applies →
  `consequence_ledger` (E3); **never write XP or `check_in_streak*` onto `user_profile`** — check-ins owns its streak
  derived from `daily_check_ins` (E9). `[INTENT; ADR-012 E2/E3/E9]`

## Naming & layout
- Enum values (canonical, SQL CHECK + to-build Zod in `@vida/core`): `check_in_type` (current
  morning/evening/weekly_review → ⚠ + afternoon/monthly_review/yearly_review), `field_type`
  (mood_scale/energy_scale/text_list/text_area/rating/boolean), `schedule_type`(daily/weekly/custom),
  `preferred_time`(morning/afternoon/evening/anytime). `[FACT: ADR-002 §5.13; INTENT G3]`
- Template question identity is `field_key` (UNIQUE per template); `custom_data` JSON is keyed by it. `[FACT: L3264,3282]`
- Platform-wide: UUIDv7 TEXT PKs, Unix-ms timestamps, booleans `0/1`, JSON as TEXT, dates `YYYY-MM-DD`
  (`check_in_date`), `_sync_*`. `[FACT: CLAUDE.md Conventions; docs/core/conventions.md]`

## Local landmines / "never do"
- **Never** key a check-in on date alone — multiple types per day are required (CK-2). `[INTENT G2]`
- **Never** duplicate a standard field inside `custom_data` (CK-4). `[INTENT G5]`
- **Never** read Purpose/Projects/Tasks tables directly for a review — integration points only (CK-6, §6). `[INTENT G7]`
- **Never** store mood/energy encrypted — they must be plaintext for trends (CK-1). `[FACT: L979]`
- **Never** add a tag vocabulary to check-ins — the SP1-consistent opt-out; use `entity_links` (SP4), not
  `entity_tags` (CK-9). `[INTENT G10; ADR-006 SP1/SP4]`
- **Never** write XP or `check_in_streak*` onto `user_profile` from check-ins — emit `grant_currency(XP)` (E2,
  Gamification applies → `consequence_ledger` E3); check-ins owns its streak derived from `daily_check_ins` (E9).
  `[INTENT; ADR-012 E2/E9]`
- **Never** let the Journal hold a second copy of check-in answers — link, don't copy (CK-7). `[INTENT G10]`

## Completion checklist
- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
