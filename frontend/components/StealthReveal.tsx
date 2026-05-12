"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

export type StealthRevealProps = {
  codename: string;
  realText: string;
  holdMs?: number;
  className?: string;
};

/**
 * Renders the codename as a "shell" and reveals `realText` only while the user
 * is pressing-and-holding for at least `holdMs` (default 600ms). Releasing
 * re-blurs immediately. Works with mouse + touch via Pointer Events.
 */
export default function StealthReveal({
  codename,
  realText,
  holdMs = 600,
  className,
}: StealthRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [pressing, setPressing] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  function startHold(e: React.PointerEvent) {
    e.preventDefault();
    setPressing(true);
    timer.current = window.setTimeout(() => setRevealed(true), holdMs);
  }

  function endHold() {
    setPressing(false);
    setRevealed(false);
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Hold to reveal: ${codename}`}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      onContextMenu={(e) => e.preventDefault()}
      className={clsx(
        "relative inline-flex select-none items-center gap-2 cursor-pointer",
        className,
      )}
    >
      <span
        className={clsx(
          "inline-block transition-[filter,opacity] duration-200 ease-out",
          revealed
            ? "blur-0 opacity-100"
            : pressing
              ? "blur-[3px] opacity-90"
              : "blur-[6px] opacity-80",
        )}
      >
        {revealed ? realText : codename}
      </span>
      {!revealed && (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
          hold
        </span>
      )}
    </span>
  );
}
