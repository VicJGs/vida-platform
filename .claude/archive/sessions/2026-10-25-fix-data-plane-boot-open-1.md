---
Session 1 — 2026-10-25 (opened 2026-10-22)
Goal: repair the Done data plane — the boot's "DB worker RPC 1 (open) timed out after 15000ms" (LIF-250, M1.2.4 #60, wave L0′)
Profile: Bug Fix / Hotfix · scenario default
---

## Accomplished
- Task completed. PR #159 merged (`bc37310`); LIF-250 → Done; task archived.
- Reproduced (dev fresh 5/7 timeouts · prod 3/3 under 3-parallel load) with a Playwright boot-loop + RPC-timing init
  script + temporary in-worker phase marks; root cause FACT: the fixed 15 s client RPC timer failed a live first-run
  `open` (module eval 5–12 s dev + 32 migrations ≈ 8 s); the worker replied ok=true at 16.8–26.9 s.
- Re-grounded every point in the OS `docs/` (after Victor's corrections) → doc table in the bug unit; impact scan CLEAR.
- Built: worker receipt ack + opened-once (BR-RT-D5) · client receipt-only deadline for open/migrate (60 s), reads 15 s ·
  single-flight adapter bootstrap · `getServices()` retries a rejected build · prod-build Playwright boot smoke +
  `test:e2e:prod` + the missing `e2e` script. Unit tests mutation-checked (each fails on the original).
- Verified 49/49 boots (dev fresh/reload 10+10 · prod fresh/reload 10+10 · prod 3-parallel 9/9); Year settle on prod
  median 347 ms; tsc 0 · eslint 0 errors; `@vida/web` load-flakes (12) all pass in isolation, none reach `src/db`.
- Currency: bug unit spec · web-client-runtime current-* (BR-RT-RPC-DEADLINE) · F007 · db/e2e CLAUDE.md · decisions.

## Decisions Made
- Fix = restore documented rules (resilience "no hang", BR-RT-D5, the boot.ts memo rule) — no new architecture.
- `OPEN_ACK_TIMEOUT_MS` 60 s [INTERP — grounded on the 12.2 s worst module load].
- Filing acceptance item 3 dropped (§XXVIII): it targeted a refuted hypothesis; teardown = preferences R1.
- Filing corrections: prod timed out only under load and always requested its wasm; the "≤ 1 s Year budget" had no source.
- Prod smoke answers `/favicon.ico` 404 with a 204 route (docs classify it as noise, fe-notes envision.md:21,99).
- Merged on local-green — CI jobs not started (GitHub billing), the #142–#158 precedent.

## Open Questions
- CI is dark until GitHub Billing & plans is fixed.
- Tell the preferences-rescope session: its R3 limit "getServices() never recovers from a failed build" is fixed on main.
- Post-ack `open` has no wall-clock bound (recorded trade-off, BR-RT-RPC-DEADLINE).

## Next Session
First step: **notes-rescope** (L1, LIF-245) — fresh worktree off origin/main (now includes the boot fix), `/begin` →
task `notes-rescope` → Add Frontend Component / `entity-rescope` → Step 0 baseline → Documentation Gate → … → ELC-1…9.
Context to reload: `docs/specs/foundation/golive-replan/{process,debt-plan,g3-order}.md` (notes-rescope row) ·
`docs/features/notes-and-pages/delivery/` · `.claude/tasks/notes-rescope.md` · memory `ground-every-deferral…` (8th repeat).
