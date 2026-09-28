import { PageHeader } from '@/components/layout/page-header'
import { useState } from 'react'
import { Tabs } from 'radix-ui'
import { CalendarDays, CalendarClock } from 'lucide-react'
import { TodoList } from '@/features/todos/todo-list'
import type { TodosState } from '@/features/todos/use-todos'
import { Button } from '@/components/ui/button'
import { WorkspaceMemo } from '@/features/workspace-memo/workspace-memo'
import type { WorkspaceMemoState } from '@/features/workspace-memo/use-workspace-memo'
import { daysUntil, sortEntries, useToday } from '@/features/calendar/use-calendar'
import type { CalendarState } from '@/features/calendar/use-calendar'

const sections = [
  { id: 'today', title: '오늘 일정', icon: CalendarDays, message: '오늘 등록된 일정과 노트가 없어요.' },
  { id: 'upcoming', title: '다가오는 일정', icon: CalendarClock, message: '다가오는 일정이 없어요. 새로운 일정을 남겨 보세요.' },
] as const

export function WorkspacePage({ memo, calendar, todos }: { memo: WorkspaceMemoState; calendar: CalendarState; todos: TodosState }) {
  const [view, setView] = useState('today')
  const today = useToday()
  const sorted = sortEntries(calendar.entries)
  const entries = { today: sorted.filter(entry => entry.date === today && entry.type === 'event'), upcoming: sorted.filter(entry => entry.type === 'event' && entry.date > today) }
  const todayNote = sorted.find(entry => entry.date === today && entry.type === 'note')
  return (
    <section aria-labelledby="workspace-title">
      <PageHeader><h1 id="workspace-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="shrink-0 text-2xl">🍵</span>나의 작업실</h1></PageHeader>
      {calendar.error && <p role="alert" className="mt-4 text-sm text-destructive">{calendar.error} <Button variant="outline" size="sm" onClick={calendar.retry}>다시 불러오기</Button></p>}
      {calendar.loading && <p role="status" className="mt-4 text-sm text-muted-foreground">기록을 불러오는 중…</p>}
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-5">
        <Tabs.Root value={view} onValueChange={setView}>
        <section aria-label={view === 'today' ? '오늘 일정' : '다가오는 일정'} className="flex h-80 min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <Tabs.List aria-label="일정 보기" className="flex rounded-xl bg-secondary/60 p-1">
              {sections.map(({ id, title, icon: Icon }) => <Tabs.Trigger key={id} value={id} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:px-3 sm:text-sm"><Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />{title}</Tabs.Trigger>)}
            </Tabs.List>
            <Button asChild variant="outline" size="sm" className="ml-auto shrink-0 px-2 text-xs"><a href={view === 'today' ? `#/calendar/${today}` : '#/calendar'}>{view === 'today' ? '오늘 상세 보기' : '캘린더 보기'}</a></Button>
          </div>
        {sections.map(({ id, title, message }) => (
          <Tabs.Content key={id} value={id} className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden focus-visible:outline-2 focus-visible:outline-ring motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
            <h2 className="sr-only">{title}</h2>
            {id === 'today' ? <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 gap-3 sm:gap-5">
              <div className="flex min-h-0 min-w-0 flex-col gap-2">
                <h3 className="text-xs text-muted-foreground">일정</h3>
                <ul tabIndex={0} aria-label="오늘 일정 목록" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
                  {entries.today.length ? entries.today.map(entry => <li key={entry.id} className="flex flex-col items-start gap-2 rounded-xl bg-secondary/40 p-2.5 sm:flex-row sm:p-3">
                    <span className="shrink-0 rounded-md bg-card px-2 py-1 text-xs text-primary">{entry.time || '종일'}</span>
                    <div className="min-w-0 max-w-full"><p className="break-words text-sm">{entry.title}</p>{entry.content && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{entry.content}</p>}</div>
                  </li>) : <li className="py-3 text-sm leading-6 text-muted-foreground">오늘 등록된 일정이 없어요.</li>}
                </ul>
              </div>
              <div className="flex min-h-0 min-w-0 flex-col gap-2 border-l pl-3 sm:pl-5">
                <h3 className="text-xs text-muted-foreground">노트</h3>
                <div role="region" aria-label="오늘 노트 내용" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
                  <p className="whitespace-pre-wrap break-words text-sm leading-7">{todayNote?.content || '오늘 작성한 노트가 없어요.'}</p>
                </div>
              </div>
            </div> : entries[id].length ? <ul tabIndex={0} aria-label={`${title} 목록`} className="my-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-2 focus-visible:outline-ring">{entries[id].map(entry => <li key={entry.id} className="flex items-start gap-3 rounded-xl bg-secondary/40 p-3">
              <span className="shrink-0 rounded-md bg-card px-2 py-1 text-xs text-primary">D-{daysUntil(entry.date, today)}</span>
              <div className="min-w-0"><p className="break-words text-sm">{entry.title}</p></div>
            </li>)}</ul> : <p className="py-10 text-sm leading-7 text-muted-foreground">{message}</p>}
          </Tabs.Content>
        ))}
        </section>
        </Tabs.Root>
        <TodoList todos={todos} />
        </div>
        <WorkspaceMemo memo={memo} />
      </div>
    </section>
  )
}
