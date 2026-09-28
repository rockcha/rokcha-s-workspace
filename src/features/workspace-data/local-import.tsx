import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { requestWorkspaceData } from '@/features/workspace-data/api'
import { validEntry } from '@/features/calendar/use-calendar'
import type { CalendarEntry } from '@/features/calendar/use-calendar'
import { validLesson } from '@/features/timetable/use-timetable'

const keys = ['rokcha.calendar', 'rokcha.timetable', 'rokcha.workspace-memo'] as const
function snapshot() {
  try {
    const values = keys.map(key => localStorage.getItem(key))
    return { values, error: '', needed: values.some(value => value && value !== '[]') }
  } catch { return { values: [], error: '브라우저의 기존 기록을 읽지 못했어요.', needed: true } }
}

export function LocalImport({ token, children }: { token: string; children: ReactNode }) {
  const [source] = useState(snapshot)
  const [done, setDone] = useState(!source.needed)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(source.error)
  async function migrate() {
    if (busy || source.error) return
    setBusy(true)
    setError('')
    try {
      const calendar: unknown = JSON.parse(source.values[0] || '[]')
      const lessons: unknown = JSON.parse(source.values[1] || '[]')
      if (!Array.isArray(calendar) || !calendar.every(validEntry) || !Array.isArray(lessons) || !lessons.every(validLesson)) throw new Error('기존 기록의 형식을 확인하지 못했어요. 원본은 브라우저에 그대로 보관돼요.')
      const entries: CalendarEntry[] = []
      for (const item of calendar) {
        const { id, type, date, time, title, content } = item
        const entry = { id, type, date, time: type === 'note' ? '' : time, title: type === 'note' ? '' : title, content: type === 'note' ? [title, content].filter(Boolean).join('\n\n') : content }
        const previous = type === 'note' ? entries.find(value => value.type === 'note' && value.date === date) : undefined
        if (previous) previous.content += '\n\n' + entry.content
        else entries.push(entry)
      }
      const result = await requestWorkspaceData(token, 'import', {
        calendar: entries,
        lessons: lessons.map(({ id, name, memo, days, start, end, color }) => ({ id, name, memo, days, start, end, color })),
        memo: source.values[2] || '',
      })
      if (!result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) throw new Error('가져오기 결과를 확인하지 못했어요. 원본은 유지돼요.')
      // 서버가 성공을 확인한 원본만 제거합니다. 실패 시 다음 실행에서 재시도해도 중복되지 않습니다.
      try { keys.forEach((key, index) => { if (localStorage.getItem(key) === source.values[index]) localStorage.removeItem(key) }) } catch { /* Confirmed import is idempotent. */ }
      setDone(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '가져오지 못했어요. 기존 기록은 유지돼요.') }
    finally { setBusy(false) }
  }
  if (done) return children
  return <section className="mx-auto my-12 w-[calc(100%-2rem)] max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
    <h1 className="text-xl">기존 기록을 작업실로 가져오기</h1>
    <p className="mt-3 text-sm leading-7 text-muted-foreground">이 브라우저에 저장된 일정·노트·시간표·작업실 메모가 있어요. 서버에 저장하면 다른 기기에서도 사용할 수 있어요. 서버 기록과 충돌하면 덮어쓰지 않고 원본을 유지해요.</p>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-6 flex flex-wrap gap-2"><Button disabled={busy || !!source.error} onClick={migrate}>{busy ? '가져오는 중…' : '기존 기록 가져오기'}</Button><Button disabled={busy} variant="outline" onClick={() => setDone(true)}>나중에 · 서버 기록 보기</Button></div>
  </section>
}
