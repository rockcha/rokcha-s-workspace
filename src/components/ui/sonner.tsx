import type { CSSProperties } from 'react'
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      closeButton
      richColors
      containerAriaLabel="알림"
      icons={{
        success: <CircleCheck className="size-4" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        error: <CircleX className="size-4" />,
        loading: <LoaderCircle className="size-4 animate-spin" />,
      }}
      style={{
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
        '--border-radius': 'var(--radius)',
        fontFamily: 'var(--font-sans)',
      } as CSSProperties}
      toastOptions={{
        classNames: { toast: 'font-sans', closeButton: 'cursor-pointer' },
        closeButtonAriaLabel: '알림 닫기',
      }}
      {...props}
    />
  )
}
