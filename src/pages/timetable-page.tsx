import { PageHeader } from '@/components/layout/page-header'
import { useRef, useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { LessonEditor } from '@/features/timetable/lesson-editor'
import { minutes, useTimetable, weekdays } from '@/features/timetable/use-timetable'
import type { Lesson } from '@/features/timetable/use-timetable'

export function TimetablePage({ token }: { token: string }) {
  const timetable = useTimetable(token)
  const [editor, setEditor] = useState<{ lesson?: Lesson } | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const origin = useRef<HTMLElement | null>(null)
  const weekdayScroll = useRef<HTMLDivElement>(null)
  const lessonScroll = useRef<HTMLDivElement>(null)
  const startHour = timetable.lessons.length ? Math.min(...timetable.lessons.map(lesson => Math.floor(minutes(lesson.start) / 60))) : 8
  const endHour = Math.max(22, ...timetable.lessons.map(lesson => Math.ceil(minutes(lesson.end) / 60)))
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index)
  const height = hours.length * 72
  const today = (new Date().getDay() + 6) % 7
  function open(lesson?: Lesson) {
    origin.current = document.activeElement as HTMLElement
    setEditor({ lesson })
  }
  function restoreFocus(event: Event) {
    event.preventDefault()
    if (origin.current?.isConnected) origin.current.focus()
    else addButton.current?.focus()
  }
  return <Tooltip.Provider delayDuration={200}><section aria-labelledby="timetable-title">
    <PageHeader className="pb-0"><div className="flex flex-wrap items-center justify-between gap-4"><h1 id="timetable-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="shrink-0 text-2xl">📚</span>수업 시간표</h1><Button ref={addButton} type="button" disabled={timetable.loading || timetable.busy || !!timetable.error} onClick={() => open()}><Plus aria-hidden="true" className="size-4" />수업 추가</Button></div>
    {timetable.error && <p role="alert" className="mt-6 text-sm text-destructive">{timetable.error} <Button variant="outline" size="sm" onClick={timetable.retry}>다시 불러오기</Button></p>}
      {timetable.loading && <p role="status" className="mt-4 text-sm text-muted-foreground">기록을 불러오는 중…</p>}
    {!timetable.lessons.length && !timetable.loading && !timetable.error && <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed px-5 py-4"><BookOpen aria-hidden="true" className="size-5 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">아직 수업이 없어요. 첫 수업부터 시간표를 채워 보세요.</p></div>}
    <div ref={weekdayScroll} onScroll={event => { if (lessonScroll.current) lessonScroll.current.scrollLeft = event.currentTarget.scrollLeft }} role="region" aria-label="시간표 요일" tabIndex={0} className="mt-6 overflow-x-auto rounded-t-2xl border bg-card [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
      <div className="relative grid min-w-[840px] grid-cols-[56px_repeat(7,minmax(0,1fr))]"><div className="flex items-center justify-center text-xs text-muted-foreground">시간</div>{weekdays.map((day, index) => <div key={day} className="flex h-14 items-center justify-center gap-1.5 border-l text-sm"><span className={index === today ? 'rounded-full bg-primary px-2.5 py-1 text-primary-foreground' : ''}>{day}</span><span className="sr-only">요일</span></div>)}</div>
    </div>
    </PageHeader>
    <div className="overflow-hidden rounded-b-2xl border border-t-0 bg-card shadow-sm">
      <div ref={lessonScroll} onScroll={event => { if (weekdayScroll.current) weekdayScroll.current.scrollLeft = event.currentTarget.scrollLeft }} role="region" aria-label="월요일부터 일요일까지 주간 시간표" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <div className="min-w-[840px]">
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
            <div className="relative bg-card" style={{ height }}>{hours.map(hour => <div key={hour} className="h-[72px] pr-2 pt-1 text-right text-[11px] text-muted-foreground">{String(hour).padStart(2, '0')}:00</div>)}</div>
            {weekdays.map((day, index) => <div key={day} aria-label={`${day}요일 수업`} className="relative border-l" style={{ height }}>
              {hours.map(hour => <div key={hour} aria-hidden="true" className="h-[72px] border-b"><div className="h-9 border-b border-dashed border-border/40" /></div>)}
              {timetable.lessons.filter(lesson => lesson.days.includes(index)).sort((a, b) => a.start.localeCompare(b.start)).map(lesson => <Tooltip.Root key={lesson.id}><Tooltip.Trigger asChild><button type="button" onClick={() => open(lesson)} data-color={lesson.color} aria-label={`${day}요일 ${lesson.name} ${lesson.start}–${lesson.end} 수정`} className="lesson-color absolute inset-x-1 flex items-center justify-center overflow-hidden px-2 py-1.5 text-center transition-[filter] hover:brightness-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring" style={{ top: (minutes(lesson.start) - startHour * 60) * 1.2, height: Math.max(6, (minutes(lesson.end) - minutes(lesson.start)) * 1.2 - 2) }}><span className="line-clamp-3 break-words text-sm">{lesson.name}</span></button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content side="top" sideOffset={6} collisionPadding={12} className="z-50 max-w-[min(20rem,calc(100vw-2rem))] rounded-md bg-tooltip px-3 py-2 text-sm whitespace-pre-wrap break-words text-tooltip-foreground shadow-md">{`${lesson.name}\n${lesson.start}–${lesson.end}${lesson.memo ? `\n${lesson.memo}` : ''}`}</Tooltip.Content></Tooltip.Portal></Tooltip.Root>)}
            </div>)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground"><span>총 {timetable.lessons.length}개 수업 · 월–일</span><span>가로로 스크롤해 모든 요일을 볼 수 있어요.</span></div>
    </div>
    {editor && <LessonEditor lesson={editor.lesson} timetable={timetable} onClose={() => setEditor(null)} onRestoreFocus={restoreFocus} />}
  </section></Tooltip.Provider>
}
