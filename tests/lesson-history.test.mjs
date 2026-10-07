import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { createLessonHistoryDatabase, callLessonHistory, lessonHistorySql } from './helpers/lesson-history-db.mjs'
const draft = (changes = {}) => ({ id: randomUUID(), revision: 0, name: '영어 회화', date: '2026-10-07', start: '09:00', end: '10:30', ...changes })
test('수업 내역 CRUD·정렬·충돌·재실행·세션·RLS·잘못된 시간 차단', async () => {
  const db = await createLessonHistoryDatabase()
  try {
    const source = draft()
    const [first] = await callLessonHistory(db, 'save', source)
    assert.equal(first.revision, 1)
    assert.deepEqual(await callLessonHistory(db, 'save', source), { error: 'conflict' })
    const sorted = await callLessonHistory(db, 'save', draft({ start: '08:00', end: '09:00' }))
    assert.deepEqual(sorted.map(item => item.start), ['08:00', '09:00'])
    const result = await callLessonHistory(db, 'save', { ...first, date: '2026-11-01', end: '11:15' })
    const updated = result.find(item => item.id === first.id)
    assert.equal(updated.revision, 2)
    assert.deepEqual(await callLessonHistory(db, 'delete', first), { error: 'conflict' })
    for (const invalid of [{ name: ' ' }, { name: '가'.repeat(81) }, { date: '2026-02-30' }, { start: '24:00' }, { end: '09:00' }, { end: '08:59' }, { end: '10:60' }]) {
      await assert.rejects(callLessonHistory(db, 'save', draft(invalid)))
    }
    await assert.rejects(db.query('delete from public.lesson_records'))
    await db.exec('reset role'); await db.exec(lessonHistorySql); await db.exec('set role anon')
    assert.equal((await callLessonHistory(db, 'list')).length, 2)
    assert.equal((await callLessonHistory(db, 'delete', updated)).length, 1)
    await db.query("select set_config('request.headers', '{}', false)")
    for (const action of ['list', 'save', 'delete']) await assert.rejects(callLessonHistory(db, action, source))
    assert.deepEqual((await db.query('select * from public.lesson_records')).rows, [])
  } finally { await db.close() }
})
