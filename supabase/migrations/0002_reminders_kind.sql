-- Migration 0002: reminders gain a kind + absolute timestamps.
--
-- Before: time-of-day slots only (time_slot_start, time_slot_end, timezone).
-- After:  kind in (normal, persistent) + start_at + end_at (timestamptz).
--
-- SAFE TO APPLY ONLY IF reminders is empty (we have no production data yet).
-- Run in the Supabase SQL editor.

begin;

drop table if exists public.reminders cascade;

create table public.reminders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    task_id uuid not null references public.tasks(id) on delete cascade,
    project_id uuid not null references public.projects(id) on delete cascade,
    kind text not null check (kind in ('normal', 'persistent')),
    start_at timestamptz not null,
    end_at timestamptz,
    frequency_minutes int check (frequency_minutes is null or frequency_minutes >= 1),
    is_stealth boolean not null default false,
    codename_id uuid references public.codenames(id) on delete set null,
    last_fired_at timestamptz,
    next_fire_at timestamptz,
    enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- shape rules per kind
    check (
        (kind = 'normal' and end_at is null and frequency_minutes is null) or
        (kind = 'persistent' and end_at is not null and frequency_minutes is not null and end_at > start_at)
    )
);

create index idx_reminders_enabled_next
    on public.reminders (enabled, next_fire_at);
create index idx_reminders_user
    on public.reminders (user_id);

-- updated_at trigger
drop trigger if exists set_updated_at on public.reminders;
create trigger set_updated_at
    before update on public.reminders
    for each row execute procedure moddatetime(updated_at);

-- RLS
alter table public.reminders enable row level security;

drop policy if exists "reminders_owner_all" on public.reminders;
create policy "reminders_owner_all" on public.reminders
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "reminders_service_select" on public.reminders;
create policy "reminders_service_select" on public.reminders
    for select
    using (auth.role() = 'service_role');

drop policy if exists "reminders_service_update" on public.reminders;
create policy "reminders_service_update" on public.reminders
    for update
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

commit;
