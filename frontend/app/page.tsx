"use client";

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

export default function DashboardPage() {
  const today = fmtDate(new Date());
  return (
    <>
      <YesterdayModal />

      <section className="space-y-12">
        <header className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-faint)]">
            {today}
          </p>
          <h1 className="text-5xl font-medium tracking-tight sm:text-6xl">
            Today<span className="text-[var(--color-accent)]">.</span>
          </h1>
          <p className="max-w-md text-[var(--color-muted)]">
            A quiet place for projects, tasks, and reminders that nudge you at
            exactly the right moment.
          </p>
        </header>

        <TodayPanel />

        <div className="flex flex-wrap gap-3">
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

        <PrioritizePanel />

        <nav aria-label="Sections" className="-mx-6 border-t border-line">
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
