import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { Download, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTimetable } from '@/features/timetable/use-timetable'
import { useLessonHistory } from '@/features/lesson-history/use-lesson-history'
import { duration, durationLabel, groupRecords, monthRecords } from '@/features/lesson-history/model'
import type { LessonRecord } from '@/features/lesson-history/model'
import { downloadLessonPdf } from '@/features/lesson-history/pdf'

export function LessonHistoryPage({ token }: { token: string }) {
  const history = useLessonHistory(token)
  const timetable = useTimetable(token)
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [draft, setDraft] = useState<LessonRecord | null>(null)
  const [deleting, setDeleting] = useState<LessonRecord | null>(null)
  const [exporting, setExporting] = useState(false)
  const origin = useRef<HTMLElement | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const items = monthRecords(history.records, month)
  const unavailable = history.loading || history.busy || !!history.error
  function restoreFocus(event: Event) { event.preventDefault(); if (origin.current?.isConnected) origin.current.focus(); else addButton.current?.focus() }
  function edit(record?: LessonRecord) {
    origin.current = document.activeElement as HTMLElement
    setDraft(record ?? { id: crypto.randomUUID(), revision: 0, name: '', date: month === format(new Date(), 'yyyy-MM') ? format(new Date(), 'yyyy-MM-dd') : `${month}-01`, start: '09:00', end: '10:00' })
  }
  return <section aria-labelledby="lesson-history-title">
    <PageHeader><div className="flex flex-wrap items-center justify-between gap-4">
      <h1 id="lesson-history-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="text-2xl">📚</span>수업 내역</h1>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><a href="#/timetable">시간표로 돌아가기</a></Button><Button ref={addButton} disabled={unavailable || !month} onClick={() => edit()}><Plus aria-hidden="true" className="size-4" />내역 추가</Button></div>
    </div><div className="mt-5 flex flex-wrap items-end gap-3"><label className="grid gap-2 text-sm">조회 월<Input type="month" min="0001-01" max="9999-12" value={month} disabled={history.busy || exporting} onChange={event => setMonth(event.target.value)} /></label>
      <Button variant="outline" disabled={unavailable || exporting || !items.length} onClick={async () => { setExporting(true); try { await downloadLessonPdf(items, month) } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'PDF를 만들지 못했어요.', { id: 'lesson-history-pdf' }) } finally { setExporting(false) } }}><Download aria-hidden="true" className="size-4" />{exporting ? 'PDF 만드는 중…' : '월별 PDF 다운로드'}</Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">총 {items.length}회 · {durationLabel(items.reduce((sum, item) => sum + duration(item), 0))}</p>
    </div></PageHeader>
    {history.loading && <p role="status">수업 내역을 불러오는 중…</p>}
    {history.error && <p role="alert" className="text-destructive">{history.error} <Button variant="outline" onClick={history.retry}>다시 불러오기</Button></p>}
    {!history.loading && !history.error && <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-2xl border bg-card p-5"><h2 className="mb-4 text-lg">날짜·시간순 내역</h2>{!items.length ? <p className="text-sm text-muted-foreground">선택한 달에 기록된 수업이 없어요.</p> : <ul className="divide-y">{items.map(record => <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="break-words">{record.name}</p><p className="mt-1 text-sm text-muted-foreground">{record.date} · {record.start}–{record.end} · {durationLabel(duration(record))}</p></div><div className="flex gap-1"><Button variant="ghost" size="sm" disabled={unavailable} aria-label={`${record.date} ${record.name} 수정`} onClick={() => edit(record)}>수정</Button><Button variant="destructive-ghost" size="sm" disabled={unavailable} aria-label={`${record.date} ${record.name} 삭제`} onClick={() => { origin.current = document.activeElement as HTMLElement; setDeleting(record) }}>삭제</Button></div></li>)}</ul>}</div>
      <div className="self-start rounded-2xl border bg-card p-5"><h2 className="mb-4 text-lg">수업별 합계</h2>{groupRecords(items).map(([name, records]) => <div key={name} className="border-b py-3 last:border-0"><p className="break-words">{name}</p><p className="mt-1 text-sm text-muted-foreground">{records.length}회 · {durationLabel(records.reduce((sum, item) => sum + duration(item), 0))}</p></div>)}<p className="mt-3 text-xs text-muted-foreground">같은 수업명끼리 합산해요.</p></div>
    </div>}
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !history.busy) setDraft(null) }}><DialogContent onCloseAutoFocus={restoreFocus} className="max-h-[90dvh] overflow-y-auto"><DialogTitle>{draft?.revision ? '수업 내역 수정' : '수업 내역 추가'}</DialogTitle><DialogDescription>실제로 진행한 수업의 날짜와 시작·종료 시간을 기록해요.</DialogDescription>
      {draft && <form className="grid gap-5" onSubmit={async event => { event.preventDefault(); if (await history.mutate('save', draft)) { setMonth(draft.date.slice(0, 7)); setDraft(null) } }}><fieldset disabled={history.busy} className="contents">
        {!!timetable.lessons.length && <div className="grid gap-2"><span className="text-sm">시간표에서 불러오기</span><Select value="" onValueChange={id => { const lesson = timetable.lessons.find(item => item.id === id); if (lesson) setDraft({ ...draft, name: lesson.name, start: lesson.start, end: lesson.end }) }}><SelectTrigger aria-label="시간표 수업 선택"><SelectValue placeholder="수업 선택" /></SelectTrigger><SelectContent>{timetable.lessons.map(lesson => <SelectItem key={lesson.id} value={lesson.id}>{lesson.name} ({lesson.start}–{lesson.end})</SelectItem>)}</SelectContent></Select></div>}
        <label className="grid gap-2 text-sm">수업명<Input autoFocus required maxLength={80} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
        <DatePicker label="수업 날짜" value={draft.date} onChange={date => setDraft({ ...draft, date })} disabled={history.busy} />
        <div className="grid gap-4 sm:grid-cols-2"><TimePicker label="시작 시간" value={draft.start} onChange={start => setDraft({ ...draft, start })} disabled={history.busy} /><TimePicker label="종료 시간" value={draft.end} onChange={end => setDraft({ ...draft, end })} disabled={history.busy} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDraft(null)}>취소</Button><Button type="submit">{history.busy ? '저장 중…' : '저장'}</Button></div>
      </fieldset></form>}
    </DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={open => { if (!open && !history.busy) setDeleting(null) }}><AlertDialogContent onCloseAutoFocus={restoreFocus}><AlertDialogTitle>수업 내역을 삭제할까요?</AlertDialogTitle><AlertDialogDescription className="break-words">{deleting?.date} {deleting?.name} 내역을 삭제해요. 되돌릴 수 없어요.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={history.busy}>취소</AlertDialogCancel><AlertDialogAction disabled={history.busy} variant="destructive-ghost" onClick={async event => { event.preventDefault(); if (deleting && await history.mutate('delete', deleting)) setDeleting(null) }}>내역 삭제</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
}
