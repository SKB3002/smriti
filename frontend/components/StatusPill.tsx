import { clsx } from "clsx";

export type TaskStatus = "todo" | "doing" | "done" | "blocked";

const LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
  blocked: "Blocked",
};

const STYLES: Record<TaskStatus, string> = {
  todo: "border-line-strong text-[var(--color-muted)]",
  doing: "border-[var(--color-accent)]/60 text-[var(--color-accent)]",
  done: "border-[var(--color-success)]/40 text-[var(--color-success)]",
  blocked: "border-[var(--color-danger)]/40 text-[var(--color-danger)]",
};

export function StatusPill({ status }: { status: TaskStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
