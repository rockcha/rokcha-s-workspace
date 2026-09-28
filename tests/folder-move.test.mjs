import assert from 'node:assert/strict'
import { test } from 'node:test'
import { callNotes, createNotesDatabase } from './helpers/notes-db.mjs'
import { callLinks, createLinksDatabase } from './helpers/links-db.mjs'

for (const [name, create, call] of [['notes', createNotesDatabase, callNotes], ['links', createLinksDatabase, callLinks]]) {
  test(`${name}: folder moves preserve descendants and reject cycles, missing destinations and invalid sessions`, async t => {
    const db = await create()
    t.after(() => db.close())
    const root = (await call(db, 'list')).folders[0].id
    let data = await call(db, 'create_folder', { name: 'child', parent_id: root })
    const child = data.folders.find(f => f.name === 'child').id
    data = await call(db, 'create_folder', { name: 'destination' })
    const destination = data.folders.find(f => f.name === 'destination').id
    const item = { folder_id: child, title: 'preserved', content: 'content', url: 'https://example.com' }
    await call(db, name === 'notes' ? 'create_note' : 'create_link', item)
    await assert.rejects(call(db, 'move_folder', { id: root, parent_id: child }), /descendant/)
    await assert.rejects(call(db, 'move_folder', { id: root, parent_id: root }), /itself/)
    await assert.rejects(call(db, 'move_folder', { id: root, parent_id: '00000000-0000-0000-0000-000000000000' }), /Destination/)
    data = await call(db, 'move_folder', { id: root, parent_id: destination })
    assert.equal(data.folders.find(f => f.id === root).parent_id, destination)
    assert.equal(data.folders.find(f => f.id === child).parent_id, root)
    assert.equal(data[name][0].folder_id, child)
    data = await call(db, 'move_folder', { id: root, parent_id: '' })
    assert.equal(data.folders.find(f => f.id === root).parent_id, null)
    await db.query("select set_config('request.headers', '{}', false)")
    await assert.rejects(call(db, 'move_folder', { id: root, parent_id: destination }), /expired/)
    await assert.rejects(db.query(`select public.move_${name === 'notes' ? 'note' : 'link'}_folder($1, $2)`, [root, destination]), /expired/)
  })
}
