"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "./Field";

const DEBOUNCE_MS = 5 * 60 * 1000;
const STORAGE_KEY = "prioritize:lastCallAt";

type Item = { task_id: string; score: number; reason: string };
type Response = { items: Item[] };

function remainingMs(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;
  const last = Number(raw);
  if (!Number.isFinite(last)) return 0;
  const elapsed = Date.now() - last;
  return Math.max(0, DEBOUNCE_MS - elapsed);
}

export function usePrioritizeDebounce(): () => boolean {
  return useCallback(() => {
    if (remainingMs() > 0) return false;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    return true;
  }, []);
}

function formatMs(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default function PrioritizePanel() {
  const allow = usePrioritizeDebounce();
  const [items, setItems] = useState<Item[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    setCooldown(remainingMs());
    const id = window.setInterval(() => setCooldown(remainingMs()), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function run() {
    setErr(null);
    if (!allow()) {
      setErr(`Wait ${formatMs(remainingMs())} before re-running.`);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<Response>("/ai/prioritize", {
        method: "POST",
        body: { n: 5 },
      });
      setItems(res.items);
      // Best-effort: fetch task titles for display.
      try {
        const tasks = await apiFetch<{ id: string; title: string }[]>("/tasks");
        const map: Record<string, string> = {};
        for (const t of tasks) map[t.id] = t.title;
        setTitles(map);
      } catch {
        /* leave map empty; render task_id fallback */
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setErr("Server cooldown — try again shortly.");
      } else if (e instanceof ApiError) {
        setErr(`API ${e.status}`);
      } else {
        setErr((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border border-line p-5">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
            AI assist
          </p>
          <h2 className="text-lg text-[var(--color-fg)]">
            Top 5 priorities
          </h2>
        </div>
        <Button
          onClick={run}
          disabled={loading || cooldown > 0}
          variant={items ? "ghost" : "primary"}
        >
          <Sparkles size={14} />
          {loading
            ? "Thinking…"
            : cooldown > 0
              ? formatMs(cooldown)
              : items
                ? "Re-run"
                : "Prioritize"}
        </Button>
      </header>

      {err && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
          {err}
        </p>
      )}

      {items && items.length === 0 && (
        <p className="text-sm text-[var(--color-muted)]">
          Nothing open to prioritize.
        </p>
      )}

      {items && items.length > 0 && (
        <ol className="-mx-5 border-t border-line">
          {items.map((it, i) => (
            <li
              key={it.task_id}
              className="flex items-start gap-4 border-b border-line px-5 py-3"
            >
              <span className="font-mono text-xs text-[var(--color-faint)] tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-[var(--color-fg)]">
                  {titles[it.task_id] ?? it.task_id}
                </p>
                <p className="text-sm text-[var(--color-muted)]">{it.reason}</p>
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--color-accent)]">
                p{it.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
