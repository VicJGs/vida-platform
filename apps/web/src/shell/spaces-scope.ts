// fe-shell-scope (#15) · S1 — the Spaces scope-list READ seam (`SpacesScopeRead` via ProviderRead).
//
// The scope selector lists the user's Spaces to switch global scope. Per the ProviderRead convention
// (providers/provider-read.ts) a surface reads another module's data through its PROVIDER method — NEVER a raw table.
//
// `SpacesService` has NO `listSpaces`/`getSpace` yet [FACT: packages/core/src/foundation/spaces/service.ts:38-61];
// the resolution surface "(UI + the persisted user switch) remains → P6" [FACT: docs/core/spaces/current-spec.md:39].
// M1 = a STUB → `[]` (deny-safe ⇒ the selector degrades to global-only "All"). The live provider
// (`SpacesService.listSpaces` / a mod-spaces read) swaps in at the FIRST consumer — zero signature change (the
// `shell-prefs.ts` / ReducedMotion "defer the live hook" precedent).
import type { ProviderRead } from '../providers/provider-read'

/** A selectable Space in the scope selector. `name` = the display label (M3: decrypted `[E]`; M1.0 pass-through). */
export interface SpaceOption {
  id: string
  name: string
  /** Optional `navIcon()` key; absent ⇒ FALLBACK_ICON. */
  icon?: string
}

/** The scope selector's space-list read seam — a Spaces provider returning the user's Spaces. */
export type SpacesScopeRead = ProviderRead<SpaceOption[]>

/** M1 stub: no backing read yet → empty ⇒ the selector degrades to global-only ("All"). Swap for the live provider. */
export const stubSpacesScope: SpacesScopeRead = () => Promise.resolve([])
