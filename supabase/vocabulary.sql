-- workspace-access.sql 적용 후 실행합니다. 재실행해도 단어를 유지합니다.
begin;
create or replace function public.valid_vocabulary_meanings(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) = 'array' then
    jsonb_array_length(value) between 1 and 50 and not exists (
      select 1 from jsonb_array_elements(value) item
      where jsonb_typeof(item) is distinct from 'object'
        or jsonb_typeof(item->'part') is distinct from 'string'
        or coalesce(item->>'part', '') not in ('명사', '동사', '형용사', '부사', '대명사', '전치사', '접속사', '감탄사', '관사', '숙어', '기타')
        or jsonb_typeof(item->'text') is distinct from 'string'
        or char_length(btrim(coalesce(item->>'text', ''))) not between 1 and 1000
    ) else false end
$$;
create table if not exists public.vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  word text not null check (char_length(btrim(word)) between 1 and 120),
  meanings jsonb not null check (public.valid_vocabulary_meanings(meanings)),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now()
);
alter table public.vocabulary_words enable row level security;
revoke all on public.vocabulary_words from public, anon, authenticated;
grant select on public.vocabulary_words to anon;
drop policy if exists workspace_access on public.vocabulary_words;
create policy workspace_access on public.vocabulary_words for select to anon using ((select public.workspace_session_valid()));

create or replace function public.manage_vocabulary(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.workspace_session_valid() then
    raise exception 'Workspace session expired' using errcode = '42501';
  end if;
  case action
    when 'list' then null;
    when 'save' then
      if nullif(payload->>'id', '') is null then
        insert into public.vocabulary_words(word, meanings) values (btrim(payload->>'word'), payload->'meanings');
      else
        update public.vocabulary_words set word = btrim(payload->>'word'), meanings = payload->'meanings', revision = revision + 1
          where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
        if not found then return jsonb_build_object('error', 'conflict'); end if;
      end if;
    when 'delete' then
      delete from public.vocabulary_words where id = (payload->>'id')::uuid and revision = (payload->>'revision')::integer;
      if not found then return jsonb_build_object('error', 'conflict'); end if;
    else raise exception 'Invalid action' using errcode = '22023';
  end case;
  return (select coalesce(jsonb_agg(to_jsonb(w) order by lower(w.word), w.id), '[]'::jsonb) from public.vocabulary_words w);
end;
$$;
revoke all on function public.manage_vocabulary(text, jsonb) from public, anon, authenticated;
grant execute on function public.manage_vocabulary(text, jsonb) to anon;
notify pgrst, 'reload schema';
commit;
