import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { CareerEditor } from '@/features/career-calendar/career-editor'
import { useCareerCalendar } from '@/features/career-calendar/use-career-calendar'
import type { CareerEntry } from '@/features/career-calendar/api'
import { dateKey, useToday, validDate } from '@/features/calendar/use-calendar'
import { cn } from '@/lib/utils'
import { safeWebUrl } from '@/lib/web-url'

const weekdays = ['월', '화', '수', '목', '금', '토', '일']

export function CareerCalendarPage({ token, hash }: { token: string; hash: string }) {
  const calendar = useCareerCalendar(token)
  const today = useToday()
  const pathDate = hash.split('?')[0].slice('#/career-calendar/'.length)
  const date = validDate(pathDate) && pathDate >= '0001-01-01' ? pathDate : ''
  const requestedMonth = new URLSearchParams(hash.split('?')[1]).get('month')
  const monthKey = requestedMonth && validDate(`${requestedMonth}-01`) && requestedMonth >= '0001-01' ? requestedMonth : today.slice(0, 7)
  const [editor, setEditor] = useState<{ date: string; entry?: CareerEntry } | null>(null)
  const [deleting, setDeleting] = useState<CareerEntry | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const disabled = calendar.loading || calendar.busy || !!calendar.error
  const dayEntries = calendar.entries.filter(entry => entry.date === date)

  useEffect(() => { heading.current?.focus() }, [hash])
  function restoreFocus() { (opener.current?.isConnected ? opener.current : addButton.current)?.focus() }
  function edit(entry?: CareerEntry) {
    opener.current = document.activeElement as HTMLElement
    setEditor({ entry, date: entry?.date ?? (date || (monthKey === today.slice(0, 7) ? today : `${monthKey}-01`)) })
  }

  return <section aria-labelledby="career-title">
    <PageHeader className={date ? undefined : 'pb-0'}>
      {date && <Button asChild variant="ghost" size="sm" className="mb-6"><a href={`#/career-calendar?month=${date.slice(0, 7)}`}><ArrowLeft aria-hidden="true" />취업 캘린더</a></Button>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 ref={heading} tabIndex={-1} id="career-title" className="flex flex-wrap items-center gap-3 text-3xl tracking-tight outline-none">{date ? <>{date.replaceAll('-', '. ')}<span className="text-lg text-muted-foreground">{new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR', { weekday: 'long' })}</span></> : <><span aria-hidden="true" className="shrink-0 text-2xl">💼</span>취업 캘린더</>}</h1>
        <Button ref={addButton} disabled={disabled} onClick={() => edit()}><Plus aria-hidden="true" />취업 일정 추가</Button>
      </div>
      {calendar.error && <p role="alert" className="mt-4 text-sm text-destructive">{calendar.error} <Button variant="outline" size="sm" onClick={calendar.retry}>다시 불러오기</Button></p>}
      {calendar.loading && <p role="status" className="mt-4 text-sm text-muted-foreground">취업 일정을 불러오는 중…</p>}
      {!date && <MonthHeader monthKey={monthKey} />}
    </PageHeader>
    {date ? !calendar.loading && !calendar.error && (dayEntries.length ? <div className="grid items-start gap-5 xl:grid-cols-2">
      {dayEntries.map(entry => <article key={entry.id} aria-label={entry.title} className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="break-words text-xl leading-relaxed">{entry.title}</h2>
        <p className="mt-3 flex items-center gap-2 text-sm text-primary"><Clock3 aria-hidden="true" className="size-4" /><time dateTime={`${entry.date}T${entry.time}`}>{entry.time} 마감</time></p>
        {entry.links.length > 0 && <ul aria-label={`${entry.title} 링크`} className="mt-5 flex flex-col gap-2">{entry.links.map((link, index) => {
          const url = safeWebUrl(link.url)
          return <li key={index}>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-lg border bg-secondary/30 px-4 py-3 text-sm text-primary transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span className="min-w-0 break-words">{link.title}</span><ExternalLink aria-hidden="true" className="size-4 shrink-0" /><span className="sr-only"> (새 탭)</span></a>}</li>
        })}</ul>}
        {entry.memo && <div className="mt-5 border-t pt-5"><h3 className="text-xs text-muted-foreground">메모</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{entry.memo}</p></div>}
        <div className="mt-5 flex justify-end gap-1">
          <Button variant="ghost" size="sm" disabled={disabled} aria-label={`${entry.title} 수정`} onClick={() => edit(entry)}><Pencil aria-hidden="true" className="size-4" />수정</Button>
          <Button variant="destructive-ghost" size="sm" disabled={disabled} aria-label={`${entry.title} 삭제`} onClick={() => { opener.current = document.activeElement as HTMLElement; setDeleting(entry) }}><Trash2 aria-hidden="true" className="size-4" />삭제</Button>
        </div>
      </article>)}
    </div> : <div className="rounded-2xl border border-dashed px-5 py-16 text-center text-sm text-muted-foreground">이 날짜에 등록한 취업 일정이 없어요.</div>) : <CareerMonth monthKey={monthKey} today={today} entries={calendar.entries} />}
    {editor && <CareerEditor {...editor} calendar={calendar} onClose={() => setEditor(null)} onCloseAutoFocus={restoreFocus} onSaved={savedDate => {
      setEditor(null)
      if (date && savedDate !== date) window.location.hash = `/career-calendar/${savedDate}`
      else if (!date && savedDate.slice(0, 7) !== monthKey) window.location.hash = `/career-calendar?month=${savedDate.slice(0, 7)}`
    }} />}
    <AlertDialog open={!!deleting} onOpenChange={open => { if (!open && !calendar.busy) setDeleting(null) }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
        <AlertDialogHeader><AlertDialogTitle>취업 일정을 삭제할까요?</AlertDialogTitle><AlertDialogDescription className="break-words">‘{deleting?.title}’ 일정과 등록한 링크·메모가 함께 삭제되며 되돌릴 수 없어요.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={calendar.busy}>취소</AlertDialogCancel><Button variant="destructive-ghost" disabled={calendar.busy} onClick={async () => { if (deleting && await calendar.mutate('delete', deleting)) setDeleting(null) }}>{calendar.busy ? '삭제 중…' : '삭제'}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
}

function MonthHeader({ monthKey }: { monthKey: string }) {
  const month = new Date(`${monthKey}-01T12:00:00`)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  function move(amount: number) { month.setMonth(monthIndex + amount); window.location.hash = `/career-calendar?month=${dateKey(month).padStart(10, '0').slice(0, 7)}` }
  return <div className="mt-6 overflow-hidden rounded-t-xl border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-5 sm:px-6">
      <h2 aria-live="polite" className="text-lg">{year}년 {monthIndex + 1}월</h2>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="이전 달" disabled={monthKey === '0001-01'} onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></Button>
        <Button variant="outline" size="sm" onClick={() => { window.location.hash = '/career-calendar' }}>오늘</Button>
        <Button variant="ghost" size="icon" aria-label="다음 달" disabled={monthKey === '9999-12'} onClick={() => move(1)}><ChevronRight aria-hidden="true" /></Button>
      </div>
    </div>
    <div aria-hidden="true" className="grid grid-cols-7">{weekdays.map(day => <div key={day} className="flex h-11 items-center justify-center text-xs text-muted-foreground">{day}</div>)}</div>
  </div>
}

function CareerMonth({ monthKey, today, entries }: { monthKey: string; today: string; entries: CareerEntry[] }) {
  const month = new Date(`${monthKey}-01T12:00:00`)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const offset = (month.getDay() + 6) % 7
  const lastDay = new Date(month)
  lastDay.setMonth(monthIndex + 1, 0)
  const cells = Math.ceil((offset + lastDay.getDate()) / 7) * 7
  return <div className="overflow-hidden rounded-b-xl border border-t-0 bg-card">
    <table className="w-full table-fixed border-collapse text-sm" aria-label={`${year}년 ${monthIndex + 1}월 취업 달력`}>
      <thead className="sr-only"><tr>{weekdays.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
      <tbody>{Array.from({ length: cells / 7 }, (_, row) => <tr key={row}>{Array.from({ length: 7 }, (_, column) => {
        const current = new Date(month)
        current.setDate(row * 7 + column - offset + 1)
        const key = `${String(current.getFullYear()).padStart(4, '0')}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
        const items = entries.filter(entry => entry.date === key)
        return <td key={column} className="border-r border-b p-0.5 align-top last:border-r-0 sm:p-1">
          {validDate(key) && key >= '0001-01-01' && <a href={`#/career-calendar/${key}`} aria-label={`${key} 취업 일정 상세 보기`} className="block min-h-28 rounded-md p-0.5 text-left hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-32 sm:p-1">
            <time dateTime={key} aria-current={key === today ? 'date' : undefined} className={cn('flex size-5 items-center justify-center rounded-full text-xs sm:size-7 sm:text-sm', current.getMonth() !== monthIndex && 'text-muted-foreground/45', key === today && 'bg-primary text-primary-foreground')}>{current.getDate()}</time>
            {items.map(entry => <span key={entry.id} title={`${entry.time} 마감 · ${entry.title}`} className="mt-1 flex flex-col rounded bg-secondary px-1 py-1 text-[10px] text-secondary-foreground sm:flex-row sm:items-center sm:gap-1 sm:text-xs"><time dateTime={`${entry.date}T${entry.time}`} className="shrink-0 tabular-nums">{entry.time}</time><span className="min-w-0 truncate">{entry.title}</span></span>)}
          </a>}
        </td>
      })}</tr>)}</tbody>
    </table>
  </div>
}
