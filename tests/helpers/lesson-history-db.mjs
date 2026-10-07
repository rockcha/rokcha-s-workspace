import { readFile } from 'node:fs/promises'
import { createNotesDatabase } from './notes-db.mjs'
export const lessonHistorySql = await readFile(new URL('../../supabase/lesson-history.sql', import.meta.url), 'utf8')
export const createLessonHistoryDatabase = () => createNotesDatabase(lessonHistorySql)
export async function callLessonHistory(db, action, payload = {}) {
  return (await db.query('select public.manage_lesson_records($1, $2::jsonb) as data', [action, JSON.stringify(payload)])).rows[0].data
}
export async function routeLessonHistory(page, db) {
  await page.route('**/rpc/manage_lesson_records', async route => {
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const { action, payload } = route.request().postDataJSON()
    try { await route.fulfill({ json: await callLessonHistory(db, action, payload), headers }) }
    catch { await route.fulfill({ status: 400, json: {}, headers }) }
  })
}
