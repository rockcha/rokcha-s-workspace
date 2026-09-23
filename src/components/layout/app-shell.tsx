import type { PropsWithChildren } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { siteConfig } from '@/config/site'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">본문으로 건너뛰기</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 outline-none sm:px-10 sm:py-24">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-6 py-6 text-xs text-muted-foreground sm:px-10">
        © {new Date().getFullYear()} {siteConfig.name}
      </footer>
    </div>
  )
}
