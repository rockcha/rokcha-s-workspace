import { workspaceApi } from '@/features/workspace-access/api'

export type Transcription = { id: string; title: string; content: string; created_at: string; revision: number }

export async function requestTranscriptions(token: string, action: 'list' | 'save' | 'delete', payload: Record<string, unknown> = {}): Promise<Transcription[]> {
  const result = await workspaceApi.rpc('manage_transcriptions', { action, payload }, token)
  if (result && typeof result === 'object' && 'error' in result) throw new Error('다른 곳에서 변경된 필사예요. 입력 내용을 복사해 두고 새로고침해 주세요.')
  if (!Array.isArray(result) || !result.every((item: Transcription) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.content === 'string' && typeof item.created_at === 'string' && Number.isFinite(Date.parse(item.created_at)) && Number.isInteger(item.revision) && item.revision > 0)) {
    throw new Error('필사 목록을 확인하지 못했어요. 다시 불러와 주세요.')
  }
  return result
}
