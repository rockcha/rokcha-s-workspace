export function isTodoCompleted(item: { completed: boolean; reset_time?: string | null; completed_at?: string | null }, now: number) {
  if (!item.completed || !item.reset_time) return item.completed
  if (!item.completed_at) return false
  const korea = new Date(now + 9 * 60 * 60 * 1000)
  const boundary = Date.parse(korea.toISOString().slice(0, 10) + 'T' + item.reset_time + ':00+09:00')
  return Date.parse(item.completed_at) >= (boundary > now ? boundary - 86400000 : boundary)
}
