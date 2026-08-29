import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function ArcadeNav() {
  return (
    <nav className="flex flex-wrap items-center gap-2 sm:gap-4">
      {[
        { to: "/", label: "Início" },
        { to: "/jogos", label: "Meus Jogos" },
        { to: "/upload", label: "Upload" },
      ].map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          className="font-pixel rounded border border-border px-3 py-2 text-[10px] uppercase text-muted-foreground transition-all hover:text-neon sm:text-xs"
          activeProps={{ className: "text-neon-pink shadow-neon" }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function ArcadeShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 opacity-25 grid-floor" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="font-pixel text-sm text-neon-pink animate-flicker sm:text-base">
            FLIPERAMA
            <span className="text-neon"> DIGITAL</span>
          </Link>
          <ArcadeNav />
        </header>

        <div className="mb-8">
          <h1 className="text-xl text-neon sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>

        {children}
      </div>
    </div>
  );
}
