import assert from 'node:assert/strict'
import { test } from 'node:test'
import { callLinks, createLinksDatabase, linksSql } from './helpers/links-db.mjs'

test('links: nested folders, CRUD, URLs, cascade, idempotent setup and session RLS', async t => {
  const db = await createLinksDatabase()
  t.after(() => db.close())
  const root = (await callLinks(db, 'list')).folders[0].id
  let data = await callLinks(db, 'create_folder', { name: '자료', parent_id: root })
  const child = data.folders.find(folder => folder.name === '자료').id
  data = await callLinks(db, 'create_link', { folder_id: child, title: '자료 링크', url: 'https://example.com/a', image_url: 'https://example.com/cover.png' })
  const link = data.links[0]
  assert.equal(link.image_url, 'https://example.com/cover.png')
  data = await callLinks(db, 'update_link', { id: link.id, folder_id: child, title: '새 제목', url: 'https://example.com/b', content: '설명' })
  assert.equal(data.links[0].url, 'https://example.com/b')
  assert.equal(data.links[0].created_at, link.created_at)
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'https://', '']) {
    await assert.rejects(callLinks(db, 'create_link', { folder_id: root, title: '거부', url }), /check constraint/)
  }
  await assert.rejects(callLinks(db, 'create_link', { folder_id: root, title: '거부', url: 'https://example.com', image_url: 'javascript:alert(1)' }), /check constraint/)
  await assert.rejects(db.query('update public.link_folders set parent_id = $1 where id = $2', [child, root]), /permission denied/)
  data = await callLinks(db, 'move_link', { id: link.id, folder_id: root })
  assert.equal(data.links[0].folder_id, root)
  await callLinks(db, 'delete_folder', { id: child })
  assert.equal((await callLinks(db, 'list')).links.length, 1)
  await db.exec('reset role')
  await db.exec(linksSql)
  await db.exec('set role anon')
  assert.equal((await callLinks(db, 'list')).links.length, 1)
  await db.query("select set_config('request.headers', '{}', false)")
  await assert.rejects(callLinks(db, 'list'), /expired/)
  await assert.rejects(callLinks(db, 'delete_link', { id: link.id }), /expired/)
  assert.equal((await db.query('select * from public.links')).rows.length, 0)
  await assert.rejects(db.query("insert into public.link_folders(name) values ('차단')"), /row-level security/)
  await db.exec('reset role')
  await db.query('delete from public.link_folders where id = $1', [root])
  assert.equal((await db.query('select * from public.links')).rows.length, 0)
})
