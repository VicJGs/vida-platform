# Contributing

Work is planned and tracked in Linear (team `LIF`); status moves on git events, never by hand.

- **Branch:** starts with the issue ID — `lif-412-tasks-quick-add`. Pushing it moves the issue to In Progress.
- **PR:** the description includes `Fixes LIF-412`. Opening it moves the issue to In Review; merging moves it to Done.
- **Checks:** `pnpm check` runs the full suite (format, lint, typecheck, test, e2e); the pre-push hook runs it before every push.
