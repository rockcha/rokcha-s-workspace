import { readFile } from 'node:fs/promises'
import { createNotesDatabase } from './notes-db.mjs'

export const linksSql = await readFile(new URL('../../supabase/links.sql', import.meta.url), 'utf8')
export const createLinksDatabase = () => createNotesDatabase(linksSql)
export async function callLinks(db, action, payload = {}) {
  const { rows } = await db.query('select public.manage_links($1, $2::jsonb) as data', [action, JSON.stringify(payload)])
  return rows[0].data
}
