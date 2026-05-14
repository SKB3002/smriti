"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

/**
 * Deterministic-per-route ambient coral glows. Positions are derived from the
 * pathname so each page has its own fixed-but-varied layout — no hydration
 * mismatch, no jitter across navigations.
 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

type Blob = {
  top: string;
  left: string;
  size: number;
  opacity: number;
  hue: "coral" | "warm";
};

function blobsForRoute(path: string): Blob[] {
  const seed = hash(path || "/");
  const rand = (n: number, mod: number) =>
    ((seed >> (n * 3)) ^ (seed * (n + 7))) % mod;

  const positions: { top: string; left: string }[] = [
    { top: `${-10 + (rand(0, 30))}%`, left: `${-15 + rand(1, 40)}%` },
    { top: `${20 + rand(2, 50)}%`, left: `${50 + rand(3, 40)}%` },
    { top: `${60 + rand(4, 25)}%`, left: `${-10 + rand(5, 30)}%` },
  ];

  return positions.map((p, i) => ({
    ...p,
    size: 700 + rand(i + 6, 400),
    opacity: 0.45 + (rand(i + 9, 20) / 100),
    hue: i === 1 ? "warm" : "coral",
  }));
}

export function AmbientGlow() {
  const pathname = usePathname();
  const blobs = useMemo(() => blobsForRoute(pathname), [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            opacity: b.opacity,
            background:
              b.hue === "coral"
                ? "radial-gradient(circle, rgba(255,138,76,0.55), rgba(255,138,76,0) 65%)"
                : "radial-gradient(circle, rgba(255,180,140,0.40), rgba(255,180,140,0) 60%)",
          }}
        />
      ))}
    </div>
  );
}
