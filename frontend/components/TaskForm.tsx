"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Project, Task } from "@/lib/types";
import { Button, Field } from "./Field";

export function TaskForm({
  defaultProjectId,
  onCreated,
}: {
  defaultProjectId?: string;
  onCreated?: (t: Task) => void;
}) {
  const { data: projects = [] } = useSWR<Project[]>(
    defaultProjectId ? null : "/projects",
  );
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (defaultProjectId) return;
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId, defaultProjectId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !title.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const task = await apiFetch<Task>("/tasks", {
        method: "POST",
        body: { project_id: projectId, title: title.trim() },
      });
      setTitle("");
      onCreated?.(task);
    } catch (e) {
      setErr(e instanceof ApiError ? `API ${e.status}` : (e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
        <Field
          label="New task"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
        />
        {!defaultProjectId && (
          <label className="block space-y-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
              Project
            </span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="block h-[42px] w-full rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] px-3 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none transition-colors duration-200"
            >
              {projects.length === 0 ? (
                <option value="">— no projects —</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center justify-end gap-3">
        {err && <span className="text-sm text-[var(--color-danger)]">{err}</span>}
        <Button type="submit" disabled={creating || !title.trim() || !projectId}>
          <Plus size={16} strokeWidth={2.25} />
          {creating ? "Adding…" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
