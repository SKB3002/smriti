"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { NotifyToggle } from "@/components/NotifyToggle";
import PrioritizePanel from "@/components/PrioritizePanel";
import { TodayPanel } from "@/components/TodayPanel";
import { YesterdayModal } from "@/components/YesterdayModal";

const SECTIONS: { label: string; href: string; hint: string }[] = [
  { label: "Projects", href: "/projects", hint: "Group related work" },
  { label: "Tasks", href: "/tasks", hint: "What needs doing" },
  { label: "Reminders", href: "/reminders", hint: "Push during a time slot" },
  { label: "Codenames", href: "/codenames", hint: "Stealth labels for push" },
];

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function greetingFor(d: Date): { prefix: string; accent: string } {
  const h = d.getHours();
  if (h < 5) return { prefix: "A quiet", accent: "late night" };
  if (h < 12) return { prefix: "Good", accent: "morning" };
  if (h < 17) return { prefix: "Good", accent: "afternoon" };
  if (h < 21) return { prefix: "Good", accent: "evening" };
  return { prefix: "Winding", accent: "down" };
}

export default function DashboardPage() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = now ? fmtDate(now) : "";
  const greeting = greetingFor(now ?? new Date());
  const clock = now
    ? now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  return (
    <>
      <YesterdayModal />

      <section className="relative space-y-16 animate-[fade-in_700ms_ease-out]">
        <header className="relative space-y-7 pt-4">
          {/* Eyebrow rule + date/clock */}
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-[var(--color-line-strong)]" />
            <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-faint)]">
              <span>{today}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--color-faint)]" />
              <span className="tabular-nums text-[var(--color-muted)]">{clock}</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              </span>
            </p>
          </div>

          {/* Editorial split greeting: sans + italic serif */}
          <h1
            className="text-6xl font-light leading-[0.95] tracking-tight text-[var(--color-fg)] sm:text-[88px]"
            style={{ paddingBottom: "0.05em" }}
          >
            {greeting.prefix}{" "}
            <span
              className="bg-gradient-to-br from-[var(--color-fg)] to-[var(--color-accent)] bg-clip-text italic text-transparent"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
              }}
            >
              {greeting.accent}
            </span>
            <span className="text-[var(--color-accent)]">.</span>
          </h1>

          <p
            className="max-w-lg text-lg leading-relaxed text-[var(--color-muted)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Your second memory — a calm place to capture, schedule, and let
            Smriti nudge you at exactly the right moment.
          </p>
        </header>

        <div className="relative">
          <TodayPanel />
        </div>

        <div className="relative flex flex-wrap gap-3">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-[var(--color-accent-fg)] hover:brightness-110 transition-[filter] duration-200 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.25} />
            Capture task
          </Link>
          <Link
            href="/reminders"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-line-strong px-4 py-2.5 text-sm text-[var(--color-fg)] hover:border-[var(--color-fg)] transition-colors duration-200 cursor-pointer"
          >
            New reminder
          </Link>
          <NotifyToggle />
        </div>

        <div className="relative">
          <PrioritizePanel />
        </div>

        <nav aria-label="Sections" className="relative -mx-6 border-t border-line">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center gap-6 border-b border-line px-6 py-5 transition-colors duration-200 hover:bg-[var(--color-surface)] cursor-pointer"
            >
              <span className="font-mono text-xs text-[var(--color-faint)] tabular-nums">
                {String(SECTIONS.indexOf(s) + 1).padStart(2, "0")}
              </span>
              <span className="text-lg text-[var(--color-fg)]">{s.label}</span>
              <span className="text-sm text-[var(--color-muted)]">{s.hint}</span>
              <ArrowRight
                size={16}
                className="ml-auto text-[var(--color-faint)] transition-colors duration-200 group-hover:text-[var(--color-accent)]"
              />
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
