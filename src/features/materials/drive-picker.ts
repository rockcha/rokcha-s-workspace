export type DriveFile = { id: string; title: string; url: string }
type UploadView = { setIncludeFolders(value: boolean): UploadView }
type TokenResponse = { access_token?: string; error?: string; scope?: string }
type PickerResponse = { action: string; docs?: { id?: string; name?: string; url?: string }[] }
type Picker = { setVisible: (visible: boolean) => void; dispose: () => void }
interface PickerBuilder {
  addView(view: string | UploadView): PickerBuilder
  setOAuthToken(token: string): PickerBuilder
  setDeveloperKey(key: string): PickerBuilder
  setAppId(id: string): PickerBuilder
  setOrigin(origin: string): PickerBuilder
  setLocale(locale: string): PickerBuilder
  setSize(width: number, height: number): PickerBuilder
  setCallback(callback: (response: PickerResponse) => void): PickerBuilder
  build(): Picker
}
type GoogleSdk = {
  accounts: { oauth2: {
    initTokenClient(config: { client_id: string; scope: string; include_granted_scopes: boolean; callback: (response: TokenResponse) => void; error_callback: (error: { type: string }) => void }): { requestAccessToken: (options: { prompt: string }) => void }
    hasGrantedAllScopes(response: TokenResponse, scope: string): boolean
  } }
  picker: { PickerBuilder: new () => PickerBuilder; DocsUploadView: new () => UploadView; ViewId: { DOCS: string } }
}
type GoogleWindow = Window & { google?: GoogleSdk; gapi?: { load(name: string, options: { callback: () => void; onerror: () => void; timeout: number; ontimeout: () => void }): void } }
const googleWindow = () => window as GoogleWindow
const scope = 'https://www.googleapis.com/auth/drive.file'
const config = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim(),
  appId: import.meta.env.VITE_GOOGLE_APP_ID?.trim(),
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY?.trim(),
}
export const driveConfigured = Boolean(config.clientId && config.appId && config.apiKey)
let ready: Promise<void> | undefined

function loadScript(src: string, available: () => boolean) {
  if (available()) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const finish = (failed: boolean) => {
      clearTimeout(timer)
      script.onload = script.onerror = null
      if (failed) { script.remove(); reject(new Error('드라이브 연결을 불러오지 못했어요. 다시 시도해 주세요.')) }
      else resolve()
    }
    const timer = setTimeout(() => finish(true), 15_000)
    script.src = src
    script.async = true
    script.onload = () => finish(!available())
    script.onerror = () => finish(true)
    document.head.append(script)
  })
}

export function prepareDrivePicker() {
  if (!ready) ready = Promise.all([
    loadScript('https://accounts.google.com/gsi/client', () => Boolean(googleWindow().google?.accounts?.oauth2)),
    loadScript('https://apis.google.com/js/api.js', () => Boolean(googleWindow().gapi)),
  ]).then(() => new Promise<void>((resolve, reject) => {
    const fail = () => reject(new Error('드라이브 파일 선택창을 불러오지 못했어요.'))
    googleWindow().gapi!.load('picker', { callback: resolve, onerror: fail, timeout: 15_000, ontimeout: fail })
  })).catch(error => { ready = undefined; throw error })
  return ready
}

// Call synchronously from the button click so browsers allow the OAuth popup.
export function openDrivePicker(onPick: (files: DriveFile[]) => void, onFinish: (error?: string) => void, mode: 'browse' | 'upload' = 'browse') {
  let active = true
  let picker: Picker | undefined
  const finish = (error?: string) => {
    if (!active) return
    active = false
    picker?.dispose()
    onFinish(error)
  }
  try {
    const google = googleWindow().google!
    const client = google.accounts.oauth2.initTokenClient({
      client_id: config.clientId!, scope, include_granted_scopes: false,
      error_callback: error => finish(error.type === 'popup_closed' ? undefined : '구글 로그인 창을 열지 못했어요. 팝업 허용 후 다시 시도해 주세요.'),
      callback: response => {
        if (!active) return
        if (response.error || !response.access_token || !google.accounts.oauth2.hasGrantedAllScopes(response, scope)) {
          finish('드라이브 파일을 선택하려면 구글 접근 권한을 허용해 주세요.')
          return
        }
        try {
          picker = new google.picker.PickerBuilder()
            .addView(mode === 'upload' ? new google.picker.DocsUploadView().setIncludeFolders(true) : google.picker.ViewId.DOCS)
            .setOAuthToken(response.access_token)
            .setDeveloperKey(config.apiKey!)
            .setAppId(config.appId!)
            .setOrigin(window.location.origin)
            .setLocale('ko')
            .setSize(Math.min(900, window.innerWidth - 24), Math.min(600, window.innerHeight - 40))
            .setCallback(result => {
              if (!active) return
              if (result.action === 'cancel') { finish(); return }
              if (result.action !== 'picked') return
              try {
                if (!result.docs?.length) throw new Error('empty_selection')
                const files = result.docs.map(file => {
                if (!file?.id || !/^[a-zA-Z0-9_-]+$/.test(file.id)) throw new Error('invalid_id')
                const url = new URL(file.url || `https://drive.google.com/file/d/${file.id}/view`)
                if (url.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(url.hostname) || url.username || url.password || !file?.name?.trim()) throw new Error('invalid_file')
                  return { id: file.id, title: file.name.trim().slice(0, 120), url: url.href }
                })
                finish()
                onPick(files)
              } catch { finish('선택한 파일의 주소를 확인할 수 없어요. 다른 파일을 선택해 주세요.') }
            }).build()
          picker.setVisible(true)
        } catch { finish('파일 선택창을 열지 못했어요. 연결 설정을 확인해 주세요.') }
      },
    })
    client.requestAccessToken({ prompt: 'select_account' })
  } catch { finish('드라이브 연결을 시작하지 못했어요. 다시 시도해 주세요.') }
  return () => { active = false; picker?.dispose() }
}
