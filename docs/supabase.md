# 개인 작업실 보안코드 설정

## 집필실 설정

기존 접속 설정이 된 프로젝트에서 [transcriptions.sql](../supabase/transcriptions.sql) 전체를 SQL Editor에서 한 번 실행하세요. 기존 보안코드 SQL은 다시 실행하지 않습니다. 글 제목(120자)·내용(50,000자)·자동 작성일을 저장하며 수정 시 작성일은 유지됩니다. 세션 기반 RLS와 수정·삭제 revision 검사를 적용하며 재실행해도 글을 보존합니다. 운영 DB에는 자동 적용되지 않습니다.

이메일·회원가입 없이 보안코드 하나로 입장합니다. Supabase Data API의 SQL 함수를 사용하며 Supabase Auth 계정이나 Edge Function 배포는 필요하지 않습니다.

## 할 일 우선순위 업데이트

기존 프로젝트는 [workspace-data.sql](../supabase/workspace-data.sql) **전체**를 SQL Editor에서 실행한 뒤 앱을 새로고침합니다. 보안코드 SQL을 다시 실행할 필요는 없습니다. 운영 DB에는 자동으로 적용되지 않습니다.

- 기존 할 일의 내용·완료 상태를 보존하고 기존 표시 순서대로 priority를 한 번 배정합니다. 재실행해도 사용자가 정한 순서는 유지합니다.
- 새 항목은 전체 목록의 마지막 순위에 추가합니다. 완료·완료 취소·제목 수정으로 순위가 바뀌지 않습니다.
- todo_reorder는 전체 목록의 ID와 revision을 받아 한 번에 순서를 저장합니다. 다른 기기에서 항목을 추가·수정·삭제했다면 오래된 요청을 거부합니다. 실패 알림의 다시 불러오기를 누른 후 다시 이동하면 됩니다.
- 필터에서 순서를 바꾸면 보이는 항목이 차지하던 자리끼리만 이동합니다. 숨겨진 항목의 자리는 유지합니다.
- SQL을 아직 적용하지 않았다면 새 앱은 우선순위 없는 목록을 정상 응답으로 처리하지 않습니다. SQL 적용 후 할 일의 다시 불러오기를 누릅니다.

## 처음 연결하기

1. Supabase 프로젝트의 SQL Editor에서 `supabase/workspace-access.sql` 전체를 붙여 넣습니다.
2. 맨 아래 `new_code text := 'CHANGE_THIS_SECURITY_CODE';`의 값을 본인 코드로 바꿉니다. 12자 이상, UTF-8 기준 72바이트 이하로 설정합니다. 영문·숫자를 섞은 긴 코드를 권장합니다. 작은따옴표는 SQL 문자열에서 `''`로 적습니다. 실제 코드가 들어간 SQL을 저장소에 커밋하지 않습니다.
3. Run을 누릅니다. 기본 문구 그대로 실행하면 전체 트랜잭션이 취소됩니다.
4. 프로젝트 Connect 또는 Settings → API Keys에서 프로젝트 URL과 **publishable key**(또는 기존 `anon` 키)를 확인합니다.
5. `.env.example`을 참고하여 `.env.local`에 다음 변수를 저장합니다.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

기존 `anon` 키는 `VITE_SUPABASE_ANON_KEY`로 설정할 수 있습니다. `service_role`, `sb_secret_` 키와 실제 보안코드는 프런트엔드 환경 변수에 넣지 않습니다. `VITE_` 변수는 브라우저 번들에 포함됩니다.

6. 개발 서버를 재시작하고 보안코드를 입력합니다. 배포 환경도 같은 환경 변수를 설정한 뒤 다시 빌드합니다.

## 접속 동작

- 코드는 bcrypt 해시로 비공개 스키마에 보관합니다. 브라우저에는 코드 확인에 성공한 경우에만 256비트 무작위 세션 토큰을 반환합니다. DB에는 토큰의 SHA-256 해시만 남깁니다.
- 세션은 발급 후 12시간 동안 유효합니다. 토큰은 현재 탭의 `sessionStorage`에 보관하므로 새로고침 후 서버 검증을 거쳐 다시 입장합니다. 브라우저의 탭 복원·복제 기능은 저장소를 복원할 수 있으므로 확실히 종료하려면 **작업실 나가기**를 누릅니다.
- 나가기는 서버 세션을 삭제한 후 화면과 로컬 토큰을 정리합니다. 네트워크 실패 시 성공으로 처리하지 않고 재시도를 안내합니다.
- 처음 접속, 매 60초, 창에 다시 포커스할 때 서버 검증을 합니다. 만료되거나 검증에 실패하면 내부 화면을 숨깁니다.
- 틀린 코드를 5회 입력하면 작업실 전체의 새 입장을 5분간 제한합니다. 개인용 전역 제한이므로 다른 사람이 틀려도 본인의 새 입장이 잠시 제한될 수 있습니다. 이미 발급한 세션은 유지됩니다.
- 코드 변경은 같은 SQL의 `new_code`를 바꿔 전체를 재실행합니다. 기존 세션도 모두 폐기됩니다.

## 데이터를 추가할 때

일정·날짜별 노트·수업 시간표·작업실 메모·메모함·링크함 모두 Supabase에 저장합니다. 화면의 입장 제한만으로 새 DB 테이블이 보호되지는 않습니다.

실제 데이터를 저장하는 테이블은 반드시 RLS를 활성화하고, 아래와 같이 `workspace_session_valid()`를 모든 읽기·쓰기 정책에 적용합니다. 기존의 무조건 허용 정책은 함께 두지 않습니다. API 요청에는 `x-workspace-session` 헤더로 세션 토큰을 보내야 합니다. 이 세션은 Supabase Auth JWT가 아니며 `auth.uid()` 또는 `authenticated` 역할을 사용하지 않습니다.

```sql
-- 실제 테이블을 만든 뒤 테이블 이름을 바꿔 적용하는 예시입니다.
alter table public.your_table enable row level security;
grant select, insert, update, delete on public.your_table to anon;
create policy workspace_access on public.your_table
  for all to anon
  using ((select public.workspace_session_valid()))
  with check ((select public.workspace_session_valid()));
```

`workspace_private`는 API의 Exposed schemas에 추가하지 않습니다. 이 방식은 Data API용이며 Storage·Realtime 접근 권한을 자동으로 부여하지 않습니다.

## 검증

메모함 설정은 아래 절을 참고하세요.

- `npm run check`: 린트·타입·프로덕션 빌드.
- `node --test tests/workspace-api.test.mjs`: 네트워크 모의 응답으로 인증 API의 성공·실패·설정 검증.
- SQL 적용 후 `supabase/workspace-access.test.sql`을 SQL Editor에서 실행하면 세션·제한·권한을 검사합니다. 테스트는 마지막에 롤백하므로 기존 코드를 바꾸지 않습니다.
- 브라우저에서 틀린 코드, 올바른 코드, 새로고침, 직접 `#/notes` 접근, 나가기 후 뒤로 가기, 모바일 배치·키보드 포커스를 확인합니다.

참고: [Supabase SQL 함수와 권한](https://supabase.com/docs/guides/database/functions), [API 요청 헤더·RLS](https://supabase.com/docs/guides/api/securing-your-api), [공개 API 키](https://supabase.com/docs/guides/getting-started/api-keys).

## 메모함 테이블과 임시 폴더

1. 작업실 접속 설정을 완료한 프로젝트의 SQL Editor에서 [`supabase/notes.sql`](../supabase/notes.sql)을 실행합니다. 기존 작업실의 보안코드 SQL은 다시 실행할 필요가 없습니다.
2. 기존에 메모 테이블을 만들었다면 같은 `notes.sql`을 다시 실행하세요. 기존 폴더는 최상위로 유지되며 메모도 보존됩니다. `parent_id` 열과 인덱스, 계층 생성 RPC가 추가됩니다. 처음 실행하면 `note_folders`, `notes`, RLS 정책과 `manage_notes` RPC가 생성됩니다. 폴더가 하나도 없으면 `임시 폴더`가 생성되며, 재실행 시 기존 데이터는 유지됩니다.
3. 앱의 메모함에서 폴더 이름을 수정하거나 새 폴더를 추가합니다. 메모는 반드시 기존 폴더를 선택해 저장합니다.

폴더 안에 여러 단계의 하위 폴더를 만들 수 있습니다. 폴더 추가 창에서 최상위 또는 기존 폴더 경로를 위치로 선택합니다. 폴더 필터와 메모 저장·이동 선택지도 전체 경로로 표시됩니다. 상위 폴더로 필터링하면 하위 폴더의 메모도 포함됩니다. 폴더명은 60자, 메모 제목은 120자, 내용은 50,000자까지 입력할 수 있습니다. 제목과 폴더 이름은 공백만 저장할 수 없습니다. 폴더 삭제는 `ON DELETE CASCADE`로 모든 하위 폴더와 포함된 메모를 함께 삭제하며, UI에서 전체 하위 폴더·메모 수와 복구 불가 안내를 확인해야 진행됩니다. 임시 폴더도 수정·삭제할 수 있습니다. 모든 폴더를 삭제한 경우 화면에서 다시 폴더를 만들 수 있습니다.

`manage_notes`는 `security invoker`로 실행되어 RLS를 유지하고, `x-workspace-session` 헤더를 검증합니다. 유효한 세션 없이 RPC 및 직접 테이블 접근으로 데이터를 읽거나 쓸 수 없습니다. 화면에서는 추가·수정·이동·삭제 성공 후 서버 목록을 반영합니다. 최신순은 작성일 기준이며 수정일은 별도로 저장합니다.

- `npm test`: 실제 메모 SQL을 로컬 PGlite에서 실행하여 저장·수정·이동·연쇄 삭제·무효 세션 접근 차단을 검사합니다. 세션 검증 함수만 테스트용으로 대체합니다.
- `npm run test:ui`: 운영 서버 대신 위 로컬 DB와 모의 인증을 사용해 모바일·데스크톱·키보드·오류 복구를 검사합니다.
- 운영 Supabase SQL 적용 및 네트워크 연결은 별도 확인이 필요합니다. 자동 테스트는 운영 데이터를 수정하지 않습니다.

## 링크함 설정

접속 설정을 마쳤다면 [`supabase/links.sql`](../supabase/links.sql)을 SQL Editor에서 한 번 실행합니다. 보안코드 SQL을 다시 실행할 필요는 없습니다. `link_folders`, `links` 테이블과 `manage_links` RPC, 세션 기반 RLS를 만듭니다. 메모함 데이터와 독립적이며 폴더가 없으면 임시 폴더를 추가합니다. 재실행해도 기존 링크는 유지됩니다.

하위 폴더·이름 변경·연쇄 삭제와 링크 추가·수정·이동·삭제를 지원합니다. 링크 및 이미지 주소는 최대 4,096자 HTTP(S) URL입니다. 제목 120자, 설명 50,000자, 폴더 이름 60자 제한입니다. 미리보기는 브라우저에서 조회 가능한 사이트의 OG/Twitter 이미지를 사용하며 CORS로 차단되는 사이트는 이미지 주소를 직접 지정할 수 있습니다. 운영 SQL 적용은 자동 테스트에 포함되지 않습니다.

## 폴더 이동 기능 적용

기존 프로젝트도 supabase/notes.sql과 supabase/links.sql을 SQL Editor에서 각각 다시 실행해야 합니다. 기존 데이터는 유지되며 move_folder 분기와 세션 검증을 수행하는 move_note_folder / move_link_folder 함수가 추가됩니다. 상위 폴더를 직접 수정하는 권한은 부여하지 않습니다. 이동 함수는 테이블 잠금 후 대상 존재와 순환 여부를 검사하며 하위 폴더·콘텐츠는 그대로 유지합니다. 운영 DB에는 자동 적용하지 않습니다.

## 일정·날짜별 노트·시간표·작업실 메모 설정

수업 색상은 총 11가지입니다. 기존 6색을 사용 중인 프로젝트도 `supabase/workspace-data.sql`을 다시 실행하면 기존 수업을 유지하면서 레몬·코랄·인디고·코코아·그레이를 저장할 수 있습니다.

기존 접속 설정이 된 프로젝트에서는 [`supabase/workspace-data.sql`](../supabase/workspace-data.sql) 전체를 SQL Editor에서 실행한 뒤 앱을 새로고침합니다. 보안코드 SQL을 다시 실행할 필요가 없습니다. 새 프로젝트는 접속 SQL을 먼저 실행하세요. 이 SQL은 기존 메모함·링크함 테이블을 변경하지 않으며 재실행해도 기록을 유지합니다.

- `calendar_entries`: 하루 여러 일정과 내용만 있는 날짜별 노트. 노트는 날짜별 고유 인덱스로 하루 한 개만 허용합니다.
- `timetable_lessons`: 수업 이름·메모·요일·시간·색상. 같은 요일에 겹치는 수업은 RPC에서 차단합니다.
- `workspace_memo`: 작업실과 플로팅 창이 함께 사용하는 단일 메모입니다.
- `workspace_imports`: 기존 브라우저 기록의 가져오기 완료 여부를 기록합니다.

쓰기 요청은 `manage_workspace_data`가 세션을 검증한 후 처리합니다. 직접 테이블 쓰기는 차단하고 읽기는 RLS를 적용합니다. 수정·삭제에 revision을 비교해 다른 기기에서 먼저 수정한 내용을 덮어쓰지 않습니다. 자동 저장은 서버 응답 후에만 완료로 표시하며, 실패하면 편집 내용을 유지하고 재시도할 수 있습니다. 버전 충돌 시 초안을 복사한 뒤 새로고침해 서버 내용을 확인합니다. 실시간 동기화는 사용하지 않으므로 다른 기기의 변경은 새로고침하여 불러옵니다.

이전 브라우저에 기록이 있으면 입장 시 **기존 기록 가져오기**를 누릅니다. 이전 노트의 제목은 본문 앞에 보존하고 같은 날짜의 노트는 합칩니다. 일정·시간표·메모는 하나의 트랜잭션으로 옮기며 서버 기록과 충돌하면 전체를 취소하고 브라우저 원본을 남깁니다. 성공이 확인된 원본만 제거하고, 같은 기록을 다시 가져와도 중복 생성하지 않습니다. **나중에 · 서버 기록 보기**를 선택하면 로컬 원본을 보관한 채 서버 기록을 사용합니다. 새 기록은 로컬 저장소에 저장하지 않습니다.

`npm test`와 `npm run test:ui`는 실제 SQL을 PGlite에 실행해 제약·충돌·권한과 화면 동작을 확인합니다. 운영 Supabase에는 자동 적용되지 않으므로 SQL Editor 실행은 별도로 필요합니다.




## 할 일 리스트 설정

기존 프로젝트도 [supabase/workspace-data.sql](../supabase/workspace-data.sql) 전체를 SQL Editor에서 다시 실행하세요. workspace_todos 테이블과 todo_list/save/delete RPC 분기가 추가되며 기존 일정·노트·시간표·메모는 유지됩니다. 할 일은 최대 200자이며 완료 상태도 서버에 저장합니다. 직접 쓰기와 세션 없는 접근을 차단하고 수정·삭제에는 revision을 검사합니다. 운영 SQL 적용은 로컬 테스트에 포함되지 않습니다.

## 영단어 공부방 설정

영단어 공부방은 [vocabulary.sql](../supabase/vocabulary.sql) 전체를 SQL Editor에서 한 번 실행해야 사용할 수 있습니다. 기존 접속 설정은 그대로 사용합니다. 단어(120자)와 품사별 뜻(각 1,000자, 최대 50개)을 서버에 보관하며, 세션 검증과 수정·삭제 revision 검사를 적용합니다. 재실행 시 단어는 유지됩니다. 가리기 모드는 화면에만 적용하며 저장된 단어·뜻은 변경하지 않습니다. 운영 SQL은 별도로 적용해야 합니다.

## 취업 캘린더 설정

기존 접속 설정을 마친 프로젝트의 SQL Editor에서 [career-calendar.sql](../supabase/career-calendar.sql) 전체를 한 번 실행합니다. `career_entries` 테이블과 `manage_career_entries` RPC가 생성되며 기존 일정·노트 데이터에는 영향을 주지 않습니다. 재실행해도 취업 일정은 유지됩니다. 제목은 120자, 메모는 10,000자, 링크는 최대 20개(이름 120자·HTTP(S) 주소 4,096자)이며 마감 날짜와 00:00~23:59 시간은 필수입니다. 링크와 메모는 비워 둘 수 있습니다. 세션 없는 접근과 직접 테이블 쓰기를 차단하고 수정·삭제에는 revision을 검사합니다. 로컬 DB 및 브라우저 테스트는 운영 DB에 적용하지 않으므로 이 SQL 실행은 별도로 필요합니다.

## 할 일 전체 삭제 업데이트

전체 삭제가 SQL 적용 후에도 실패한다면 최신 파일로 다시 적용합니다. 삭제문은 확인한 ID·revision을 `WHERE` 조건으로 지정하며, 조건 없는 DELETE를 차단하는 서버 설정도 지원합니다. 서버 오류 안내에는 HTTP 상태와 오류 코드만 표시하고 응답 원문은 노출하지 않습니다. 로컬 PGlite 테스트에는 서버의 safeupdate 확장이 없어 해당 설정 자체는 운영 환경에서 별도로 확인해야 합니다.

[workspace-data.sql](../supabase/workspace-data.sql) 전체를 SQL Editor에서 다시 실행합니다. 스크립트 적용 자체는 할 일을 삭제하지 않습니다. 추가되는 todo_delete_all은 세션과 명시적 confirmed: true, 확인창을 열 때의 전체 ID·revision 목록을 검사한 후 하나의 트랜잭션으로 삭제합니다. 목록의 추가·수정·삭제·순서 변경이 있었다면 전부 보존하고 충돌을 반환합니다. 일정·메모 등 다른 데이터는 삭제하지 않습니다.
