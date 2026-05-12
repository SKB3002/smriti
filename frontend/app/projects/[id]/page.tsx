"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Project, Task } from "@/lib/types";
import { TaskList } from "@/components/TaskList";
import { TaskForm } from "@/components/TaskForm";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Project>(`/projects/${id}`)
      .then(setProject)
      .catch((e) =>
        setErr(e instanceof ApiError ? `API ${e.status}` : (e as Error).message),
      );
    apiFetch<Task[]>(`/tasks?project_id=${id}`)
      .then(setTasks)
      .catch(() => setTasks([]));
  }, [id]);

  return (
    <section className="space-y-10">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors duration-200"
      >
        <ArrowLeft size={12} /> Projects
      </Link>

      <PageHeader
        eyebrow="Project"
        title={project?.name ?? "—"}
        subtitle={project?.description ?? undefined}
      />

      {id && (
        <TaskForm
          defaultProjectId={id}
          onCreated={(t) => setTasks((prev) => [t, ...(prev ?? [])])}
        />
      )}

      {err && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
          {err}
        </p>
      )}

      {tasks === null ? (
        <p className="font-mono text-xs text-[var(--color-faint)]">Loading…</p>
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks in this project" hint="Add one above." />
      ) : (
        <TaskList tasks={tasks} onChange={setTasks} />
      )}
    </section>
  );
}
