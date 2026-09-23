import { Leaf } from 'lucide-react'
import { siteConfig } from '@/config/site'

export function SiteHeader() {
  return (
    <header className="border-b bg-background/95">
      <div className="mx-auto flex h-20 max-w-6xl items-center px-6 sm:px-10">
        <a href="/" className="inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Leaf className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl tracking-tight">{siteConfig.name}</span>
        </a>
        <span className="ml-auto hidden text-sm text-muted-foreground sm:block">조금씩, 차곡차곡.</span>
      </div>
    </header>
  )
}
