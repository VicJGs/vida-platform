# Fix: bug:linear-slug-join-duplication
Status: diagnosed (gate-1 pending)
Source-repo: /Users/victor/Documents/CODE/vida-platform
Type: tooling/data defect — tracker ↔ Linear sync
Session: 2026-07-28-ar-6-spaces

## 1. Symptom (surface)
3 duplicate Linear issue pairs; the CANONICAL roadmap issues sit at BACKLOG though their work is DONE:

| Canonical (roadmap; has M1.0 milestone + dep-graph edges) | State | Orphan dup (/task-new) | State |
|---|---|---|---|
| LIF-76 `ar-5-sessions-framework` | **BACKLOG** | LIF-107 `ar-5-sessions-base` | DONE |
| LIF-77 `ar-6-spaces-and-tags` | **BACKLOG** | LIF-108 `ar-6-spaces` | IN_PROGRESS |
| LIF-71 `db-9-enums-and-zod-validators` | **BACKLOG** | LIF-106 `db-9-enums-zod` | DONE |

`[FACT: .claude/tasks/.tracker-map.json issues{} states, read 2026-07-29]`

## 2. Root cause (confirmed, not assumed)
> The defect is caused by **`tracker_sync.py` joining a task to its Linear issue solely by the task slug as the
> map key** — NOT by "/task-new creating duplicates" (the apparent symptom).

**Confirmed by code (two join tiers, BOTH slug-keyed):**
- Tier 1 (map): `tracker_sync.py:389` `known = (m["issues"].get(t["slug"]) or {}).get("id")`; `:395`
  `ensure_issue(t["slug"], …, known_id=known)`.
- Tier 2 (natural key): `linear_client.py:247-254` — when `known_id` is falsy, it falls back to
  `issues(filter:{title:{eq:$t}, project, team})`. **CORRECTION to an earlier note:** a fallback DOES exist — but
  the `title` passed **is the slug** (`ensure_issue(t["slug"], …)`), so the natural key is *also* the slug. LIF-77's
  title = `ar-6-spaces-and-tags`; the task queries title `ar-6-spaces` → no match → Tier 3.
- Tier 3 (create): `linear_client.py:255-265` `issueCreate` mints a new issue.
- The `toolkit:<slug>` marker written into the description (`tracker_sync.py:390`) is **never queried** on any
  tier — and it too embeds the slug, so it would carry the same divergence.

**Net:** every join tier keys on the slug; there is **no slug-independent stable identity**, so a slug that
differs between the roadmap-seed and the task defeats all three tiers → silent duplicate.

**The trigger:** `build-roadmap` (LIF-60) seeded the map with DESCRIPTIVE slugs (`ar-6-spaces-and-tags`,
`ar-5-sessions-framework`, `db-9-enums-and-zod-validators`). `/task-new` later created tasks with SHORTER slugs
(`ar-6-spaces`, `ar-5-sessions-base`, `db-9-enums-zod`). Slug ≠ map key → `known_id=None` → a NEW issue minted.

## 3. Classification: **STRUCTURAL** (blast radius)
- **Data:** 3 canonical issues stuck BACKLOG; 3 orphans hold status but lack the milestone + blocked-by edges
  linear-projectize set on LIF-71/76/77 → the ready-head / dep-graph loop reads the wrong issues.
- **Tooling:** ANY future slug divergence (a renamed task, a re-slugged roadmap issue) repeats the dup. No
  `--dedup`/`--cancel`/`--remap` flag exists, so remediation has no supported path (manual each time).
- **Process:** the recurring "Manual Linear (Victor): dedup — keep one, remap slug" note across ≥3 session-logs
  (db-9, ar-5, ar-6) is this same untreated structural cause resurfacing every substrate head.

Fixing one pair (remap ar-6 only) is patching a symptom — the join defect + the missing remediation path remain.

## 4. The fix has TWO facets (coordinated — the STRUCTURAL tell)
**Facet A — data remediation (this repo; ops action, not a code build):**
consolidate each pair onto the canonical LIF (keep LIF-71/76/77 — they carry the dep edges), repoint the active
task slug → canonical LIF in the map, push correct status (DONE), retire the 3 orphans (LIF-106/107/108).
The map edit + `--sync` are script-backed + reversible (git); **canceling the 3 orphan Linear issues is
irreversible + outward-facing → requires Victor's explicit confirm or is done by Victor in the UI** (the script
has no cancel).

**Facet B — tooling root-cause (a `~/dev-toolkit` bug-unit; full §XXVI gate, toolkit-development profile):**
make the sync reconcile to an existing issue when the slug misses — match on the `toolkit:<slug>` description
marker (already written at `:390`) or issue title — and add a `--remap OLD NEW` / dedup path. This is a code build
in the toolkit repo, NOT done inline here. (Relates to the tracked LIF-104 "harden tracker visibility.")

## 5. Files involved
- `~/dev-toolkit/scripts/tracker_sync.py:389-404` (join/create), `:465-504` (pull) — Facet B.
- `.claude/tasks/.tracker-map.json` `issues{}` — Facet A (the 6 entries → 3).
- Linear issues LIF-71/76/77 (mark Done) + LIF-106/107/108 (cancel) — Facet A.

## 6. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-29 | 2026-07-28-ar-6-spaces | diagnosis persisted; root cause confirmed at tracker_sync.py:389; STRUCTURAL, 2 facets |
