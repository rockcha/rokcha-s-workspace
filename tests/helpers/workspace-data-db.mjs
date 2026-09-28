import { readFile } from 'node:fs/promises'
import { createNotesDatabase, testToken } from './notes-db.mjs'

export const workspaceDataSql = await readFile(new URL('../../supabase/workspace-data.sql', import.meta.url), 'utf8')
export const createWorkspaceDatabase = () => createNotesDatabase(workspaceDataSql)
export async function callWorkspaceData(db, action, payload = {}) {
  const { rows } = await db.query('select public.manage_workspace_data($1, $2::jsonb) as data', [action, JSON.stringify(payload)])
  return rows[0].data
}

export async function routeWorkspaceData(page, db) {
  await db.exec('reset role')
  await db.exec(workspaceDataSql)
  await db.exec('set role anon')
  await page.route('https://notes-test.invalid/**/manage_workspace_data', async route => {
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (route.request().headers()['x-workspace-session'] !== testToken) return route.fulfill({ status: 403, headers })
    const { action, payload } = route.request().postDataJSON()
    try { return await route.fulfill({ json: await callWorkspaceData(db, action, payload), headers }) }
    catch { return await route.fulfill({ status: 400, json: { message: 'SQL error' }, headers }) }
  })
}

export async function failWorkspaceWrites(page) {
  await page.route('https://notes-test.invalid/**/manage_workspace_data', route => {
    const request = route.request()
    if (request.method() === 'OPTIONS' || !request.postDataJSON().action.endsWith('_save')) return route.fallback()
    return route.fulfill({ status: 503, json: {}, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
  })
}
