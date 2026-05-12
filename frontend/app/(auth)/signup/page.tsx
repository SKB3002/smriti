"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Button, Field } from "@/components/Field";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Check your email to confirm the account.");
  }

  return (
    <section className="mx-auto max-w-sm space-y-8 pt-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-faint)]">
          Get started
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          Create account<span className="text-[var(--color-accent)]">.</span>
        </h1>
      </header>

      <form onSubmit={onSubmit} method="POST" action="?" className="space-y-4">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>

      {msg && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 px-3 py-2 text-sm text-[var(--color-success)]">
          {msg}
        </p>
      )}
      {err && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
          {err}
        </p>
      )}

      <p className="text-sm text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[var(--color-fg)] hover:text-[var(--color-accent)] transition-colors duration-200"
        >
          Log in →
        </Link>
      </p>
    </section>
  );
}
