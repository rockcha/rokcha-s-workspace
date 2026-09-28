-- Supabase SQL Editor에서 전체 실행

begin;

create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists workspace_private;

revoke all on schema workspace_private from public, anon, authenticated;


-- =========================================================
-- 보안 설정 테이블
-- =========================================================

create table if not exists workspace_private.access_config (
  singleton boolean primary key default true check (singleton),
  code_hash text not null,
  failed_attempts integer not null default 0,
  blocked_until timestamptz
);


-- =========================================================
-- 세션 테이블
-- =========================================================

create table if not exists workspace_private.sessions (
  token_hash text primary key,
  expires_at timestamptz not null
);

alter table workspace_private.access_config enable row level security;
alter table workspace_private.sessions enable row level security;

revoke all on all tables in schema workspace_private
from public, anon, authenticated;


-- =========================================================
-- 작업공간 잠금 해제
-- =========================================================

create or replace function public.unlock_workspace(security_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  config workspace_private.access_config%rowtype;
  session_token text;
  failures integer;
begin

  -- 동시 요청에서도 실패 횟수가 꼬이지 않도록 행 잠금
  select *
  into config
  from workspace_private.access_config
  where singleton
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;


  -- 차단 시간이 아직 지나지 않은 경우
  if config.blocked_until > clock_timestamp() then
    return jsonb_build_object('status', 'locked');
  end if;


  -- 차단 시간이 끝났다면 실패 횟수 초기화
  failures :=
    case
      when config.blocked_until is not null then 0
      else config.failed_attempts
    end;


  -- NULL / 빈 문자열 / bcrypt 최대 길이 초과 방지
  -- 최소 글자 수 제한은 없음
  if security_code is null
     or length(security_code) = 0
     or octet_length(security_code) > 72 then

    failures := failures + 1;


  elsif extensions.crypt(
    security_code,
    config.code_hash
  ) <> config.code_hash then

    failures := failures + 1;


  else

    -- 로그인 성공
    update workspace_private.access_config
    set
      failed_attempts = 0,
      blocked_until = null
    where singleton;


    -- 만료된 세션 정리
    delete from workspace_private.sessions
    where expires_at <= clock_timestamp();


    -- 새로운 세션 토큰 생성
    session_token :=
      encode(
        extensions.gen_random_bytes(32),
        'hex'
      );


    -- 실제 토큰 대신 SHA-256 해시 저장
    insert into workspace_private.sessions (
      token_hash,
      expires_at
    )
    values (
      encode(
        extensions.digest(
          session_token,
          'sha256'
        ),
        'hex'
      ),

      clock_timestamp() + interval '12 hours'
    );


    return jsonb_build_object(
      'status', 'ok',
      'token', session_token
    );

  end if;


  -- 로그인 실패 처리
  update workspace_private.access_config
  set
    failed_attempts = failures,

    blocked_until =
      case
        when failures >= 5
          then clock_timestamp() + interval '5 minutes'
        else null
      end

  where singleton;


  return jsonb_build_object(
    'status',
    case
      when failures >= 5 then 'locked'
      else 'invalid'
    end
  );

end;
$$;


-- =========================================================
-- 현재 세션 유효성 확인
-- =========================================================

create or replace function public.workspace_session_valid()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$

  select exists (

    select 1

    from workspace_private.sessions

    where token_hash = encode(

      extensions.digest(

        nullif(
          current_setting('request.headers', true),
          ''
        )::jsonb ->> 'x-workspace-session',

        'sha256'

      ),

      'hex'

    )

    and expires_at > now()

  );

$$;


-- =========================================================
-- 로그아웃 / 현재 세션 삭제
-- =========================================================

create or replace function public.lock_workspace()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin

  delete from workspace_private.sessions

  where token_hash = encode(

    extensions.digest(

      nullif(
        current_setting('request.headers', true),
        ''
      )::jsonb ->> 'x-workspace-session',

      'sha256'

    ),

    'hex'

  );


  return true;

end;
$$;


-- =========================================================
-- 함수 접근 권한
-- =========================================================

revoke all
on function public.unlock_workspace(text)
from public, anon, authenticated;

revoke all
on function public.workspace_session_valid()
from public, anon, authenticated;

revoke all
on function public.lock_workspace()
from public, anon, authenticated;


-- anon 사용자에게 필요한 함수만 허용

grant execute
on function public.unlock_workspace(text)
to anon;

grant execute
on function public.workspace_session_valid()
to anon;

grant execute
on function public.lock_workspace()
to anon;


-- =========================================================
-- ★ 보안 코드 설정
-- =========================================================

do $$
declare

  new_code text := 'CHANGE_THIS_SECURITY_CODE';

begin

  -- 최소 글자 수 제한 없음
  -- 빈 문자열 및 72바이트 초과만 금지

  if new_code = 'CHANGE_THIS_SECURITY_CODE' or new_code is null
     or length(new_code) = 0
     or octet_length(new_code) > 72 then

    raise exception
      '보안코드는 비어 있을 수 없으며 UTF-8 기준 72바이트 이하여야 합니다.';

  end if;


  insert into workspace_private.access_config (
    singleton,
    code_hash
  )

  values (

    true,

    extensions.crypt(
      new_code,
      extensions.gen_salt('bf', 10)
    )

  )

  on conflict (singleton)

  do update set

    code_hash = excluded.code_hash,

    failed_attempts = 0,

    blocked_until = null;


  -- 코드가 변경되면 기존 로그인 세션 전부 만료
  delete from workspace_private.sessions;

end;
$$;


-- PostgREST 스키마 갱신

notify pgrst, 'reload schema';

commit;