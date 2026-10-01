import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { createWorkspaceDatabase, routeWorkspaceData, callWorkspaceData as call } from '../helpers/workspace-data-db.mjs'
import { testToken } from '../helpers/notes-db.mjs'

let db
const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
async function connect(page) {
  await page.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
  await page.route('https://notes-test.invalid/**', route => route.fulfill({ json: true, headers }))
  await routeWorkspaceData(page, db)
}
test.beforeEach(async ({ page }) => { db = await createWorkspaceDatabase(); await connect(page) })
test.afterEach(async () => { await db.close() })

test('자동 저장 중 새 입력을 순서대로 저장하고 다른 브라우저에서 불러오기', async ({ page, browser }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  let started = false
  await page.route('**/manage_workspace_data', async route => {
    if (route.request().method() === 'OPTIONS') return route.fallback()
    const { action, payload } = route.request().postDataJSON()
    if (action !== 'memo_save' || started) return route.fallback()
    started = true
    const result = await call(db, action, payload)
    await gate
    return route.fulfill({ json: result, headers })
  })
  await page.goto('/#/workspace')
  await page.getByRole('button', { name: '작업실 메모 열기' }).click()
  const input = page.getByRole('textbox', { name: '작업실 메모 내용' })
  await input.fill('첫 번째 입력')
  await expect.poll(() => started).toBe(true)
  await input.fill('저장 중에 고친 최종 내용 🌿')
  await page.getByRole('button', { name: '메모장 닫기' }).click()
  await page.getByRole('button', { name: '작업실 나가기' }).click()
  await page.getByRole('button', { name: '작업실 메모 열기' }).click()
  await expect(page.locator('[data-sonner-toast]')).toContainText('저장이 끝난 뒤')
  release()
  await expect(page.getByRole('status')).toContainText('저장됨')
  expect((await call(db, 'memo_get')).content).toBe('저장 중에 고친 최종 내용 🌿')
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  const context = await browser.newContext()
  try {
    const second = await context.newPage()
    await connect(second)
    await second.goto('http://127.0.0.1:4175/#/workspace')
    await second.getByRole('button', { name: '작업실 메모 열기' }).click()
    await expect(second.getByRole('textbox', { name: '작업실 메모 내용' })).toHaveValue('저장 중에 고친 최종 내용 🌿')
    expect(await second.evaluate(() => localStorage.length)).toBe(0)
  } finally { await context.close() }
})

test('처음 불러오기 실패 시 빈 메모로 덮어쓰지 않으며 재시도 후 저장 가능', async ({ page }) => {
  await call(db, 'memo_save', { content: '기존 서버 내용', revision: 1 })
  let fail = true
  let writes = 0
  await page.route('**/manage_workspace_data', route => {
    if (route.request().method() === 'OPTIONS') return route.fallback()
    const { action } = route.request().postDataJSON()
    if (action === 'memo_save') writes++
    if (action === 'memo_get' && fail) return route.fulfill({ status: 503, json: {}, headers })
    return route.fallback()
  })
  await page.goto('/#/workspace')
  await page.getByRole('button', { name: '작업실 메모 열기' }).click()
  const input = page.getByRole('textbox', { name: '작업실 메모 내용' })
  await expect(page.getByRole('dialog', { name: '작업실 메모장' }).getByRole('status')).toContainText('불러오지 못했어요')
  await expect(input).toBeDisabled()
  expect(writes).toBe(0)
  fail = false
  await page.getByRole('button', { name: '다시 시도' }).click()
  await expect(input).toHaveValue('기존 서버 내용')
  await input.fill('수정한 내용')
  await expect(page.getByRole('status')).toContainText('저장됨')
  expect((await call(db, 'memo_get')).content).toBe('수정한 내용')
})

test('기존 기록 가져오기 충돌 시 전체 원본 유지, 해결 후 함께 이전', async ({ page }) => {
  await call(db, 'memo_save', { content: '다른 기기 메모', revision: 1 })
  await page.goto('/#/workspace')
  await page.evaluate(id => {
    localStorage.setItem('rokcha.calendar', JSON.stringify([{ id, type: 'event', title: '이전 일정', date: '2026-09-24', time: '', content: '' }]))
    localStorage.setItem('rokcha.workspace-memo', '브라우저 메모')
  }, randomUUID())
  await page.reload()
  await page.getByRole('button', { name: '기존 기록 가져오기', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('브라우저 원본은 그대로')
  expect(await call(db, 'calendar_list')).toHaveLength(0)
  expect(await page.evaluate(() => localStorage.getItem('rokcha.workspace-memo'))).toBe('브라우저 메모')
  await call(db, 'memo_save', { content: '', revision: 2 })
  await page.getByRole('button', { name: '기존 기록 가져오기', exact: true }).click()
  await page.getByRole('button', { name: '작업실 메모 열기' }).click()
  await expect(page.getByRole('textbox', { name: '작업실 메모 내용' })).toHaveValue('브라우저 메모')
  expect(await call(db, 'calendar_list')).toHaveLength(1)
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
})

test('서버 저장 후 응답 유실 시 재시도해도 일정이 중복되지 않음', async ({ page }) => {
  let loseResponse = true
  await page.route('**/manage_workspace_data', async route => {
    if (route.request().method() === 'OPTIONS') return route.fallback()
    const { action, payload } = route.request().postDataJSON()
    if (action !== 'calendar_save' || !loseResponse) return route.fallback()
    loseResponse = false
    await call(db, action, payload)
    return route.fulfill({ status: 503, json: {}, headers })
  })
  await page.goto('/#/calendar/2026-09-24')
  await page.getByRole('button', { name: '일정 추가', exact: true }).click()
  await page.getByLabel('제목', { exact: true }).fill('한 번만 저장')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.locator('[data-sonner-toast]')).toContainText('저장하지 못했어요')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(await call(db, 'calendar_list')).toHaveLength(1)
})
