import { Link } from "@tanstack/react-router";
import { Star, Trash2 } from "lucide-react";

import { coverPalette, gameInitials, systemById, type Game } from "@/lib/arcade";

export function GameCover({ game }: { game: Game }) {
  const palette = coverPalette(game.name);

  if (game.cover_url) {
    return (
      <img
        src={game.cover_url}
        alt={`Capa de ${game.name}`}
        loading="lazy"
        className="h-40 w-full object-cover"
      />
    );
  }

  return (
    <div
      className="relative flex h-40 items-center justify-center"
      style={{ background: `linear-gradient(140deg, ${palette.from}, ${palette.to})` }}
    >
      <div className="pointer-events-none absolute inset-0 grid-floor opacity-30" aria-hidden />
      <span className="font-pixel relative text-2xl text-primary-foreground drop-shadow">
        {gameInitials(game.name)}
      </span>
      <div className="absolute bottom-0 h-4 w-2/3 rounded-t-sm bg-background/60" />
    </div>
  );
}

export function Cartridge({
  game,
  onDelete,
  onToggleFavorite,
}: {
  game: Game;
  onDelete?: (game: Game) => void;
  onToggleFavorite?: (game: Game) => void;
}) {
  const system = systemById(game.system);

  return (
    <div className="group relative">
      <Link
        to="/jogar/$gameId"
        params={{ gameId: game.id }}
        className="block overflow-hidden rounded-lg border border-border bg-card shadow-cabinet transition-all hover:-translate-y-1.5 hover:shadow-neon"
      >
        <div className="relative overflow-hidden bg-secondary">
          <GameCover game={game} />
        </div>
        <div className="space-y-1 border-t border-border p-3">
          <p className="truncate text-sm font-semibold">{game.name}</p>
          <div className="flex items-center justify-between gap-2">
            <p className={`font-pixel text-[9px] uppercase ${system?.accent ?? "text-muted-foreground"}`}>
              {system?.label ?? game.system}
            </p>
            {game.play_count > 0 ? (
              <span className="text-[10px] text-muted-foreground">{game.play_count}x</span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="absolute right-2 top-2 flex flex-col gap-2">
        {onToggleFavorite ? (
          <button
            type="button"
            aria-label={game.is_favorite ? `Desfavoritar ${game.name}` : `Favoritar ${game.name}`}
            aria-pressed={game.is_favorite}
            onClick={() => onToggleFavorite(game)}
            className={`rounded-md border border-border bg-background/85 p-2 transition-all ${
              game.is_favorite
                ? "text-neon-amber opacity-100"
                : "text-muted-foreground opacity-0 hover:text-neon-amber group-hover:opacity-100"
            }`}
          >
            <Star className={`size-4 ${game.is_favorite ? "fill-current" : ""}`} />
          </button>
        ) : null}

        {onDelete ? (
          <button
            type="button"
            aria-label={`Remover ${game.name}`}
            onClick={() => onDelete(game)}
            className="rounded-md border border-border bg-background/85 p-2 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
