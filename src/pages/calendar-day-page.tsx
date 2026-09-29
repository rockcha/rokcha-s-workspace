import { PageHeader } from '@/components/layout/page-header'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, NotebookPen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntryEditor } from '@/features/calendar/entry-editor'
import { sortEntries } from '@/features/calendar/use-calendar'
import type { CalendarEntry, CalendarState } from '@/features/calendar/use-calendar'

export function CalendarDayPage({ date, calendar }: { date: string; calendar: CalendarState }) {
  const [editor, setEditor] = useState<{ entry?: CalendarEntry; type: CalendarEntry['type'] } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const entries = sortEntries(calendar.entries.filter(item => item.date === date))
  const events = entries.filter(item => item.type === 'event')
  const note = entries.find(item => item.type === 'note')
  function edit(type: CalendarEntry['type'], entry?: CalendarEntry) {
    opener.current = document.activeElement as HTMLElement
    setEditor({ type, entry })
  }
  function close() {
    setEditor(null)
    requestAnimationFrame(() => (opener.current?.isConnected ? opener.current : addButton.current)?.focus())
  }
  return <section aria-labelledby="day-title">
    <PageHeader>
    <Button asChild variant="ghost" size="sm" className="mb-6"><a href={`#/calendar?month=${date.slice(0, 7)}`}><ArrowLeft aria-hidden="true" className="mr-2 size-4" />월간 캘린더</a></Button>
    <h1 ref={heading} tabIndex={-1} id="day-title" className="text-3xl outline-none">{date.replaceAll('-', '. ')} <span className="text-lg text-muted-foreground">{new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR', { weekday: 'long' })}</span></h1>
    <p className="mt-3 text-sm text-muted-foreground">일정은 자유롭게, 노트는 하루에 한 장씩 남겨 보세요.</p>
    </PageHeader>
    {calendar.error && <p role="alert" className="mt-4 text-sm text-destructive">{calendar.error} <Button variant="outline" size="sm" onClick={calendar.retry}>다시 불러오기</Button></p>}
      {calendar.loading && <p role="status" className="mt-4 text-sm text-muted-foreground">기록을 불러오는 중…</p>}
    <div className="grid items-stretch gap-5 lg:grid-cols-2">
    <section aria-labelledby="day-events" className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:min-h-80">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="day-events" className="flex items-center gap-2 whitespace-nowrap text-lg"><CalendarDays aria-hidden="true" className="size-5 text-primary" />일정 <span className="text-sm text-muted-foreground">{events.length}개</span></h2><Button ref={addButton} type="button" size="sm" disabled={calendar.loading || calendar.busy || !!calendar.error} onClick={() => edit('event')}><Plus aria-hidden="true" className="mr-1 size-4" />일정 추가</Button></div>
      {events.length ? <ul className="mt-5 divide-y">{events.map(entry => <li key={entry.id} className="flex flex-wrap items-start gap-3 py-4">
        <span className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-primary">{entry.time || '종일'}</span>
        <div className="min-w-0 flex-1"><h3 className="break-words">{entry.title}</h3>{entry.content && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{entry.content}</p>}</div>
        <Button type="button" variant="ghost" size="sm" aria-label={`${entry.title} 수정·삭제`} onClick={() => edit('event', entry)}>수정·삭제</Button>
      </li>)}</ul> : <p className="py-10 text-sm text-muted-foreground">아직 일정이 없어요. 이 날짜에 여러 일정을 추가할 수 있어요.</p>}
    </section>
    <section aria-labelledby="day-note" className="flex min-w-0 flex-col rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:min-h-80">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="day-note" className="flex items-center gap-2 whitespace-nowrap text-lg"><NotebookPen aria-hidden="true" className="size-5 text-primary" />오늘의 노트</h2><Button type="button" variant={note ? "ghost" : "outline"} size="sm" disabled={calendar.loading || calendar.busy || !!calendar.error} onClick={() => edit('note', note)}>{note ? '노트 수정·삭제' : '노트 추가'}</Button></div>
      {note ? <div className="mt-5 flex-1 rounded-xl bg-secondary/50 p-4"><p className="whitespace-pre-wrap break-words text-sm leading-7">{note.content}</p></div> : <p className="py-10 text-sm text-muted-foreground">휴강 안내처럼 이 날짜에 확인할 내용을 적어 두세요.</p>}
    </section>
    </div>
    {editor && <EntryEditor date={date} {...editor} calendar={calendar} onClose={close} />}
  </section>
}
