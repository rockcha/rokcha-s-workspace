type UnlockResult = { status: 'ok'; token: string } | { status: 'invalid' | 'locked' }

export function createWorkspaceApi(url: string, key: string) {
  let configured = false
  try {
    const parsed = new URL(url)
    const legacyAnon = key.startsWith('eyJ') && JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'
    configured = parsed.protocol === 'https:' && (key.startsWith('sb_publishable_') || legacyAnon)
  } catch { /* Missing or unsafe configuration keeps the workspace locked. */ }

  async function rpc(name: string, body: Record<string, unknown>, token?: string): Promise<unknown> {
    if (!configured) throw new Error('작업실 연결 설정을 확인해 주세요.')
    const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' }
    if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
    if (token) headers['x-workspace-session'] = token
    let response: Response
    try {
      response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
        method: 'POST', headers, body: JSON.stringify(body),
        cache: 'no-store', signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new Error('연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.')
    }
    if (!response.ok) {
      const failure: unknown = await response.json().catch(() => null)
      const code = failure && typeof failure === 'object' && 'code' in failure && typeof failure.code === 'string' && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(failure.code)
        ? failure.code : null
      // 서버 원문에는 사용자 데이터가 포함될 수 있으므로 상태와 오류 코드만 표시합니다.
      throw new Error(`작업실 요청을 처리하지 못했어요. 다시 시도해 주세요. (HTTP ${response.status}${code ? ` · ${code}` : ''})`)
    }
    return response.json()
  }

  return {
    configured,
    rpc,
    async unlock(code: string): Promise<UnlockResult> {
      const result = await rpc('unlock_workspace', { security_code: code })
      if (typeof result === 'object' && result !== null && 'status' in result) {
        if (result.status === 'invalid' || result.status === 'locked') return { status: result.status }
        if (result.status === 'ok' && 'token' in result && typeof result.token === 'string' && /^[a-f0-9]{64}$/.test(result.token)) {
          return { status: 'ok', token: result.token }
        }
      }
      throw new Error('접속 정보를 확인하지 못했어요. 다시 시도해 주세요.')
    },
    async validate(token: string) {
      return await rpc('workspace_session_valid', {}, token) === true
    },
    async lock(token: string) {
      await rpc('lock_workspace', {}, token)
    },
  }
}

export const workspaceApi = createWorkspaceApi(
  import.meta.env?.VITE_SUPABASE_URL ?? '',
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
)
