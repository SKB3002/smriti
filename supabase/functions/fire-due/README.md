# fire-due Edge Function

Triggered every minute by `pg_cron`. Queries reminders where
`enabled = true AND next_fire_at <= now()`, fans out one HMAC-signed POST
per (reminder × active subscription) to the FastAPI backend at
`/internal/fire-due`.

## Deploy

Prerequisites: install the Supabase CLI
(`npm i -g supabase` or `scoop install supabase`) and `supabase login`.

```powershell
cd c:\Suyash_Projects\second-brain
supabase link --project-ref <YOUR-PROJECT-REF>
supabase functions deploy fire-due --no-verify-jwt
```

`--no-verify-jwt` is required because `pg_cron` calls this endpoint with a
service-role bearer, not a Supabase Auth JWT — the function's own logic
trusts the call by virtue of being invoked from inside Supabase.

## Set secrets

```powershell
supabase secrets set API_BASE=https://<your-render-domain>.onrender.com
supabase secrets set INTERNAL_HMAC_SECRET=<paste from backend .env>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## Schedule the cron

After the function is deployed and secrets are set:

1. Open `supabase/cron.sql`.
2. Replace `<EDGE_FN_URL>` with the deployed URL
   (shown by `supabase functions deploy`, typically
   `https://<project-ref>.supabase.co/functions/v1/fire-due`).
3. Replace `<SERVICE_ROLE_KEY>` with your service_role key.
4. Paste into the Supabase SQL editor and run.

## Verify

- `select * from cron.job_run_details order by start_time desc limit 5;`
  should show recent runs returning HTTP 200.
- Edge Function logs in the Supabase dashboard
  (Edge Functions → fire-due → Logs) should show invocations every minute.
- Create a Normal reminder for the next minute → push should land.
