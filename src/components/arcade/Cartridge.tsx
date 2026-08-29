import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

import { systemById, type Game } from "@/lib/arcade";

export function Cartridge({ game, onDelete }: { game: Game; onDelete?: (game: Game) => void }) {
  const system = systemById(game.system);
  const initials = game.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "??";

  return (
    <div className="group relative">
      <Link
        to="/jogar/$gameId"
        params={{ gameId: game.id }}
        className="block overflow-hidden rounded-lg border border-border bg-card shadow-cabinet transition-all hover:-translate-y-1.5 hover:shadow-neon"
      >
        <div className="relative flex h-40 items-center justify-center bg-secondary">
          <div className="pointer-events-none absolute inset-0 grid-floor opacity-40" aria-hidden />
          <span className="font-pixel relative text-2xl text-neon-pink">{initials}</span>
          <div className="absolute bottom-0 h-4 w-2/3 rounded-t-sm bg-background/70" />
        </div>
        <div className="space-y-1 border-t border-border p-3">
          <p className="truncate text-sm font-semibold">{game.name}</p>
          <p className="font-pixel text-[9px] uppercase text-muted-foreground">
            {system?.label ?? game.system}
          </p>
        </div>
      </Link>

      {onDelete ? (
        <button
          type="button"
          aria-label={`Remover ${game.name}`}
          onClick={() => onDelete(game)}
          className="absolute right-2 top-2 rounded-md border border-border bg-background/85 p-2 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
