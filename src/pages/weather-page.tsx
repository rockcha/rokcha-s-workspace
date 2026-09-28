import { useEffect, useRef, useState } from 'react'
import { Cloud, CloudFog, CloudLightning, CloudRain, Droplets, Moon, LocateFixed, RefreshCw, Snowflake, Sun, Wind } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { loadAirQuality, loadWeather, weatherDescription, weatherLocations } from '@/features/weather/api'
import type { AirQuality, Weather, WeatherLocation } from '@/features/weather/api'

import { useWeatherLocation, selectWeatherLocation } from '@/features/weather/location'
import { airGrade } from '@/features/weather/air-grade'
import { resolveLocationName } from '@/features/weather/reverse-geocode'
const icons = { sun: Sun, cloud: Cloud, rain: CloudRain, snow: Snowflake, fog: CloudFog, storm: CloudLightning }
const card = 'min-w-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-6'
function display(value: number | null | undefined, digits = 0) { return value == null ? '—' : value.toFixed(digits) }
function WeatherIcon({ code, night = false, large = false }: { code: number | null; night?: boolean; large?: boolean }) {
  const kind = weatherDescription(code).kind
  const Icon = night && kind === 'sun' ? Moon : icons[kind]
  return <Icon aria-hidden="true" strokeWidth={1.3} className={large ? 'size-16 shrink-0 text-primary sm:size-20' : 'size-6 shrink-0 text-primary'} />
}


function WeatherReport({ location }: { location: WeatherLocation }) {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [air, setAir] = useState<AirQuality | null>(null)
  const [weatherError, setWeatherError] = useState(false)
  const [airError, setAirError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setWeatherError(false)
    setAirError(false)
    // Each source can succeed even if the other is unavailable.
    void Promise.allSettled([
      loadWeather(location, controller.signal).then(setWeather).catch(() => { if (!controller.signal.aborted) setWeatherError(true) }),
      loadAirQuality(location, controller.signal).then(setAir).catch(() => { if (!controller.signal.aborted) setAirError(true) }),
    ]).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [location, retry])
  const today = weather?.days[0]
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-end gap-3 text-xs text-muted-foreground">
      <Button variant="ghost" size="sm" disabled={loading} onClick={() => setRetry(value => value + 1)}><RefreshCw aria-hidden="true" className={loading ? 'motion-safe:animate-spin' : ''} />새로고침</Button>
    </div>
    {loading && <p role="status" className="mb-4 text-sm text-muted-foreground">날씨와 대기질을 불러오고 있어요.</p>}
    {(weatherError || airError) && <p role="alert" className="mb-5 rounded-xl border border-destructive/20 p-4 text-sm text-destructive">{weatherError && airError ? '날씨와 대기질을' : weatherError ? '날씨를' : '대기질을'} 불러오지 못했어요. 다시 새로고침해 주세요.{(weatherError && weather || airError && air) ? ' 이전에 불러온 정보를 표시하고 있어요.' : ''}</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-labelledby="current-weather" className="min-w-0 rounded-2xl border border-primary/15 bg-secondary/60 p-6 sm:p-8">
        <h2 id="current-weather" className="break-words text-sm text-muted-foreground">{location.name}</h2>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-6xl tracking-tight tabular-nums sm:text-7xl">{display(weather?.temperature)}<span className="ml-1 text-3xl">°</span></p><p className="mt-3 text-lg">{weather ? weatherDescription(weather.code).label : '정보 대기 중'}</p></div>
          <WeatherIcon code={weather?.code ?? null} night={weather ? !weather.isDay : false} large />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">최저 {display(today?.low)}° · 최고 {display(today?.high)}°</p>
        <dl className="mt-7 grid grid-cols-3 gap-2 border-t border-primary/15 pt-5 text-sm">
          <div><dt className="text-xs text-muted-foreground">체감온도</dt><dd className="mt-2">{display(weather?.feelsLike)}°</dd></div>
          <div><dt className="text-xs text-muted-foreground">습도</dt><dd className="mt-2">{display(weather?.humidity)}%</dd></div>
          <div><dt className="text-xs text-muted-foreground">바람</dt><dd className="mt-2">{display(weather?.wind, 1)} m/s</dd></div>
        </dl>
      </section>
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
        <section aria-label="오늘 예상 강수량" className={`${card} flex min-h-40 flex-col`}><h2 className="flex items-center gap-2 text-sm text-muted-foreground"><CloudRain aria-hidden="true" className="size-5 shrink-0 text-primary" />오늘 예상 강수량</h2><div className="flex flex-1 items-center justify-center py-4"><p className="flex items-baseline gap-1.5 text-3xl tabular-nums">{display(today?.rain, 1)} <span className="text-sm text-muted-foreground">mm</span></p></div></section>
        <section aria-label="오늘 강수 확률" className={`${card} flex min-h-40 flex-col`}><h2 className="flex items-center gap-2 text-sm text-muted-foreground"><Droplets aria-hidden="true" className="size-5 shrink-0 text-primary" />오늘 강수 확률</h2><div className="flex flex-1 items-center justify-center py-4"><p className="flex items-baseline gap-1.5 text-3xl tabular-nums">{display(today?.probability)} <span className="text-sm text-muted-foreground">%</span></p></div></section>
        {([{ name: '미세먼지', symbol: 'PM10', value: air?.pm10, type: 'pm10' as const }, { name: '초미세먼지', symbol: 'PM2.5', value: air?.pm25, type: 'pm25' as const }]).map(item => <section key={item.symbol} aria-label={item.name} className={`${card} flex min-h-40 flex-col`}><h2 className="flex items-center gap-2 text-sm text-muted-foreground"><Wind aria-hidden="true" className="size-5 shrink-0 text-primary" />{item.name}</h2><div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center"><p className={`text-2xl ${airGrade(item.value, item.type).tone}`}>{airGrade(item.value, item.type).label}</p><p className="text-sm tabular-nums text-muted-foreground">{display(item.value, 1)} μg/m³</p></div></section>)}
      </div>
    </div>
    {weather && <>
      <section aria-labelledby="hourly-weather" className={`${card} mt-6`}>
        <h2 id="hourly-weather" className="text-lg">시간대별 날씨</h2>
        <div tabIndex={0} role="region" aria-label="12시간 예보, 가로로 스크롤" className="mt-5 overflow-x-auto rounded-lg pb-2 focus-visible:outline-2 focus-visible:outline-ring">
          <ul className="flex min-w-max divide-x">{weather.hours.map(hour => <li key={hour.time} className="relative flex w-24 shrink-0 flex-col items-center gap-3 px-3 py-2 text-sm"><time dateTime={`${hour.time}+09:00`} className="text-xs text-muted-foreground">{`${Number(hour.time.slice(11, 13))}시`}</time><WeatherIcon code={hour.code} /><span className="sr-only">{weatherDescription(hour.code).label}</span><span className="text-lg tabular-nums">{display(hour.temperature)}°</span></li>)}</ul>
        </div>
      </section>
      <section aria-labelledby="daily-weather" className={`${card} mt-6`}>
        <h2 id="daily-weather" className="text-lg">앞으로 5일</h2>
        <ul className="mt-3 divide-y">{weather.days.map((day, index) => <li key={day.date} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 py-4 text-sm sm:grid-cols-[5rem_1fr_8rem_7rem]">
          <time dateTime={day.date}>{index === 0 ? '오늘' : new Date(`${day.date}T12:00:00+09:00`).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' })}</time>
          <span className="flex items-center gap-3"><WeatherIcon code={day.code} /><span className="hidden sm:inline">{weatherDescription(day.code).label}</span><span className="sr-only sm:hidden">{weatherDescription(day.code).label}</span></span>
          <span className="text-right tabular-nums"><span className="text-muted-foreground">{display(day.low)}°</span><span className="ml-3">{display(day.high)}°</span></span>
          <span className="col-span-3 text-right text-xs text-muted-foreground sm:col-span-1">{display(day.probability)}% · {display(day.rain, 1)} mm</span>
        </li>)}</ul>
      </section>
    </>}
    <footer className="mt-6 space-y-1 text-xs leading-6 text-muted-foreground"><p>미세먼지 등급은 국내 농도 구간을 적용한 참고 등급이며, 모델 예측값이에요.</p><p>날씨 · <a className="underline underline-offset-4" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> / 대기질 · <a className="underline underline-offset-4" href="https://atmosphere.copernicus.eu/" target="_blank" rel="noopener noreferrer">CAMS</a> · <a className="underline underline-offset-4" href="https://m.airkorea.or.kr/info/behaviorInfo1" target="_blank" rel="noopener noreferrer">등급 기준</a></p></footer>
  </>
}

export function WeatherPage() {
  const location = useWeatherLocation()
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const requestId = useRef(0)
  const geocoding = useRef<AbortController | null>(null)
  useEffect(() => () => { requestId.current += 1; geocoding.current?.abort() }, [])
  function locate() {
    if (!navigator.geolocation) { setLocationError('이 브라우저에서는 현재 위치를 사용할 수 없어요. 지역을 선택해 주세요.'); return }
    const id = ++requestId.current
    geocoding.current?.abort()
    const controller = new AbortController()
    geocoding.current = controller
    setLocating(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(async position => {
      if (id !== requestId.current) return
      const { latitude, longitude } = position.coords
      const current = { id: 'current', name: '지역 확인 중…', latitude, longitude }
      selectWeatherLocation(current)
      try {
        const name = await resolveLocationName(latitude, longitude, controller.signal)
        if (id === requestId.current) selectWeatherLocation({ ...current, name })
      } catch {
        if (id !== requestId.current) return
        selectWeatherLocation({ ...current, name: `위도 ${latitude.toFixed(3)} · 경도 ${longitude.toFixed(3)}` })
        setLocationError('지역명을 불러오지 못했어요. 날씨는 확인된 현재 위치로 표시해요. 현재 위치 버튼으로 다시 시도할 수 있어요.')
      } finally {
        if (id === requestId.current) setLocating(false)
      }
    }, error => {
      if (id !== requestId.current) return
      setLocating(false)
      setLocationError(error.code === 1 ? '위치 권한이 꺼져 있어요. 브라우저에서 허용하거나 지역을 선택해 주세요.' : '현재 위치를 찾지 못했어요. 다시 시도하거나 지역을 선택해 주세요.')
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }
  return <section aria-labelledby="weather-title">
    <PageHeader><div className="flex flex-wrap items-center justify-between gap-4"><h1 id="weather-title" className="flex items-center gap-3 text-3xl tracking-tight"><span aria-hidden="true" className="text-2xl">🌤️</span>날씨</h1><div className="flex flex-wrap gap-2"><Select value={location.id} onValueChange={id => { const next = weatherLocations.find(item => item.id === id); if (next) { requestId.current += 1; geocoding.current?.abort(); setLocating(false); setLocationError(''); selectWeatherLocation(next) } }}><SelectTrigger aria-label="날씨 지역" className="w-32 bg-card"><SelectValue /></SelectTrigger><SelectContent>{location.id === 'current' && <SelectItem value="current">{location.name}</SelectItem>}{weatherLocations.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={locating} onClick={locate}><LocateFixed aria-hidden="true" />{locating ? '위치 확인 중…' : '현재 위치'}</Button></div></div>{locationError && <p role="alert" className="mt-3 text-sm text-destructive">{locationError}</p>}</PageHeader>
    <WeatherReport key={`${location.id}:${location.latitude}:${location.longitude}`} location={location} />
  </section>
}
