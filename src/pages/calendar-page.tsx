import { PageHeader } from '@/components/layout/page-header'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { EntryEditor } from '@/features/calendar/entry-editor'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { dateKey, sortEntries, useToday } from '@/features/calendar/use-calendar'
import type { CalendarState } from '@/features/calendar/use-calendar'
import { useWeatherLocation } from '@/features/weather/location'
import { loadCalendarWeather, weatherDescription, weatherEmoji } from '@/features/weather/api'

const weekdays = ['월', '화', '수', '목', '금', '토', '일']

export function CalendarPage({ calendar, monthKey }: { calendar: CalendarState; monthKey?: string }) {
  const todayKey = useToday()
  const location = useWeatherLocation()
  const [forecast, setForecast] = useState<Record<string, number>>({})
  const [weatherError, setWeatherError] = useState(false)
  const [weatherRetry, setWeatherRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setForecast({})
    setWeatherError(false)
    void loadCalendarWeather(location, controller.signal).then(data => { if (!controller.signal.aborted) setForecast(data) }).catch(() => { if (!controller.signal.aborted) setWeatherError(true) })
    return () => controller.abort()
  }, [location, todayKey, weatherRetry])
  const [adding, setAdding] = useState(false)
  const addButton = useRef<HTMLButtonElement>(null)
  const month = new Date(`${monthKey ?? todayKey.slice(0, 7)}-01T12:00:00`)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const offset = (month.getDay() + 6) % 7
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const cells = Math.ceil((offset + days) / 7) * 7
  return (
    <section aria-labelledby="calendar-title">
      <PageHeader className="pb-0"><div className="flex flex-wrap items-center justify-between gap-4"><h1 id="calendar-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="shrink-0 text-2xl">📅</span>캘린더</h1><Button ref={addButton} disabled={calendar.loading || calendar.busy || Boolean(calendar.error)} onClick={() => setAdding(true)}><Plus aria-hidden="true" />일정 추가</Button></div>
      {calendar.error && <p role="alert" className="mt-4 text-sm text-destructive">{calendar.error} <Button variant="outline" size="sm" onClick={calendar.retry}>다시 불러오기</Button></p>}
      {calendar.loading && <p role="status" className="mt-4 text-sm text-muted-foreground">기록을 불러오는 중…</p>}
      <div className="mt-6 overflow-hidden rounded-t-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-5 sm:px-6">
          <h2 aria-live="polite" className="text-lg">{year}년 {monthIndex + 1}월</h2>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="이전 달" onClick={() => { window.location.hash = `/calendar?month=${dateKey(new Date(year, monthIndex - 1, 1)).slice(0, 7)}` }}><ChevronLeft aria-hidden="true" /></Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { window.location.hash = '/calendar' }}>오늘</Button>
            <Button type="button" variant="ghost" size="icon" aria-label="다음 달" onClick={() => { window.location.hash = `/calendar?month=${dateKey(new Date(year, monthIndex + 1, 1)).slice(0, 7)}` }}><ChevronRight aria-hidden="true" /></Button>
          </div>
        </div>
        <div aria-hidden="true" data-slot="calendar-weekdays" className="grid grid-cols-7">{weekdays.map(day => <div key={day} className="flex h-11 items-center justify-center text-xs text-muted-foreground">{day}</div>)}</div>
      </div>
      </PageHeader>
      <div className="overflow-hidden rounded-b-xl border border-t-0 bg-card">
        <table className="w-full table-fixed border-collapse text-sm" aria-label={`${year}년 ${monthIndex + 1}월 달력`}>
          <thead className="sr-only"><tr>{weekdays.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
          <tbody>{Array.from({ length: cells / 7 }, (_, row) => <tr key={row}>{Array.from({ length: 7 }, (_, column) => {
            const date = new Date(year, monthIndex, row * 7 + column - offset + 1)
            const isToday = dateKey(date) === todayKey
            const key = dateKey(date)
            const entries = sortEntries(calendar.entries.filter(entry => entry.date === key && entry.type === 'event'))
            return <td key={column} className="border-r border-b p-0.5 align-top last:border-r-0 sm:p-1">
              <a href={`#/calendar/${key}`} aria-label={`${key} 상세 보기`} className="block h-28 overflow-hidden rounded-md p-0.5 text-left hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-ring sm:h-32 sm:p-1">
                <span className="flex items-center justify-between"><time dateTime={key} aria-current={isToday ? 'date' : undefined} className={cn('flex size-5 shrink-0 items-center justify-center rounded-full text-xs sm:size-7 sm:text-sm', date.getMonth() !== monthIndex && 'text-muted-foreground/45', isToday && 'bg-primary text-primary-foreground')}>{date.getDate()}</time>{forecast[key] !== undefined && <span role="img" aria-label={`${location.name} ${weatherDescription(forecast[key]).label} 예보`} title={`${location.name} · ${weatherDescription(forecast[key]).label}`} className="shrink-0 text-[10px] leading-none sm:text-base">{weatherEmoji(forecast[key])}</span>}</span>
                {entries.slice(0, 2).map(entry => <span key={entry.id} className={cn('mt-1 block truncate rounded px-1 py-1 text-[10px] sm:text-xs', entry.type === 'event' ? 'bg-secondary text-secondary-foreground' : 'border border-dashed text-muted-foreground')}><span className="hidden sm:inline">{entry.type === 'note' ? '노트 · ' : entry.time ? `${entry.time} ` : ''}</span>{entry.title}</span>)}
                {entries.length > 2 && <span className="block text-[10px] text-muted-foreground">+{entries.length - 2}개</span>}
              </a>
            </td>
          })}</tr>)}</tbody>
        </table>
        {weatherError && <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3 text-xs text-muted-foreground"><span role="status">날씨를 불러오지 못했어요.</span><Button variant="ghost" size="sm" onClick={() => setWeatherRetry(value => value + 1)}>날씨 다시 불러오기</Button></div>}
      </div>
      {adding && <EntryEditor date={monthKey && monthKey !== todayKey.slice(0, 7) ? `${monthKey}-01` : todayKey} calendar={calendar} onClose={() => setAdding(false)} onCloseAutoFocus={() => addButton.current?.focus()} />}
    </section>
  )
}
