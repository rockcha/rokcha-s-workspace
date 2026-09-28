-- 기존 workspace-access.sql 적용 후 한 번 실행합니다. 파일 원본은 Google Drive에 저장됩니다.
begin;
create table if not exists public.material_folders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.material_folders(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists material_folders_parent_idx on public.material_folders(parent_id);
create table if not exists public.materials (
  drive_id text primary key check (char_length(drive_id) between 1 and 256 and drive_id ~ '^[a-zA-Z0-9_-]+$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  url text not null check (char_length(url) <= 4096 and url ~ '^https://(drive|docs)\.google\.com/[^[:space:]]*$'),
  description text not null default '' check (char_length(description) <= 5000),
  created_at timestamptz not null default now()
);
-- 기존 자료는 최상위에 유지합니다. 폴더를 삭제해도 자료는 삭제하지 않습니다.
alter table public.materials add column if not exists folder_id uuid references public.material_folders(id) on delete set null;
create index if not exists materials_folder_idx on public.materials(folder_id);
alter table public.material_folders enable row level security;
revoke all on public.material_folders from public, anon, authenticated;
grant select, delete on public.material_folders to anon;
grant insert(name, parent_id), update(name) on public.material_folders to anon;
drop policy if exists workspace_access on public.material_folders;
create policy workspace_access on public.material_folders for all to anon
  using ((select public.workspace_session_valid())) with check ((select public.workspace_session_valid()));
alter table public.materials enable row level security;
revoke all on public.materials from public, anon, authenticated;
grant select, insert, update, delete on public.materials to anon;
drop policy if exists workspace_access on public.materials;
create policy workspace_access on public.materials for all to anon
  using ((select public.workspace_session_valid())) with check ((select public.workspace_session_valid()));

create or replace function public.manage_materials(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if not public.workspace_session_valid() then
    raise exception 'Workspace session expired' using errcode = '42501';
  end if;
  case action
    when 'list' then null;
    when 'create_folder' then
      insert into public.material_folders(name, parent_id) values (btrim(payload->>'name'), nullif(payload->>'parent_id', '')::uuid);
    when 'rename_folder' then
      update public.material_folders set name = btrim(payload->>'name') where id = (payload->>'id')::uuid;
      if not found then raise exception 'Folder no longer exists' using errcode = 'P0002'; end if;
    when 'delete_folder' then
      delete from public.material_folders where id = (payload->>'id')::uuid;
      if not found then raise exception 'Folder no longer exists' using errcode = 'P0002'; end if;
    when 'save' then
      insert into public.materials(drive_id, title, url, description, folder_id)
      values (payload->>'id', btrim(payload->>'title'), payload->>'url', coalesce(payload->>'description', ''), nullif(payload->>'folder_id', '')::uuid)
      on conflict (drive_id) do update set title = excluded.title, url = excluded.url, description = excluded.description, folder_id = excluded.folder_id;
    when 'delete' then delete from public.materials where drive_id = payload->>'id';
    else raise exception 'Invalid action' using errcode = '22023';
  end case;
  return jsonb_build_object(
    'files', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc, m.drive_id), '[]'::jsonb) from public.materials m),
    'folders', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at, f.id), '[]'::jsonb) from public.material_folders f)
  );
end;
$$;
revoke all on function public.manage_materials(text, jsonb) from public, anon, authenticated;
grant execute on function public.manage_materials(text, jsonb) to anon;
notify pgrst, 'reload schema';
commit;
