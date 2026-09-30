import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { requestTranscriptions } from '@/features/transcriptions/api'
import type { Transcription } from '@/features/transcriptions/api'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
const href = (id: string) => `#/transcriptions/${id}`

export function TranscriptionsPage({ token, hash }: { token: string; hash: string }) {
  const path = hash.split('?')[0].split('/').slice(2)
  const id = path[0] ?? ''
  const isNew = id === 'new'
  const editing = isNew || path[1] === 'edit'
  const [items, setItems] = useState<Transcription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const pending = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const entry = items.find(item => item.id === id)

  useEffect(() => {
    let active = true
    requestTranscriptions(token, 'list').then(result => { if (active) setItems(result) })
      .catch(() => { if (active) setError('필사를 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, attempt])
  useEffect(() => { if (!loading && !editing) heading.current?.focus() }, [loading, editing])

  async function remove() {
    if (!entry || pending.current) return
    pending.current = true
    setBusy(true)
    setDeleteError('')
    try {
      await requestTranscriptions(token, 'delete', { id: entry.id, revision: entry.revision })
      toast.success('필사를 삭제했어요.', { id: 'transcriptions-mutation' })
      window.location.hash = '/transcriptions'
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : '삭제하지 못했어요.') }
    finally { pending.current = false; setBusy(false) }
  }

  return <section aria-labelledby="transcriptions-title">
    <PageHeader>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 ref={heading} tabIndex={-1} id="transcriptions-title" className="flex items-center gap-3 text-3xl tracking-tight outline-none"><span aria-hidden="true" className="text-2xl">✍️</span>{isNew ? '필사 작성' : editing ? '필사 수정' : id ? '필사 상세' : '필사함'}</h1>
        {id ? <Button asChild variant="outline"><a href="#/transcriptions"><ArrowLeft aria-hidden="true" />필사함으로</a></Button> : <Button asChild><a href={href('new')}><Plus aria-hidden="true" />추가하기</a></Button>}
      </div>
    </PageHeader>
    {loading ? <p role="status" className="py-16 text-center text-muted-foreground">필사를 불러오고 있어요.</p> : error ? <div className="space-y-4 py-12"><p role="alert" className="text-destructive">{error}</p><Button variant="outline" onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>다시 시도</Button></div> : id && !isNew && !entry ? <p role="status" className="py-16 text-center text-muted-foreground">필사를 찾을 수 없어요. 삭제되었는지 필사함에서 확인해 주세요.</p> : editing ? <TranscriptionEditor token={token} entry={entry} /> : entry ? <>
      <article className="mx-auto max-w-3xl rounded-xl border bg-card p-6 shadow-sm sm:p-10">
        <h2 className="break-words text-2xl leading-relaxed">{entry.title}</h2>
        <p className="mt-3 text-sm text-muted-foreground">작성일 <time dateTime={entry.created_at}>{dateFormat.format(new Date(entry.created_at))}</time></p>
        <div className="mt-7 whitespace-pre-wrap break-words border-t pt-7 text-base leading-9">{entry.content}</div>
        <div className="mt-10 flex justify-end gap-2">
          <Button asChild variant="ghost"><a href={`${href(entry.id)}/edit`}><Pencil aria-hidden="true" />수정</a></Button>
          <AlertDialog open={deleteOpen} onOpenChange={open => { if (!busy) { setDeleteOpen(open); setDeleteError('') } }}>
            <AlertDialogTrigger asChild><Button variant="destructive-ghost"><Trash2 aria-hidden="true" />삭제</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>필사를 삭제할까요?</AlertDialogTitle><AlertDialogDescription className="break-words">‘{entry.title}’ 필사를 삭제하면 되돌릴 수 없어요.</AlertDialogDescription></AlertDialogHeader>
              {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
              <AlertDialogFooter><AlertDialogCancel disabled={busy}>취소</AlertDialogCancel><AlertDialogAction variant="destructive-ghost" disabled={busy} onClick={event => { event.preventDefault(); void remove() }}>{busy ? '삭제 중…' : '삭제'}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </article>
    </> : items.length ? <ul aria-label="필사 목록" className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
      {items.map(item => <li key={item.id}><a href={href(item.id)} className="flex items-center gap-4 px-5 py-6 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-7">
        <div className="min-w-0 flex-1"><h2 className="break-words text-lg">{item.title}</h2><p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{item.content}</p><time dateTime={item.created_at} className="mt-3 block text-xs text-muted-foreground">{dateFormat.format(new Date(item.created_at))}</time></div><ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </a></li>)}
    </ul> : <div className="rounded-xl border border-dashed py-20 text-center"><span aria-hidden="true" className="text-3xl">✍️</span><p className="mt-4 text-muted-foreground">아직 작성한 필사가 없어요.</p><Button asChild variant="link" className="mt-2"><a href={href('new')}>첫 필사 작성하기</a></Button></div>}
  </section>
}

function TranscriptionEditor({ token, entry }: { token: string; entry?: Transcription }) {
  const [title, setTitle] = useState(entry?.title ?? '')
  const [content, setContent] = useState(entry?.content ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const titleInput = useRef<HTMLInputElement>(null)
  useEffect(() => { titleInput.current?.focus() }, [])
  async function save() {
    if (pending.current) return
    if (!title.trim() || !content.trim()) { setError('제목과 내용을 입력해 주세요.'); return }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await requestTranscriptions(token, 'save', { title: title.trim(), content, ...(entry ? { id: entry.id, revision: entry.revision } : {}) })
      toast.success(entry ? '필사를 수정했어요.' : '필사를 추가했어요.', { id: 'transcriptions-mutation' })
      window.location.hash = entry ? `/transcriptions/${entry.id}` : '/transcriptions'
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했어요. 다시 시도해 주세요.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <form onSubmit={event => { event.preventDefault(); void save() }} className="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-sm sm:p-8">
    <fieldset disabled={busy} className="min-w-0 space-y-6">
      <label className="grid gap-2 text-sm">제목<Input ref={titleInput} required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} className="h-12 text-base md:text-base" /></label>
      <div className="grid gap-2 text-sm"><label htmlFor="transcription-content">내용</label><Textarea id="transcription-content" required maxLength={50000} value={content} onChange={event => setContent(event.target.value)} className="min-h-[50svh] resize-y text-base leading-9 md:text-base" /></div>
    </fieldset>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => { window.location.hash = entry ? `/transcriptions/${entry.id}` : '/transcriptions' }}>취소</Button><Button type="submit" disabled={busy}><Save aria-hidden="true" />{busy ? '저장 중…' : '저장'}</Button></div>
  </form>
}
