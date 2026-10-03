import assert from 'node:assert/strict'
import test from 'node:test'
import { createTranscriptionsDatabase, callTranscriptions, transcriptionsSql } from './helpers/transcriptions-db.mjs'

test('집필실 글 CRUD, 최신순, 작성일 보존, 충돌과 세션 보호', async () => {
  const db = await createTranscriptionsDatabase()
  try {
    const [first] = await callTranscriptions(db, 'save', { title: ' 첫 글 ', content: '첫 문장\n\n둘째 문장' })
    const [second] = await callTranscriptions(db, 'save', { title: '둘째 글', content: '내용' })
    assert.equal(first.title, '첫 글')
    assert.equal(second.title, '둘째 글')
    const result = await callTranscriptions(db, 'save', { ...first, title: '수정한 글' })
    const updated = result.find(item => item.id === first.id)
    assert.equal(updated.created_at, first.created_at)
    assert.equal(updated.content, first.content)
    assert.equal(result[0].id, second.id)
    assert.deepEqual(await callTranscriptions(db, 'save', first), { error: 'conflict' })
    assert.deepEqual(await callTranscriptions(db, 'delete', first), { error: 'conflict' })
    for (const invalid of [{ title: ' ', content: '글' }, { title: '글', content: '\n\t' }, { title: '글', content: '가'.repeat(50001) }]) await assert.rejects(callTranscriptions(db, 'save', invalid))
    await assert.rejects(db.query('delete from public.transcriptions'))
    await db.exec('reset role')
    await db.exec(transcriptionsSql)
    await db.exec('set role anon')
    assert.equal((await callTranscriptions(db, 'list')).length, 2)
    assert.equal((await callTranscriptions(db, 'delete', updated)).length, 1)
    await db.query("select set_config('request.headers', '{}', false)")
    for (const action of ['list', 'save', 'delete']) await assert.rejects(callTranscriptions(db, action, second))
    assert.equal((await db.query('select * from public.transcriptions')).rows.length, 0)
  } finally { await db.close() }
})
