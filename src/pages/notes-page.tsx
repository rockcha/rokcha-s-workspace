import { NotesManager } from '@/features/notes/notes-manager'

export function NotesPage({ token }: { token: string }) {
  return <NotesManager key={token} token={token} />
}