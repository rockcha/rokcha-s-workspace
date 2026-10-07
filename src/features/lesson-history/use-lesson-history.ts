import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { workspaceApi } from '@/features/workspace-access/api'
import { validRecord } from '@/features/lesson-history/model'
import type { LessonRecord } from '@/features/lesson-history/model'

async function request(token: string, action: string, payload: Record<string, unknown> = {}) {
  const result = await workspaceApi.rpc('manage_lesson_records', { action, payload }, token)
  if (result && typeof result === 'object' && 'error' in result) throw new Error('다른 곳에서 변경된 기록이에요. 입력 내용을 보관하고 다시 불러와 주세요.')
  if (!Array.isArray(result) || !result.every(validRecord)) throw new Error('수업 내역을 확인하지 못했어요.')
  return result
}
export function useLessonHistory(token: string) {
  const [records, setRecords] = useState<LessonRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const pending = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    request(token, 'list').then(items => { if (active) setRecords(items) })
      .catch(() => { if (active) setError('수업 내역을 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, attempt])
  async function mutate(action: 'save' | 'delete', record: LessonRecord) {
    if (pending.current || loading || error) return false
    if (action === 'save' && !validRecord(record)) {
      toast.error('수업명과 날짜를 확인하고 종료 시간을 시작 시간보다 늦게 지정해 주세요.', { id: 'lesson-history-mutation' }); return false
    }
    pending.current = true; setBusy(true)
    try {
      setRecords(await request(token, action, { ...record, name: record.name.trim() }))
      toast.success(`수업 내역을 ${action === 'delete' ? '삭제' : record.revision ? '수정' : '추가'}했어요.`, { id: 'lesson-history-mutation' })
      return true
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '저장하지 못했어요.', { id: 'lesson-history-mutation' }); return false
    } finally { pending.current = false; setBusy(false) }
  }
  return { records, loading, error, busy, mutate, retry: () => setAttempt(value => value + 1) }
}
