import { useEffect, useRef, useState } from 'react'
import { BookOpen, Newspaper, RefreshCw, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewsArticlePage } from '@/pages/news-article-page'
import { useNews } from '@/features/news/use-news'
import { configureNews, newsConfigured, newsTopics } from '@/features/news/api'
import type { NewsArticle, NewsTopic } from '@/features/news/api'
import { cn } from '@/lib/utils'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function ArticleCard({ article, label, href }: { article: NewsArticle; label: string; href: string }) {
  return <a href={href} data-news-article={article.url} aria-label={`${article.title} 읽기`} className="group flex h-full w-full flex-col rounded-2xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-6">
    <div className="flex w-full items-center justify-between gap-3 text-xs"><span className="rounded-md bg-secondary px-2.5 py-1 text-secondary-foreground">{label}</span><span className="text-muted-foreground">기사 원문</span></div>
    <h2 lang="ko" className="mt-4 break-words text-xl leading-8">{article.title}</h2>
    <p lang="ko" className="mt-3 line-clamp-3 break-words text-sm leading-7 text-muted-foreground">{article.content}</p>
    <div className="mt-auto flex w-full flex-wrap items-center justify-between gap-2 pt-6 text-xs text-muted-foreground"><span>{article.source}</span><time dateTime={article.publishedAt}>{dateFormat.format(new Date(article.publishedAt))}</time></div>
    <span className="mt-4 flex items-center gap-2 text-sm text-primary"><BookOpen aria-hidden="true" className="size-4" />기사 읽기</span>
  </a>
}
function NewsFeed({ hash, onDisconnect }: { hash: string; onDisconnect: () => void }) {
  const params = new URLSearchParams(hash.split('?')[1])
  const topic: NewsTopic = newsTopics.find(item => item.id === params.get('topic'))?.id ?? 'all'
  const reading = hash.startsWith('#/news/read?')
  const articleUrl = params.get('article') ?? ''
  const [query, setQuery] = useState('')
  const news = useNews(topic, !reading)
  const lastArticle = useRef('')
  useEffect(() => {
    if (reading) { lastArticle.current = articleUrl; return }
    if (lastArticle.current) {
      const link = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-news-article]')).find(item => item.dataset.newsArticle === lastArticle.current)
      link?.focus()
    }
  }, [reading, articleUrl, news.data])
  const selected = newsTopics.find(item => item.id === topic)!
  const articles = news.data?.articles.filter(article => `${article.title} ${article.content} ${article.author}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? []
  if (reading) return <NewsArticlePage key={articleUrl} articleUrl={articleUrl} initialArticle={news.data?.articles.find(item => item.url === articleUrl)} topic={topic} />
  return <>
    <PageHeader>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="news-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="text-2xl">📰</span>뉴스함</h1>
        <Button type="button" variant="outline" disabled={news.loading} onClick={news.refresh}><RefreshCw aria-hidden="true" className={cn('size-4', news.loading && 'animate-spin motion-reduce:animate-none')} />새로고침</Button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="뉴스 분야" className="flex flex-wrap gap-1.5">{newsTopics.map(item => <Button key={item.id} type="button" size="sm" variant={topic === item.id ? 'secondary' : 'ghost'} aria-pressed={topic === item.id} onClick={() => { window.location.hash = '/news?topic=' + item.id; setQuery('') }}><span aria-hidden="true">{item.emoji}</span>{item.label}</Button>)}</div>
        <div className="relative w-full sm:w-64"><Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" /><Input aria-label="불러온 뉴스 검색" placeholder="제목·본문에서 검색" className="h-10 bg-card pl-9" value={query} onChange={event => setQuery(event.target.value)} /></div>
      </div>
    </PageHeader>
    <div className="mb-6 rounded-2xl bg-secondary/60 p-5"><p className="text-lg">{selected.description}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">한국어 기사 원문을 읽고, 기사에 담긴 사진을 함께 살펴보세요.</p></div>
    {news.error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><p className="text-sm leading-6 text-muted-foreground">{news.error}{news.data && ' 이전에 불러온 기사를 표시하고 있어요.'}</p><Button type="button" variant="outline" size="sm" disabled={news.loading} onClick={news.refresh}>다시 불러오기</Button></div>}
    {news.loading && <p role="status" className="mb-4 text-sm text-muted-foreground">뉴스를 불러오는 중…</p>}
    {news.data && <div className="mb-4 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{selected.label} · {articles.length}개 기사</span><span>업데이트 {dateFormat.format(new Date(news.data.updatedAt))}</span></div>}
    <div aria-busy={news.loading}>
      {articles.length > 0 ? <ul aria-label={`${selected.label} 뉴스`} className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{articles.map(article => <li key={article.url} className="min-w-0"><ArticleCard article={article} label={selected.label} href={`#/news/read?${new URLSearchParams({ topic, article: article.url })}`} /></li>)}</ul> : !news.loading && !news.error && <div className="rounded-2xl border border-dashed px-6 py-16 text-center"><Newspaper aria-hidden="true" className="mx-auto size-8 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">{query.trim() ? '검색어에 맞는 기사가 없어요.' : '아직 불러올 기사가 없어요.'}</p>{query && <Button type="button" variant="ghost" className="mt-3" onClick={() => setQuery('')}>검색 지우기</Button>}</div>}
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-6 text-muted-foreground"><a href="https://worldnewsapi.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">World News API</a> 제공 · 한국어 뉴스</p><Button type="button" variant="ghost" size="sm" onClick={onDisconnect}>뉴스 연결 해제</Button></div>
  </>
}

export function NewsPage({ hash }: { hash: string }) {
  const [connected, setConnected] = useState(newsConfigured)
  const [key, setKey] = useState('')
  const [storageError, setStorageError] = useState('')
  function connect(nextKey: string) {
    setStorageError('')
    try {
      configureNews(nextKey)
      setConnected(Boolean(nextKey.trim()))
      setKey('')
    } catch (cause) {
      setStorageError(cause instanceof Error ? cause.message : '뉴스 연결 설정을 저장하지 못했어요.')
    }
  }
  return <section aria-labelledby="news-title">{storageError && <p role="alert" className="my-4 rounded-xl border bg-card p-4 text-sm">{storageError}</p>}{connected ? <NewsFeed hash={hash} onDisconnect={() => connect('')} /> : <>
    <PageHeader><h1 id="news-title" className="flex items-center gap-3 text-3xl"><span aria-hidden="true" className="text-2xl">📰</span>뉴스함</h1></PageHeader>
    <div className="mx-auto max-w-xl rounded-2xl border bg-card p-6 sm:p-9">
      <BookOpen aria-hidden="true" className="mb-5 size-8 text-primary" />
      <h2 className="text-2xl leading-9">한국어 뉴스, 원문으로 읽기</h2>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">World News API 무료 키를 연결하면 한국어 기사 본문과 여러 이미지를 상세 페이지에서 읽을 수 있어요. 정치·경제·기술 등 분야별로 모아 봅니다.</p>
      <ol className="mt-6 list-inside list-decimal space-y-3 text-sm leading-7"><li><a className="text-primary underline underline-offset-4" href="https://worldnewsapi.com/console/" target="_blank" rel="noopener noreferrer">World News API 무료 키 발급 (새 탭)</a></li><li>발급받은 키를 아래에 입력해 주세요.</li></ol>
      <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); if (key.trim()) connect(key) }}>
        <label htmlFor="news-key" className="text-sm">뉴스 API 키</label><Input id="news-key" type="password" autoComplete="off" spellCheck={false} value={key} onChange={event => setKey(event.target.value)} required />
        <Button type="submit" disabled={!key.trim()} className="w-full">뉴스 연결하기</Button>
      </form>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">무료 한도는 하루 50포인트예요. 키는 이 브라우저에 저장되어 다음에도 자동 연결돼요. 공용 기기에서는 사용 후 뉴스 연결을 해제해 주세요. 기존 NewsData 키 대신 새 키가 필요해요.</p>
    </div>
  </>}</section>
}
