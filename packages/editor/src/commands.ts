// E1 (UI-3) — the integration-block command TYPE MAP (BR-E1-4). E1 owns the enum→command surface so E4's slash
// menu can LIST commands before E5 builds their node-views (umbrella E4↔E5 note). This is DATA only: one
// `SlashCommand` per `INTEGRATION_BLOCK_TYPE` value (11), each populating all 7 required fields — `name · label ·
// description · icon · block_type · shortcut · category` (none optional; @vida/types editor.ts:144-155). E5 builds
// the node-views the commands insert. `icon` values are Lucide names (hints for E4's UI, not imports here).
import { INTEGRATION_BLOCK_TYPE, type SlashCommand } from '@vida/types'

export const INTEGRATION_BLOCK_COMMANDS: readonly SlashCommand[] = [
  {
    name: 'dailySummary',
    label: 'Daily summary',
    description: "Auto-generated rollup of the day's habits, tasks, study, transactions and interactions.",
    icon: 'calendar-days',
    block_type: 'dailySummary',
    shortcut: '/summary',
    category: 'platform',
  },
  {
    name: 'taskChecklist',
    label: 'Task checklist',
    description: 'Live checklist of tasks, filterable by project, milestone or due date.',
    icon: 'list-checks',
    block_type: 'taskChecklist',
    shortcut: '/tasks',
    category: 'platform',
  },
  {
    name: 'eventsBlock',
    label: 'Events',
    description: 'Agenda of events and reminders for a day or range.',
    icon: 'calendar',
    block_type: 'eventsBlock',
    shortcut: '/events',
    category: 'platform',
  },
  {
    name: 'classesBlock',
    label: 'Classes',
    description: 'Scheduled classes from synced ICS feeds.',
    icon: 'graduation-cap',
    block_type: 'classesBlock',
    shortcut: '/classes',
    category: 'platform',
  },
  {
    name: 'habitsBlock',
    label: 'Habits',
    description: "Today's habits with completion state, filterable by time of day.",
    icon: 'repeat',
    block_type: 'habitsBlock',
    shortcut: '/habits',
    category: 'platform',
  },
  {
    name: 'timelineBlock',
    label: 'Timeline',
    description: 'A temporal sequence of entities laid out on a vertical rail.',
    icon: 'git-commit-horizontal',
    block_type: 'timelineBlock',
    shortcut: '/timeline',
    category: 'platform',
  },
  {
    name: 'chartBlock',
    label: 'Chart',
    description: 'Embed an analytics chart (bar, line, pie, doughnut or radar) over a data source.',
    icon: 'bar-chart-3',
    block_type: 'chartBlock',
    shortcut: '/chart',
    category: 'embed',
  },
  {
    name: 'pomodoroBlock',
    label: 'Pomodoro timer',
    description: 'An embedded focus timer, optionally linked to a task or class.',
    icon: 'timer',
    block_type: 'pomodoroBlock',
    shortcut: '/pomodoro',
    category: 'platform',
  },
  {
    name: 'entityLink',
    label: 'Entity link',
    description: 'A rich inline link to another entity (person, project, note, class…).',
    icon: 'link',
    block_type: 'entityLink',
    shortcut: '/entity-link',
    category: 'embed',
  },
  {
    name: 'backlink',
    label: 'Backlink',
    description: 'A panel of pages and entities that reference this one.',
    icon: 'corner-up-left',
    block_type: 'backlink',
    shortcut: '/backlink',
    category: 'embed',
  },
  {
    name: 'milestoneBlock',
    label: 'Milestone',
    description: 'A project milestone with its progress, tasks and deliverables.',
    icon: 'flag',
    block_type: 'milestoneBlock',
    shortcut: '/milestone',
    category: 'platform',
  },
] as const

// Parity guard (compile-time): every INTEGRATION_BLOCK_TYPE must have exactly one command. A missing/duplicate
// entry fails the runtime parity test in commands.test.ts; this const documents the intended count (11).
export const INTEGRATION_BLOCK_COMMAND_COUNT: number = INTEGRATION_BLOCK_TYPE.length
