// ============================================================================
// page-icons — the curated page-icon set (notes-rescope R3, PLAN-R3 G6/G8 · EC-29/EC-22 · G-1).
// A page's `icon` is a Lucide icon NAME (kebab-case, validated by core). G-1 offers "a curated map or on-demand load"; this
// is the curated map — named imports (tree-shaken), one map for the picker grid, the header and the rows. Not
// `lucide-react/dynamic` (its import map alone is ~120 KB raw, 2,025 entries). A stored name outside the set (written by a
// later build) renders the page's type icon. [INTERP] size ~48 across the OS's domains — PLAN-R3 G6.
// ============================================================================
import {
  BookOpen, Bookmark, Brain, Briefcase, Calendar, Camera, ChartLine, Clock, Code, Coffee, Dumbbell, FileText, Flag,
  FolderKanban, Gem, Gift, Globe, GraduationCap, Heart, HeartPulse, House, Languages, Leaf, Lightbulb, ListChecks, Mail,
  MapPin, MessageCircle, Moon, Music, NotebookPen, Palette, PenLine, PiggyBank, Plane, Puzzle, Rocket, Shield, Sparkles,
  Star, StickyNote, Sun, Target, Trophy, User, Users, Utensils, Wallet, type LucideIcon,
} from 'lucide-react'
import { typeIcon } from './note-chrome'

export interface PageIconEntry {
  icon: LucideIcon
  /** The option's accessible name in the picker. */
  label: string
}

export const PAGE_ICONS: Readonly<Record<string, PageIconEntry>> = {
  'sticky-note': { icon: StickyNote, label: 'Sticky note' },
  'notebook-pen': { icon: NotebookPen, label: 'Notebook' },
  'file-text': { icon: FileText, label: 'Document' },
  'pen-line': { icon: PenLine, label: 'Writing' },
  'book-open': { icon: BookOpen, label: 'Book open' },
  bookmark: { icon: Bookmark, label: 'Bookmark' },
  lightbulb: { icon: Lightbulb, label: 'Idea' },
  brain: { icon: Brain, label: 'Brain' },
  'graduation-cap': { icon: GraduationCap, label: 'Learning' },
  languages: { icon: Languages, label: 'Languages' },
  code: { icon: Code, label: 'Code' },
  puzzle: { icon: Puzzle, label: 'Puzzle' },
  'list-checks': { icon: ListChecks, label: 'Checklist' },
  target: { icon: Target, label: 'Target' },
  flag: { icon: Flag, label: 'Flag' },
  rocket: { icon: Rocket, label: 'Rocket' },
  'folder-kanban': { icon: FolderKanban, label: 'Project board' },
  briefcase: { icon: Briefcase, label: 'Work' },
  trophy: { icon: Trophy, label: 'Trophy' },
  calendar: { icon: Calendar, label: 'Calendar' },
  clock: { icon: Clock, label: 'Clock' },
  sun: { icon: Sun, label: 'Sun' },
  moon: { icon: Moon, label: 'Moon' },
  heart: { icon: Heart, label: 'Heart' },
  'heart-pulse': { icon: HeartPulse, label: 'Health' },
  dumbbell: { icon: Dumbbell, label: 'Fitness' },
  utensils: { icon: Utensils, label: 'Food' },
  coffee: { icon: Coffee, label: 'Coffee' },
  house: { icon: House, label: 'Home' },
  'map-pin': { icon: MapPin, label: 'Place' },
  plane: { icon: Plane, label: 'Travel' },
  globe: { icon: Globe, label: 'World' },
  users: { icon: Users, label: 'People' },
  user: { icon: User, label: 'Person' },
  'message-circle': { icon: MessageCircle, label: 'Conversation' },
  mail: { icon: Mail, label: 'Mail' },
  wallet: { icon: Wallet, label: 'Wallet' },
  'piggy-bank': { icon: PiggyBank, label: 'Savings' },
  'chart-line': { icon: ChartLine, label: 'Chart' },
  gem: { icon: Gem, label: 'Gem' },
  gift: { icon: Gift, label: 'Gift' },
  star: { icon: Star, label: 'Star' },
  sparkles: { icon: Sparkles, label: 'Sparkles' },
  music: { icon: Music, label: 'Music' },
  camera: { icon: Camera, label: 'Camera' },
  palette: { icon: Palette, label: 'Art' },
  leaf: { icon: Leaf, label: 'Nature' },
  shield: { icon: Shield, label: 'Shield' },
}

/** The page's icon: its chosen curated icon, else its type icon (B-38). */
export function pageIconFor(page: { icon: string | null; type: string }): LucideIcon {
  return (page.icon != null ? PAGE_ICONS[page.icon]?.icon : undefined) ?? typeIcon(page.type)
}
