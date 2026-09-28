// Empty input is an all-day event; null means an invalid time.
export function normalizeTimeInput(input: string): string | null {
  const text = input.trim().replace(/\s+/g, '')
  if (!text) return ''
  const match = /^(오전|오후)?(?:(\d{1,2})(?::(\d{1,2})|시(?:(\d{1,2})분?)?)?|(\d{3,4}))$/.exec(text)
  if (!match) return null
  const packed = match[5]
  let hour = Number(packed ? packed.slice(0, -2) : match[2])
  const minute = Number(packed ? packed.slice(-2) : match[3] ?? match[4] ?? '0')
  if (minute > 59 || hour > 23) return null
  if (match[1]) {
    if (hour < 1 || hour > 12) return null
    hour = hour % 12 + (match[1] === '오후' ? 12 : 0)
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
