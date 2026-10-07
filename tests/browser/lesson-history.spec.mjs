import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { createLessonHistoryDatabase, routeLessonHistory, callLessonHistory } from '../helpers/lesson-history-db.mjs'
import { routeWorkspaceData } from '../helpers/workspace-data-db.mjs'
import { testToken } from '../helpers/notes-db.mjs'
let db
test.beforeEach(async ({ page }) => {
  db = await createLessonHistoryDatabase()
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00'))
  await page.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
  await page.route('https://notes-test.invalid/**', route => route.fulfill({ json: true, headers: { 'access-control-allow-origin': '*' } }))
  await routeWorkspaceData(page, db)
  await routeLessonHistory(page, db)
})
test.afterEach(async () => { await db.close() })
test('월별 필터·시간순·수업별 소계·긴 한글·다중 페이지 PDF', async ({ page }) => {
  const longName = '긴한글수업명'.repeat(10)
  for (const [name, date, start, end] of [['수학', '2026-10-09', '14:00', '15:45'], ['영어', '2026-10-01', '09:00', '10:30'], ['영어', '2026-10-01', '08:00', '08:45'], ['다른달', '2026-11-01', '09:00', '10:00']]) {
    await callLessonHistory(db, 'save', { id: crypto.randomUUID(), revision: 0, name, date, start, end })
  }
  await page.goto('/#/timetable/history')
  await expect(page.getByRole('main')).toContainText('총 3회 · 4시간 0분')
  await expect(page.getByRole('main')).not.toContainText('다른달')
  expect(await page.locator('main li').allTextContents()).toEqual([expect.stringContaining('08:00–08:45'), expect.stringContaining('09:00–10:30'), expect.stringContaining('14:00–15:45')])
  await page.evaluate(() => {
    window.reportLines = []
    const original = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) { window.reportLines.push(text); return original.call(this, text, ...args) }
  })
  let pending = page.waitForEvent('download')
  await page.getByRole('button', { name: '월별 PDF 다운로드' }).click()
  await pending
  const lines = await page.evaluate(() => window.reportLines)
  expect(lines).toContain('영어 · 2회 · 총 2시간 15분')
  expect(lines).toContain('수학 · 1회 · 총 1시간 45분')
  pending = page.waitForEvent('download')
  await page.evaluate(async name => {
    const { downloadLessonPdf } = await import('/src/features/lesson-history/pdf.ts')
    const records = Array.from({ length: 75 }, (_, i) => ({ id: String(i), revision: 1, name, date: '2026-10-01', start: '09:00', end: '10:00' }))
    await downloadLessonPdf(records, '2026-10')
  }, longName)
  const download = await pending
  await download.saveAs('test-results/lesson-history-multipage.pdf')
  const pdf = (await readFile(await download.path())).toString('latin1')
  const count = Number(pdf.match(/\/Type \/Pages \/Count (\d+)/)[1])
  expect(count).toBeGreaterThan(3)
  expect((pdf.match(/\/Subtype \/Image/g) ?? []).length).toBe(count)
  const xref = Number(pdf.match(/startxref\n(\d+)/)[1])
  expect(pdf.slice(xref, xref + 4)).toBe('xref')
  const rows = pdf.slice(xref).split('\n').slice(3, 3 + 2 + count * 3)
  rows.forEach((row, index) => expect(pdf.slice(Number(row.slice(0, 10))).startsWith(`${index + 1} 0 obj`)).toBe(true))
})
for (const width of [1440, 320]) test(`수업 내역 기록·월별 집계·PDF·수정·삭제·포커스 ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 })
  await page.goto('/#/timetable')
  const historyLink = page.getByRole('link', { name: '수업 내역', exact: true })
  expect((await historyLink.boundingBox()).x).toBeLessThan((await page.getByRole('button', { name: '수업 추가', exact: true }).boundingBox()).x)
  await historyLink.focus(); await page.keyboard.press('Enter')
  const add = page.getByRole('button', { name: '내역 추가', exact: true })
  await expect(add).toBeEnabled()
  await add.focus(); await page.keyboard.press('Enter')
  await expect(page.getByLabel('수업명', { exact: true })).toBeFocused()
  await page.getByLabel('수업명', { exact: true }).fill('영어 회화')
  await page.getByLabel('종료 시간', { exact: true }).fill('08:00')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await callLessonHistory(db, 'list')).toHaveLength(0)
  await page.getByLabel('종료 시간', { exact: true }).fill('10:30')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(add).toBeFocused()
  await expect(page.getByRole('main')).toContainText('총 1회 · 1시간 30분')
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(1)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '월별 PDF 다운로드' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('수업내역_2026-10.pdf')
  const bytes = await readFile(await download.path())
  expect(bytes.subarray(0, 8).toString()).toBe('%PDF-1.4')
  expect(bytes.toString('latin1')).toContain('/Type /Page')
  await page.reload()
  await expect(page.getByRole('main')).toContainText('1시간 30분')
  await page.getByRole('button', { name: '2026-10-07 영어 회화 수정' }).click()
  await page.getByLabel('수업 날짜', { exact: true }).fill('2026-11-01')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByLabel('조회 월')).toHaveValue('2026-11')
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/lesson-history-${width}.png`, fullPage: true })
  await page.getByRole('button', { name: '2026-11-01 영어 회화 삭제' }).click()
  await expect(page.getByRole('button', { name: '취소', exact: true })).toBeFocused()
  await page.getByRole('alertdialog').getByRole('button', { name: '내역 삭제', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(add).toBeFocused()
  await expect(page.getByRole('button', { name: '월별 PDF 다운로드' })).toBeDisabled()
})
