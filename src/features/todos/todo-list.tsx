import { useRef, useState } from 'react'
import { Check, ListTodo, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import type { Todo, TodosState } from '@/features/todos/use-todos'
import { useTodoReorder } from '@/features/todos/use-todo-reorder'
import { cn } from '@/lib/utils'

const filters = [
  { id: 'active', label: '할 일', empty: '남은 할 일이 없어요.' },
  { id: 'completed', label: '완료한 일', empty: '아직 완료한 일이 없어요.' },
] as const

export function TodoList({ todos, className }: { todos: TodosState; className?: string }) {
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('active')
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState<Todo | null>(null)
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState<Todo | null>(null)
  const [deletingAll, setDeletingAll] = useState<Todo[] | null>(null)
  const [deleteAllFailed, setDeleteAllFailed] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const deleteTrigger = useRef<HTMLButtonElement | null>(null)
  const disabled = todos.loading || todos.busy || !!todos.error
  const completedCount = todos.items.filter(item => item.completed).length
  const visible = todos.items.filter(item => item.completed === (filter === 'completed'))
  const order = useTodoReorder(todos.items, visible, todos.reorder, disabled || !!editing || !!deleting || !!deletingAll)
  const interacting = disabled || !!order.dragging
  const filterCounts = { active: todos.items.length - completedCount, completed: completedCount }
  function finishEditing() {
    const id = editing?.id
    setEditing(null)
    requestAnimationFrame(() => { if (id) document.getElementById(`todo-edit-${id}`)?.focus() })
  }
  function closeDelete() {
    if (todos.busy) return
    setDeleting(null)
    setDeletingAll(null)
    setDeleteAllFailed(false)
  }
  return <section aria-labelledby="todos-title" className={cn('flex h-96 min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:p-6', className)}>
    <div className="flex items-center gap-2">
      <ListTodo className="size-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
      <h2 id="todos-title" className="text-base sm:text-lg">할 일 리스트</h2>
      <Button type="button" variant="destructive-ghost" size="sm" disabled={interacting || !!editing || todos.items.length === 0} onClick={event => { deleteTrigger.current = event.currentTarget; setDeleteAllFailed(false); setDeletingAll([...todos.items]) }} className="ml-auto h-8 shrink-0 gap-1.5 px-2 text-xs"><Trash2 aria-hidden="true" className="size-3.5" />전체 삭제</Button>
    </div>
    <div role="group" aria-label="할 일 필터" className="mt-3 flex shrink-0 gap-1 rounded-xl bg-secondary/60 p-1">
      {filters.map(({ id, label }) => <Button key={id} type="button" variant="ghost" size="sm" aria-pressed={filter === id} disabled={todos.busy || !!order.dragging || !!editing} onClick={() => setFilter(id)} className={cn('h-8 min-w-0 flex-1 gap-1 rounded-lg px-1 text-xs text-muted-foreground', filter === id && 'bg-card text-primary shadow-sm hover:bg-card')}>
        {label}<span aria-hidden="true" className="text-[10px] tabular-nums opacity-70">{filterCounts[id]}</span>
      </Button>)}
    </div>
    <form className="mt-4 flex gap-2" onSubmit={async event => {
      event.preventDefault()
      if (await todos.save(title)) { setTitle(''); if (filter === 'completed') setFilter('active'); input.current?.focus() }
    }}>
      <Input ref={input} aria-label="새 할 일" placeholder="할 일을 적어 보세요" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} readOnly={todos.busy} disabled={todos.loading || !!todos.error} className="h-11 min-w-0 px-4 py-3" />
      <Button type="submit" size="icon" aria-label="할 일 추가" disabled={interacting || !!editing || !title.trim()} className="size-11 shrink-0"><Plus aria-hidden="true" className="size-4" /></Button>
    </form>
    <p id="todo-order-keyboard" className="sr-only">할 일 영역을 드래그하거나 위아래 방향키로 순서를 바꾸세요. Home과 End로 맨 위와 아래로 이동하고 Escape로 드래그를 취소합니다.</p>
    <span aria-live="polite" aria-atomic="true" className="sr-only">{order.announcement}</span>
    {todos.loading ? <p role="status" className="mt-5 text-sm text-muted-foreground">할 일을 불러오는 중…</p> : todos.error ? <div role="alert" className="mt-3 overflow-y-auto text-sm text-destructive">{todos.error} <Button variant="outline" size="sm" onClick={todos.retry}>다시 불러오기</Button></div> : <ul ref={order.list} aria-label="할 일 목록" aria-busy={todos.busy} tabIndex={0} className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain rounded-lg p-0.5 focus-visible:outline-2 focus-visible:outline-ring">
      {visible.length ? visible.map(item => <li key={item.id} data-todo-id={item.id} onPointerDown={event => order.onPointerDown(event, item.id)} onPointerMove={order.onPointerMove} onPointerUp={order.onPointerUp} onPointerCancel={order.cancel} onLostPointerCapture={order.cancel} onKeyDown={event => order.onKeyDown(event, item.id)} className={cn('relative flex touch-none items-start gap-2 rounded-xl border border-transparent bg-secondary/30 p-2', !disabled && !editing && 'cursor-grab active:cursor-grabbing', order.dragging === item.id && 'border-primary/30 bg-accent opacity-60')}>
        {order.target?.id === item.id && order.dragging !== item.id && <span aria-hidden="true" className={cn('pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-primary', order.target.after ? '-bottom-0.5' : '-top-0.5')} />}
        {editing?.id === item.id ? <form className="flex min-w-0 flex-1 flex-wrap gap-1" onSubmit={async event => {
          event.preventDefault()
          if (await todos.save(draft, editing)) finishEditing()
        }}>
          <Input autoFocus aria-label="할 일 수정" maxLength={200} value={draft} readOnly={todos.busy} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && !todos.busy) finishEditing() }} className="min-w-0 flex-1 basis-28" />
          <Button size="icon" variant="ghost" type="submit" aria-label="수정 저장" disabled={disabled || !draft.trim()}><Check className="size-4" aria-hidden="true" /></Button>
          <Button size="icon" variant="ghost" type="button" aria-label="수정 취소" onClick={finishEditing} disabled={todos.busy}><X className="size-4" aria-hidden="true" /></Button>
        </form> : <>
          <input type="checkbox" checked={item.completed} disabled={interacting || !!editing} onChange={async () => { if (await todos.save(item.title, item, !item.completed)) requestAnimationFrame(() => order.list.current?.focus()) }} aria-label={`${item.title} 완료`} className="mt-2 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default" />
          <button id={`todo-order-${item.id}`} data-todo-drag type="button" aria-label={`${item.title} 순서 변경`} aria-describedby="todo-order-keyboard" disabled={disabled || !!editing} className={cn('min-h-8 min-w-0 flex-1 select-none rounded-md py-1.5 text-left text-sm break-words cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default', item.completed && 'text-muted-foreground line-through')}>{item.title}</button>
          <Button id={`todo-edit-${item.id}`} variant="ghost" size="icon" aria-label={`${item.title} 수정`} disabled={interacting || !!editing} onClick={() => { setEditing(item); setDraft(item.title) }} className="size-8 shrink-0"><Pencil className="size-3.5" aria-hidden="true" /></Button>
          <Button variant="destructive-ghost" size="icon" aria-label={`${item.title} 삭제`} disabled={interacting || !!editing} onClick={event => { deleteTrigger.current = event.currentTarget; setDeleting(item) }} className="size-8 shrink-0"><Trash2 className="size-3.5" aria-hidden="true" /></Button>
        </>}
      </li>) : <li className="py-6 text-center text-sm text-muted-foreground">{filters.find(item => item.id === filter)?.empty}</li>}
    </ul>}
    <AlertDialog open={!!deleting || !!deletingAll} onOpenChange={open => { if (!open) closeDelete() }}>
      <AlertDialogContent onEscapeKeyDown={event => { if (todos.busy) event.preventDefault() }} onOverlayClick={closeDelete} onCloseAutoFocus={event => { event.preventDefault(); (deleteTrigger.current?.isConnected && !deleteTrigger.current.disabled ? deleteTrigger.current : input.current)?.focus() }}>
        <AlertDialogTitle>{deletingAll ? '전체 삭제하시겠습니까?' : '할 일을 삭제할까요?'}</AlertDialogTitle>
        <AlertDialogDescription className="break-words">{deletingAll ? `현재 필터와 관계없이 완료한 일을 포함한 전체 ${deletingAll.length}개가 삭제됩니다. 삭제한 할 일은 복구할 수 없습니다.` : `‘${deleting?.title}’ 항목이 삭제돼요.`}</AlertDialogDescription>
        {deleteAllFailed && <p role="alert" className="text-sm text-destructive">삭제하지 못했어요. 목록을 다시 불러온 뒤 확인해 주세요.</p>}
        <AlertDialogFooter>
          {deleteAllFailed && <Button type="button" variant="outline" disabled={todos.busy} onClick={() => { closeDelete(); todos.retry() }}>다시 불러오기</Button>}
          <AlertDialogCancel disabled={todos.busy}>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive-ghost" disabled={todos.busy || deleteAllFailed} onClick={async event => {
            event.preventDefault()
            if (deletingAll) {
              if (await todos.removeAll(deletingAll)) { setDeletingAll(null); setFilter('active') }
              else setDeleteAllFailed(true)
            } else if (deleting && await todos.remove(deleting)) setDeleting(null)
          }}>{todos.busy ? '삭제 중…' : deletingAll ? '전체 삭제' : '삭제'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
}
