import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/features/weather/air-grade.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { airGrade } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
test('국내 미세먼지·초미세먼지 농도 구간의 경계와 누락값', () => {
  for (const [type, boundaries] of [['pm10', [30, 80, 150]], ['pm25', [15, 35, 75]]]) {
    assert.equal(airGrade(0, type).label, '좋음')
    for (const [index, boundary] of boundaries.entries()) {
      assert.equal(airGrade(boundary, type).label, ['좋음', '보통', '나쁨'][index])
      assert.equal(airGrade(boundary + 0.1, type).label, ['보통', '나쁨', '매우 나쁨'][index])
    }
    for (const value of [null, undefined, NaN, -1]) assert.equal(airGrade(value, type).label, '정보 없음')
  }
})
