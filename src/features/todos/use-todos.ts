import { toast } from 'sonner'
import { useCollection } from '@/features/workspace-data/use-collection'

export type Todo = { id: string; title: string; completed: boolean; revision: number; priority: number }

function validTodo(value: unknown): value is Todo {
  if (!value || typeof value !== 'object') return false
  const item = value as Todo
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.completed === 'boolean' && Number.isInteger(item.revision) && Number.isInteger(item.priority) && item.priority > 0
}

export function useTodos(token: string) {
  const collection = useCollection(token, 'todo', validTodo)
  async function save(title: string, item?: Todo, completed = item?.completed ?? false) {
    if (!title.trim() || title.trim().length > 200) return false
    const error = await collection.mutate('save', { id: item?.id ?? crypto.randomUUID(), revision: item?.revision ?? 0, title: title.trim(), completed })
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
    const error = await collection.mutate('delete_all', { confirmed: true, items: items.map(({ id, revision }) => ({ id, revision })) })
    if (error) toast.error(error, { id: 'todo-mutation' })
    else toast.success('할 일을 전체 삭제했어요.', { id: 'todo-mutation' })
    return !error
  }
  return { ...collection, save, remove, reorder, removeAll }
}

export type TodosState = ReturnType<typeof useTodos>
