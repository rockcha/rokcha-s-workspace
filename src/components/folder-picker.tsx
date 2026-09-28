import { useState } from 'react'
import { ChevronRight, Folder, FolderOpen } from 'lucide-react'
import type { FolderEntry } from '@/lib/folder-tree'
import { cn } from '@/lib/utils'

export function FolderPicker({ folders, value, onChange, allowRoot = true, label = '폴더 위치' }: { folders: FolderEntry[]; value: string; onChange: (id: string) => void; allowRoot?: boolean; label?: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  function branch(parent: string | null) {
    return <ul className={parent ? 'ml-3 border-l pl-2' : ''}>
      {folders.filter(folder => (folder.parent_id ?? null) === parent).map(folder => {
        const hasChildren = folders.some(child => child.parent_id === folder.id)
        const expanded = !collapsed.has(folder.id)
        return <li key={folder.id}>
          <div className="flex min-w-0 items-center gap-1">
            {hasChildren ? <button type="button" aria-label={`${folder.name} ${expanded ? '접기' : '펼치기'}`} aria-expanded={expanded} className="shrink-0 rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next })}><ChevronRight className={cn('size-4', expanded && 'rotate-90')} aria-hidden="true" /></button> : <span className="w-6 shrink-0" />}
            <button type="button" aria-pressed={value === folder.id} onClick={() => onChange(folder.id)} className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', value === folder.id && 'bg-accent text-primary')}><Folder className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="break-all">{folder.name}</span></button>
          </div>
          {hasChildren && expanded && branch(folder.id)}
        </li>
      })}
    </ul>
  }
  return <div role="group" aria-label={label} className="max-h-60 overflow-auto rounded-md border bg-card p-2">
    {allowRoot && <button type="button" aria-pressed={!value} onClick={() => onChange('')} className={cn('flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', !value && 'bg-accent text-primary')}><FolderOpen className="size-4" aria-hidden="true" />최상위</button>}
    {branch(null)}
  </div>
}
