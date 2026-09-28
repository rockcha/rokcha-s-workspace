import { PageHeader } from '@/components/layout/page-header'
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, FolderInput, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FolderPicker } from '@/features/notes/folder-picker'
import { buildFolderTree } from '@/features/notes/folder-tree'
import { requestNotes } from '@/features/notes/api'
import type { Note, NoteFolder, NotesAction, NotesData } from '@/features/notes/api'

type Editor = { kind: 'move-folder' | 'folder' | 'move'; id?: string; name: string; folder_id: string; parent_id: string }
type Removal = { kind: 'folder' | 'note'; id: string; name: string }
const emptyEditor = { name: '', folder_id: '', parent_id: '' }

export function NotesManager({ token, folderId }: { token: string; folderId: string }) {
  const [data, setData] = useState<NotesData>({ folders: [], notes: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const filter = folderId || 'all'
  function setFilter(id: string) {
    window.location.hash = id === 'all' ? '/notes' : `/notes?folder=${encodeURIComponent(id)}`
  }
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
        if (folderId && !result.folders.some(folder => folder.id === folderId)) setFilter('all')
      }
    }).catch(() => {
      if (active) setLoadError('메모함을 불러오지 못했어요. 연결 상태를 확인한 후 다시 시도해 주세요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, retry, folderId])

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
    if (kind === 'note') {
      const targetFolder = note?.folder_id ?? folderId ?? (filter !== 'all' ? filter : data.folders[0]?.id ?? '')
      window.location.hash = `/notes/${note?.id ?? 'new'}?folder=${encodeURIComponent(targetFolder)}`
      return
    }
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
    if (editor.kind === 'move-folder') {
      void mutate('move_folder', { id: editor.id!, parent_id: editor.parent_id }, '폴더를 이동했어요.')
    } else if (editor.kind === 'folder') {
      if (!editor.name.trim()) { setFormError('폴더 이름을 입력해 주세요.'); return }
      void mutate(editor.id ? 'rename_folder' : 'create_folder', { ...(editor.id ? { id: editor.id } : {}), name: editor.name.trim(), parent_id: editor.parent_id }, editor.id ? '폴더 이름을 변경했어요.' : '폴더를 만들었어요.')
    } else {
      if (!editor.folder_id) { setFormError('폴더를 선택해 주세요.'); return }
      void mutate('move_note', { id: editor.id!, folder_id: editor.folder_id }, '메모를 이동했어요.')
    }
  }

  const folderTree = buildFolderTree(data.folders)
  const currentFolder = folderTree.find(folder => folder.id === filter)
  const breadcrumbs = currentFolder ? [...currentFolder.ancestors, currentFolder.id].map(id => folderTree.find(folder => folder.id === id)!) : []
  const visibleFolders = folderTree.filter(folder => (folder.parent_id ?? null) === (filter === 'all' ? null : filter))
  const visibleNotes = data.notes.filter(note => note.folder_id === filter)
  const removedFolders = new Set(removal?.kind === 'folder' ? folderTree.filter(folder => folder.id === removal.id || folder.ancestors.includes(removal.id)).map(folder => folder.id) : [])
  const removedNotes = data.notes.filter(note => removedFolders.has(note.folder_id)).length

  function noteList(notes: Note[]) {
    return <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{notes.map(note => (
      <li key={note.id} className="flex min-w-0 flex-col items-stretch gap-2 rounded-xl border bg-card p-4 shadow-sm">
        <button type="button" onClick={() => openNote(note)} className="flex min-w-0 flex-1 items-start gap-3 rounded-md p-2 text-left outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="shrink-0 text-2xl" aria-hidden="true">📝</span>
          <span className="min-w-0"><span className="block truncate text-sm">{note.title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{note.content.trim() || '내용이 없는 메모'}</span></span>
        </button>
        <div className="flex shrink-0 items-center justify-end">
          <Button type="button" variant="ghost" size="icon" aria-label={`${note.title} 폴더 이동`} onClick={() => openNote(note, 'move')}><FolderInput className="text-muted-foreground" aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`${note.title} 삭제`} onClick={() => openRemoval({ kind: 'note', id: note.id, name: note.title })}><Trash2 className="text-muted-foreground" aria-hidden="true" /></Button>
        </div>
      </li>
    ))}</ul>
  }

  return (
    <section aria-labelledby="notes-title">
      <PageHeader>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <h1 id="notes-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="shrink-0 text-2xl">📝</span>메모함</h1>
        <div className="flex gap-2">
          <Button ref={addFolderButton} type="button" variant="outline" disabled={loading || Boolean(loadError)} onClick={() => openFolder()}><FolderPlus aria-hidden="true" />폴더 추가</Button>
          <Button type="button" disabled={loading || Boolean(loadError) || !data.folders.length} onClick={() => openNote()}><Plus aria-hidden="true" />메모 추가</Button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <nav aria-label="폴더 경로" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          <Button type="button" variant="ghost" size="sm" aria-current={filter === 'all' ? 'page' : undefined} onClick={() => setFilter('all')}>전체 폴더</Button>
          {breadcrumbs.map(folder => <span key={folder.id} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <button type="button" className="min-w-0 break-all rounded-md px-2 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-current={folder.id === filter ? 'page' : undefined} onClick={() => setFilter(folder.id)}>{folder.name}</button>
          </span>)}
        </nav>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>폴더 {visibleFolders.length}개{currentFolder && ` · 메모 ${visibleNotes.length}개`}</span><Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => setRetry(value => value + 1)}>새로고침</Button></div>
      </div>
      </PageHeader>
      {loading ? <p role="status" className="py-16 text-center text-sm text-muted-foreground">메모함을 불러오고 있어요.</p> : loadError ? <div role="alert" className="py-12 text-center"><p className="text-sm text-destructive">{loadError}</p><Button type="button" variant="outline" className="mt-4" onClick={() => setRetry(value => value + 1)}>다시 시도</Button></div> : !data.folders.length ? <div className="py-20 text-center"><span className="text-3xl" aria-hidden="true">📁</span><h2 className="mt-4 text-lg">첫 폴더를 만들어 보세요</h2><p className="mt-2 text-sm text-muted-foreground">폴더를 만든 뒤 그 안에 메모를 담을 수 있어요.</p><Button type="button" variant="outline" className="mt-5" onClick={() => openFolder()}>폴더 추가</Button></div> : (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleFolders.map(folder => (
            <section key={folder.id} className="min-w-0 overflow-hidden rounded-xl border border-primary/20 bg-secondary/70" aria-labelledby={`folder-title-${folder.id}`}>
              <div className="flex flex-col items-stretch gap-2 p-3">
                <button type="button" id={`folder-title-${folder.id}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-2 text-left text-sm outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setFilter(folder.id)}>
                  <span className="shrink-0 text-2xl" aria-hidden="true">📁</span><span className="truncate">{folder.name}</span><ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
                <div className="flex shrink-0 justify-end">
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name}에 메모 추가`} onClick={() => openNote(undefined, 'note', folder.id)}><Plus aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name} 폴더 이동`} onClick={() => { rememberFocus(); setEditor({ ...emptyEditor, kind: 'move-folder', id: folder.id, parent_id: folder.parent_id ?? '' }) }}><FolderInput className="text-muted-foreground" aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name} 이름 수정`} onClick={() => openFolder(folder)}><Pencil className="text-muted-foreground" aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name} 폴더 삭제`} onClick={() => openRemoval({ kind: 'folder', id: folder.id, name: folder.name })}><Trash2 className="text-muted-foreground" aria-hidden="true" /></Button>
                </div>
              </div>
            </section>
          ))}
          </div>
          {currentFolder && (visibleNotes.length ? <div>{noteList(visibleNotes)}</div> : <p className="py-12 text-center text-sm text-muted-foreground">이 폴더에는 아직 메모가 없어요. 새로운 메모를 남겨 보세요.</p>)}
        </div>
      )}

      <Dialog open={Boolean(editor)} onOpenChange={open => { if (!open && !pending.current) setEditor(null) }}>
        <DialogContent className="max-h-[85svh] overflow-y-auto" showCloseButton={!busy} onCloseAutoFocus={restoreFocus}>
          <DialogHeader><DialogTitle>{editor?.kind === 'move-folder' ? '폴더 이동' : editor?.kind === 'folder' ? editor.id ? '폴더 이름 수정' : '새 폴더' : editor?.kind === 'move' ? '메모 이동' : editor?.id ? '메모 수정' : '새 메모'}</DialogTitle><DialogDescription>{editor?.kind === 'folder' ? '생각을 담아 둘 폴더의 이름을 정해 주세요.' : editor?.kind === 'move' ? '메모를 담을 폴더를 선택해 주세요.' : '폴더를 고르고, 기억하고 싶은 내용을 적어 주세요.'}</DialogDescription></DialogHeader>
          {editor && <form onSubmit={event => { event.preventDefault(); saveEditor() }} className="space-y-5">
            <fieldset disabled={busy} className="min-w-0 space-y-5">
              {editor.kind === 'move-folder' ? <div className="space-y-2"><p className="text-sm">이동할 위치</p><FolderPicker folders={folderTree.filter(folder => folder.id !== editor.id && !folder.ancestors.includes(editor.id!))} value={editor.parent_id} onChange={parent_id => setEditor({ ...editor, parent_id })} /><p className="text-xs text-muted-foreground">하위 폴더와 내용도 함께 이동해요.</p></div> : editor.kind === 'folder' ? <>
                {!editor.id && <div className="space-y-2"><span id="folder-parent-label" className="block text-sm">폴더 위치</span><FolderPicker folders={folderTree} value={editor.parent_id} onChange={parent_id => setEditor({ ...editor, parent_id })} /><p className="break-words text-xs text-muted-foreground">선택한 위치: {folderTree.find(folder => folder.id === editor.parent_id)?.path ?? '최상위'}</p><p className="text-xs text-muted-foreground">선택한 폴더 안에 새 폴더가 만들어져요.</p></div>}
                <div className="space-y-2"><label htmlFor="folder-name" className="text-sm">폴더 이름</label><Input id="folder-name" value={editor.name} onChange={event => setEditor({ ...editor, name: event.target.value })} placeholder="예: 일상, 아이디어" maxLength={60} required /></div>
              </> : <>
                <div className="space-y-2"><span className="block text-sm">폴더</span><FolderPicker label="폴더" allowRoot={false} folders={folderTree} value={editor.folder_id} onChange={folder_id => setEditor({ ...editor, folder_id })} /><p className="break-words text-xs text-muted-foreground">선택한 위치: {folderTree.find(folder => folder.id === editor.folder_id)?.path}</p></div>
              </>}
            </fieldset>
            {formError && <p role="alert" className="text-sm leading-6 text-destructive">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setEditor(null)}>취소</Button><Button type="submit" disabled={busy}>{busy ? '저장 중…' : (editor.kind === 'move' || editor.kind === 'move-folder') ? '이동' : '저장'}</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removal)} onOpenChange={open => { if (!open && !pending.current) setRemoval(null) }}>
        <AlertDialogContent onOverlayClick={() => { if (!pending.current) setRemoval(null) }} onCloseAutoFocus={restoreFocus} className="max-h-[85svh] overflow-y-auto">
          <AlertDialogHeader><AlertDialogTitle>{removal?.kind === 'folder' ? '폴더를 삭제할까요?' : '메모를 삭제할까요?'}</AlertDialogTitle><AlertDialogDescription className="break-words leading-7">{removal?.kind === 'folder' ? `‘${removal.name}’ 폴더와 하위 폴더 ${Math.max(0, removedFolders.size - 1)}개, 그 안의 메모 ${removedNotes}개가 모두 삭제돼요. 이 작업은 되돌릴 수 없어요.` : `‘${removal?.name}’ 메모가 삭제돼요. 이 작업은 되돌릴 수 없어요.`}</AlertDialogDescription></AlertDialogHeader>
          {formError && <p role="alert" className="text-sm leading-6 text-destructive">{formError}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>취소</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={event => { event.preventDefault(); if (removal) void mutate(removal.kind === 'folder' ? 'delete_folder' : 'delete_note', { id: removal.id }, removal.kind === 'folder' ? '폴더와 포함된 메모를 삭제했어요.' : '메모를 삭제했어요.') }}>{busy ? '삭제 중…' : removal?.kind === 'folder' ? '폴더와 메모 삭제' : '메모 삭제'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
