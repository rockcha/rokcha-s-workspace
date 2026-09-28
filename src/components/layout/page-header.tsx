import type { PropsWithChildren } from 'react'
import { useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({ children, className }: PropsWithChildren<{ className?: string }>) {
  const header = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const element = header.current
    if (!element) return
    const root = document.documentElement
    const previous = root.style.scrollPaddingTop
    const update = () => { root.style.scrollPaddingTop = `${element.getBoundingClientRect().height + 12}px` }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => { observer.disconnect(); root.style.scrollPaddingTop = previous }
  }, [])
  return <header ref={header} data-slot="page-header" className={cn('sticky top-0 z-30 -mx-5 bg-background px-5 pt-9 pb-6 sm:-mx-10 sm:px-10 md:pt-14 lg:-mx-16 lg:px-16', className)}>{children}</header>
}
