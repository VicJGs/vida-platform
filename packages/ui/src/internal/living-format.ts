// fe-calendar #19 · S5 — the purpose-budget hours formatter (PLAN-S5-living-renderer.md BR-3 + BR-17 G5). Pure: the
// provider passes hours as a number; this only formats it — minute-rounded, minutes zero-padded ("2h05", the concept's
// "2h40" form), with a spoken twin for screen readers. Non-finite / negative → null (the caller shows "unmeasured").

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

export function formatHours(hours: number): { text: string; sr: string } | null {
  if (!Number.isFinite(hours) || hours < 0) return null
  const m = Math.round(hours * 60)
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (mm === 0) return { text: `${h}h`, sr: plural(h, 'hour') }
  return {
    text: `${h}h${String(mm).padStart(2, '0')}`,
    sr: h === 0 ? plural(mm, 'minute') : `${plural(h, 'hour')} ${plural(mm, 'minute')}`,
  }
}
