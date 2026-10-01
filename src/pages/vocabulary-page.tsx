import { useRef, useState } from 'react'
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { WordEditor } from '@/features/vocabulary/word-editor'
import { useVocabulary } from '@/features/vocabulary/use-vocabulary'
import type { Word } from '@/features/vocabulary/model'
import { cn } from '@/lib/utils'

export function VocabularyPage({ token }: { token: string }) {
  const state = useVocabulary(token)
  const [editor, setEditor] = useState<{ item?: Word } | null>(null)
  const [query, setQuery] = useState('')
  const [hideMeanings, setHideMeanings] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  function edit(item?: Word) { opener.current = document.activeElement as HTMLElement; setEditor({ item }) }
  const words = [...state.words].sort((a, b) => a.word.localeCompare(b.word, 'en')).filter(item => item.word.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const selectedWord = words.find(item => item.id === selectedId)
  return <section aria-labelledby="vocabulary-title">
    <PageHeader>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 id="vocabulary-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="shrink-0 text-2xl">📖</span>영단어 공부방</h1><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><a href="#/vocabulary/test"><Layers aria-hidden="true" />단어 테스트</a></Button><Button ref={addButton} disabled={state.loading || state.busy || !!state.error} onClick={() => edit()}><Plus aria-hidden="true" />단어 추가</Button></div></div>
      <div className="-mx-1 mt-4 flex flex-wrap items-center gap-3 p-1"><Input className="max-w-sm bg-card focus-visible:ring-inset" aria-label="단어 검색" placeholder="단어 검색" value={query} onChange={event => setQuery(event.target.value)} /><label className="ml-auto flex shrink-0 cursor-pointer items-center gap-2 text-sm"><Switch checked={hideMeanings} onCheckedChange={setHideMeanings} aria-label="단어 가리기 모드" />단어 가리기 모드</label></div>
    </PageHeader>
    {state.loading ? <p role="status">단어를 불러오는 중…</p> : state.error ? <div role="alert" className="text-sm text-destructive">{state.error} <Button variant="ghost" size="sm" onClick={state.refresh}>다시 시도</Button></div> : <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
      {words.length ? <ul aria-label="영단어 목록" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,8rem),1fr))] gap-2">
        {words.map(item => <li key={item.id} className="min-w-0">
          <Button variant="outline" disabled={state.busy} aria-pressed={selectedWord?.id === item.id} aria-controls="vocabulary-detail" className={cn('h-full min-h-14 w-full justify-start whitespace-normal break-all px-4 py-3 text-left text-base font-normal', selectedWord?.id === item.id && 'border-primary bg-accent text-accent-foreground')} onClick={() => {
            setSelectedId(item.id)
            requestAnimationFrame(() => detailTitle.current?.focus())
          }}>{item.word}</Button>
        </li>)}
      </ul> : <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">{query ? '검색 결과가 없어요.' : '첫 영단어와 뜻을 추가해 보세요.'}</p>}
      <section id="vocabulary-detail" aria-labelledby="vocabulary-detail-title" className="min-w-0 rounded-xl border bg-card p-5 shadow-sm lg:sticky lg:top-48 lg:max-h-[calc(100dvh-13rem)] lg:overflow-y-auto">
        <h2 id="vocabulary-detail-title" ref={detailTitle} tabIndex={-1} className="scroll-mt-48 rounded-sm text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">선택한 단어</h2>
        {selectedWord ? <>
          <h3 className="mt-4 break-words text-2xl">{selectedWord.word}</h3>
          {hideMeanings ? <p className="mt-4 rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">뜻을 가렸어요. 가리기 모드를 끄면 볼 수 있어요.</p> : <ul className="mt-4 space-y-3">{selectedWord.meanings.map((meaning, index) => <li key={index} className="flex items-start gap-2 text-sm">
            <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs text-primary">{meaning.part}</span>
            <span className="min-w-0 whitespace-pre-wrap break-words">{meaning.text}</span>
          </li>)}</ul>}
          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button variant="ghost" size="sm" aria-label={`${selectedWord.word} 수정`} disabled={state.busy} onClick={() => edit(selectedWord)}><Pencil aria-hidden="true" />수정</Button>
            <Button variant="destructive-ghost" size="sm" aria-label={`${selectedWord.word} 삭제`} disabled={state.busy} onClick={async () => {
              const message = await state.mutate('delete', { id: selectedWord.id, revision: selectedWord.revision })
              if (message) toast.error(message, { id: 'vocabulary-mutation' })
              else {
                setSelectedId(null)
                toast.success('단어를 삭제했어요.', { id: 'vocabulary-mutation' })
                requestAnimationFrame(() => addButton.current?.focus())
              }
            }}><Trash2 aria-hidden="true" />삭제</Button>
          </div>
        </> : <p className="mt-4 text-sm text-muted-foreground">{hideMeanings ? '단어를 선택해 보세요. 가리기 모드에서는 뜻이 숨겨져요.' : '단어를 선택하면 뜻을 볼 수 있어요.'}</p>}
      </section>
    </div>}
    {editor && <WordEditor item={editor.item} state={state} close={() => setEditor(null)} restoreFocus={() => (opener.current?.isConnected ? opener.current : addButton.current)?.focus()} />}
  </section>
}
