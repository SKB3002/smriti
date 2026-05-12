-- Second Brain — Supabase schema, RLS, indexes, pg_cron job
-- Apply via Supabase SQL editor or `supabase db push`.

-- ============================================================
-- 1. Extensions
-- ============================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_net";
create extension if not exists "pg_cron";
create extension if not exists "moddatetime";

-- ============================================================
-- 2. Tables
-- ============================================================

-- projects
create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text,
    color text,
    archived_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- tasks
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    project_id uuid not null references public.projects(id) on delete cascade,
    title text not null,
    notes text,
    status text not null default 'todo'
        check (status in ('todo', 'doing', 'done', 'blocked')),
    priority smallint not null default 0,
    priority_reason text,
    due_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- codenames
create table if not exists public.codenames (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    codename text not null,
    real_label text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, codename)
);

-- reminders
create table if not exists public.reminders (
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
    check (
        (kind = 'normal' and end_at is null and frequency_minutes is null) or
        (kind = 'persistent' and end_at is not null and frequency_minutes is not null and end_at > start_at)
    )
);

-- push_subscriptions
create table if not exists public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_agent text,
    disabled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. Indexes
-- ============================================================
create index if not exists idx_projects_user_archived
    on public.projects (user_id, archived_at);

create index if not exists idx_tasks_user_status
    on public.tasks (user_id, status);
create index if not exists idx_tasks_user_project
    on public.tasks (user_id, project_id);
create index if not exists idx_tasks_user_priority
    on public.tasks (user_id, priority desc);

create index if not exists idx_reminders_enabled_next
    on public.reminders (enabled, next_fire_at);
create index if not exists idx_reminders_user
    on public.reminders (user_id);

create index if not exists idx_codenames_user
    on public.codenames (user_id);

create index if not exists idx_push_user_disabled
    on public.push_subscriptions (user_id, disabled_at);

-- ============================================================
-- 4. updated_at triggers (moddatetime)
-- ============================================================
do $$
declare
    t text;
begin
    for t in
        select unnest(array['projects', 'tasks', 'reminders', 'codenames', 'push_subscriptions'])
    loop
        execute format(
            'drop trigger if exists set_updated_at on public.%I;
             create trigger set_updated_at
               before update on public.%I
               for each row execute procedure moddatetime(updated_at);',
            t, t
        );
    end loop;
end$$;

-- ============================================================
-- 5. Row Level Security
-- ============================================================
alter table public.projects             enable row level security;
alter table public.tasks                enable row level security;
alter table public.reminders            enable row level security;
alter table public.codenames            enable row level security;
alter table public.push_subscriptions   enable row level security;

-- projects
drop policy if exists "projects_owner_all" on public.projects;
create policy "projects_owner_all" on public.projects
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- tasks
drop policy if exists "tasks_owner_all" on public.tasks;
create policy "tasks_owner_all" on public.tasks
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- reminders: owner CRUD + service role read/update for cron
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

-- codenames
drop policy if exists "codenames_owner_all" on public.codenames;
create policy "codenames_owner_all" on public.codenames
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- push_subscriptions: owner CRUD + service role select for fire-due
drop policy if exists "push_owner_all" on public.push_subscriptions;
create policy "push_owner_all" on public.push_subscriptions
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "push_service_select" on public.push_subscriptions;
create policy "push_service_select" on public.push_subscriptions
    for select
    using (auth.role() = 'service_role');

-- ============================================================
-- 6. pg_cron job — fire due reminders every minute
-- ============================================================
-- NOTE: Replace <EDGE_FN_URL> and <SERVICE_ROLE_KEY> before applying.
-- Or set them as Vault secrets and reference here.
select cron.schedule(
    'fire_due_reminders',
    '* * * * *',
    $$
    select net.http_post(
        url := '<EDGE_FN_URL>',
        headers := jsonb_build_object(
            'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('ts', now())
    );
    $$
);
