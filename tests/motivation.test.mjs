import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { createMotivationDatabase, callMotivation, motivationSql } from './helpers/motivation-db.mjs'

const { outputText } = ts.transpileModule(await readFile(new URL('../src/features/motivation/youtube.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { youtubeId } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
test('YouTube 주소 형식 및 외부·잘못된 URL 차단', () => {
  for (const url of ['https://youtu.be/M7lc1UVf-VE?si=abc', 'https://www.youtube.com/watch?v=M7lc1UVf-VE&t=30', 'https://m.youtube.com/shorts/M7lc1UVf-VE', 'https://youtube.com/live/M7lc1UVf-VE']) assert.equal(youtubeId(url), 'M7lc1UVf-VE')
  for (const url of ['https://youtube.com.evil.test/watch?v=M7lc1UVf-VE', 'https://evil.test/M7lc1UVf-VE', 'javascript:alert(1)', 'https://youtube.com/playlist?list=x', 'https://youtu.be/short', 'https://user@youtu.be/M7lc1UVf-VE']) assert.equal(youtubeId(url), null)
})
test('콘텐츠 CRUD·충돌·검증·RLS 및 SQL 재실행', async () => {
  const db = await createMotivationDatabase()
  try {
    const quote = (await callMotivation(db, 'save', { kind: 'quote', content: '한 걸음씩' }))[0]
    const updated = (await callMotivation(db, 'save', { ...quote, content: '오늘도 한 걸음' }))[0]
    assert.equal(updated.revision, 2)
    assert.deepEqual(await callMotivation(db, 'delete', quote), { error: 'conflict' })
    assert.deepEqual(await callMotivation(db, 'save', quote), { error: 'conflict' })
    await callMotivation(db, 'save', { kind: 'youtube', title: '영상', video_id: 'M7lc1UVf-VE' })
    await assert.rejects(callMotivation(db, 'save', { kind: 'quote', content: ' ' }))
    await assert.rejects(callMotivation(db, 'save', { kind: 'youtube', title: '영상', video_id: '<script>' }))
    await assert.rejects(db.query('delete from public.motivation_items'))
    await db.exec('reset role')
    await db.exec(motivationSql)
    await db.exec('set role anon')
    assert.equal((await callMotivation(db, 'list')).length, 2)
    await callMotivation(db, 'delete', updated)
    assert.equal((await callMotivation(db, 'list')).length, 1)
    await db.query("select set_config('request.headers', '{}', false)")
    await assert.rejects(callMotivation(db, 'list'))
    await assert.rejects(callMotivation(db, 'save', { kind: 'quote', content: '침입' }))
    assert.equal((await db.query('select * from public.motivation_items')).rows.length, 0)
  } finally { await db.close() }
})
