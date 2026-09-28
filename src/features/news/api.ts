export const newsTopics = [
  { id: 'all', label: '전체', emoji: '📰', description: '한국어로 읽는 오늘의 소식' },
  { id: 'politics', label: '정치', emoji: '🏛️', description: '정치와 정책의 흐름' },
  { id: 'business', label: '경제', emoji: '📈', description: '경제와 산업의 변화' },
  { id: 'technology', label: '기술', emoji: '💻', description: '새로운 기술과 디지털 생활' },
  { id: 'science', label: '과학', emoji: '🔬', description: '연구와 새로운 발견' },
  { id: 'education', label: '교육', emoji: '📚', description: '학교와 배움의 이야기' },
  { id: 'environment', label: '환경', emoji: '🌱', description: '기후와 환경의 변화' },
  { id: 'health', label: '건강', emoji: '🩺', description: '건강과 의료 소식' },
  { id: 'sports', label: '스포츠', emoji: '⚽', description: '경기와 선수들의 이야기' },
  { id: 'entertainment', label: '연예', emoji: '🎬', description: '방송과 연예 소식' },
  { id: 'culture', label: '문화', emoji: '🎨', description: '문화와 예술의 현장' },
  { id: 'lifestyle', label: '생활', emoji: '☕', description: '일상과 생활의 변화' },
  { id: 'travel', label: '여행', emoji: '🧳', description: '여행과 새로운 장소' },
  { id: 'other', label: '기타', emoji: '📌', description: '그 밖의 다양한 소식' },
] as const

export type NewsTopic = typeof newsTopics[number]['id']
export type NewsImage = { url: string; caption: string }
export type NewsArticle = { title: string; url: string; source: string; publishedAt: string; author: string; content: string; images: NewsImage[] }
export type NewsData = { topic: NewsTopic; articles: NewsArticle[]; updatedAt: string }
const unavailable = '뉴스를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
const keyStorageName = 'rokcha.world-news-api-key'
function savedNewsKey() {
  try { return window.localStorage.getItem(keyStorageName)?.trim() ?? '' }
  catch { return '' }
}
let apiKey = savedNewsKey()
let generation = 0
let queue: Promise<unknown> = Promise.resolve()
let nextRequestAt = 0
const pending = new Map<string, Promise<unknown>>()

export function configureNews(key: string) {
  const nextKey = key.trim()
  if (typeof window !== 'undefined') {
    try {
      if (nextKey) window.localStorage.setItem(keyStorageName, nextKey)
      else window.localStorage.removeItem(keyStorageName)
    } catch {
      throw new Error(nextKey ? '브라우저에 키를 저장하지 못했어요. 사이트 저장 권한을 확인해 주세요.' : '저장된 키를 지우지 못했어요. 사이트 저장 권한을 확인해 주세요.')
    }
  }
  apiKey = nextKey
  generation++
  pending.clear()
}
export function newsConfigured() { return Boolean(apiKey) }

export function safeNewsUrl(value: unknown) {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return ''
    url.hash = ''
    return url.href
  } catch { return '' }
}

export function newsUrl(topic: NewsTopic) {
  if (!newsTopics.some(item => item.id === topic)) throw new Error(unavailable)
  const url = new URL('https://api.worldnewsapi.com/search-news')
  url.search = new URLSearchParams({ language: 'ko', 'source-countries': 'kr', sort: 'publish-time', 'sort-direction': 'DESC', number: '12' }).toString()
  if (topic !== 'all') url.searchParams.set('categories', topic)
  return url.href
}

export function parseArticle(value: unknown): NewsArticle | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const url = safeNewsUrl(item.url)
  if (!url || item.language !== 'ko' || typeof item.title !== 'string' || !item.title.trim() || typeof item.text !== 'string' || !item.text.trim()) return null
  // Never substitute the provider's generated summary for missing article text.
  const date = typeof item.publish_date === 'string' ? item.publish_date.replace(' ', 'T') : ''
  const publishedAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(date) ? date + 'Z' : date
  if (!Number.isFinite(Date.parse(publishedAt))) return null
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(publishedAt) && new Date(publishedAt).toISOString() !== publishedAt.replace('Z', '.000Z')) return null
  const images: NewsImage[] = []
  const seen = new Set<string>()
  const addImage = (value: unknown, caption: unknown) => {
    const image = safeNewsUrl(value)
    if (!image.startsWith('https:') || seen.has(image)) return
    seen.add(image)
    images.push({ url: image, caption: typeof caption === 'string' ? caption : '' })
  }
  addImage(item.image, '')
  if (Array.isArray(item.images)) for (const value of item.images) {
    if (!value || typeof value !== 'object') continue
    const image = value as Record<string, unknown>
    const existing = images.find(entry => entry.url === safeNewsUrl(image.url))
    if (existing && typeof image.title === 'string') existing.caption = image.title
    else addImage(image.url, image.title)
  }
  return {
    title: item.title.trim(), url, source: new URL(url).hostname.replace(/^www\./, ''), publishedAt,
    author: Array.isArray(item.authors) ? item.authors.filter((name): name is string => typeof name === 'string').join(', ') : typeof item.author === 'string' ? item.author : '',
    content: item.text, images,
  }
}

export function parseArticles(body: unknown): NewsArticle[] {
  if (!body || typeof body !== 'object' || !('news' in body) || !Array.isArray(body.news)) throw new Error(unavailable)
  const articles: NewsArticle[] = []
  const urls = new Set<string>()
  const titles = new Set<string>()
  for (const value of body.news) {
    if (!value || typeof value !== 'object' || value.source_country !== 'kr') continue
    const article = parseArticle(value)
    if (!article || urls.has(article.url) || titles.has(article.title)) continue
    urls.add(article.url)
    titles.add(article.title)
    articles.push(article)
  }
  if (body.news.length && !articles.length) throw new Error('읽을 수 있는 한국어 기사 본문을 받지 못했어요. 다른 분야를 선택해 주세요.')
  return articles.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
}

function request<T>(url: string, parse: (body: unknown) => T): Promise<T> {
  if (!apiKey) return Promise.reject(new Error('World News API 키를 연결해 주세요.'))
  const existing = pending.get(url)
  if (existing) return existing as Promise<T>
  const requestGeneration = generation
  const key = apiKey
  const ensureCurrent = () => { if (requestGeneration !== generation) throw new Error('뉴스 연결이 변경됐어요. 다시 불러와 주세요.') }
  const promise = queue.then(async () => {
    ensureCurrent()
    const delay = nextRequestAt - Date.now()
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
    ensureCurrent()
    nextRequestAt = Date.now() + 1_100
    const response = await fetch(url, { headers: { 'x-api-key': key }, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(20_000) })
    ensureCurrent()
    if (response.status === 429) {
      const retry = response.headers.get('retry-after')
      const until = retry && /^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry ?? '')
      nextRequestAt = Math.max(nextRequestAt, Number.isFinite(until) ? until : Date.now() + 30_000)
      throw new Error('뉴스 요청이 잠시 몰렸어요. 잠시 후 다시 불러와 주세요.')
    }
    if (response.status === 401 || response.status === 403) throw new Error('World News API 키와 이용 권한을 확인해 주세요. 이전 NewsData 키는 사용할 수 없어요.')
    if (response.status === 402) throw new Error('오늘의 무료 뉴스 이용량을 모두 사용했어요. 내일 다시 이용해 주세요.')
    if (!response.ok) throw new Error(unavailable)
    const body: unknown = await response.json()
    ensureCurrent()
    return parse(body)
  }).finally(() => { if (pending.get(url) === promise) pending.delete(url) })
  pending.set(url, promise)
  queue = promise.catch(() => undefined)
  return promise
}

export function loadNews(topic: NewsTopic): Promise<NewsData> {
  return request(newsUrl(topic), body => ({ topic, articles: parseArticles(body), updatedAt: new Date().toISOString() }))
}

export function loadArticle(articleUrl: string): Promise<NewsArticle> {
  const source = safeNewsUrl(articleUrl)
  if (!source || source.length > 1000) return Promise.reject(new Error('기사 주소가 올바르지 않아요. 뉴스 목록에서 다시 선택해 주세요.'))
  const url = new URL('https://api.worldnewsapi.com/extract-news')
  url.search = new URLSearchParams({ url: source, analyze: 'false' }).toString()
  return request(url.href, body => {
    const article = parseArticle(body)
    if (!article) throw new Error('한국어 기사 본문을 가져오지 못했어요. 원문 출처에서 확인해 주세요.')
    return article
  })
}
