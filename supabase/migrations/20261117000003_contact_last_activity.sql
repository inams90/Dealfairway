-- Track each contact's most recent activity so the client list and the
-- "no contact in 30+ days" follow-up list don't need to scan activity_log.

alter table public.contacts add column last_activity_at timestamptz;

create index contacts_user_last_activity_idx on public.contacts (user_id, last_activity_at);

create or replace function public.refresh_contact_last_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target uuid := coalesce(new.contact_id, old.contact_id);
begin
  update public.contacts c
     set last_activity_at = (select max(a.occurred_at) from public.activity_log a where a.contact_id = target)
   where c.id = target;
  if tg_op = 'UPDATE' and old.contact_id is distinct from new.contact_id then
    update public.contacts c
       set last_activity_at = (select max(a.occurred_at) from public.activity_log a where a.contact_id = old.contact_id)
     where c.id = old.contact_id;
  end if;
  return null;
end;
$$;

create trigger activity_log_refresh_contact
  after insert or update or delete on public.activity_log
  for each row execute function public.refresh_contact_last_activity();
