-- Schedule the fire-due Edge Function to run every minute.
-- Apply AFTER deploying the Edge Function (so you have its URL).
--
-- Replace the placeholders below and run in Supabase SQL editor.
--
--   <EDGE_FN_URL>      = https://<project-ref>.supabase.co/functions/v1/fire-due
--   <SERVICE_ROLE_KEY> = your service_role key (Settings → API → service_role)
--
-- These two go inside the cron body, not as env vars.

-- Remove any previous schedule first (idempotent re-apply).
select cron.unschedule('fire_due_reminders') where exists (
    select 1 from cron.job where jobname = 'fire_due_reminders'
);

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

-- Inspect recent runs:
--   select * from cron.job_run_details order by start_time desc limit 10;
