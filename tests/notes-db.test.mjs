import assert from 'node:assert/strict'
import { test } from 'node:test'
import { callNotes, createNotesDatabase, notesSql } from './helpers/notes-db.mjs'

test('existing notes migrate intact; nested folders cascade and cannot form cycles', async t => {
  const db = await createNotesDatabase()
  t.after(() => db.close())
  const root = (await callNotes(db, 'list')).folders[0].id
  await callNotes(db, 'create_note', { folder_id: root, title: '기존 메모', content: '유지할 내용' })
  // Reproduce the earlier table shape, then apply the upgrade with existing data.
  await db.exec('reset role; alter table public.note_folders drop column parent_id;')
  await db.exec(notesSql)
  await db.exec('set role anon')
  let data = await callNotes(db, 'list')
  assert.equal(data.folders[0].parent_id, null)
  assert.equal(data.notes[0].content, '유지할 내용')
  data = await callNotes(db, 'create_folder', { name: '하위', parent_id: root })
  const child = data.folders.find(folder => folder.name === '하위').id
  data = await callNotes(db, 'create_folder', { name: '더 아래', parent_id: child })
  const grandchild = data.folders.find(folder => folder.name === '더 아래').id
  assert.equal(data.folders.find(folder => folder.id === grandchild).parent_id, child)
  await callNotes(db, 'create_note', { folder_id: grandchild, title: '깊은 메모' })
  await assert.rejects(callNotes(db, 'create_folder', { name: '없는 위치', parent_id: '00000000-0000-0000-0000-000000000000' }), /foreign key/)
  await assert.rejects(db.query('update public.note_folders set parent_id = $1 where id = $2', [grandchild, root]), /permission denied/)
  await assert.rejects(db.query("insert into public.note_folders(id, name, parent_id) values ($1, '순환', $1)", ['00000000-0000-0000-0000-000000000000']), /permission denied/)
  await callNotes(db, 'rename_folder', { id: child, name: '이름 변경' })
  data = await callNotes(db, 'create_folder', { name: '별도 루트', parent_id: '' })
  const other = data.folders.find(folder => folder.name === '별도 루트').id
  await callNotes(db, 'create_note', { folder_id: other, title: '남길 메모' })
  data = await callNotes(db, 'delete_folder', { id: root })
  assert.deepEqual(data.folders.map(folder => folder.id), [other])
  assert.deepEqual(data.notes.map(note => note.title), ['남길 메모'])
  await db.exec('reset role')
  await db.exec(notesSql)
  await db.exec('set role anon')
  assert.equal((await callNotes(db, 'list')).folders.length, 1)
})

test('notes schema, CRUD, ordering, constraints and session RLS', async t => {
  const db = await createNotesDatabase()
  t.after(() => db.close())
  let data = await callNotes(db, 'list')
  assert.deepEqual(data.folders.map(folder => folder.name), ['임시 폴더'])
  const first = data.folders[0].id
  await db.exec('reset role')
  await db.exec(notesSql)
  await db.exec('set role anon')
  assert.equal((await callNotes(db, 'list')).folders.length, 1, 'migration can be reapplied without duplicate seed')

  data = await callNotes(db, 'create_folder', { name: ' 생각 ' })
  const second = data.folders.find(folder => folder.name === '생각').id
  data = await callNotes(db, 'rename_folder', { id: second, name: '아이디어' })
  assert.equal(data.folders.find(folder => folder.id === second).name, '아이디어')
  data = await callNotes(db, 'create_note', { folder_id: first, title: '처음 메모', content: '첫 내용' })
  const firstNote = data.notes[0].id
  data = await callNotes(db, 'create_note', { folder_id: first, title: '나중 메모', content: '다음 내용' })
  assert.equal(data.notes[0].title, '나중 메모', 'newest creation first')
  const secondNote = data.notes[0].id
  data = await callNotes(db, 'update_note', { id: firstNote, folder_id: first, title: '수정 메모', content: '수정 내용' })
  assert.equal(data.notes.find(note => note.id === firstNote).content, '수정 내용')
  assert.equal(data.notes[0].id, secondNote, 'editing does not change creation ordering')
  data = await callNotes(db, 'move_note', { id: firstNote, folder_id: second })
  assert.equal(data.notes.find(note => note.id === firstNote).folder_id, second)

  await assert.rejects(callNotes(db, 'create_folder', { name: '   ' }), /check constraint/)
  await assert.rejects(callNotes(db, 'create_note', { folder_id: first, title: ' ' }), /check constraint/)
  await assert.rejects(callNotes(db, 'move_note', { id: firstNote, folder_id: '00000000-0000-0000-0000-000000000000' }), /foreign key/)
  await assert.rejects(callNotes(db, 'delete_note', { id: '00000000-0000-0000-0000-000000000000' }), /no longer exists/)
  data = await callNotes(db, 'delete_folder', { id: first })
  assert.equal(data.notes.length, 1, 'folder deletion cascades only its own notes')
  assert.equal(data.notes[0].id, firstNote, 'moved note survives deletion of old folder')
  data = await callNotes(db, 'delete_note', { id: firstNote })
  assert.equal(data.notes.length, 0)

  await db.query("select set_config('request.headers', '{}', false)")
  await assert.rejects(callNotes(db, 'list'), /expired/)
  await assert.rejects(callNotes(db, 'delete_folder', { id: second }), /expired/)
  assert.equal((await db.query('select * from public.note_folders')).rows.length, 0, 'direct reads protected by RLS')
  await assert.rejects(db.query("insert into public.note_folders(name) values ('unauthorized')"), /row-level security/)
  assert.equal((await db.query('delete from public.note_folders returning id')).rows.length, 0)
  await db.exec('reset role')
  assert.equal((await db.query('select * from public.note_folders')).rows.length, 1)
})
