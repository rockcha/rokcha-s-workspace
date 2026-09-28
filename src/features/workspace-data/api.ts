import { workspaceApi } from '@/features/workspace-access/api'

export async function requestWorkspaceData(token: string, action: string, payload: Record<string, unknown> = {}) {
  const result = await workspaceApi.rpc('manage_workspace_data', { action, payload }, token).catch(cause => {
    const message = cause instanceof Error ? cause.message : '연결 상태를 확인해 주세요.'
    throw new Error(`${action.endsWith('_list') || action === 'memo_get' ? '불러오지 못했어요.' : '저장하지 못했어요.'} ${message}`)
  })
  if (result && typeof result === 'object' && 'error' in result) {
    const messages: Record<string, string> = {
      import_conflict: '서버에 다른 내용의 기록이나 겹치는 수업이 있어요. 가져오기를 취소했으며 브라우저 원본은 그대로 보관돼요. 서버 기록을 확인한 뒤 다시 시도해 주세요.',
      conflict: '다른 곳에서 수정된 기록이에요. 입력 내용을 복사해 두고 새로고침한 뒤 다시 수정해 주세요.',
      overlap: '같은 요일에 시간이 겹치는 수업이 있어요.',
      duplicate: '이 날짜에는 이미 노트가 있어요. 기존 노트를 수정해 주세요.',
    }
    throw new Error(messages[String(result.error)] ?? '저장하지 못했어요.')
  }
  return result
}
