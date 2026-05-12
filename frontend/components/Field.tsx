import { clsx } from "clsx";

export function Field({
  label,
  hint,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  const id = rest.id ?? rest.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
        {label}
      </span>
      <input
        id={id}
        {...rest}
        className={clsx(
          "block w-full rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] px-3 py-2.5 text-[var(--color-fg)] placeholder:text-[var(--color-faint)] focus:border-[var(--color-accent)] focus:outline-none transition-colors duration-200",
          className,
        )}
      />
      {hint && <span className="block text-xs text-[var(--color-muted)]">{hint}</span>}
    </label>
  );
}

export function Button({
  variant = "primary",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:brightness-110 transition-[filter] duration-200",
    ghost:
      "border border-line-strong text-[var(--color-fg)] hover:border-[var(--color-fg)] transition-colors duration-200",
    danger:
      "border border-line-strong text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors duration-200",
  } as const;
  return (
    <button
      {...rest}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
    />
  );
}
