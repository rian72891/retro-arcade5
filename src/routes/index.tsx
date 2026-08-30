import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, Upload, Joystick } from "lucide-react";

import { ArcadeNav } from "@/components/arcade/ArcadeFrame";
import { SYSTEMS } from "@/lib/arcade";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fliperama Digital — Seu arcade retrô no navegador" },
      {
        name: "description",
        content:
          "Monte seu fliperama retrô: envie suas próprias ROMs, organize seus cartuchos e jogue clássicos direto no navegador com teclado ou controles na tela.",
      },
      { property: "og:title", content: "Fliperama Digital — Seu arcade retrô no navegador" },
      {
        property: "og:description",
        content: "Envie suas ROMs, monte sua estante de cartuchos e jogue clássicos no navegador.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 grid-floor opacity-30" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-pixel text-sm text-neon-pink animate-flicker sm:text-base">
            FLIPERAMA<span className="text-neon"> DIGITAL</span>
          </span>
          <ArcadeNav />
        </header>

        <section className="mx-auto max-w-3xl text-center">
          <p className="font-pixel text-[10px] uppercase tracking-widest text-neon">
            Insira uma ficha
          </p>
          <h1 className="mt-6 text-2xl leading-relaxed text-neon-pink sm:text-4xl">
            SEU FLIPERAMA
            <br />
            NO NAVEGADOR
          </h1>
          <p className="mt-8 text-sm text-muted-foreground sm:text-base">
            Suba as ROMs dos jogos que você possui, monte sua estante de cartuchos e jogue na hora —
            teclado no desktop, controle virtual no celular.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/jogos"
              className="font-pixel inline-flex items-center gap-3 rounded-md border border-primary bg-primary/15 px-6 py-4 text-[11px] uppercase text-neon-pink shadow-neon transition-transform hover:-translate-y-1"
            >
              <Gamepad2 className="size-4" /> Meus Jogos
            </Link>
            <Link
              to="/upload"
              className="font-pixel inline-flex items-center gap-3 rounded-md border border-accent bg-accent/10 px-6 py-4 text-[11px] uppercase text-neon shadow-neon-cyan transition-transform hover:-translate-y-1"
            >
              <Upload className="size-4" /> Subir ROM
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Upload, title: "Suba suas ROMs", text: "Arquivos .nes, .snes, .gba, .zip e mais." },
            { icon: Joystick, title: "Controles", text: "Teclado no PC e gamepad virtual no toque." },
            { icon: Gamepad2, title: "Jogue na hora", text: "Emulação direto no navegador, sem instalar." },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border bg-card/70 p-6 text-center shadow-cabinet"
            >
              <item.icon className="mx-auto size-6 text-accent" />
              <h2 className="mt-4 text-xs text-foreground">{item.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-24">
          <h2 className="font-pixel text-center text-[10px] uppercase tracking-widest text-neon">
            Consoles suportados
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {SYSTEMS.map((s) => (
              <span
                key={s.id}
                title={s.label}
                className={`font-pixel rounded-md border border-border bg-card/70 px-4 py-3 text-[9px] uppercase shadow-cabinet ${s.accent}`}
              >
                {s.short}
              </span>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Sem PS2 ou consoles mais pesados — não rodam bem no navegador.
          </p>
        </section>


        <p className="mt-16 text-center text-xs text-muted-foreground">
          Envie apenas ROMs de jogos que você possui legalmente.
        </p>
      </div>
    </div>
  );
}
