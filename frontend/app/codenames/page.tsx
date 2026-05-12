"use client";

import { useState } from "react";
import useSWR from "swr";
import { Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button, Field } from "@/components/Field";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import StealthReveal from "@/components/StealthReveal";

type Codename = {
  id: string;
  user_id: string;
  codename: string;
  real_label: string;
  created_at: string;
  updated_at: string;
};

export default function CodenamesPage() {
  const { data: items, error, isLoading, mutate } = useSWR<Codename[]>("/codenames");
  const [codename, setCodename] = useState("");
  const [realLabel, setRealLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!codename.trim() || !realLabel.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const created = await apiFetch<Codename>("/codenames", {
        method: "POST",
        body: { codename: codename.trim(), real_label: realLabel.trim() },
      });
      setCodename("");
      setRealLabel("");
      mutate([created, ...(items ?? [])], { revalidate: true });
    } catch (e) {
      setErr(e instanceof ApiError ? `API ${e.status}` : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    // Optimistic remove.
    mutate(items?.filter((c) => c.id !== id), { revalidate: false });
    await apiFetch(`/codenames/${id}`, { method: "DELETE" }).catch(() => mutate());
  }

  const errMsg = err ?? (error ? (error instanceof ApiError ? `API ${error.status}` : (error as Error).message) : null);

  return (
    <section className="space-y-10">
      <PageHeader
        eyebrow="Disguise"
        title="Codenames"
        subtitle="Push notifications show the codename. Real text reveals after a press-and-hold."
      />

      <form onSubmit={onCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Codename" name="codename" value={codename} onChange={(e) => setCodename(e.target.value)} placeholder="e.g. alpha" />
        <Field label="Real label" name="real_label" value={realLabel} onChange={(e) => setRealLabel(e.target.value)} placeholder="e.g. Doctor's appointment" />
        <Button type="submit" disabled={busy || !codename.trim() || !realLabel.trim()}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </form>

      {errMsg && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
          {errMsg}
        </p>
      )}

      {isLoading && !items ? (
        <p className="font-mono text-xs text-[var(--color-faint)]">Loading…</p>
      ) : !items || items.length === 0 ? (
        <EmptyState title="No codenames yet" hint="Add a pair above to mask your reminder text." />
      ) : (
        <ul className="-mx-6 border-t border-line">
          {items.map((c) => (
            <li key={c.id} className="group flex items-center gap-6 border-b border-line px-6 py-4 transition-colors duration-200 hover:bg-[var(--color-surface)]">
              <span className="w-32 truncate font-mono text-sm text-[var(--color-fg)]">{c.codename}</span>
              <span className="flex-1">
                <StealthReveal codename={c.codename} realText={c.real_label} className="text-[var(--color-muted)]" />
              </span>
              <button type="button" aria-label="Delete codename" onClick={() => onDelete(c.id)} className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-[var(--color-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)] transition-colors duration-200 cursor-pointer">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
