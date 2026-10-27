// Navigation commands DERIVED from the UX-1 nav map (central data) — no duplication, no new inventory.
// Rule: one command per entry with a non-null `routePath` (dock/global/secondary). `non-nav`/`spaces-only`
// entries have `routePath: null` → excluded (reached within a realm, not directly). GLOBAL_SURFACES are merged
// and DEDUPED by routePath (MODULE_MAP wins). The `command-palette` surface self-excludes (its routePath is
// null — no "go to search" command). `routePath` is UX-facing and MAY differ from `key` (relationships→/people)
// — never assume `'/'+key`. `visibleWhen` is carried onto the command so the host filters by flag.
// preferences-rescope R5: optional `prefs` (the user's module visibility + names) run the MAP entries through the shared
// `applyNavPrefs` first — hidden → no command, renamed → the custom label; the id (`nav:<routePath>`, the history key)
// never changes. Surfaces are never filtered (Settings/Home stay reachable, EC-8).
import { MODULE_MAP, GLOBAL_SURFACES } from '../nav/module-map'
import { applyNavPrefs, type NavPrefs } from '../nav/nav-prefs'
import type { ModuleNavEntry } from '../nav/module-map'
import type { Command } from './types'

type NavSurface = { readonly routePath: string | null; readonly label: string }

export function deriveNavCommands(
  map: readonly ModuleNavEntry[] = MODULE_MAP,
  surfaces: readonly NavSurface[] = GLOBAL_SURFACES,
  prefs?: NavPrefs,
): Command[] {
  const byRoute = new Map<string, Command>()

  for (const entry of applyNavPrefs(map, prefs)) {
    if (entry.routePath === null) continue
    if (byRoute.has(entry.routePath)) continue
    byRoute.set(entry.routePath, navCommand(entry.routePath, entry.label, entry.visibleWhen))
  }

  for (const surface of surfaces) {
    if (surface.routePath === null) continue
    if (byRoute.has(surface.routePath)) continue // MODULE_MAP wins the dedupe
    byRoute.set(surface.routePath, navCommand(surface.routePath, surface.label))
  }

  return [...byRoute.values()]
}

function navCommand(routePath: string, label: string, visibleWhen?: string): Command {
  const command: Command = {
    id: `nav:${routePath}`,
    label,
    category: 'navigation',
    run: (ctx) => ctx.navigate(routePath),
  }
  return visibleWhen ? { ...command, visibleWhen } : command
}
