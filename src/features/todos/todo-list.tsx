import { useRef, useState } from 'react'
import { Check, ListTodo, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import type { Todo, TodosState } from '@/features/todos/use-todos'
import { cn } from '@/lib/utils'

export function TodoList({ todos }: { todos: TodosState }) {
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState<Todo | null>(null)
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState<Todo | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const deleteTrigger = useRef<HTMLButtonElement | null>(null)
  const disabled = todos.loading || todos.busy || !!todos.error
  const completedCount = todos.items.filter(item => item.completed).length
  function finishEditing() {
    const id = editing?.id
    setEditing(null)
    requestAnimationFrame(() => { if (id) document.getElementById(`todo-edit-${id}`)?.focus() })
  }
  return <section aria-labelledby="todos-title" className="flex h-80 min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
    <div className="flex items-center gap-2">
      <ListTodo className="size-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
      <h2 id="todos-title" className="text-base sm:text-lg">할 일 리스트</h2>
      <span aria-label={`전체 ${todos.items.length}개 중 ${completedCount}개 완료`} title="완료 / 전체" className="ml-auto text-xs tabular-nums text-muted-foreground">{completedCount}/{todos.items.length}</span>
    </div>
    <form className="mt-4 flex gap-2" onSubmit={async event => {
      event.preventDefault()
      if (await todos.save(title)) { setTitle(''); input.current?.focus() }
    }}>
      <Input ref={input} aria-label="새 할 일" placeholder="할 일을 적어 보세요" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} readOnly={todos.busy} disabled={todos.loading || !!todos.error} className="min-w-0" />
      <Button type="submit" size="icon" aria-label="할 일 추가" disabled={disabled || !title.trim()} className="shrink-0"><Plus aria-hidden="true" className="size-4" /></Button>
    </form>
    {todos.loading ? <p role="status" className="mt-5 text-sm text-muted-foreground">할 일을 불러오는 중…</p> : todos.error ? <div role="alert" className="mt-3 overflow-y-auto text-sm text-destructive">{todos.error} <Button variant="outline" size="sm" onClick={todos.retry}>다시 불러오기</Button></div> : <ul aria-label="할 일 목록" tabIndex={0} className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
      {todos.items.length ? todos.items.map(item => <li key={item.id} className="flex items-start gap-2 rounded-xl bg-secondary/30 p-2">
        {editing?.id === item.id ? <form className="flex min-w-0 flex-1 flex-wrap gap-1" onSubmit={async event => {
          event.preventDefault()
          if (await todos.save(draft, editing)) finishEditing()
        }}>
          <Input autoFocus aria-label="할 일 수정" maxLength={200} value={draft} readOnly={todos.busy} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && !todos.busy) finishEditing() }} className="min-w-0 flex-1 basis-28" />
          <Button size="icon" variant="ghost" type="submit" aria-label="수정 저장" disabled={disabled || !draft.trim()}><Check className="size-4" aria-hidden="true" /></Button>
          <Button size="icon" variant="ghost" type="button" aria-label="수정 취소" onClick={finishEditing} disabled={todos.busy}><X className="size-4" aria-hidden="true" /></Button>
        </form> : <>
          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 py-2">
            <input type="checkbox" checked={item.completed} disabled={disabled} onChange={() => void todos.save(item.title, item, !item.completed)} aria-label={`${item.title} 완료`} className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-ring" />
            <span className={cn('min-w-0 break-words text-sm', item.completed && 'text-muted-foreground line-through')}>{item.title}</span>
          </label>
          <Button id={`todo-edit-${item.id}`} variant="ghost" size="icon" aria-label={`${item.title} 수정`} disabled={disabled || !!editing} onClick={() => { setEditing(item); setDraft(item.title) }} className="size-8 shrink-0"><Pencil className="size-3.5" aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon" aria-label={`${item.title} 삭제`} disabled={disabled || !!editing} onClick={event => { deleteTrigger.current = event.currentTarget; setDeleting(item) }} className="size-8 shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" aria-hidden="true" /></Button>
        </>}
      </li>) : <li className="py-6 text-center text-sm text-muted-foreground">작은 할 일부터 하나씩 적어 보세요.</li>}
    </ul>}
    <AlertDialog open={!!deleting} onOpenChange={open => { if (!open && !todos.busy) setDeleting(null) }}>
      <AlertDialogContent onOverlayClick={() => { if (!todos.busy) setDeleting(null) }} onCloseAutoFocus={event => { event.preventDefault(); (deleteTrigger.current?.isConnected ? deleteTrigger.current : input.current)?.focus() }}>
        <AlertDialogTitle>할 일을 삭제할까요?</AlertDialogTitle>
        <AlertDialogDescription className="break-words">‘{deleting?.title}’ 항목이 삭제돼요.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={todos.busy}>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={todos.busy} onClick={async event => { event.preventDefault(); if (deleting && await todos.remove(deleting)) setDeleting(null) }}>삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
}
