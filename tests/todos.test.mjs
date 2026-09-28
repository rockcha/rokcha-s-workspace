import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createWorkspaceDatabase, callWorkspaceData as call, workspaceDataSql } from './helpers/workspace-data-db.mjs'

test('할 일 저장·완료·수정 충돌·삭제·재실행·접근 제한', async () => {
  const db = await createWorkspaceDatabase()
  try {
    const draft = { id: randomUUID(), title: '수업 준비', completed: false, revision: 0 }
    let [saved] = await call(db, 'todo_save', draft)
    assert.equal(saved.revision, 1)
    assert.equal((await call(db, 'todo_save', { ...draft, title: '오래된 수정' })).error, 'conflict')
    ;[saved] = await call(db, 'todo_save', { ...saved, title: '교재 준비', completed: true })
    assert.equal(saved.completed, true)
    assert.equal(saved.revision, 2)
    await assert.rejects(call(db, 'todo_save', { ...saved, title: '  ' }))
    await assert.rejects(call(db, 'todo_save', { ...saved, title: 'a'.repeat(201) }))
    await assert.rejects(db.exec("insert into public.workspace_todos(title) values('직접 쓰기')"))
    await db.exec('reset role')
    await db.exec(workspaceDataSql)
    await db.exec('set role anon')
    assert.equal((await call(db, 'todo_list'))[0].title, '교재 준비')
    assert.equal((await call(db, 'todo_delete', { ...saved, revision: 1 })).error, 'conflict')
    assert.deepEqual(await call(db, 'todo_delete', saved), [])
    assert.equal((await call(db, 'todo_save', saved)).error, 'conflict')
    await call(db, 'todo_save', { ...draft, id: randomUUID() })
    await db.query("select set_config('request.headers', '{}', false)")
    assert.deepEqual((await db.query('select * from public.workspace_todos')).rows, [])
    await assert.rejects(call(db, 'todo_list'))
    await assert.rejects(call(db, 'todo_save', draft))
    await assert.rejects(call(db, 'todo_delete', saved))
  } finally { await db.close() }
})
