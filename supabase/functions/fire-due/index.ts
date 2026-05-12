// Supabase Edge Function: fire-due
//
// Triggered every minute by pg_cron. Loads reminders that are due, fans out
// one HMAC-signed POST per (reminder × active subscription) to the FastAPI
// backend at /internal/fire-due. The backend handles the push + bookkeeping
// (next_fire_at, disable on subscription-gone, etc.) — this function is a
// pure dispatcher.
//
// Required env (set with `supabase secrets set`):
//   SUPABASE_URL                  (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-provided)
//   API_BASE                      e.g. https://second-brain-api.onrender.com
//   INTERNAL_HMAC_SECRET          must match backend INTERNAL_HMAC_SECRET

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_BASE = Deno.env.get("API_BASE")!;
const HMAC_SECRET = Deno.env.get("INTERNAL_HMAC_SECRET")!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function hmacSign(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Reminder = {
  id: string;
  user_id: string;
  is_stealth: boolean;
  codename_id: string | null;
};

type Subscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
};

type Codename = { id: string; codename: string; real_label: string };

async function loadDue(now: string): Promise<{
  reminders: Reminder[];
  subsByUser: Map<string, Subscription[]>;
  codenameById: Map<string, Codename>;
  taskTitleById: Map<string, string>;
}> {
  const { data: reminders, error } = await sb
    .from("reminders")
    .select("id, user_id, task_id, is_stealth, codename_id")
    .eq("enabled", true)
    .lte("next_fire_at", now);
  if (error) throw error;
  if (!reminders || reminders.length === 0) {
    return {
      reminders: [],
      subsByUser: new Map(),
      codenameById: new Map(),
      taskTitleById: new Map(),
    };
  }

  const userIds = [...new Set(reminders.map((r) => r.user_id))];
  const codenameIds = reminders
    .map((r) => r.codename_id)
    .filter((x): x is string => !!x);
  const taskIds = [...new Set(reminders.map((r: any) => r.task_id))];

  const [{ data: subs }, { data: codenames }, { data: tasks }] = await Promise.all(
    [
      sb
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth, user_id")
        .in("user_id", userIds)
        .is("disabled_at", null),
      codenameIds.length > 0
        ? sb
            .from("codenames")
            .select("id, codename, real_label")
            .in("id", codenameIds)
        : Promise.resolve({ data: [] }),
      sb.from("tasks").select("id, title").in("id", taskIds),
    ],
  );

  const subsByUser = new Map<string, Subscription[]>();
  for (const s of (subs ?? []) as Subscription[]) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id)!.push(s);
  }
  const codenameById = new Map<string, Codename>();
  for (const c of (codenames ?? []) as Codename[]) codenameById.set(c.id, c);

  const taskTitleById = new Map<string, string>();
  for (const t of (tasks ?? []) as { id: string; title: string }[]) {
    taskTitleById.set(t.id, t.title);
  }

  return {
    reminders: reminders as Reminder[],
    subsByUser,
    codenameById,
    taskTitleById,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const now = new Date().toISOString();
    const { reminders, subsByUser, codenameById, taskTitleById } = await loadDue(
      now,
    );

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const r of reminders) {
      const subs = subsByUser.get(r.user_id) ?? [];
      if (subs.length === 0) {
        skipped++;
        continue;
      }
      const cn = r.codename_id ? codenameById.get(r.codename_id) : null;
      const realLabel = taskTitleById.get((r as any).task_id) ?? null;

      for (const sub of subs) {
        const payload = {
          reminder_id: r.id,
          user_id: r.user_id,
          is_stealth: r.is_stealth,
          codename: cn?.codename ?? null,
          real_label: cn?.real_label ?? realLabel,
          subscription: {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
        };
        const body = JSON.stringify(payload);
        const signature = await hmacSign(body, HMAC_SECRET);

        try {
          const resp = await fetch(`${API_BASE}/internal/fire-due`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Signature": signature,
            },
            body,
          });
          if (resp.ok) sent++;
          else errors.push(`reminder ${r.id} → ${resp.status}`);
        } catch (e) {
          errors.push(`reminder ${r.id} → ${(e as Error).message}`);
        }
      }
    }

    return Response.json({ sent, skipped, errors });
  } catch (err) {
    console.error("fire-due error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
