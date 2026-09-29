import { useSyncExternalStore } from 'react'
import { useTodos } from '@/features/todos/use-todos'
import { toast } from 'sonner'
import { AppProviders } from '@/app/providers'
import { AppShell } from '@/components/layout/app-shell'
import { CalendarPage } from '@/pages/calendar-page'
import { NotesPage } from '@/pages/notes-page'
import { NoteDetailPage } from '@/pages/note-detail-page'
import { LinksPage } from '@/pages/links-page'
import { VocabularyPage } from '@/pages/vocabulary-page'
import { NewsPage } from '@/pages/news-page'
import { WeatherPage } from '@/pages/weather-page'
import { WorkspacePage } from '@/pages/workspace-page'
import { WorkspaceAccess } from '@/features/workspace-access/workspace-access'
import { useWorkspaceMemo } from '@/features/workspace-memo/use-workspace-memo'
import { FloatingWorkspaceMemo } from '@/features/workspace-memo/workspace-memo'
import { useCalendar, validDate } from '@/features/calendar/use-calendar'
import { CalendarDayPage } from '@/pages/calendar-day-page'
import { TimetablePage } from '@/pages/timetable-page'
import { LocalImport } from '@/features/workspace-data/local-import'

function WorkspaceContent({ page, token, hash, leave, leaving }: { page: string; token: string; hash: string; leave: () => Promise<void>; leaving: boolean }) {
  const memo = useWorkspaceMemo(token)
  const calendar = useCalendar(token)
  const todos = useTodos(token)
  const date = hash.startsWith('#/calendar/') ? hash.slice('#/calendar/'.length) : ''
  const month = new URLSearchParams(hash.split('?')[1]).get('month')
  const monthKey = month && validDate(`${month}-01`) ? month : undefined
  const noteId = hash.split('?')[0].startsWith('#/notes/') ? hash.split('?')[0].slice('#/notes/'.length) : ''
  const noteFolder = new URLSearchParams(hash.split('?')[1]).get('folder') ?? ''
  async function onLeave() {
    if (memo.dirty || calendar.busy || todos.busy) {
      toast.error('저장이 끝난 뒤 나가 주세요. 저장에 실패했다면 먼저 내용을 복사해 보관해 주세요.', { id: 'workspace-leave' })
      return
    }
    await leave()
  }
  return <AppShell page={page} onLeave={onLeave} leaving={leaving}>
    {page === 'workspace' ? <WorkspacePage memo={memo} calendar={calendar} todos={todos} /> : page === 'calendar' ? validDate(date) ? <CalendarDayPage key={date} date={date} calendar={calendar} /> : <CalendarPage key={monthKey} calendar={calendar} monthKey={monthKey} /> : page === 'timetable' ? <TimetablePage token={token} /> : page === 'notes' ? noteId ? <NoteDetailPage key={`${token}:${hash}`} token={token} noteId={noteId} folderId={noteFolder} /> : <NotesPage key={noteFolder} token={token} folderId={noteFolder} /> : page === 'vocabulary' ? <VocabularyPage key={token} token={token} /> : page === 'news' ? <NewsPage hash={hash} /> : page === 'weather' ? <WeatherPage /> : <LinksPage token={token} />}
    <FloatingWorkspaceMemo memo={memo} />
  </AppShell>
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function App() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  const page = /^#\/vocabulary(?:$|[/?])/.test(hash) ? 'vocabulary' : hash === '#/weather' ? 'weather' : /^#\/news(?:$|[/?])/.test(hash) ? 'news' : /^#\/notes(?:$|[/?])/.test(hash) ? 'notes' : hash === '#/links' ? 'links' : hash === '#/timetable' ? 'timetable' : /^#\/calendar(?:$|[/?])/.test(hash) ? 'calendar' : 'workspace'
  return (
    <AppProviders>
      <WorkspaceAccess>{(leave, leaving, token) => (
        <LocalImport key={token} token={token}><WorkspaceContent page={page} token={token} hash={hash} leave={leave} leaving={leaving} /></LocalImport>
      )}</WorkspaceAccess>
    </AppProviders>
  )
}
