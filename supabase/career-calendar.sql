-- workspace-access.sql 적용 후 실행합니다. 재실행해도 기존 취업 일정은 유지됩니다.
begin;
create or replace function public.valid_career_links(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) = 'array' then
    jsonb_array_length(value) <= 20 and not exists (
      select 1 from jsonb_array_elements(value) item
      where jsonb_typeof(item) is distinct from 'object'
        or jsonb_typeof(item->'title') is distinct from 'string'
        or char_length(btrim(coalesce(item->>'title', ''), E' \t\n\r')) not between 1 and 120
        or jsonb_typeof(item->'url') is distinct from 'string'
        or char_length(coalesce(item->>'url', '')) not between 1 and 4096
        or coalesce(item->>'url', '') !~* '^https?://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'
        or coalesce(item->>'url', '') ~ E'\\\\'
    ) else false end
$$;
create table if not exists public.career_entries (
  id uuid primary key,
  title text not null check (char_length(btrim(title, E' \t\n\r')) between 1 and 120),
  date date not null check (date between date '0001-01-01' and date '9999-12-31'),
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  memo text not null default '' check (char_length(memo) <= 10000),
  links jsonb not null default '[]'::jsonb check (public.valid_career_links(links)),
  revision integer not null default 1 check (revision > 0)
);
alter table public.career_entries enable row level security;
revoke all on public.career_entries from public, anon, authenticated;
grant select on public.career_entries to anon;
drop policy if exists workspace_access on public.career_entries;
create policy workspace_access on public.career_entries for select to anon using ((select public.workspace_session_valid()));

create or replace function public.manage_career_entries(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.workspace_session_valid() then
    raise exception 'Workspace session expired' using errcode = '42501';
  end if;
  case action
    when 'list' then null;
    when 'save' then
      if (payload->>'revision')::integer = 0 then
        insert into public.career_entries(id, title, date, time, memo, links)
          values ((payload->>'id')::uuid, btrim(payload->>'title', E' \t\n\r'), (payload->>'date')::date, payload->>'time', payload->>'memo', payload->'links')
          on conflict (id) do nothing;
      else
        update public.career_entries set title = btrim(payload->>'title', E' \t\n\r'), date = (payload->>'date')::date,
          time = payload->>'time', memo = payload->>'memo', links = payload->'links', revision = revision + 1
          where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
      end if;
      if not found then return jsonb_build_object('error', 'conflict'); end if;
    when 'delete' then
      delete from public.career_entries where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
      if not found then return jsonb_build_object('error', 'conflict'); end if;
    else raise exception 'Invalid action' using errcode = '22023';
  end case;
  return (select coalesce(jsonb_agg(to_jsonb(e) order by e.date, e.time, e.title, e.id), '[]'::jsonb) from public.career_entries e);
end;
$$;
revoke all on function public.manage_career_entries(text, jsonb) from public, anon, authenticated;
grant execute on function public.manage_career_entries(text, jsonb) to anon;
notify pgrst, 'reload schema';
commit;
