import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import type { CalendarEntry, CalendarState } from '@/features/calendar/use-calendar'

export function DayNoteEditor({ date, note, calendar }: { date: string; note?: CalendarEntry; calendar: CalendarState }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newId] = useState(() => crypto.randomUUID())
  const input = useRef<HTMLTextAreaElement>(null)
  const content = draft ?? note?.content ?? ''
  const disabled = calendar.loading || calendar.busy || !!calendar.error
  const changed = content !== (note?.content ?? '')

  return <>
    <form className="mt-5 flex flex-1 flex-col gap-4" onSubmit={async event => {
      event.preventDefault()
      if (disabled || !changed || !content.trim()) return
      if (await calendar.save({ type: 'note', date, time: '', title: '', content }, note?.id ?? newId)) {
        setDraft(null)
        requestAnimationFrame(() => input.current?.focus())
      }
    }}>
      <Textarea ref={input} aria-label="오늘의 노트 내용" className="min-h-48 flex-1 bg-secondary/50 text-sm leading-7" required maxLength={Math.max(10000, note?.content.length ?? 0)} value={content} disabled={disabled} onChange={event => setDraft(event.target.value)} placeholder="이 날짜에 확인할 내용을 적어 두세요." />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AlertDialog open={confirmDelete} onOpenChange={open => { if (!calendar.busy) setConfirmDelete(open) }}>
          {note && <AlertDialogTrigger asChild><Button type="button" variant="destructive-ghost" size="sm" className="mr-auto" disabled={disabled}>노트 삭제</Button></AlertDialogTrigger>}
          <AlertDialogContent onCloseAutoFocus={event => { if (!note) { event.preventDefault(); input.current?.focus() } }}>
            <AlertDialogHeader><AlertDialogTitle>노트를 삭제할까요?</AlertDialogTitle><AlertDialogDescription>이 날짜의 노트를 삭제하면 되돌릴 수 없어요.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={calendar.busy}>취소</AlertDialogCancel>
              <Button type="button" variant="destructive-ghost" disabled={disabled} onClick={async () => {
                if (note && await calendar.remove(note.id)) { setDraft(null); setConfirmDelete(false) }
              }}>삭제 확인</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button type="submit" size="sm" disabled={disabled || !changed || !content.trim()}>노트 저장</Button>
      </div>
    </form>
  </>
}
