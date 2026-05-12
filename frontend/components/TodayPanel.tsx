"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight } from "lucide-react";
import type { Reminder, Task } from "@/lib/types";
import { StatusPill } from "./StatusPill";

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = d - Date.now();
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60_000);
  const h = Math.round(abs / 3_600_000);
  const day = Math.round(abs / 86_400_000);
  const past = diff < 0;
  const text =
    abs < 60_000 ? "now" : abs < 3_600_000 ? `${m}m` : abs < 86_400_000 ? `${h}h` : `${day}d`;
  return past ? `${text} ago` : `in ${text}`;
}

export function TodayPanel() {
  const { data: tasks } = useSWR<Task[]>("/tasks");
  const { data: reminders } = useSWR<Reminder[]>("/reminders");

  const open = (tasks ?? []).filter((t) => t.status !== "done");
  const top = [...open].sort((a, b) => b.priority - a.priority).slice(0, 5);
  const next = (reminders ?? [])
    .filter((r) => r.enabled && r.next_fire_at)
    .sort((a, b) => (a.next_fire_at ?? "").localeCompare(b.next_fire_at ?? ""))[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line">
        <div className="bg-[var(--color-bg)] px-5 py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
            Open tasks
          </p>
          <p className="mt-2 font-mono text-3xl tabular-nums text-[var(--color-fg)]">
            {tasks === undefined ? "—" : open.length}
          </p>
        </div>
        <div className="bg-[var(--color-bg)] px-5 py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
            Next reminder
          </p>
          <p className="mt-2 font-mono text-3xl tabular-nums text-[var(--color-fg)]">
            {next ? relTime(next.next_fire_at) : "—"}
          </p>
        </div>
      </div>

      {top.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
              On your plate
            </p>
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors duration-200"
            >
              all tasks <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="-mx-6 border-t border-line">
            {top.map((t, i) => (
              <li key={t.id} className="flex items-center gap-4 border-b border-line px-6 py-3">
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
