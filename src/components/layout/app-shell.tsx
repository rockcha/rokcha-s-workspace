import type { PropsWithChildren } from 'react'
import { CalendarDays, FolderOpen, House, Leaf, Link2, LogOut, Newspaper, StickyNote, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

const navigation = [
  { id: 'workspace', label: '나의 작업실', icon: House },
  { id: 'calendar', label: '캘린더', icon: CalendarDays },
  { id: 'timetable', label: '수업 시간표', icon: Table2 },
  { id: 'notes', label: '메모함', icon: StickyNote },
  { id: 'links', label: '링크함', icon: Link2 },
  { id: 'materials', label: '자료실', icon: FolderOpen },
  { id: 'news', label: '뉴스함', icon: Newspaper },
] as const

export function AppShell({ children, page, onLeave, leaving }: PropsWithChildren<{ page: string; onLeave: () => Promise<void>; leaving: boolean }>) {
  return (
    <div className="min-h-svh md:flex">
      <a href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus() }} className="sr-only z-50 rounded-md bg-card px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">본문으로 건너뛰기</a>
      <aside className="border-b bg-sidebar px-4 py-5 md:sticky md:top-0 md:flex md:h-svh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:px-5 md:pt-9 md:pb-4">
        <a href="#/workspace" className="mx-2 inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <Leaf className="size-5 text-primary" strokeWidth={1.5} aria-hidden="true" /><span className="text-lg tracking-tight">{siteConfig.name}</span>
        </a>
        <nav aria-label="주 메뉴" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:mt-10 md:flex md:flex-col md:gap-1">
          {navigation.map(({ id, label, icon: Icon }) => <Button key={id} asChild variant="ghost" className={cn('h-11 flex-1 gap-2 px-3 text-muted-foreground md:flex-none md:justify-start md:gap-3', page === id && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
            <a href={`#/${id}`} aria-current={page === id ? 'page' : undefined}><Icon className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />{label}</a>
          </Button>)}
        </nav>
        <div className="mt-4 border-t pt-4 md:mt-auto">
          <Button type="button" variant="ghost" onClick={() => { void onLeave() }} disabled={leaving} className="w-full justify-start gap-3 text-muted-foreground"><LogOut className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />{leaving ? '나가는 중…' : '작업실 나가기'}</Button>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-5 pb-24 outline-none sm:px-10 lg:px-16">{children}</main>
    </div>
  )
}
