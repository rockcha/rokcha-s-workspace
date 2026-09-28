import { readFile } from 'node:fs/promises'
import { createNotesDatabase } from './notes-db.mjs'
export const motivationSql = await readFile(new URL('../../supabase/motivation.sql', import.meta.url), 'utf8')
export const createMotivationDatabase = () => createNotesDatabase(motivationSql)
export async function callMotivation(db, action, payload = {}) {
  return (await db.query('select public.manage_motivation($1, $2::jsonb) as data', [action, JSON.stringify(payload)])).rows[0].data
}
