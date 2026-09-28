-- workspace-access.sql 적용 후 실행합니다. 재실행해도 기존 콘텐츠를 유지합니다.
begin;
create table if not exists public.motivation_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('quote', 'youtube')),
  title text not null default '' check (char_length(title) <= 120),
  content text not null default '' check (char_length(content) <= 5000),
  video_id text not null default '',
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  check ((kind = 'quote' and char_length(btrim(content)) > 0 and video_id = '') or
         (kind = 'youtube' and video_id ~ '^[A-Za-z0-9_-]{11}$' and char_length(btrim(title)) > 0))
);
alter table public.motivation_items enable row level security;
revoke all on public.motivation_items from public, anon, authenticated;
grant select on public.motivation_items to anon;
drop policy if exists workspace_access on public.motivation_items;
create policy workspace_access on public.motivation_items for select to anon
  using ((select public.workspace_session_valid()));

create or replace function public.manage_motivation(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.workspace_session_valid() then
    raise exception 'Workspace session expired' using errcode = '42501';
  end if;
  case action
    when 'list' then null;
    when 'save' then
      if nullif(payload->>'id', '') is null then
        insert into public.motivation_items(kind, title, content, video_id)
        values (payload->>'kind', btrim(coalesce(payload->>'title', '')), btrim(coalesce(payload->>'content', '')), coalesce(payload->>'video_id', ''));
      else
        update public.motivation_items set kind = payload->>'kind', title = btrim(coalesce(payload->>'title', '')),
          content = btrim(coalesce(payload->>'content', '')), video_id = coalesce(payload->>'video_id', ''), revision = revision + 1
          where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
        if not found then return jsonb_build_object('error', 'conflict'); end if;
      end if;
    when 'delete' then
      delete from public.motivation_items where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
      if not found then return jsonb_build_object('error', 'conflict'); end if;
    else raise exception 'Invalid action' using errcode = '22023';
  end case;
  return (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc, m.id), '[]'::jsonb) from public.motivation_items m);
end;
$$;
revoke all on function public.manage_motivation(text, jsonb) from public, anon, authenticated;
grant execute on function public.manage_motivation(text, jsonb) to anon;
notify pgrst, 'reload schema';
commit;
