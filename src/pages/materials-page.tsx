import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Download, ExternalLink, FileText, FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DriveButton } from '@/features/materials/drive-button'
import { requestMaterials } from '@/features/materials/api'
import type { Material, MaterialFolder } from '@/features/materials/api'
import { FolderPicker } from '@/components/folder-picker'
import { buildFolderTree } from '@/lib/folder-tree'
import { materialDownload } from '@/features/materials/download-url'
import type { DriveFile } from '@/features/materials/drive-picker'

export function MaterialsPage({ token }: { token: string }) {
  const [files, setFiles] = useState<Material[]>([])
  const [folders, setFolders] = useState<MaterialFolder[]>([])
  const [folderId, setFolderId] = useState('')
  const [folderEditor, setFolderEditor] = useState<{ id?: string; name: string; parent_id: string } | null>(null)
  const [folderRemoval, setFolderRemoval] = useState<MaterialFolder | null>(null)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<(DriveFile & { description: string; folder_id: string }) | null>(null)
  const [removal, setRemoval] = useState<Material | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const origin = useRef<HTMLElement | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const remaining = useRef<DriveFile[]>([])
  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    void requestMaterials(token, 'list').then(value => { if (active) { setFiles(value.files); setFolders(value.folders); setFolderId(current => value.folders.some(folder => folder.id === current) ? current : '') } }).catch(() => {
      if (active) setLoadError('자료실을 불러오지 못했어요. 연결과 자료실 저장 설정을 확인해 주세요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, attempt])
  function remember() { origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setError('') }
  function restore(event: Event) { event.preventDefault(); (origin.current?.isConnected ? origin.current : heading.current)?.focus() }
  function select(file: DriveFile) {
    remember()
    const existing = files.find(item => item.drive_id === file.id)
    setDraft({ ...file, description: existing?.description ?? '', folder_id: existing ? existing.folder_id ?? '' : folderId })
  }
  function selectFiles(selected: DriveFile[]) { remaining.current = selected.slice(1); select(selected[0]) }
  function nextDraft() {
    const next = remaining.current.shift()
    if (next) setDraft({ ...next, description: files.find(item => item.drive_id === next.id)?.description ?? '', folder_id: folderId })
    else setDraft(null)
  }
  async function save(action: 'save' | 'delete') {
    if (pending.current) return
    if (action === 'save' && !draft?.title.trim()) { setError('자료 제목을 입력해 주세요.'); return }
    if (action === 'delete' && !removal) return
    pending.current = true; setBusy(true); setError('')
    try {
      const result = await requestMaterials(token, action, action === 'save' ? { ...draft!, title: draft!.title.trim() } : { id: removal!.drive_id })
      setFiles(result.files); setFolders(result.folders); nextDraft(); setRemoval(null)
      toast.success(action === 'save' ? '저장됨.' : '자료실에서 제거했어요.', { id: 'materials-mutation' })
    } catch { setError('저장하지 못했어요. 선택한 자료는 유지했으니 다시 시도해 주세요.') }
    finally { pending.current = false; setBusy(false) }
  }
  async function saveFolder(remove = false) {
    if (pending.current || (!remove && !folderEditor?.name.trim())) return
    pending.current = true; setBusy(true); setError('')
    try {
      const result = await requestMaterials(token, remove ? 'delete_folder' : folderEditor?.id ? 'rename_folder' : 'create_folder', remove ? { id: folderRemoval!.id } : { ...folderEditor!, name: folderEditor!.name.trim() })
      setFiles(result.files); setFolders(result.folders)
      if (!result.folders.some(folder => folder.id === folderId)) setFolderId('')
      setFolderEditor(null); setFolderRemoval(null)
      toast.success(remove ? '폴더를 삭제했어요. 자료는 최상위로 옮겼어요.' : '저장됨.', { id: 'materials-mutation' })
    } catch { setError('폴더를 저장하지 못했어요. 다시 시도해 주세요.') }
    finally { pending.current = false; setBusy(false) }
  }
  const tree = buildFolderTree(folders)
  const current = tree.find(folder => folder.id === folderId)
  const breadcrumbs = current ? [...current.ancestors, current.id].map(id => tree.find(folder => folder.id === id)!) : []
  const visibleFolders = folders.filter(folder => (folder.parent_id ?? '') === folderId)
  const visible = files.filter(file => (file.folder_id ?? '') === folderId && `${file.title} ${file.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <section aria-labelledby="materials-title">
    <PageHeader>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 ref={heading} tabIndex={-1} id="materials-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="text-2xl">🗂️</span>자료실</h1>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={loading || !!loadError || busy} onClick={() => { remember(); setFolderEditor({ name: '', parent_id: folderId }) }}><FolderPlus aria-hidden="true" />폴더 추가</Button><DriveButton disabled={loading || !!loadError || busy || !!draft} onPick={selectFiles} /><DriveButton mode="upload" disabled={loading || !!loadError || busy || !!draft} onPick={selectFiles} /></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <nav aria-label="자료실 폴더 경로" className="flex min-w-0 flex-wrap items-center gap-1"><Button variant="ghost" size="sm" onClick={() => { setFolderId(''); setQuery('') }}>전체 폴더</Button>{breadcrumbs.map(folder => <span key={folder.id} className="flex min-w-0 items-center"><ChevronRight aria-hidden="true" className="size-4 shrink-0" /><button type="button" className="break-all rounded-md p-2 text-left text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setFolderId(folder.id); setQuery('') }}>{folder.name}</button></span>)}</nav>
        <Input aria-label="자료 검색" placeholder="현재 폴더에서 자료 검색" value={query} onChange={event => setQuery(event.target.value)} className="w-full sm:w-64" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>자료 {visible.length}개</span><Button variant="ghost" size="sm" disabled={loading || busy || !!draft || !!removal} onClick={() => setAttempt(value => value + 1)}>새로고침</Button></div>
      </div>
    </PageHeader>
    {!loading && !loadError && visibleFolders.length > 0 && <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleFolders.map(folder => <div key={folder.id} className="min-w-0 rounded-xl border bg-card p-3">
      <button type="button" className="flex w-full min-w-0 items-center gap-3 rounded-md p-2 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setFolderId(folder.id); setQuery('') }}><span aria-hidden="true" className="text-2xl">📁</span><span className="break-all">{folder.name}</span><ChevronRight aria-hidden="true" className="ml-auto size-4 shrink-0" /></button>
      <div className="flex justify-end"><Button size="icon" variant="ghost" aria-label={`${folder.name} 폴더 이름 수정`} onClick={() => { remember(); setFolderEditor({ id: folder.id, name: folder.name, parent_id: folder.parent_id ?? '' }) }}><Pencil aria-hidden="true" /></Button><Button size="icon" variant="ghost" aria-label={`${folder.name} 폴더 삭제`} onClick={() => { remember(); setFolderRemoval(folder) }}><Trash2 aria-hidden="true" /></Button></div>
    </div>)}</div>}
    {loading ? <p role="status" className="py-16 text-center text-muted-foreground">자료를 불러오고 있어요.</p> : loadError ? <div role="alert" className="py-12 text-center"><p>{loadError}</p><Button className="mt-4" variant="outline" onClick={() => setAttempt(value => value + 1)}>다시 시도</Button></div> : visible.length ? <ul aria-label="저장한 자료" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map(file => <li key={file.drive_id} className="min-w-0 rounded-xl border bg-card p-5 shadow-sm">
        <a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`${file.title} (새 탭)`} className="block w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="mb-5 flex items-center justify-between text-primary"><FileText aria-hidden="true" className="size-8" /><ExternalLink aria-hidden="true" className="size-4" /></div>
          <h2 className="break-words text-lg">{file.title}</h2>{file.description && <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-muted-foreground">{file.description}</p>}
        </a>
        <div className="mt-4 flex flex-wrap justify-end gap-1"><Button asChild variant="outline" size="sm"><a href={materialDownload(file).url} target="_blank" rel="noopener noreferrer" aria-label={`${file.title} ${materialDownload(file).label}`}><Download aria-hidden="true" />{materialDownload(file).label}</a></Button><Button variant="ghost" size="icon" aria-label={`${file.title} 수정`} onClick={() => select({ id: file.drive_id, title: file.title, url: file.url })}><Pencil aria-hidden="true" /></Button><Button variant="ghost" size="icon" aria-label={`${file.title} 자료실에서 제거`} onClick={() => { remember(); setRemoval(file) }}><Trash2 aria-hidden="true" /></Button></div>
      </li>)}
    </ul> : <div className="py-20 text-center text-muted-foreground"><FileText aria-hidden="true" className="mx-auto mb-4 size-9" /><p>{query ? '검색 결과가 없어요.' : '기존 드라이브 파일을 찾거나 새 파일을 업로드해 보세요.'}</p></div>}
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !pending.current) nextDraft() }}><DialogContent className="max-h-[85dvh] overflow-y-auto" onCloseAutoFocus={restore} showCloseButton={!busy}>
      <DialogHeader><DialogTitle>자료 저장</DialogTitle><DialogDescription>파일은 드라이브에 보관돼요. 제목과 설명을 확인해 주세요.</DialogDescription></DialogHeader>
      {draft && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void save('save') }}>
        <fieldset disabled={busy} className="min-w-0"><legend className="mb-2 text-sm">저장할 폴더</legend><FolderPicker folders={tree} value={draft.folder_id} onChange={folder_id => setDraft({ ...draft, folder_id })} /></fieldset>
        <div className="space-y-2"><label htmlFor="material-title">제목</label><Input id="material-title" required maxLength={120} disabled={busy} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></div>
        <div className="space-y-2"><label htmlFor="material-description">설명</label><Textarea id="material-description" maxLength={5000} disabled={busy} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></div>
        <a className="inline-block text-sm text-primary underline" href={draft.url} target="_blank" rel="noopener noreferrer">원본 확인 (새 탭)</a>
        <p className="text-xs text-muted-foreground">취소해도 이미 업로드한 파일은 드라이브에 남아요.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => nextDraft()}>취소</Button><Button type="submit" disabled={busy}>{busy ? '저장 중…' : '저장'}</Button></DialogFooter>
      </form>}
    </DialogContent></Dialog>

    <Dialog open={!!folderEditor} onOpenChange={open => { if (!open && !pending.current) setFolderEditor(null) }}><DialogContent onCloseAutoFocus={restore} showCloseButton={!busy} className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{folderEditor?.id ? '폴더 이름 수정' : '새 폴더'}</DialogTitle><DialogDescription>자료실에서 사용할 폴더를 만들어요.</DialogDescription></DialogHeader>
      {folderEditor && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void saveFolder() }}><fieldset disabled={busy} className="space-y-4"><div className="space-y-2"><label htmlFor="material-folder-name">폴더 이름</label><Input id="material-folder-name" required maxLength={60} value={folderEditor.name} onChange={event => setFolderEditor({ ...folderEditor, name: event.target.value })} /></div>{!folderEditor.id && <FolderPicker folders={tree} value={folderEditor.parent_id} onChange={parent_id => setFolderEditor({ ...folderEditor, parent_id })} />}</fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setFolderEditor(null)}>취소</Button><Button disabled={busy} type="submit">{busy ? '저장 중…' : '저장'}</Button></DialogFooter></form>}
    </DialogContent></Dialog>
    <AlertDialog open={!!folderRemoval} onOpenChange={open => { if (!open && !pending.current) setFolderRemoval(null) }}><AlertDialogContent onCloseAutoFocus={restore}><AlertDialogHeader><AlertDialogTitle>폴더를 삭제할까요?</AlertDialogTitle><AlertDialogDescription>‘{folderRemoval?.name}’과 하위 폴더를 삭제하고, 안에 있던 자료는 최상위로 옮겨요. 드라이브 원본은 유지돼요.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>취소</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void saveFolder(true) }}>폴더 삭제</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={!!removal} onOpenChange={open => { if (!open && !pending.current) setRemoval(null) }}><AlertDialogContent onCloseAutoFocus={restore}>
      <AlertDialogHeader><AlertDialogTitle>자료실에서 제거할까요?</AlertDialogTitle><AlertDialogDescription>‘{removal?.title}’을 목록에서 제거해요. 드라이브 원본은 유지돼요.</AlertDialogDescription></AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>취소</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void save('delete') }}>{busy ? '처리 중…' : '자료실에서 제거'}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </section>
}
