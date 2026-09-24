import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

export function CalendarPage() {
  const today = new Date()
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const offset = month.getDay()
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const cells = Math.ceil((offset + days) / 7) * 7
  return (
    <section aria-labelledby="calendar-title">
      <p className="text-xs tracking-widest text-primary">나의 하루</p>
      <h1 id="calendar-title" className="mt-3 text-3xl tracking-tight">캘린더</h1>
      <p className="mt-3 text-sm text-muted-foreground">여유롭게 살펴보는 이번 달의 흐름.</p>
      <div className="mt-10 overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-5 sm:px-6">
          <h2 aria-live="polite" className="text-lg">{year}년 {monthIndex + 1}월</h2>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="이전 달" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft aria-hidden="true" /></Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>오늘</Button>
            <Button type="button" variant="ghost" size="icon" aria-label="다음 달" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight aria-hidden="true" /></Button>
          </div>
        </div>
        <table className="w-full table-fixed border-collapse text-sm" aria-label={`${year}년 ${monthIndex + 1}월 달력`}>
          <thead><tr>{weekdays.map(day => <th key={day} scope="col" className="h-11 border-b text-xs font-normal text-muted-foreground">{day}</th>)}</tr></thead>
          <tbody>{Array.from({ length: cells / 7 }, (_, row) => <tr key={row}>{Array.from({ length: 7 }, (_, column) => {
            const date = new Date(year, monthIndex, row * 7 + column - offset + 1)
            const isToday = date.toDateString() === today.toDateString()
            return <td key={column} className="h-16 border-r border-b p-1 align-top last:border-r-0 sm:h-24 sm:p-3 lg:h-28">
              <time dateTime={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`} aria-current={isToday ? 'date' : undefined} className={cn('flex size-8 items-center justify-center rounded-full', date.getMonth() !== monthIndex && 'text-muted-foreground/45', isToday && 'bg-primary text-primary-foreground')}>{date.getDate()}</time>
            </td>
          })}</tr>)}</tbody>
        </table>
        <div className="flex items-center gap-2 px-5 py-4 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-primary" />오늘</div>
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed px-5 py-5 text-sm text-muted-foreground"><CalendarDays className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />아직 등록된 일정이 없어요. 잠시 쉬어 가도 좋은 하루예요.</div>
    </section>
  )
}
