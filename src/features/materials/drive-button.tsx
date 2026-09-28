import { useEffect, useRef, useState } from 'react'
import { HardDrive, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { driveConfigured, openDrivePicker, prepareDrivePicker } from '@/features/materials/drive-picker'
import type { DriveFile } from '@/features/materials/drive-picker'

export function DriveButton({ disabled, onPick, mode = 'browse' }: { disabled: boolean; onPick: (files: DriveFile[]) => void; mode?: 'browse' | 'upload' }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'busy' | 'error'>('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const cleanup = useRef<(() => void) | undefined>(undefined)
  const button = useRef<HTMLButtonElement>(null)
  const pending = useRef(false)
  useEffect(() => {
    if (!driveConfigured) return
    let active = true
    setStatus('loading')
    setError('')
    void prepareDrivePicker().then(() => { if (active) setStatus('ready') }).catch(() => {
      if (active) { setStatus('error'); setError('드라이브 연결을 불러오지 못했어요. 다시 시도해 주세요.') }
    })
    return () => { active = false; cleanup.current?.() }
  }, [attempt])
  return <div className="flex max-w-full flex-col items-start gap-2">
    <Button ref={button} type="button" variant="outline" disabled={disabled || (driveConfigured && (status === 'loading' || status === 'busy'))} onClick={() => {
      if (!driveConfigured) { setError('드라이브 연결 설정 후 개발 서버를 다시 시작해 주세요.'); return }
      if (status === 'error') { setAttempt(value => value + 1); return }
      if (pending.current) return
      pending.current = true
      setError('')
      setStatus('busy')
      cleanup.current = openDrivePicker(onPick, message => {
        pending.current = false
        setStatus('ready')
        setError(message ?? '')
        button.current?.focus()
      }, mode)
    }}>{mode === 'upload' ? <Upload aria-hidden="true" /> : <HardDrive aria-hidden="true" />}{driveConfigured && status === 'loading' ? '드라이브 준비 중…' : status === 'busy' ? '파일 선택 중…' : status === 'error' ? '드라이브 다시 연결' : mode === 'upload' ? '파일 업로드' : '기존 파일 찾기'}</Button>
    {error && <p role="alert" className="max-w-72 text-sm text-destructive">{error}</p>}
  </div>
}
