# Contributing

Work is planned and tracked in Linear (team `LIF`); status moves on git events, never by hand.

- **Branch:** starts with the issue ID — `lif-412-tasks-quick-add`. Pushing it moves the issue to In Progress.
- **PR:** the description includes `Fixes LIF-412`. Opening it moves the issue to In Review; merging moves it to Done.
- **Checks:** `pnpm check` runs the full suite (format, lint, typecheck, test, e2e); `pnpm check:fast` is the docs tier. The pre-push hook (`tools/hooks/pre-push`) and CI run the fast tier for a docs-only branch and the full suite for anything else; a push to `main` always runs the full suite.
