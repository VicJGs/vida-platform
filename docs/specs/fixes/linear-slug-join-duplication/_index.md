# Incident pointer: linear-slug-join-duplication (manifested here; owned by the toolkit)

This was a **toolkit** bug (the `tracker_sync.py` slug-join), not a vida code defect. It MANIFESTED in vida's
Linear board (3 duplicate issue pairs — LIF-71/76/77 stuck BACKLOG while orphan dups LIF-106/107/108 held the
status) during the M1.0 session on 2026-07-29.

- **Root cause + fix (canonical):** `~/dev-toolkit/docs/specs/fixes/tracker-sync-dedup-guard/` — stable-identity
  write-back + block-on-orphan guard + `--link`/`--retire`; shipped to `~/dev-toolkit` main (`4334dca`).
- **Remediation here (Facet A):** the 3 pairs were reconciled onto the canonical issues (LIF-71/76 → Done,
  LIF-77 → In Progress) + orphans canceled; map clean (`--verify`: 47 live, 0 orphans). Commit `223cc13`.

Vida keeps this pointer as the incident record; the durable diagnosis lives with the fix in the toolkit.
