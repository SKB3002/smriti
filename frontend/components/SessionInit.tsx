"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

/**
 * Instantiates the Supabase client on mount so it processes any auth tokens
 * present in the URL hash (e.g. after email-confirmation redirect) and writes
 * the session to localStorage. Without this, the homepage never touches the
 * Supabase SDK and the confirmation hash is silently ignored.
 */
export function SessionInit() {
  useEffect(() => {
    try {
      createBrowserClient();
    } catch {
      /* env not set — silently ignore in dev */
    }
  }, []);
  return null;
}
