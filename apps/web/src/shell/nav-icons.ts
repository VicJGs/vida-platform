// UI-4 · S2 (LIF-89) — the nav icon map (S2-BR-h). Rendering DATA (module/surface `key` → a lucide component), NOT a
// decision: the icon LIBRARY is fixed by ADR-001:113,239-240 (`lucide-react` on web / `lucide-react-native` on mobile);
// this only picks a glyph per nav entry. Icons import individually (named) — never `import * as` — so the bundler
// tree-shakes to just the ~20 used glyphs (§XIII bundle budget). An unmapped key degrades to FALLBACK_ICON.
//
// Colour is NOT set here: each icon renders `stroke="currentColor"` and inherits the CSS `color` of its nearest
// Tamagui ancestor carrying an explicit `color` token (the `button.tsx:110` Spinner precedent) — NavLink sets that
// row colour, so the icon tints per theme (BR-2, no hex).
import {
  Bell,
  BookOpen,
  Brain,
  Calendar,
  CalendarClock,
  Circle,
  Compass,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  House,
  ListChecks,
  Network,
  Repeat,
  Search,
  Settings,
  StickyNote,
  Target,
  Trophy,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

/** Rendered when a nav entry's `key` has no explicit glyph — a neutral placeholder, never a crash. */
export const FALLBACK_ICON: LucideIcon = Circle

// Keyed by the canonical module `key` (MODULE_MAP) AND the global-surface `key` (GLOBAL_SURFACES).
const NAV_ICONS: Readonly<Record<string, LucideIcon>> = {
  // — dock modules —
  notes: StickyNote,
  tasks: ListChecks,
  habits: Repeat,
  projects: FolderKanban,
  routines: Workflow,
  learning: GraduationCap,
  books: BookOpen,
  knowledge: Brain,
  skills: Target,
  sessions: CalendarClock,
  purposes: Compass,
  health: HeartPulse,
  finance: Wallet,
  relationships: Users,
  gamification: Trophy,
  // — global surfaces (GLOBAL_SURFACES keys) + their owning module keys —
  home: House,
  journals: House, // the Journals module IS Home
  calendar: Calendar,
  'command-palette': Search,
  notifications: Bell,
  settings: Settings,
  preferences: Settings,
  graph: Network,
}

/** The lucide icon for a nav entry `key`, or {@link FALLBACK_ICON} if none is mapped. */
export function navIcon(key: string): LucideIcon {
  return NAV_ICONS[key] ?? FALLBACK_ICON
}
