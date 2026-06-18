<!-- Identity — features/preferences · /documentation Phase 2 · sources: ADR-002 §5.17 · life-os settings · docs/intake/preferences.md -->

# Identity — Preferences  (level: Feature)

**What it is.** The platform's **configuration provider** and the **owner of the Settings screen**. It stores
and serves all user-adjustable app configuration — appearance, locale, notifications, pomodoro defaults,
navigation, per-module visibility, and command-palette history — and exposes them as a complete, always-defined
settings object that every other module reads. `[FACT: ADR-002 §5.17; intake A]`

**The desire behind it.** A local-first, multi-device app needs one authoritative, synced place for "how I want
the app to behave," available instantly and offline, with no half-set state. v1 proved the pattern (merge-with-
defaults + debounced auto-save) worked; v2 keeps that and adds navigation customization and a command palette.
`[FACT: life-os settings API.md; INTENT: Victor 2026-06-18]`

**Scope — full v1 (NOT an MVP).** `[INTENT G4, G5, G6, G7]`
- Owns 3 tables: `user_preferences` (appearance · locale · dashboard · tasks · pomodoro · notifications · features),
  `nav_preferences` (dock + mobile nav), `command_bar_history` (Cmd+K palette frecency + pinning). `[FACT: ADR-002 §5.17]`
- Owns the **Settings screen**: tabbed + searchable (G7), with a global **Cmd+K command palette** (G6).
- Owns **per-module visibility** (show/hide each of the 17 modules in nav) and the `feature_gamification` flag — two distinct concerns (G5).

**What it is NOT.** `[INTENT G1, G2, G3]`
- **Not the account/auth owner.** Display name, password change, biometric, delete-account, log-out belong to the **Auth/Account** domain (SRP + encryption, ADR-001). Preferences *renders* these as Settings sections; it does not own their data.
- **Not the data import/export owner.** That is a **Data/Sync** surface, rendered in Settings, owned elsewhere.
- **Not user content.** All preference data is structural config — **plaintext, never `[E]`-encrypted** (it is not journal/note content). `[FACT: ADR-002 L1097-1101 "All P"]`
- **Not a social/profile system.** No `public_profile` / `show_activity` / `show_stats` — meaningless in single-user zero-knowledge v2 (dropped from v1).
- **Not an AI-config surface.** No `ai_suggestions` / `auto_categorization` / `smart_scheduling` for v1 — server inference violates ZK; any future AI must run on-device.

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
