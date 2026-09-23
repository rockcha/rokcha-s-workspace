import { AppProviders } from '@/app/providers'
import { AppShell } from '@/components/layout/app-shell'
import { HomePage } from '@/pages/home-page'

export function App() {
  return (
    <AppProviders>
      <AppShell>
        <HomePage />
      </AppShell>
    </AppProviders>
  )
}
