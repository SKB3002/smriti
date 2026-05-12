"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { subscribeUser, unsubscribeUser } from "@/lib/pushSubscribe";
import { Button } from "./Field";

type State = "unknown" | "off" | "on" | "denied" | "unsupported";

export function NotifyToggle() {
  const [state, setState] = useState<State>("unknown");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  if (state === "unsupported" || state === "denied") {
    return (
      <p className="font-mono text-xs text-[var(--color-faint)]">
        {state === "denied"
          ? "Notifications blocked in browser settings."
          : "Push not supported in this browser."}
      </p>
    );
  }

  async function toggle() {
    setBusy(true);
    setErr(null);
    try {
      if (state === "on") {
        await unsubscribeUser();
        setState("off");
      } else {
        await subscribeUser();
        setState("on");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function testPush() {
    setErr(null);
    try {
      const r = await apiFetch<{ sent: number; subscription_gone: number }>(
        "/push/test",
        { method: "POST" },
      );
      if (r.sent === 0) setErr("No active subscriptions");
    } catch (e) {
      setErr(
        e instanceof ApiError ? `API ${e.status}` : (e as Error).message,
      );
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" onClick={toggle} disabled={busy || state === "unknown"}>
        {state === "on" ? <BellOff size={16} /> : <Bell size={16} />}
        {state === "on"
          ? busy
            ? "Disabling…"
            : "Disable push"
          : busy
            ? "Enabling…"
            : "Enable push"}
      </Button>
      {state === "on" && (
        <Button variant="ghost" onClick={testPush}>
          <Send size={14} />
          Send test
        </Button>
      )}
      {err && <span className="text-sm text-[var(--color-danger)]">{err}</span>}
    </div>
  );
}
