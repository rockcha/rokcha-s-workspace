import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/features/calendar/holidays.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { parseHolidays, loadHolidays } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const data = { 2025: { '2025-05-05': ['어린이날', '부처님 오신 날', '어린이날'], '2025-05-06': ['대체공휴일'] }, 2026: { '2026-01-01': ['1월 1일'] } }

test('연도 경계·겹치는 공휴일·대체공휴일을 보존하며 중복 명칭 제거', () => {
  assert.deepEqual(parseHolidays(data), { '2025-05-05': ['어린이날', '부처님 오신 날'], '2025-05-06': ['대체공휴일'], '2026-01-01': ['1월 1일'] })
  for (const value of [null, [], {}, { 2025: {} }, { 2025: { '2026-01-01': ['잘못된 연도'] } }, { 2025: { '2025-02-30': ['없는 날짜'] } }, { 2025: { '2025-01-01': [''] } }]) assert.throws(() => parseHolidays(value))
})

test('실패 후 재요청, 성공 응답 캐시와 취소 처리', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return calls === 1 ? new Response('', { status: 503 }) : Response.json(data)
  })
  await assert.rejects(loadHolidays(new AbortController().signal))
  assert.deepEqual(await loadHolidays(new AbortController().signal), parseHolidays(data))
  await loadHolidays(new AbortController().signal)
  assert.equal(calls, 2)
  await assert.rejects(loadHolidays(AbortSignal.abort()))
})
