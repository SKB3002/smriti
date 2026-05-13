"use client";

import { useEffect, useState } from "react";
import { X, ArrowRight, Minus } from "lucide-react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import type { Task } from "@/lib/types";

const STORAGE_KEY = "smriti_yesterday_dismissed";

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayEnd(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d; // midnight = start of today = end of yesterday
}

export function YesterdayModal() {
  const { data: tasks, mutate } = useSWR<Task[]>("/tasks");
  const [dismissed, setDismissed] = useState(true); // start hidden, show after check
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY);
    if (last === todayDateStr()) return; // already shown today
    setDismissed(false);
  }, []);

  const cutoff = yesterdayEnd();
  const pending = (tasks ?? []).filter((t) => {
    if (t.status === "done") return false;
    // tasks created before today that are not done
    return new Date(t.created_at) < cutoff;
  });

  const visible = pending.filter((t) => !ignored.has(t.id));

  function dismissAll() {
    localStorage.setItem(STORAGE_KEY, todayDateStr());
    setDismissed(true);
  }

  useEffect(() => {
    if (!dismissed && tasks !== undefined && visible.length === 0 && pending.length > 0) {
      // all actioned
      dismissAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length, dismissed, tasks]);

  async function bringToToday(task: Task) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const updated = await apiFetch<Task>(`/tasks/${task.id}`, {
      method: "PATCH",
      body: { due_at: today.toISOString() },
    });
    mutate((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)), { revalidate: false });
    setIgnored((s) => new Set(s).add(task.id));
  }

  function ignore(id: string) {
    setIgnored((s) => new Set(s).add(id));
  }

  if (dismissed || !tasks || visible.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismissAll}
      />

      <div className="relative z-10 w-full max-w-md rounded-[var(--radius-md)] border border-line bg-[var(--color-surface)] shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
              Pending from before today
            </p>
            <p className="mt-0.5 text-base font-medium text-[var(--color-fg)]">
              {visible.length} unfinished {visible.length === 1 ? "task" : "tasks"}
            </p>
          </div>
          <button
            onClick={dismissAll}
            className="rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors duration-150 cursor-pointer"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* task list */}
        <ul className="max-h-72 overflow-y-auto divide-y divide-line">
          {visible.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-5 py-3.5">
              <span className="flex-1 truncate text-sm text-[var(--color-fg)]">{t.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => bringToToday(t)}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-fg)] hover:brightness-110 transition-[filter] duration-150 cursor-pointer whitespace-nowrap"
                >
                  <ArrowRight size={12} />
                  Bring to today
                </button>
                <button
                  onClick={() => ignore(t.id)}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-xs text-[var(--color-muted)] hover:border-[var(--color-fg)] hover:text-[var(--color-fg)] transition-colors duration-150 cursor-pointer"
                >
                  <Minus size={12} />
                  Ignore
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-line px-5 py-3">
          <button
            onClick={dismissAll}
            className="font-mono text-xs text-[var(--color-faint)] hover:text-[var(--color-muted)] transition-colors duration-150 cursor-pointer"
          >
            Dismiss all for today
          </button>
        </div>
      </div>
    </div>
  );
}
