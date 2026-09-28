import { toast } from 'sonner'
import { useCollection } from '@/features/workspace-data/use-collection'

export type Todo = { id: string; title: string; completed: boolean; revision: number }

function validTodo(value: unknown): value is Todo {
  if (!value || typeof value !== 'object') return false
  const item = value as Todo
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.completed === 'boolean' && Number.isInteger(item.revision)
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
  return { ...collection, save, remove }
}

export type TodosState = ReturnType<typeof useTodos>
