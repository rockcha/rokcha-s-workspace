# 록차의 작업실

React · TypeScript · Vite 기반 작업실의 시작 화면입니다. Tailwind CSS 4, shadcn/ui 방식의 로컬 UI, Sonner 알림과 고운돋움 글꼴을 구성했습니다.

## 실행

Node.js 22.12 이상(LTS 권장)과 npm을 사용합니다.

```sh
npm ci
npm run dev
```

이 작업 환경에는 시스템 Node가 없어 `.tools/`에 공식 Node LTS를 준비했습니다. 현재 PC에서는 다음 명령으로 실행할 수 있습니다.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 run dev
```

터미널에 표시되는 로컬 주소를 엽니다(기본 `http://localhost:5173`). `.tools/`는 Git에 포함되지 않으므로 다른 PC에서는 Node.js를 설치하세요.

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run check` | 린트 + 타입 검사 + 빌드 |
| `npm run typecheck` | 타입 검사 |
| `npm run build` | `dist/`에 배포용 정적 파일 생성 |
| `npm run preview` | 빌드 결과 로컬 미리보기 |

로컬 Node를 사용하는 경우 `npm` 대신 `powershell -ExecutionPolicy Bypass -File scripts/npm.ps1`을 사용합니다.

## 문서

- [AGENTS.md](AGENTS.md): Codex 등 에이전트 작업 규칙
- [.github/copilot-instructions.md](.github/copilot-instructions.md): Copilot 컨텍스트
- [docs/architecture.md](docs/architecture.md): 구조·의존성·확장 기준
- [docs/ui-guide.md](docs/ui-guide.md): 디자인 토큰·UI 재사용·토스트

앱 이름은 `src/config/site.ts`, 브라우저 제목은 `index.html`, 사이드바는 `src/components/layout/app-shell.tsx`에서 수정합니다. 각 화면은 `src/pages/`에 있습니다.

## Supabase 연결

설정은 [Supabase 연결 가이드](docs/supabase.md)를 따릅니다. `.env.example`을 참고해 `.env.local`을 저장하고, [설정 SQL](supabase/workspace-access.sql)의 보안코드를 바꿔 Supabase SQL Editor에서 실행합니다. 코드와 서버용 비밀 키는 프런트엔드 환경 변수에 넣지 않습니다.

## 구현 범위

Lucide 아이콘 사이드바와 나의 작업실·캘린더·메모함·링크함을 제공합니다. 기본 진입 화면은 나의 작업실이며 오늘 일정·다가오는 일정·메모의 임시 안내와 관련 화면 이동 링크가 있습니다. 해시 주소(`#/workspace`, `#/calendar`, `#/notes`, `#/links`)로 화면을 전환하며 새로고침과 뒤로 가기를 지원합니다. 모바일에서는 메뉴가 상단에 배치되며 좁은 화면에서는 두 열로 표시됩니다. 캘린더는 월 이동·오늘 표시를 지원하며, 메모와 링크는 예시 데이터입니다. Supabase 보안코드 검증과 만료되는 접속 세션, 작업실 나가기를 제공합니다. 메모·일정·링크의 작성·저장은 아직 추가하지 않았습니다. 글꼴은 `@fontsource/gowun-dodum`에서 번들링하므로 실행 시 Google Fonts 요청이 필요하지 않습니다.

설정 참고: [shadcn/ui Vite 설치](https://ui.shadcn.com/docs/installation/vite), [Tailwind Vite 연동](https://tailwindcss.com/docs/installation/using-vite), [Sonner](https://sonner.emilkowal.ski/).


