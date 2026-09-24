import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Folder, FolderInput, FolderPlus, Pencil, Plus, StickyNote, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { buildFolderTree } from '@/features/notes/folder-tree'
import { requestNotes } from '@/features/notes/api'
import type { Note, NoteFolder, NotesAction, NotesData } from '@/features/notes/api'
import { cn } from '@/lib/utils'

type Editor = { kind: 'folder' | 'note' | 'move'; id?: string; name: string; title: string; content: string; folder_id: string; parent_id: string }
type Removal = { kind: 'folder' | 'note'; id: string; name: string }
const emptyEditor = { name: '', title: '', content: '', folder_id: '', parent_id: '' }
const selectClass = 'h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50'

export function NotesManager({ token }: { token: string }) {
  const [data, setData] = useState<NotesData>({ folders: [], notes: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [view, setView] = useState('folders')
  const [filter, setFilter] = useState('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editor, setEditor] = useState<Editor | null>(null)
  const [removal, setRemoval] = useState<Removal | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const pending = useRef(false)
  const focusOrigin = useRef<HTMLElement | null>(null)
  const addFolderButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    requestNotes(token, 'list').then(result => {
      if (active) {
        setData(result)
        setFilter(previous => previous === 'all' || result.folders.some(folder => folder.id === previous) ? previous : 'all')
      }
    }).catch(() => {
      if (active) setLoadError('메모함을 불러오지 못했어요. 연결 상태를 확인한 후 다시 시도해 주세요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, retry])

  function rememberFocus() {
    focusOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setFormError('')
  }

  function restoreFocus(event: Event) {
    event.preventDefault()
    const target = focusOrigin.current
    if (target?.isConnected) target.focus()
    else addFolderButton.current?.focus()
  }

  function openFolder(folder?: NoteFolder) {
    rememberFocus()
    setEditor({ ...emptyEditor, kind: 'folder', id: folder?.id, name: folder?.name ?? '', parent_id: folder?.parent_id ?? (filter === 'all' ? '' : filter) })
  }

  function openNote(note?: Note, kind: 'note' | 'move' = 'note', folderId?: string) {
    rememberFocus()
    setEditor({ ...emptyEditor, ...note, kind, folder_id: note?.folder_id ?? folderId ?? (filter !== 'all' ? filter : data.folders[0]?.id ?? '') })
  }

  function openRemoval(value: Removal) {
    rememberFocus()
    setRemoval(value)
  }

  async function mutate(action: NotesAction, payload: Record<string, string>, message: string) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setFormError('')
    try {
      const result = await requestNotes(token, action, payload)
      setData(result)
      if (filter !== 'all' && !result.folders.some(folder => folder.id === filter)) setFilter('all')
      const destination = payload.folder_id || payload.parent_id
      if (destination) setCollapsed(previous => {
        const next = new Set(previous)
        const entry = buildFolderTree(result.folders).find(folder => folder.id === destination)
        for (const id of [...(entry?.ancestors ?? []), destination]) next.delete(id)
        return next
      })
      setEditor(null)
      setRemoval(null)
      toast.success(message, { id: 'notes-mutation' })
    } catch {
      setFormError('저장하지 못했어요. 연결 상태를 확인해 주세요. 항목이 변경되었거나 삭제됐다면 창을 닫고 목록을 새로고침해 주세요.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  function saveEditor() {
    if (!editor) return
    if (editor.kind === 'folder') {
      if (!editor.name.trim()) { setFormError('폴더 이름을 입력해 주세요.'); return }
      void mutate(editor.id ? 'rename_folder' : 'create_folder', { ...(editor.id ? { id: editor.id } : {}), name: editor.name.trim(), parent_id: editor.parent_id }, editor.id ? '폴더 이름을 변경했어요.' : '폴더를 만들었어요.')
    } else {
      if (!editor.folder_id || (editor.kind === 'note' && !editor.title.trim())) { setFormError('폴더를 선택하고 메모 제목을 입력해 주세요.'); return }
      void mutate(editor.kind === 'move' ? 'move_note' : editor.id ? 'update_note' : 'create_note', {
        ...(editor.id ? { id: editor.id } : {}), folder_id: editor.folder_id, title: editor.title.trim(), content: editor.content,
      }, editor.kind === 'move' ? '메모를 이동했어요.' : '메모를 저장했어요.')
    }
  }

  const folderTree = buildFolderTree(data.folders)
  const selectedFolders = folderTree.filter(folder => filter === 'all' || folder.id === filter || folder.ancestors.includes(filter))
  const selectedIds = new Set(selectedFolders.map(folder => folder.id))
  const filterDepth = folderTree.find(folder => folder.id === filter)?.depth ?? 0
  const visibleFolders = selectedFolders.filter(folder => !folder.ancestors.some((id, index) => index >= filterDepth && collapsed.has(id)))
  const visibleNotes = data.notes.filter(note => selectedIds.has(note.folder_id))
  const folderNames = new Map(folderTree.map(folder => [folder.id, folder.path]))
  const removedFolders = new Set(removal?.kind === 'folder' ? folderTree.filter(folder => folder.id === removal.id || folder.ancestors.includes(removal.id)).map(folder => folder.id) : [])
  const removedNotes = data.notes.filter(note => removedFolders.has(note.folder_id)).length

  function noteList(notes: Note[]) {
    return <ul className="divide-y">{notes.map(note => (
      <li key={note.id} className="flex flex-wrap items-center gap-1 px-3 py-3 sm:px-5">
        <button type="button" onClick={() => openNote(note)} className="flex min-w-0 flex-1 items-start gap-3 rounded-md p-2 text-left outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring">
          <StickyNote className="mt-1 size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          <span className="min-w-0"><span className="block truncate text-sm">{note.title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{note.content.trim() || '내용이 없는 메모'}</span><span className="mt-2 block truncate text-xs text-muted-foreground">{view === 'latest' && `${folderNames.get(note.folder_id) ?? ''} · `}{new Date(note.created_at).toLocaleDateString('ko-KR')} 작성</span></span>
        </button>
        <div className="flex shrink-0 items-center">
          <Button type="button" variant="ghost" size="icon" aria-label={`${note.title} 폴더 이동`} onClick={() => openNote(note, 'move')}><FolderInput className="text-muted-foreground" aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`${note.title} 삭제`} onClick={() => openRemoval({ kind: 'note', id: note.id, name: note.title })}><Trash2 className="text-muted-foreground" aria-hidden="true" /></Button>
        </div>
      </li>
    ))}</ul>
  }

  return (
    <section aria-labelledby="notes-title">
      <p className="text-xs tracking-widest text-primary">생각을 모으는 곳</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-5">
        <h1 id="notes-title" className="text-3xl tracking-tight">메모함</h1>
        <div className="flex gap-2">
          <Button ref={addFolderButton} type="button" variant="outline" disabled={loading || Boolean(loadError)} onClick={() => openFolder()}><FolderPlus aria-hidden="true" />폴더 추가</Button>
          <Button type="button" disabled={loading || Boolean(loadError) || !data.folders.length} onClick={() => openNote()}><Plus aria-hidden="true" />메모 추가</Button>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">작은 생각도 차곡차곡, 폴더에 담아 두세요.</p>
      <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="notes-view">보기 방식</label>
          <select id="notes-view" className={selectClass} value={view} onChange={event => setView(event.target.value)}><option value="folders">폴더별</option><option value="latest">최신순</option></select>
          <label className="sr-only" htmlFor="notes-folder-filter">폴더 필터</label>
          <select id="notes-folder-filter" className={cn(selectClass, 'max-w-44')} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">전체 폴더</option>{folderTree.map(folder => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>메모 {visibleNotes.length}개</span><Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => setRetry(value => value + 1)}>새로고침</Button></div>
      </div>
      {loading ? <p role="status" className="py-16 text-center text-sm text-muted-foreground">메모함을 불러오고 있어요.</p> : loadError ? <div role="alert" className="py-12 text-center"><p className="text-sm text-destructive">{loadError}</p><Button type="button" variant="outline" className="mt-4" onClick={() => setRetry(value => value + 1)}>다시 시도</Button></div> : !data.folders.length ? <div className="py-20 text-center"><Folder className="mx-auto size-8 text-primary" strokeWidth={1} aria-hidden="true" /><h2 className="mt-4 text-lg">첫 폴더를 만들어 보세요</h2><p className="mt-2 text-sm text-muted-foreground">폴더를 만든 뒤 그 안에 메모를 담을 수 있어요.</p><Button type="button" variant="outline" className="mt-5" onClick={() => openFolder()}>폴더 추가</Button></div> : (
        <div className="mt-5 space-y-4">
          {view === 'folders' ? visibleFolders.map(folder => {
            const notes = data.notes.filter(note => note.folder_id === folder.id)
            const expanded = !collapsed.has(folder.id)
            return <section key={folder.id} style={{ marginLeft: Math.min(folder.depth - filterDepth, 3) * 12 }} className="min-w-0 overflow-hidden rounded-xl border bg-card" aria-labelledby={`folder-title-${folder.id}`}>
              {folder.depth > 0 && <p className="truncate border-b bg-muted/40 px-5 py-2 text-xs text-muted-foreground" title={folder.path}>{folder.path}</p>}
              <div className="flex flex-wrap items-center gap-1 p-3 sm:px-5">
                <button type="button" id={`folder-title-${folder.id}`} aria-expanded={expanded} aria-controls={`folder-notes-${folder.id}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next })}>
                  <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')} aria-hidden="true" /><Folder className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="truncate" title={folder.path}>{folder.name}</span><span className="text-xs text-muted-foreground">{notes.length}</span>
                </button>
                <div className="flex shrink-0">
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name}에 메모 추가`} onClick={() => openNote(undefined, 'note', folder.id)}><Plus aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name} 이름 수정`} onClick={() => openFolder(folder)}><Pencil className="text-muted-foreground" aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name} 폴더 삭제`} onClick={() => openRemoval({ kind: 'folder', id: folder.id, name: folder.name })}><Trash2 className="text-muted-foreground" aria-hidden="true" /></Button>
                </div>
              </div>
              <div id={`folder-notes-${folder.id}`} hidden={!expanded} className="border-t sm:ml-5">{notes.length ? noteList(notes) : <p className="px-6 py-9 text-sm text-muted-foreground">{data.folders.some(child => child.parent_id === folder.id) ? '아래에서 하위 폴더를 살펴보세요.' : '아직 메모가 없어요. 이 폴더에 첫 생각을 남겨 보세요.'}</p>}</div>
            </section>
          }) : visibleNotes.length ? <div className="overflow-hidden rounded-xl border bg-card">{noteList(visibleNotes)}</div> : <p className="py-16 text-center text-sm text-muted-foreground">아직 메모가 없어요. 새로운 메모를 남겨 보세요.</p>}
        </div>
      )}

      <Dialog open={Boolean(editor)} onOpenChange={open => { if (!open && !pending.current) setEditor(null) }}>
        <DialogContent className="max-h-[85svh] overflow-y-auto" showCloseButton={!busy} onCloseAutoFocus={restoreFocus} onPointerDownOutside={event => event.preventDefault()}>
          <DialogHeader><DialogTitle>{editor?.kind === 'folder' ? editor.id ? '폴더 이름 수정' : '새 폴더' : editor?.kind === 'move' ? '메모 이동' : editor?.id ? '메모 수정' : '새 메모'}</DialogTitle><DialogDescription>{editor?.kind === 'folder' ? '생각을 담아 둘 폴더의 이름을 정해 주세요.' : editor?.kind === 'move' ? '메모를 담을 폴더를 선택해 주세요.' : '폴더를 고르고, 기억하고 싶은 내용을 적어 주세요.'}</DialogDescription></DialogHeader>
          {editor && <form onSubmit={event => { event.preventDefault(); saveEditor() }} className="space-y-5">
            <fieldset disabled={busy} className="min-w-0 space-y-5">
              {editor.kind === 'folder' ? <>
                {!editor.id && <div className="space-y-2"><label htmlFor="folder-parent" className="block text-sm">폴더 위치</label><select id="folder-parent" className={cn(selectClass, 'w-full')} value={editor.parent_id} onChange={event => setEditor({ ...editor, parent_id: event.target.value })}><option value="">최상위</option>{folderTree.map(folder => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select><p className="text-xs text-muted-foreground">선택한 폴더 안에 새 폴더가 만들어져요.</p></div>}
                <div className="space-y-2"><label htmlFor="folder-name" className="text-sm">폴더 이름</label><Input id="folder-name" value={editor.name} onChange={event => setEditor({ ...editor, name: event.target.value })} placeholder="예: 일상, 아이디어" maxLength={60} required /></div>
              </> : <>
                <div className="space-y-2"><label htmlFor="note-folder" className="block text-sm">폴더</label><select id="note-folder" className={cn(selectClass, 'w-full')} value={editor.folder_id} onChange={event => setEditor({ ...editor, folder_id: event.target.value })} required>{folderTree.map(folder => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select></div>
                {editor.kind === 'note' && <><div className="space-y-2"><label htmlFor="note-title" className="text-sm">제목</label><Input id="note-title" value={editor.title} onChange={event => setEditor({ ...editor, title: event.target.value })} placeholder="메모 제목" maxLength={120} required /></div><div className="space-y-2"><label htmlFor="note-content" className="text-sm">내용</label><Textarea id="note-content" className="min-h-48 max-h-80 resize-y" value={editor.content} onChange={event => setEditor({ ...editor, content: event.target.value })} placeholder="떠오르는 생각을 자유롭게 남겨 보세요." maxLength={50000} /></div></>}
              </>}
            </fieldset>
            {formError && <p role="alert" className="text-sm leading-6 text-destructive">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setEditor(null)}>취소</Button><Button type="submit" disabled={busy}>{busy ? '저장 중…' : editor.kind === 'move' ? '이동' : '저장'}</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removal)} onOpenChange={open => { if (!open && !pending.current) setRemoval(null) }}>
        <AlertDialogContent onCloseAutoFocus={restoreFocus} className="max-h-[85svh] overflow-y-auto">
          <AlertDialogHeader><AlertDialogTitle>{removal?.kind === 'folder' ? '폴더를 삭제할까요?' : '메모를 삭제할까요?'}</AlertDialogTitle><AlertDialogDescription className="break-words leading-7">{removal?.kind === 'folder' ? `‘${removal.name}’ 폴더와 하위 폴더 ${Math.max(0, removedFolders.size - 1)}개, 그 안의 메모 ${removedNotes}개가 모두 삭제돼요. 이 작업은 되돌릴 수 없어요.` : `‘${removal?.name}’ 메모가 삭제돼요. 이 작업은 되돌릴 수 없어요.`}</AlertDialogDescription></AlertDialogHeader>
          {formError && <p role="alert" className="text-sm leading-6 text-destructive">{formError}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>취소</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={event => { event.preventDefault(); if (removal) void mutate(removal.kind === 'folder' ? 'delete_folder' : 'delete_note', { id: removal.id }, removal.kind === 'folder' ? '폴더와 포함된 메모를 삭제했어요.' : '메모를 삭제했어요.') }}>{busy ? '삭제 중…' : removal?.kind === 'folder' ? '폴더와 메모 삭제' : '메모 삭제'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
