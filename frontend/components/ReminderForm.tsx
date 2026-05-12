"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { clsx } from "clsx";
import { apiFetch, ApiError } from "@/lib/api";
import type { Reminder, ReminderKind, Task } from "@/lib/types";
import { Button, Field } from "./Field";

type Codename = { id: string; codename: string; real_label: string };

function toLocalInputValue(dateOffsetMin: number): string {
  const d = new Date(Date.now() + dateOffsetMin * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function localInputToISO(local: string): string {
  // datetime-local gives "YYYY-MM-DDTHH:MM" in the user's local tz; new Date
  // interprets it as local time. toISOString converts to UTC ISO.
  return new Date(local).toISOString();
}

export function ReminderForm({
  onCreated,
}: {
  onCreated?: (r: Reminder) => void;
}) {
  const [kind, setKind] = useState<ReminderKind>("normal");
  const { data: tasks = [] } = useSWR<Task[]>("/tasks");
  const { data: codenames = [] } = useSWR<Codename[]>("/codenames");
  const [taskId, setTaskId] = useState("");
  const [startAt, setStartAt] = useState(() => toLocalInputValue(15));
  const [endAt, setEndAt] = useState(() => toLocalInputValue(60));
  const [freq, setFreq] = useState(30);
  const [isStealth, setIsStealth] = useState(false);
  const [codenameId, setCodenameId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId && tasks.length > 0) setTaskId(tasks[0].id);
  }, [tasks, taskId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskId || !startAt) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      setErr("Pick a task first");
      return;
    }
    setBusy(true);
    setErr(null);
    const body: Record<string, unknown> = {
      task_id: taskId,
      project_id: task.project_id,
      kind,
      start_at: localInputToISO(startAt),
      is_stealth: isStealth,
      codename_id: isStealth ? codenameId || null : null,
    };
    if (kind === "persistent") {
      body.end_at = localInputToISO(endAt);
      body.frequency_minutes = freq;
    }
    try {
      const reminder = await apiFetch<Reminder>("/reminders", {
        method: "POST",
        body,
      });
      onCreated?.(reminder);
    } catch (e) {
      setErr(e instanceof ApiError ? `API ${e.status}` : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* kind segmented control */}
      <div
        role="tablist"
        aria-label="Reminder kind"
        className="inline-flex overflow-hidden rounded-[var(--radius-sm)] border border-line-strong"
      >
        {(["normal", "persistent"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={clsx(
              "px-4 py-2 text-sm transition-colors duration-200 cursor-pointer",
              kind === k
                ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            {k === "normal" ? "Normal" : "Persistent"}
          </button>
        ))}
      </div>
      <p className="-mt-3 text-xs text-[var(--color-muted)]">
        {kind === "normal"
          ? "Fires once at the given time."
          : "Pings every N minutes between start and end."}
      </p>

      <label className="block space-y-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
          Task
        </span>
        <select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="block h-[42px] w-full rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] px-3 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none transition-colors duration-200"
        >
          {tasks.length === 0 ? (
            <option value="">— no tasks —</option>
          ) : (
            tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))
          )}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label={kind === "persistent" ? "Start" : "When"}
          type="datetime-local"
          name="start_at"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
        {kind === "persistent" && (
          <Field
            label="End"
            type="datetime-local"
            name="end_at"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        )}
      </div>

      {kind === "persistent" && (
        <Field
          label="Every (minutes)"
          type="number"
          min={1}
          value={String(freq)}
          onChange={(e) => setFreq(Math.max(1, Number(e.target.value) || 1))}
        />
      )}

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isStealth}
          onChange={(e) => setIsStealth(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
        <span className="text-sm text-[var(--color-fg)]">Stealth mode</span>
        <span className="text-xs text-[var(--color-muted)]">
          (push shows codename only)
        </span>
      </label>

      {isStealth && (
        <label className="block space-y-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
            Codename
          </span>
          <select
            value={codenameId}
            onChange={(e) => setCodenameId(e.target.value)}
            className="block h-[42px] w-full rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] px-3 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none transition-colors duration-200"
          >
            <option value="">— pick a codename —</option>
            {codenames.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codename}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex items-center justify-end gap-3">
        {err && <span className="text-sm text-[var(--color-danger)]">{err}</span>}
        <Button type="submit" disabled={busy || !taskId || !startAt}>
          <Plus size={16} strokeWidth={2.25} />
          {busy ? "Adding…" : "Add reminder"}
        </Button>
      </div>
    </form>
  );
}
