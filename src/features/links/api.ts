import { workspaceApi } from '@/features/workspace-access/api'

export type SavedLinkFolder = { id: string; parent_id: string | null; name: string; created_at: string }
export type SavedLink = { id: string; folder_id: string; title: string; url: string; content: string; image_url: string; created_at: string; updated_at: string }
export type LinksData = { folders: SavedLinkFolder[]; links: SavedLink[] }
export type LinksAction = 'list' | 'move_folder' | 'create_folder' | 'rename_folder' | 'delete_folder' | 'create_link' | 'update_link' | 'move_link' | 'delete_link'

export async function requestLinks(token: string, action: LinksAction, payload: Record<string, string> = {}): Promise<LinksData> {
  const result = await workspaceApi.rpc('manage_links', { action, payload }, token)
  if (!result || typeof result !== 'object' || !('folders' in result) || !('links' in result) || !Array.isArray(result.folders) || !Array.isArray(result.links)) {
    throw new Error('링크함을 불러오지 못했어요. 다시 시도해 주세요.')
  }
  return result as LinksData
}
