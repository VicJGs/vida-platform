# apps/web/src/providers — Cross-module read seam (fe-codec-patterns S5)

**Owning issue:** fe-codec-patterns (LIF-211) · **Authority:** `frontend-quality-bar §0` (OVERFLOWING: no cross-module tables).

## What lives here
- `provider-read.ts` — the `ProviderRead<T> = () => Promise<T>` type + the convention.

## Rules
- **No direct cross-module tables.** A surface reads another module's data through that module's exposed PROVIDER method
  (`booksService.getDayBooksDigest`, the `dueIn(today)` provider, …), consumed via React Query
  (`useQuery({ queryKey, queryFn: provider })` where `provider satisfies ProviderRead<T>`). Touching another module's
  tables directly is the OVERFLOWING anti-pattern.
- **Type + convention, not a hook.** A `useProviderRead` wrapper is deferred to first-consumer-pull (a thin `useQuery`
  alias with no M1 consumer = ceremony). Enforcement is architectural (no cross-module table API exists) + conventional.
