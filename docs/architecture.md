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
  features/links/             # 폴더·링크 CRUD, 이미지 카드, 미리보기 조회
  features/workspace-memo/    # 메모함과 별개인 단일 메모장·플로팅 편집기
  features/workspace-data/    # 공통 RPC·원격 목록 훅·기존 로컬 기록 가져오기
  features/calendar/          # 날짜별 일정·노트 상태, 편집기, D-day 계산
  features/timetable/         # 매주 반복 수업·저장·검증·편집기
  components/folder-picker.tsx # 메모함·링크함 공통 폴더 선택
  lib/folder-tree.ts           # 공통 폴더 경로·계층 구성
  config/site.ts               # 앱 이름·소개
  lib/utils.ts                 # cn(): clsx + tailwind-merge
  pages/workspace-page.tsx     # 오늘 일정·노트, 다가오는 일정 D-day, 작업실 메모장
  pages/calendar-page.tsx      # 월간 캘린더·날짜 상세 진입
  pages/calendar-day-page.tsx  # 하루의 일정 목록·단일 노트, 편집·삭제
  pages/timetable-page.tsx    # 월–일 시간 격자와 수업 편집 진입
  pages/notes-page.tsx         # 메모함 조립·검증된 세션 전달
  pages/note-detail-page.tsx   # 메모 추가·상세 편집, 폴더 선택과 저장
  pages/links-page.tsx         # 링크함 조립·검증된 세션 전달
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

날씨는 `pages/weather-page.tsx`와 `features/weather/api.ts`로 구성하며 `#/weather`에서 엽니다. Open-Meteo 날씨·CAMS 대기질 API를 독립 조회하여 일부 실패 시 나머지 정보를 유지합니다. 요청은 12초 제한과 페이지/지역 변경 시 취소를 적용합니다. 기본 지역은 서울이며 선택한 주요 도시 ID만 localStorage에 보관합니다. 키·SQL 추가 없이 개인 비상업용 API를 사용합니다. 대기질은 실측이 아닌 모델 예측 농도이며 공급자를 화면에 표시합니다. location.ts의 공유 위치 상태는 날씨와 캘린더가 함께 사용합니다. 현재 위치 좌표는 메모리에만 유지하고 수동 도시 선택만 localStorage에 저장합니다. 캘린더는 daily weather_code를 최대 16일 조회하며 요청 실패가 일정 기능을 막지 않습니다. air-grade.ts는 PM10 30/80/150, PM2.5 15/35/75 경계값을 적용한 참고 등급을 계산합니다.

메모함의 폴더 위치는 `#/notes?folder=<id>`, 새 메모는 `#/notes/new?folder=<id>`, 기존 메모 상세는 `#/notes/<id>?folder=<id>`로 연결합니다. 상세 페이지는 검증된 세션으로 목록을 조회하며 저장 성공 후 선택한 폴더로 돌아갑니다. 새로고침과 브라우저 뒤로 가기에서도 주소의 폴더·메모를 불러옵니다.

`app → pages → features → components/ui → lib` 방향을 유지합니다. 공통 레이아웃은 `app`에서 조립합니다. `components/ui`가 페이지나 업무 기능을 import해서는 안 됩니다. `config`는 하위 계층에서도 참조할 수 있는 정적 설정입니다.

## 새 기능을 넣을 때

1. 단순한 화면은 `pages/<name>-page.tsx`에 작성합니다.
2. 기능의 상태·API·컴포넌트가 생기면 `features/<name>/` 아래에 가까이 둡니다.
3. 여러 기능에서 실제로 재사용하는 UI만 `components`로 올립니다. 공통 훅이 생길 때 `hooks/`를 만듭니다.
4. 한 화면 안에서만 쓰는 데이터·헬퍼를 무조건 공통 폴더로 옮기지 않습니다.
5. 현재 여덟 화면은 app.tsx의 해시 주소 구독으로 전환합니다. 중첩 경로 등 복잡한 탐색이 필요해지면 라우터를 도입합니다.

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

메모함은 `WorkspaceAccess`가 검증한 메모리 세션을 render prop으로 받아 사용합니다. `features/notes/api.ts`는 기존 RPC 전송 함수를 재사용하고 `manage_notes`를 호출합니다. `supabase/notes.sql`은 parent_id로 연결되는 중첩 폴더 구조, 폴더 삭제 시 모든 하위 폴더와 메모 연쇄 삭제, 세션 기반 RLS를 정의합니다. 폴더 위치는 생성 시 최상위 또는 기존 폴더로 지정합니다. 폴더 ID 직접 지정과 상위 폴더 직접 수정 권한은 허용하지 않습니다. 폴더 이동은 move_folder RPC 분기가 세션을 재검증하는 전용 security definer 함수를 호출합니다. 이동 함수는 테이블 잠금 후 대상 존재와 하위 계층을 검사하여 순환 이동을 차단합니다. 폴더 경로는 lib/folder-tree.ts에서 구성하며 현재 위치 바로 아래의 폴더와 해당 위치의 메모만 표시합니다. 최상위에는 폴더만 표시하며 상단 경로로 상위 위치에 돌아갑니다. 새 폴더의 위치는 components/folder-picker.tsx의 접고 펼치는 트리에서 선택합니다. 쓰기와 최신 목록 반환은 하나의 DB 트랜잭션이며 화면은 성공 응답 이후 갱신합니다. 최신순은 작성일 내림차순이고 수정·이동은 작성일을 바꾸지 않습니다.

`npm test`는 PGlite에서 실제 메모 SQL을 실행해 CRUD·정렬·제약·RLS를 검사합니다. `npm run test:ui`는 Playwright가 별도 Vite 서버를 열고 테스트 API 요청을 같은 SQL 엔진에 연결합니다. 세션 검증만 모의 처리하며 운영 Supabase에는 접근하지 않습니다.


링크함은 `manage_links` RPC와 `supabase/links.sql`을 사용하며 메모와 독립적인 테이블을 가집니다. 공통 폴더 선택·경로 함수를 재사용합니다. `preview.ts`는 브라우저에서 자격 증명 없이 페이지를 조회하고 Open Graph/Twitter 이미지 주소를 읽습니다. CORS 제한·6초 시간 초과·조회 실패는 저장을 막지 않습니다. HTML 읽기는 512KB를 기준으로 중단하고 비활성 template에서 메타데이터만 읽습니다. 서버 프록시나 외부 미리보기 서비스는 사용하지 않습니다. URL은 프런트엔드와 DB에서 HTTP(S)로 제한합니다.


수업 시간표는 #/timetable 경로이며 캘린더와 메모함 사이에 배치합니다. 수업은 요일 배열과 시작·종료 시간, 이름·메모·색상을 저장합니다. useTimetable은 manage_workspace_data RPC로 Supabase의 timetable_lessons에 저장하며 캘린더와 별개입니다. 저장 실패나 잘못된 저장 데이터는 사용자에게 안내하고 기존 데이터를 덮어쓰지 않습니다.

일정·날짜별 노트·시간표·작업실 메모는 `supabase/workspace-data.sql`의 세 테이블과 `manage_workspace_data` RPC를 사용합니다. RPC는 security definer로 세션을 먼저 검증하고, 쓰기를 잠금으로 직렬화한 뒤 revision을 비교합니다. 직접 테이블 쓰기는 허용하지 않으며 읽기는 세션 기반 RLS로 보호합니다. `useCollection`은 캘린더와 시간표의 로딩·오류·수정 중 상태를 공유합니다. `useWorkspaceMemo`는 단일 자동 저장 큐와 버전을 사용해 실패한 초안을 메모리에 유지합니다. 이전 localStorage 데이터는 `LocalImport`에서 명시적으로 가져오며 서버 트랜잭션 성공 확인 후 변경되지 않은 원본만 제거합니다. 데이터 해시로 반복 가져오기를 중복 방지합니다. 새 기록은 localStorage에 쓰지 않으며 세션 토큰만 sessionStorage에 남깁니다. 실시간 구독은 사용하지 않으므로 다른 기기의 변경은 새로고침으로 불러옵니다.

날짜·시간 선택은 components/ui/date-picker.tsx와 time-picker.tsx에 둡니다. shadcn Calendar(react-day-picker)·Popover·Select와 기존 Button·Input을 조합하며 date-fns로 날짜를 처리합니다. Collapsible은 메모 이모지 도구의 접기·펼치기에 사용합니다.

components/layout/page-header.tsx는 각 화면에서 재사용하는 고정 헤더입니다. 본문의 좌우 여백과 맞추고 상단 여백은 헤더가 담당합니다. 메모함·링크함의 폴더 경로도 같은 헤더 안에 둡니다.

뉴스함은 pages/news-page.tsx(목록·키 연결), pages/news-article-page.tsx(별도 상세), features/news/use-news.ts(화면 상태), features/news/api.ts(요청·검증)로 구성합니다. World News API의 search-news로 한국 매체의 한국어 본문을 조회하고 상세 진입 시 extract-news로 본문과 다중 이미지를 받습니다. 요약 필드는 사용하지 않습니다. 무료 키는 사용자가 입력하면 이 브라우저의 localStorage에 보관하고 새로고침·재방문 시 복원하며 x-api-key 헤더로 보냅니다. 뉴스 연결 해제로 저장된 키를 삭제합니다. 응답 캐시는 없고 화면 상태만 유지합니다. 동일 요청 병합·단일 요청 큐·1.1초 간격·오래된 응답 차단·무료 한도 안내를 적용합니다. 분야는 URL에 유지하고 목록 복귀 시 카드 포커스를 복원합니다. 별도 서버·SQL은 필요 없으며 제공 범위와 명세는 docs/news.md를 참고하세요.

자료실은 pages/materials-page.tsx와 features/materials의 API·Google SDK·버튼으로 구성합니다. materials.sql의 전용 테이블과 manage_materials RPC를 사용합니다. OAuth 토큰은 영구 저장하지 않으며 파일 원본은 드라이브에 있습니다. 설정은 docs/drive.md에 있습니다.

자료실의 material_folders는 parent_id로 하위 폴더를 구성하고 materials.folder_id는 폴더 삭제 시 null로 변경합니다. manage_materials는 files/folders를 함께 반환합니다. FolderPicker와 buildFolderTree를 재사용하며 download-url.ts에서 파일 형식에 따른 다운로드 주소를 구성합니다.

현재 위치의 지역명은 reverse-geocode.ts에서 BigDataCloud의 브라우저용 API로 조회합니다. 사용자가 위치 권한으로 제공한 현재 좌표만 전송하며 시·구·동 등 반환된 지역명을 중복 제거해 표시합니다. 요청은 8초 제한을 두고 수동 지역 변경·화면 이탈 시 취소합니다. 조회 실패 시 좌표를 표시하며 날씨 조회는 유지합니다. 지역명·좌표는 영구 저장하지 않습니다. API 문서: https://www.bigdatacloud.com/docs/article/why-is-reverse-geocoding-api-free
