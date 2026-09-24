import { CalendarDays, CalendarClock, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'

const sections = [
  { id: 'today', title: '오늘 일정', icon: CalendarDays, message: '오늘의 일정이 이곳에 모일 거예요.', href: '#/calendar', linkLabel: '캘린더 보기' },
  { id: 'upcoming', title: '다가오는 일정', icon: CalendarClock, message: '곧 다가올 일정을 이곳에서 살펴볼 수 있어요.', href: '#/calendar', linkLabel: '캘린더 보기' },
  { id: 'memo', title: '메모', icon: StickyNote, message: '기억하고 싶은 메모를 이곳에 모아 둘 거예요.', href: '#/notes', linkLabel: '메모함 보기' },
] as const

export function WorkspacePage() {
  return (
    <section aria-labelledby="workspace-title">
      <p className="text-xs tracking-widest text-primary">나의 하루를 한눈에</p>
      <h1 id="workspace-title" className="mt-3 text-3xl tracking-tight">나의 작업실</h1>
      <p className="mt-3 text-sm text-muted-foreground">오늘 할 일과 다가오는 일정, 작은 생각들을 모아 보는 공간이에요.</p>
      <p className="mt-5 inline-flex rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">준비 중인 화면이에요. 일정과 메모는 추후 연결할 예정이에요.</p>
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {sections.map(({ id, title, icon: Icon, message, href, linkLabel }) => (
          <section key={id} aria-labelledby={`${id}-title`} className={id === 'memo' ? 'rounded-xl border bg-card p-6 lg:col-span-2' : 'rounded-xl border bg-card p-6'}>
            <div className="flex items-center gap-3">
              <Icon className="size-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
              <h2 id={`${id}-title`} className="text-lg">{title}</h2>
            </div>
            <p className="py-10 text-sm leading-7 text-muted-foreground">{message}</p>
            <Button asChild variant="outline" size="sm"><a href={href}>{linkLabel}</a></Button>
          </section>
        ))}
      </div>
    </section>
  )
}
