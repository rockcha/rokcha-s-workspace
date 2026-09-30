import { workspaceApi } from '@/features/workspace-access/api'
import { validDate } from '@/features/calendar/use-calendar'
import { safeWebUrl } from '@/lib/web-url'

export type CareerLink = { title: string; url: string }
export type CareerEntry = { id: string; revision: number; title: string; date: string; time: string; memo: string; links: CareerLink[] }
export type CareerDraft = Omit<CareerEntry, 'id' | 'revision'>

export function validCareerDraft(value: CareerDraft) {
  return value.title.trim().length > 0 && value.title.length <= 120
    && validDate(value.date) && value.date >= '0001-01-01' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)
    && value.memo.length <= 10000 && value.links.length <= 20
    && value.links.every(link => link.title.trim().length > 0 && link.title.length <= 120 && link.url.length <= 4096 && !!safeWebUrl(link.url))
}

function validEntry(value: unknown): value is CareerEntry {
  if (!value || typeof value !== 'object') return false
  const item = value as CareerEntry
  return typeof item.id === 'string' && Number.isInteger(item.revision) && item.revision > 0
    && typeof item.title === 'string' && typeof item.date === 'string' && typeof item.time === 'string' && typeof item.memo === 'string'
    && Array.isArray(item.links) && item.links.every(link => link && typeof link.title === 'string' && typeof link.url === 'string') && validCareerDraft(item)
}

export async function requestCareerEntries(token: string, action: 'list' | 'save' | 'delete', payload: Record<string, unknown> = {}): Promise<CareerEntry[]> {
  const result = await workspaceApi.rpc('manage_career_entries', { action, payload }, token)
  if (result && typeof result === 'object' && 'error' in result) throw new Error('다른 곳에서 변경된 일정이에요. 입력 내용을 복사해 두고 새로고침해 주세요.')
  if (!Array.isArray(result) || !result.every(validEntry)) throw new Error('취업 일정을 확인하지 못했어요. 다시 불러와 주세요.')
  return result
}
