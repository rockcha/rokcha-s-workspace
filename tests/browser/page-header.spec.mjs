import { expect, test } from '@playwright/test'
import { testToken } from '../helpers/notes-db.mjs'

for (const width of [1440, 320]) {
  test(`${width}px 페이지 제목과 폴더 경로가 스크롤 상단에 고정`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 })
    await page.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
    const folders = Array.from({ length: 30 }, (_, i) => ({ id: `folder-${i}`, parent_id: null, name: `폴더 ${i}`, created_at: '2026-01-01' }))
    await page.route('https://notes-test.invalid/**', route => {
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      const url = route.request().url()
      let json = true
      if (url.endsWith('manage_notes')) json = { folders, notes: [] }
      if (url.endsWith('manage_links')) json = { folders, links: [] }
      if (url.endsWith('manage_workspace_data')) json = route.request().postDataJSON().action === 'memo_get' ? { content: '', revision: 1 } : []
      return route.fulfill({ json, headers })
    })
    await page.goto('/#/workspace')
    const navigation = page.getByRole('navigation', { name: '주 메뉴', exact: true })
    await expect(navigation.getByRole('separator')).toHaveCount(4)
    for (const [category, menu] of [['일정', '캘린더'], ['자료', '메모함'], ['공부', '영단어 공부방'], ['정보', '날씨']]) {
      const toggle = navigation.getByRole('button', { name: category, exact: true })
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(navigation.getByRole('link', { name: menu, exact: true })).toBeHidden()
      await expect(toggle).toBeFocused()
      await toggle.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(navigation.getByRole('link', { name: menu, exact: true })).toBeVisible()
    }
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
    await navigation.getByRole('button', { name: '일정', exact: true }).click()
    await navigation.getByRole('button', { name: '공부', exact: true }).click()
    await page.reload()
    for (const category of ['일정', '공부']) {
      const toggle = navigation.getByRole('button', { name: category, exact: true })
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await toggle.focus()
      await toggle.press('Enter')
      await expect(toggle).toBeFocused()
    }
    await expect(navigation.getByRole('button', { name: '자료', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await page.reload()
    await expect(navigation.getByRole('button', { name: '일정', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await expect(navigation.getByRole('button', { name: '공부', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
    for (const [route, title] of [['workspace', '나의 작업실'], ['calendar', '캘린더'], ['timetable', '수업 시간표'], ['notes', '메모함'], ['links', '링크함']]) {
      await page.goto(`/#/${route}`)
      const header = page.locator('[data-slot="page-header"]')
      await expect(header.getByRole('heading', { name: title, exact: true })).toBeVisible()
      // 짧은 페이지에도 스크롤 공간을 주어 동일한 헤더 동작을 검사합니다.
      await header.locator('..').evaluate(el => { el.style.minHeight = '2400px' })
      await header.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY + 500))
      await expect.poll(async () => (await header.boundingBox()).y).toBe(0)
      await expect(header.getByRole('heading', { name: title, exact: true })).toBeInViewport()
      if (route === 'calendar') await expect(header.locator('[data-slot="calendar-weekdays"]')).toBeInViewport()
      if (route === 'timetable') await expect(header.getByRole('region', { name: '시간표 요일', exact: true })).toBeInViewport()
      expect(await header.evaluate(el => { const rect = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height - 4)) })).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (route === 'notes' || route === 'links') {
        await expect(header.getByRole('navigation', { name: '폴더 경로' })).toBeInViewport()
        await expect(header.getByRole('button', { name: '전체 폴더', exact: true })).toBeInViewport()
        await header.getByRole('button', { name: '폴더 추가', exact: true }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(header.getByRole('button', { name: '폴더 추가', exact: true })).toBeFocused()
      }
    }
    await page.screenshot({ path: `test-results/sticky-header-${width}.png`, fullPage: false })
  })
}
