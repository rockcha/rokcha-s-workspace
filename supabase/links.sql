-- workspace-access.sql을 먼저 적용한 뒤 Supabase SQL Editor에서 실행합니다.
-- 기존 링크함에도 이 파일을 다시 실행하면 데이터 유지 상태로 하위 폴더가 추가됩니다.
begin;

create table if not exists public.link_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
alter table public.link_folders add column if not exists parent_id uuid
  references public.link_folders(id) on delete cascade;
create index if not exists link_folders_parent_id_idx on public.link_folders(parent_id);
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.link_folders(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  url text not null check (char_length(url) <= 4096 and url ~ '^https?://[^[:space:]/?#]+[^[:space:]]*$'),
  image_url text not null default '' check (char_length(image_url) <= 4096 and (image_url = '' or image_url ~ '^https?://[^[:space:]/?#]+[^[:space:]]*$')),
  content text not null default '' check (char_length(content) <= 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists links_folder_id_idx on public.links(folder_id);
create index if not exists links_created_at_idx on public.links(created_at desc);

alter table public.link_folders enable row level security;
alter table public.links enable row level security;
revoke all on public.link_folders, public.links from public, anon, authenticated;
grant select, delete on public.link_folders to anon;
-- ID는 서버에서 생성하고 상위 폴더는 생성 시에만 지정합니다. 순환 계층을 방지합니다.
grant insert (name, parent_id), update (name) on public.link_folders to anon;
grant select, insert, update, delete on public.links to anon;
drop policy if exists workspace_access on public.link_folders;
create policy workspace_access on public.link_folders for all to anon
  using ((select public.workspace_session_valid()))
  with check ((select public.workspace_session_valid()));
drop policy if exists workspace_access on public.links;
create policy workspace_access on public.links for all to anon
  using ((select public.workspace_session_valid()))
  with check ((select public.workspace_session_valid()));


-- 상위 폴더 직접 수정 권한은 열지 않고, 검증된 이동 함수만 허용합니다.
create or replace function public.move_link_folder(folder_id uuid, destination_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.workspace_session_valid() then
    raise exception 'Workspace session expired' using errcode = '42501';
  end if;
  -- 동시 이동과 삭제를 직렬화해 서로를 부모로 삼는 경쟁 조건을 방지합니다.
  lock table public.link_folders in share row exclusive mode;
  if not exists (select 1 from public.link_folders where id = folder_id) then
    raise exception 'Folder no longer exists' using errcode = 'P0002';
  end if;
  if destination_id is not null and not exists (select 1 from public.link_folders where id = destination_id) then
    raise exception 'Destination no longer exists' using errcode = 'P0002';
  end if;
  if exists (
    with recursive descendants as (
      select id from public.link_folders where id = folder_id
      union
      select f.id from public.link_folders f join descendants d on f.parent_id = d.id
    )
    select 1 from descendants where id = destination_id
  ) then
    raise exception 'Cannot move folder into itself or a descendant' using errcode = '22023';
  end if;
  update public.link_folders set parent_id = destination_id where id = folder_id;
end;
$$;
revoke all on function public.move_link_folder(uuid, uuid) from public, anon, authenticated;
grant execute on function public.move_link_folder(uuid, uuid) to anon;

-- 한 요청 안에서 저장과 목록 조회를 처리합니다. 호출자의 RLS 권한을 유지합니다.
create or replace function public.manage_links(action text, payload jsonb default '{}'::jsonb)
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
      insert into public.link_folders(name, parent_id)
      values (btrim(payload->>'name'), nullif(payload->>'parent_id', '')::uuid);
    when 'move_folder' then
      perform public.move_link_folder((payload->>'id')::uuid, nullif(payload->>'parent_id', '')::uuid);
    when 'rename_folder' then
      update public.link_folders set name = btrim(payload->>'name') where id = (payload->>'id')::uuid;
    when 'delete_folder' then
      delete from public.link_folders where id = (payload->>'id')::uuid;
    when 'create_link' then
      insert into public.links(folder_id, title, content, url, image_url)
      values ((payload->>'folder_id')::uuid, btrim(payload->>'title'), coalesce(payload->>'content', ''), btrim(payload->>'url'), coalesce(payload->>'image_url', ''));
    when 'update_link' then
      update public.links set folder_id = (payload->>'folder_id')::uuid,
        title = btrim(payload->>'title'), content = coalesce(payload->>'content', ''), url = btrim(payload->>'url'), image_url = coalesce(payload->>'image_url', ''), updated_at = clock_timestamp()
      where id = (payload->>'id')::uuid;
    when 'move_link' then
      update public.links set folder_id = (payload->>'folder_id')::uuid, updated_at = clock_timestamp()
      where id = (payload->>'id')::uuid;
    when 'delete_link' then
      delete from public.links where id = (payload->>'id')::uuid;
    else raise exception 'Unknown links action' using errcode = '22023';
  end case;
  if action <> 'list' then
    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'Item no longer exists; reload links' using errcode = 'P0002';
    end if;
  end if;
  return jsonb_build_object(
    'folders', (select coalesce(jsonb_agg(f order by f.created_at, f.id), '[]'::jsonb) from public.link_folders f),
    'links', (select coalesce(jsonb_agg(n order by n.created_at desc, n.id), '[]'::jsonb) from public.links n)
  );
end;
$$;
revoke all on function public.manage_links(text, jsonb) from public, anon, authenticated;
grant execute on function public.manage_links(text, jsonb) to anon;

-- 처음 폴더가 없을 때만 임시 폴더를 만듭니다. 재실행해도 기존 폴더는 유지합니다.
insert into public.link_folders(name)
select '임시 폴더' where not exists (select 1 from public.link_folders);

notify pgrst, 'reload schema';
commit;
