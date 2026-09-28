import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMaterialsDatabase, callMaterials, callMaterialsData, materialsSql } from './helpers/materials-db.mjs'
test('자료 저장·중복 방지·수정·삭제·URL 제한·만료 세션 RLS', async () => {
  const db = await createMaterialsDatabase()
  try {
    const file = { id: 'file1', title: '자료', url: 'https://drive.google.com/file/d/file1/view', description: '' }
    assert.equal((await callMaterials(db, 'save', file)).length, 1)
    assert.equal((await callMaterials(db, 'save', { ...file, title: '수정' }))[0].title, '수정')
    assert.equal((await callMaterials(db, 'list')).length, 1)
    await assert.rejects(callMaterials(db, 'save', { ...file, url: 'https://evil.example/file1' }))
    await assert.rejects(callMaterials(db, 'save', { ...file, id: '../bad' }))
    await assert.rejects(callMaterials(db, 'save', { ...file, title: ' ' }))
    await db.query("select set_config('request.headers', '{}', false)")
    await assert.rejects(callMaterials(db, 'list'))
    await assert.rejects(callMaterials(db, 'delete', { id: file.id }))
    assert.equal((await db.query('select * from public.materials')).rows.length, 0)
    await db.query("select set_config('request.headers', $1, false)", [JSON.stringify({ 'x-workspace-session': 'a'.repeat(64) })])
    assert.deepEqual(await callMaterials(db, 'delete', { id: file.id }), [])
  } finally { await db.close() }
})

test('자료실 하위 폴더·자료 이동·폴더 삭제 시 보존·SQL 재실행', async () => {
  const db = await createMaterialsDatabase()
  try {
    const file = { id: 'legacy', title: '기존 자료', url: 'https://drive.google.com/file/d/legacy/view' }
    await callMaterials(db, 'save', file)
    let data = await callMaterialsData(db, 'create_folder', { name: '수업' })
    const parent = data.folders[0].id
    data = await callMaterialsData(db, 'create_folder', { name: '국어', parent_id: parent })
    const child = data.folders.find(folder => folder.name === '국어').id
    await callMaterials(db, 'save', { ...file, folder_id: child })
    await db.exec('reset role')
    await db.exec(materialsSql)
    await db.exec('set role anon')
    data = await callMaterialsData(db, 'list')
    assert.equal(data.files[0].folder_id, child)
    assert.equal(data.folders.length, 2)
    await assert.rejects(db.query('update public.material_folders set parent_id = $1 where id = $2', [child, parent]))
    await assert.rejects(callMaterialsData(db, 'create_folder', { name: ' ', parent_id: parent }))
    await assert.rejects(callMaterialsData(db, 'save', { ...file, folder_id: '00000000-0000-0000-0000-000000000001' }))
    await callMaterialsData(db, 'rename_folder', { id: child, name: '한국어' })
    data = await callMaterialsData(db, 'delete_folder', { id: parent })
    assert.equal(data.folders.length, 0)
    assert.equal(data.files[0].folder_id, null)
    assert.equal(data.files[0].title, file.title)
    await db.query("select set_config('request.headers', '{}', false)")
    await assert.rejects(callMaterialsData(db, 'create_folder', { name: '무단 폴더' }))
    assert.equal((await db.query('select * from public.material_folders')).rows.length, 0)
  } finally { await db.close() }
})
