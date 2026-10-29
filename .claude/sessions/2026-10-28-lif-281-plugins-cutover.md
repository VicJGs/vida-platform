# Session — plugins cutover + forge project layer (LIF-281) · 2026-10-28

## Accomplished
- `/core:forge` run: `.claude/forge.json` authored from CLAUDE.md / REPO.md / layer CLAUDE.md docs; rendered
  golden rules (15), change guide (7 stages), skills `guide` · `add-table` · `add-service-method` ·
  `add-web-surface` · `fix-bug`, agent `vida-platform-reviewer`, hook `.claude/hooks/guardrail.mjs` (PreToolUse).
- `pnpm check` now starts with `node .claude/hooks/guardrail.mjs --scan` (2,483 files, 0 denied).
- PR #247 merged (`8906c5c6`) — carries the v1-wiring drop (`4e3367c3`) + the forge layer (`bb4d9d5c`).
  CI: Lint/Typecheck/Test/E2E/Format green. Branch deleted local + remote.

## Decisions
- Guardrails: deny `_legacy/` imports (content); warn on `db/_legacy/**`, `docs/_legacy/**`, `Old/**`, the 5
  generated theme files (path), TS `enum` in `packages/**`, `beforeunload` in `apps/web/src/**`.
- Path rules on tracked dirs are warn-only — `--scan` checks every tracked file, so a path deny fails CI forever.
- Content patterns allow an optional `\` before quotes — the hook matches JSON-stringified `tool_input`.
- PR said `Part of LIF-281`, not `Fixes` — whether the cutover is complete is Victor's call.
- Merged with "Workers Builds: vida-platform" red — it fails on every PR (#171, #246), not this change.

## Lessons
- A branch cut from `origin/main` tracks `origin/main`; a bare `git push` would target main. Push `branch:branch` with `-u`.

## Next Session
First step: decide LIF-281 status in Linear (close if the cutover is done; no Linear tool in this session).
Context: `.claude/forge.json` is the source — edit it, re-render with `forge.mjs --root .`, `--check` to verify.
Watch: the red Workers Builds check (Cloudflare, M4 server) — fix or disable the integration until M4.
