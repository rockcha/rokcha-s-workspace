import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { reorderVisibleTodos } from '@/features/todos/order'
import type { Todo } from '@/features/todos/use-todos'

type DropTarget = { id: string; after: boolean }
type PointerDrag = { id: string; pointerId: number; startX: number; startY: number; x: number; y: number; started: boolean }

export function useTodoReorder(items: Todo[], visible: Todo[], save: (items: Todo[]) => Promise<boolean>, disabled: boolean) {
  const list = useRef<HTMLUListElement>(null)
  const pointer = useRef<PointerDrag | null>(null)
  const frame = useRef(0)
  const pending = useRef(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [target, setTarget] = useState<DropTarget | null>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => () => { cancelAnimationFrame(frame.current) }, [])

  function getTarget(): DropTarget | null {
    const drag = pointer.current
    const container = list.current
    if (!drag?.started || !container) return null
    const bounds = container.getBoundingClientRect()
    if (drag.x < bounds.left - 24 || drag.x > bounds.right + 24 || drag.y < bounds.top - 48 || drag.y > bounds.bottom + 48) return null
    const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-todo-id]'))
    const row = rows.find(element => element.getBoundingClientRect().bottom >= drag.y) ?? rows.at(-1)
    if (!row?.dataset.todoId) return null
    const rect = row.getBoundingClientRect()
    return { id: row.dataset.todoId, after: drag.y > rect.top + rect.height / 2 }
  }

  function tick() {
    const drag = pointer.current
    const container = list.current
    if (!drag || !container) return
    if (drag.started) {
      const bounds = container.getBoundingClientRect()
      if (drag.x >= bounds.left - 24 && drag.x <= bounds.right + 24 && drag.y >= bounds.top - 48 && drag.y <= bounds.bottom + 48) {
        if (drag.y < bounds.top + 32) container.scrollTop -= 6
        else if (drag.y > bounds.bottom - 32) container.scrollTop += 6
      }
      const next = getTarget()
      setTarget(previous => previous?.id === next?.id && previous?.after === next?.after ? previous : next)
    }
    frame.current = requestAnimationFrame(tick)
  }

  function cancel() {
    cancelAnimationFrame(frame.current)
    pointer.current = null
    setDragging(null)
    setTarget(null)
  }

  async function move(sourceId: string, destination: DropTarget) {
    if (disabled || pending.current) return
    const next = reorderVisibleTodos(items, visible.map(item => item.id), sourceId, destination.id, destination.after)
    if (next.every((item, index) => item.id === items[index].id)) return
    pending.current = true
    try {
      const saved = await save(next)
      setAnnouncement(saved ? `우선순위를 ${next.findIndex(item => item.id === sourceId) + 1}번째로 바꿨어요.` : '순서를 저장하지 못해 기존 우선순위를 유지했어요.')
    } finally {
      pending.current = false
      requestAnimationFrame(() => {
        const handle = document.getElementById(`todo-order-${sourceId}`)
        handle?.focus({ preventScroll: true })
        handle?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      })
    }
  }

  function onPointerDown(event: PointerEvent<HTMLElement>, id: string) {
    if (disabled || pending.current || event.button !== 0 || !event.isPrimary) return
    const control = (event.target as HTMLElement).closest('button, input, textarea, a, form')
    if (control && !control.hasAttribute('data-todo-drag')) return
    event.preventDefault()
    document.getElementById(`todo-order-${id}`)?.focus({ preventScroll: true })
    pointer.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, started: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    frame.current = requestAnimationFrame(tick)
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = pointer.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.x = event.clientX
    drag.y = event.clientY
    if (!drag.started && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 5) {
      drag.started = true
      setDragging(drag.id)
    }
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const drag = pointer.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.x = event.clientX
    drag.y = event.clientY
    const destination = getTarget()
    cancel()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (destination) void move(drag.id, destination)
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>, id: string) {
    if (!(event.target as HTMLElement).closest('[data-todo-drag]')) return
    if (event.key === 'Escape') { cancel(); return }
    if (disabled || pointer.current || pending.current || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = visible.findIndex(item => item.id === id)
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : index + (event.key === 'ArrowUp' ? -1 : 1)
    if (visible[nextIndex]) void move(id, { id: visible[nextIndex].id, after: nextIndex > index })
  }

  return { list, dragging, target, announcement, onPointerDown, onPointerMove, onPointerUp, onKeyDown, cancel }
}
