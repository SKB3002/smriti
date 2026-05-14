import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { AmbientGlow } from "@/components/AmbientGlow";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { SessionInit } from "@/components/SessionInit";
import { SWRProvider } from "@/components/SWRProvider";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smriti",
  description: "Projects, tasks, and reminders with stealth push.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#14110f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <SWRProvider>
          <SessionInit />
          <ServiceWorkerRegistrar />
          <AmbientGlow />
          <TopNav />
          <main className="relative z-10 w-full px-6 pb-16 pt-10">{children}</main>
        </SWRProvider>
      </body>
    </html>
  );
}
