"use client";

import { SWRConfig } from "swr";
import { apiFetch } from "@/lib/api";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Default fetcher: SWR passes the URL key; apiFetch handles auth + JSON.
        fetcher: (path: string) => apiFetch(path),
        // Cached data stays "stale" but is shown immediately on revisit.
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        // Dedupe identical requests within 2s.
        dedupingInterval: 2000,
        // Don't auto-retry on 4xx (auth/validation errors); only network.
        shouldRetryOnError: (err) => {
          if (err && typeof err === "object" && "status" in err) {
            const s = (err as { status: number }).status;
            return s >= 500 || s === 0;
          }
          return true;
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
