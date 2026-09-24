import { useSyncExternalStore } from 'react'
import { AppProviders } from '@/app/providers'
import { AppShell } from '@/components/layout/app-shell'
import { CalendarPage } from '@/pages/calendar-page'
import { NotesPage } from '@/pages/notes-page'
import { LinksPage } from '@/pages/links-page'
import { WorkspacePage } from '@/pages/workspace-page'
import { WorkspaceAccess } from '@/features/workspace-access/workspace-access'

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function App() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  const page = hash === '#/notes' ? 'notes' : hash === '#/links' ? 'links' : hash === '#/calendar' ? 'calendar' : 'workspace'
  return (
    <AppProviders>
      <WorkspaceAccess>{(leave, leaving, token) => (
        <AppShell page={page} onLeave={leave} leaving={leaving}>
          {page === 'workspace' ? <WorkspacePage /> : page === 'calendar' ? <CalendarPage /> : page === 'notes' ? <NotesPage token={token} /> : <LinksPage />}
        </AppShell>
      )}</WorkspaceAccess>
    </AppProviders>
  )
}
