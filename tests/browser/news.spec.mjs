import { expect, test } from '@playwright/test'
import { testToken } from '../helpers/notes-db.mjs'
const first = { title: '교사를 위한 AI 도구', url: 'https://news.example.com/ai', publish_date: '2026-09-25 01:00:00', text: '수업 자료를 만드는 인공지능 도구입니다.\n\n교실에서 활용하는 방법을 살펴봅니다.\n\n마지막 문단까지 원문입니다.', authors: ['김기자'], language: 'ko', source_country: 'kr', image: 'https://news.example.com/1.svg' }
const data = { news: [first, { ...first, title: '새로운 과학 연구', url: 'https://news.example.com/science', text: '연구진이 새로운 발견을 발표했습니다.' }] }
const detail = { ...first, summary: '표시하면 안 되는 요약', images: [{ url: first.image, title: '교실에서 사용하는 도구' }, { url: 'https://news.example.com/2.svg', title: '실습하는 모습' }, { url: 'https://news.example.com/3.svg', title: '완성된 수업 자료' }] }

test.beforeEach(async ({ page }) => {
  await page.route('https://news.example.com/*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"><rect width="1000" height="500" fill="#dce9d9"/></svg>' }))
  await page.route('https://api.worldnewsapi.com/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
    expect(route.request().headers()['x-api-key']).toBe('test-key')
    return route.fulfill({ json: route.request().url().includes('/extract-news') ? detail : data })
  })
  await page.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
  await page.route('https://notes-test.invalid/**', route => {
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const json = route.request().url().includes('manage_workspace_data') ? route.request().postDataJSON().action === 'memo_get' ? { content: '', revision: 1 } : [] : true
    return route.fulfill({ json, headers })
  })
})
async function connect(page, path = '/#/news') {
  await page.goto(path)
  await page.getByLabel('뉴스 API 키', { exact: true }).fill('test-key')
  await page.getByRole('button', { name: '뉴스 연결하기' }).click()
}
for (const width of [1440, 320]) {
  test(`${width}px 원문·모든 이미지·키보드 복귀·검색·카테고리`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 })
    await connect(page)
    await page.getByRole('textbox', { name: '불러온 뉴스 검색' }).fill('수업 자료')
    const link = page.getByRole('link', { name: '교사를 위한 AI 도구 읽기' })
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/news\/read\?/)
    await expect(page.getByRole('article')).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(page.getByRole('article')).toContainText('마지막 문단까지 원문입니다.')
    await expect(page.getByRole('article')).not.toContainText('표시하면 안 되는 요약')
    await expect(page.getByRole('img')).toHaveCount(3)
    await expect(page.getByRole('img', { name: '완성된 수업 자료' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(context.pages()).toHaveLength(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/news-reader-${width}.png`, fullPage: true })
    await page.goBack()
    await expect(link).toBeFocused()
    await expect(page.getByRole('textbox', { name: '불러온 뉴스 검색' })).toHaveValue('수업 자료')
    await expect(page.getByRole('listitem')).toHaveCount(1)
    await page.getByRole('button', { name: '교육', exact: true }).click()
    await expect(page.getByRole('list', { name: '교육 뉴스' })).toBeVisible()
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
    await page.screenshot({ path: `test-results/news-${width}.png`, fullPage: true })
  })
}

test('오류 복구·기존 기사 유지·무료 한도·키 변경', async ({ page }) => {
  let status = 403
  await page.route('https://api.worldnewsapi.com/search-news**', route => route.fulfill({ status, json: data }))
  await connect(page)
  await expect(page.getByRole('alert')).toContainText('World News API 키')
  status = 200
  await page.getByRole('button', { name: '다시 불러오기' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(2)
  status = 402
  await page.getByRole('button', { name: '새로고침', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('오늘의 무료 뉴스 이용량')
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await page.getByRole('button', { name: '뉴스 연결 해제' }).click()
  await expect(page.getByLabel('뉴스 API 키', { exact: true })).toBeEmpty()
  await page.reload()
  await expect(page.getByLabel('뉴스 API 키', { exact: true })).toBeEmpty()
})

test('직접 진입·새로고침·추출만 요청·이미지 실패 표시', async ({ page }) => {
  let searchCalls = 0
  await page.route('https://api.worldnewsapi.com/search-news**', route => { searchCalls++; return route.fulfill({ json: data }) })
  await page.route('https://news.example.com/2.svg', route => route.abort())
  const path = '/#/news/read?' + new URLSearchParams({ topic: 'technology', article: first.url })
  await connect(page, path)
  await expect(page.getByRole('article')).toContainText('마지막 문단까지 원문입니다.')
  await page.getByText('실습하는 모습', { exact: true }).scrollIntoViewIfNeeded()
  await expect(page.getByText('사진을 불러오지 못했어요.', { exact: false })).toBeVisible()
  expect(searchCalls).toBe(0)
  await page.reload()
  await expect(page.getByLabel('뉴스 API 키', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('article')).toContainText('마지막 문단까지 원문입니다.')
  expect(searchCalls).toBe(0)
})

test('추출 실패·재시도·원문 유지', async ({ page }) => {
  let status = 503
  await page.route('https://api.worldnewsapi.com/extract-news**', route => route.fulfill({ status, json: detail }))
  await connect(page)
  await page.getByRole('link', { name: '교사를 위한 AI 도구 읽기' }).click()
  await expect(page.getByRole('alert')).toContainText('추가 사진은 확인하지 못했어요')
  await expect(page.getByRole('article')).toContainText('마지막 문단까지 원문입니다.')
  status = 200
  await page.getByRole('button', { name: '다시 불러오기' }).click()
  await expect(page.getByRole('img')).toHaveCount(3)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('본문 없는 응답·외국어·잘못된 주소를 요약으로 대체하지 않음', async ({ page }) => {
  await page.route('https://api.worldnewsapi.com/extract-news**', route => route.fulfill({ json: { ...detail, text: '', summary: '표시하면 안 되는 요약' } }))
  await connect(page, '/#/news/read?' + new URLSearchParams({ article: first.url }))
  await expect(page.getByRole('alert')).toContainText('한국어 기사 본문을 가져오지 못했어요')
  await expect(page.getByRole('article')).not.toContainText('표시하면 안 되는 요약')
  await page.goto('/#/news/read?article=javascript%3Aalert(1)')
  await expect(page.getByRole('alert')).toContainText('기사 주소가 올바르지 않아요')
  await expect(page.getByRole('link', { name: '원문 출처 보기' })).toHaveCount(0)
})
test('새 창에서도 자동 연결·연결 해제 후 저장 삭제', async ({ page, context }) => {
  await connect(page)
  await expect(page.getByRole('listitem')).toHaveCount(2)
  const nextPage = await context.newPage()
  await nextPage.route('https://api.worldnewsapi.com/**', route => route.fulfill({ json: data }))
  await nextPage.route('https://notes-test.invalid/**', route => {
    const json = route.request().url().includes('manage_workspace_data') ? route.request().postDataJSON()?.action === 'memo_get' ? { content: '', revision: 1 } : [] : true
    return route.fulfill({ json })
  })
  await nextPage.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
  await nextPage.goto('/#/news')
  await expect(nextPage.getByRole('listitem')).toHaveCount(2)
  await expect(nextPage.getByLabel('뉴스 API 키', { exact: true })).toHaveCount(0)
  await nextPage.getByRole('button', { name: '뉴스 연결 해제' }).click()
  await page.reload()
  await expect(page.getByLabel('뉴스 API 키', { exact: true })).toBeEmpty()
})

test('키 저장 실패는 화면에 안내하고 연결했다고 표시하지 않음', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'rokcha.world-news-api-key') throw new DOMException('Storage blocked', 'SecurityError')
      return original.call(this, key, value)
    }
  })
  await connect(page)
  await expect(page.getByRole('alert')).toContainText('브라우저에 키를 저장하지 못했어요')
  await expect(page.getByLabel('뉴스 API 키', { exact: true })).toBeVisible()
})