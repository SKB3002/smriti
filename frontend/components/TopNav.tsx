"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createBrowserClient } from "@/lib/supabaseClient";

const SECTIONS = [
  { label: "Today", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Tasks", href: "/tasks" },
  { label: "Reminders", href: "/reminders" },
  { label: "Codenames", href: "/codenames" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let supabase;
    try {
      supabase = createBrowserClient();
    } catch {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      setEmail(null);
      router.push("/");
    } catch {
      /* ignore */
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line/0 bg-[var(--color-bg)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-bg)]/70">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-4">
        <Link
          href="/"
          className="text-lg tracking-tight text-[var(--color-fg)] hover:text-[var(--color-accent)] transition-colors duration-200"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}
        >
          Smriti<span className="text-[var(--color-accent)]">.</span>
        </Link>
        <nav className="hidden gap-5 text-sm sm:flex">
          {SECTIONS.map((s) => {
            const active =
              s.href === "/" ? pathname === "/" : pathname.startsWith(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className={clsx(
                  "transition-colors duration-200 cursor-pointer",
                  active
                    ? "text-[var(--color-fg)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-fg)]",
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
        <div
          className="ml-auto flex items-center gap-3 text-sm"
          suppressHydrationWarning
        >
          {!ready ? null : email ? (
            <>
              <span
                className="hidden font-mono text-xs text-[var(--color-faint)] sm:inline"
                title={email}
              >
                {email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors duration-200 cursor-pointer"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors duration-200 cursor-pointer"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[var(--color-accent-fg)] hover:brightness-110 transition-[filter] duration-200 cursor-pointer"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
