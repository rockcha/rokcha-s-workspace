import { readFile } from 'node:fs/promises'
import { createNotesDatabase } from './notes-db.mjs'
export const materialsSql = await readFile(new URL('../../supabase/materials.sql', import.meta.url), 'utf8')
export const createMaterialsDatabase = () => createNotesDatabase(materialsSql)
export async function callMaterialsData(db, action, payload = {}) {
  return (await db.query('select public.manage_materials($1, $2::jsonb) as data', [action, JSON.stringify(payload)])).rows[0].data
}
export async function callMaterials(db, action, payload = {}) { return (await callMaterialsData(db, action, payload)).files }
