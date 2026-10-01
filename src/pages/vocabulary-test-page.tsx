import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { useVocabulary } from '@/features/vocabulary/use-vocabulary'
import type { Word } from '@/features/vocabulary/model'
import { cn } from '@/lib/utils'

export function VocabularyTestPage({ token }: { token: string }) {
  const state = useVocabulary(token)
  const words = [...state.words].sort((a, b) => a.word.localeCompare(b.word, 'en'))

  return <section aria-labelledby="vocabulary-test-title">
    <PageHeader>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="vocabulary-test-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="text-2xl">📖</span>단어 테스트</h1>
        <Button asChild variant="outline"><a href="#/vocabulary"><ArrowLeft aria-hidden="true" />공부방으로</a></Button>
      </div>
    </PageHeader>
    {state.loading ? <p role="status">단어를 불러오는 중…</p> : state.error ? <div role="alert" className="text-sm text-destructive">{state.error} <Button variant="ghost" size="sm" onClick={state.refresh}>다시 시도</Button></div> : words.length ? <WordSlides words={words} /> : <div className="rounded-2xl border border-dashed px-5 py-16 text-center">
      <p className="text-muted-foreground">아직 테스트할 단어가 없어요. 공부방에서 단어를 추가해 주세요.</p>
      <Button asChild className="mt-5"><a href="#/vocabulary">단어 추가하러 가기</a></Button>
    </div>}
  </section>
}

function WordSlides({ words }: { words: Word[] }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [direction, setDirection] = useState<'next' | 'previous'>('next')
  const revealButton = useRef<HTMLButtonElement>(null)
  const word = words[index]

  function move(next: number) {
    if (next < 0 || next >= words.length) return
    setDirection(next >= index ? 'next' : 'previous')
    setIndex(next)
    setRevealed(false)
    requestAnimationFrame(() => revealButton.current?.focus({ preventScroll: true }))
  }

  return <section aria-label="단어 카드 테스트" className="mx-auto flex min-h-[calc(100dvh-16rem)] max-w-2xl flex-col justify-center gap-5 py-5" onKeyDown={event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      move(index + (event.key === 'ArrowRight' ? 1 : -1))
    }
  }}>
    <p role="status" aria-atomic="true" className="text-center text-sm tabular-nums text-muted-foreground">{index + 1} / {words.length}</p>
    <article key={word.id} aria-labelledby="test-word" className={cn('min-w-0 rounded-3xl border bg-card p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 sm:p-10', direction === 'next' ? 'motion-safe:slide-in-from-right-4' : 'motion-safe:slide-in-from-left-4')}>
      <h2 id="test-word" lang="en" className="break-words py-10 text-center text-4xl leading-relaxed sm:text-5xl">{word.word}</h2>
      <button ref={revealButton} type="button" aria-label={revealed ? '뜻 다시 가리기' : '뜻 보기'} aria-expanded={revealed} aria-controls="test-word-meanings" onClick={() => setRevealed(value => !value)} className="flex min-h-44 w-full flex-col items-center justify-center rounded-2xl bg-secondary/50 p-5 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-6">
        {revealed ? <span id="test-word-meanings" className="block w-full space-y-4">{word.meanings.map((meaning, meaningIndex) => <span key={meaningIndex} className="flex items-start gap-3">
          <span className="shrink-0 rounded-md bg-card px-2 py-1 text-xs text-primary">{meaning.part}</span>
          <span className="min-w-0 whitespace-pre-wrap break-words text-base leading-7">{meaning.text}</span>
        </span>)}</span> : <span id="test-word-meanings" className="flex flex-col items-center gap-3 text-sm text-muted-foreground"><Eye aria-hidden="true" className="size-5" />눌러서 뜻 확인하기</span>}
      </button>
    </article>
    <div className="flex items-center justify-between gap-3">
      <Button variant="outline" disabled={index === 0} onClick={() => move(index - 1)}><ArrowLeft aria-hidden="true" />이전 단어</Button>
      {index === words.length - 1 ? <Button onClick={() => move(0)}><RotateCcw aria-hidden="true" />처음부터</Button> : <Button onClick={() => move(index + 1)}>다음 단어<ArrowRight aria-hidden="true" /></Button>}
    </div>
    <p className="text-center text-xs leading-6 text-muted-foreground">뜻을 눌러 확인하고, 버튼이나 좌우 방향키로 넘겨 보세요.</p>
  </section>
}
