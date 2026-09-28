import { useEffect, useRef, useState } from 'react'
import { workspaceApi } from '@/features/workspace-access/api'

export type MotivationItem = { id: string; kind: 'quote' | 'youtube'; title: string; content: string; video_id: string; revision: number }

function parse(value: unknown): MotivationItem[] {
  if (!Array.isArray(value) || !value.every(item => item && typeof item.id === 'string' && ['quote', 'youtube'].includes(item.kind) && typeof item.title === 'string' && typeof item.content === 'string' && typeof item.video_id === 'string' && (item.kind !== 'youtube' || /^[A-Za-z0-9_-]{11}$/.test(item.video_id)) && Number.isInteger(item.revision))) throw new Error('콘텐츠를 확인하지 못했어요. 다시 불러와 주세요.')
  return value
}

export function useMotivation(token: string) {
  const [items, setItems] = useState<MotivationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const pending = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void workspaceApi.rpc('manage_motivation', { action: 'list' }, token).then(parse).then(data => { if (active) setItems(data) }).catch(() => { if (active) setError('콘텐츠를 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, attempt])
  async function mutate(action: 'save' | 'delete', payload: Record<string, unknown>) {
    if (pending.current || loading || error) return '콘텐츠를 불러온 뒤 다시 시도해 주세요.'
    pending.current = true
    setBusy(true)
    try {
      const result = await workspaceApi.rpc('manage_motivation', { action, payload }, token)
      if (result && typeof result === 'object' && 'error' in result) throw new Error('다른 곳에서 변경된 콘텐츠예요. 입력 내용을 복사해 두고 새로고침해 주세요.')
      setItems(parse(result))
      return ''
    } catch (cause) { return cause instanceof Error ? cause.message : '저장하지 못했어요.' }
    finally { pending.current = false; setBusy(false) }
  }
  return { items, loading, busy, error, mutate, refresh: () => setAttempt(value => value + 1) }
}
