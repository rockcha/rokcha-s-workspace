import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FolderPicker } from '@/features/notes/folder-picker'
import { buildFolderTree } from '@/features/notes/folder-tree'
import { requestNotes } from '@/features/notes/api'
import type { NotesData } from '@/features/notes/api'

export function NoteDetailPage({ token, noteId, folderId }: { token: string; noteId: string; folderId: string }) {
  const isNew = noteId === 'new'
  const [data, setData] = useState<NotesData | null>(null)
  const [draft, setDraft] = useState({ title: '', content: '', folder_id: folderId })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const titleInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    requestNotes(token, 'list').then(result => {
      if (!active) return
      const note = result.notes.find(item => item.id === noteId)
      if (!isNew && !note) {
        setLoadError('메모를 찾을 수 없어요. 삭제되었는지 메모함에서 확인해 주세요.')
        return
      }
      setData(result)
      setDraft(note ? { title: note.title, content: note.content, folder_id: note.folder_id } : { title: '', content: '', folder_id: result.folders.some(folder => folder.id === folderId) ? folderId : result.folders[0]?.id ?? '' })
    }).catch(() => {
      if (active) setLoadError('메모를 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, noteId, folderId, isNew, retry])

  useEffect(() => {
    if (!loading && !loadError) titleInput.current?.focus()
  }, [loading, loadError])

  const folders = buildFolderTree(data?.folders ?? [])
  function goBack(folder = folderId || draft.folder_id) {
    window.location.hash = folder ? `/notes?folder=${encodeURIComponent(folder)}` : '/notes'
  }

  async function save() {
    if (pending.current) return
    if (!draft.title.trim() || !folders.some(folder => folder.id === draft.folder_id)) {
      setError('폴더를 선택하고 메모 제목을 입력해 주세요.')
      return
    }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await requestNotes(token, isNew ? 'create_note' : 'update_note', { ...draft, title: draft.title.trim(), ...(!isNew ? { id: noteId } : {}) })
      toast.success('메모를 저장했어요.', { id: 'notes-mutation' })
      goBack(draft.folder_id)
    } catch {
      setError('저장하지 못했어요. 입력한 내용은 유지돼요. 연결 상태를 확인하고 다시 시도해 주세요.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <section aria-labelledby="note-detail-title">
    <PageHeader>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="note-detail-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="text-2xl">📝</span>{isNew ? '새 메모' : '메모 상세'}</h1>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => goBack()}><ArrowLeft aria-hidden="true" />메모함으로</Button>
          <Button type="submit" form="note-detail-form" disabled={loading || !!loadError || busy || !data?.folders.length}><Save aria-hidden="true" />{busy ? '저장 중…' : '저장'}</Button>
        </div>
      </div>
    </PageHeader>
    {loading ? <p role="status" className="py-16 text-center text-muted-foreground">메모를 불러오고 있어요.</p> : loadError ? <div className="space-y-4 py-12"><p role="alert" className="text-destructive">{loadError}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>다시 시도</Button></div> : <form id="note-detail-form" onSubmit={event => { event.preventDefault(); void save() }} className="mt-4">
      <fieldset disabled={busy} className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-5 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
          <label className="grid gap-2 text-sm">제목<Input ref={titleInput} required maxLength={120} className="h-12 text-lg" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="메모 제목" /></label>
          <label htmlFor="note-detail-content" className="grid gap-2 text-sm">내용</label>
          <Textarea id="note-detail-content" className="min-h-[55svh] resize-y text-base leading-8 md:text-base" maxLength={50000} value={draft.content} onChange={event => setDraft({ ...draft, content: event.target.value })} placeholder="떠오르는 생각을 자유롭게 남겨 보세요." />
        </div>
        <div className="min-w-0 space-y-3">
          <h2 className="text-sm">폴더</h2>
          <FolderPicker label="폴더" allowRoot={false} folders={folders} value={draft.folder_id} onChange={folder_id => setDraft({ ...draft, folder_id })} />
          <p className="break-words text-xs text-muted-foreground">선택한 위치: {folders.find(folder => folder.id === draft.folder_id)?.path ?? '폴더를 선택해 주세요.'}</p>
          {!folders.length && <p className="text-sm text-muted-foreground">메모함에서 폴더를 먼저 만들어 주세요.</p>}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </form>}
  </section>
}
