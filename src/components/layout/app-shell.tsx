import { useEffect, useState, type PropsWithChildren } from 'react'
import { CalendarDays, ChevronDown, FolderOpen, GraduationCap, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

const navigation = [
  { id: 'workspace', label: '나의 작업실', emoji: '🍵' },
  { id: 'calendar', label: '캘린더', emoji: '📅' },
  { id: 'career-calendar', label: '취업 캘린더', emoji: '💼' },
  { id: 'timetable', label: '수업 시간표', emoji: '📚' },
  { id: 'notes', label: '메모함', emoji: '📝' },
  { id: 'links', label: '링크함', emoji: '🔗' },
  { id: 'transcriptions', label: '필사함', emoji: '✍️' },
  { id: 'vocabulary', label: '영단어 공부방', emoji: '📖' },
  { id: 'news', label: '뉴스함', emoji: '📰' },
  { id: 'weather', label: '날씨', emoji: '🌤️' },
] as const

const navigationGroups = [
  { label: '일정', icon: CalendarDays, ids: ['calendar', 'career-calendar', 'timetable'] },
  { label: '자료', icon: FolderOpen, ids: ['notes', 'links'] },
  { label: '공부', icon: GraduationCap, ids: ['vocabulary', 'news', 'transcriptions'] },
  { label: '정보', icon: Info, ids: ['weather'] },
] as const

const navigationStorageKey = 'rokcha-workspace-navigation-collapsed'

function readCollapsedGroups(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(navigationStorageKey) ?? '[]')
    return Array.isArray(stored) ? stored.filter((label): label is string => typeof label === 'string' && navigationGroups.some(group => group.label === label)) : []
  } catch {
    return []
  }
}

export function AppShell({ children, page, onLeave, leaving }: PropsWithChildren<{ page: string; onLeave: () => Promise<void>; leaving: boolean }>) {
  const [collapsedGroups, setCollapsedGroups] = useState(readCollapsedGroups)

  useEffect(() => {
    try {
      localStorage.setItem(navigationStorageKey, JSON.stringify(collapsedGroups))
    } catch { /* Keep navigation usable when storage is unavailable. */ }
  }, [collapsedGroups])

  function navigationItem(id: string) {
    const item = navigation.find(item => item.id === id)!
    return <Button key={id} asChild variant="ghost" className={cn('h-11 w-full min-w-0 justify-start gap-2 px-3 text-muted-foreground md:gap-3', page === id && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
      <a href={`#/${id}`} aria-current={page === id ? 'page' : undefined}><span className="w-5 shrink-0 text-center text-lg leading-none" aria-hidden="true">{item.emoji}</span>{item.label}</a>
    </Button>
  }
  return (
    <div className="min-h-svh md:flex">
      <a href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus() }} className="sr-only z-50 rounded-md bg-card px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">본문으로 건너뛰기</a>
      <aside className="border-b bg-sidebar px-4 py-5 md:sticky md:top-0 md:flex md:h-svh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:px-5 md:pt-9 md:pb-4">
        <a href="#/workspace" className="mx-2 inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <span className="text-lg tracking-tight">{siteConfig.name}</span>
        </a>
        <nav aria-label="주 메뉴" className="mt-5 space-y-5 md:mt-8 md:min-h-0 md:flex-1 md:overflow-y-auto">
          {navigationItem('workspace')}
          <div className="grid grid-cols-2 items-start gap-x-2 gap-y-3 md:grid-cols-1">
            {navigationGroups.map(({ label, icon: Icon, ids }) => <section key={label} aria-label={label} className="min-w-0">
              <hr className="mb-2 border-sidebar-border" />
              <Collapsible open={!collapsedGroups.includes(label)} onOpenChange={open => setCollapsedGroups(groups => open ? groups.filter(group => group !== label) : [...groups, label])}>
                <h2>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" className={cn('group h-10 w-full justify-start gap-2 px-3 text-xs text-muted-foreground', ids.some(id => id === page) && 'text-primary')}>
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      {label}
                      <ChevronDown aria-hidden="true" className="ml-auto size-3.5 shrink-0 transition-transform group-data-[state=closed]:-rotate-90 motion-reduce:transition-none" />
                    </Button>
                  </CollapsibleTrigger>
                </h2>
                <CollapsibleContent className="space-y-1 pt-1">{ids.map(navigationItem)}</CollapsibleContent>
              </Collapsible>
            </section>)}
          </div>
        </nav>
        <div className="mt-4 border-t pt-4 md:mt-auto">
          <Button type="button" variant="ghost" onClick={() => { void onLeave() }} disabled={leaving} className="w-full justify-start gap-3 text-muted-foreground"><span className="w-5 shrink-0 text-center text-lg leading-none" aria-hidden="true">🚪</span>{leaving ? '나가는 중…' : '작업실 나가기'}</Button>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-5 pb-24 outline-none sm:px-10 lg:px-16">{children}</main>
    </div>
  )
}
