"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/PageHeader";

type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
};

export default function ExtensionSettingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState<string>("");
  const [anonKey, setAnonKey] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    setAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
    try {
      const supabase = createBrowserClient();
      supabase.auth.getSession().then(({ data }) => {
        const s = data.session;
        if (s) {
          setSession({
            access_token: s.access_token,
            refresh_token: s.refresh_token,
            expires_at: s.expires_at ?? null,
          });
        }
        setReady(true);
      });
    } catch {
      setReady(true);
    }
  }, []);

  const tokenPayload = session
    ? JSON.stringify(
        {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          supabase_url: supabaseUrl,
          supabase_anon_key: anonKey,
        },
        null,
        2,
      )
    : "";

  async function copyToken() {
    if (!tokenPayload) return;
    try {
      await navigator.clipboard.writeText(tokenPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <section className="space-y-10">
      <PageHeader
        eyebrow="Settings"
        title="Browser extension"
        subtitle="Right-click any selected text on any webpage to add it to Smriti."
      />

      <ol className="space-y-6">
        <li className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
            Step 1
          </p>
          <p className="text-[var(--color-fg)]">
            Install the Smriti extension from the Chrome Web Store.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline"
          >
            Install Smriti for Chrome <ExternalLink size={13} />
          </a>
          <p className="text-xs text-[var(--color-faint)]">
            Not published yet? Load the <code>extension/</code> folder
            unpacked from <code>chrome://extensions</code> (Developer mode).
          </p>
        </li>

        <li className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
            Step 2
          </p>
          <p className="text-[var(--color-fg)]">
            Copy your session token and paste it into the extension popup.
          </p>

          {!ready ? (
            <p className="text-sm text-[var(--color-muted)]">Loading…</p>
          ) : !session ? (
            <p className="rounded-[var(--radius-sm)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
              Not signed in. Log in first, then come back to this page.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <pre className="max-h-40 overflow-auto rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] p-3 font-mono text-[11px] leading-relaxed text-[var(--color-muted)]">
                  {tokenPayload}
                </pre>
                <button
                  type="button"
                  onClick={copyToken}
                  className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-fg)] hover:border-[var(--color-fg)] transition-colors cursor-pointer"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy token"}
                </button>
              </div>
              <p className="text-xs text-[var(--color-faint)]">
                The token gives the extension access to your account. Keep it
                private. You can disconnect from the extension popup any time.
              </p>
            </div>
          )}
        </li>

        <li className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
            Step 3
          </p>
          <p className="text-[var(--color-fg)]">
            Open the extension popup → paste → Connect. That's it.
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            From now on: select text on any page → right-click → <strong>Add
            "..." to Smriti</strong>. The capture goes into your default
            project (configurable in the extension popup).
          </p>
        </li>
      </ol>
    </section>
  );
}
