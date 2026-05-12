"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Button, Field } from "@/components/Field";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push("/");
  }

  return (
    <section className="mx-auto max-w-sm space-y-8 pt-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-faint)]">
          Welcome back
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          Log in<span className="text-[var(--color-accent)]">.</span>
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      {err && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
          {err}
        </p>
      )}

      <p className="text-sm text-[var(--color-muted)]">
        No account?{" "}
        <Link
          href="/signup"
          className="text-[var(--color-fg)] hover:text-[var(--color-accent)] transition-colors duration-200"
        >
          Create one →
        </Link>
      </p>
    </section>
  );
}
