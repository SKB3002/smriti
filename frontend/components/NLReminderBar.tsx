"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import type { ReminderParseResult } from "@/lib/types";

const TAG_COLORS: Record<string, string> = {
  work: "border-blue-500/50 text-blue-400",
  health: "border-green-500/50 text-green-400",
  finance: "border-yellow-500/50 text-yellow-400",
  personal: "border-purple-400/50 text-purple-300",
  family: "border-pink-400/50 text-pink-300",
  errands: "border-orange-400/50 text-orange-300",
  learning: "border-cyan-400/50 text-cyan-300",
  other: "border-line-strong text-[var(--color-muted)]",
};

export function TagChip({ tag }: { tag: string }) {
  const cls = TAG_COLORS[tag] ?? TAG_COLORS.other;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${cls}`}
    >
      {tag}
    </span>
  );
}

type Props = {
  onParsed: (result: ReminderParseResult) => void;
};

export function NLReminderBar({ onParsed }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setErr(null);
    try {
      const tzOffsetMinutes = -new Date().getTimezoneOffset();
      const result = await apiFetch<ReminderParseResult>("/reminders/parse", {
        method: "POST",
        body: { text: trimmed, tz_offset_minutes: tzOffsetMinutes },
      });
      onParsed(result);
      setText("");
    } catch (e) {
      setErr(e instanceof ApiError ? `API ${e.status}` : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-accent)]">
            <Sparkles size={15} strokeWidth={2} />
          </span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "remind me to call the dentist tomorrow at 10am"'
            disabled={busy}
            className="h-[44px] w-full rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] pl-9 pr-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-faint)] focus:border-[var(--color-accent)] focus:outline-none transition-colors duration-200 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="flex h-[44px] items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-fg)] transition-opacity duration-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {busy ? "Parsing…" : "Parse"}
        </button>
      </div>
      {err && (
        <p className="text-xs text-[var(--color-danger)]">{err}</p>
      )}
    </form>
  );
}
