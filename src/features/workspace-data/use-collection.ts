import { useEffect, useRef, useState } from 'react'
import { requestWorkspaceData } from '@/features/workspace-data/api'

export function useCollection<T>(token: string, domain: 'calendar' | 'lesson' | 'todo', validate: (value: unknown) => value is T) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const pending = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    requestWorkspaceData(token, `${domain}_list`).then(result => {
      if (!Array.isArray(result) || !result.every(validate)) throw new Error('서버 응답을 확인하지 못했어요.')
      if (active) setItems(result)
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '불러오지 못했어요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, domain, validate, attempt])

  async function mutate(action: 'save' | 'delete', payload: Record<string, unknown>) {
    if (pending.current || loading || error) return '기록을 불러온 뒤 다시 시도해 주세요.'
    pending.current = true
    setBusy(true)
    try {
      const result = await requestWorkspaceData(token, `${domain}_${action}`, payload)
      if (!Array.isArray(result) || !result.every(validate)) throw new Error('저장 결과를 확인하지 못했어요. 다시 시도해 주세요.')
      setItems(result)
      return ''
    } catch (cause) {
      return cause instanceof Error ? cause.message : '저장하지 못했어요.'
    } finally { pending.current = false; setBusy(false) }
  }
  return { items, loading, error, busy, mutate, retry: () => setAttempt(value => value + 1) }
}
