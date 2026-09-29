import { readFile } from 'node:fs/promises'
import { createNotesDatabase } from './notes-db.mjs'
export const vocabularySql = await readFile(new URL('../../supabase/vocabulary.sql', import.meta.url), 'utf8')
export const createVocabularyDatabase = () => createNotesDatabase(vocabularySql)
export async function callVocabulary(db, action, payload = {}) {
  return (await db.query('select public.manage_vocabulary($1, $2::jsonb) as data', [action, JSON.stringify(payload)])).rows[0].data
}
