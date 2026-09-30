import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { validCareerDraft } from '@/features/career-calendar/api'
import type { CareerEntry } from '@/features/career-calendar/api'
import type { CareerCalendarState } from '@/features/career-calendar/use-career-calendar'
import { safeWebUrl } from '@/lib/web-url'

export function CareerEditor({ date, entry, calendar, onClose, onSaved, onCloseAutoFocus }: {
  date: string; entry?: CareerEntry; calendar: CareerCalendarState; onClose: () => void; onSaved: (date: string) => void; onCloseAutoFocus: () => void
}) {
  const [draft, setDraft] = useState<CareerEntry>(() => entry ?? { id: crypto.randomUUID(), revision: 0, title: '', date, time: '', memo: '', links: [] })
  const [links, setLinks] = useState(() => draft.links.map(link => ({ ...link, key: crypto.randomUUID() })))
  const [error, setError] = useState('')
  const addLink = useRef<HTMLButtonElement>(null)
  const linkInputs = useRef(new Map<string, HTMLInputElement>())
  const disabled = calendar.busy || calendar.loading

  async function save() {
    if (disabled) return
    const value = { ...draft, title: draft.title.trim(), links: links.map(link => ({ title: link.title.trim(), url: safeWebUrl(link.url) ?? link.url.trim() })) }
    if (!validCareerDraft(value)) { setError('제목과 마감 날짜·시간을 확인해 주세요. 링크에는 이름과 올바른 http 또는 https 주소가 필요해요.'); return }
    setError('')
    if (await calendar.mutate('save', value)) onSaved(value.date)
  }

  return <Dialog open onOpenChange={open => { if (!open && !disabled) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" onCloseAutoFocus={event => { event.preventDefault(); onCloseAutoFocus() }}>
      <DialogTitle>{entry ? '취업 일정 수정' : '취업 일정 추가'}</DialogTitle>
      <DialogDescription>마감 날짜와 시간을 정하고 필요한 링크와 메모를 모아 두세요.</DialogDescription>
      <form className="space-y-5" onSubmit={event => { event.preventDefault(); void save() }}>
        <fieldset disabled={disabled} className="min-w-0 space-y-5">
          <label className="grid gap-2 text-sm">제목<Input autoFocus required maxLength={120} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="예: 채용 서류 접수" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePicker label="마감 날짜" value={draft.date} onChange={date => setDraft({ ...draft, date })} disabled={disabled} />
            <TimePicker label="마감 시간" value={draft.time} onChange={time => setDraft({ ...draft, time })} disabled={disabled} />
          </div>
          <section aria-labelledby="career-links-title" className="space-y-3">
            <div className="flex items-center justify-between gap-2"><h3 id="career-links-title" className="text-sm">링크</h3><Button ref={addLink} type="button" variant="outline" size="sm" disabled={links.length >= 20} onClick={() => {
              const key = crypto.randomUUID()
              setLinks([...links, { key, title: '', url: '' }])
              requestAnimationFrame(() => linkInputs.current.get(key)?.focus())
            }}><Plus aria-hidden="true" className="size-4" />링크 추가</Button></div>
            {links.map((link, index) => <div key={link.key} className="space-y-3 rounded-xl border bg-secondary/30 p-3">
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">링크 {index + 1}</span><Button type="button" variant="destructive-ghost" size="icon" className="size-8" aria-label={`링크 ${index + 1} 삭제`} onClick={() => {
                const next = links[index + 1]?.key ?? links[index - 1]?.key
                setLinks(links.filter(item => item.key !== link.key))
                requestAnimationFrame(() => (next ? linkInputs.current.get(next) : addLink.current)?.focus())
              }}><Trash2 aria-hidden="true" className="size-4" /></Button></div>
              <label className="grid gap-2 text-sm">링크 {index + 1} 이름<Input ref={element => { if (element) linkInputs.current.set(link.key, element); else linkInputs.current.delete(link.key) }} required maxLength={120} value={link.title} placeholder="예: 공식 모집 링크" onChange={event => setLinks(links.map(item => item.key === link.key ? { ...item, title: event.target.value } : item))} /></label>
              <label className="grid gap-2 text-sm">링크 {index + 1} 주소<Input type="url" required maxLength={4096} value={link.url} placeholder="https://" onChange={event => setLinks(links.map(item => item.key === link.key ? { ...item, url: event.target.value } : item))} /></label>
            </div>)}
          </section>
          <label className="grid gap-2 text-sm">메모<Textarea aria-label="메모" className="max-h-80 min-h-32" maxLength={10000} value={draft.memo} onChange={event => setDraft({ ...draft, memo: event.target.value })} placeholder="지원 준비에 필요한 내용을 적어 두세요." /></label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={disabled} onClick={onClose}>취소</Button><Button type="submit" disabled={disabled || !!calendar.error}>{calendar.busy ? '저장 중…' : '저장'}</Button></div>
      </form>
    </DialogContent>
  </Dialog>
}
