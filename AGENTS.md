# 록차의 작업실 — 작업 지침

## 먼저 읽기
- 프로젝트 실행·명령: [README.md](README.md)
- 파일 구조·의존 방향·확장 규칙: [docs/architecture.md](docs/architecture.md)
- UI·글꼴·알림 재사용: [docs/ui-guide.md](docs/ui-guide.md)

## 프로젝트 기준
- React 19 + TypeScript strict + Vite 7 + Tailwind CSS 4.
- shadcn/ui의 로컬 컴포넌트와 Radix Slot 사용. 설정은 `components.json`.
- 기본 글꼴은 **고운돋움(Gowun Dodum)**. `src/main.tsx`에서 로컬 패키지로 로드.
- 앱 이름은 **록차의 작업실**. `src/config/site.ts`와 `index.html`의 메타데이터를 함께 유지.
- 한국어 사용자 문구, 밝은 배경, 녹차색 포인트. 현재는 라이트 테마만 제공.

## 구현 규칙
- 먼저 기존 UI·레이아웃·유틸리티를 검색하고 재사용한다.
- `components/ui`는 업무 로직 없는 기본 UI, `components/layout`은 공통 화면 뼈대다.
- 페이지는 `pages`, 앱 구성은 `app`, 공통 순수 함수는 `lib`에 둔다.
- 기능이 커질 때만 `features/<feature>`를 만든다. 비어 있는 추상화·범용 래퍼·상태 관리 라이브러리를 미리 만들지 않는다.
- 내부 경로는 `@/` 별칭, 타입은 `import type`, 컴포넌트는 named export를 사용한다.
- 스타일 조합은 `cn()`, 버튼 변형은 기존 `Button`의 `variant`/`size`를 우선한다.
- 색상은 `bg-primary`, `text-muted-foreground` 등 토큰으로 지정한다. 토큰 원본은 `src/styles/globals.css`.
- Sonner의 `toast`를 직접 사용한다. `Toaster`는 `AppProviders`에 단 한 번 둔다.
- 아이콘 전용 버튼은 접근성 이름을 제공하고, 장식 아이콘은 `aria-hidden` 처리한다.
- 클릭 가능한 요소는 실제 button/link를 사용하고 키보드 포커스를 유지한다.
- `.tools`, `dist`, `node_modules`와 잠금 파일 전체를 컨텍스트로 읽지 않는다. 의존 버전은 우선 `package.json`에서 확인한다.
- `.env` 및 인증 정보는 커밋하거나 문서·로그에 노출하지 않는다.

## 변경 후 검증
- `npm run check`: ESLint + TypeScript + 프로덕션 빌드.
- 이 PC의 로컬 Node 사용 시 `powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 run check`.
- UI 변경은 모바일·데스크톱, 키보드 포커스, 토스트 중복 여부를 확인한다.
- 구조나 명령이 바뀌면 관련 문서도 함께 갱신한다.
- 실행하지 못한 검증은 완료했다고 기록하지 않는다.
