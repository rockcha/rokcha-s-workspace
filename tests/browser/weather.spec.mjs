import { expect, test } from '@playwright/test'
import { testToken } from '../helpers/notes-db.mjs'

const forecast = {
  current: { time: '2026-09-28T12:15', temperature_2m: 24, apparent_temperature: 25, relative_humidity_2m: 65, wind_speed_10m: 2.1, weather_code: 2, is_day: 1 },
  hourly: { time: Array.from({ length: 24 }, (_, i) => `2026-09-28T${String(i).padStart(2, '0')}:00`), temperature_2m: Array(24).fill(24), weather_code: Array(24).fill(2), precipitation: Array(24).fill(0.2), precipitation_probability: Array(24).fill(35) },
  daily: { time: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'], weather_code: [2, 61, 0, 3, 80], temperature_2m_min: [17, 18, 19, 18, 17], temperature_2m_max: [25, 26, 27, 26, 24], precipitation_sum: [1.2, 2.5, 0, 0, 3.4], precipitation_probability_max: [35, 70, 0, 10, 80] },
}
const air = { current: { time: '2026-09-28T12:00', pm10: 23.4, pm2_5: 12.1 } }
test.beforeEach(async ({ page }) => {
  await page.addInitScript(token => sessionStorage.setItem('rokcha.workspace-session', token), testToken)
  await page.route('https://notes-test.invalid/**', route => {
    const body = route.request().postDataJSON()
    return route.fulfill({ json: route.request().url().endsWith('manage_workspace_data') ? body.action === 'memo_get' ? { content: '', revision: 1 } : [] : true, headers: { 'access-control-allow-origin': '*' } })
  })
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: forecast }))
  await page.route('https://air-quality-api.open-meteo.com/**', route => route.fulfill({ json: air }))
  await page.route('https://api.bigdatacloud.net/**', route => route.fulfill({ json: { principalSubdivision: '부산광역시', city: '서구', locality: '암남동' } }))
})

for (const width of [1440, 320]) {
  test(`${width}px 날씨 카드·지역 저장·키보드와 새로고침`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/weather')
    await expect(page.getByRole('link', { name: '날씨', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('region', { name: '미세먼지', exact: true })).toContainText('23.4')
    await expect(page.getByRole('region', { name: '미세먼지', exact: true })).toContainText('좋음')
    await expect(page.getByRole('region', { name: '초미세먼지', exact: true })).toContainText('좋음')
    await expect(page.getByText('하루 전체 예상 합계')).toHaveCount(0)
    await expect(page.getByText('하루 중 가장 높은 확률')).toHaveCount(0)
    await expect(page.getByText(/기준 · 한국 시간|기준 · 예측 농도/)).toHaveCount(0)
    await expect(page.getByText('강수 확률 · 직전 1시간 예상 강수량')).toHaveCount(0)
    await expect(page.getByText('PM10', { exact: true })).toHaveCount(0)
    await expect(page.getByText('PM2.5', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('region', { name: '초미세먼지', exact: true })).toContainText('12.1')
    await expect(page.getByRole('region', { name: '오늘 예상 강수량' })).toContainText('1.2')
    await expect(page.getByRole('region', { name: '시간대별 날씨', exact: true }).getByRole('listitem')).toHaveCount(12)
    await expect(page.getByRole('region', { name: '앞으로 5일', exact: true }).getByRole('listitem')).toHaveCount(5)
    await page.screenshot({ path: `test-results/weather-${width}.png`, fullPage: true })
    expect(await page.evaluate(() => Array.from(document.querySelectorAll('main > section, main > section section, main > section footer')).filter(el => el.getBoundingClientRect().right > innerWidth).map(el => ({ name: el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby'), width: el.getBoundingClientRect().width })))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('combobox', { name: '날씨 지역' }).focus()
    await page.keyboard.press('Enter')
    const request = page.waitForRequest(request => request.url().includes('api.open-meteo.com/v1/forecast') && request.url().includes('latitude=35.1796'))
    await page.getByRole('option', { name: '부산', exact: true }).click()
    await request
    await expect(page.getByRole('heading', { name: '부산' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('combobox', { name: '날씨 지역' })).toHaveText('부산')
    await expect(page.getByRole('button', { name: '새로고침' })).toBeEnabled()
    await page.getByRole('button', { name: '새로고침' }).click()
    await expect(page.getByRole('region', { name: '미세먼지', exact: true })).toContainText('23.4')
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
  })
}

test('대기질 조회 실패·재시도와 누락값을 0으로 표시하지 않음', async ({ page }) => {
  await page.route('https://air-quality-api.open-meteo.com/**', route => route.fulfill({ status: 503, body: 'unavailable' }))
  await page.goto('/#/weather')
  await expect(page.getByRole('alert')).toContainText('대기질을 불러오지 못했어요')
  await expect(page.getByRole('region', { name: '서울' })).toContainText('24')
  await expect(page.getByRole('region', { name: '미세먼지', exact: true })).toContainText('—')
  await page.route('https://air-quality-api.open-meteo.com/**', route => route.fulfill({ json: { current: { ...air.current, pm10: null, pm2_5: 0 } } }))
  await page.getByRole('button', { name: '새로고침' }).click()
  await expect(page.getByRole('region', { name: '초미세먼지', exact: true })).toContainText('0.0')
  await expect(page.getByRole('region', { name: '미세먼지', exact: true })).toContainText('—')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('현재 위치 권한 허용과 캘린더 날씨 공유, 예보 없는 날짜는 비움', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 35.12, longitude: 129.04 })
  await page.goto('/#/weather')
  const located = page.waitForRequest(request => request.url().includes('api.open-meteo.com/v1/forecast') && request.url().includes('latitude=35.12'))
  await page.getByRole('button', { name: '현재 위치', exact: true }).click()
  await located
  await expect(page.getByRole('heading', { name: '부산광역시 서구 암남동' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: '캘린더', exact: true }).click()
  await page.evaluate(() => { location.hash = '/calendar?month=2026-09' })
  const day = page.getByRole('link', { name: '2026-09-28 상세 보기', exact: true })
  await expect(day.getByRole('img', { name: '부산광역시 서구 암남동 구름 조금 예보' })).toBeVisible()
  await expect(page.getByText('● 오늘', { exact: true })).toHaveCount(0)
  await expect(page.getByText('오늘부터 최대 16일 예보')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open-Meteo', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '2026-09-01 상세 보기', exact: true }).getByRole('img')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/calendar-weather-mobile.png', fullPage: true })
  await day.click()
  await expect(page).toHaveURL(/calendar\/2026-09-28$/)
})

test('현재 위치 거절 시 지역 유지 및 등급별 표시', async ({ page }) => {
  await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = (_success, failure) => failure({ code: 1 }) })
  await page.route('https://air-quality-api.open-meteo.com/**', route => route.fulfill({ json: { current: { ...air.current, pm10: 100, pm2_5: 80 } } }))
  await page.goto('/#/weather')
  await page.getByRole('button', { name: '현재 위치', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('위치 권한이 꺼져 있어요')
  await expect(page.getByRole('combobox', { name: '날씨 지역' })).toHaveText('서울')
  await expect(page.getByRole('region', { name: '미세먼지', exact: true })).toContainText('나쁨')
  await expect(page.getByRole('region', { name: '초미세먼지', exact: true })).toContainText('매우 나쁨')
})

test('지역명 조회 실패에도 현재 좌표의 날씨는 표시', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 35.12, longitude: 129.04 })
  await page.route('https://api.bigdatacloud.net/**', route => route.fulfill({ status: 503, body: 'unavailable' }))
  await page.goto('/#/weather')
  await page.getByRole('button', { name: '현재 위치', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('지역명을 불러오지 못했어요')
  await expect(page.getByRole('heading', { name: '위도 35.120 · 경도 129.040' })).toBeVisible()
  await expect(page.getByRole('region', { name: '위도 35.120 · 경도 129.040' })).toContainText('24')
})
