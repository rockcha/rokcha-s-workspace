import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/time-input.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { normalizeTimeInput } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('시간 단축 입력을 표준 시간으로 변환하고 빈 값은 유지', () => {
  for (const [input, expected] of [['', ''], ['   ', ''], ['1', '01:00'], ['01', '01:00'], ['130', '01:30'], ['0930', '09:30'], ['9:5', '09:05'], ['23:59', '23:59'], ['오후 1시', '13:00'], ['오전 12시', '00:00'], ['오후 12시 30분', '12:30'], ['0', '00:00']]) {
    assert.equal(normalizeTimeInput(input), expected, input)
  }
})

test('잘못된 시간은 종일이나 다른 시간으로 바꾸지 않음', () => {
  for (const input of ['24', '25:99', '1260', '9:', '오후 13시', '오전 0시', '-1', 'abc', '12345']) {
    assert.equal(normalizeTimeInput(input), null, input)
  }
})
