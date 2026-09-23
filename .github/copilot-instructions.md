# GitHub Copilot 프로젝트 컨텍스트

이 저장소의 공통 규칙은 [AGENTS.md](../AGENTS.md)를 기준으로 한다.
작업 전 [구조 가이드](../docs/architecture.md)와 [UI 가이드](../docs/ui-guide.md)를 읽는다.

- React + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui + Sonner 프로젝트다.
- 사용자 문구는 한국어, 앱 이름은 `록차의 작업실`, 글꼴은 `Gowun Dodum`이다.
- `@/components/ui`의 기본 UI, `@/components/layout`의 공통 레이아웃을 재사용한다.
- 공통 이름·설정은 `src/config/site.ts`, 스타일 토큰은 `src/styles/globals.css`에서 관리한다.
- 토스트는 `import { toast } from 'sonner'`. `Toaster`를 페이지에 추가하지 않는다.
- 과도한 추상화 없이 기존 구조를 따른다. 구체적인 의존 방향은 구조 가이드가 기준이다.
- 변경 후 `npm run check`를 실행하고 구조가 달라지면 문서도 수정한다.
