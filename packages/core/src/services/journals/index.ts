// services/journals — barrel (mod-journals #39 · LIF-127)
// S1: contribution registry + canonical types + typed errors.
// S2: the dashboard engine (buildDashboard) + pure selection resolution.
// S3: the service (createJournalsService) — snapshot store (captureSnapshot/getJournal).
export * from './types'
export * from './registry'
export * from './selection'
export * from './dashboard'
export * from './service'
