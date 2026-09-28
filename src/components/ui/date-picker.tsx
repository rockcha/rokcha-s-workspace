import { useId, useRef, useState } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { ko } from 'react-day-picker/locale'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function DatePicker({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const parsed = parseISO(value)
  const selected = isValid(parsed) ? parsed : undefined
  return <div className="grid gap-2">
    <label htmlFor={id} className="text-sm">{label}</label>
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Input ref={input} id={id} required disabled={disabled} value={value} onChange={event => { event.target.setCustomValidity(''); onChange(event.target.value) }} onBlur={event => { event.target.setCustomValidity(value && (!selected || format(selected, 'yyyy-MM-dd') !== value || selected.getFullYear() < 1) ? '올바른 날짜를 입력해 주세요.' : '') }} placeholder="YYYY-MM-DD" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" maxLength={10} className="h-10 bg-card pr-11 tabular-nums" />
        <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`${label} 달력 열기`} className="absolute top-1 right-1 size-8 text-muted-foreground"><CalendarDays aria-hidden="true" className="size-4" /></Button></PopoverTrigger>
      </div>
      <PopoverContent align="start" collisionPadding={12} className="w-auto max-w-[calc(100vw-1.5rem)] p-0" aria-label={`${label} 선택`}>
        <Calendar mode="single" locale={ko} selected={selected} defaultMonth={selected} autoFocus captionLayout="dropdown" startMonth={new Date(Math.min(1900, selected?.getFullYear() ?? 1900), 0)} endMonth={new Date(Math.max(2100, selected?.getFullYear() ?? 2100), 11)}
          labels={{ labelPrevious: () => '이전 달', labelNext: () => '다음 달', labelMonthDropdown: () => '월 선택', labelYearDropdown: () => '연도 선택', labelDayButton: date => format(date, 'yyyy년 M월 d일') }}
          formatters={{ formatMonthDropdown: date => `${date.getMonth() + 1}월` }}
          onSelect={date => { if (date) { input.current?.setCustomValidity(''); onChange(format(date, 'yyyy-MM-dd')); setOpen(false) } }} />
      </PopoverContent>
    </Popover>
  </div>
}
