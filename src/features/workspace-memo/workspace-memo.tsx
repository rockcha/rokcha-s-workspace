import { useId, useRef, useState } from 'react'
import { Check, ChevronDown, GripHorizontal, PencilLine, Smile, X } from 'lucide-react'
import { Dialog as FloatingDialog } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { WorkspaceMemoState } from '@/features/workspace-memo/use-workspace-memo'

const emojis = [
  ['🌿', '잎사귀'], ['✨', '반짝임'], ['💡', '아이디어'], ['📌', '압정'], ['✅', '완료'], ['💚', '초록 하트'],
  ['📝', '메모'], ['📚', '책'], ['📅', '달력'], ['⏰', '알람'], ['🎯', '목표'], ['⭐', '별'],
  ['🔥', '불꽃'], ['👍', '좋아요'], ['😊', '미소'], ['🎉', '축하'], ['☕', '커피'], ['🍀', '네잎클로버'],
] as const

export function WorkspaceMemo({ memo, compact = false }: { memo: WorkspaceMemoState; compact?: boolean }) {
  const id = useId()
  const editor = useRef<HTMLTextAreaElement>(null)
  const [emojisOpen, setEmojisOpen] = useState(false)

  function insertEmoji(emoji: string) {
    const input = editor.current
    if (!input) return
    const start = input.selectionStart
    const end = input.selectionEnd
    memo.update(memo.content.slice(0, start) + emoji + memo.content.slice(end))
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm', compact ? 'h-[min(42rem,calc(100dvh-8rem))]' : 'min-h-[34rem] lg:h-full')}>
      <Collapsible open={emojisOpen} onOpenChange={setEmojisOpen} className="shrink-0 border-b">
      <div className="px-4 py-3 sm:px-6">
        <div className="flex min-h-9 items-center gap-2">
          <PencilLine aria-hidden="true" className="size-5 text-primary" />
          <h2 id={id} className="text-base sm:text-lg">작업실 메모</h2>
          <CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" className="ml-auto gap-1.5 px-2 text-muted-foreground" aria-label={emojisOpen ? '이모지 접기' : '이모지 펼치기'}><Smile aria-hidden="true" className="size-4" /><span className="text-xs">이모지</span><ChevronDown aria-hidden="true" className={cn('size-3.5 transition-transform', emojisOpen && 'rotate-180')} /></Button></CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent><div role="group" aria-label="이모지 추가" className="flex max-h-32 flex-wrap gap-1 overflow-y-auto px-4 pb-3 sm:px-6">
        {emojis.map(([emoji, label]) => <Button key={emoji} type="button" variant="ghost" size="icon" className="size-8 rounded-lg text-base" aria-label={`${label} 이모지 추가`} disabled={!memo.editable} onClick={() => insertEmoji(emoji)}>{emoji}</Button>)}
      </div></CollapsibleContent>
      </Collapsible>
      <Textarea disabled={!memo.editable} maxLength={1000000} ref={editor} aria-label="작업실 메모 내용" value={memo.content} onChange={(event) => memo.update(event.target.value)} className="min-h-0 flex-1 resize-none field-sizing-fixed rounded-none border-0 px-5 py-4 leading-8 shadow-none focus-visible:ring-inset focus-visible:ring-2" />
      <div className="flex items-center gap-1.5 border-t px-5 py-3 text-xs text-muted-foreground" role="status">
        {memo.saved && <Check aria-hidden="true" className="size-3.5 text-primary" />}
        <span>{memo.loading ? '메모를 불러오는 중…' : memo.error || (memo.saved ? '저장됨' : '저장 중…')}</span>
        {memo.error && <Button type="button" variant="ghost" size="sm" onClick={memo.retry}>다시 시도</Button>}
      </div>
    </section>
  )
}

export function FloatingWorkspaceMemo({ memo }: { memo: WorkspaceMemoState }) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  function move(x: number, y: number) {
    const bounds = panel.current?.getBoundingClientRect()
    if (!bounds) return
    setPosition({ x: Math.max(12, Math.min(x, window.innerWidth - bounds.width - 12)), y: Math.max(12, Math.min(y, window.innerHeight - bounds.height - 12)) })
  }
  return (
    <FloatingDialog.Root modal={false}>
      <FloatingDialog.Trigger asChild>
        <Button type="button" className="fixed bottom-5 right-5 z-40 h-12 gap-2 rounded-full px-5 shadow-lg" aria-label="작업실 메모 열기">
          <PencilLine aria-hidden="true" className="size-4" />메모 쓰기
        </Button>
      </FloatingDialog.Trigger>
      <FloatingDialog.Portal>
        <FloatingDialog.Content ref={panel} aria-describedby={undefined} onOpenAutoFocus={event => { event.preventDefault(); panel.current?.querySelector('textarea')?.focus() }} style={position ? { left: `min(${position.x}px, max(12px, calc(100vw - 40rem - 12px)))`, top: `min(${position.y}px, max(12px, calc(100dvh - min(42rem, calc(100dvh - 8rem)) - 52px)))` } : { left: 12, bottom: 84 }} className="fixed z-50 w-[min(40rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border bg-card shadow-xl outline-none">
          <FloatingDialog.Title className="sr-only">작업실 메모장</FloatingDialog.Title>
          <div className="flex h-10 items-center border-b bg-muted/50 px-2">
            <Button type="button" variant="ghost" className="h-8 min-w-0 flex-1 touch-none cursor-grab justify-start gap-2 text-xs text-muted-foreground active:cursor-grabbing" aria-label="메모장 이동 (드래그 또는 방향키)"
              onPointerDown={event => { if (event.button !== 0) return; const bounds = panel.current?.getBoundingClientRect(); if (!bounds) return; drag.current = { x: event.clientX, y: event.clientY, left: bounds.left, top: bounds.top }; event.currentTarget.setPointerCapture(event.pointerId) }}
              onPointerMove={event => { if (drag.current) move(drag.current.left + event.clientX - drag.current.x, drag.current.top + event.clientY - drag.current.y) }}
              onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
              onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
              onKeyDown={event => { const delta: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }; const step = delta[event.key]; const bounds = panel.current?.getBoundingClientRect(); if (step && bounds) { event.preventDefault(); move(bounds.left + step[0], bounds.top + step[1]) } }}>
              <GripHorizontal aria-hidden="true" className="size-4" />끌어서 이동
            </Button>
            <FloatingDialog.Close asChild><Button type="button" variant="ghost" size="icon" className="size-8" aria-label="메모장 닫기"><X aria-hidden="true" className="size-4" /></Button></FloatingDialog.Close>
          </div>
          <WorkspaceMemo memo={memo} compact />
        </FloatingDialog.Content>
      </FloatingDialog.Portal>
    </FloatingDialog.Root>
  )
}
