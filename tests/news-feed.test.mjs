import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('../src/features/news/api.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { newsUrl, parseArticle, parseArticles, loadNews, loadArticle, configureNews } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const item = (extra = {}) => ({ title: '한국 AI 소식', url: 'https://news.example.com/article', publish_date: '2026-09-25 10:00:00', text: '기사 첫 문단입니다.\n\n기사 마지막 문단입니다.', summary: '표시하면 안 되는 요약', authors: ['기자'], language: 'ko', source_country: 'kr', ...extra })
const response = news => ({ news })

test('공식 카테고리·한국어·한국 매체·최신순·키 없는 요청 URL', () => {
  configureNews('test-key')
  const url = new URL(newsUrl('technology'))
  assert.equal(url.origin, 'https://api.worldnewsapi.com')
  assert.equal(url.searchParams.get('language'), 'ko')
  assert.equal(url.searchParams.get('source-countries'), 'kr')
  assert.equal(url.searchParams.get('categories'), 'technology')
  assert.equal(url.searchParams.get('sort-direction'), 'DESC')
  assert.equal(new URL(newsUrl('all')).searchParams.has('categories'), false)
  assert.equal(url.href.includes('test-key'), false)
  assert.throws(() => newsUrl('constructor'))
})

test('요약 대체 금지·언어·날짜·URL·중복 검증', () => {
  const articles = parseArticles(response([item(), item(), item({ text: '' }), item({ language: 'en' }), item({ source_country: 'us' }), item({ url: 'javascript:alert(1)' }), item({ url: 'https://u:p@example.com/' }), item({ publish_date: '2026-02-30 10:00:00' })]))
  assert.equal(articles.length, 1)
  assert.equal(articles[0].content, item().text)
  assert.equal(articles[0].publishedAt, '2026-09-25T10:00:00Z')
  assert.equal(articles[0].author, '기자')
  assert.equal('summary' in articles[0], false)
  assert.deepEqual(parseArticles(response([])), [])
  for (const value of [null, {}, response([null]), { status: 'error' }]) assert.throws(() => parseArticles(value))
})

test('다중 이미지 전부·캡션·중복 제거·안전한 주소', () => {
  const article = parseArticle(item({ image: 'https://example.com/1.jpg', images: [
    { url: 'https://example.com/1.jpg', title: '첫 사진' },
    { url: 'https://example.com/2.jpg', title: '둘째 사진' },
    { url: 'https://example.com/3.jpg' },
    { url: 'javascript:alert(1)' }, { url: 'https://u:p@example.com/4.jpg' }, { url: 'http://example.com/5.jpg' }, null,
  ] }))
  assert.equal(article.images.length, 3)
  assert.equal(article.images[0].caption, '첫 사진')
  assert.equal(article.images[1].caption, '둘째 사진')
})

test('요청 병합·단일 동시 호출·본문/사진 추출·한도·인증·캐시 없음', async t => {
  configureNews('')
  await assert.rejects(loadNews('all'), /키/)
  configureNews('test-key')
  let status = 200
  let calls = 0
  let active = 0
  t.mock.method(globalThis, 'fetch', async (address, options) => {
    calls++
    assert.equal(++active, 1)
    assert.equal(options.credentials, 'omit')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.headers['x-api-key'], 'test-key')
    const url = new URL(address)
    if (url.pathname === '/extract-news') {
      assert.equal(url.searchParams.get('analyze'), 'false')
      assert.equal(url.searchParams.get('url'), item().url)
    }
    await new Promise(resolve => setTimeout(resolve, 5))
    active--
    return Response.json(url.pathname === '/extract-news' ? item() : response([item()]), { status })
  })
  const first = loadNews('all')
  assert.equal(first, loadNews('all'))
  await first
  await loadNews('all')
  assert.equal(calls, 2)
  const [news, article] = await Promise.all([loadNews('technology'), loadArticle(item().url)])
  assert.equal(news.articles[0].content, article.content)
  status = 402
  await assert.rejects(loadNews('all'), /무료 뉴스 이용량/)
  status = 403
  await assert.rejects(loadNews('all'), /이전 NewsData 키/)
  await assert.rejects(loadArticle('javascript:alert(1)'), /주소/)
})

test('키 변경 시 대기 요청과 늦은 응답 폐기', async t => {
  configureNews('old-key')
  let complete
  let started
  const ready = new Promise(resolve => { started = resolve })
  let calls = 0
  t.mock.method(globalThis, 'fetch', () => {
    calls++
    started()
    return new Promise(resolve => { complete = resolve })
  })
  const first = loadNews('all')
  const firstRejected = assert.rejects(first, /변경/)
  await ready
  const waiting = assert.rejects(loadNews('science'), /변경/)
  configureNews('new-key')
  complete(Response.json(response([item()])))
  await Promise.all([firstRejected, waiting])
  assert.equal(calls, 1)
})