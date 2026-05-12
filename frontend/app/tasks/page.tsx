"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ApiError } from "@/lib/api";
import type { Task } from "@/lib/types";
import { TaskList } from "@/components/TaskList";
import { TaskForm } from "@/components/TaskForm";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";

type Range = "today" | "week" | "month" | "all";

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "all", label: "All" },
] as const;

function cutoffFor(range: Range): number {
  const now = new Date();
  switch (range) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return start.getTime();
    }
    case "week":
      return now.getTime() - 7 * 86_400_000;
    case "month":
      return now.getTime() - 30 * 86_400_000;
    case "all":
      return 0;
  }
}

export default function TasksPage() {
  const { data: tasks, error, isLoading, mutate } = useSWR<Task[]>("/tasks");
  const [range, setRange] = useState<Range>("today");

  const visible = useMemo(() => {
    if (!tasks) return [];
    const cutoff = cutoffFor(range);
    if (cutoff === 0) return tasks;
    return tasks.filter((t) => new Date(t.updated_at).getTime() >= cutoff);
  }, [tasks, range]);

  const errMsg = error
    ? error instanceof ApiError
      ? `API ${error.status}`
      : (error as Error).message
    : null;

  const emptyHint =
    range === "today"
      ? "Nothing touched today. Switch the filter to see older tasks."
      : "No tasks in this window.";

  return (
    <section className="space-y-10">
      <PageHeader
        eyebrow="All work"
        title="Tasks"
        subtitle="Capture quickly. Sort later. Reminders do the nudging."
      />

      <TaskForm onCreated={(t) => mutate([t, ...(tasks ?? [])], { revalidate: true })} />

      <div className="flex items-center justify-between gap-3">
        <Segmented
          value={range}
          onChange={setRange}
          options={RANGE_OPTIONS}
          ariaLabel="Filter tasks by recency"
        />
        <span className="font-mono text-xs text-[var(--color-faint)] tabular-nums">
          {visible.length} {visible.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {errMsg && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
          {errMsg}
        </p>
      )}

      {isLoading && !tasks ? (
        <p className="font-mono text-xs text-[var(--color-faint)]">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={tasks && tasks.length > 0 ? "Nothing in this window" : "Nothing on your plate"}
          hint={tasks && tasks.length > 0 ? emptyHint : "Add a task above. It'll show up here."}
        />
      ) : (
        <TaskList
          tasks={visible}
          onChange={(next) => {
            // next is the filtered subset post-mutation; merge back into the full list.
            const ids = new Set(visible.map((t) => t.id));
            const updated = (tasks ?? []).map((t) => {
              const nx = next.find((n) => n.id === t.id);
              return nx ?? t;
            });
            // any new items in `next` not in original list (rare) get appended
            for (const n of next) if (!ids.has(n.id) && !updated.find((x) => x.id === n.id)) updated.push(n);
            mutate(updated, { revalidate: false });
          }}
        />
      )}
    </section>
  );
}
