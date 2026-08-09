# Command Bar & Search

The `⌘K` global launcher + search interaction model. **Owning issue:** UX-2 (LIF-91), the experience-track sibling
of [information-architecture.md](information-architecture.md). This doc defines the *interaction model*; the
*rendering* is UI-4, the *recency store* is Preferences (MOD-prefs), the *search index* is DB-8. UX-2 designs the
seams to those; it does not build them.

> Where this doc and an ADR disagree, the ADR governs. The declarative contract is code at
> `apps/web/src/command-bar/` (+ the ephemeral store at `apps/web/src/stores/command-bar-ui-store.ts`).

## 1. What it is
A single always-available overlay, opened with **`⌘K` (mac) / `Ctrl+K` (win-linux)**, that lets the user **jump
anywhere** (navigation) and **do anything** (actions), and **search** across their data — keyboard-first, from any
screen. In the IA it is the *"Search (⌘K) | overlay | Preferences"* surface (information-architecture.md:104).

**What it is NOT:** not the rendered component / modal host (UI-4); not the shell layout (UX-3); not the
`command_bar_history` table (MOD-prefs, M1.1); not the FTS5 index or search population (DB-8, M1.4); not per-module
action commands (each module contributes at M1.1+); not client-state conventions (UX-4).

## 2. The overlay — two modes
One overlay with two modes, switched by the query:
- **Command mode** (default, empty query): a ranked list of **actions** + **navigation targets**.
- **Search mode** (non-empty query): **entity search results**, grouped by type.

The mode transition is automatic: typing enters Search mode; clearing the query returns to Command mode
(`command-bar-ui-store.setQuery`). Open/query/mode is **ephemeral UI state** (Zustand, never persisted, never
entity data — the AR-4 `app-shell-ui-store` pattern, BR-RT-6).

## 3. Keyboard grammar & focus contract
- **Open:** `⌘K`/`Ctrl+K`, always `preventDefault` (avoid browser-native collisions). The binding is **data**
  (`resolveKeybind(platform)` → `CommandKeybind`), resolved by platform, not hardcoded in the render host.
- **Within:** `↑/↓` move (wrapping), type-ahead filters, `Enter` executes the active item, `Esc` closes.
- **Focus contract (UX-2 owns it, UI-4 honors it):** on open, focus moves **into** the overlay's input; on close,
  focus **restores to the triggering element**; the active item shows a visible focus ring.
  `[standards/engineering.md §XIV; standards/components.md §VIII]`
- **Non-keyboard open:** a tap/click affordance (search icon) is **reserved for UI-4 + mobile/Tauri**, where there
  is no hardware `⌘K`. The model does not assume a keyboard is always present.

## 4. The command model — frecency + pinning
A command is `{ id, label, category, run(ctx) }`. Displayed order is **frecency** (recency × frequency) with
**pinned commands first** — derived from the recency store's shape (the v1 `command_bar_history` columns:
`command_key` · `command_label` · `command_category` · `use_count` · `last_used_at` · `is_pinned`), which UX-2
re-affirms as the v2 MOD-prefs target shape. Ranking is a pure function (`rankByFrecency`, `now` injected); the
store that persists history is MOD-prefs' to build (seam).

### Command sources (providers)
Commands come from typed **providers**, never a hardcoded master list:
- **Navigation commands are derived** from the UX-1 nav map (`nav/module-map.ts`) — one "Go to X" per navigable
  surface (non-null `routePath`), deduped by route. Zero new inventory. `visibleWhen` (e.g. gamification) rides the
  command so the host filters by feature flag. Routes are UX-facing (relationships → `/people`).
- **Action commands** are contributed by modules at M1.1+ through the `CommandProvider` seam. UX-2 ships a minimal
  seed from **already-built shell state only** — "Toggle sidebar". (No theme toggle — no theme store exists yet.)

### Run-dispatch rule
Navigation commands act via an injected `CommandRunContext.navigate` (the router is UI-4-injected, unavailable at
registry-build time); action commands call the global Zustand store directly. The asymmetry is intentional —
router = host-injected, store = global singleton.

## 5. Search-as-you-type
On a non-empty query, Search mode requests results from a `SearchProvider` and renders them **grouped by entity
type**, keyboard-navigable, each result carrying `{ id, entityType, title, routePath }` — selecting one navigates.
UX-2 defines the **result contract and the states**; the **ranking/index is DB-8's**.

### Terminal states (all explicit, fail-loud)
`idle` (blank) · `typing` · `loading` · `results` · `empty` (query, no matches) · **`search-unavailable`** (FTS5
not yet built — a loud, explicit state with a message, never a silent blank) · `error`. Until DB-8 lands, the
`stubSearchProvider` returns `search-unavailable`.

### Zero-knowledge constraint (reserved)
Vida decrypts only client-side; the `SearchResult` contract carries **display-only** view data (already-decrypted
titles/labels), and `command_bar_history` retains **command vocabulary** (keys/labels), not entity plaintext. Full
enforcement rides DB-8 (what gets indexed) and MOD-prefs (what gets stored). `[ADR-002 ZK model]`

## 6. Ownership hand-offs
| Concern | Owner | When |
|---------|-------|------|
| Interaction model (this doc) + contract artifact | **UX-2** | now (M1.0) |
| Rendered overlay / input / result list / trigger | UI-4 | M1.0 (shell components) |
| `command_bar_history` recency store | MOD-prefs | M1.1 |
| FTS5 index + search population + ranking | DB-8 | M1.4 |
| Per-module action commands | each module | M1.1+ |
