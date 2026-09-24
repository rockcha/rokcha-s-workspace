import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

export const testToken = 'a'.repeat(64)
export const notesSql = await readFile(new URL('../../supabase/notes.sql', import.meta.url), 'utf8')

export async function createNotesDatabase() {
  const db = new PGlite()
  // Only session validation is stubbed. Tables, RLS, constraints and RPC are real SQL.
  await db.exec(`
    create role anon;
    create role authenticated;
    grant usage on schema public to anon;
    create function public.workspace_session_valid() returns boolean
    language sql stable as $$
      select coalesce(current_setting('request.headers', true)::jsonb ->> 'x-workspace-session' = '${testToken}', false)
    $$;
    revoke all on function public.workspace_session_valid() from public;
    grant execute on function public.workspace_session_valid() to anon;
  `)
  await db.exec(notesSql)
  await db.exec('set role anon')
  await db.query("select set_config('request.headers', $1, false)", [JSON.stringify({ 'x-workspace-session': testToken })])
  return db
}

export async function callNotes(db, action, payload = {}) {
  const { rows } = await db.query('select public.manage_notes($1, $2::jsonb) as data', [action, JSON.stringify(payload)])
  return rows[0].data
}
