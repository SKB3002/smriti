"use client";

import { clsx } from "clsx";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly SegmentedOption<T>[];
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded-[var(--radius-sm)] border border-line-strong text-sm"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            "px-3 py-1.5 transition-colors duration-200 cursor-pointer",
            value === opt.value
              ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-fg)]",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
