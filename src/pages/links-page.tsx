import { ArrowUpRight, Link2 } from 'lucide-react'

const links = [
  { title: 'Lucide', description: '간결한 아이콘이 필요할 때', url: 'https://lucide.dev', domain: 'lucide.dev', category: '디자인' },
  { title: 'React', description: '화면을 만드는 작은 단위들', url: 'https://react.dev', domain: 'react.dev', category: '개발' },
  { title: 'Tailwind CSS', description: '스타일을 차근차근 쌓아 가기', url: 'https://tailwindcss.com', domain: 'tailwindcss.com', category: '개발' },
]

export function LinksPage() {
  return (
    <section aria-labelledby="links-title">
      <p className="text-xs tracking-widest text-primary">다시 찾고 싶은 곳</p>
      <h1 id="links-title" className="mt-3 text-3xl tracking-tight">링크함</h1>
      <p className="mt-3 text-sm text-muted-foreground">유용한 자료와 영감을 주는 페이지를 한곳에.</p>
      <div className="mt-10 flex items-center justify-between border-b pb-4 text-sm"><h2>전체 링크 <span className="ml-2 text-muted-foreground">{links.length}</span></h2><span className="text-xs text-muted-foreground">예시 링크 · 새 탭으로 열기</span></div>
      <div className="mt-5 overflow-hidden rounded-xl border bg-card">
        {links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" aria-label={`${link.title} (새 탭)`} className="flex items-center gap-4 border-b p-5 transition-colors last:border-b-0 hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:p-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Link2 className="size-5" strokeWidth={1.5} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><h3>{link.title}</h3><p className="mt-1 text-sm text-muted-foreground">{link.description}</p><p className="mt-2 text-xs text-muted-foreground">{link.domain}</p></div>
          <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground sm:block">{link.category}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </a>)}
      </div>
    </section>
  )
}
