// ============================================================================
// SessionHudSurface — the shell-mount composition (fe-session-hud #16, S3).
// The thin surface the shell's `hudSlot` mounts: the S1 data hook over the S2 pill
// (routes.tsx stays wiring-only — the GlobalBar1 precedent). M1 prod: the stub
// resolves `hidden` ⇒ this renders NOTHING (Envision answer 1); DEV `?sample=<form>`
// walks the designed forms in the real strip.
// ============================================================================
import { useRouterState } from '@tanstack/react-router'
import { SessionHud } from './session-hud'
import { useActiveSession } from './use-active-session'

export function SessionHudSurface() {
  // Subscribe to the ROUTER's location (re-renders on client-side search changes) — a bare
  // window.location read is render-time-only and never updates on pushState (the S3 gate catch).
  const search = useRouterState({ select: (s) => s.location.searchStr })
  const { read, port } = useActiveSession(search)
  return <SessionHud read={read} port={port} />
}
