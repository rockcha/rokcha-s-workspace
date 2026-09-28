import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { loadArticle, safeNewsUrl } from '@/features/news/api'
import type { NewsArticle, NewsImage, NewsTopic } from '@/features/news/api'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short' })

function ArticleImage({ image, index }: { image: NewsImage; index: number }) {
  const [failed, setFailed] = useState(false)
  return <figure className="my-8">
    {failed ? <p className="rounded-xl border bg-secondary p-5 text-sm text-muted-foreground">사진을 불러오지 못했어요. 원문 출처에서 확인해 주세요.</p> : <img src={image.url} alt={image.caption || `기사 사진 ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="max-h-[42rem] w-full rounded-2xl bg-secondary object-contain" />}
    {image.caption && <figcaption className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{image.caption}</figcaption>}
  </figure>
}

export function NewsArticlePage({ articleUrl, initialArticle, topic }: {
  articleUrl: string; initialArticle?: NewsArticle; topic: NewsTopic
}) {
  const title = useRef<HTMLHeadingElement>(null)
  const focused = useRef(false)
  const [article, setArticle] = useState(initialArticle)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      void loadArticle(articleUrl).then(result => { if (active) setArticle(result) }).catch((cause: unknown) => {
        if (active) setError(cause instanceof Error && cause.name === 'Error' ? cause.message : '기사에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
      }).finally(() => { if (active) setLoading(false) })
    }, 200)
    return () => { active = false; clearTimeout(timer) }
  }, [articleUrl, attempt])
  useEffect(() => {
    if (focused.current) return
    title.current?.focus({ preventScroll: true })
    document.getElementById('main-content')?.scrollIntoView({ block: 'start' })
    focused.current = true
  }, [])
  const sourceUrl = article?.url || safeNewsUrl(articleUrl)
  return <>
    <PageHeader><Button asChild variant="ghost" size="sm"><a href={`#/news?topic=${topic}`}><ArrowLeft aria-hidden="true" className="size-4" />뉴스 목록</a></Button></PageHeader>
    <article lang="ko" aria-labelledby="news-title" aria-busy={loading} className="mx-auto max-w-3xl pb-12">
      <header className="border-b pb-7">
        {article && <p className="mb-4 text-sm text-primary">{article.source}</p>}
        <h1 ref={title} tabIndex={-1} id="news-title" className="break-words text-2xl leading-relaxed tracking-tight outline-none sm:text-4xl sm:leading-snug">{article?.title || '기사 읽기'}</h1>
        {article && <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm leading-6 text-muted-foreground">{article.author && <span>{article.author}</span>}<time dateTime={article.publishedAt}>{dateFormat.format(new Date(article.publishedAt))}</time></div>}
      </header>
      {loading && <p role="status" className="my-6 text-sm text-muted-foreground">원문과 기사 사진을 불러오는 중…</p>}
      {error && <div role="alert" className="my-6 space-y-3 rounded-xl border p-4"><p className="text-sm leading-7 text-muted-foreground">{error}{article && ' 먼저 받은 기사 본문을 표시하고 있어요. 추가 사진은 확인하지 못했어요.'}</p><Button variant="outline" size="sm" disabled={loading} onClick={() => setAttempt(value => value + 1)}>다시 불러오기</Button></div>}
      {article && <>
        {article.images[0] && <ArticleImage key={article.images[0].url} image={article.images[0]} index={0} />}
        <div className="my-8 space-y-6 break-words text-base leading-9 sm:text-lg sm:leading-10">{article.content.split(/\r?\n\s*\r?\n/).map((paragraph, index) => <p className="whitespace-pre-wrap" key={index}>{paragraph}</p>)}</div>
        {article.images.length > 1 && <section aria-label="기사 사진" className="border-t pt-6"><h2 className="text-lg">기사 사진 <span className="text-muted-foreground">{article.images.length - 1}</span></h2>{article.images.slice(1).map((image, index) => <ArticleImage key={image.url} image={image} index={index + 1} />)}</section>}
      </>}
      <footer className="space-y-4 border-t pt-6">
        {sourceUrl && <Button asChild variant="outline"><a href={sourceUrl} target="_blank" rel="noopener noreferrer">원문 출처 보기<ExternalLink aria-hidden="true" className="size-4" /><span className="sr-only"> (새 탭)</span></a></Button>}
        <p className="text-xs leading-6 text-muted-foreground"><a href="https://worldnewsapi.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">World News API</a> 제공 · 기사와 사진의 권리는 원 출처에 있습니다.</p>
      </footer>
    </article>
  </>
}