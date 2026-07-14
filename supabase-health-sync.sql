-- CutCoach Health-Cloud 5.1
-- Einmal vollständig im Supabase SQL Editor ausführen.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cutcoach_step_sync (
  token_hash bytea not null,
  day date not null,
  steps integer not null check (steps between 0 and 100000),
  updated_at timestamptz not null default now(),
  primary key (token_hash, day)
);

alter table public.cutcoach_step_sync enable row level security;

revoke all on table public.cutcoach_step_sync from anon, authenticated;

create or replace function public.cutcoach_upsert_steps(
  p_sync_token text,
  p_day date,
  p_steps integer
)
returns table (steps integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash bytea;
begin
  if p_sync_token is null or p_sync_token !~ '^[A-Za-z0-9_-]{24,80}$' then
    raise exception 'invalid sync token';
  end if;
  if p_day is null or p_day > current_date + 1 or p_day < current_date - 366 then
    raise exception 'invalid day';
  end if;
  if p_steps is null or p_steps < 0 or p_steps > 100000 then
    raise exception 'invalid steps';
  end if;

  v_hash := digest(p_sync_token, 'sha256');

  insert into public.cutcoach_step_sync as target (token_hash, day, steps, updated_at)
  values (v_hash, p_day, p_steps, now())
  on conflict (token_hash, day)
  do update set
    steps = excluded.steps,
    updated_at = excluded.updated_at;

  return query
  select target.steps, target.updated_at
  from public.cutcoach_step_sync as target
  where target.token_hash = v_hash and target.day = p_day;
end;
$$;

create or replace function public.cutcoach_get_steps(
  p_sync_token text,
  p_day date
)
returns table (steps integer, updated_at timestamptz)
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare
  v_hash bytea;
begin
  if p_sync_token is null or p_sync_token !~ '^[A-Za-z0-9_-]{24,80}$' then
    raise exception 'invalid sync token';
  end if;
  if p_day is null or p_day > current_date + 1 or p_day < current_date - 366 then
    raise exception 'invalid day';
  end if;

  v_hash := digest(p_sync_token, 'sha256');

  return query
  select source.steps, source.updated_at
  from public.cutcoach_step_sync as source
  where source.token_hash = v_hash and source.day = p_day
  limit 1;
end;
$$;

revoke all on function public.cutcoach_upsert_steps(text,date,integer) from public;
revoke all on function public.cutcoach_get_steps(text,date) from public;

grant execute on function public.cutcoach_upsert_steps(text,date,integer) to anon, authenticated;
grant execute on function public.cutcoach_get_steps(text,date) to anon, authenticated;
