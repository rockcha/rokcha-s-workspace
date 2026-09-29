import type { Todo } from '@/features/todos/use-todos'

// 필터로 숨겨진 항목의 자리는 그대로 두고, 보이는 항목끼리 순서를 바꿉니다.
export function reorderVisibleTodos(items: Todo[], visibleIds: string[], sourceId: string, targetId: string, after: boolean) {
  const visible = new Set(visibleIds)
  const ordered = items.filter(item => visible.has(item.id))
  const source = ordered.find(item => item.id === sourceId)
  if (!source || sourceId === targetId || !ordered.some(item => item.id === targetId)) return items
  const next = ordered.filter(item => item.id !== sourceId)
  next.splice(next.findIndex(item => item.id === targetId) + Number(after), 0, source)
  let index = 0
  return items.map(item => visible.has(item.id) ? next[index++] : item)
}
