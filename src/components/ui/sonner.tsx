import type { CSSProperties } from 'react'
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      closeButton={false}
      containerAriaLabel="알림"
      icons={{
        success: <CircleCheck aria-hidden="true" className="size-4 text-primary" />,
        info: <Info aria-hidden="true" className="size-4 text-primary" />,
        warning: <TriangleAlert aria-hidden="true" className="size-4 text-chart-3" />,
        error: <CircleX aria-hidden="true" className="size-4 text-destructive" />,
        loading: <LoaderCircle aria-hidden="true" className="size-4 text-primary motion-safe:animate-spin" />,
      }}
      style={{
        '--border-radius': 'var(--radius)',
        fontFamily: 'var(--font-sans)',
      } as CSSProperties}
      toastOptions={{
        classNames: { toast: 'workspace-toast font-sans' },
      }}
      {...props}
    />
  )
}
