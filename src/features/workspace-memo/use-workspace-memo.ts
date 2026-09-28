import { useEffect, useRef, useState } from 'react'
import { requestWorkspaceData } from '@/features/workspace-data/api'

function readMemo(value: unknown) {
  if (!value || typeof value !== 'object' || !('content' in value) || typeof value.content !== 'string' || !('revision' in value) || typeof value.revision !== 'number') throw new Error('메모 응답을 확인하지 못했어요.')
  return { content: value.content, revision: value.revision }
}

export function useWorkspaceMemo(token: string) {
  const [content, setContent] = useState('')
  const [confirmed, setConfirmed] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [tick, setTick] = useState(0)
  const revision = useRef(0)
  const pending = useRef(false)
  const ready = useRef(false)
  useEffect(() => {
    if (ready.current) return
    let active = true
    setLoading(true)
    requestWorkspaceData(token, 'memo_get').then(readMemo).then(memo => {
      if (!active) return
      revision.current = memo.revision
      ready.current = true
      setContent(memo.content)
      setConfirmed(memo.content)
      setError('')
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '메모를 불러오지 못했어요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, attempt])

  useEffect(() => {
    if (loading || error || !ready.current || pending.current || content === confirmed) return
    const timer = window.setTimeout(async () => {
      pending.current = true
      try {
        const memo = readMemo(await requestWorkspaceData(token, 'memo_save', { content, revision: revision.current }))
        revision.current = memo.revision
        setConfirmed(memo.content)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '메모를 저장하지 못했어요.')
      } finally { pending.current = false; setTick(value => value + 1) }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [token, content, confirmed, loading, error, tick])

  const saved = !loading && !error && ready.current && content === confirmed
  useEffect(() => {
    if (content === confirmed) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [content, confirmed])
  return {
    content, saved, loading, error, dirty: content !== confirmed, editable: !loading && ready.current,
    update: setContent,
    retry: () => { setError(''); setAttempt(value => value + 1); setTick(value => value + 1) },
  }
}

export type WorkspaceMemoState = ReturnType<typeof useWorkspaceMemo>
