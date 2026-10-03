import { isTodoCompleted } from '@/features/todos/daily'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from '@/features/workspace-data/use-collection'

export type Todo = { id: string; title: string; completed: boolean; revision: number; priority: number; reset_time?: string | null; completed_at?: string | null }

function validTodo(value: unknown): value is Todo {
  if (!value || typeof value !== 'object') return false
  const item = value as Todo
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.completed === 'boolean' && Number.isInteger(item.revision) && Number.isInteger(item.priority) && item.priority > 0
    && (item.reset_time == null || (typeof item.reset_time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.reset_time)))
    && (item.completed_at == null || (typeof item.completed_at === 'string' && Number.isFinite(Date.parse(item.completed_at))))
}

export function useTodos(token: string) {
  const collection = useCollection(token, 'todo', validTodo)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const timer = window.setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const items = collection.items.map(item => ({ ...item, completed: isTodoCompleted(item, now) }))
  async function save(title: string, item?: Todo, completed = item?.completed ?? false, resetTime = item?.reset_time ?? null) {
    if (!title.trim() || title.trim().length > 200 || (resetTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(resetTime))) return false
    const error = await collection.mutate('save', { id: item?.id ?? crypto.randomUUID(), revision: item?.revision ?? 0, title: title.trim(), completed, resetTime, renewCompletion: completed && !item?.completed })
    if (error) toast.error(error, { id: 'todo-mutation' })
    else toast.success(!item ? '할 일을 추가했어요.' : completed !== item.completed ? completed ? '할 일을 완료했어요.' : '할 일 완료를 취소했어요.' : '할 일을 수정했어요.', { id: 'todo-mutation' })
    return !error
  }
  async function remove(item: Todo) {
    const error = await collection.mutate('delete', { id: item.id, revision: item.revision })
    if (error) toast.error(error, { id: 'todo-mutation' })
    else toast.success('할 일을 삭제했어요.', { id: 'todo-mutation' })
    return !error
  }
  async function reorder(items: Todo[]) {
    const error = await collection.mutate('reorder', { items: items.map(({ id, revision }) => ({ id, revision })) })
    if (error) toast.error(error, { id: 'todo-mutation', action: { label: '다시 불러오기', onClick: collection.retry } })
    else toast.success('할 일 우선순위를 바꿨어요.', { id: 'todo-mutation' })
    return !error
  }
  async function removeAll(items: Todo[]) {
    const error = await collection.mutate('delete_all', { confirmed: true, items: items.filter(item => !item.reset_time).map(({ id, revision }) => ({ id, revision })) })
    if (error) toast.error(error, { id: 'todo-mutation' })
    else toast.success('일반 할 일을 전체 삭제했어요.', { id: 'todo-mutation' })
    return !error
  }
  return { ...collection, items, save, remove, reorder, removeAll }
}

export type TodosState = ReturnType<typeof useTodos>
