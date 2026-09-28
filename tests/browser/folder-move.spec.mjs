import { expect, test } from '@playwright/test'
import { routeWorkspaceData } from '../helpers/workspace-data-db.mjs'
import { createNotesDatabase, callNotes, testToken } from '../helpers/notes-db.mjs'
import { createLinksDatabase, callLinks } from '../helpers/links-db.mjs'

for (const [kind, create, call] of [['notes', createNotesDatabase, callNotes], ['links', createLinksDatabase, callLinks]]) {
  test(`${kind}: 3·2·1열 배치와 폴더 계층 이동`, async ({ page }) => {
    const db = await create()
    try {
      const root = (await call(db, 'list')).folders[0].id
      let data = await call(db, 'create_folder', { name: '하위', parent_id: root })
      const child = data.folders.find(f => f.name === '하위').id
      await call(db, 'create_folder', { name: '목적지' })
      for (let i = 0; i < 4; i++) await call(db, kind === 'notes' ? 'create_note' : 'create_link', { folder_id: root, title: `카드 ${i}`, content: '내용', url: 'https://example.com' })
      await page.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
      await page.route('https://notes-test.invalid/**', async route => {
        const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
        if (route.request().url().endsWith('workspace_session_valid')) return route.fulfill({ json: true, headers })
        const { action, payload } = route.request().postDataJSON()
        try { await route.fulfill({ json: await call(db, action, payload), headers }) }
        catch { await route.fulfill({ status: 400, json: {}, headers }) }
      })
      await routeWorkspaceData(page, db)
      await page.goto(`/#/${kind}`)
      await page.locator(`#folder-title-${root}`).click()
      for (const [width, columns] of [[1440, 3], [1000, 2], [320, 1]]) {
        await page.setViewportSize({ width, height: 900 })
        const cards = page.locator('main ul.grid > li')
        await expect(cards).toHaveCount(4)
        const boxes = await cards.evaluateAll(elements => elements.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })))
        expect(boxes.filter(box => box.y === boxes[0].y)).toHaveLength(columns)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      if (kind === 'notes') await expect(page.locator('main')).not.toContainText('작성')
      await page.getByRole('button', { name: '전체 폴더', exact: true }).click()
      await page.getByRole('button', { name: '임시 폴더 폴더 이동', exact: true }).click()
      const picker = page.getByRole('group', { name: '폴더 위치' })
      await expect(picker.getByRole('button', { name: '임시 폴더', exact: true })).toHaveCount(0)
      await expect(picker.getByRole('button', { name: '하위', exact: true })).toHaveCount(0)
      await picker.getByRole('button', { name: '목적지', exact: true }).click()
      await page.getByRole('button', { name: '이동', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
      data = await call(db, 'list')
      expect(data.folders.find(f => f.id === root).parent_id).toBe(data.folders.find(f => f.name === '목적지').id)
      expect(data.folders.find(f => f.id === child).parent_id).toBe(root)
      await page.screenshot({ path: `test-results/${kind}-folder-move-mobile.png`, fullPage: true })
    } finally { await db.close() }
  })
}
