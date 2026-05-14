-- Migration 0003: explicit Data API grants for supabase-js / PostgREST.
--
-- Background: Supabase is changing the default so new tables in `public` are
-- NOT exposed to the Data API without an explicit GRANT. Enforced on new
-- projects from 2026-05-30 and on existing projects from 2026-10-30.
--
-- RLS still gates row visibility; grants only open the table to the role.

grant select, insert, update, delete on
    public.projects,
    public.tasks,
    public.reminders,
    public.codenames,
    public.push_subscriptions
to authenticated;

grant select, insert, update, delete on
    public.projects,
    public.tasks,
    public.reminders,
    public.codenames,
    public.push_subscriptions
to service_role;
