// Scope store — fe-shell-scope (#15) · S1. Ephemeral UI state ONLY (BR-RT-6): the active GLOBAL scope. Never entity
// data, never persisted (the AR-4 `app-shell-ui-store` / UX-2 `command-bar-ui-store` pattern).
//
// `activeSpaceId = null` ⇒ GLOBAL ("All"); a set id ⇒ that Space is the active scope. This mirrors the data-model
// scope semantics: `views.space_id` is NULL = global, set = Space-owned (spaces current-business-rules BR-9).
//
// EMIT-TO-SEAM (IR3): `setScope` updates state only. No live view consumes the scope in M1.0 (ViewProviderRegistry
// ships empty — spaces current-spec:31). The selector is honest: it switches scope, it does not fabricate a filtered
// view. The first view-provider consumer reads `activeSpaceId` when module views land.
import { create } from 'zustand'

interface ScopeState {
  /** The active global scope. NULL = global ("All"); a set id = that Space. */
  activeSpaceId: string | null
  setScope: (id: string | null) => void
}

export const useScopeStore = create<ScopeState>()((set) => ({
  activeSpaceId: null,
  setScope: (activeSpaceId) => set({ activeSpaceId }),
}))
