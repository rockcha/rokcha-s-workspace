import assert from 'node:assert/strict'
import test from 'node:test'
import { createVocabularyDatabase, callVocabulary, vocabularySql } from './helpers/vocabulary-db.mjs'

test('단어·다중 품사 뜻 저장, 수정 충돌, 삭제, 재실행과 세션 보호', async () => {
  const db = await createVocabularyDatabase()
  try {
    const meanings = [{ part: '명사', text: '달리기' }, { part: '동사', text: '달리다' }]
    const [word] = await callVocabulary(db, 'save', { word: 'run', meanings })
    assert.deepEqual(word.meanings, meanings)
    const [updated] = await callVocabulary(db, 'save', { ...word, word: 'running' })
    assert.equal(updated.revision, 2)
    assert.deepEqual(await callVocabulary(db, 'save', word), { error: 'conflict' })
    assert.deepEqual(await callVocabulary(db, 'delete', word), { error: 'conflict' })
    for (const invalid of [[], null, {}, [{ part: '없는 품사', text: '뜻' }], [{ part: '명사', text: ' ' }], [{ part: '명사' }]]) {
      await assert.rejects(callVocabulary(db, 'save', { word: 'invalid', meanings: invalid }))
    }
    await assert.rejects(db.query('delete from public.vocabulary_words'))
    await db.exec('reset role')
    await db.exec(vocabularySql)
    await db.exec('set role anon')
    assert.equal((await callVocabulary(db, 'list')).length, 1)
    assert.deepEqual(await callVocabulary(db, 'delete', updated), [])
    await db.query("select set_config('request.headers', '{}', false)")
    await assert.rejects(callVocabulary(db, 'list'))
    await assert.rejects(callVocabulary(db, 'save', { word: 'run', meanings }))
    assert.equal((await db.query('select * from public.vocabulary_words')).rows.length, 0)
  } finally { await db.close() }
})
