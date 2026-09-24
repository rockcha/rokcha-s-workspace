import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/features/workspace-access/api.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { createWorkspaceApi } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const endpoint = 'https://example.supabase.co'
const key = 'sb_publishable_test'
const token = 'a'.repeat(64)

test('missing, secret, and service-role keys cannot make requests', async () => {
  const serviceKey = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`
  for (const unsafeKey of ['', 'sb_secret_test', serviceKey]) {
    const api = createWorkspaceApi(endpoint, unsafeKey)
    assert.equal(api.configured, false)
    await assert.rejects(api.unlock('test-code-only'), /설정/)
  }
  assert.equal(createWorkspaceApi('http://example.supabase.co', key).configured, false)
})

test('unlock uses a POST body; validation and logout send the session header', async (t) => {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, ...options })
    return Response.json(url.endsWith('unlock_workspace') ? { status: 'ok', token } : true)
  })
  const api = createWorkspaceApi(`${endpoint}/`, key)
  assert.deepEqual(await api.unlock('test-code-only'), { status: 'ok', token })
  assert.equal(await api.validate(token), true)
  await api.lock(token)
  assert.equal(requests[0].url, `${endpoint}/rest/v1/rpc/unlock_workspace`)
  assert.equal(requests[0].method, 'POST')
  assert.equal(requests[0].headers.apikey, key)
  assert.equal(requests[0].headers.Authorization, undefined)
  assert.deepEqual(JSON.parse(requests[0].body), { security_code: 'test-code-only' })
  assert.equal(requests[1].headers['x-workspace-session'], token)
  assert.equal(requests[2].headers['x-workspace-session'], token)
  assert.ok(requests[2].url.endsWith('/lock_workspace'))
})

test('legacy anon key gets a bearer header', async (t) => {
  const anonKey = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.signature`
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${anonKey}`)
    return Response.json(false)
  })
  assert.equal(await createWorkspaceApi(endpoint, anonKey).validate(token), false)
})

test('invalid and rate-limited results never produce a session', async (t) => {
  for (const status of ['invalid', 'locked']) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ status }))
    assert.deepEqual(await createWorkspaceApi(endpoint, key).unlock('wrong'), { status })
    mock.mock.restore()
  }
})

test('malformed unlock responses and non-boolean validation fail closed', async (t) => {
  for (const value of [null, true, { status: 'ok' }, { status: 'ok', token: 'forged' }]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(value))
    await assert.rejects(createWorkspaceApi(endpoint, key).unlock('test-code-only'))
    mock.mock.restore()
  }
  t.mock.method(globalThis, 'fetch', async () => Response.json('true'))
  assert.equal(await createWorkspaceApi(endpoint, key).validate(token), false)
})

test('network and server failures do not authorize or report logout success', async (t) => {
  const api = createWorkspaceApi(endpoint, key)
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed') })
  await assert.rejects(api.unlock('test-code-only'), /연결/)
  await assert.rejects(api.validate(token), /연결/)
  await assert.rejects(api.lock(token), /연결/)
  mock.mock.restore()
  t.mock.method(globalThis, 'fetch', async () => new Response('private backend details', { status: 500 }))
  await assert.rejects(api.unlock('test-code-only'), error => !error.message.includes('private backend details'))
})
