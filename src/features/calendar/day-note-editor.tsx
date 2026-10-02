import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { CalendarEntry, CalendarState } from '@/features/calendar/use-calendar'

export function DayNoteEditor({ date, note, calendar }: { date: string; note?: CalendarEntry; calendar: CalendarState }) {
  const draft = calendar.noteDrafts[date]
  const content = draft?.content ?? note?.content ?? ''
  const changed = content !== (note?.content ?? '')
  return <div className="mt-5 flex flex-1 flex-col gap-3">
    <Textarea aria-label="오늘의 노트 내용" className="min-h-48 flex-1 bg-secondary/50 text-sm leading-7" maxLength={Math.max(10000, note?.content.length ?? 0)} value={content} disabled={calendar.loading || !!calendar.error} onChange={event => calendar.updateNote(date, event.target.value)} placeholder="이 날짜에 확인할 내용을 적어 두세요." />
    {draft?.error ? <p role="alert" className="text-sm text-destructive">{draft.error} <Button type="button" size="sm" variant="ghost" onClick={() => calendar.retryNote(date)}>다시 시도</Button></p> : <p role="status" className="text-xs text-muted-foreground">{calendar.loading ? '불러오는 중…' : changed ? '저장 중…' : '자동 저장됨'}</p>}
  </div>
}