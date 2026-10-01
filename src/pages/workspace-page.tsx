import { PageHeader } from '@/components/layout/page-header'
import { useEffect, useState } from 'react'
import { Tabs } from 'radix-ui'
import { BriefcaseBusiness, CalendarDays, CalendarClock, Clock } from 'lucide-react'
import { TodoList } from '@/features/todos/todo-list'
import type { TodosState } from '@/features/todos/use-todos'
import { Button } from '@/components/ui/button'
import { useCareerCalendar } from '@/features/career-calendar/use-career-calendar'
import { dateKey, daysUntil, sortEntries } from '@/features/calendar/use-calendar'
import type { CalendarState } from '@/features/calendar/use-calendar'

const sections = [
  { id: 'upcoming', title: '다가오는 일정', icon: CalendarClock, message: '다가오는 일정이 없어요. 새로운 일정을 남겨 보세요.' },
  { id: 'career', title: '다가오는 공고', icon: BriefcaseBusiness, message: '마감 예정인 공고가 없어요.' },
] as const

export function WorkspacePage({ token, calendar, todos }: { token: string; calendar: CalendarState; todos: TodosState }) {
  const career = useCareerCalendar(token)
  const [view, setView] = useState('upcoming')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const interval = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  const today = dateKey(new Date(now))
  const todayLabel = new Date(now).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
  const sorted = sortEntries(calendar.entries)
  const entries = {
    today: sorted.filter(entry => entry.date === today && entry.type === 'event'),
    upcoming: sorted.filter(entry => entry.type === 'event' && Date.parse(`${entry.date}T${entry.time || '23:59'}`) > now),
    career: career.entries.filter(entry => Date.parse(`${entry.date}T${entry.time}`) > now)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
  }
  const todayNote = sorted.find(entry => entry.date === today && entry.type === 'note')
  return (
    <section aria-labelledby="workspace-title">
      <PageHeader><h1 id="workspace-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="shrink-0 text-2xl">🍵</span>나의 작업실</h1></PageHeader>
      <div className="grid auto-rows-[32rem] items-stretch gap-5 pb-20 lg:auto-rows-[clamp(36rem,calc(100dvh-10rem),52rem)] lg:grid-cols-2">
        <div className="grid min-h-0 min-w-0 grid-rows-[14rem_minmax(0,1fr)] gap-5">
          <section aria-label="오늘 일정" className="flex min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:px-6">
            <div className="flex shrink-0 items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
              <h2 className="min-w-0 text-base sm:text-lg"><time dateTime={today}>{todayLabel}</time></h2>
              <Button asChild variant="ghost" size="sm" className="ml-auto px-2 text-xs text-muted-foreground"><a href={`#/calendar/${today}`}>오늘 상세 보기</a></Button>
            </div>
            {calendar.loading ? <p role="status" className="py-4 text-sm text-muted-foreground">기록을 불러오는 중…</p> : calendar.error ? <p role="alert" className="overflow-y-auto py-4 text-sm text-destructive">{calendar.error} <Button variant="outline" size="sm" onClick={calendar.retry}>다시 불러오기</Button></p> : <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 gap-3 sm:gap-5">
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
            </div>}
          </section>
          <Tabs.Root value={view} onValueChange={setView} className="min-h-0 min-w-0">
            <section aria-label={sections.find(section => section.id === view)?.title} className="flex h-full min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <Tabs.List aria-label="일정 보기" className="grid w-full grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
                  {sections.map(({ id, title, icon: Icon }) => <Tabs.Trigger key={id} value={id} className="flex min-w-0 flex-col items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1 py-2 text-[11px] text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-xs xl:flex-row xl:text-sm"><Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />{title}</Tabs.Trigger>)}
                </Tabs.List>
                <Button asChild variant="ghost" size="sm" className="ml-auto shrink-0 px-2 text-xs text-muted-foreground"><a href={view === 'career' ? '#/career-calendar' : '#/calendar'}>{view === 'career' ? '취업 캘린더 보기' : '캘린더 보기'}</a></Button>
              </div>
              {sections.map(({ id, title, message }) => {
                const source = id === 'career' ? career : calendar
                return (
                  <Tabs.Content key={id} value={id} className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden focus-visible:outline-2 focus-visible:outline-ring motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                    <h2 className="sr-only">{title}</h2>
                    {source.loading ? <p role="status" className="py-10 text-sm text-muted-foreground">기록을 불러오는 중…</p> : source.error ? <p role="alert" className="py-6 text-sm text-destructive">{source.error} <Button variant="outline" size="sm" onClick={source.retry}>다시 불러오기</Button></p> : entries[id].length ? <ul tabIndex={0} aria-label={`${title} 목록`} className="my-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-2 focus-visible:outline-ring">{entries[id].map(entry => {
                      const remaining = remainingTime(entry.date, entry.time, now)
                      return <li key={entry.id}><a href={`#/${id === 'career' ? 'career-calendar' : 'calendar'}/${entry.date}`} className="flex flex-wrap items-center gap-2 rounded-xl bg-secondary/40 p-3 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring sm:gap-3">
                      <span className="shrink-0 rounded-md bg-card px-2 py-1 text-xs text-primary">{entry.date === today ? 'D-day' : `D-${daysUntil(entry.date, today)}`}</span>
                      <p className="min-w-0 flex-1 break-words text-sm">{entry.title}</p>
                      {remaining && <p className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-primary"><Clock aria-hidden="true" className="size-3.5 shrink-0" /><span>{remaining}</span></p>}
                    </a></li>})}</ul> : <p className="py-10 text-sm leading-7 text-muted-foreground">{message}</p>}
                  </Tabs.Content>
              )})}
            </section>
          </Tabs.Root>
        </div>
        <TodoList todos={todos} className="h-full min-w-0" />
      </div>
    </section>
  )
}

function remainingTime(date: string, time: string, now: number) {
  const remaining = Date.parse(`${date}T${time || '23:59'}`) - now
  if (!Number.isFinite(remaining) || remaining <= 0 || remaining >= 86400000) return null
  if (remaining < 60000) return '1분 미만 남음'
  const minutes = Math.floor(remaining / 60000)
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours}시간 ${minutes % 60}분 남음` : `${minutes}분 남음`
}
