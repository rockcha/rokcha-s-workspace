import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { CalendarDraft, CalendarEntry, CalendarState } from '@/features/calendar/use-calendar'

export function EntryEditor({ date, entry, type = 'event', calendar, onClose, onCloseAutoFocus }: { date: string; entry?: CalendarEntry; type?: CalendarEntry['type']; calendar: CalendarState; onClose: () => void; onCloseAutoFocus?: () => void }) {
  const [draft, setDraft] = useState<CalendarDraft>(entry ?? { type, date, time: type === 'event' ? '00:00' : '', title: '', content: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newId] = useState(() => crypto.randomUUID())
  const isNote = draft.type === 'note'
  const noteExists = calendar.entries.some(item => item.type === 'note' && item.date === draft.date && item.id !== entry?.id)
  return <Dialog open onOpenChange={open => { if (!open && !calendar.busy) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={onCloseAutoFocus ? event => { event.preventDefault(); onCloseAutoFocus() } : undefined}>
      <DialogTitle>{isNote ? entry ? '노트 수정' : '노트 추가' : entry ? '일정 수정' : '일정 추가'}</DialogTitle>
      <DialogDescription>{isNote ? '이 날짜에 확인할 내용을 자유롭게 적어 두세요.' : '일정의 제목과 날짜, 필요한 경우 시간을 정해 주세요.'}</DialogDescription>
      <form className="grid gap-4" onSubmit={async event => { event.preventDefault(); if (await calendar.save(draft, entry?.id ?? newId)) onClose() }}>
        <fieldset disabled={calendar.busy || calendar.loading} className="contents">
        {!isNote && <label className="grid gap-2 text-sm">제목<Input autoFocus required maxLength={120} value={draft.title} placeholder="예: 오후 수업" onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>}
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker label="날짜" value={draft.date} onChange={date => setDraft({ ...draft, date })} disabled={calendar.busy || calendar.loading} />
          {draft.type === 'event' && <TimePicker label="시간 (선택)" optional value={draft.time} onChange={time => setDraft({ ...draft, time })} disabled={calendar.busy || calendar.loading} />}
        </div>
        {isNote && <p className="text-xs text-muted-foreground">이 날짜에 확인할 내용이에요. 다가오는 일정에는 표시하지 않아요.</p>}
        <label className="grid gap-2 text-sm">{isNote ? '내용' : '내용 (선택)'}<Textarea aria-label={isNote ? '내용' : '내용 (선택)'} autoFocus={isNote} required={isNote} className={isNote ? 'max-h-80 min-h-48' : 'max-h-48 min-h-28'} maxLength={Math.max(10000, entry?.content.length ?? 0)} value={draft.content} onChange={event => setDraft({ ...draft, content: event.target.value })} placeholder={isNote ? '예: 이날은 수업 없음' : '조금 더 자세히 적어 두세요.'} /></label>
        {calendar.error && <p role="alert" className="text-sm text-destructive">{calendar.error}</p>}
        {isNote && noteExists && <p role="alert" className="text-sm text-muted-foreground">이 날짜에는 이미 노트가 있어요. 노트는 하루에 하나만 작성할 수 있어요.</p>}
        {confirmDelete && <div className="rounded-lg border p-3 text-sm"><p>이 항목을 삭제할까요? 삭제하면 되돌릴 수 없어요.</p><div className="mt-3 flex gap-2"><Button type="button" variant="destructive-ghost" size="sm" onClick={async () => { if (entry && await calendar.remove(entry.id)) onClose() }}>삭제 확인</Button><Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>돌아가기</Button></div></div>}
        <div className="flex items-center justify-end gap-2">
          {entry && <Button type="button" variant="destructive-ghost" className="mr-auto" disabled={!!calendar.error} onClick={async () => {
            if (isNote) setConfirmDelete(true)
            else if (await calendar.remove(entry.id)) onClose()
          }}>삭제</Button>}
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={!!calendar.error || !(isNote ? draft.content : draft.title).trim() || (isNote && noteExists)}>저장</Button>
        </div>
        </fieldset>
      </form>
    </DialogContent>
  </Dialog>
}
