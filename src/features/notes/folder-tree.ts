import type { NoteFolder } from '@/features/notes/api'

export type FolderEntry = NoteFolder & { depth: number; path: string; ancestors: string[] }

export function buildFolderTree(folders: NoteFolder[]): FolderEntry[] {
  const children = new Map<string | null, NoteFolder[]>()
  for (const folder of folders) {
    const parent = folder.parent_id ?? null
    children.set(parent, [...(children.get(parent) ?? []), folder])
  }
  const result: FolderEntry[] = []
  function visit(parent: string | null, ancestors: string[], names: string[]) {
    for (const folder of children.get(parent) ?? []) {
      const path = [...names, folder.name]
      result.push({ ...folder, depth: ancestors.length, path: path.join(' / '), ancestors })
      visit(folder.id, [...ancestors, folder.id], path)
    }
  }
  visit(null, [], [])
  return result
}
