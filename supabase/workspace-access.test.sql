-- workspace-access.sql 적용 후 SQL Editor에서 실행. 모든 변경은 롤백합니다.
begin;
do $$
declare
  response jsonb;
  session_token text;
begin
  if has_schema_privilege('anon', 'workspace_private', 'USAGE')
    or has_table_privilege('anon', 'workspace_private.access_config', 'SELECT')
    or has_table_privilege('anon', 'workspace_private.sessions', 'SELECT') then
    raise exception 'FAIL: private data exposed';
  end if;
  if not has_function_privilege('anon', 'public.unlock_workspace(text)', 'EXECUTE') then
    raise exception 'FAIL: anon cannot unlock';
  end if;

  update workspace_private.access_config
  set code_hash = extensions.crypt('test-code-only-123', extensions.gen_salt('bf', 4)),
      failed_attempts = 0, blocked_until = null;
  perform set_config('request.headers', '{}', true);
  if public.workspace_session_valid() then raise exception 'FAIL: missing token accepted'; end if;

  for i in 1..4 loop
    response := public.unlock_workspace('wrong');
    if response->>'status' <> 'invalid' then raise exception 'FAIL: incorrect code'; end if;
  end loop;
  response := public.unlock_workspace('wrong');
  if response->>'status' <> 'locked' then raise exception 'FAIL: rate limit'; end if;
  response := public.unlock_workspace('test-code-only-123');
  if response->>'status' <> 'locked' then raise exception 'FAIL: rate limit bypass'; end if;

  update workspace_private.access_config set blocked_until = now() - interval '1 second';
  response := public.unlock_workspace('test-code-only-123');
  session_token := response->>'token';
  if response->>'status' <> 'ok' or length(session_token) <> 64 then raise exception 'FAIL: unlock'; end if;
  perform set_config('request.headers', jsonb_build_object('x-workspace-session', session_token)::text, true);
  if not public.workspace_session_valid() then raise exception 'FAIL: valid session'; end if;
  perform public.lock_workspace();
  if public.workspace_session_valid() then raise exception 'FAIL: revoked token accepted'; end if;

  response := public.unlock_workspace('test-code-only-123');
  session_token := response->>'token';
  perform set_config('request.headers', jsonb_build_object('x-workspace-session', session_token)::text, true);
  update workspace_private.sessions set expires_at = now() - interval '1 second'
  where token_hash = encode(extensions.digest(session_token, 'sha256'), 'hex');
  if public.workspace_session_valid() then raise exception 'FAIL: expired token accepted'; end if;
  perform set_config('request.headers', '{"x-workspace-session":"forged"}', true);
  if public.workspace_session_valid() then raise exception 'FAIL: forged token accepted'; end if;
end;
$$;

-- 실제 anon 역할에서 보안 테이블 읽기와 쓰기가 거부되는지 확인합니다.
set local role anon;
do $$
begin
  begin
    perform 1 from workspace_private.access_config;
    raise exception 'FAIL: anon read allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from workspace_private.sessions;
    raise exception 'FAIL: anon delete allowed';
  exception when insufficient_privilege then null;
  end;
  if public.workspace_session_valid() then raise exception 'FAIL: forged anon session'; end if;
end;
$$;
reset role;
rollback;
