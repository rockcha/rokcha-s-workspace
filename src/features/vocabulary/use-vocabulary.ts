import { useEffect, useRef, useState } from 'react'
import { workspaceApi } from '@/features/workspace-access/api'
import { validWord } from '@/features/vocabulary/model'
import type { Word } from '@/features/vocabulary/model'

function parse(value: unknown): Word[] {
  if (!Array.isArray(value) || !value.every(validWord)) throw new Error('단어 목록을 확인하지 못했어요. 다시 불러와 주세요.')
  return value
}

export function useVocabulary(token: string) {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const pending = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void workspaceApi.rpc('manage_vocabulary', { action: 'list' }, token).then(parse).then(data => { if (active) setWords(data) }).catch(() => { if (active) setError('단어를 불러오지 못했어요. 연결 상태와 단어장 설정을 확인한 뒤 다시 불러와 주세요.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, attempt])
  async function mutate(action: 'save' | 'delete', payload: Record<string, unknown>) {
    if (pending.current || loading || error) return '단어를 불러온 뒤 다시 시도해 주세요.'
    pending.current = true
    setBusy(true)
    try {
      const result = await workspaceApi.rpc('manage_vocabulary', { action, payload }, token)
      if (result && typeof result === 'object' && 'error' in result) throw new Error('다른 곳에서 변경된 단어예요. 입력을 복사해 두고 목록을 다시 불러와 주세요.')
      setWords(parse(result))
      return ''
    } catch (cause) { return cause instanceof Error ? cause.message : '저장하지 못했어요.' }
    finally { pending.current = false; setBusy(false) }
  }
  return { words, loading, busy, error, mutate, refresh: () => setAttempt(value => value + 1) }
}
