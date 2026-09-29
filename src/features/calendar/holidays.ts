export type Holidays = Record<string, string[]>

let cached: { data: Holidays; expires: number } | undefined

export function parseHolidays(value: unknown): Holidays {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('공휴일 응답 형식 오류')
  const entries = Object.entries(value).flatMap(([year, dates]) => {
    if (!/^\d{4}$/.test(year) || !dates || typeof dates !== 'object' || Array.isArray(dates)) throw new Error('공휴일 연도 형식 오류')
    const days = Object.entries(dates)
    if (!days.length || days.some(([date]) => !date.startsWith(`${year}-`))) throw new Error('공휴일 연도 형식 오류')
    return days
  })
  if (!entries.length) throw new Error('공휴일 자료 없음')
  for (const [date, names] of entries) {
    const parsed = new Date(`${date}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || !Array.isArray(names) || !names.length || !names.every(name => typeof name === 'string' && name.trim())) {
      throw new Error('공휴일 응답 형식 오류')
    }
  }
  return Object.fromEntries(entries.map(([date, names]) => [date, [...new Set(names as string[])]]))
}

export async function loadHolidays(signal: AbortSignal): Promise<Holidays> {
  signal.throwIfAborted()
  if (cached && cached.expires > Date.now()) return cached.data
  const response = await fetch('https://holidays.hyunbin.page/basic.json', {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]), credentials: 'omit',
  })
  if (!response.ok) throw new Error('공휴일 조회 실패')
  const data = parseHolidays(await response.json())
  signal.throwIfAborted()
  cached = { data, expires: Date.now() + 60 * 60 * 1000 }
  return data
}
