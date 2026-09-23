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

헤더 이름은 `src/config/site.ts`, 브라우저 제목은 `index.html`, 첫 화면은 `src/pages/home-page.tsx`에서 수정합니다. 기본 화면의 **알림 확인하기** 버튼으로 Sonner를 확인할 수 있습니다.

## 구현 범위

공통 헤더·푸터·반응형 시작 화면과 토스트 예제를 제공합니다. 라우터, 인증, 서버 API, 저장 기능은 아직 추가하지 않았습니다. 글꼴은 `@fontsource/gowun-dodum`에서 번들링하므로 실행 시 Google Fonts 요청이 필요하지 않습니다.

설정 참고: [shadcn/ui Vite 설치](https://ui.shadcn.com/docs/installation/vite), [Tailwind Vite 연동](https://tailwindcss.com/docs/installation/using-vite), [Sonner](https://sonner.emilkowal.ski/).
