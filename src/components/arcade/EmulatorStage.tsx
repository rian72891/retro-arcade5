import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Maximize, RotateCcw } from "lucide-react";

import { getRomUrl, systemById, type Game } from "@/lib/arcade";

declare global {
  interface Window {
    EJS_player?: string;
    EJS_core?: string;
    EJS_gameUrl?: string;
    EJS_gameName?: string;
    EJS_pathtodata?: string;
    EJS_startOnLoaded?: boolean;
    EJS_VirtualGamepadSettings?: unknown;
    EJS_emulator?: {
      restart?: () => void;
      toggleFullscreen?: (state: boolean) => void;
      elements?: { parent?: HTMLElement };
    };
  }
}

const EJS_DATA_PATH = "https://cdn.emulatorjs.org/stable/data/";

export function EmulatorStage({ game }: { game: Game }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Carregando cartucho…");

  const system = systemById(game.system);

  useEffect(() => {
    let cancelled = false;
    let script: HTMLScriptElement | null = null;

    async function boot() {
      try {
        const romUrl = await getRomUrl(game.file_path);
        if (cancelled) return;

        window.EJS_player = "#emulator-stage";
        window.EJS_core = system?.core ?? game.system;
        window.EJS_gameUrl = romUrl;
        window.EJS_gameName = game.name;
        window.EJS_pathtodata = EJS_DATA_PATH;
        window.EJS_startOnLoaded = true;

        script = document.createElement("script");
        script.src = `${EJS_DATA_PATH}loader.js`;
        script.onload = () => !cancelled && setStatus("ready");
        script.onerror = () => {
          if (cancelled) return;
          setStatus("error");
          setMessage("Não foi possível carregar o emulador.");
        };
        document.body.appendChild(script);
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Não foi possível carregar o arquivo da ROM.");
      }
    }

    void boot();

    return () => {
      cancelled = true;
      script?.remove();
      if (containerRef.current) containerRef.current.innerHTML = "";
      delete window.EJS_emulator;
    };
  }, [game.file_path, game.name, game.system, system?.core]);

  function restart() {
    window.EJS_emulator?.restart?.();
  }

  function fullscreen() {
    const target = window.EJS_emulator?.elements?.parent ?? containerRef.current;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void target?.requestFullscreen?.();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/80 px-4 py-3 shadow-cabinet">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{game.name}</p>
          <p className="font-pixel text-[9px] uppercase text-muted-foreground">
            {system?.label ?? game.system}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HudButton onClick={restart} label="Reiniciar">
            <RotateCcw className="size-4" />
          </HudButton>
          <HudButton onClick={fullscreen} label="Tela cheia">
            <Maximize className="size-4" />
          </HudButton>
          <Link
            to="/jogos"
            aria-label="Voltar para a lista"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-neon-pink"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border bg-black shadow-neon">
        <div id="emulator-stage" ref={containerRef} className="aspect-video w-full" />
        {status !== "ready" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="font-pixel text-[10px] uppercase text-neon">{message}</p>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Desktop: setas + Z / X / Enter / Shift. No celular, o controle virtual aparece sobre a tela.
      </p>
    </div>
  );
}

function HudButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-neon"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
