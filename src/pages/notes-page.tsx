import { NotesManager } from '@/features/notes/notes-manager'

export function NotesPage({ token, folderId }: { token: string; folderId: string }) {
  return <NotesManager key={token} token={token} folderId={folderId} />
}
