import { workspaceApi } from '@/features/workspace-access/api'

export type NoteFolder = { id: string; parent_id: string | null; name: string; created_at: string }
export type Note = { id: string; folder_id: string; title: string; content: string; created_at: string; updated_at: string }
export type NotesData = { folders: NoteFolder[]; notes: Note[] }
export type NotesAction = 'list' | 'create_folder' | 'rename_folder' | 'delete_folder' | 'create_note' | 'update_note' | 'move_note' | 'delete_note'

export async function requestNotes(token: string, action: NotesAction, payload: Record<string, string> = {}): Promise<NotesData> {
  const result = await workspaceApi.rpc('manage_notes', { action, payload }, token)
  if (!result || typeof result !== 'object' || !('folders' in result) || !('notes' in result) || !Array.isArray(result.folders) || !Array.isArray(result.notes)) {
    throw new Error('메모함을 불러오지 못했어요. 다시 시도해 주세요.')
  }
  return result as NotesData
}
