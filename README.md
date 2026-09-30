# 록차의 작업실

필사함(`#/transcriptions`)은 링크함 아래에 있습니다. 제목·내용을 작성하고 최신순 목록에서 상세 보기·수정·삭제할 수 있으며 작성일은 자동 기록됩니다. 사용 전 [필사함 SQL](supabase/transcriptions.sql) 전체를 Supabase SQL Editor에서 한 번 실행하세요.

영단어 공부방(`#/vocabulary`)은 단어·품사별 여러 뜻을 저장하고 수정·삭제합니다. 검색은 영단어만 대상으로 하며, 단어 가리기 모드를 켜면 선택한 단어의 뜻도 숨깁니다. 새 기능을 사용하기 전에 [단어장 SQL](supabase/vocabulary.sql)을 Supabase SQL Editor에서 한 번 실행하세요.

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
| `npm test` | 인증 API 및 메모 SQL 테스트 |
| `npm run test:ui` | 작업실 전체 브라우저 테스트 |

로컬 Node를 사용하는 경우 `npm` 대신 `powershell -ExecutionPolicy Bypass -File scripts/npm.ps1`을 사용합니다.

## 문서

- [AGENTS.md](AGENTS.md): Codex 등 에이전트 작업 규칙
- [.github/copilot-instructions.md](.github/copilot-instructions.md): Copilot 컨텍스트
- [docs/architecture.md](docs/architecture.md): 구조·의존성·확장 기준
- [docs/ui-guide.md](docs/ui-guide.md): 디자인 토큰·UI 재사용·토스트

앱 이름은 `src/config/site.ts`, 브라우저 제목은 `index.html`, 사이드바는 `src/components/layout/app-shell.tsx`에서 수정합니다. 각 화면은 `src/pages/`에 있습니다.

## Supabase 연결

설정은 [Supabase 연결 가이드](docs/supabase.md)를 따릅니다. `.env.example`을 참고해 `.env.local`을 저장하고, [설정 SQL](supabase/workspace-access.sql)의 보안코드를 바꿔 Supabase SQL Editor에서 실행합니다. 코드와 서버용 비밀 키는 프런트엔드 환경 변수에 넣지 않습니다.

메모함은 이어서 [메모 테이블 SQL](supabase/notes.sql)을 실행합니다. 폴더·메모 테이블과 접속 세션 기반 접근 정책을 만들고, 폴더가 없을 때 `임시 폴더` 하나를 추가합니다. 기존에 접속 설정을 마쳤다면 `notes.sql`만 추가로 실행하면 됩니다.

링크함은 [링크 테이블 SQL](supabase/links.sql)을 추가로 실행합니다. 메모함과 별도의 폴더·링크 데이터를 저장합니다. 미리보기 가져오기는 사이트가 브라우저 조회를 허용하는 경우 동작하며, 이미지 주소 직접 입력과 이미지 없는 기본 카드도 지원합니다.

## 구현 범위

캘린더는 [대한민국의 공휴일](https://github.com/hyunbinseo/holidays-kr)의 공개 JSON을 조회해 공휴일·대체공휴일의 날짜 숫자와 이름을 빨간색으로 표시합니다. 별도 API 키나 SQL 설정은 필요 없습니다. 제공된 연도만 표시하며, 미제공 연도와 조회 실패는 안내합니다.

날씨 메뉴(`#/weather`)에서는 서울 등 주요 지역의 현재 날씨, 강수량·강수 확률, 미세먼지·초미세먼지 예측 농도와 시간대별·5일 예보를 확인합니다. [Open-Meteo](https://open-meteo.com/en/docs)와 [CAMS 대기질](https://open-meteo.com/en/docs/air-quality-api)을 사용하며 개인 비상업용 무료 API에는 별도 환경변수가 필요 없습니다. 도시 선택은 이 브라우저에 기억하며 현재 위치 버튼도 지원합니다. 위치 좌표는 메모리에만 보관합니다. 미세먼지는 국내 농도 구간에 따른 참고 등급을 표시하고, 캘린더에도 같은 위치의 최대 16일 날씨 이모지를 표시합니다. 모델 예보이며 관측소 실측값과 차이가 있을 수 있습니다.

메모함의 메모 추가·카드 클릭은 넓은 상세 편집 페이지로 연결됩니다. 제목·내용·폴더를 수정하고 저장하면 해당 폴더로 돌아갑니다. 캘린더 상단 ‘일정 추가’ 버튼에서는 원하는 날짜와 시간을 선택해 바로 일정을 등록할 수 있습니다.

페이지 제목과 같은 이모지 사이드바와 나의 작업실·캘린더·메모함·링크함을 제공합니다. 기본 진입 화면은 나의 작업실이며 왼쪽에 오늘 일정·노트와 다가오는 일정 D-day를 쌓고, 오른쪽에 절반 너비의 긴 작업실 메모장을 배치합니다. 메모함과 별개인 단일 메모로, 모든 페이지의 오른쪽 아래 플로팅 버튼에서 이어서 작성하고 이모지를 추가할 수 있습니다. Supabase에 자동 저장되며 다른 기기에서도 불러올 수 있습니다. 해시 주소(`#/workspace`, `#/calendar`, `#/notes`, `#/links`)로 화면을 전환하며 새로고침과 뒤로 가기를 지원합니다. 모바일에서는 메뉴가 상단에 배치되며 좁은 화면에서는 두 열로 표시됩니다. 캘린더는 월 이동·오늘 표시를 지원합니다. 링크함은 폴더별 저장·수정·이동·삭제와 이미지 카드를 지원하며 클릭하면 새 탭으로 열립니다. 메모함은 Supabase에 폴더와 메모를 저장하며, 위치를 지정한 하위 폴더 추가·이름 수정·삭제, 메모 작성·수정·이동·삭제를 지원합니다. 최상위에서는 폴더만 표시하고, 폴더를 클릭하면 바로 아래 하위 폴더와 해당 폴더의 메모를 표시합니다. 상단 경로로 상위 폴더에 돌아가며, 새 폴더 위치는 접고 펼치는 폴더 트리에서 선택합니다. 폴더를 삭제하면 그 안의 메모도 삭제되므로 shadcn Alert Dialog에서 먼저 확인합니다. Supabase 보안코드 검증과 만료되는 접속 세션, 작업실 나가기를 제공합니다. 캘린더 날짜 칸에서 날짜 상세 화면으로 이동하여 시간 지정 일정 여러 개와 하루 한 장의 노트를 추가·수정·삭제할 수 있습니다. 작업실의 오늘 목록은 시간 지정 일정, 종일 일정, 노트 순서이며 내용이 길면 카드 안에서 스크롤합니다. 일정과 날짜별 노트는 Supabase에 저장됩니다. 플로팅 메모장은 작업실 메모 제목·아이콘이 있는 헤더를 드래그하거나 제목에 포커스를 두고 방향키로 옮길 수 있습니다. 글꼴은 `@fontsource/gowun-dodum`에서 번들링하므로 실행 시 Google Fonts 요청이 필요하지 않습니다.

브라우저 테스트는 처음 한 번 `npm exec -- playwright install chromium`으로 브라우저를 설치한 뒤 실행합니다. 별도 로컬 서버와 PGlite 테스트 DB를 사용하며 실제 Supabase 데이터를 변경하지 않습니다.

설정 참고: [shadcn/ui Vite 설치](https://ui.shadcn.com/docs/installation/vite), [Tailwind Vite 연동](https://tailwindcss.com/docs/installation/using-vite), [Sonner](https://sonner.emilkowal.ski/).



수업 시간표(#/timetable)는 월요일부터 일요일까지 반복되는 수업을 색상별 시간 블록으로 보여줍니다. 수업 이름·메모·여러 요일·시작 및 종료 시간·색상을 추가·수정·삭제할 수 있으며 Supabase에 저장됩니다.

일정·날짜별 노트·시간표·작업실 메모를 사용하려면 [작업실 데이터 SQL](supabase/workspace-data.sql)을 Supabase SQL Editor에서 실행하세요. 기존 보안코드 SQL은 다시 실행하지 않습니다. 브라우저에 이전 기록이 있으면 입장 시 가져오기를 안내합니다. 자세한 설정과 충돌 처리는 [저장 설정](docs/supabase.md)을 참고하세요.



## 뉴스함

World News API 무료 키로 한국어 기사 원문과 여러 사진을 읽습니다. 정치·경제·기술·과학·교육 등 제공사의 카테고리를 한국어로 표시하고, 카드를 누르면 별도 상세 페이지에서 본문 전체와 사진 설명을 보여줍니다. 요약으로 대체하지 않습니다. 무료 한도는 하루 50포인트이며 기존 NewsData 키 대신 새 키가 필요합니다. 한 번 입력한 키는 이 브라우저에 저장되어 새로고침·재방문 시 자동 연결되며 뉴스 연결 해제로 삭제합니다. 매체에 따라 본문·이미지가 누락될 수 있으며 원래 이미지 배치까지 재현하지는 않습니다. [연결 방법·API 선정·제공 범위](docs/news.md)를 참고하세요.



작업실 상단 카드에서 오늘 일정과 다가오는 일정을 전환합니다. 아래 할 일 리스트는 추가·수정·삭제·완료 체크와 우선순위 정렬을 지원합니다. 새 항목은 맨 아래에 추가하며, 할 일 영역을 마우스·터치로 드래그하거나 키보드 방향키로 순서를 바꿉니다. 할 일·완료한 일 필터를 제공하며 완료 여부를 바꿔도 우선순위를 유지합니다. 저장 기능을 사용하려면 기존 프로젝트도 [작업실 데이터 SQL](supabase/workspace-data.sql) 전체를 다시 실행하세요. 기존 기록과 완료 상태는 유지됩니다.
