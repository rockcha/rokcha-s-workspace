import { test, expect } from '@playwright/test'
import { createWorkspaceDatabase, routeWorkspaceData } from '../helpers/workspace-data-db.mjs'
import { testToken } from '../helpers/notes-db.mjs'

let db
test.beforeEach(async ({ page }) => {
  db = await createWorkspaceDatabase()
  await page.clock.setFixedTime(new Date('2026-10-03T12:00:00'))
  await page.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
  await page.route('https://notes-test.invalid/**', route => route.fulfill({ json: true, headers: { 'access-control-allow-origin': '*' } }))
  await routeWorkspaceData(page, db)
  await page.route('**/api.open-meteo.com/**', route => route.abort())
})
test.afterEach(async () => { await db.close() })
const holidays = { 2026: { '2026-10-03': ['개천절'], '2026-10-05': ['대체공휴일(개천절)'], '2026-10-09': ['한글날'], '2026-12-25': ['기독탄신일'] }, 2027: { '2027-01-01': ['1월 1일'] } }

for (const width of [1440, 320]) test(`공휴일 숫자·이름·오늘 표시와 연도 경계 ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.route('https://holidays.hyunbin.page/basic.json', route => route.fulfill({ json: holidays, headers: { 'access-control-allow-origin': '*' } }))
  await page.goto('/#/calendar?month=2026-10')
  const day = page.getByRole('link', { name: '2026-10-03 상세 보기', exact: true })
  await expect(day).toContainText('개천절')
  await expect(day.locator('time')).toHaveClass(/text-destructive/)
  await expect(day.locator('time')).toHaveAttribute('aria-current', 'date')
  await expect(day).toHaveAccessibleDescription('개천절')
  await expect(page.getByRole('link', { name: '2026-10-05 상세 보기', exact: true })).toContainText('대체공휴일(개천절)')
  await day.focus()
  await expect(day).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/holidays-${width}.png`, fullPage: true })
  await page.goto('/#/calendar?month=2026-12')
  await expect(page.getByRole('link', { name: '2027-01-01 상세 보기', exact: true })).toContainText('1월 1일')
})

test('공휴일 조회 실패 후 재시도와 미제공 연도 안내', async ({ page }) => {
  let failed = true
  await page.route('https://holidays.hyunbin.page/basic.json', route => route.fulfill({ status: failed ? 503 : 200, json: failed ? {} : holidays, headers: { 'access-control-allow-origin': '*' } }))
  await page.goto('/#/calendar?month=2026-10')
  await expect(page.getByText('공휴일을 불러오지 못했어요.')).toBeVisible()
  await expect(page.getByRole('button', { name: '일정 추가', exact: true })).toBeEnabled()
  failed = false
  await page.getByRole('button', { name: '공휴일 다시 불러오기' }).click()
  await expect(page.getByRole('link', { name: '2026-10-03 상세 보기', exact: true })).toContainText('개천절')
  await page.goto('/#/calendar?month=2030-01')
  await expect(page.getByText('2030년 공휴일 자료가 아직 제공되지 않았어요.')).toBeVisible()
})
