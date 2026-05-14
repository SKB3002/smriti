"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, Check, Flame } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Reminder, Task } from "@/lib/types";
import { StatusPill } from "./StatusPill";

function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function countdownTo(iso: string | null, now: number): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - now;
  if (diff < 0) {
    const absMin = Math.round(-diff / 60_000);
    return absMin < 1 ? "firing now" : `${absMin}m overdue`;
  }
  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s % 60}s`;
}

function fmtClock(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TodayPanel() {
  const { data: tasks, mutate } = useSWR<Task[]>("/tasks");
  const { data: reminders } = useSWR<Reminder[]>("/reminders");
  const now = useNow(1_000);

  const open = (tasks ?? []).filter((t) => t.status !== "done");
  const top = [...open].sort((a, b) => b.priority - a.priority).slice(0, 5);
  const completedToday = (tasks ?? []).filter((t) => {
    if (t.status !== "done" || !t.completed_at) return false;
    const d = new Date(t.completed_at);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;

  const upcoming = (reminders ?? [])
    .filter((r) => r.enabled && r.next_fire_at)
    .sort((a, b) => (a.next_fire_at ?? "").localeCompare(b.next_fire_at ?? ""))
    .slice(0, 3);
  const nextReminder = upcoming[0];

  const taskTitleById: Record<string, string> = {};
  for (const t of tasks ?? []) taskTitleById[t.id] = t.title;

  async function markDone(task: Task) {
    const updated = await apiFetch<Task>(`/tasks/${task.id}`, {
      method: "PATCH",
      body: { status: "done", completed_at: new Date().toISOString() },
    });
    mutate((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)), {
      revalidate: false,
    });
  }

  return (
    <div className="space-y-8">
      {/* Hero "Next Up" card — editorial focal point */}
      {nextReminder ? (
        <Link
          href="/reminders"
          className="group relative block overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)]/40 px-8 py-10 backdrop-blur-sm transition-all duration-300 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface)]/70"
        >
          {/* Inner glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
            style={{
              background:
                "radial-gradient(circle, rgba(255,138,76,0.35), rgba(255,138,76,0) 65%)",
            }}
          />

          <div className="relative flex items-start justify-between gap-6">
            <div className="min-w-0 space-y-4">
              <p className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-accent)]">
                <span className="h-px w-6 bg-[var(--color-accent)]/60" />
                Next
              </p>
              <p
                className="truncate text-3xl font-light leading-tight text-[var(--color-fg)] sm:text-4xl"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {taskTitleById[nextReminder.task_id] ?? "Reminder"}
              </p>
              <div className="flex items-center gap-4 pt-1">
                <span className="font-mono text-sm tabular-nums text-[var(--color-muted)]">
                  {fmtClock(nextReminder.next_fire_at)}
                </span>
                <span className="h-1 w-1 rounded-full bg-[var(--color-faint)]" />
                <span className="font-mono text-sm tabular-nums text-[var(--color-fg)]">
                  {countdownTo(nextReminder.next_fire_at, now)}
                </span>
              </div>
            </div>
            <ArrowRight
              size={20}
              className="mt-2 shrink-0 text-[var(--color-faint)] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--color-accent)]"
            />
          </div>

          {upcoming.length > 1 && (
            <div className="relative mt-8 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-faint)]">
                After
              </span>
              {upcoming.slice(1).map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-2 font-mono text-[11px] tabular-nums text-[var(--color-muted)]"
                >
                  <span className="text-[var(--color-fg)]">{fmtClock(r.next_fire_at)}</span>
                  <span className="text-[var(--color-faint)]">
                    {taskTitleById[r.task_id]?.slice(0, 28) ?? ""}
                  </span>
                </span>
              ))}
            </div>
          )}
        </Link>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] px-8 py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-faint)]">
            No reminders queued
          </p>
          <p
            className="mt-3 text-lg italic text-[var(--color-muted)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            A quiet stretch ahead.
          </p>
        </div>
      )}

      {/* Stat row — hairline separators, serif numerals */}
      <div className="grid grid-cols-3 divide-x divide-[var(--color-line)] border-y border-[var(--color-line)]">
        <div className="px-2 py-6 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-faint)]">
            Open
          </p>
          <p className="mt-3 text-4xl tabular-nums text-[var(--color-fg)]">
            {tasks === undefined ? "—" : open.length}
          </p>
        </div>
        <div className="px-2 py-6 sm:px-6">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-faint)]">
            <Flame size={10} strokeWidth={2.5} /> Done today
          </p>
          <p className="mt-3 text-4xl tabular-nums text-[var(--color-accent)]">
            {tasks === undefined ? "—" : completedToday}
          </p>
        </div>
        <div className="px-2 py-6 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-faint)]">
            Queued
          </p>
          <p className="mt-3 text-4xl tabular-nums text-[var(--color-fg)]">
            {reminders === undefined
              ? "—"
              : (reminders ?? []).filter((r) => r.enabled).length}
          </p>
        </div>
      </div>

      {top.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2
              className="text-2xl italic text-[var(--color-fg)]"
              style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}
            >
              On your plate
            </h2>
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors duration-200"
            >
              all tasks <ArrowRight size={11} />
            </Link>
          </div>
          <ul className="-mx-6 border-t border-line">
            {top.map((t, i) => (
              <li
                key={t.id}
                className="flex items-center gap-4 border-b border-line px-6 py-3"
              >
                <button
                  onClick={() => markDone(t)}
                  aria-label={`Mark "${t.title}" as done`}
                  className="group flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[var(--color-faint)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors duration-150 cursor-pointer"
                >
                  <Check
                    size={11}
                    strokeWidth={2.5}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  />
                </button>
                <span className="font-mono text-xs text-[var(--color-faint)] tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate text-[var(--color-fg)]">{t.title}</span>
                {t.priority > 0 && (
                  <span className="font-mono text-[11px] tabular-nums text-[var(--color-accent)]">
                    p{t.priority}
                  </span>
                )}
                <StatusPill status={t.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
