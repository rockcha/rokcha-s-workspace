export async function resolveLocationName(latitude: number, longitude: number, signal: AbortSignal): Promise<string> {
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), localityLanguage: 'ko' })
  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`, { credentials: 'omit', signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) })
  if (!response.ok) throw new Error('지역명을 찾지 못했어요.')
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object') throw new Error('지역명을 찾지 못했어요.')
  const fields = data as Record<string, unknown>
  const names = [fields.principalSubdivision, fields.city, fields.locality].filter((value): value is string => typeof value === 'string' && !!value.trim()).map(value => value.trim())
  const name = [...new Set(names)].join(' ')
  if (!name) throw new Error('지역명을 찾지 못했어요.')
  return name
}
