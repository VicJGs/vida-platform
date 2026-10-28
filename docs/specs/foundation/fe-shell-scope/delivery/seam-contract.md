# fe-shell-scope — SEAM CONTRACT (Entity Delivery Flow · Step 2)

> The service/data API the #15 UI consumes, and the one shipped-shell seam it adds. No `@vida/core` change this unit —
> the space-list read is a deferred first-consumer seam (ADR-019 §3.5). Grounded in the shipped `ProviderRead` +
> `stubShellPrefs` precedents [FACT: apps/web/src/shell/CLAUDE.md:21-23].

## §A — `SpacesScopeRead` (the space-list read seam)

```ts
// apps/web/src/shell/spaces-scope.ts
import type { ProviderRead } from '../providers/provider-read' // EXISTING: () => Promise<T> [provider-read.ts:15]
export interface SpaceOption {
  id: string // space id (opaque)
  name: string // display label (M3: decrypted [E] — M1.0 pass-through)
  icon?: string // optional nav-icon key → navIcon(); absent ⇒ FALLBACK_ICON
}
// REUSE ProviderRead<T> — the ShellPrefsRead precedent [shell-prefs.ts:13]. Do NOT redefine the thunk shape.
export type SpacesScopeRead = ProviderRead<SpaceOption[]>
export const stubSpacesScope: SpacesScopeRead = () => Promise.resolve([]) // M1.0 ⇒ global-only ("All")
```

- **M1.0 = stub → `[]`** ⇒ the selector degrades to global-only (EC-2 empty). **No `listSpaces` exists** on
  `SpacesService` yet [FACT: packages/core/src/foundation/spaces/service.ts:38-61]; the live provider (a future
  `SpacesService.listSpaces` / a mod-spaces read) swaps in at the first consumer — **zero signature change** (the
  `shellPrefs` deferred-seam precedent). [[absent-deny-safe-port-write-is-noop-not-new-error]]
- **Degrade, never crash:** a rejected read ⇒ error state (calm `role=status`), NOT a throw — the `ViewEngine`
  "no-provider/provider-error degrade" idiom [FACT: docs/core/spaces/current-spec.md:32].

## §B — the scope store (global scope state)

```ts
// apps/web/src/stores/scope-store.ts
interface ScopeState {
  activeSpaceId: string | null   // NULL = global ("All") — views.space_id semantics, BR-9
  setScope(id: string | null): void
}
export const useScopeStore: UseBoundStore<...>   // Zustand; ephemeral UI state (app-shell-ui-store precedent)
```

- `activeSpaceId = null` ⇒ global/All [FACT: docs/core/spaces/current-business-rules.md:16 BR-9].
- **Emit-to-seam (IR3):** `setScope` updates state only; no live view consumes it in M1.0 (ViewProviderRegistry ships
  empty [FACT: docs/core/spaces/current-spec.md:31]). Honest: it switches scope, it does not fabricate a filtered view.
- Active name for the trigger label = derived (find `SpaceOption.name` by id, or `"All"` when null).

## §C — the AppShell injection seam (the ONE shipped-shell edit — IR2)

```ts
// apps/web/src/shell/app-shell.tsx — AppShellProps (additive, back-compat)
systemPanelSlot?: ReactNode   // #15 — the System panel BODY (expanded Bar 1). Default ⇒ PanelBodyPlaceholder.
// bar1Slot?: ReactNode       // ALREADY EXISTS (app-shell.tsx:58-59) — the top-strip condensed Bar 1.
```

- The `system` panel body renders `systemPanelSlot ?? <PanelBodyPlaceholder id="system"/>` in BOTH the docked
  (:159) + float (:344) branches; `modules` keeps the placeholder (its re-home is a separate unit).
- Additive + defaulted ⇒ existing `AppShell` callers + all shell tests stay green (no required prop).
- `bar1Slot` consumed as-is — no change to the top-strip render (app-shell.tsx:269-270).

## §D — consumed, unchanged (compose, never rebuild)

- `@vida/ui`: `Menu` (+ `MenuItem`), `Button` [FACT: packages/ui/src/components/{menu,button}.tsx].
- shell: `NavLink` + `useShellNavigate`, `navIcon(key)`/`FALLBACK_ICON`, `useCommandBarUIStore((s) => s.open)` (⌘K
  trigger — the selector-hook form, per the `global-bar.tsx:25` precedent), `PanelId`/`panelDomId`
  [FACT: apps/web/src/shell/CLAUDE.md:88-89,108-111].
- nav: `GLOBAL_SURFACES` (the 6, DATA — do not duplicate) [FACT: apps/web/src/nav/module-map.ts:114-121].

## §E — deferred (homed, not built here)

- Live space-list read (`listSpaces`) → first-consumer pull (mod-spaces / fe-spaces-page) — §A swap, no signature change.
  **When it lands, reconcile a dangling `activeSpaceId`:** if the live list no longer contains the stored id (a deleted
  Space), the first consumer should clear scope → null. M1.0 degrades the LABEL to "All" (selector:37-38) but leaves the
  id set — harmless with no live view consumer (emit-to-seam), a honesty gap to close at the live swap (code-review nit).
- Live view scoping (scope → filtered views) → ViewProviderRegistry consumers (module build) — N-a emit-to-seam.
- ADR-006 amendment (formalize the global-scope selector surface) → tracked follow-up.
- Space CRUD + the Spaces page → fe-spaces-page #20. Modules panel body (module nav) → separate re-home.
