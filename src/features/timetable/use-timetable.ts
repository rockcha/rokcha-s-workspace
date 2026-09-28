import { useCollection } from '@/features/workspace-data/use-collection'
import { toast } from 'sonner'

export const weekdays = ['월', '화', '수', '목', '금', '토', '일'] as const
export const lessonColors = [
  { id: 'sage', name: '녹차' }, { id: 'blue', name: '하늘' }, { id: 'lavender', name: '라벤더' },
  { id: 'rose', name: '장미' }, { id: 'amber', name: '살구' }, { id: 'teal', name: '민트' },
  { id: 'lemon', name: '레몬' }, { id: 'coral', name: '코랄' }, { id: 'indigo', name: '인디고' },
  { id: 'cocoa', name: '코코아' }, { id: 'slate', name: '그레이' },
] as const
export type LessonColor = typeof lessonColors[number]['id']
export type Lesson = { id: string; revision?: number; name: string; memo: string; days: number[]; start: string; end: string; color: LessonColor }
export type LessonDraft = Omit<Lesson, 'id' | 'revision'>

export function minutes(time: string) {
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}

export function validLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== 'object') return false
  const item = value as Lesson
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
  return typeof item.id === 'string' && typeof item.name === 'string' && !!item.name.trim() && typeof item.memo === 'string' && Array.isArray(item.days) && item.days.length > 0 && item.days.every(day => Number.isInteger(day) && day >= 0 && day < 7) && typeof item.start === 'string' && typeof item.end === 'string' && timePattern.test(item.start) && timePattern.test(item.end) && minutes(item.end) > minutes(item.start) && lessonColors.some(color => color.id === item.color)
}

export function useTimetable(token: string) {
  const collection = useCollection(token, 'lesson', validLesson)
  const lessons = collection.items
  async function save(draft: LessonDraft, id?: string) {
    const lesson = { ...draft, name: draft.name.trim(), days: [...new Set(draft.days)].sort(), id: id ?? crypto.randomUUID(), revision: lessons.find(item => item.id === id)?.revision ?? 0 }
    if (!validLesson(lesson)) return '수업 이름과 요일을 입력하고 종료 시간을 시작 시간보다 늦게 지정해 주세요.'
    const error = await collection.mutate('save', lesson)
    if (!error) toast.success('수업을 저장했어요.', { id: 'timetable-mutation' })
    return error
  }
  async function remove(id: string) {
    const error = await collection.mutate('delete', { id, revision: lessons.find(item => item.id === id)?.revision })
    if (!error) toast.success('수업을 삭제했어요.', { id: 'timetable-mutation' })
    return error
  }
  return { ...collection, lessons, save, remove }
}

export type TimetableState = ReturnType<typeof useTimetable>
