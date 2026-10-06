import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from '@/features/workspace-data/use-collection'

export type CalendarEntry = { id: string; revision?: number; type: 'event' | 'note'; date: string; time: string; title: string; content: string }
export type CalendarDraft = Omit<CalendarEntry, 'id' | 'revision'>

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)
}

export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

export function validEntry(value: unknown): value is CalendarEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as CalendarEntry
  return typeof entry.id === 'string' && (entry.type === 'event' || entry.type === 'note') && typeof entry.date === 'string' && validDate(entry.date) && typeof entry.time === 'string' && (entry.time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time)) && typeof entry.title === 'string' && typeof entry.content === 'string'
}

export function useToday() {
  const [today, setToday] = useState(() => dateKey(new Date()))
  useEffect(() => {
    const refresh = () => setToday(dateKey(new Date()))
    const interval = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [])
  return today
}

export function useCalendar(token: string) {
  const collection = useCollection(token, 'calendar', validEntry)
  const entries = collection.items
  const [noteDrafts, setNoteDrafts] = useState<Record<string, { id: string; content: string; error: string }>>({})
  const [noteTick, setNoteTick] = useState(0)
  const notePending = useRef(false)

  function updateNote(date: string, content: string) {
    setNoteDrafts(previous => ({ ...previous, [date]: { id: previous[date]?.id ?? entries.find(entry => entry.type === 'note' && entry.date === date)?.id ?? crypto.randomUUID(), content, error: '' } }))
  }

  useEffect(() => {
    if (collection.loading || collection.busy || collection.error || notePending.current) return
    const next = Object.entries(noteDrafts).find(([date, draft]) => !draft.error && draft.content !== (entries.find(entry => entry.type === 'note' && entry.date === date)?.content ?? ''))
    if (!next) return
    const [date, draft] = next
    const timer = window.setTimeout(async () => {
      notePending.current = true
      const existing = entries.find(entry => entry.type === 'note' && entry.date === date)
      const error = draft.content.trim()
        ? await collection.mutate('save', { id: existing?.id ?? draft.id, revision: existing?.revision ?? 0, type: 'note', date, time: '', title: '', content: draft.content })
        : existing ? await collection.mutate('delete', { id: existing.id, revision: existing.revision }) : ''
      setNoteDrafts(previous => {
        const current = previous[date]
        if (!current) return previous
        if (error) return { ...previous, [date]: { ...current, error } }
        if (current.content !== draft.content) return previous
        const remaining = { ...previous }
        delete remaining[date]
        return remaining
      })
      notePending.current = false
      setNoteTick(value => value + 1)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [collection, entries, noteDrafts, noteTick])

  const dirtyNotes = Object.entries(noteDrafts).some(([date, draft]) => draft.content !== (entries.find(entry => entry.type === 'note' && entry.date === date)?.content ?? ''))
  useEffect(() => {
    if (!dirtyNotes) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirtyNotes])
  async function save(draft: CalendarDraft, id?: string) {
    if (!(draft.type === 'note' ? draft.content : draft.title).trim() || !validDate(draft.date)) return false
    const entry = { ...draft, title: draft.type === 'note' ? '' : draft.title.trim(), time: draft.type === 'note' ? '' : draft.time || '23:59', id: id ?? crypto.randomUUID(), revision: entries.find(item => item.id === id)?.revision ?? 0 }
    const error = await collection.mutate('save', entry)
    if (error) toast.error(error, { id: 'calendar-mutation' })
    else toast.success(`${draft.type === 'note' ? '노트를' : '일정을'} ${id ? '수정' : '추가'}했어요.`, { id: 'calendar-mutation' })
    return !error
  }
  async function remove(id: string) {
    const error = await collection.mutate('delete', { id, revision: entries.find(item => item.id === id)?.revision })
    if (error) toast.error(error, { id: 'calendar-mutation' })
    else toast.success(`${entries.find(item => item.id === id)?.type === 'note' ? '노트를' : '일정을'} 삭제했어요.`, { id: 'calendar-mutation' })
    return !error
  }
  return { ...collection, entries, save, remove, noteDrafts, updateNote, retryNote: (date: string) => setNoteDrafts(previous => previous[date] ? { ...previous, [date]: { ...previous[date], error: '' } } : previous) }
}

export type CalendarState = ReturnType<typeof useCalendar>

export function sortEntries(entries: CalendarEntry[]) {
  const order = (entry: CalendarEntry) => entry.type === 'note' ? '99:99' : entry.time || '24:00'
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || order(a).localeCompare(order(b)) || a.title.localeCompare(b.title, 'ko'))
}
