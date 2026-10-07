import { validDate } from '@/features/calendar/use-calendar'
import { minutes } from '@/features/timetable/use-timetable'

export type LessonRecord = { id: string; revision: number; name: string; date: string; start: string; end: string }
export function validRecord(value: unknown): value is LessonRecord {
  if (!value || typeof value !== 'object') return false
  const item = value as LessonRecord
  const time = /^([01]\d|2[0-3]):[0-5]\d$/
  return typeof item.id === 'string' && Number.isInteger(item.revision) && item.revision >= 0
    && typeof item.name === 'string' && !!item.name.trim() && item.name.length <= 80
    && typeof item.date === 'string' && validDate(item.date) && item.date >= '0001-01-01'
    && typeof item.start === 'string' && typeof item.end === 'string' && time.test(item.start) && time.test(item.end) && minutes(item.end) > minutes(item.start)
}
export function duration(record: LessonRecord) { return minutes(record.end) - minutes(record.start) }
export function durationLabel(value: number) { return `${Math.floor(value / 60)}시간 ${value % 60}분` }
export function monthRecords(records: LessonRecord[], month: string) {
  return records.filter(record => record.date.slice(0, 7) === month).sort((a, b) => `${a.date} ${a.start} ${a.end} ${a.name} ${a.id}`.localeCompare(`${b.date} ${b.start} ${b.end} ${b.name} ${b.id}`))
}
export function groupRecords(records: LessonRecord[]) {
  const groups = new Map<string, LessonRecord[]>()
  for (const record of records) groups.set(record.name, [...(groups.get(record.name) ?? []), record])
  return [...groups].sort(([a], [b]) => a.localeCompare(b, 'ko'))
}
