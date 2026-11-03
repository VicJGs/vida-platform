// ============================================================================
// taskEditLabel — the /tasks row label (LIF-389 #2, pure): "new" when the task was never edited
// (updated_at === created_at), else "edited HH:mm" — the last edit time as 24h LOCAL wall time (getHours/getMinutes,
// never the UTC fields; task-edit-label.test.ts forces two zones).
// ============================================================================

const pad = (n: number) => String(n).padStart(2, '0')

export function taskEditLabel(task: { created_at: number; updated_at: number }): string {
  if (task.updated_at === task.created_at) return 'new'
  const at = new Date(task.updated_at)
  return `edited ${pad(at.getHours())}:${pad(at.getMinutes())}`
}
