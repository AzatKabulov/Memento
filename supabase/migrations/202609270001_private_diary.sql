-- Run in the Memento Supabase project before enabling cloud backup in the app.
-- The publishable client key cannot bypass these owner checks.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memento-private', 'memento-private', false, 262144000,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp',
        'image/avif', 'image/gif', 'video/mp4', 'video/quicktime', 'video/x-m4v']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.memento_moments (
  owner_id uuid not null references auth.users(id) on delete cascade,
  diary_date date not null,
  revision bigint not null check (revision > 0),
  mutation_id uuid not null,
  kind text check (kind in ('photo', 'video')),
  caption text not null default '' check (char_length(caption) <= 500),
  source text check (source in ('camera', 'library')),
  frame_y text check (frame_y in ('top', 'center', 'bottom')),
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 60000),
  media_path text,
  media_bytes bigint check (media_bytes is null or media_bytes between 1 and 262144000),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (owner_id, diary_date),
  constraint live_moment_has_media check (
    deleted_at is not null or (kind is not null and media_path is not null and media_bytes is not null)
  ),
  constraint media_belongs_to_owner check (
    media_path is null or left(media_path, length(owner_id::text) + 1) = owner_id::text || '/'
  )
);

alter table public.memento_moments enable row level security;
revoke all on public.memento_moments from anon, authenticated;
grant select on public.memento_moments to authenticated;

create policy "Read own diary" on public.memento_moments
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "Read own diary files" on storage.objects
  for select to authenticated
  using (bucket_id = 'memento-private' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Upload own diary files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memento-private' and (storage.foldername(name))[1] = (select auth.uid()::text));

create or replace function public.memento_apply_change(
  p_date date,
  p_expected_revision bigint,
  p_mutation_id uuid,
  p_deleted boolean,
  p_kind text default null,
  p_caption text default '',
  p_source text default null,
  p_frame_y text default null,
  p_duration_ms integer default null,
  p_media_path text default null,
  p_media_bytes bigint default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_current public.memento_moments%rowtype;
  v_revision bigint;
begin
  if v_owner is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid revision';
  end if;
  if p_deleted is not true then
    if p_kind not in ('photo', 'video') or p_source not in ('camera', 'library')
       or p_frame_y not in ('top', 'center', 'bottom')
       or p_media_path is null or p_media_bytes is null or p_media_bytes < 1
       or p_media_bytes > 262144000 or char_length(p_caption) > 500 then
      raise exception 'Invalid moment';
    end if;
    if left(p_media_path, length(v_owner::text) + 1) <> v_owner::text || '/'
       or not exists (
         select 1 from storage.objects
         where bucket_id = 'memento-private' and name = p_media_path
           and metadata->>'size' = p_media_bytes::text
       ) then
      raise exception 'Private media is missing or belongs to another account' using errcode = '42501';
    end if;
  end if;

  select * into v_current from public.memento_moments
    where owner_id = v_owner and diary_date = p_date for update;
  if found and v_current.mutation_id = p_mutation_id then
    return jsonb_build_object('status', 'applied', 'revision', v_current.revision);
  end if;
  if (not found and p_expected_revision <> 0)
     or (found and v_current.revision <> p_expected_revision) then
    return jsonb_build_object('status', 'conflict', 'revision', coalesce(v_current.revision, 0));
  end if;

  v_revision := p_expected_revision + 1;
  insert into public.memento_moments as target (
    owner_id, diary_date, revision, mutation_id, kind, caption, source, frame_y,
    duration_ms, media_path, media_bytes, deleted_at, updated_at
  ) values (
    v_owner, p_date, v_revision, p_mutation_id,
    case when p_deleted then null else p_kind end,
    case when p_deleted then '' else p_caption end,
    case when p_deleted then null else p_source end,
    case when p_deleted then null else p_frame_y end,
    case when p_deleted then null else p_duration_ms end,
    case when p_deleted then null else p_media_path end,
    case when p_deleted then null else p_media_bytes end,
    case when p_deleted then now() else null end, now()
  ) on conflict (owner_id, diary_date) do update set
    revision = excluded.revision,
    mutation_id = excluded.mutation_id,
    kind = excluded.kind,
    caption = excluded.caption,
    source = excluded.source,
    frame_y = excluded.frame_y,
    duration_ms = excluded.duration_ms,
    media_path = excluded.media_path,
    media_bytes = excluded.media_bytes,
    deleted_at = excluded.deleted_at,
    updated_at = excluded.updated_at
  where target.revision = p_expected_revision
  returning target.revision into v_revision;
  if not found then
    return jsonb_build_object('status', 'conflict', 'revision', null);
  end if;
  return jsonb_build_object('status', 'applied', 'revision', v_revision);
end;
$$;

revoke all on function public.memento_apply_change(date, bigint, uuid, boolean, text, text, text, text, integer, text, bigint) from public, anon;
grant execute on function public.memento_apply_change(date, bigint, uuid, boolean, text, text, text, text, integer, text, bigint) to authenticated;
