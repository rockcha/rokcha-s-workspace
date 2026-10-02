import { expect, test } from '@playwright/test'
import { routeWorkspaceData } from '../helpers/workspace-data-db.mjs'
import { callLinks, createLinksDatabase } from '../helpers/links-db.mjs'
import { testToken } from '../helpers/notes-db.mjs'

test.describe('링크함', () => {
  let db
  let failSave
  test.beforeEach(async ({ page }) => {
    db = await createLinksDatabase()
    failSave = false
    await page.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
    await page.route('https://notes-test.invalid/**', async route => {
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      if (route.request().url().endsWith('workspace_session_valid')) return route.fulfill({ json: true, headers })
      expect(route.request().headers()['x-workspace-session']).toBe(testToken)
      expect(route.request().url()).toContain('manage_links')
      const { action, payload } = route.request().postDataJSON()
      if (failSave && action === 'create_link') return route.fulfill({ status: 503, json: {}, headers })
      try { await route.fulfill({ json: await callLinks(db, action, payload), headers }) }
      catch { await route.fulfill({ status: 400, json: {}, headers }) }
    })
    await routeWorkspaceData(page, db)
    await page.route('https://example.com/**', route => {
      if (route.request().url().endsWith('cover.svg')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#d5e5c9"/><circle cx="320" cy="180" r="90" fill="#70945a"/></svg>' })
      if (route.request().url().endsWith('blocked')) return route.abort()
      return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'text/html', body: '<html><head><meta property="og:image" content="/cover.svg"></head><body>자료</body></html>' })
    })
  })
  test.afterEach(async () => { await db.close() })

  for (const width of [320, 1440]) {
    test(width + 'px 전체 폴더 제목 검색과 초기화', async ({ page }) => {
      await page.setViewportSize({ width, height: 960 })
      const root = (await callLinks(db, 'list')).folders[0]
      await callLinks(db, 'create_folder', { name: '검색 하위 폴더', parent_id: root.id })
      const child = (await callLinks(db, 'list')).folders.find(folder => folder.name === '검색 하위 폴더')
      await callLinks(db, 'create_link', { folder_id: child.id, title: 'Green Tea 기록', content: '본문 전용 검색어', url: 'https://example.com/article', image_url: '', })
      await page.goto('/#/links')
      const search = page.getByRole('searchbox', { name: '링크 제목 검색' })
      await search.focus()
      await expect(search).toBeFocused()
      await search.fill('  green TEA  ')
      await expect(page.getByRole('status')).toHaveText('검색 결과 1개')
      await expect(page.locator('main ul')).toContainText('Green Tea 기록')
      await search.fill('본문 전용 검색어')
      await expect(page.getByRole('status')).toHaveText('검색 결과 0개')
      await expect(page.getByText('검색 결과가 없어요. 다른 제목으로 검색해 주세요.')).toBeVisible()
      await search.fill('')
      await expect(page.locator('button[id^="folder-title-"]')).toHaveCount(1)
      await expect(page.locator('main ul')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
    })
  }

  for (const width of [320, 1440]) {
    test(width + 'px 폴더 탐색, 이미지 카드, 새 탭, 편집·이동·삭제', async ({ page }) => {
      await page.setViewportSize({ width, height: 960 })
      await page.goto('/#/links')
      await page.locator('button[id^="folder-title-"]').click()
      await page.getByRole('button', { name: '폴더 추가', exact: true }).click()
      await page.getByLabel('폴더 이름', { exact: true }).fill('디자인 자료')
      await page.getByRole('button', { name: '저장', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
      await page.locator('button[id^="folder-title-"]').click()
      await page.getByRole('button', { name: '링크 추가', exact: true }).click()
      await page.getByLabel('제목', { exact: true }).fill('영감을 주는 페이지')
      await page.getByLabel('링크 주소', { exact: true }).fill('https://example.com/article')
      await page.getByRole('button', { name: '미리보기 가져오기', exact: true }).click()
      await expect(page.getByLabel('미리보기 이미지 주소 (선택)', { exact: true })).toHaveValue('https://example.com/cover.svg')
      await page.getByLabel('설명 (선택)', { exact: true }).fill('마음에 드는 디자인을 차곡차곡 모아 두어요.')
      await page.getByRole('button', { name: '저장', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
      const card = page.getByRole('link', { name: '영감을 주는 페이지 (새 탭)' })
      await expect(card).toHaveAttribute('href', 'https://example.com/article')
      await expect(card.locator('img')).toBeVisible()
      await card.focus()
      const popupPromise = page.waitForEvent('popup')
      await page.keyboard.press('Enter')
      const popup = await popupPromise
      await expect(popup).toHaveURL('https://example.com/article')
      await popup.close()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: 'test-results/links-' + width + '.png', fullPage: true })
      await page.getByRole('button', { name: '영감을 주는 페이지 수정', exact: true }).click()
      await page.getByLabel('제목', { exact: true }).fill('수정한 링크')
      await page.getByRole('button', { name: '저장', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
      await page.getByRole('button', { name: '수정한 링크 폴더 이동', exact: true }).click()
      await page.getByRole('group', { name: '폴더', exact: true }).getByRole('button', { name: '임시 폴더', exact: true }).click()
      await page.getByRole('button', { name: '이동', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
      await expect(page.getByRole('link', { name: '수정한 링크 (새 탭)' })).toBeHidden()
      await page.getByRole('button', { name: '임시 폴더', exact: true }).click()
      await expect(page.getByRole('link', { name: '수정한 링크 (새 탭)' })).toBeVisible()
      await page.reload()
      await page.locator('button[id^="folder-title-"]').click()
      await expect(page.getByRole('link', { name: '수정한 링크 (새 탭)' })).toBeVisible()
      await page.getByRole('button', { name: '전체 폴더', exact: true }).click()
      await page.getByRole('button', { name: '임시 폴더 폴더 삭제', exact: true }).click()
      await expect(page.getByRole('alertdialog')).toContainText('링크 1개')
      await page.getByRole('button', { name: '폴더와 링크 삭제', exact: true }).click()
      await expect(page.getByRole('alertdialog')).toBeHidden()
      await expect(page.getByRole('button', { name: '폴더 추가', exact: true }).first()).toBeFocused()
      expect((await callLinks(db, 'list')).links).toHaveLength(0)
    })
  }

  test('미리보기 실패, 잘못된 주소, 저장 실패 복구와 키보드 포커스', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/#/links')
    await page.locator('button[id^="folder-title-"]').click()
    await page.getByRole('button', { name: '링크 추가', exact: true }).click()
    await page.getByLabel('제목', { exact: true }).fill('이미지 없는 링크')
    await page.getByLabel('링크 주소', { exact: true }).fill('javascript:alert(1)')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('http')
    await page.getByLabel('링크 주소', { exact: true }).fill('https://example.com/blocked')
    await page.getByRole('button', { name: '미리보기 가져오기', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('이미지를 가져올 수 없어요.')
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await page.getByRole('dialog').evaluate(element => element.contains(document.activeElement))).toBe(true)
    }
    failSave = true
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('저장하지 못했어요.')
    await expect(page.getByLabel('제목', { exact: true })).toHaveValue('이미지 없는 링크')
    failSave = false
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: '링크 추가', exact: true })).toBeFocused()
    await expect(page.getByRole('link', { name: '이미지 없는 링크 (새 탭)' })).toBeVisible()
    await expect(page.locator('main img')).toHaveCount(0)
    await page.getByRole('button', { name: '이미지 없는 링크 삭제', exact: true }).click()
    await page.getByRole('button', { name: '링크 삭제', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toBeHidden()
    expect((await callLinks(db, 'list')).links).toHaveLength(0)
  })
})
