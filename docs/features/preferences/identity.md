<!-- Identity — features/preferences · /documentation Phase 2 (realigned Part 1.2) · sources: ADR-002 §5.17 · ADR-012 §3.10 (E9) · ADR-013 §3.2/§3.4 (N6/N7) · ADR-014 §3.2 (Layer-3) · life-os settings · docs/intake/preferences.md -->

# Identity — Preferences (level: Feature)

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
- Owns **per-module visibility** (show/hide each module in nav) and the `feature_gamification` flag — two distinct concerns (G5).
- **[Substrate receipt — ADR-012 §3.10, E9]** Owns the config half of the `user_profile` **single-writer split**: `persona` · `motivation_style` · `active_modules` · `onboarding_*` (migrated off the overloaded `user_profile`; System keeps per-currency total+level, `check_in_streak*` → Check-ins). Plaintext config (PR-1 holds). `[INTENT: ADR-012 §3.10; GM-12]`
- **[Substrate receipt — ADR-014 §3.2, Layer 3]** Owns the **user-managed integration surface** — a self-service webhooks + external-API management layer (Notion-style) with Vida **cookbooks** — where the user wires their own connectors _inside_ the ADR-014 guard. Preferences owns the **management surface**; the device-mediated fetch/parse/encrypt/egress + credential custody stay ADR-014's (delegated, like Account/Data — PR-8). `[INTENT: ADR-014 §3.2/§3.4]`

**What it is NOT.** `[INTENT G1, G2, G3]`

- **Not the account/auth owner.** Display name, password change, biometric, delete-account, log-out belong to the **Auth/Account** domain (SRP + encryption, ADR-001). Preferences _renders_ these as Settings sections; it does not own their data.
- **Not the data import/export owner.** That is a **Data/Sync** surface, rendered in Settings, owned elsewhere.
- **Not user content.** All preference data is structural config — **plaintext, never `[E]`-encrypted** (it is not journal/note content). `[FACT: ADR-002 L1097-1101 "All P"]`
- **Not a social/profile system.** No `public_profile` / `show_activity` / `show_stats` — meaningless in single-user zero-knowledge v2 (dropped from v1).
- **Not the PII owner.** The `user_profile` split routes only config here; **PII (`display_name` / `avatar_url` / `birth_date`) STAYS in `user_profile` ⚠** (no account/identity entity exists yet to receive it, ADR-012 §3.10). Preferences receives config, never PII — and never the sibling `[E]` fields (`focus_areas` etc.). `[FACT: ADR-012 §3.10]`
- **Not the AI-config surface.** No server inference (ZK-1); the AI model layer is `ai_connections` (**ADR-015**), a **separate** management page. The integration surface Preferences DOES own (ADR-014 Layer 3) is _data ingestion_, not model config — ADR-014 X11 splits LLM calls out to ADR-015. `[FACT: ADR-014 §3.2 L62; ADR-015 AI2]`

## Completion checklist

- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
