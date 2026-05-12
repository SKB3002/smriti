"use client";

import useSWR from "swr";
import { Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { apiFetch, ApiError } from "@/lib/api";
import type { Reminder, Task } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { ReminderForm } from "@/components/ReminderForm";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RemindersPage() {
  const { data: reminders, error, isLoading, mutate } = useSWR<Reminder[]>("/reminders");
  const { data: tasks } = useSWR<Task[]>("/tasks");
  const titles: Record<string, string> = {};
  for (const t of tasks ?? []) titles[t.id] = t.title;

  async function onDelete(id: string) {
    mutate(reminders?.filter((r) => r.id !== id), { revalidate: false });
    await apiFetch(`/reminders/${id}`, { method: "DELETE" }).catch(() => mutate());
  }

  const errMsg = error
    ? error instanceof ApiError
      ? `API ${error.status}`
      : (error as Error).message
    : null;

  return (
    <section className="space-y-10">
      <PageHeader
        eyebrow="Schedule"
        title="Reminders"
        subtitle="Normal fires once. Persistent pings every N minutes inside a window."
      />

      <div className="rounded-[var(--radius-md)] border border-line p-5">
        <ReminderForm
          onCreated={(r) => mutate([r, ...(reminders ?? [])], { revalidate: true })}
        />
      </div>

      {errMsg && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
          {errMsg}
        </p>
      )}

      {isLoading && !reminders ? (
        <p className="font-mono text-xs text-[var(--color-faint)]">Loading…</p>
      ) : !reminders || reminders.length === 0 ? (
        <EmptyState title="No reminders yet" hint="Add one above." />
      ) : (
        <ul className="-mx-6 border-t border-line">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="group flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-6 py-4 transition-colors duration-200 hover:bg-[var(--color-surface)]"
            >
              <span
                className={clsx(
                  "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
                  r.kind === "normal"
                    ? "border-line-strong text-[var(--color-muted)]"
                    : "border-[var(--color-accent)]/60 text-[var(--color-accent)]",
                )}
              >
                {r.kind}
              </span>
              <span className="flex-1 truncate text-[var(--color-fg)]">
                {titles[r.task_id] ?? r.task_id}
              </span>
              <span className="font-mono text-xs text-[var(--color-muted)]">next: {fmt(r.next_fire_at)}</span>
              {r.kind === "persistent" && (
                <span className="font-mono text-xs text-[var(--color-faint)]">
                  every {r.frequency_minutes}m · until {fmt(r.end_at)}
                </span>
              )}
              {!r.enabled && (
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-faint)]">
                  done
                </span>
              )}
              <button
                type="button"
                aria-label="Delete reminder"
                onClick={() => onDelete(r.id)}
                className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-[var(--color-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)] transition-colors duration-200 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
