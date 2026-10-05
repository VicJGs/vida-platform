// fe-codec-patterns · S5 — ProviderRead (the "no direct cross-module tables" read convention).
// Reconcile: docs/specs/foundation/fe-codec-patterns/s5-conventions.md · interpretation R7 · frontend-quality-bar §0 (OVERFLOWING).
//
// THE CONVENTION: a surface that needs another module's data reads it through that module's exposed PROVIDER method
// (e.g. booksService.getDayBooksDigest, the dueIn(today) provider) — NEVER by touching another module's tables directly
// (that is the OVERFLOWING anti-pattern: "a module reading another's tables"). A surface consumes a provider via React
// Query: `useQuery({ queryKey, queryFn: provider })` where `provider satisfies ProviderRead<T>`.
//
// Shipped as a TYPE + this convention, not a hook: a `useProviderRead` wrapper would be a thin useQuery alias with no M1
// consumer (surfaces are M1.2.2+) — ceremony over an existing mechanism (the ReducedMotion/first-consumer lesson). If
// shared cross-module-read defaults ever emerge, pull the hook then. Enforcement is architectural (no cross-module table
// API exists to import) + conventional. Dependency-free (no @tanstack/react-query edge in this slice).

/** A cross-module read seam: a backend provider method returning a promise. Never a raw table handle. */
export type ProviderRead<T> = () => Promise<T>
