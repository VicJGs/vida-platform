# Task: ci-prettier-reformat
# Status: planned
# Linear: LIF-228
# Profile: Generic Coding Session
# Created: 2026-10-05

## Goal
Make Format Check green by running `prettier --write` repo-wide (the ONLY fix — it's not a config issue).

## Context / triage (2026-10-05, ci-housekeeping)
- `.prettierrc` exists since the initial commit; `printWidth` bumped **100 → 120** to match the authored style
  (PR for ci-housekeeping). This was NOT sufficient to green Format.
- **Root cause: the repo has NEVER been `prettier --write`'d.** `prettier --check "**/*.{ts,tsx,js,jsx,json,md}"`
  fails on **1275 / 1276** files. Bumping printWidth 100→120 only moved frontend ts/tsx from 97→76 fails and the
  repo-wide count was unchanged (1275→~1280) — the mass is docs/`.md`/`.json` + many ts/tsx with non-width deviations.
  No `printWidth` value greens it; only a reformat does.

## Why deferred (not done now)
A 1275-file `prettier --write` is a cross-cutting diff that will **merge-conflict with every in-flight branch**. At
triage time two parallel sessions were active (`mod-learning-education`, `mod-notifications`). Victor's call: **defer
until the queue clears**, then run as a dedicated reformat PR.

## Plan (when picked up)
1. Confirm no (or few) in-flight PRs touching source.
2. `pnpm format` (= `prettier --write "**/*.{ts,tsx,js,jsx,json,md}"`) at printWidth 120.
3. Verify `pnpm format:check` clean + `pnpm typecheck`/`test` still green (formatting shouldn't change behavior).
4. One mechanical-reformat PR (no logic changes); merge fast to minimize conflict window.

## Alt considered
Scope `format:check` to maintained source only (packages/*/src, apps/*/src), excluding docs/.claude/.adr — a policy
change to what Format gates on. Not chosen (Victor picked the full reformat, deferred).
