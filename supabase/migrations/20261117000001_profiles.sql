-- Profiles: one row per agent, created automatically on sign-up.

-- Shared helper: keep updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 200),
  brokerage   text not null default '' check (char_length(brokerage) <= 200),
  phone       text not null default '' check (char_length(phone) <= 40),
  reco_number text check (char_length(reco_number) <= 40), -- RECO registration number (optional)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No delete policy: a profile is removed only when the auth user is deleted (cascade).

-- Create the profile row as soon as a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 200)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
