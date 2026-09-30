import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { createCareerDatabase, callCareerEntries, careerCalendarSql } from './helpers/career-calendar-db.mjs'

const draft = (changes = {}) => ({ id: randomUUID(), revision: 0, title: '채용 서류 접수', date: '2026-12-31', time: '18:00', memo: '지원서 확인\n포트폴리오 첨부', links: [{ title: '공식 모집 링크', url: 'https://example.com/jobs' }, { title: '자소서 작성 링크', url: 'https://example.com/apply' }], ...changes })

test('취업 일정 CRUD·마감순 정렬·날짜 이동·충돌·SQL 재실행·세션 및 RLS', async () => {
  const db = await createCareerDatabase()
  try {
    const source = draft({ title: ' 서류 접수 ' })
    const [first] = await callCareerEntries(db, 'save', source)
    assert.equal(first.title, '서류 접수')
    assert.deepEqual(first.links, source.links)
    assert.equal(first.memo, source.memo)
    assert.deepEqual(await callCareerEntries(db, 'save', source), { error: 'conflict' })
    let result = await callCareerEntries(db, 'save', draft({ title: '이른 마감', time: '09:30', links: [], memo: '' }))
    assert.deepEqual(result.map(item => item.time), ['09:30', '18:00'])
    result = await callCareerEntries(db, 'save', { ...first, date: '2027-01-01', time: '00:00', memo: '수정한 메모', links: [first.links[1]] })
    const updated = result.find(item => item.id === first.id)
    assert.equal(updated.revision, 2)
    assert.equal(updated.date, '2027-01-01')
    assert.deepEqual(updated.links, [first.links[1]])
    assert.deepEqual(await callCareerEntries(db, 'save', first), { error: 'conflict' })
    assert.deepEqual(await callCareerEntries(db, 'delete', first), { error: 'conflict' })
    await assert.rejects(db.query("insert into public.career_entries(id, title, date, time) values ($1, '직접 작성', '2026-12-31', '12:00')", [randomUUID()]))
    await assert.rejects(db.query('delete from public.career_entries where id = $1', [first.id]))
    await db.exec('reset role')
    await db.exec(careerCalendarSql)
    await db.exec('set role anon')
    assert.equal((await callCareerEntries(db, 'list')).length, 2)
    assert.equal((await callCareerEntries(db, 'delete', updated)).length, 1)
    await db.query("select set_config('request.headers', '{}', false)")
    for (const action of ['list', 'save', 'delete']) await assert.rejects(callCareerEntries(db, action, source))
    assert.equal((await db.query('select * from public.career_entries')).rows.length, 0)
  } finally { await db.close() }
})

test('필수 마감 시간·날짜·링크 이름·HTTP(S) 주소와 길이 제한', async () => {
  const db = await createCareerDatabase()
  try {
    const invalid = [
      { time: '' }, { time: null }, { time: '24:00' }, { time: '12:60' }, { time: '9:00' },
      { date: '2026-02-30' }, { date: null }, { title: '\n\t ' }, { title: '가'.repeat(121) }, { memo: '가'.repeat(10001) },
      { links: null }, { links: {} }, { links: [null] }, { links: [{ title: '링크' }] },
      { links: [{ title: ' ', url: 'https://example.com' }] },
      ...['javascript:alert(1)', 'data:text/html,test', '//example.com', 'https://user:pass@example.com', 'https://', 'https://example.com\\test'].map(url => ({ links: [{ title: '링크', url }] })),
      { links: Array.from({ length: 21 }, () => ({ title: '링크', url: 'https://example.com' })) },
    ]
    for (const value of invalid) await assert.rejects(callCareerEntries(db, 'save', draft(value)), JSON.stringify(value))
    assert.deepEqual(await callCareerEntries(db, 'list'), [])
    const links = Array.from({ length: 20 }, (_, index) => ({ title: `링크 ${index + 1}`, url: `https://example.com/${index}?a=1&b=2#section` }))
    const [entry] = await callCareerEntries(db, 'save', draft({ links, time: '23:59' }))
    assert.equal(entry.links.length, 20)
  } finally { await db.close() }
})
