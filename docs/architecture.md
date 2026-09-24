# 파일 구조와 확장 기준

```text
src/
  main.tsx                     # React 시작점, 폰트·전역 CSS 로딩
  app/
    app.tsx                    # 앱 조립·해시 주소 기반 화면 전환
    providers.tsx              # 전역 제공자·Toaster 단일 설치
  components/
    layout/
      app-shell.tsx            # 반응형 사이드바·본문·본문 바로가기
    ui/
      button.tsx               # Radix Slot + CVA 버튼
      sonner.tsx               # Sonner 스타일·위치 기본값
      dialog.tsx               # shadcn/Radix 편집 대화상자
      alert-dialog.tsx         # shadcn/Radix 삭제 확인
      input.tsx, textarea.tsx  # 기본 입력 UI
  features/workspace-access/  # 보안코드 검증 API·입장/나가기·세션 검증
  features/notes/             # 폴더·메모 상태, 편집 UI, API
  config/site.ts               # 앱 이름·소개
  lib/utils.ts                 # cn(): clsx + tailwind-merge
  pages/workspace-page.tsx     # 나의 작업실 임시 대시보드
  pages/calendar-page.tsx      # 월간 캘린더
  pages/notes-page.tsx         # 메모함 조립·검증된 세션 전달
  pages/links-page.tsx         # 예시 링크 목록
  styles/globals.css           # Tailwind, 디자인 토큰, 기본 스타일
supabase/                      # 보안코드·세션 함수 설정 SQL 및 롤백 테스트
tests/                         # 인증 API·메모 SQL·브라우저 테스트
playwright.config.ts           # 격리된 브라우저 테스트 서버
docs/                          # 상세 개발 가이드
.github/copilot-instructions.md # Copilot 읽기 시작점
AGENTS.md                      # 에이전트 읽기 시작점
components.json                # shadcn/ui CLI 설정
vite.config.ts                 # React·Tailwind 플러그인, @ 별칭
tsconfig.json                  # strict 타입 검사, @ 별칭
eslint.config.js               # React Hooks·TypeScript 검사
scripts/npm.ps1                # Windows 로컬 Node 실행 지원
```

## 의존 방향

`app → pages → features → components/ui → lib` 방향을 유지합니다. 공통 레이아웃은 `app`에서 조립합니다. `components/ui`가 페이지나 업무 기능을 import해서는 안 됩니다. `config`는 하위 계층에서도 참조할 수 있는 정적 설정입니다.

## 새 기능을 넣을 때

1. 단순한 화면은 `pages/<name>-page.tsx`에 작성합니다.
2. 기능의 상태·API·컴포넌트가 생기면 `features/<name>/` 아래에 가까이 둡니다.
3. 여러 기능에서 실제로 재사용하는 UI만 `components`로 올립니다. 공통 훅이 생길 때 `hooks/`를 만듭니다.
4. 한 화면 안에서만 쓰는 데이터·헬퍼를 무조건 공통 폴더로 옮기지 않습니다.
5. 현재 네 화면은 app.tsx의 해시 주소 구독으로 전환합니다. 중첩 경로 등 복잡한 탐색이 필요해지면 라우터를 도입합니다.

## 자주 수정하는 위치

| 작업 | 파일 |
| --- | --- |
| 브랜드 이름·설명 | `src/config/site.ts`, `index.html` |
| 사이드바·메뉴 | `src/components/layout/app-shell.tsx` |
| 본문 폭·전체 레이아웃 | `src/components/layout/app-shell.tsx` |
| 색·글꼴·모서리 토큰 | `src/styles/globals.css` |
| 토스트 위치·공통 설정 | `src/components/ui/sonner.tsx` |
| 전역 라이브러리 연결 | `src/app/providers.tsx` |

패키지 관리는 npm과 `package-lock.json`을 사용합니다. 의존성을 변경할 때 잠금 파일도 갱신하고, 재설치는 `npm ci`로 동일 버전을 사용합니다.


보안코드 접근은 `app`에서 `WorkspaceAccess`로 전체 작업실을 감쌉니다. `features/workspace-access/api.ts`가 Supabase Data API의 세 RPC를 호출합니다. 세션은 서버에서 검증하며 화면 상태만으로 접속을 허용하지 않습니다. 데이터 테이블을 추가할 때의 RLS 규칙은 `docs/supabase.md`를 따릅니다.

메모함은 `WorkspaceAccess`가 검증한 메모리 세션을 render prop으로 받아 사용합니다. `features/notes/api.ts`는 기존 RPC 전송 함수를 재사용하고 `manage_notes`를 호출합니다. `supabase/notes.sql`은 parent_id로 연결되는 중첩 폴더 구조, 폴더 삭제 시 모든 하위 폴더와 메모 연쇄 삭제, 세션 기반 RLS를 정의합니다. 폴더 위치는 생성 시 최상위 또는 기존 폴더로 지정합니다. API 권한은 폴더 ID 직접 지정과 상위 폴더 변경을 막아 순환 계층을 방지합니다. 폴더 경로는 features/notes/folder-tree.ts에서 구성하며 선택한 폴더의 필터는 하위 폴더도 포함합니다. 쓰기와 최신 목록 반환은 하나의 DB 트랜잭션이며 화면은 성공 응답 이후 갱신합니다. 최신순은 작성일 내림차순이고 수정·이동은 작성일을 바꾸지 않습니다.

`npm test`는 PGlite에서 실제 메모 SQL을 실행해 CRUD·정렬·제약·RLS를 검사합니다. `npm run test:ui`는 Playwright가 별도 Vite 서버를 열고 테스트 API 요청을 같은 SQL 엔진에 연결합니다. 세션 검증만 모의 처리하며 운영 Supabase에는 접근하지 않습니다.

