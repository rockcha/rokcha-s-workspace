import { useState } from 'react'
import { ArrowUpRight, FolderInput, Link2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SavedLink } from '@/features/links/api'
import { safeWebUrl } from '@/features/links/preview'

export function LinkCard({ link, onEdit, onMove, onDelete }: { link: SavedLink; onEdit: () => void; onMove: () => void; onDelete: () => void }) {
  const [failedImage, setFailedImage] = useState('')
  const url = safeWebUrl(link.url)
  const image = safeWebUrl(link.image_url)
  const domain = url ? new URL(url).hostname : '주소를 확인해 주세요'
  return (
    <li className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <a href={url ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={link.title + ' (새 탭)'} className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b bg-gradient-to-br from-secondary via-accent/40 to-background">
          {image && failedImage !== image ? <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105" onError={() => setFailedImage(image)} /> : <div className="flex flex-col items-center gap-3 px-5 text-primary"><span className="rounded-2xl border border-primary/10 bg-card/80 p-4"><Link2 className="size-7" strokeWidth={1.3} aria-hidden="true" /></span><span className="max-w-full truncate text-xs">{domain}</span></div>}
          <span className="absolute right-3 top-3 rounded-full border bg-card/90 p-1.5 text-primary"><ArrowUpRight className="size-4" aria-hidden="true" /></span>
        </div>
        <div className="min-w-0 flex-1 p-4"><p className="truncate text-xs text-primary">{domain}</p><h3 className="mt-2 break-words text-base">{link.title}</h3>{link.content && <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">{link.content}</p>}</div>
      </a>
      <div className="flex items-center justify-end gap-1 border-t px-3 py-2">
        <div className="flex shrink-0">
          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={link.title + ' 수정'} onClick={onEdit}><Pencil aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={link.title + ' 폴더 이동'} onClick={onMove}><FolderInput aria-hidden="true" /></Button>
          <Button type="button" variant="destructive-ghost" size="icon" className="size-8" aria-label={link.title + ' 삭제'} onClick={onDelete}><Trash2 aria-hidden="true" /></Button>
        </div>
      </div>
    </li>
  )
}
