import { readFile } from 'node:fs/promises'
import { createNotesDatabase } from './notes-db.mjs'
export const transcriptionsSql = await readFile(new URL('../../supabase/transcriptions.sql', import.meta.url), 'utf8')
export const createTranscriptionsDatabase = () => createNotesDatabase(transcriptionsSql)
export async function callTranscriptions(db, action, payload = {}) {
  return (await db.query('select public.manage_transcriptions($1, $2::jsonb) as data', [action, JSON.stringify(payload)])).rows[0].data
}
