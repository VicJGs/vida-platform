// services/tasks — barrel (mod-tasks #65 · LIF-142 ①)
// S1: tasks CRUD + queries + ≤1-parent guard + app-layer cascade over DB-4 `tasks`/`task_time_logs`.
// S2–S9: sub-tasks+rollup · completion+effects · timer+log_time · obligations · measurability · aggregation ·
// tags+notes+views · Journal+DueProvider — per docs/features/tasks/delivery/slice-map.md.
export * from './types'
export * from './service'
export * from './journal'
