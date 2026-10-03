-- workspace-access.sql 적용 후 실행합니다. 기존 데이터는 유지됩니다.
begin;
create table if not exists public.workspace_todos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  completed boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now()
);
-- 기존 표시 순서를 최초 우선순위로 보존합니다. 재실행 시 저장된 순서는 유지합니다.
alter table public.workspace_todos add column if not exists reset_time text check (reset_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
alter table public.workspace_todos add column if not exists completed_at timestamptz;
alter table public.workspace_todos add column if not exists priority integer check (priority > 0);
with ranked as (
  select id, row_number() over (order by completed, created_at desc, id)::integer as position
  from public.workspace_todos
)
update public.workspace_todos t set priority = r.position from ranked r
where t.id = r.id and t.priority is null;
alter table public.workspace_todos alter column priority set not null;
create index if not exists workspace_todos_priority on public.workspace_todos(priority, id);
alter table public.workspace_todos enable row level security;
revoke all on public.workspace_todos from public, anon, authenticated;
grant select on public.workspace_todos to anon;
drop policy if exists workspace_access on public.workspace_todos;
create policy workspace_access on public.workspace_todos for select to anon using ((select public.workspace_session_valid()));
create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('event', 'note')),
  date date not null,
  time text not null default '' check (time = '' or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  title text not null default '' check (char_length(title) <= 120),
  content text not null default '' check (char_length(content) <= 1000000),
  revision integer not null default 1,
  check ((type = 'event' and char_length(btrim(title)) > 0) or (type = 'note' and title = '' and time = '' and char_length(btrim(content)) > 0))
);
create unique index if not exists one_note_per_date on public.calendar_entries(date) where type = 'note';
create index if not exists calendar_entries_date on public.calendar_entries(date);
create table if not exists public.timetable_lessons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  memo text not null default '' check (char_length(memo) <= 3000),
  days integer[] not null check (cardinality(days) between 1 and 7 and days <@ array[0,1,2,3,4,5,6] and array_position(days, null) is null),
  start text not null check (start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  "end" text not null check ("end" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "end" > start),
  color text not null,
  revision integer not null default 1
);
-- 기존 6색 제약도 갱신하며 수업 데이터는 유지합니다.
alter table public.timetable_lessons drop constraint if exists timetable_lessons_color_check;
alter table public.timetable_lessons add constraint timetable_lessons_color_check
  check (color in ('sage','blue','lavender','rose','amber','teal','lemon','coral','indigo','cocoa','slate'));

create table if not exists public.workspace_memo (
  id boolean primary key default true check (id),
  content text not null default '' check (char_length(content) <= 1000000),
  revision integer not null default 1
);
insert into public.workspace_memo(id) values(true) on conflict do nothing;
create table if not exists public.workspace_imports (
  fingerprint text primary key,
  created_at timestamptz not null default now()
);

alter table public.calendar_entries enable row level security;
alter table public.timetable_lessons enable row level security;
alter table public.workspace_memo enable row level security;
alter table public.workspace_imports enable row level security;
revoke all on public.calendar_entries, public.timetable_lessons, public.workspace_memo, public.workspace_imports from public, anon, authenticated;
-- 읽기는 세션 RLS, 쓰기는 아래 세션 검증 RPC로만 허용합니다.
grant select on public.calendar_entries, public.timetable_lessons, public.workspace_memo to anon;
drop policy if exists workspace_access on public.calendar_entries;
create policy workspace_access on public.calendar_entries for select to anon using ((select public.workspace_session_valid()));
drop policy if exists workspace_access on public.timetable_lessons;
create policy workspace_access on public.timetable_lessons for select to anon using ((select public.workspace_session_valid()));
drop policy if exists workspace_access on public.workspace_memo;
create policy workspace_access on public.workspace_memo for select to anon using ((select public.workspace_session_valid()));

create or replace function public.manage_workspace_data(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  current_item jsonb;
  target uuid;
  affected integer;
  import_fingerprint text;
begin
  if not public.workspace_session_valid() then
    raise exception 'Workspace session expired' using errcode = '42501';
  end if;
  -- 쓰기 순서를 통일해 노트 중복, 수업 시간 중복, 가져오기 충돌을 방지합니다.
  if action not in ('calendar_list', 'lesson_list', 'todo_list', 'memo_get') then
    lock table public.calendar_entries, public.timetable_lessons, public.workspace_memo, public.workspace_imports, public.workspace_todos in share row exclusive mode;
  end if;
  case action
    when 'todo_list' then null;
    when 'todo_save' then
      target := (payload->>'id')::uuid;
      select to_jsonb(t) into current_item from public.workspace_todos t where id = target;
      if current_item is not null and (payload->>'revision')::integer is distinct from (current_item->>'revision')::integer then
        return jsonb_build_object('error', 'conflict');
      elsif current_item is null and coalesce((payload->>'revision')::integer, 0) <> 0 then
        return jsonb_build_object('error', 'conflict');
      end if;
      if payload->>'resetTime' is not null and payload->>'resetTime' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        raise exception 'Invalid reset time' using errcode = '22023';
      end if;
      insert into public.workspace_todos(id, title, completed, reset_time, completed_at, priority)
      values(target, btrim(payload->>'title'), (payload->>'completed')::boolean,
        coalesce(payload->>'resetTime', current_item->>'reset_time'),
        case when (payload->>'completed')::boolean then
          case when current_item->'completed' = 'true'::jsonb and coalesce((payload->>'renewCompletion')::boolean, false) = false
            then coalesce((current_item->>'completed_at')::timestamptz, now()) else now() end
        else null end,
        coalesce((select max(priority) from public.workspace_todos), 0) + 1)
      on conflict(id) do update set title=excluded.title, completed=excluded.completed, reset_time=excluded.reset_time, completed_at=excluded.completed_at, revision=public.workspace_todos.revision+1;
    when 'todo_reorder', 'todo_delete_all' then
      if action = 'todo_delete_all' and payload->'confirmed' is distinct from 'true'::jsonb then
        raise exception 'Explicit confirmation required' using errcode = '22023';
      end if;
      -- 전체 항목의 ID와 revision을 비교해 다른 기기의 추가·삭제·변경을 감지합니다.
      if jsonb_typeof(payload->'items') is distinct from 'array' then
        raise exception 'Todo order must be an array' using errcode = '22023';
      end if;
      if jsonb_array_length(payload->'items') <> (select count(*) from public.workspace_todos where action = 'todo_reorder' or reset_time is null)
        or (select count(distinct (value->>'id')::uuid) from jsonb_array_elements(payload->'items')) <> jsonb_array_length(payload->'items')
        or exists (
          select 1 from jsonb_array_elements(payload->'items') p
          left join public.workspace_todos t on t.id = (p.value->>'id')::uuid
          where t.id is null or (action = 'todo_delete_all' and t.reset_time is not null) or t.revision is distinct from (p.value->>'revision')::integer
        ) then
        return jsonb_build_object('error', 'conflict');
      end if;
      if action = 'todo_delete_all' then
        -- 조건 없는 DELETE를 차단하는 서버에서도 확인한 항목만 삭제합니다.
        delete from public.workspace_todos t
        using jsonb_array_elements(payload->'items') p
        where t.id = (p.value->>'id')::uuid
          and t.revision = (p.value->>'revision')::integer and t.reset_time is null;
      else
      with ordered as (
        select (value->>'id')::uuid as id, ordinality::integer as position
        from jsonb_array_elements(payload->'items') with ordinality
      )
      update public.workspace_todos t set priority = o.position, revision = t.revision + 1
      from ordered o where t.id = o.id and t.priority <> o.position;
      end if;
    when 'todo_delete' then
      delete from public.workspace_todos where id=(payload->>'id')::uuid and revision=(payload->>'revision')::integer;
      if not found then return jsonb_build_object('error', 'conflict'); end if;
    when 'calendar_list' then null;
    when 'lesson_list' then null;
    when 'memo_get' then null;
    when 'calendar_save' then
      target := (payload->>'id')::uuid;
      select to_jsonb(c) into current_item from public.calendar_entries c where id = target;
      if current_item is not null and (current_item - 'revision') = (payload - 'revision') then null;
      elsif current_item is not null and (payload->>'revision')::integer is distinct from (current_item->>'revision')::integer then
        return jsonb_build_object('error', 'conflict');
      elsif current_item is null and coalesce((payload->>'revision')::integer, 0) > 0 then
        return jsonb_build_object('error', 'conflict');
      else
        insert into public.calendar_entries(id, type, date, time, title, content)
        values(target, payload->>'type', (payload->>'date')::date, coalesce(payload->>'time',''), coalesce(payload->>'title',''), coalesce(payload->>'content',''))
        on conflict (id) do update set type=excluded.type, date=excluded.date, time=excluded.time, title=excluded.title, content=excluded.content, revision=public.calendar_entries.revision+1;
      end if;
    when 'lesson_save' then
      target := (payload->>'id')::uuid;
      select to_jsonb(l) into current_item from public.timetable_lessons l where id = target;
      if current_item is not null and (current_item - 'revision') = (payload - 'revision') then null;
      elsif current_item is not null and (payload->>'revision')::integer is distinct from (current_item->>'revision')::integer then
        return jsonb_build_object('error', 'conflict');
      elsif current_item is null and coalesce((payload->>'revision')::integer, 0) > 0 then
        return jsonb_build_object('error', 'conflict');
      else
        if exists (select 1 from public.timetable_lessons l where l.id <> target and l.days && array(select jsonb_array_elements_text(payload->'days')::integer) and l.start < payload->>'end' and l."end" > payload->>'start') then
          return jsonb_build_object('error', 'overlap');
        end if;
        insert into public.timetable_lessons(id, name, memo, days, start, "end", color)
        values(target, payload->>'name', coalesce(payload->>'memo',''), array(select jsonb_array_elements_text(payload->'days')::integer), payload->>'start', payload->>'end', payload->>'color')
        on conflict(id) do update set name=excluded.name, memo=excluded.memo, days=excluded.days, start=excluded.start, "end"=excluded."end", color=excluded.color, revision=public.timetable_lessons.revision+1;
      end if;
    when 'calendar_delete' then
      delete from public.calendar_entries where id=(payload->>'id')::uuid and revision=(payload->>'revision')::integer;
      get diagnostics affected = row_count;
      if affected = 0 and exists(select 1 from public.calendar_entries where id=(payload->>'id')::uuid) then return jsonb_build_object('error','conflict'); end if;
    when 'lesson_delete' then
      delete from public.timetable_lessons where id=(payload->>'id')::uuid and revision=(payload->>'revision')::integer;
      get diagnostics affected = row_count;
      if affected = 0 and exists(select 1 from public.timetable_lessons where id=(payload->>'id')::uuid) then return jsonb_build_object('error','conflict'); end if;
    when 'memo_save' then
      select to_jsonb(m) into current_item from public.workspace_memo m where id;
      if payload->>'content' = current_item->>'content' then null;
      elsif (payload->>'revision')::integer is distinct from (current_item->>'revision')::integer then return jsonb_build_object('error','conflict');
      else update public.workspace_memo set content=payload->>'content', revision=revision+1 where id; end if;
    when 'import' then
      import_fingerprint := md5(payload::text);
      if not exists(select 1 from public.workspace_imports i where i.fingerprint = import_fingerprint) then
        for item in select value from jsonb_array_elements(coalesce(payload->'calendar','[]'::jsonb)) loop
          target := (item->>'id')::uuid;
          select to_jsonb(c) into current_item from public.calendar_entries c where id=target;
          if current_item is not null then
            if (current_item - 'revision') <> (item - 'revision') then raise exception 'Import conflicts with existing calendar entry' using errcode = 'P0002'; end if;
          else
            insert into public.calendar_entries(id,type,date,time,title,content) values(target,item->>'type',(item->>'date')::date,coalesce(item->>'time',''),coalesce(item->>'title',''),coalesce(item->>'content',''));
          end if;
        end loop;
        for item in select value from jsonb_array_elements(coalesce(payload->'lessons','[]'::jsonb)) loop
          target := (item->>'id')::uuid;
          select to_jsonb(l) into current_item from public.timetable_lessons l where id=target;
          if current_item is not null then
            if (current_item - 'revision') <> (item - 'revision') then raise exception 'Import conflicts with existing lesson' using errcode = 'P0002'; end if;
          else
            if exists (select 1 from public.timetable_lessons l where l.days && array(select jsonb_array_elements_text(item->'days')::integer) and l.start < item->>'end' and l."end" > item->>'start') then raise exception 'Import has overlapping lessons' using errcode = 'P0002'; end if;
            insert into public.timetable_lessons(id,name,memo,days,start,"end",color) values(target,item->>'name',coalesce(item->>'memo',''),array(select jsonb_array_elements_text(item->'days')::integer),item->>'start',item->>'end',item->>'color');
          end if;
        end loop;
        if coalesce(payload->>'memo','') <> '' then
          select to_jsonb(m) into current_item from public.workspace_memo m where id;
          if current_item->>'content' <> '' and current_item->>'content' <> payload->>'memo' then raise exception 'Import conflicts with server memo' using errcode = 'P0002'; end if;
          if current_item->>'content' = '' then update public.workspace_memo set content=payload->>'memo', revision=revision+1 where id; end if;
        end if;
        insert into public.workspace_imports values(import_fingerprint, now());
      end if;
      return jsonb_build_object('ok', true);
    else raise exception 'Unknown workspace data action';
  end case;
  if action like 'todo_%' then return (select coalesce(jsonb_agg(t order by t.priority, t.id),'[]'::jsonb) from public.workspace_todos t); end if;
  if action like 'calendar_%' then return (select coalesce(jsonb_agg(c order by c.date,c.time,c.id),'[]'::jsonb) from public.calendar_entries c); end if;
  if action like 'lesson_%' then return (select coalesce(jsonb_agg(l order by l.start,l.id),'[]'::jsonb) from public.timetable_lessons l); end if;
  return (select jsonb_build_object('content', content, 'revision', revision) from public.workspace_memo where id);
exception when no_data_found then
  return jsonb_build_object('error','import_conflict');
when unique_violation then
  return jsonb_build_object('error','duplicate');
end;
$$;
revoke all on function public.manage_workspace_data(text,jsonb) from public, anon, authenticated;
grant execute on function public.manage_workspace_data(text,jsonb) to anon;
notify pgrst, 'reload schema';
commit;
