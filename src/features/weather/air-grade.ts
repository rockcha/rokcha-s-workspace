// AirKorea concentration bands, applied to model estimates as a reference grade.
export function airGrade(value: number | null | undefined, type: 'pm10' | 'pm25') {
  if (value == null || !Number.isFinite(value) || value < 0) return { label: '정보 없음', tone: 'text-muted-foreground' }
  const limits = type === 'pm10' ? [30, 80, 150] : [15, 35, 75]
  if (value <= limits[0]) return { label: '좋음', tone: 'text-primary' }
  if (value <= limits[1]) return { label: '보통', tone: 'text-foreground' }
  if (value <= limits[2]) return { label: '나쁨', tone: 'text-destructive' }
  return { label: '매우 나쁨', tone: 'text-destructive' }
}
