import { useRef, useState } from 'react'
import { ExternalLink, Pencil, Play, Plus, Quote, RefreshCw, Sparkles, Trash2, Video } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { useMotivation } from '@/features/motivation/use-motivation'
import type { MotivationItem } from '@/features/motivation/use-motivation'
import { youtubeId } from '@/features/motivation/youtube'

function VideoCard({ item, playing, onPlay }: { item: MotivationItem; playing: boolean; onPlay: () => void }) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const playerParams = new URLSearchParams({
    autoplay: attempt === 0 ? '1' : '0',
    playsinline: '1',
    origin: window.location.origin,
  })
  return <>
    {playing ? <iframe key={attempt} className="aspect-video min-h-[200px] w-full bg-secondary" src={`https://www.youtube.com/embed/${item.video_id}?${playerParams}`} title={`${item.title} 재생`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> :
      <button type="button" onClick={onPlay} aria-label={`${item.title} 재생`} className="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring">
        {!failed && <img src={`https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg`} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105 motion-reduce:transition-none" />}
        <span className="relative flex size-14 items-center justify-center rounded-full bg-card/95 text-primary shadow-sm"><Play aria-hidden="true" className="size-6" /></span>
      </button>}
    <div className="space-y-3 p-6"><h2 className="break-words text-xl">{item.title}</h2>{item.content && <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{item.content}</p>}<div className="flex flex-wrap items-center gap-3"><a className="inline-flex items-center gap-1.5 rounded text-xs text-muted-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" href={`https://www.youtube.com/watch?v=${item.video_id}`} target="_blank" rel="noopener noreferrer">YouTube에서 보기<ExternalLink aria-hidden="true" className="size-3" /></a>{playing && <Button type="button" variant="ghost" size="sm" onClick={() => setAttempt(value => value + 1)}><RefreshCw aria-hidden="true" />다시 불러오기</Button>}</div>{playing && attempt > 0 && <p role="status" className="text-xs text-muted-foreground">영상 안의 재생 버튼을 눌러 주세요.</p>}</div>
  </>
}

function ContentEditor({ item, kind, busy, save, close, restoreFocus }: { item?: MotivationItem; kind: MotivationItem['kind']; busy: boolean; save: (payload: Record<string, unknown>) => Promise<string>; close: () => void; restoreFocus: () => void }) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [content, setContent] = useState(item?.content ?? '')
  const [url, setUrl] = useState(item?.video_id ? `https://www.youtube.com/watch?v=${item.video_id}` : '')
  const [error, setError] = useState('')
  return <Dialog open onOpenChange={open => { if (!open && !busy) close() }}><DialogContent className="max-h-[85svh] overflow-y-auto" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}><DialogHeader><DialogTitle>{kind === 'quote' ? '글귀' : '영상'} {item ? '수정' : '추가'}</DialogTitle><DialogDescription>{kind === 'quote' ? '오래 간직하고 싶은 말을 남겨보세요.' : '다시 보고 싶은 유튜브 영상을 담아보세요.'}</DialogDescription></DialogHeader>
    <form className="space-y-5" onSubmit={event => { event.preventDefault(); const id = kind === 'youtube' ? youtubeId(url) : ''; if (kind === 'youtube' && !id) { setError('올바른 유튜브 영상 주소를 입력해 주세요.'); return } void save({ id: item?.id, revision: item?.revision, kind, title: title.trim(), content: content.trim(), video_id: id }).then(message => { if (message) setError(message); else { toast.success(`${kind === 'quote' ? '글귀를' : '영상을'} ${item ? '수정' : '추가'}했어요.`, { id: 'motivation-mutation' }); close() } }) }}>
      <fieldset disabled={busy} className="space-y-5">
        {kind === 'youtube' && <div className="space-y-2"><label htmlFor="motivation-url" className="text-sm">유튜브 주소</label><Input id="motivation-url" type="url" required value={url} maxLength={4096} onChange={event => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></div>}
        <div className="space-y-2"><label htmlFor="motivation-title" className="text-sm">{kind === 'quote' ? '출처 · 지은이 (선택)' : '영상 제목'}</label><Input id="motivation-title" required={kind === 'youtube'} maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></div>
        <div className="space-y-2"><label htmlFor="motivation-content" className="text-sm">{kind === 'quote' ? '글귀' : '내 메모 (선택)'}</label><Textarea id="motivation-content" className="min-h-40" required={kind === 'quote'} maxLength={5000} value={content} onChange={event => setContent(event.target.value)} /></div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={close}>취소</Button><Button type="submit" disabled={busy || (kind === 'quote' ? !content.trim() : !title.trim())}>{busy ? '저장 중…' : '저장'}</Button></div>
    </form>
  </DialogContent></Dialog>
}

export function MotivationPage({ token }: { token: string }) {
  const state = useMotivation(token)
  const [editor, setEditor] = useState<{ kind: MotivationItem['kind']; item?: MotivationItem } | null>(null)
  const [deleting, setDeleting] = useState<MotivationItem | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [playing, setPlaying] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | MotivationItem['kind']>('all')
  const trigger = useRef<HTMLElement | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const restoreFocus = () => { (trigger.current?.isConnected ? trigger.current : addButton.current)?.focus() }
  const openEditor = (kind: MotivationItem['kind'], item?: MotivationItem) => { trigger.current = document.activeElement as HTMLElement; setEditor({ kind, item }) }
  const items = state.items.filter(item => filter === 'all' || item.kind === filter)
  return <section aria-labelledby="motivation-room-title">
    <PageHeader><div className="flex flex-wrap items-center justify-between gap-4"><h1 id="motivation-room-title" className="flex items-center gap-3 text-3xl tracking-tight"><Sparkles aria-hidden="true" className="size-7 shrink-0 text-primary" />동기부여의 방</h1><div className="flex flex-wrap gap-2"><Button ref={addButton} disabled={state.loading || !!state.error || state.busy} onClick={() => openEditor('quote')}><Plus aria-hidden="true" />글귀 추가</Button><Button variant="outline" disabled={state.loading || !!state.error || state.busy} onClick={() => openEditor('youtube')}><Video aria-hidden="true" />영상 추가</Button></div></div><p className="mt-3 text-sm text-muted-foreground">나를 다시 움직이게 하는 말과 장면들.</p></PageHeader>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1" role="group" aria-label="콘텐츠 종류">{([{ id: 'all', label: '전체' }, { id: 'quote', label: '글귀' }, { id: 'youtube', label: '영상' }] as const).map(tab => <Button key={tab.id} size="sm" variant={filter === tab.id ? 'secondary' : 'ghost'} aria-pressed={filter === tab.id} onClick={() => { setFilter(tab.id); setPlaying(null) }}>{tab.label}</Button>)}</div><Button variant="ghost" size="sm" disabled={state.loading || state.busy} onClick={state.refresh}><RefreshCw aria-hidden="true" />새로고침</Button></div>
    {state.loading ? <p role="status" className="py-12 text-center text-muted-foreground">콘텐츠를 불러오고 있어요.</p> : state.error ? <p role="alert" className="rounded-2xl border p-6 text-sm text-destructive">{state.error}</p> : items.length === 0 ? <div className="rounded-2xl border border-dashed bg-card px-6 py-20 text-center"><Sparkles aria-hidden="true" className="mx-auto mb-5 size-9 text-primary" /><h2 className="text-xl">마음에 남는 순간을 모아보세요</h2><p className="mt-3 text-sm text-muted-foreground">좋아하는 글귀 한 줄, 힘이 되는 영상 하나부터.</p></div> :
      <div className="grid items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">{items.map(item => <article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
        {item.kind === 'quote' ? <div className="flex min-h-64 flex-col justify-center bg-secondary/40 px-7 py-9 sm:px-9"><Quote aria-hidden="true" strokeWidth={1.3} className="mb-6 size-8 text-primary/60" /><blockquote className="whitespace-pre-wrap break-words text-xl leading-relaxed">{item.content}</blockquote>{item.title && <p className="mt-6 break-words text-sm text-muted-foreground">— {item.title}</p>}</div> : <VideoCard key={`${item.id}:${item.video_id}`} item={item} playing={playing === `${item.id}:${item.video_id}`} onPlay={() => setPlaying(`${item.id}:${item.video_id}`)} />}
        <div className="flex justify-end gap-1 border-t px-4 py-2"><Button variant="ghost" size="sm" disabled={state.busy} onClick={() => openEditor(item.kind, item)}><Pencil aria-hidden="true" />수정</Button><Button variant="ghost" size="sm" disabled={state.busy} onClick={() => { trigger.current = document.activeElement as HTMLElement; setDeleteError(''); setDeleting(item) }}><Trash2 aria-hidden="true" />삭제</Button></div>
      </article>)}</div>}
    {editor && <ContentEditor item={editor.item} kind={editor.kind} busy={state.busy} save={payload => state.mutate('save', payload)} close={() => setEditor(null)} restoreFocus={restoreFocus} />}
    <AlertDialog open={!!deleting} onOpenChange={open => { if (!open && !state.busy) setDeleting(null) }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}><AlertDialogHeader><AlertDialogTitle>콘텐츠를 삭제할까요?</AlertDialogTitle><AlertDialogDescription>삭제한 글귀나 영상은 복구할 수 없어요.</AlertDialogDescription></AlertDialogHeader>{deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={state.busy}>취소</AlertDialogCancel><Button variant="destructive" disabled={state.busy} onClick={() => { if (deleting) void state.mutate('delete', { id: deleting.id, revision: deleting.revision }).then(message => { if (message) setDeleteError(message); else { setDeleting(null); toast.success(`${deleting.kind === 'quote' ? '글귀를' : '영상을'} 삭제했어요.`, { id: 'motivation-mutation' }) } }) }}>{state.busy ? '삭제 중…' : '삭제'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
}
