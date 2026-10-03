import { useRef, useState } from 'react'
import { Check, ListTodo, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { TimePicker } from '@/components/ui/time-picker'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
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
  const [daily, setDaily] = useState(false)
  const [resetTime, setResetTime] = useState('09:00')
  const [addingDaily, setAddingDaily] = useState(false)
  const [draftResetTime, setDraftResetTime] = useState('09:00')
  const [editing, setEditing] = useState<Todo | null>(null)
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState<Todo | null>(null)
  const [deletingAll, setDeletingAll] = useState<Todo[] | null>(null)
  const [deleteAllFailed, setDeleteAllFailed] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const deleteTrigger = useRef<HTMLButtonElement | null>(null)
  const disabled = todos.loading || todos.busy || !!todos.error
  const regularItems = todos.items.filter(item => !item.reset_time)
  const completedCount = todos.items.filter(item => item.completed).length
  const visible = todos.items.filter(item => item.completed === (filter === 'completed'))
  const order = useTodoReorder(todos.items, visible, todos.reorder, disabled || addingDaily || !!editing || !!deleting || !!deletingAll)
  const interacting = disabled || !!order.dragging
  const filterCounts = { active: todos.items.length - completedCount, completed: completedCount }
  async function addTodo(time: string | null) {
    if (!await todos.save(title, undefined, false, time)) return
    setTitle('')
    setAddingDaily(false)
    setFilter('active')
    requestAnimationFrame(() => input.current?.focus())
  }
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
  return <Tooltip.Provider delayDuration={200}><section aria-labelledby="todos-title" className={cn('flex h-96 min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:p-6', className)}>
    <div className="flex items-center gap-2">
      <ListTodo className="size-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
      <h2 id="todos-title" className="text-base sm:text-lg">할 일 리스트</h2>
      <Button type="button" variant="destructive-ghost" size="sm" disabled={interacting || !!editing || regularItems.length === 0} onClick={event => { deleteTrigger.current = event.currentTarget; setDeleteAllFailed(false); setDeletingAll([...regularItems]) }} className="ml-auto h-8 shrink-0 gap-1.5 px-2 text-xs"><Trash2 aria-hidden="true" className="size-3.5" />전체 삭제</Button>
    </div>
    <div role="group" aria-label="할 일 필터" className="mt-3 flex shrink-0 gap-1 rounded-xl bg-secondary/60 p-1">
      {filters.map(({ id, label }) => <Button key={id} type="button" variant={filter === id ? 'default' : 'ghost'} size="sm" aria-pressed={filter === id} disabled={todos.busy || !!order.dragging || !!editing} onClick={() => setFilter(id)} className={cn('h-8 min-w-0 flex-1 gap-1 rounded-lg px-1 text-xs text-muted-foreground', filter === id ? 'text-primary-foreground shadow-sm' : 'text-muted-foreground')}>
        {label}<span aria-hidden="true" className="text-[10px] tabular-nums opacity-70">{filterCounts[id]}</span>
      </Button>)}
    </div>
    <form className="mt-3 grid gap-2" onSubmit={async event => {
      event.preventDefault()
      if (interacting || editing || !title.trim()) return
      if (daily) setAddingDaily(true)
      else await addTodo(null)
    }}>
      <div className="flex gap-2">
      <Tooltip.Root>
        <Tooltip.Trigger asChild><Button type="button" size="icon" variant={daily ? 'default' : 'outline'} aria-label={daily ? '일반으로 바꾸기' : '데일리로 바꾸기'} aria-pressed={daily} disabled={interacting || !!editing} onClick={() => setDaily(value => !value)} className="size-11 shrink-0"><span aria-hidden="true" className="text-base leading-none">🔄</span></Button></Tooltip.Trigger>
        <Tooltip.Portal><Tooltip.Content side="top" sideOffset={6} collisionPadding={12} className="z-50 rounded-md bg-tooltip px-2.5 py-1.5 text-xs text-tooltip-foreground shadow-sm">{daily ? '일반으로 바꾸기' : '데일리로 바꾸기'}</Tooltip.Content></Tooltip.Portal>
      </Tooltip.Root>
      <Input ref={input} aria-label="새 할 일" placeholder="할 일을 적어 보세요" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} readOnly={todos.busy} disabled={todos.loading || !!todos.error} className="h-11 min-w-0 px-4 py-3" />
      <Button type="submit" size="icon" aria-label="할 일 추가" disabled={interacting || !!editing || !title.trim()} className="size-11 shrink-0"><Plus aria-hidden="true" className="size-4" /></Button>
      </div>
    </form>
    <Dialog open={addingDaily} onOpenChange={open => { if (!todos.busy) setAddingDaily(open) }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={!todos.busy} onEscapeKeyDown={event => { if (todos.busy) event.preventDefault() }} onCloseAutoFocus={event => { event.preventDefault(); input.current?.focus() }}>
        <DialogTitle>데일리 초기화 시각</DialogTitle>
        <DialogDescription className="break-words">‘{title.trim()}’의 완료 체크를 매일 초기화할 시각을 정해 주세요.</DialogDescription>
        <form className="grid gap-5" onSubmit={async event => { event.preventDefault(); await addTodo(resetTime) }}>
          <TimePicker label="매일 초기화 시각 (한국 시간)" value={resetTime} onChange={setResetTime} disabled={disabled} />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={todos.busy} onClick={() => setAddingDaily(false)}>취소</Button>
            <Button type="submit" disabled={disabled || !title.trim()}>{todos.busy ? '추가 중…' : '추가'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <p id="todo-order-keyboard" className="sr-only">할 일 영역을 드래그하거나 위아래 방향키로 순서를 바꾸세요. Home과 End로 맨 위와 아래로 이동하고 Escape로 드래그를 취소합니다.</p>
    <span aria-live="polite" aria-atomic="true" className="sr-only">{order.announcement}</span>
    {todos.loading ? <p role="status" className="mt-5 text-sm text-muted-foreground">할 일을 불러오는 중…</p> : todos.error ? <div role="alert" className="mt-3 overflow-y-auto text-sm text-destructive">{todos.error} <Button variant="outline" size="sm" onClick={todos.retry}>다시 불러오기</Button></div> : <ul ref={order.list} aria-label="할 일 목록" aria-busy={todos.busy} tabIndex={0} className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain rounded-lg p-0.5 focus-visible:outline-2 focus-visible:outline-ring">
      {visible.length ? visible.map(item => <li key={item.id} data-todo-id={item.id} onPointerDown={event => order.onPointerDown(event, item.id)} onPointerMove={order.onPointerMove} onPointerUp={order.onPointerUp} onPointerCancel={order.cancel} onLostPointerCapture={order.cancel} onKeyDown={event => order.onKeyDown(event, item.id)} className={cn('relative flex touch-none items-start gap-2 rounded-xl bg-secondary/30 p-2', !disabled && !editing && 'cursor-grab active:cursor-grabbing', order.dragging === item.id && 'bg-accent opacity-60')}>
        {order.target?.id === item.id && order.dragging !== item.id && <span aria-hidden="true" className={cn('pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-primary', order.target.after ? '-bottom-0.5' : '-top-0.5')} />}
        {editing?.id === item.id ? <form className="flex min-w-0 flex-1 flex-wrap gap-1" onSubmit={async event => {
          event.preventDefault()
          if (await todos.save(draft, editing, editing.completed, editing.reset_time ? draftResetTime : null)) finishEditing()
        }}>
          {editing.reset_time && <div className="w-full"><TimePicker label="매일 초기화 시각 (한국 시간)" value={draftResetTime} onChange={setDraftResetTime} disabled={todos.busy} /></div>}
          <Input autoFocus aria-label="할 일 수정" maxLength={200} value={draft} readOnly={todos.busy} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && !todos.busy) finishEditing() }} className="min-w-0 flex-1 basis-28" />
          <Button size="icon" variant="ghost" type="submit" aria-label="수정 저장" disabled={disabled || !draft.trim()}><Check className="size-4" aria-hidden="true" /></Button>
          <Button size="icon" variant="ghost" type="button" aria-label="수정 취소" onClick={finishEditing} disabled={todos.busy}><X className="size-4" aria-hidden="true" /></Button>
        </form> : <>
          <input type="checkbox" checked={item.completed} disabled={interacting || !!editing} onChange={async () => { if (await todos.save(item.title, item, !item.completed)) requestAnimationFrame(() => order.list.current?.focus()) }} aria-label={`${item.title} 완료`} className="mt-2 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default" />
          <button id={`todo-order-${item.id}`} data-todo-drag type="button" aria-label={`${item.title} 순서 변경`} aria-describedby="todo-order-keyboard" disabled={disabled || !!editing} className={cn('min-h-8 min-w-0 flex-1 select-none rounded-md py-1.5 text-left text-sm break-words cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default', item.completed && 'text-muted-foreground')}><span className={cn(item.completed && 'line-through')}>{item.title}</span>{item.reset_time && <span aria-label={`데일리 할 일, 매일 ${item.reset_time} 초기화 (한국 시간)`} className="ml-1.5 inline-flex align-middle items-center gap-1 whitespace-nowrap px-1.5 py-0.5 text-[11px] tabular-nums rounded-md bg-primary/10 text-primary"><span aria-hidden="true">🔄</span>{item.reset_time}</span>}</button>
          <Button id={`todo-edit-${item.id}`} variant="ghost" size="icon" aria-label={`${item.title} 수정`} disabled={interacting || !!editing} onClick={() => { setEditing(item); setDraft(item.title); setDraftResetTime(item.reset_time ?? '09:00') }} className="size-8 shrink-0"><Pencil className="size-3.5" aria-hidden="true" /></Button>
          <Button variant="destructive-ghost" size="icon" aria-label={`${item.title} 삭제`} disabled={interacting || !!editing} onClick={event => { deleteTrigger.current = event.currentTarget; setDeleting(item) }} className="size-8 shrink-0"><Trash2 className="size-3.5" aria-hidden="true" /></Button>
        </>}
      </li>) : <li className="py-6 text-center text-sm text-muted-foreground">{filters.find(item => item.id === filter)?.empty}</li>}
    </ul>}
    <AlertDialog open={!!deleting || !!deletingAll} onOpenChange={open => { if (!open) closeDelete() }}>
      <AlertDialogContent onEscapeKeyDown={event => { if (todos.busy) event.preventDefault() }} onOverlayClick={closeDelete} onCloseAutoFocus={event => { event.preventDefault(); (deleteTrigger.current?.isConnected && !deleteTrigger.current.disabled ? deleteTrigger.current : input.current)?.focus() }}>
        <AlertDialogTitle>{deletingAll ? '전체 삭제하시겠습니까?' : '할 일을 삭제할까요?'}</AlertDialogTitle>
        <AlertDialogDescription className="break-words">{deletingAll ? `현재 필터와 관계없이 완료한 일반 할 일을 포함한 ${deletingAll.length}개의 일반 할 일이 삭제됩니다. 데일리 할 일은 유지됩니다. 삭제한 할 일은 복구할 수 없습니다.` : `‘${deleting?.title}’ 항목이 삭제돼요.`}</AlertDialogDescription>
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
  </section></Tooltip.Provider>
}
