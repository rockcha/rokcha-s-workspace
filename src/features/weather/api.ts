export const weatherLocations = [
  { id: 'seoul', name: '서울', latitude: 37.5665, longitude: 126.978 },
  { id: 'busan', name: '부산', latitude: 35.1796, longitude: 129.0756 },
  { id: 'daegu', name: '대구', latitude: 35.8714, longitude: 128.6014 },
  { id: 'incheon', name: '인천', latitude: 37.4563, longitude: 126.7052 },
  { id: 'gwangju', name: '광주', latitude: 35.1595, longitude: 126.8526 },
  { id: 'daejeon', name: '대전', latitude: 36.3504, longitude: 127.3845 },
  { id: 'ulsan', name: '울산', latitude: 35.5384, longitude: 129.3114 },
  { id: 'sejong', name: '세종', latitude: 36.4801, longitude: 127.289 },
  { id: 'suwon', name: '수원', latitude: 37.2636, longitude: 127.0286 },
  { id: 'chuncheon', name: '춘천', latitude: 37.8813, longitude: 127.73 },
  { id: 'gangneung', name: '강릉', latitude: 37.7519, longitude: 128.8761 },
  { id: 'cheongju', name: '청주', latitude: 36.6424, longitude: 127.489 },
  { id: 'hongseong', name: '홍성', latitude: 36.6012, longitude: 126.6608 },
  { id: 'jeonju', name: '전주', latitude: 35.8242, longitude: 127.148 },
  { id: 'mokpo', name: '목포', latitude: 34.8118, longitude: 126.3922 },
  { id: 'andong', name: '안동', latitude: 36.5684, longitude: 128.7294 },
  { id: 'changwon', name: '창원', latitude: 35.228, longitude: 128.6811 },
  { id: 'jeju', name: '제주', latitude: 33.4996, longitude: 126.5312 },
]
export type WeatherLocation = typeof weatherLocations[number]
type Reading = number | null
export type Weather = {
  time: string; temperature: Reading; feelsLike: Reading; humidity: Reading; wind: Reading; code: Reading; isDay: boolean
  hours: { time: string; temperature: Reading; code: Reading; rain: Reading; probability: Reading }[]
  days: { date: string; code: Reading; low: Reading; high: Reading; rain: Reading; probability: Reading }[]
}
export type AirQuality = { time: string; pm10: Reading; pm25: Reading }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('응답 형식이 올바르지 않아요.')
  return value as Record<string, unknown>
}
function number(value: unknown): Reading {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
function time(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('기준 시각이 없어요.')
  return value
}
function at(value: unknown, index: number): Reading { return number(Array.isArray(value) ? value[index] : null) }

export function parseWeather(value: unknown): Weather {
  const body = record(value)
  const current = record(body.current)
  const hourly = record(body.hourly)
  const daily = record(body.daily)
  if (!Array.isArray(hourly.time) || !Array.isArray(daily.time)) throw new Error('예보가 없어요.')
  const now = time(current.time)
  return {
    time: now, temperature: number(current.temperature_2m), feelsLike: number(current.apparent_temperature), humidity: number(current.relative_humidity_2m), wind: number(current.wind_speed_10m), code: number(current.weather_code), isDay: current.is_day !== 0,
    hours: hourly.time.map((value, i) => ({ time: time(value), temperature: at(hourly.temperature_2m, i), code: at(hourly.weather_code, i), rain: at(hourly.precipitation, i), probability: at(hourly.precipitation_probability, i) })).filter(hour => hour.time >= `${now.slice(0, 13)}:00`).slice(0, 12),
    days: daily.time.map((date, i) => {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('예보 날짜가 올바르지 않아요.')
      return { date, code: at(daily.weather_code, i), low: at(daily.temperature_2m_min, i), high: at(daily.temperature_2m_max, i), rain: at(daily.precipitation_sum, i), probability: at(daily.precipitation_probability_max, i) }
    }).slice(0, 5),
  }
}
export function parseAirQuality(value: unknown): AirQuality {
  const current = record(record(value).current)
  const pm10 = number(current.pm10)
  const pm25 = number(current.pm2_5)
  return { time: time(current.time), pm10: pm10 !== null && pm10 >= 0 ? pm10 : null, pm25: pm25 !== null && pm25 >= 0 ? pm25 : null }
}

async function request(host: string, path: string, location: WeatherLocation, params: Record<string, string>, signal: AbortSignal): Promise<unknown> {
  const query = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), timezone: 'Asia/Seoul', ...params })
  const response = await fetch(`https://${host}${path}?${query}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]), credentials: 'omit' })
  if (!response.ok) throw new Error('날씨 정보를 불러오지 못했어요.')
  return response.json()
}
export async function loadWeather(location: WeatherLocation, signal: AbortSignal) {
  return parseWeather(await request('api.open-meteo.com', '/v1/forecast', location, {
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,weather_code,precipitation,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
    forecast_days: '5', wind_speed_unit: 'ms',
  }, signal))
}
export async function loadAirQuality(location: WeatherLocation, signal: AbortSignal) {
  return parseAirQuality(await request('air-quality-api.open-meteo.com', '/v1/air-quality', location, { current: 'pm10,pm2_5', domains: 'cams_global' }, signal))
}

export async function loadCalendarWeather(location: WeatherLocation, signal: AbortSignal): Promise<Record<string, number>> {
  const body = record(await request('api.open-meteo.com', '/v1/forecast', location, { daily: 'weather_code', forecast_days: '16' }, signal))
  const daily = record(body.daily)
  if (!Array.isArray(daily.time) || !Array.isArray(daily.weather_code)) throw new Error('예보가 없어요.')
  const result: Record<string, number> = {}
  daily.time.forEach((date, index) => {
    const code = at(daily.weather_code, index)
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && code !== null && weatherDescription(code).label !== '정보 없음') result[date] = code
  })
  return result
}

export function weatherEmoji(code: number) {
  if (code === 1 || code === 2) return '🌤️'
  return { sun: '☀️', cloud: '☁️', rain: '🌧️', snow: '❄️', fog: '🌫️', storm: '⛈️' }[weatherDescription(code).kind]
}

export function weatherDescription(code: Reading): { label: string; kind: 'sun' | 'cloud' | 'rain' | 'snow' | 'fog' | 'storm' } {
  if (code === 0) return { label: '맑음', kind: 'sun' }
  if (code === 1) return { label: '대체로 맑음', kind: 'sun' }
  if (code === 2 || code === 3) return { label: code === 2 ? '구름 조금' : '흐림', kind: 'cloud' }
  if (code === 45 || code === 48) return { label: '안개', kind: 'fog' }
  if (code !== null && [51, 53, 55, 56, 57].includes(code)) return { label: '이슬비', kind: 'rain' }
  if (code !== null && [61, 63, 65, 66, 67].includes(code)) return { label: '비', kind: 'rain' }
  if (code !== null && [80, 81, 82].includes(code)) return { label: '소나기', kind: 'rain' }
  if (code !== null && [71, 73, 75, 77, 85, 86].includes(code)) return { label: '눈', kind: 'snow' }
  if (code !== null && [95, 96, 99].includes(code)) return { label: '뇌우', kind: 'storm' }
  return { label: '정보 없음', kind: 'cloud' }
}
