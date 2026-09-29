-- Apply after 202609270001_private_diary.sql to preserve manual calendar crops in cloud backup.

alter table public.memento_moments
  add column if not exists focal_x integer check (focal_x between 0 and 100),
  add column if not exists focal_y integer check (focal_y between 0 and 100);

update public.memento_moments
set focal_x = 50
where focal_x is null;

update public.memento_moments
set focal_y = case frame_y when 'top' then 0 when 'bottom' then 100 else 50 end
where focal_y is null;

alter table public.memento_moments
  alter column focal_x set default 50,
  alter column focal_x set not null,
  alter column focal_y set default 50,
  alter column focal_y set not null;

create or replace function public.memento_apply_change_v2(
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
  p_media_bytes bigint default null,
  p_focal_x integer default null,
  p_focal_y integer default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_deleted is not true and
     (p_focal_x is null or p_focal_x not between 0 and 100 or
      p_focal_y is null or p_focal_y not between 0 and 100) then
    raise exception 'Invalid photo position';
  end if;

  v_result := public.memento_apply_change(
    p_date, p_expected_revision, p_mutation_id, p_deleted, p_kind,
    p_caption, p_source, p_frame_y, p_duration_ms, p_media_path, p_media_bytes
  );

  if v_result->>'status' = 'applied' and p_deleted is not true then
    update public.memento_moments
    set focal_x = p_focal_x, focal_y = p_focal_y
    where owner_id = (select auth.uid())
      and diary_date = p_date
      and mutation_id = p_mutation_id;
  end if;
  return v_result;
end;
$$;

revoke all on function public.memento_apply_change_v2(date, bigint, uuid, boolean, text, text, text, text, integer, text, bigint, integer, integer)
  from public, anon;
grant execute on function public.memento_apply_change_v2(date, bigint, uuid, boolean, text, text, text, text, integer, text, bigint, integer, integer)
  to authenticated;

notify pgrst, 'reload schema';
