# UI 재사용 가이드

## 기본 디자인

- 모든 화면과 토스트의 기본 글꼴은 고운돋움(`Gowun Dodum`)입니다. 400 굵기의 폰트를 `main.tsx`에서 한 번 로드합니다.
- Tailwind v4의 CSS 기반 설정을 사용합니다. `tailwind.config.js`나 PostCSS 설정 파일은 필요하지 않습니다.
- 색·간격은 Tailwind 클래스를, 테마 색은 `globals.css`의 CSS 변수를 사용합니다.
- `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`를 우선합니다.
- 현재 라이트 테마만 구현했습니다. 다크 테마 도입 시 CSS 토큰과 Sonner의 `theme`을 함께 연결하세요.

## 버튼과 스타일 조합

```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

<Button>저장</Button>
<Button variant="outline" size="sm">취소</Button>
<Button asChild><a href="/">작업실로</a></Button>
<div className={cn('rounded-lg border', className)} />
```

버튼의 종류는 `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`입니다. 크기는 `default`, `sm`, `lg`, `icon`입니다. 폼 안에서 제출하지 않는 버튼은 `type="button"`을 명시합니다.

## Sonner

```tsx
import { toast } from 'sonner'

toast.success('저장했어요.')
toast.error('저장하지 못했어요.', { description: '잠시 후 다시 시도해 주세요.' })
toast.info('새로운 알림이 있어요.')

// 실제 비동기 저장 함수가 있을 때:
toast.promise(saveChanges(), {
  loading: '저장 중이에요…',
  success: '저장했어요.',
  error: '저장하지 못했어요.',
})
```

`Toaster`는 `app/providers.tsx`에 이미 설치되어 있습니다. 페이지마다 추가하지 마세요. 실제 성공·실패 결과가 확정되는 이벤트에서 알림을 호출하고, 렌더 중 호출하지 않습니다.

## shadcn/ui 컴포넌트 추가

기존 버튼·Sonner는 프로젝트 디자인에 맞게 조정한 로컬 소스입니다. 필요한 UI만 CLI로 추가하세요.

```sh
npx shadcn@latest add dialog input label
```

현재 PC의 로컬 Node를 쓴다면:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 exec -- shadcn@latest add dialog input label
```

`components.json`에 경로와 스타일이 지정되어 있습니다. CLI 실행 후 기존 토큰·글꼴·컴포넌트 변경 내용을 검토하고 `npm run check`를 실행하세요. 기존 파일을 덮어쓰는 `--overwrite`는 수정 사항을 확인한 뒤에만 사용합니다.

## 화면 확인

- 320px 모바일부터 데스크톱까지 가로 넘침이 없는지 확인합니다.
- Tab으로 본문 바로가기·브랜드 링크·버튼을 이동할 수 있어야 합니다.
- 네 메뉴의 화면 전환·선택 표시와 브라우저 뒤로 가기를 확인합니다. 캘린더의 이전 달·다음 달·오늘 버튼을 확인합니다.
- Toaster는 AppProviders에 한 번만 유지합니다. 작업실 나가기 실패 시 고정 ID의 토스트를 호출하여 중복을 방지합니다. 보안코드 오류는 폼 안에서 안내합니다.
- 글꼴 요청이 앱 자산에서 로드되는지 확인합니다.


