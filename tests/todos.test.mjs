import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
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
    await assert.rejects(call(db, 'todo_reorder', { items: [] }))
  } finally { await db.close() }
})

test('새 할 일은 마지막 우선순위, 순서 변경·완료·삭제 후에도 저장 순서 유지', async () => {
  const db = await createWorkspaceDatabase()
  try {
    const ids = [randomUUID(), randomUUID(), randomUUID()]
    let items
    for (const [index, id] of ids.entries()) items = await call(db, 'todo_save', { id, revision: 0, title: `할 일 ${index}`, completed: index === 1 })
    assert.deepEqual(items.map(item => item.id), ids)
    assert.deepEqual(items.map(item => item.priority), [1, 2, 3])
    const reordered = [items[2], items[0], items[1]]
    items = await call(db, 'todo_reorder', { items: reordered })
    assert.deepEqual(items.map(item => item.id), [ids[2], ids[0], ids[1]])
    assert.deepEqual(items.map(item => item.priority), [1, 2, 3])
    assert.deepEqual(items.map(item => item.revision), [2, 2, 2])
    assert.deepEqual(await call(db, 'todo_reorder', { items }), items)
    items = await call(db, 'todo_save', { ...items[0], completed: true, priority: 99 })
    assert.deepEqual(items.map(item => item.id), [ids[2], ids[0], ids[1]])
    assert.equal(items[0].priority, 1)
    items = await call(db, 'todo_delete', items[1])
    const added = randomUUID()
    items = await call(db, 'todo_save', { id: added, revision: 0, title: '맨 마지막', completed: false })
    assert.equal(items.at(-1).id, added)
    assert.equal(items.at(-1).priority, 4)
    await db.exec('reset role')
    await db.exec(workspaceDataSql)
    await db.exec('set role anon')
    assert.deepEqual(await call(db, 'todo_list'), items)
  } finally { await db.close() }
})

test('순서 변경은 전체 목록과 버전을 검증하고 잘못된 요청을 원자적으로 거부', async () => {
  const db = await createWorkspaceDatabase()
  try {
    for (let i = 0; i < 3; i++) await call(db, 'todo_save', { id: randomUUID(), revision: 0, title: `항목 ${i}`, completed: false })
    const before = await call(db, 'todo_list')
    for (const items of [before.slice(1), [before[0], before[0], before[2]], [{ ...before[0], id: randomUUID() }, ...before.slice(1)], [{ ...before[0], revision: 0 }, ...before.slice(1)]]) {
      assert.equal((await call(db, 'todo_reorder', { items })).error, 'conflict')
      assert.deepEqual(await call(db, 'todo_list'), before)
    }
    for (const items of [null, {}, 'invalid']) await assert.rejects(call(db, 'todo_reorder', { items }))
    await assert.rejects(call(db, 'todo_reorder', { items: [{ id: 'bad uuid' }, ...before.slice(1)] }))
    assert.deepEqual(await call(db, 'todo_list'), before)
    const withNew = await call(db, 'todo_save', { id: randomUUID(), revision: 0, title: '다른 기기의 추가', completed: false })
    assert.equal((await call(db, 'todo_reorder', { items: before })).error, 'conflict')
    const changed = await call(db, 'todo_save', { ...withNew[0], completed: true })
    assert.equal((await call(db, 'todo_reorder', { items: withNew })).error, 'conflict')
    const deleted = await call(db, 'todo_delete', changed[0])
    assert.equal((await call(db, 'todo_reorder', { items: changed })).error, 'conflict')
    assert.deepEqual(await call(db, 'todo_list'), deleted)
    await assert.rejects(db.exec('update public.workspace_todos set priority = 1'))
  } finally { await db.close() }
})

test('기존 할 일 마이그레이션은 내용·완료 상태·기존 표시 순서를 보존', async () => {
  const db = await createWorkspaceDatabase()
  try {
    for (let i = 0; i < 3; i++) await call(db, 'todo_save', { id: randomUUID(), revision: 0, title: `기존 ${i}`, completed: i === 0 })
    await db.exec('reset role; alter table public.workspace_todos drop column priority')
    const { rows: before } = await db.query('select to_jsonb(t) as item from public.workspace_todos t order by completed, created_at desc, id')
    await db.exec(workspaceDataSql)
    await db.exec('set role anon')
    const migrated = await call(db, 'todo_list')
    assert.deepEqual(migrated.map(({ priority, ...item }) => { assert.ok(priority > 0); return item }), before.map(row => row.item))
    assert.deepEqual(migrated.map(item => item.priority), [1, 2, 3])
  } finally { await db.close() }
})

test('전체 삭제는 명시적 확인·전체 목록 버전·세션을 검증하고 원자적으로 처리', async () => {
  const db = await createWorkspaceDatabase()
  try {
    for (const completed of [false, true]) await call(db, 'todo_save', { id: randomUUID(), revision: 0, title: '삭제 대상', completed })
    const items = await call(db, 'todo_list')
    for (const confirmed of [undefined, false, 'true']) await assert.rejects(call(db, 'todo_delete_all', { items, confirmed }))
    for (const snapshot of [items.slice(1), [items[0], items[0]], [{ ...items[0], revision: 0 }, items[1]]]) {
      assert.equal((await call(db, 'todo_delete_all', { confirmed: true, items: snapshot })).error, 'conflict')
      assert.deepEqual(await call(db, 'todo_list'), items)
    }
    const latest = await call(db, 'todo_save', { id: randomUUID(), revision: 0, title: '확인창 이후 추가', completed: false })
    assert.equal((await call(db, 'todo_delete_all', { confirmed: true, items })).error, 'conflict')
    assert.deepEqual(await call(db, 'todo_list'), latest)
    await call(db, 'memo_save', { content: '메모는 유지', revision: 1 })
    assert.deepEqual(await call(db, 'todo_delete_all', { confirmed: true, items: latest }), [])
    assert.equal((await call(db, 'memo_get')).content, '메모는 유지')
    assert.deepEqual(await call(db, 'todo_delete_all', { confirmed: true, items: [] }), [])
    const [added] = await call(db, 'todo_save', { id: randomUUID(), revision: 0, title: '다시 추가', completed: false })
    assert.equal(added.priority, 1)
    await db.query("select set_config('request.headers', '{}', false)")
    await assert.rejects(call(db, 'todo_delete_all', { confirmed: true, items: [added] }))
    await db.exec('reset role')
    assert.equal((await db.query('select count(*)::integer as count from public.workspace_todos')).rows[0].count, 1)
  } finally { await db.close() }
})

const source = await readFile(new URL('../src/features/todos/order.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { reorderVisibleTodos } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('필터로 숨긴 항목의 위치를 유지하며 양방향 이동, 경계와 취소 처리', () => {
  const items = ['a', 'hidden', 'b', 'c'].map(id => ({ id }))
  const ids = list => list.map(item => item.id)
  assert.deepEqual(ids(reorderVisibleTodos(items, ['a', 'b', 'c'], 'c', 'a', false)), ['c', 'hidden', 'a', 'b'])
  assert.deepEqual(ids(reorderVisibleTodos(items, ['a', 'b', 'c'], 'a', 'c', true)), ['b', 'hidden', 'c', 'a'])
  assert.deepEqual(reorderVisibleTodos(items, ['a', 'b', 'c'], 'a', 'a', true), items)
  assert.deepEqual(reorderVisibleTodos(items, ['a', 'b', 'c'], 'a', 'hidden', false), items)
  assert.deepEqual(reorderVisibleTodos(items, [], 'a', 'c', true), items)
})

const dailySource = await readFile(new URL('../src/features/todos/daily.ts', import.meta.url), 'utf8')
const dailyJs = ts.transpileModule(dailySource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { isTodoCompleted } = await import('data:text/javascript;base64,' + Buffer.from(dailyJs).toString('base64'))
test('데일리 체크는 한국 시간 초기화 경계와 재방문을 반영', () => {
  const item = { completed: true, reset_time: '09:00', completed_at: '2026-10-02T10:00:00+09:00' }
  assert.equal(isTodoCompleted(item, Date.parse('2026-10-03T08:59:59+09:00')), true)
  assert.equal(isTodoCompleted(item, Date.parse('2026-10-03T09:00:00+09:00')), false)
  assert.equal(isTodoCompleted(item, Date.parse('2026-10-10T09:00:00+09:00')), false)
  assert.equal(isTodoCompleted({ ...item, completed_at: '2026-10-03T09:01:00+09:00' }, Date.parse('2026-10-03T10:00:00+09:00')), true)
  assert.equal(isTodoCompleted({ ...item, reset_time: null }, Date.parse('2026-10-10T09:00:00+09:00')), true)
})
test('전체 삭제는 데일리를 보호하고 개별 삭제 및 초기화 시각 수정을 지원', async () => {
  const db = await createWorkspaceDatabase()
  try {
    await call(db, 'todo_save', { id: randomUUID(), title: '일반', completed: true, revision: 0 })
    let items = await call(db, 'todo_save', { id: randomUUID(), title: '운동하기', completed: true, revision: 0, resetTime: '09:00' })
    const daily = items.find(item => item.reset_time)
    assert.ok(daily.completed_at)
    assert.equal((await call(db, 'todo_delete_all', { confirmed: true, items })).error, 'conflict')
    items = await call(db, 'todo_delete_all', { confirmed: true, items: items.filter(item => !item.reset_time) })
    assert.equal(items.length, 1)
    assert.equal(items[0].id, daily.id)
    items = await call(db, 'todo_save', { ...items[0], resetTime: '00:00' })
    assert.equal(items[0].reset_time, '00:00')
    assert.equal(items[0].completed_at, daily.completed_at)
    await assert.rejects(call(db, 'todo_save', { ...items[0], resetTime: '25:00' }))
    assert.deepEqual(await call(db, 'todo_delete', items[0]), [])
  } finally { await db.close() }
})
