import { expect, test } from '@playwright/test'
import { callNotes, createNotesDatabase, testToken } from '../helpers/notes-db.mjs'

test.describe('메모함', () => {
  let db
  let actions
  let failAction
  let delayAction

  test.beforeEach(async ({ page }) => {
    db = await createNotesDatabase()
    actions = []
    failAction = ''
    delayAction = ''
    await page.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
    await page.route('https://notes-test.invalid/**', async route => {
      const request = route.request()
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      if (request.url().endsWith('workspace_session_valid')) return route.fulfill({ json: true, headers })
      expect(request.headers()['x-workspace-session']).toBe(testToken)
      const { action, payload } = request.postDataJSON()
      actions.push(action)
      if (action === delayAction) await new Promise(resolve => setTimeout(resolve, 400))
      if (action === failAction) return route.fulfill({ status: 503, json: { message: 'test failure' }, headers })
      try {
        return await route.fulfill({ json: await callNotes(db, action, payload), headers })
      } catch {
        return await route.fulfill({ status: 400, json: { message: 'test SQL error' }, headers })
      }
    })
  })

  test.afterEach(async () => { await db.close() })

  test('폴더 위치 선택, 여러 계층 표시·필터·접기와 하위 폴더 연쇄 삭제', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await page.goto('/#/notes')
    await page.getByRole('button', { name: '폴더 추가', exact: true }).click()
    await expect(page.getByLabel('폴더 위치')).toHaveValue('')
    await page.getByLabel('폴더 위치').selectOption({ label: '임시 폴더' })
    await page.getByLabel('폴더 이름', { exact: true }).fill('하위 폴더')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('combobox', { name: '폴더 필터' }).selectOption({ label: '임시 폴더 / 하위 폴더' })
    await page.getByRole('button', { name: '폴더 추가', exact: true }).click()
    await expect(page.getByLabel('폴더 위치').locator('option:checked')).toHaveText('임시 폴더 / 하위 폴더')
    await page.getByLabel('폴더 이름', { exact: true }).fill('손자 폴더')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('button', { name: '손자 폴더에 메모 추가', exact: true }).click()
    await expect(page.getByLabel('폴더', { exact: true }).locator('option:checked')).toHaveText('임시 폴더 / 하위 폴더 / 손자 폴더')
    await page.getByLabel('제목', { exact: true }).fill('계층 메모')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('combobox', { name: '폴더 필터' }).selectOption('all')
    await expect(page.getByRole('button', { name: /^계층 메모 내용/ })).toBeVisible()
    await page.locator('button[id^="folder-title-"]').filter({ hasText: '임시 폴더' }).click()
    await expect(page.getByRole('button', { name: '손자 폴더에 메모 추가', exact: true })).toBeHidden()
    await page.getByRole('combobox', { name: '폴더 필터' }).selectOption({ label: '임시 폴더 / 하위 폴더' })
    await expect(page.getByRole('button', { name: /^계층 메모 내용/ })).toBeVisible()
    await page.getByRole('combobox', { name: '보기 방식' }).selectOption('latest')
    await expect(page.locator('main ul li')).toContainText('임시 폴더 / 하위 폴더 / 손자 폴더')
    await page.getByRole('combobox', { name: '보기 방식' }).selectOption('folders')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/notes-nested-mobile.png', fullPage: true })
    await page.reload()
    await expect(page.getByRole('button', { name: '손자 폴더에 메모 추가', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '임시 폴더 폴더 삭제', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toContainText('하위 폴더 2개')
    await expect(page.getByRole('alertdialog')).toContainText('메모 1개')
    await page.getByRole('button', { name: '폴더와 메모 삭제', exact: true }).click()
    await expect(page.getByRole('heading', { name: '첫 폴더를 만들어 보세요' })).toBeVisible()
    expect((await callNotes(db, 'list')).notes).toHaveLength(0)
  })

  test('폴더·메모 CRUD, 이동, 필터, 최신순, 새로고침과 삭제 확인', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/#/notes')
    await expect(page.getByRole('combobox', { name: '보기 방식' })).toHaveValue('folders')
    await page.getByRole('button', { name: '폴더 추가', exact: true }).click()
    await page.getByLabel('폴더 이름', { exact: true }).fill('아이디어')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('button', { name: '아이디어 이름 수정', exact: true }).click()
    await page.getByLabel('폴더 이름', { exact: true }).fill('생각 모음')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.getByRole('button', { name: '임시 폴더에 메모 추가', exact: true }).click()
    await page.getByLabel('제목', { exact: true }).fill('첫 메모')
    await page.getByLabel('내용', { exact: true }).fill('잊지 않을 작은 생각')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('button', { name: /^첫 메모 잊지/ }).click()
    await page.getByLabel('제목', { exact: true }).fill('수정한 메모')
    await page.getByLabel('내용', { exact: true }).fill('조금 더 다듬은 생각')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('button', { name: '수정한 메모 폴더 이동', exact: true }).click()
    await page.getByLabel('폴더', { exact: true }).selectOption({ label: '생각 모음' })
    await page.getByRole('button', { name: '이동', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('combobox', { name: '폴더 필터' }).selectOption({ label: '임시 폴더' })
    await expect(page.getByRole('button', { name: /^수정한 메모 조금/ })).toBeHidden()
    await page.getByRole('combobox', { name: '폴더 필터' }).selectOption('all')

    await page.getByRole('button', { name: '생각 모음에 메모 추가', exact: true }).click()
    await page.getByLabel('제목', { exact: true }).fill('최근 메모')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('combobox', { name: '보기 방식' }).selectOption('latest')
    await expect(page.locator('main ul li').first()).toContainText('최근 메모')
    await page.reload()
    await expect(page.getByRole('button', { name: /^수정한 메모 조금/ })).toBeVisible()
    await expect(page.getByRole('combobox', { name: '보기 방식' })).toHaveValue('folders')
    await page.screenshot({ path: 'test-results/notes-desktop.png', fullPage: true })

    await page.getByRole('button', { name: '최근 메모 삭제', exact: true }).click()
    await page.getByRole('button', { name: '메모 삭제', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toBeHidden()
    await page.getByRole('button', { name: '생각 모음 폴더 삭제', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toContainText('메모 1개')
    await expect(page.getByRole('button', { name: '취소', exact: true })).toBeFocused()
    await page.getByRole('button', { name: '취소', exact: true }).click()
    expect(actions.filter(action => action === 'delete_folder')).toHaveLength(0)
    await expect(page.getByRole('button', { name: '생각 모음 폴더 삭제', exact: true })).toBeFocused()
    await page.getByRole('button', { name: '생각 모음 폴더 삭제', exact: true }).click()
    await page.getByRole('button', { name: '폴더와 메모 삭제', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toBeHidden()
    await expect(page.getByRole('button', { name: '폴더 추가', exact: true })).toBeFocused()
    expect((await callNotes(db, 'list')).notes).toHaveLength(0)
    expect(errors).toEqual([])
  })

  test('320px 모바일, 긴 이름, 키보드 포커스, 중복 제출 방지와 실패 시 입력 유지', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await callNotes(db, 'create_folder', { name: '아주 긴 이름의 폴더도 화면을 벗어나지 않고 깔끔하게 표시되어야 합니다' })
    await page.goto('/#/notes')
    const addButton = page.getByRole('button', { name: '메모 추가', exact: true })
    await expect(addButton).toBeEnabled()
    await page.screenshot({ path: 'test-results/notes-mobile.png', fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await addButton.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(page.getByLabel('폴더', { exact: true })).toBeFocused()
    await page.getByLabel('제목', { exact: true }).fill('실패해도 유지될 제목')
    await page.getByLabel('내용', { exact: true }).fill('실패해도 유지될 내용')
    await expect(dialog).toHaveCSS('opacity', '1')
    await page.screenshot({ path: 'test-results/notes-mobile-editor.png', fullPage: true })
    const bounds = await dialog.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
    }
    failAction = 'create_note'
    delayAction = 'create_note'
    await page.getByRole('button', { name: '저장', exact: true }).dblclick()
    await expect(dialog.getByRole('alert')).toBeVisible()
    expect(actions.filter(action => action === 'create_note')).toHaveLength(1)
    await expect(page.getByLabel('제목', { exact: true })).toHaveValue('실패해도 유지될 제목')
    await expect(page.getByLabel('내용', { exact: true })).toHaveValue('실패해도 유지될 내용')
    failAction = ''
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(1)
    await expect(addButton).toBeFocused()

    await page.getByRole('button', { name: '임시 폴더 폴더 삭제', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toHaveCSS('opacity', '1')
    await page.screenshot({ path: 'test-results/notes-mobile-delete.png', fullPage: true })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toBeHidden()
    await expect(page.getByRole('button', { name: '임시 폴더 폴더 삭제', exact: true })).toBeFocused()
  })

  test('불러오기 실패 후 재시도 및 마지막 폴더 삭제 후 다시 만들기', async ({ page }) => {
    failAction = 'list'
    await page.goto('/#/notes')
    await expect(page.getByRole('alert')).toBeVisible()
    failAction = ''
    await page.getByRole('button', { name: '다시 시도' }).click()
    await page.getByRole('button', { name: '임시 폴더 폴더 삭제', exact: true }).click()
    await page.getByRole('button', { name: '폴더와 메모 삭제', exact: true }).click()
    await expect(page.getByRole('heading', { name: '첫 폴더를 만들어 보세요' })).toBeVisible()
    await expect(page.getByRole('button', { name: '메모 추가', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: '폴더 추가', exact: true }).first().click()
    await page.getByLabel('폴더 이름', { exact: true }).fill('다시 시작')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('button', { name: '메모 추가', exact: true })).toBeEnabled()
  })
})
