-- workspace-access.sql을 먼저 적용한 뒤 Supabase SQL Editor에서 실행합니다.
-- 기존 메모함에도 이 파일을 다시 실행하면 데이터 유지 상태로 하위 폴더가 추가됩니다.
begin;

create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
alter table public.note_folders add column if not exists parent_id uuid
  references public.note_folders(id) on delete cascade;
create index if not exists note_folders_parent_id_idx on public.note_folders(parent_id);
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.note_folders(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  content text not null default '' check (char_length(content) <= 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_folder_id_idx on public.notes(folder_id);
create index if not exists notes_created_at_idx on public.notes(created_at desc);

alter table public.note_folders enable row level security;
alter table public.notes enable row level security;
revoke all on public.note_folders, public.notes from public, anon, authenticated;
grant select, delete on public.note_folders to anon;
-- ID는 서버에서 생성하고 상위 폴더는 생성 시에만 지정합니다. 순환 계층을 방지합니다.
grant insert (name, parent_id), update (name) on public.note_folders to anon;
grant select, insert, update, delete on public.notes to anon;
drop policy if exists workspace_access on public.note_folders;
create policy workspace_access on public.note_folders for all to anon
  using ((select public.workspace_session_valid()))
  with check ((select public.workspace_session_valid()));
drop policy if exists workspace_access on public.notes;
create policy workspace_access on public.notes for all to anon
  using ((select public.workspace_session_valid()))
  with check ((select public.workspace_session_valid()));

-- 한 요청 안에서 저장과 목록 조회를 처리합니다. 호출자의 RLS 권한을 유지합니다.
create or replace function public.manage_notes(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  affected integer;
begin
  if not public.workspace_session_valid() then
    raise exception 'Workspace session expired' using errcode = '42501';
  end if;
  case action
    when 'list' then null;
    when 'create_folder' then
      insert into public.note_folders(name, parent_id)
      values (btrim(payload->>'name'), nullif(payload->>'parent_id', '')::uuid);
    when 'rename_folder' then
      update public.note_folders set name = btrim(payload->>'name') where id = (payload->>'id')::uuid;
    when 'delete_folder' then
      delete from public.note_folders where id = (payload->>'id')::uuid;
    when 'create_note' then
      insert into public.notes(folder_id, title, content)
      values ((payload->>'folder_id')::uuid, btrim(payload->>'title'), coalesce(payload->>'content', ''));
    when 'update_note' then
      update public.notes set folder_id = (payload->>'folder_id')::uuid,
        title = btrim(payload->>'title'), content = coalesce(payload->>'content', ''), updated_at = clock_timestamp()
      where id = (payload->>'id')::uuid;
    when 'move_note' then
      update public.notes set folder_id = (payload->>'folder_id')::uuid, updated_at = clock_timestamp()
      where id = (payload->>'id')::uuid;
    when 'delete_note' then
      delete from public.notes where id = (payload->>'id')::uuid;
    else raise exception 'Unknown notes action' using errcode = '22023';
  end case;
  if action <> 'list' then
    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'Item no longer exists; reload notes' using errcode = 'P0002';
    end if;
  end if;
  return jsonb_build_object(
    'folders', (select coalesce(jsonb_agg(f order by f.created_at, f.id), '[]'::jsonb) from public.note_folders f),
    'notes', (select coalesce(jsonb_agg(n order by n.created_at desc, n.id), '[]'::jsonb) from public.notes n)
  );
end;
$$;
revoke all on function public.manage_notes(text, jsonb) from public, anon, authenticated;
grant execute on function public.manage_notes(text, jsonb) to anon;

-- 처음 폴더가 없을 때만 임시 폴더를 만듭니다. 재실행해도 기존 폴더는 유지합니다.
insert into public.note_folders(name)
select '임시 폴더' where not exists (select 1 from public.note_folders);

notify pgrst, 'reload schema';
commit;
