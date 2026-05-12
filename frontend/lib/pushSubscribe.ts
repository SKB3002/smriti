import { apiFetch } from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const b64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function subscribeUser(): Promise<PushSubscription> {
  if (typeof window === "undefined") {
    throw new Error("subscribeUser must run in the browser");
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Web Push not supported in this browser");
  }
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(`Notification permission ${permission}`);
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid).buffer as ArrayBuffer,
    }));

  await apiFetch("/push/subscribe", {
    method: "POST",
    body: {
      endpoint: sub.endpoint,
      p256dh: arrayBufferToBase64Url(sub.getKey("p256dh")),
      auth: arrayBufferToBase64Url(sub.getKey("auth")),
      user_agent: navigator.userAgent,
    },
  });
  return sub;
}

export async function unsubscribeUser(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await apiFetch(
    `/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
    { method: "DELETE" },
  );
  await sub.unsubscribe();
}
