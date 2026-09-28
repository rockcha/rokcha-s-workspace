import { expect, test } from '@playwright/test'
import { callMaterials, callMaterialsData, createMaterialsDatabase } from '../helpers/materials-db.mjs'
import { testToken } from '../helpers/notes-db.mjs'
import { routeWorkspaceData } from '../helpers/workspace-data-db.mjs'

let db
let failSave
test.beforeEach(async ({ page }) => {
  db = await createMaterialsDatabase()
  failSave = false
  await page.addInitScript(token => {
    sessionStorage.setItem('rokcha.workspace-session', token)
    window.driveMode = 'pick'
    window.google = {
      accounts: { oauth2: {
        hasGrantedAllScopes: () => window.driveMode !== 'deny',
        initTokenClient: config => ({ requestAccessToken: () => {
          window.driveScope = config.scope
          if (window.driveMode === 'blocked') return config.error_callback({ type: 'popup_failed_to_open' })
          if (window.driveMode === 'closed') return config.error_callback({ type: 'popup_closed' })
          config.callback({ access_token: 'fake-drive-token' })
        } }),
      } },
      picker: { DocsUploadView: class { setIncludeFolders() { return this } }, ViewId: { DOCS: 'docs' }, PickerBuilder: class {
        addView(view) { window.driveUpload = typeof view !== 'string'; return this }
        setOAuthToken() { return this }
        setDeveloperKey() { return this }
        setAppId() { return this }
        setOrigin() { return this }
        setLocale() { return this }
        setSize() { return this }
        setCallback(callback) { this.callback = callback; return this }
        build() { return {
          dispose() { window.driveDisposed = true },
          setVisible: () => {
            window.finishPicker = () => this.callback(window.driveMode === 'cancel' ? { action: 'cancel' } : { action: 'picked', docs: [{ id: 'file1', name: '수업 자료.pdf', url: window.driveMode === 'unsafe' ? 'javascript:alert(1)' : 'https://drive.google.com/file/d/file1/view' }] })
            if (window.driveMode !== 'wait') window.finishPicker()
          },
        } }
      } },
    }
    window.gapi = { load: (_name, options) => options.callback() }
  }, testToken)
  await page.route('https://notes-test.invalid/**', async route => {
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (route.request().url().endsWith('workspace_session_valid')) return route.fulfill({ json: true, headers })
    const { action, payload } = route.request().postDataJSON()
    if (failSave && action === 'save') return route.fulfill({ status: 503, json: {}, headers })
    await route.fulfill({ json: await callMaterialsData(db, action, payload), headers })
  })
  await routeWorkspaceData(page, db)
})
test.afterEach(async () => db.close())

for (const width of [320, 1440]) test(`${width}px 드라이브 선택·편집·저장 실패 복구·새로고침`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/#/materials')
  const add = page.getByRole('button', { name: '기존 파일 찾기', exact: true })
  await expect(add).toBeEnabled()
  await add.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('제목', { exact: true })).toHaveValue('수업 자료.pdf')
  await expect(page.getByRole('link', { name: '원본 확인 (새 탭)' })).toHaveAttribute('href', 'https://drive.google.com/file/d/file1/view')
  expect(await callMaterials(db, 'list')).toHaveLength(0)
  expect(await page.evaluate(() => window.driveScope)).toBe('https://www.googleapis.com/auth/drive.file')
  failSave = true
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('저장하지 못했어요')
  await expect(page.getByLabel('제목', { exact: true })).toHaveValue('수업 자료.pdf')
  failSave = false
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(add).toBeFocused()
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(1)
  const link = page.getByRole('link', { name: '수업 자료.pdf (새 탭)' })
  await expect(link).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('fake-drive-token')
  await page.screenshot({ path: `test-results/drive-${width}.png`, fullPage: true })
  await page.reload()
  await expect(link).toBeVisible()
})

test('취소·권한 거절·팝업 차단·잘못된 주소와 페이지 이동 정리', async ({ page }) => {
  await page.goto('/#/materials')
  const add = page.getByRole('button', { name: '기존 파일 찾기', exact: true })
  for (const mode of ['cancel', 'closed', 'deny', 'blocked', 'unsafe']) {
    await page.evaluate(mode => { window.driveMode = mode }, mode)
    await add.click()
    await expect(add).toBeEnabled()
    await expect(page.getByRole('dialog')).toBeHidden()
    if (['deny', 'blocked', 'unsafe'].includes(mode)) await expect(page.getByRole('alert')).toBeVisible()
    else await expect(page.getByRole('alert')).toHaveCount(0)
    expect(await callMaterials(db, 'list')).toHaveLength(0)
  }
  await page.evaluate(() => { window.driveMode = 'wait'; window.driveDisposed = false })
  await add.click()
  await page.getByRole('link', { name: '나의 작업실', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.driveDisposed)).toBe(true)
  await page.evaluate(() => window.finishPicker())
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('업로드 화면·자료 검색·수정·제거·중복 등록', async ({ page }) => {
  await page.goto('/#/materials')
  await page.getByRole('button', { name: '파일 업로드', exact: true }).click()
  expect(await page.evaluate(() => window.driveUpload)).toBe(true)
  await expect(page.getByRole('dialog')).toContainText('이미 업로드한 파일은 드라이브에 남아요')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('button', { name: '기존 파일 찾기', exact: true }).click()
  expect(await page.evaluate(() => window.driveUpload)).toBe(false)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(await callMaterials(db, 'list')).toHaveLength(1)
  await page.getByLabel('자료 검색').fill('없는 자료')
  await expect(page.getByText('검색 결과가 없어요.')).toBeVisible()
  await page.getByLabel('자료 검색').fill('')
  await page.getByRole('button', { name: '수업 자료.pdf 수정', exact: true }).click()
  await page.getByLabel('제목', { exact: true }).fill('새 제목')
  await page.getByLabel('설명', { exact: true }).fill('다음 수업')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('button', { name: '새 제목 자료실에서 제거', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText('드라이브 원본은 유지돼요')
  await page.getByRole('button', { name: '자료실에서 제거', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  expect(await callMaterials(db, 'list')).toHaveLength(0)
})

test('하위 폴더 생성·자료 이동·원본·다운로드·폴더 삭제 시 자료 보존', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.route('https://drive.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>테스트 미리보기</p>' }))
  await page.goto('/#/materials')
  await page.getByRole('button', { name: '폴더 추가', exact: true }).click()
  await page.getByLabel('폴더 이름', { exact: true }).fill('수업')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('button', { name: '수업', exact: true }).click()
  await page.getByRole('button', { name: '폴더 추가', exact: true }).click()
  await page.getByLabel('폴더 이름', { exact: true }).fill('국어')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('button', { name: '국어', exact: true }).click()
  await page.getByRole('button', { name: '기존 파일 찾기', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: '국어', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  const preview = page.getByRole('link', { name: '수업 자료.pdf (새 탭)', exact: true })
  await expect(preview).toHaveAttribute('href', 'https://drive.google.com/file/d/file1/view')
  const popupPromise = page.waitForEvent('popup')
  await preview.click()
  const popup = await popupPromise
  await expect(popup).toHaveURL('https://drive.google.com/file/d/file1/view')
  await popup.close()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('iframe')).toHaveCount(0)
  const download = page.getByRole('link', { name: '수업 자료.pdf 다운로드', exact: true })
  await expect(download).toHaveAttribute('href', 'https://drive.google.com/uc?export=download&id=file1')
  const downloadPopupPromise = page.waitForEvent('popup')
  await download.click()
  const downloadPopup = await downloadPopupPromise
  await expect(downloadPopup).toHaveURL('https://drive.google.com/uc?export=download&id=file1')
  await downloadPopup.close()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '수업 자료.pdf 수정', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '수업', exact: true }).click()
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(preview).toBeHidden()
  await page.getByRole('navigation', { name: '자료실 폴더 경로' }).getByRole('button', { name: '수업', exact: true }).click()
  await expect(preview).toBeVisible()
  await page.getByRole('button', { name: '전체 폴더', exact: true }).click()
  await page.getByRole('button', { name: '수업 폴더 삭제', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText('자료는 최상위로')
  await page.getByRole('button', { name: '폴더 삭제', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(preview).toBeVisible()
  await page.reload()
  await expect(preview).toBeVisible()
})
