-- Phase 1 CRM tables: contacts, inquiries, tasks, activity_log.
-- Every table: user_id (defaults to the signed-in user), created_at, updated_at, RLS.
-- Links between tables use composite foreign keys (id, user_id) so a row can only
-- ever point at another row owned by the same user.

------------------------------------------------------------------ contacts
create table public.contacts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  first_name        text not null default '' check (char_length(first_name) <= 100),
  last_name         text not null default '' check (char_length(last_name) <= 100),
  email             text check (char_length(email) <= 320),
  phone             text check (char_length(phone) <= 40),
  type              text not null default 'other'
                    check (type in ('buyer', 'seller', 'landlord', 'tenant', 'investor', 'other')),
  property_interest text
                    check (property_interest in ('residential', 'commercial', 'industrial')),
  source            text not null default 'other'
                    check (source in ('miltonlease', 'referral', 'walk_in', 'phone', 'other')),
  notes             text not null default '' check (char_length(notes) <= 20000),
  tags              text[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id)
);

create index contacts_user_id_idx on public.contacts (user_id);
create index contacts_user_email_idx on public.contacts (user_id, lower(email));
create index contacts_user_phone_idx on public.contacts (user_id, phone);
create index contacts_tags_idx on public.contacts using gin (tags);

------------------------------------------------------------------ inquiries
create table public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id  uuid,
  channel     text not null default 'web_form'
              check (channel in ('web_form', 'phone', 'text', 'email', 'walk_in')),
  message     text not null default '' check (char_length(message) <= 20000),
  status      text not null default 'new'
              check (status in ('new', 'in_progress', 'converted', 'closed')),
  raw_payload jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (contact_id, user_id) references public.contacts (id, user_id)
    on delete set null (contact_id)
);

create index inquiries_user_id_idx on public.inquiries (user_id);
create index inquiries_contact_id_idx on public.inquiries (contact_id);
create index inquiries_user_created_idx on public.inquiries (user_id, created_at desc);

------------------------------------------------------------------ tasks
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 500),
  notes         text not null default '' check (char_length(notes) <= 20000),
  due_at        timestamptz,
  priority      text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status        text not null default 'open' check (status in ('open', 'done', 'snoozed')),
  snoozed_until timestamptz,
  contact_id    uuid,
  inquiry_id    uuid,
  sort_order    double precision not null default 0,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (contact_id, user_id) references public.contacts (id, user_id)
    on delete set null (contact_id),
  foreign key (inquiry_id, user_id) references public.inquiries (id, user_id)
    on delete set null (inquiry_id)
);

create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_due_at_idx on public.tasks (due_at);
create index tasks_user_status_due_idx on public.tasks (user_id, status, due_at);
create index tasks_contact_id_idx on public.tasks (contact_id);
create index tasks_inquiry_id_idx on public.tasks (inquiry_id);

------------------------------------------------------------------ activity_log
create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id  uuid not null,
  kind        text not null
              check (kind in ('note', 'call', 'email', 'text', 'meeting', 'status_change')),
  body        text not null default '' check (char_length(body) <= 20000),
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (contact_id, user_id) references public.contacts (id, user_id)
    on delete cascade
);

create index activity_log_user_id_idx on public.activity_log (user_id);
create index activity_log_contact_occurred_idx on public.activity_log (contact_id, occurred_at desc);

------------------------------------------------------------------ updated_at triggers
create trigger contacts_set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger inquiries_set_updated_at before update on public.inquiries
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger activity_log_set_updated_at before update on public.activity_log
  for each row execute function public.set_updated_at();

------------------------------------------------------------------ Row Level Security
do $$
declare
  t text;
begin
  foreach t in array array['contacts', 'inquiries', 'tasks', 'activity_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: read own" on public.%1$I for select to authenticated
         using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: insert own" on public.%1$I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: update own" on public.%1$I for update to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: delete own" on public.%1$I for delete to authenticated
         using ((select auth.uid()) = user_id)', t);
  end loop;
end
$$;

-- Anonymous (logged-out) visitors get no access to CRM data at all.
revoke all on public.contacts, public.inquiries, public.tasks, public.activity_log from anon;
revoke all on public.profiles from anon;
