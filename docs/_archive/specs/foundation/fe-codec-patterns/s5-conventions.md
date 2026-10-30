# fe-codec-patterns · S5 — Conventions: ReachabilityRegistry · ProviderRead · VoiceCopy (PLAN + spec, §XXVI gate)

> **Slice:** S5 of 5 (slice-map.md), the final slice · **Plane:** `apps/web` pure logic · **Gate:** Verification (no
> Visual Gate — no chrome, the ux-4 precedent) · **Branch:** `worktree-fe-codec-patterns`.
> **Grounds:** interpretation R6/R7/R8 · seam-contract §C · frontend-quality-bar §2.1-2.2/§2.4 + P5/P6 · nav/module-map.ts ·
> hooks/useSchemaVersion.ts (React Query precedent) · onboarding/steps.ts (BR-4 honesty precedent).

## §0. Context (BASELINE)

Three cross-cutting conventions, each with related infra to ALIGN with (not duplicate):

- **Reach:** `nav/module-map.ts` encodes module-level `NavPlacement` (dock/global/secondary/non-nav/spaces-only) — the
  MODULE axis. The ≥2-path floor is a **capability axis** (dock · ⌘K · contextual/`[[link]]` · Spaces) — distinct grain
  [FACT: nav/module-map.ts:33; frontend-quality-bar/_index.md:46-47 §2.4]. ReachabilityRegistry is net-new.
- **Provider read:** React Query is the read mechanism; `useSchemaVersion` is the thin-`useQuery` precedent + the
  `queryKey` convention [FACT: hooks/useSchemaVersion.ts:11-12].
- **Voice:** `onboarding/steps.ts` `OnboardingCopyContract` (m1/m3 staged-honest) + BR-4 ("no `m1` string may claim
  encryption/ZK") is the honesty precedent — onboarding-specific; VoiceCopy generalizes it [FACT: onboarding/steps.ts:7-8; onboarding/CLAUDE.md:25].

## §1. What S5 is / is not

**Is:** three pure `apps/web` conventions (one cohesive logic slice, the ux-4 terminal-state+keyboard precedent) —
`reach/reachability-registry.ts` · `providers/provider-read.ts` · `voice/voice-copy.ts`.

**Is not:** per-module reach WIRING (each module's actual entries → the modules' M1.2.2+ job; O4); the G4 set-cover gate
itself (that ran at plan time — this is its runtime companion); any component/chrome (pure logic, no Visual Gate).

## §2. Business rules (invariants)

- **BR-S5-1 ≥2 reachable paths is a hard floor.** `assertReachable(id)` throws below 2 registered paths (fail-loud, the
  runtime companion to the G4 set-cover) [FACT: frontend-quality-bar/_index.md:46 §2.4].
- **BR-S5-2 Reach vocabulary = the quality-bar set.** `ReachPath = 'dock' | 'command-bar' | 'contextual' | 'link' | 'spaces'`
  — the capability axis, NOT `NavPlacement` (module axis) [FACT: frontend-quality-bar/_index.md:47 §2.4; nav/module-map.ts:33].
- **BR-S5-3 ProviderRead = a convention + a type, NOT a hook (anti-over-engineering, g1).** Cross-module reads go through
  a backend provider method via React Query, NEVER a direct cross-module table. Shipped as the **documented convention +
  a `ProviderRead<T> = () => Promise<T>` type** that names the provider-method seam for signatures. **No `useProviderRead`
  hook** — it would be a thin `useQuery` alias with zero M1 consumers (surfaces are M1.2.2+); the hook is deferred to
  first-consumer-pull if shared defaults ever emerge (the ReducedMotion/first-consumer lesson). Enforcement is
  architectural (no cross-module table API exists to import) + conventional [FACT: frontend-quality-bar/_index.md:27; decomposition.md:66,84].
- **BR-S5-4 VoiceCopy — mechanical lint + documented guidance.** `lintCopy` flags the **mechanically-detectable**
  violations (the ZK/encryption/cloud-sync overclaim in M1; the "No data available"-class dead-end); the tonal rules
  (plain·calm·honest·warm·yours, blame→teach) are the `VOICE` constant's documented guidance, not a false-precision NLP
  lint [FACT: frontend-quality-bar/_index.md:41-43 §2.1-2.2; onboarding/CLAUDE.md:25 BR-4].
- **BR-S5-5 Pure + no `@vida/core`-coupling beyond what each needs.** `apps/web` logic; `useProviderRead` imports
  `@tanstack/react-query` (the app layer owns that); reach + voice are dependency-free data/logic. No barrel (§XX).

## §3. The design (per convention)

**ReachabilityRegistry** (`reach/reachability-registry.ts`):

```ts
export type ReachPath = 'dock' | 'command-bar' | 'contextual' | 'link' | 'spaces'
export function createReachabilityRegistry(): {
  register(capabilityId: string, path: ReachPath): void
  getReach(capabilityId: string): readonly ReachPath[] // deduped
  assertReachable(capabilityId: string): void // throws < 2 distinct paths (BR-S5-1)
  isReachable(capabilityId: string): boolean // non-throwing probe
}
```

A factory (not a module-global singleton — testable, the AR-4/registry precedent). De-dupes paths; `assertReachable`
throws a typed `UnreachableCapabilityError` naming the capability + its current paths. **Call-site intent:** a dev/test/CI
**invariant assertion** (the runtime companion to the G4 set-cover) — a 1-path capability is a real bug that fails loud in
CI; it is NOT a per-render guard.

**ProviderRead** (`providers/provider-read.ts`) — a type + convention, NOT a hook (g1):

```ts
/** The cross-module read seam: a backend PROVIDER method (getDayBooksDigest, dueIn, …), never a table handle.
 *  A surface reads it via React Query: `useQuery({ queryKey, queryFn: provider })` where `provider satisfies ProviderRead<T>`. */
export type ProviderRead<T> = () => Promise<T>
```

Names the provider-method shape so cross-module reads are typed + greppable. A `useProviderRead` hook is **deferred to
first-consumer-pull** (a thin `useQuery` alias with no M1 consumer = ceremony; BR-S5-3). Dependency-free.

**VoiceCopy** (`voice/voice-copy.ts`):

```ts
export const VOICE = { tone: ['plain', 'calm', 'honest', 'warm', 'yours'] as const, case: 'sentence' as const }
export type CopyIssue = { rule: 'zk-sync-claim' | 'dead-end'; match: string; message: string }
export function lintCopy(text: string): CopyIssue[] // mechanical checks only (BR-S5-4)
```

`lintCopy` flags (high-confidence, mechanical only — a backstop, NOT a replacement for the m1/m3 staged-contract pattern):
**zk-sync-claim** — `/zero.?knowledge|end.to.end|synced? to (the )?cloud|cloud sync/i` (phrases with no honest M1 use;
**bare `encrypt` is deliberately NOT flagged** — it false-positives on honest staged copy like "Encryption arrives at M3");
**dead-end** — `/no data available|nothing to show|no results found/i` (the P5 anti-pattern → use a teaching `EmptyState`).
Case-insensitive, returns every match. The tonal rules (plain·calm·honest·warm·yours, blame→teach) live in `VOICE` as
documented guidance — not a false-precision NLP lint.

## §4. Acceptance (Verification Gate — pure logic, no Visual Gate)

- [ ] `createReachabilityRegistry`: register + dedupe; `assertReachable` throws (`UnreachableCapabilityError`) at <2
      distinct paths, passes at ≥2; `isReachable` non-throwing; `getReach` deduped (BR-S5-1/2).
- [ ] `ProviderRead<T>` type present + the convention documented (a provider method, never a table handle); no hook shipped
      (deferred, first-consumer-pull); the slice is dependency-free (BR-S5-3).
- [ ] `lintCopy`: flags a ZK/encryption/cloud-sync overclaim + a "No data available"-class dead-end; passes honest M1
      copy ("Saved on this device", "Your Finance is a clean page."); `VOICE` constant present (BR-S5-4).
- [ ] `tsc` 0 · eslint 0 · `apps/web` suite green (+ the three `*.test.ts`); no barrel.
- [ ] §XXIX currency: a `reach`/`providers`/`voice` layer note (CLAUDE.md) + the fe-codec-patterns ② unit marked complete.

## §5. Implementation prompt (type-first)

1. `apps/web/src/reach/reachability-registry.ts` (+ test) — the factory + `ReachPath` + `UnreachableCapabilityError`.
2. `apps/web/src/providers/provider-read.ts` — the `ProviderRead<T>` type + the documented convention (header). No hook,
   so no runtime test needed beyond a type-level usage note; keep it dependency-free.
3. `apps/web/src/voice/voice-copy.ts` (+ test) — `VOICE` + `CopyIssue` + `lintCopy` (regex set); test the flags + the honest-passes.
4. Layer `CLAUDE.md`(s) for the new dirs (or one note) — §XXIX currency; mark ② `fe-codec-patterns` complete.

**On divergence:** §XXVIII. **Done:** §4 all checked → Verification Gate PASS → S5 commit → ② complete → PR.
