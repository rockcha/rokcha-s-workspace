import { StickyNote } from 'lucide-react'

const notes = [
  { title: '문득 떠오른 생각', text: '작은 아이디어도 잊기 전에 적어 두기. 완성되지 않은 생각이어도 괜찮아.', category: '아이디어' },
  { title: '이번 주에 하고 싶은 일', text: '책 조금 읽기, 동네 산책하기, 미뤄 둔 책상 정리하기. 하나씩 천천히.', category: '일상' },
  { title: '기억하고 싶은 문장', text: '빠르게 가는 것보다 나만의 속도로 꾸준히 나아가는 것.', category: '기록' },
]

export function NotesPage() {
  return (
    <section aria-labelledby="notes-title">
      <p className="text-xs tracking-widest text-primary">생각을 모으는 곳</p>
      <h1 id="notes-title" className="mt-3 text-3xl tracking-tight">메모함</h1>
      <p className="mt-3 text-sm text-muted-foreground">스쳐 가는 생각과 오래 간직하고 싶은 이야기.</p>
      <div className="mt-10 flex items-center justify-between border-b pb-4 text-sm"><h2>전체 메모 <span className="ml-2 text-muted-foreground">{notes.length}</span></h2><span className="text-xs text-muted-foreground">예시 메모</span></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {notes.map(note => <article key={note.title} className="flex min-h-60 flex-col rounded-xl border bg-card p-6">
          <StickyNote className="size-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <h3 className="mt-5 text-lg">{note.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{note.text}</p>
          <span className="mt-auto pt-6 text-xs text-primary">{note.category}</span>
        </article>)}
      </div>
    </section>
  )
}
