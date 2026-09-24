import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Leaf, LockKeyhole, ArrowRight, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/config/site'
import { workspaceApi } from '@/features/workspace-access/api'

const storageKey = 'rokcha.workspace-session'

function readToken() {
  try { return sessionStorage.getItem(storageKey) ?? '' } catch { return '' }
}

function storeToken(token: string) {
  try {
    if (token) sessionStorage.setItem(storageKey, token)
    else sessionStorage.removeItem(storageKey)
  } catch { /* The current tab can still use an in-memory session. */ }
}

export function WorkspaceAccess({ children }: { children: (leave: () => Promise<void>, leaving: boolean) => ReactNode }) {
  const [token, setToken] = useState(readToken)
  const [verified, setVerified] = useState(false)
  const [checking, setChecking] = useState(() => Boolean(readToken()))
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const pending = useRef(false)

  useEffect(() => {
    if (!token) return
    let active = true
    let validating = false
    async function validate() {
      if (validating) return
      validating = true
      try {
        const valid = await workspaceApi.validate(token)
        if (!active) return
        setVerified(valid)
        if (!valid) {
          storeToken('')
          setToken('')
          setError('접속이 만료되었어요. 보안코드를 다시 입력해 주세요.')
        }
      } catch {
        if (active) {
          setVerified(false)
          setError('접속을 확인하지 못했어요. 연결을 확인한 후 다시 입장해 주세요.')
        }
      } finally {
        validating = false
        if (active) setChecking(false)
      }
    }
    void validate()
    const interval = window.setInterval(() => { void validate() }, 60_000)
    const onFocus = () => { void validate() }
    window.addEventListener('focus', onFocus)
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [token])

  async function enter() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const result = await workspaceApi.unlock(code)
      setCode('')
      if (result.status === 'ok') {
        storeToken(result.token)
        setChecking(true)
        setToken(result.token)
      } else {
        setError(result.status === 'locked' ? '입력 시도가 많아요. 5분 뒤에 다시 시도해 주세요.' : '보안코드가 맞지 않아요. 다시 확인해 주세요.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function leave() {
    if (pending.current) return
    pending.current = true
    setLeaving(true)
    try {
      await workspaceApi.lock(token)
      storeToken('')
      setToken('')
      setVerified(false)
      setCode('')
      setError('')
      window.location.hash = '/calendar'
    } catch {
      toast.error('작업실에서 나가지 못했어요.', { id: 'workspace-leave', description: '연결을 확인하고 다시 눌러 주세요.' })
    } finally {
      pending.current = false
      setLeaving(false)
    }
  }

  if (token && verified) return children(leave, leaving)

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section aria-labelledby="access-title" className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-2 text-sm text-primary"><Leaf className="size-5" strokeWidth={1.5} aria-hidden="true" />{siteConfig.name}</div>
        <div className="mb-6 flex size-12 items-center justify-center rounded-2xl border bg-card text-primary"><LockKeyhole className="size-5" strokeWidth={1.5} aria-hidden="true" /></div>
        <h1 id="access-title" className="text-3xl tracking-tight">나만의 작업실로</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">보안코드를 입력하고<br />오늘의 생각을 이어 가세요.</p>
        {checking ? <p role="status" className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />작업실을 열고 있어요.</p> : (
          <form className="mt-9" onSubmit={(event) => { event.preventDefault(); void enter() }}>
            <label htmlFor="security-code" className="text-sm">보안코드</label>
            <input id="security-code" name="password" type="password" autoComplete="current-password" autoFocus required maxLength={72} value={code} onChange={event => setCode(event.target.value)} disabled={busy || !workspaceApi.configured} aria-invalid={Boolean(error)} aria-describedby={error ? 'access-error' : undefined} placeholder="보안코드를 입력해 주세요" className="mt-2 h-12 w-full rounded-lg border bg-card px-4 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50" />
            {!workspaceApi.configured && <p role="alert" className="mt-3 text-sm leading-6 text-muted-foreground">작업실 연결 설정이 필요해요. 환경 변수를 설정한 뒤 다시 열어 주세요.</p>}
            {error && <p id="access-error" role="alert" className="mt-3 text-sm leading-6 text-destructive">{error}</p>}
            <Button type="submit" disabled={busy || !code || !workspaceApi.configured} className="mt-5 h-12 w-full rounded-lg">{busy ? '확인하는 중…' : '작업실 들어가기'}{busy ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</Button>
          </form>
        )}
        <p className="mt-10 text-xs text-muted-foreground">조금씩, 차곡차곡. 나만의 속도로.</p>
      </section>
    </main>
  )
}
