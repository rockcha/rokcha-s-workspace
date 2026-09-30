import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { requestCareerEntries } from '@/features/career-calendar/api'
import type { CareerEntry } from '@/features/career-calendar/api'

export function useCareerCalendar(token: string) {
  const [entries, setEntries] = useState<CareerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    requestCareerEntries(token, 'list').then(result => { if (active) setEntries(result) })
      .catch(() => { if (active) setError('취업 일정을 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, attempt])

  async function mutate(action: 'save' | 'delete', entry: CareerEntry) {
    if (pending.current || loading || error) return false
    pending.current = true
    setBusy(true)
    try {
      setEntries(await requestCareerEntries(token, action, entry))
      toast.success(`취업 일정을 ${action === 'delete' ? '삭제' : entry.revision ? '수정' : '추가'}했어요.`, { id: 'career-mutation' })
      return true
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '저장하지 못했어요. 다시 시도해 주세요.', { id: 'career-mutation' })
      return false
    } finally { pending.current = false; setBusy(false) }
  }

  return { entries, loading, error, busy, mutate, retry: () => setAttempt(value => value + 1) }
}

export type CareerCalendarState = ReturnType<typeof useCareerCalendar>
