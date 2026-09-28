import { workspaceApi } from '@/features/workspace-access/api'
export type Material = { drive_id: string; title: string; url: string; description: string; created_at: string; folder_id: string | null }
export type MaterialFolder = { id: string; parent_id: string | null; name: string; created_at: string }
export type MaterialsData = { files: Material[]; folders: MaterialFolder[] }
export type MaterialsAction = 'list' | 'save' | 'delete' | 'create_folder' | 'rename_folder' | 'delete_folder'
export async function requestMaterials(token: string, action: MaterialsAction, payload: Record<string, string> = {}): Promise<MaterialsData> {
  const result = await workspaceApi.rpc('manage_materials', { action, payload }, token)
  if (!result || typeof result !== 'object' || !('files' in result) || !('folders' in result) || !Array.isArray(result.folders) || !result.folders.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && (item.parent_id === null || typeof item.parent_id === 'string')) || !Array.isArray(result.files) || !result.files.every(item => {
    if (!item || !['drive_id', 'title', 'url', 'description', 'created_at'].every(key => typeof item[key] === 'string')) return false
    try { const url = new URL(item.url); return /^[a-zA-Z0-9_-]+$/.test(item.drive_id) && (item.folder_id === null || typeof item.folder_id === 'string') && url.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(url.hostname) && !url.username && !url.password } catch { return false }
  })) throw new Error('자료 목록을 확인할 수 없어요.')
  return result as MaterialsData
}
