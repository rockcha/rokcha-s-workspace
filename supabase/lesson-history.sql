-- workspace-access.sql 적용 후 실행합니다. 재실행해도 기존 내역을 유지합니다.
begin;
create table if not exists public.lesson_records (
  id uuid primary key,
  name text not null check (char_length(btrim(name, E' \t\n\r')) between 1 and 80),
  date date not null check (date between date '0001-01-01' and date '9999-12-31'),
  start text not null check (start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  "end" text not null check ("end" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "end" > start),
  revision integer not null default 1 check (revision > 0)
);
alter table public.lesson_records enable row level security;
revoke all on public.lesson_records from public, anon, authenticated;
grant select on public.lesson_records to anon;
drop policy if exists workspace_access on public.lesson_records;
create policy workspace_access on public.lesson_records for select to anon using ((select public.workspace_session_valid()));
create or replace function public.manage_lesson_records(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.workspace_session_valid() then raise exception 'Workspace session expired' using errcode = '42501'; end if;
  case action
    when 'list' then null;
    when 'save' then
      if (payload->>'revision')::integer = 0 then
        insert into public.lesson_records(id, name, date, start, "end")
          values ((payload->>'id')::uuid, btrim(payload->>'name', E' \t\n\r'), (payload->>'date')::date, payload->>'start', payload->>'end') on conflict (id) do nothing;
      else
        update public.lesson_records set name = btrim(payload->>'name', E' \t\n\r'), date = (payload->>'date')::date,
          start = payload->>'start', "end" = payload->>'end', revision = revision + 1
          where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
      end if;
      if not found then return jsonb_build_object('error', 'conflict'); end if;
    when 'delete' then
      delete from public.lesson_records where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
      if not found then return jsonb_build_object('error', 'conflict'); end if;
    else raise exception 'Invalid action' using errcode = '22023';
  end case;
  return (select coalesce(jsonb_agg(to_jsonb(e) order by e.date, e.start, e."end", e.name, e.id), '[]'::jsonb) from public.lesson_records e);
end;
$$;
revoke all on function public.manage_lesson_records(text, jsonb) from public, anon, authenticated;
grant execute on function public.manage_lesson_records(text, jsonb) to anon;
notify pgrst, 'reload schema';
commit;
