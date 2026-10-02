import { useId, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { normalizeTimeInput } from '@/lib/time-input'

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

export function TimePicker({ label, value, onChange, disabled, optional = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; optional?: boolean }) {
  const id = useId()
  const pointerFocus = useRef(false)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState<string | null>(null)
  const [rawHour, rawMinute] = value.split(':')
  const hour = hours.includes(rawHour) ? rawHour : '00'
  const minute = minutes.includes(rawMinute) ? rawMinute : '00'
  return <div className="grid min-w-0 gap-2">
    <label htmlFor={id} className="text-sm">{label}</label>
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Input id={id} ref={element => { element?.setCustomValidity(normalizeTimeInput(value) === null ? '시간을 확인해 주세요. 예: 9, 930, 14:30, 오후 1시' : '') }} value={input ?? value} onChange={event => { const next = event.target.value; setInput(next); onChange(normalizeTimeInput(next) ?? next) }} onPointerDown={() => { pointerFocus.current = true }} onFocus={event => { if (!pointerFocus.current) event.currentTarget.select() }} onClick={event => { pointerFocus.current = false; const element = event.currentTarget; if (/^\d{2}:\d{2}$/.test(element.value)) { const position = element.selectionStart ?? 0; element.setSelectionRange(position <= 2 ? 0 : 3, position <= 2 ? 2 : 5) } }} onBlur={() => { pointerFocus.current = false; setInput(null) }} disabled={disabled} required={!optional} type="text" inputMode="numeric" maxLength={20} placeholder={optional ? '예: 930 (비워 두면 종일)' : '예: 930 또는 1430'} className="h-10 bg-card pr-11 tabular-nums" />
        <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`${label} 선택 열기`} className="absolute top-1 right-1 size-8 text-muted-foreground"><Clock3 aria-hidden="true" className="size-4" /></Button></PopoverTrigger>
      </div>
      <PopoverContent align="start" collisionPadding={12} aria-label={`${label} 선택`} className="w-64 max-w-[calc(100vw-1.5rem)] space-y-3">
    <p className="text-xs text-muted-foreground">24시간 기준</p>
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={next => onChange(`${next}:${minute}`)} disabled={disabled}>
        <SelectTrigger aria-label={`${label} 시`} className="h-10 min-w-0 flex-1 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" className="max-h-60 min-w-20">{hours.map(item => <SelectItem key={item} value={item}>{item}시</SelectItem>)}</SelectContent>
      </Select>
      <span aria-hidden="true" className="text-muted-foreground">:</span>
      <Select value={minute} onValueChange={next => onChange(`${hour}:${next}`)} disabled={disabled}>
        <SelectTrigger aria-label={`${label} 분`} className="h-10 min-w-0 flex-1 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" className="max-h-60 min-w-20">{minutes.map(item => <SelectItem key={item} value={item}>{item}분</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="flex justify-end gap-2">
      {optional && <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => { onChange(''); setOpen(false) }}>종일로 설정</Button>}
      <Button type="button" size="sm" disabled={disabled} onClick={() => { onChange(`${hour}:${minute}`); setOpen(false) }}>선택 완료</Button>
    </div>
      </PopoverContent>
    </Popover>
  </div>
}
