import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createWorkspaceDatabase, callWorkspaceData as call, workspaceDataSql } from './helpers/workspace-data-db.mjs'

const event = (extra = {}) => ({ id: randomUUID(), type: 'event', date: '2026-09-24', time: '09:00', title: '수업', content: '', revision: 0, ...extra })
const lesson = (extra = {}) => ({ id: randomUUID(), name: '수업', memo: '', days: [0, 2], start: '09:00', end: '10:00', color: 'sage', revision: 0, ...extra })

test('일정 여러 개·날짜별 노트 한 개·수정 충돌·삭제·재실행', async () => {
  const db = await createWorkspaceDatabase()
  try {
    const first = event()
    let entries = await call(db, 'calendar_save', first)
    assert.equal(entries[0].revision, 1)
    await call(db, 'calendar_save', event())
    const note = event({ type: 'note', title: '', time: '', content: '휴강' })
    entries = await call(db, 'calendar_save', note)
    assert.equal(entries.length, 3)
    assert.equal((await call(db, 'calendar_save', { ...note, id: randomUUID() })).error, 'duplicate')
    assert.equal((await call(db, 'calendar_save', { ...first, title: '오래된 변경' })).error, 'conflict')
    entries = await call(db, 'calendar_save', { ...first, revision: 1, title: '수정됨' })
    assert.equal(entries.find(item => item.id === first.id).revision, 2)
    assert.equal((await call(db, 'calendar_delete', { id: first.id, revision: 1 })).error, 'conflict')
    await call(db, 'calendar_delete', { id: first.id, revision: 2 })
    assert.equal((await call(db, 'calendar_save', { ...first, revision: 2 })).error, 'conflict')
    await db.exec('reset role')
    await db.exec(workspaceDataSql)
    await db.exec('set role anon')
    assert.equal((await call(db, 'calendar_list')).length, 2)
    await assert.rejects(call(db, 'calendar_save', event({ time: '25:00' })))
    await assert.rejects(call(db, 'calendar_save', event({ date: '2026-02-30' })))
  } finally { await db.close() }
})

test('기존 6색 제약 갱신 후 추가 5색 저장·재조회·잘못된 색상 차단', async () => {
  const db = await createWorkspaceDatabase()
  try {
    const first = lesson()
    await call(db, 'lesson_save', first)
    await db.exec("reset role; alter table public.timetable_lessons drop constraint timetable_lessons_color_check; alter table public.timetable_lessons add constraint timetable_lessons_color_check check (color in ('sage','blue','lavender','rose','amber','teal'))")
    await db.exec(workspaceDataSql)
    await db.exec('set role anon')
    let saved = (await call(db, 'lesson_list'))[0]
    assert.equal(saved.id, first.id)
    for (const color of ['lemon', 'coral', 'indigo', 'cocoa', 'slate']) {
      saved = (await call(db, 'lesson_save', { ...saved, color }))[0]
      assert.equal((await call(db, 'lesson_list'))[0].color, color)
    }
    await assert.rejects(call(db, 'lesson_save', { ...saved, color: 'invalid' }))
  } finally { await db.close() }
})

test('수업 시간 겹침·경계·수정·삭제와 메모 버전 충돌', async () => {
  const db = await createWorkspaceDatabase()
  try {
    const first = lesson()
    await call(db, 'lesson_save', first)
    assert.equal((await call(db, 'lesson_save', lesson({ days: [2] }))).error, 'overlap')
    assert.equal((await call(db, 'lesson_save', lesson({ start: '10:00', end: '11:00' }))).length, 2)
    assert.equal((await call(db, 'lesson_save', { ...first, revision: 1, memo: '준비물' })).find(item => item.id === first.id).revision, 2)
    assert.equal((await call(db, 'lesson_delete', { id: first.id, revision: 1 })).error, 'conflict')
    assert.equal((await call(db, 'lesson_delete', { id: first.id, revision: 2 })).length, 1)
    await assert.rejects(call(db, 'lesson_save', lesson({ days: [] })))
    const memo = await call(db, 'memo_get')
    const saved = await call(db, 'memo_save', { content: '서버 메모', revision: memo.revision })
    assert.equal(saved.content, '서버 메모')
    assert.equal((await call(db, 'memo_save', { content: '다른 초안', revision: memo.revision })).error, 'conflict')
    assert.deepEqual(await call(db, 'memo_save', { content: '서버 메모', revision: memo.revision }), saved)
  } finally { await db.close() }
})

test('가져오기 원자성·재시도 중복 방지·인증 및 직접 쓰기 차단', async () => {
  const db = await createWorkspaceDatabase()
  try {
    const data = { calendar: [event()], lessons: [lesson()], memo: '가져온 메모' }
    assert.deepEqual(await call(db, 'import', data), { ok: true })
    assert.deepEqual(await call(db, 'import', data), { ok: true })
    assert.equal((await call(db, 'calendar_list')).length, 1)
    const old = (await call(db, 'calendar_list'))[0]
    await call(db, 'calendar_save', { ...old, title: '서버에서 수정' })
    await call(db, 'import', data)
    assert.equal((await call(db, 'calendar_list'))[0].title, '서버에서 수정')
    assert.equal((await call(db, 'import', { calendar: [event()], lessons: [lesson()], memo: '' })).error, 'import_conflict')
    assert.equal((await call(db, 'calendar_list')).length, 1)
    await assert.rejects(db.exec("update public.workspace_memo set content = '우회'"))
    await db.query("select set_config('request.headers', '{}', false)")
    await assert.rejects(call(db, 'calendar_list'), /session expired/)
    await assert.rejects(call(db, 'memo_save', { content: '우회', revision: 2 }), /session expired/)
    assert.equal((await db.query('select * from public.calendar_entries')).rows.length, 0)
  } finally { await db.close() }
})
