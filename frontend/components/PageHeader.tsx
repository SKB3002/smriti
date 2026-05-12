export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-6 border-b border-line pb-6">
      <div className="space-y-2">
        {eyebrow && (
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-faint)]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {title}
          <span className="text-[var(--color-accent)]">.</span>
        </h1>
        {subtitle && (
          <p className="max-w-md text-[var(--color-muted)]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-line-strong px-6 py-16 text-center">
      <p className="text-[var(--color-fg)]">{title}</p>
      {hint && <p className="text-sm text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
