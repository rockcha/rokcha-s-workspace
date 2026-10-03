-- workspace-access.sql 적용 후 실행합니다. 재실행해도 기존 글는 유지됩니다.
begin;
create table if not exists public.transcriptions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title, E' \t\n\r')) between 1 and 120),
  content text not null check (char_length(content) <= 50000 and char_length(btrim(content, E' \t\n\r')) > 0),
  created_at timestamptz not null default now(),
  revision integer not null default 1 check (revision > 0)
);
alter table public.transcriptions enable row level security;
revoke all on public.transcriptions from public, anon, authenticated;
grant select on public.transcriptions to anon;
drop policy if exists workspace_access on public.transcriptions;
create policy workspace_access on public.transcriptions for select to anon using ((select public.workspace_session_valid()));

create or replace function public.manage_transcriptions(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.workspace_session_valid() then
    raise exception 'Workspace session expired' using errcode = '42501';
  end if;
  case action
    when 'list' then null;
    when 'save' then
      if nullif(payload->>'id', '') is null then
        insert into public.transcriptions(title, content) values (btrim(payload->>'title', E' \t\n\r'), payload->>'content');
      else
        update public.transcriptions set title = btrim(payload->>'title', E' \t\n\r'), content = payload->>'content', revision = revision + 1
          where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
        if not found then return jsonb_build_object('error', 'conflict'); end if;
      end if;
    when 'delete' then
      delete from public.transcriptions where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
      if not found then return jsonb_build_object('error', 'conflict'); end if;
    else raise exception 'Invalid action' using errcode = '22023';
  end case;
  return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc, t.id), '[]'::jsonb) from public.transcriptions t);
end;
$$;
revoke all on function public.manage_transcriptions(text, jsonb) from public, anon, authenticated;
grant execute on function public.manage_transcriptions(text, jsonb) to anon;
notify pgrst, 'reload schema';
commit;
