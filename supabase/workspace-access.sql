-- Supabase SQL Editor에서 실행합니다.
-- 맨 아래 CHANGE_THIS_SECURITY_CODE를 본인만 아는 코드로 바꾸세요.
-- 이 스크립트를 다시 실행하면 코드가 변경되고 기존 접속이 모두 만료됩니다.
begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists workspace_private;
revoke all on schema workspace_private from public, anon, authenticated;

create table if not exists workspace_private.access_config (
  singleton boolean primary key default true check (singleton),
  code_hash text not null,
  failed_attempts integer not null default 0,
  blocked_until timestamptz
);
create table if not exists workspace_private.sessions (
  token_hash text primary key,
  expires_at timestamptz not null
);
alter table workspace_private.access_config enable row level security;
alter table workspace_private.sessions enable row level security;
revoke all on all tables in schema workspace_private from public, anon, authenticated;

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
  -- 행 잠금으로 동시 요청도 하나의 실패 횟수를 공유합니다.
  select * into config from workspace_private.access_config where singleton for update;
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  if config.blocked_until > clock_timestamp() then
    return jsonb_build_object('status', 'locked');
  end if;

  failures := case when config.blocked_until is not null then 0 else config.failed_attempts end;
  if security_code is null or octet_length(security_code) > 72 or length(security_code) < 12 then
    failures := failures + 1;
  elsif extensions.crypt(security_code, config.code_hash) <> config.code_hash then
    failures := failures + 1;
  else
    update workspace_private.access_config set failed_attempts = 0, blocked_until = null where singleton;
    delete from workspace_private.sessions where expires_at <= clock_timestamp();
    session_token := encode(extensions.gen_random_bytes(32), 'hex');
    insert into workspace_private.sessions (token_hash, expires_at)
    values (encode(extensions.digest(session_token, 'sha256'), 'hex'), clock_timestamp() + interval '12 hours');
    return jsonb_build_object('status', 'ok', 'token', session_token);
  end if;

  -- 예외를 던지면 실패 횟수도 롤백되므로 결과 값으로 반환합니다.
  update workspace_private.access_config
  set failed_attempts = failures,
      blocked_until = case when failures >= 5 then clock_timestamp() + interval '5 minutes' else null end
  where singleton;
  return jsonb_build_object('status', case when failures >= 5 then 'locked' else 'invalid' end);
end;
$$;

create or replace function public.workspace_session_valid()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from workspace_private.sessions
    where token_hash = encode(extensions.digest(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-workspace-session',
      'sha256'
    ), 'hex') and expires_at > now()
  );
$$;

create or replace function public.lock_workspace()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from workspace_private.sessions
  where token_hash = encode(extensions.digest(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-workspace-session',
    'sha256'
  ), 'hex');
  return true;
end;
$$;

revoke all on function public.unlock_workspace(text) from public, anon, authenticated;
revoke all on function public.workspace_session_valid() from public, anon, authenticated;
revoke all on function public.lock_workspace() from public, anon, authenticated;
grant execute on function public.unlock_workspace(text) to anon;
grant execute on function public.workspace_session_valid() to anon;
grant execute on function public.lock_workspace() to anon;

-- 코드 설정 / 변경: 이 값만 바꾸고 스크립트 전체를 실행하세요.
do $$
declare
  new_code text := 'CHANGE_THIS_SECURITY_CODE';
begin
  if new_code = 'CHANGE_THIS_SECURITY_CODE' or length(new_code) < 12 or octet_length(new_code) > 72 then
    raise exception '보안코드를 12자 이상, UTF-8 기준 72바이트 이하로 설정하세요.';
  end if;
  insert into workspace_private.access_config (singleton, code_hash)
  values (true, extensions.crypt(new_code, extensions.gen_salt('bf', 10)))
  on conflict (singleton) do update set code_hash = excluded.code_hash, failed_attempts = 0, blocked_until = null;
  delete from workspace_private.sessions;
end;
$$;

notify pgrst, 'reload schema';
commit;
