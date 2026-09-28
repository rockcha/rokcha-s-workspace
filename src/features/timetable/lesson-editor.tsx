import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TimePicker } from '@/components/ui/time-picker'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { lessonColors, weekdays } from '@/features/timetable/use-timetable'
import type { Lesson, LessonDraft, TimetableState } from '@/features/timetable/use-timetable'

export function LessonEditor({ lesson, timetable, onClose, onRestoreFocus }: { lesson?: Lesson; timetable: TimetableState; onClose: () => void; onRestoreFocus: (event: Event) => void }) {
  const [draft, setDraft] = useState<LessonDraft>(lesson ?? { name: '', memo: '', days: [0], start: '09:00', end: '10:00', color: lessonColors[timetable.lessons.length % lessonColors.length].id })
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [newId] = useState(() => crypto.randomUUID())
  return <>
    <Dialog open onOpenChange={open => { if (!open && !timetable.busy) onClose() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={onRestoreFocus}>
        <DialogTitle>{lesson ? '수업 수정' : '수업 추가'}</DialogTitle>
        <DialogDescription>매주 반복되는 수업이에요. 같은 시간에 진행하는 요일을 함께 선택할 수 있어요.</DialogDescription>
        <form className="grid gap-5" onSubmit={async event => { event.preventDefault(); const message = await timetable.save(draft, lesson?.id ?? newId); setError(message); if (!message) onClose() }}>
          <fieldset disabled={timetable.busy || timetable.loading} className="contents">
          <label className="grid gap-2 text-sm">수업 이름<Input autoFocus required maxLength={80} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="예: 영어 회화" /></label>
          <fieldset className="min-w-0"><legend className="mb-2 text-sm">요일</legend><div className="grid grid-cols-7 gap-1">{weekdays.map((day, index) => <Button key={day} type="button" size="sm" className="px-0" variant={draft.days.includes(index) ? 'secondary' : 'outline'} aria-pressed={draft.days.includes(index)} aria-label={`${day}요일`} onClick={() => setDraft({ ...draft, days: draft.days.includes(index) ? draft.days.filter(value => value !== index) : [...draft.days, index] })}>{day}</Button>)}</div></fieldset>
          <div className="grid gap-4 sm:grid-cols-2"><TimePicker label="시작 시간" value={draft.start} onChange={start => setDraft({ ...draft, start })} disabled={timetable.busy || timetable.loading} /><TimePicker label="종료 시간" value={draft.end} onChange={end => setDraft({ ...draft, end })} disabled={timetable.busy || timetable.loading} /></div>
          <fieldset><legend className="mb-2 text-sm">수업 색상</legend><div className="flex flex-wrap gap-2">{lessonColors.map(color => <button key={color.id} type="button" aria-label={`${color.name} 색상`} aria-pressed={draft.color === color.id} onClick={() => setDraft({ ...draft, color: color.id })} className="lesson-color flex size-9 items-center justify-center rounded-full border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" data-color={color.id}>{draft.color === color.id && <Check aria-hidden="true" className="size-4" />}</button>)}</div></fieldset>
          <label className="grid gap-2 text-sm">수업 메모<Textarea aria-label="수업 메모" className="min-h-28 max-h-48" maxLength={3000} value={draft.memo} onChange={event => setDraft({ ...draft, memo: event.target.value })} placeholder="준비물이나 수업 장소를 적어 두세요." /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">{lesson && <Button type="button" variant="ghost" className="mr-auto text-destructive" onClick={() => { setError(''); setDeleting(true) }}>삭제</Button>}<Button type="button" variant="outline" onClick={onClose}>취소</Button><Button type="submit">저장</Button></div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={deleting} onOpenChange={open => { if (!timetable.busy) setDeleting(open) }}>
      <AlertDialogContent>
        <AlertDialogTitle>수업을 삭제할까요?</AlertDialogTitle>
        <AlertDialogDescription className="break-words">‘{lesson?.name}’ 수업을 선택된 모든 요일의 시간표에서 삭제해요. 되돌릴 수 없어요.</AlertDialogDescription>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={timetable.busy}>취소</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={timetable.busy} onClick={async event => { event.preventDefault(); if (!lesson) return; const message = await timetable.remove(lesson.id); setError(message); if (!message) { setDeleting(false); onClose() } }}>수업 삭제</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
}
