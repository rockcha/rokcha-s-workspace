import { useSyncExternalStore } from 'react'
import { weatherLocations } from '@/features/weather/api'
import type { WeatherLocation } from '@/features/weather/api'

const storageKey = 'rokcha.weather-location'
let selected: WeatherLocation | undefined
const listeners = new Set<() => void>()
function snapshot() {
  if (!selected) {
    try { selected = weatherLocations.find(item => item.id === localStorage.getItem(storageKey)) } catch { /* Use Seoul when storage is unavailable. */ }
    selected ??= weatherLocations[0]
  }
  return selected
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function selectWeatherLocation(location: WeatherLocation) {
  selected = location
  // Coordinates from the device stay in memory, shared with the calendar.
  if (location.id !== 'current') {
    try { localStorage.setItem(storageKey, location.id) } catch { /* Selection still works in memory. */ }
  }
  listeners.forEach(listener => listener())
}
export function useWeatherLocation() { return useSyncExternalStore(subscribe, snapshot) }
