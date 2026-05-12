"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Button, Field } from "@/components/Field";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export default function ProjectsPage() {
  const { data: projects, error, isLoading, mutate } = useSWR<Project[]>("/projects");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const created = await apiFetch<Project>("/projects", {
        method: "POST",
        body: { name: name.trim() },
      });
      setName("");
      // Optimistic insert + background revalidate.
      mutate([created, ...(projects ?? [])], { revalidate: true });
      // Also invalidate /tasks since TaskForm reads /projects via cache.
      globalMutate("/tasks");
    } catch (e) {
      setErr(e instanceof ApiError ? `API ${e.status}` : (e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const errMsg = err ?? (error ? (error instanceof ApiError ? `API ${error.status}` : (error as Error).message) : null);

  return (
    <section className="space-y-10">
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        subtitle="Group related tasks. Archive what's done."
      />

      <form onSubmit={onCreate} className="flex items-end gap-3">
        <div className="flex-1">
          <Field
            label="New project"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Second brain MVP"
          />
        </div>
        <Button type="submit" disabled={creating || !name.trim()}>
          <Plus size={16} strokeWidth={2.25} />
          {creating ? "Creating…" : "Create"}
        </Button>
      </form>

      {errMsg && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
          {errMsg}
        </p>
      )}

      {isLoading && !projects ? (
        <p className="font-mono text-xs text-[var(--color-faint)]">Loading…</p>
      ) : !projects || projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          hint="Create your first project above to get going."
        />
      ) : (
        <ul className="-mx-6 border-t border-line">
          {projects.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="group flex items-center gap-6 border-b border-line px-6 py-4 transition-colors duration-200 hover:bg-[var(--color-surface)] cursor-pointer"
              >
                <span className="font-mono text-xs text-[var(--color-faint)] tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base text-[var(--color-fg)]">{p.name}</span>
                {p.archived_at && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-faint)]">
                    Archived
                  </span>
                )}
                <ArrowRight
                  size={16}
                  className="ml-auto text-[var(--color-faint)] transition-colors duration-200 group-hover:text-[var(--color-accent)]"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
