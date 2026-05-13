import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope &
  WorkerGlobalScope & {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

type StealthPushPayload = {
  reminder_id: string;
  is_stealth: boolean;
  codename?: string;
  real_label?: string;
  title?: string;
};

self.addEventListener("push", (event: PushEvent) => {
  // For stealth reminders, the push body shown to the OS is the codename only.
  // The real_label is delivered in data and revealed in-app via <StealthReveal/>.
  const payload: StealthPushPayload = (() => {
    try {
      return (event.data?.json() ?? {}) as StealthPushPayload;
    } catch {
      return {} as StealthPushPayload;
    }
  })();

  const title = payload.title ?? "Smriti";
  const body = payload.is_stealth
    ? (payload.codename ?? "Reminder")
    : (payload.real_label ?? payload.codename ?? "Reminder");

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.reminder_id,
      data: payload,
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  // TODO: focus an existing client or open "/", then postMessage the payload
  // so <StealthReveal/> can render the real_label.
  event.notification.close();
});
