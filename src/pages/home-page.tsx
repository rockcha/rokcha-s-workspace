import { ArrowUpRight, Sprout } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/config/site'

export function HomePage() {
  return (
    <section aria-labelledby="welcome-title" className="max-w-2xl">
      <p className="mb-5 text-xs tracking-[0.22em] text-primary">ROKCHA’S WORKSPACE</p>
      <h1 id="welcome-title" className="text-4xl leading-snug tracking-tight sm:text-5xl">작은 생각이<br />자라나는 곳.</h1>
      <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">{siteConfig.description}</p>
      <div className="mt-12 rounded-2xl border bg-card p-6 sm:p-8">
        <Sprout className="mb-5 size-7 text-primary" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-xl">새로운 시작을 위한 빈 페이지</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">떠오른 아이디어도, 만들고 싶은 무언가도.<br />이곳에 하나씩 채워 나가요.</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => toast.success('반가워요, 록차의 작업실입니다.', { description: '새로운 이야기를 시작할 준비가 되었어요.' })}
        >
          알림 확인하기 <ArrowUpRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}
