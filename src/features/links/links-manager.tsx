import { PageHeader } from '@/components/layout/page-header'
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, FolderInput, FolderPlus, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LinkCard } from '@/features/links/link-card'
import { fetchPreviewImage } from '@/features/links/preview'
import { safeWebUrl } from '@/lib/web-url'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FolderPicker } from '@/components/folder-picker'
import { buildFolderTree } from '@/lib/folder-tree'
import { requestLinks } from '@/features/links/api'
import type { SavedLink, SavedLinkFolder, LinksAction, LinksData } from '@/features/links/api'

type Editor = { kind: 'move-folder' | 'folder' | 'link' | 'move'; id?: string; name: string; title: string; content: string; url: string; image_url: string; folder_id: string; parent_id: string }
type Removal = { kind: 'folder' | 'link'; id: string; name: string }
const emptyEditor = { name: '', title: '', content: '', url: '', image_url: '', folder_id: '', parent_id: '' }

export function LinksManager({ token }: { token: string }) {
  const [data, setData] = useState<LinksData>({ folders: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [query, setQuery] = useState('')
  const search = query.trim().toLocaleLowerCase()
  const [filter, setFilter] = useState('all')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [removal, setRemoval] = useState<Removal | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const previewRequest = useRef(0)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const pending = useRef(false)
  const focusOrigin = useRef<HTMLElement | null>(null)
  const addFolderButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    requestLinks(token, 'list').then(result => {
      if (active) {
        setData(result)
        setFilter(previous => previous === 'all' || result.folders.some(folder => folder.id === previous) ? previous : 'all')
      }
    }).catch(() => {
      if (active) setLoadError('링크함을 불러오지 못했어요. 연결 상태를 확인한 후 다시 시도해 주세요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, retry])

  function rememberFocus() {
    focusOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setFormError('')
    previewRequest.current += 1
    setPreviewBusy(false)
    setPreviewMessage('')
  }

  function restoreFocus(event: Event) {
    event.preventDefault()
    const target = focusOrigin.current
    if (target?.isConnected) target.focus()
    else addFolderButton.current?.focus()
  }

  function openFolder(folder?: SavedLinkFolder) {
    rememberFocus()
    setEditor({ ...emptyEditor, kind: 'folder', id: folder?.id, name: folder?.name ?? '', parent_id: folder?.parent_id ?? (filter === 'all' ? '' : filter) })
  }

  function openSavedLink(link?: SavedLink, kind: 'link' | 'move' = 'link', folderId?: string) {
    rememberFocus()
    setEditor({ ...emptyEditor, ...link, kind, folder_id: link?.folder_id ?? folderId ?? (filter !== 'all' ? filter : data.folders[0]?.id ?? '') })
  }

  function openRemoval(value: Removal) {
    rememberFocus()
    setRemoval(value)
  }

  async function mutate(action: LinksAction, payload: Record<string, string>, message: string) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setFormError('')
    try {
      const result = await requestLinks(token, action, payload)
      setData(result)
      if (filter !== 'all' && !result.folders.some(folder => folder.id === filter)) setFilter('all')
      setEditor(null)
      setRemoval(null)
      toast.success(message, { id: 'links-mutation' })
    } catch {
      setFormError('저장하지 못했어요. 연결 상태를 확인해 주세요. 항목이 변경되었거나 삭제됐다면 창을 닫고 목록을 새로고침해 주세요.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  function saveEditor() {
    if (!editor) return
    if (editor.kind === 'link' && (!safeWebUrl(editor.url) || (editor.image_url.trim() && !safeWebUrl(editor.image_url)))) { setFormError('링크와 이미지 주소는 올바른 http 또는 https 주소를 입력해 주세요.'); return }
    if (editor.kind === 'move-folder') {
      void mutate('move_folder', { id: editor.id!, parent_id: editor.parent_id }, '폴더를 이동했어요.')
    } else if (editor.kind === 'folder') {
      if (!editor.name.trim()) { setFormError('폴더 이름을 입력해 주세요.'); return }
      void mutate(editor.id ? 'rename_folder' : 'create_folder', { ...(editor.id ? { id: editor.id } : {}), name: editor.name.trim(), parent_id: editor.parent_id }, editor.id ? '폴더 이름을 변경했어요.' : '폴더를 만들었어요.')
    } else {
      if (!editor.folder_id || (editor.kind === 'link' && !editor.title.trim())) { setFormError('폴더를 선택하고 링크 제목을 입력해 주세요.'); return }
      void mutate(editor.kind === 'move' ? 'move_link' : editor.id ? 'update_link' : 'create_link', {
        ...(editor.id ? { id: editor.id } : {}), folder_id: editor.folder_id, title: editor.title.trim(), content: editor.content, url: safeWebUrl(editor.url) ?? '', image_url: safeWebUrl(editor.image_url) ?? '',
      }, editor.kind === 'move' ? '링크를 이동했어요.' : editor.id ? '링크를 수정했어요.' : '링크를 추가했어요.')
    }
  }

  const folderTree = buildFolderTree(data.folders)
  const currentFolder = folderTree.find(folder => folder.id === filter)
  const breadcrumbs = currentFolder ? [...currentFolder.ancestors, currentFolder.id].map(id => folderTree.find(folder => folder.id === id)!) : []
  const visibleFolders = folderTree.filter(folder => (folder.parent_id ?? null) === (filter === 'all' ? null : filter))
  const visibleLinks = data.links.filter(link => search ? link.title.toLocaleLowerCase().includes(search) : link.folder_id === filter)
  const removedFolders = new Set(removal?.kind === 'folder' ? folderTree.filter(folder => folder.id === removal.id || folder.ancestors.includes(removal.id)).map(folder => folder.id) : [])
  const removedLinks = data.links.filter(link => removedFolders.has(link.folder_id)).length

  async function loadPreview() {
    if (!editor || previewBusy) return
    const url = safeWebUrl(editor.url)
    if (!url) { setPreviewMessage('먼저 올바른 링크 주소를 입력해 주세요.'); return }
    const request = ++previewRequest.current
    setPreviewBusy(true)
    setPreviewMessage('')
    try {
      const image = await fetchPreviewImage(url)
      if (request !== previewRequest.current) return
      setEditor(current => current?.url === editor.url ? { ...current, image_url: image ?? current.image_url } : current)
      setPreviewMessage(image ? '미리보기 이미지를 가져왔어요.' : '이미지를 가져올 수 없어요. 이미지 주소를 직접 입력하거나 기본 카드로 저장해 주세요.')
    } finally {
      if (request === previewRequest.current) setPreviewBusy(false)
    }
  }

  function linkList(links: SavedLink[]) {
    return <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{links.map(link => (
      <LinkCard key={link.id} link={link} onEdit={() => openSavedLink(link)} onMove={() => openSavedLink(link, 'move')} onDelete={() => openRemoval({ kind: 'link', id: link.id, name: link.title })} />
    ))}</ul>
  }

  return (
    <section aria-labelledby="links-title">
      <PageHeader>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <h1 id="links-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="shrink-0 text-2xl">🔗</span>링크함</h1>
        <div className="flex max-w-full flex-wrap gap-2">
          <Button ref={addFolderButton} type="button" variant="outline" disabled={loading || Boolean(loadError)} onClick={() => openFolder()}><FolderPlus aria-hidden="true" />폴더 추가</Button>
          <Button type="button" disabled={loading || Boolean(loadError) || !data.folders.length} onClick={() => openSavedLink()}><Plus aria-hidden="true" />링크 추가</Button>
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
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>폴더 {visibleFolders.length}개{currentFolder && ` · 링크 ${visibleLinks.length}개`}</span><Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => setRetry(value => value + 1)}>새로고침</Button></div>
      </div>
      <div className="relative mt-4 w-full sm:max-w-sm">
        <label htmlFor="links-search" className="sr-only">링크 제목 검색</label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="links-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="제목으로 검색" className="pl-9" />
      </div>
      </PageHeader>
      {loading ? <p role="status" className="py-16 text-center text-sm text-muted-foreground">링크함을 불러오고 있어요.</p> : loadError ? <div role="alert" className="py-12 text-center"><p className="text-sm text-destructive">{loadError}</p><Button type="button" variant="outline" className="mt-4" onClick={() => setRetry(value => value + 1)}>다시 시도</Button></div> : search ? <div className="mt-5 space-y-4"><p role="status" className="text-sm text-muted-foreground">검색 결과 {visibleLinks.length}개</p>{visibleLinks.length ? linkList(visibleLinks) : <p className="py-12 text-center text-sm text-muted-foreground">검색 결과가 없어요. 다른 제목으로 검색해 주세요.</p>}</div> : !data.folders.length ? <div className="py-20 text-center"><span className="text-3xl" aria-hidden="true">📁</span><h2 className="mt-4 text-lg">첫 폴더를 만들어 보세요</h2><p className="mt-2 text-sm text-muted-foreground">폴더를 만든 뒤 그 안에 링크를 담을 수 있어요.</p><Button type="button" variant="outline" className="mt-5" onClick={() => openFolder()}>폴더 추가</Button></div> : (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleFolders.map(folder => (
            <section key={folder.id} className="min-w-0 overflow-hidden rounded-xl border bg-card" aria-labelledby={`folder-title-${folder.id}`}>
              <div className="flex flex-col items-stretch gap-2 p-3">
                <button type="button" id={`folder-title-${folder.id}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-2 text-left text-sm outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setFilter(folder.id)}>
                  <span className="shrink-0 text-2xl" aria-hidden="true">📁</span><span className="truncate">{folder.name}</span><ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
                <div className="flex shrink-0 justify-end">
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name}에 링크 추가`} onClick={() => openSavedLink(undefined, 'link', folder.id)}><Plus aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name} 폴더 이동`} onClick={() => { rememberFocus(); setEditor({ ...emptyEditor, kind: 'move-folder', id: folder.id, parent_id: folder.parent_id ?? '' }) }}><FolderInput className="text-muted-foreground" aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name} 이름 수정`} onClick={() => openFolder(folder)}><Pencil aria-hidden="true" /></Button>
                  <Button type="button" variant="destructive-ghost" size="icon" className="size-8 sm:size-10" aria-label={`${folder.name} 폴더 삭제`} onClick={() => openRemoval({ kind: 'folder', id: folder.id, name: folder.name })}><Trash2 aria-hidden="true" /></Button>
                </div>
              </div>
            </section>
          ))}
          </div>
          {currentFolder && (visibleLinks.length ? <div>{linkList(visibleLinks)}</div> : <p className="py-12 text-center text-sm text-muted-foreground">이 폴더에는 아직 링크가 없어요. 다시 찾고 싶은 링크를 담아 보세요.</p>)}
        </div>
      )}

      <Dialog open={Boolean(editor)} onOpenChange={open => { if (!open && !pending.current) setEditor(null) }}>
        <DialogContent className="max-h-[85svh] overflow-y-auto" showCloseButton={!busy} onCloseAutoFocus={restoreFocus}>
          <DialogHeader><DialogTitle>{editor?.kind === 'move-folder' ? '폴더 이동' : editor?.kind === 'folder' ? editor.id ? '폴더 이름 수정' : '새 폴더' : editor?.kind === 'move' ? '링크 이동' : editor?.id ? '링크 수정' : '새 링크'}</DialogTitle><DialogDescription>{editor?.kind === 'folder' ? '링크를 담아 둘 폴더의 이름을 정해 주세요.' : editor?.kind === 'move' ? '링크를 담을 폴더를 선택해 주세요.' : '폴더를 고르고, 다시 찾고 싶은 주소를 저장해 주세요.'}</DialogDescription></DialogHeader>
          {editor && <form onSubmit={event => { event.preventDefault(); saveEditor() }} className="space-y-5">
            <fieldset disabled={busy} className="min-w-0 space-y-5">
              {editor.kind === 'move-folder' ? <div className="space-y-2"><p className="text-sm">이동할 위치</p><FolderPicker folders={folderTree.filter(folder => folder.id !== editor.id && !folder.ancestors.includes(editor.id!))} value={editor.parent_id} onChange={parent_id => setEditor({ ...editor, parent_id })} /><p className="text-xs text-muted-foreground">하위 폴더와 내용도 함께 이동해요.</p></div> : editor.kind === 'folder' ? <>
                {!editor.id && <div className="space-y-2"><span id="folder-parent-label" className="block text-sm">폴더 위치</span><FolderPicker folders={folderTree} value={editor.parent_id} onChange={parent_id => setEditor({ ...editor, parent_id })} /><p className="break-words text-xs text-muted-foreground">선택한 위치: {folderTree.find(folder => folder.id === editor.parent_id)?.path ?? '최상위'}</p><p className="text-xs text-muted-foreground">선택한 폴더 안에 새 폴더가 만들어져요.</p></div>}
                <div className="space-y-2"><label htmlFor="folder-name" className="text-sm">폴더 이름</label><Input id="folder-name" value={editor.name} onChange={event => setEditor({ ...editor, name: event.target.value })} placeholder="예: 일상, 아이디어" maxLength={60} required /></div>
              </> : <>
                <div className="space-y-2"><span className="block text-sm">폴더</span><FolderPicker label="폴더" allowRoot={false} folders={folderTree} value={editor.folder_id} onChange={folder_id => setEditor({ ...editor, folder_id })} /><p className="break-words text-xs text-muted-foreground">선택한 위치: {folderTree.find(folder => folder.id === editor.folder_id)?.path}</p></div>
                {editor.kind === 'link' && <><div className="space-y-2"><label htmlFor="link-title" className="text-sm">제목</label><Input id="link-title" value={editor.title} onChange={event => setEditor({ ...editor, title: event.target.value })} placeholder="링크 제목" maxLength={120} required /></div><div className="space-y-2"><label htmlFor="link-url" className="text-sm">링크 주소</label><Input id="link-url" type="url" value={editor.url} onChange={event => { previewRequest.current += 1; setPreviewBusy(false); setPreviewMessage(''); setEditor({ ...editor, url: event.target.value, image_url: '' }) }} placeholder="https://example.com" maxLength={4096} required /></div>
                <div className="space-y-2"><label htmlFor="link-image" className="text-sm">미리보기 이미지 주소 (선택)</label><Input id="link-image" type="url" value={editor.image_url} onChange={event => { previewRequest.current += 1; setPreviewBusy(false); setEditor({ ...editor, image_url: event.target.value }) }} placeholder="https://example.com/image.jpg" maxLength={4096} /><Button type="button" variant="outline" size="sm" disabled={previewBusy || !editor.url.trim()} onClick={() => void loadPreview()}>{previewBusy ? '이미지 가져오는 중…' : '미리보기 가져오기'}</Button><p role="status" className="text-xs leading-5 text-muted-foreground">{previewMessage || '사이트에서 허용하는 경우 대표 이미지를 가져와요. 이미지 없이도 저장할 수 있어요.'}</p></div>
                <div className="space-y-2"><label htmlFor="link-content" className="text-sm">설명 (선택)</label><Textarea id="link-content" className="min-h-24 max-h-48 resize-y" value={editor.content} onChange={event => setEditor({ ...editor, content: event.target.value })} placeholder="어떤 링크인지 짧게 남겨 보세요." maxLength={50000} /></div></>}
              </>}
            </fieldset>
            {formError && <p role="alert" className="text-sm leading-6 text-destructive">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setEditor(null)}>취소</Button><Button type="submit" disabled={busy}>{busy ? '저장 중…' : (editor.kind === 'move' || editor.kind === 'move-folder') ? '이동' : '저장'}</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removal)} onOpenChange={open => { if (!open && !pending.current) setRemoval(null) }}>
        <AlertDialogContent onOverlayClick={() => { if (!pending.current) setRemoval(null) }} onCloseAutoFocus={restoreFocus} className="max-h-[85svh] overflow-y-auto">
          <AlertDialogHeader><AlertDialogTitle>{removal?.kind === 'folder' ? '폴더를 삭제할까요?' : '링크를 삭제할까요?'}</AlertDialogTitle><AlertDialogDescription className="break-words leading-7">{removal?.kind === 'folder' ? `‘${removal.name}’ 폴더와 하위 폴더 ${Math.max(0, removedFolders.size - 1)}개, 그 안의 링크 ${removedLinks}개가 모두 삭제돼요. 이 작업은 되돌릴 수 없어요.` : `‘${removal?.name}’ 링크가 삭제돼요. 이 작업은 되돌릴 수 없어요.`}</AlertDialogDescription></AlertDialogHeader>
          {formError && <p role="alert" className="text-sm leading-6 text-destructive">{formError}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>취소</AlertDialogCancel><AlertDialogAction variant="destructive-ghost" disabled={busy} onClick={event => { event.preventDefault(); if (removal) void mutate(removal.kind === 'folder' ? 'delete_folder' : 'delete_link', { id: removal.id }, removal.kind === 'folder' ? '폴더와 포함된 링크를 삭제했어요.' : '링크를 삭제했어요.') }}>{busy ? '삭제 중…' : removal?.kind === 'folder' ? '폴더와 링크 삭제' : '링크 삭제'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
