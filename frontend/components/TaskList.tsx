"use client";

import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { clsx } from "clsx";
import { apiFetch } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";
import { StatusPill } from "./StatusPill";

export function TaskList({
  tasks,
  onChange,
}: {
  tasks: Task[];
  onChange?: (next: Task[]) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(t: Task) {
    setBusy(t.id);
    const next: TaskStatus = t.status === "done" ? "todo" : "done";
    try {
      const updated = await apiFetch<Task>(`/tasks/${t.id}`, {
        method: "PATCH",
        body: { status: next },
      });
      onChange?.(tasks.map((x) => (x.id === t.id ? updated : x)));
    } finally {
      setBusy(null);
    }
  }

  if (tasks.length === 0) return null;

  return (
    <ul className="-mx-6 border-t border-line">
      {tasks.map((t) => {
        const done = t.status === "done";
        return (
          <li
            key={t.id}
            className="group flex items-center gap-4 border-b border-line px-6 py-3.5 transition-colors duration-200 hover:bg-[var(--color-surface)]"
          >
            <button
              type="button"
              aria-label={done ? "Mark not done" : "Mark done"}
              disabled={busy === t.id}
              onClick={() => toggle(t)}
              className={clsx(
                "grid h-7 w-7 place-items-center rounded-full border transition-colors duration-200 cursor-pointer disabled:opacity-50",
                done
                  ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "border-line-strong text-[var(--color-faint)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
              )}
            >
              {done ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <Circle size={10} fill="currentColor" />
              )}
            </button>
            <span
              className={clsx(
                "flex-1 text-[var(--color-fg)] transition-colors duration-200",
                done &&
                  "text-[var(--color-muted)] line-through decoration-[var(--color-muted)] decoration-2",
              )}
            >
              {t.title}
            </span>
            {t.priority > 0 && (
              <span className="font-mono text-[11px] tabular-nums text-[var(--color-muted)]">
                p{t.priority}
              </span>
            )}
            <StatusPill status={t.status} />
          </li>
        );
      })}
    </ul>
  );
}
