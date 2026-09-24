# 개인 작업실 보안코드 설정

이메일·회원가입 없이 보안코드 하나로 입장합니다. Supabase Data API의 SQL 함수를 사용하며 Supabase Auth 계정이나 Edge Function 배포는 필요하지 않습니다.

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

현재 캘린더·메모·링크는 예시 화면이며 데이터 저장은 구현하지 않았습니다. 정적 번들의 예시 문구는 비밀 데이터가 아닙니다. 화면의 입장 제한만으로 새 DB 테이블이 보호되지는 않습니다.

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

- `npm run check`: 린트·타입·프로덕션 빌드.
- `node --test tests/workspace-api.test.mjs`: 네트워크 모의 응답으로 인증 API의 성공·실패·설정 검증.
- SQL 적용 후 `supabase/workspace-access.test.sql`을 SQL Editor에서 실행하면 세션·제한·권한을 검사합니다. 테스트는 마지막에 롤백하므로 기존 코드를 바꾸지 않습니다.
- 브라우저에서 틀린 코드, 올바른 코드, 새로고침, 직접 `#/notes` 접근, 나가기 후 뒤로 가기, 모바일 배치·키보드 포커스를 확인합니다.

참고: [Supabase SQL 함수와 권한](https://supabase.com/docs/guides/database/functions), [API 요청 헤더·RLS](https://supabase.com/docs/guides/api/securing-your-api), [공개 API 키](https://supabase.com/docs/guides/getting-started/api-keys).
