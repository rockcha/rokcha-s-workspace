# 파일 구조와 확장 기준

```text
src/
  main.tsx                     # React 시작점, 폰트·전역 CSS 로딩
  app/
    app.tsx                    # 앱 조립
    providers.tsx              # 전역 제공자·Toaster 단일 설치
  components/
    layout/
      app-shell.tsx            # 헤더·본문·푸터·본문 바로가기
      site-header.tsx          # 브랜드 헤더
    ui/
      button.tsx               # Radix Slot + CVA 버튼
      sonner.tsx               # Sonner 스타일·위치 기본값
  config/site.ts               # 앱 이름·소개
  lib/utils.ts                 # cn(): clsx + tailwind-merge
  pages/home-page.tsx          # 시작 화면 구성·토스트 예제
  styles/globals.css           # Tailwind, 디자인 토큰, 기본 스타일
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

`app → pages → features(추후) → components/ui → lib` 방향을 유지합니다. 공통 레이아웃은 `app`에서 조립합니다. `components/ui`가 페이지나 업무 기능을 import해서는 안 됩니다. `config`는 하위 계층에서도 참조할 수 있는 정적 설정입니다.

## 새 기능을 넣을 때

1. 단순한 화면은 `pages/<name>-page.tsx`에 작성합니다.
2. 기능의 상태·API·컴포넌트가 생기면 `features/<name>/` 아래에 가까이 둡니다.
3. 여러 기능에서 실제로 재사용하는 UI만 `components`로 올립니다. 공통 훅이 생길 때 `hooks/`를 만듭니다.
4. 한 화면 안에서만 쓰는 데이터·헬퍼를 무조건 공통 폴더로 옮기지 않습니다.
5. 여러 경로가 필요한 시점에 라우터를 도입합니다. 지금은 단일 화면입니다.

## 자주 수정하는 위치

| 작업 | 파일 |
| --- | --- |
| 브랜드 이름·설명 | `src/config/site.ts`, `index.html` |
| 공통 헤더 | `src/components/layout/site-header.tsx` |
| 본문 폭·전체 레이아웃 | `src/components/layout/app-shell.tsx` |
| 색·글꼴·모서리 토큰 | `src/styles/globals.css` |
| 토스트 위치·공통 설정 | `src/components/ui/sonner.tsx` |
| 전역 라이브러리 연결 | `src/app/providers.tsx` |

패키지 관리는 npm과 `package-lock.json`을 사용합니다. 의존성을 변경할 때 잠금 파일도 갱신하고, 재설치는 `npm ci`로 동일 버전을 사용합니다.
