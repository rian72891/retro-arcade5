import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Star, History } from "lucide-react";
import { toast } from "sonner";

import { ArcadeShell } from "@/components/arcade/ArcadeFrame";
import { Cartridge } from "@/components/arcade/Cartridge";
import {
  deleteGame,
  fetchGames,
  toggleFavorite,
  uploadCover,
  SYSTEMS,
  type Game,
} from "@/lib/arcade";


export const Route = createFileRoute("/jogos")({
  head: () => ({
    meta: [
      { title: "Meus Jogos — Fliperama Digital" },
      {
        name: "description",
        content: "Sua estante de cartuchos: busque, filtre por console e inicie qualquer ROM.",
      },
      { property: "og:title", content: "Meus Jogos — Fliperama Digital" },
      { property: "og:description", content: "Sua estante de cartuchos no Fliperama Digital." },
    ],
  }),
  component: GamesPage,
});

function SectionTitle({ icon: Icon, label }: { icon: typeof Star; label: string }) {
  return (
    <h2 className="font-pixel mb-5 flex items-center gap-2 text-[10px] uppercase text-neon">
      <Icon className="size-4" /> {label}
    </h2>
  );
}

function GamesPage() {
  const queryClient = useQueryClient();
  const { data: games, isLoading, error } = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const [search, setSearch] = useState("");
  const [system, setSystem] = useState("all");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["games"] });

  const removeGame = useMutation({
    mutationFn: (game: Game) => deleteGame(game),
    onSuccess: () => {
      toast.success("Cartucho removido");
      invalidate();
    },
    onError: () => toast.error("Não foi possível remover o cartucho"),
  });

  const favorite = useMutation({
    mutationFn: (game: Game) => toggleFavorite(game),
    onSuccess: (game) => {
      toast.success(game.is_favorite ? "Adicionado aos favoritos" : "Removido dos favoritos");
      invalidate();
    },
    onError: () => toast.error("Não foi possível atualizar o favorito"),
  });

  const availableSystems = useMemo(() => {
    const ids = new Set((games ?? []).map((g) => g.system));
    return SYSTEMS.filter((s) => ids.has(s.id));
  }, [games]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (games ?? []).filter(
      (g) =>
        (system === "all" || g.system === system) &&
        (!term || g.name.toLowerCase().includes(term)),
    );
  }, [games, search, system]);

  const favorites = filtered.filter((g) => g.is_favorite);
  const recent = filtered
    .filter((g) => g.last_played_at)
    .sort((a, b) => (a.last_played_at! < b.last_played_at! ? 1 : -1))
    .slice(0, 4);

  const cover = useMutation({
    mutationFn: ({ game, file }: { game: Game; file: File }) => uploadCover(game, file),
    onSuccess: () => {
      toast.success("Capa atualizada");
      invalidate();
    },
    onError: () => toast.error("Não foi possível enviar a capa"),
  });

  const cardProps = (game: Game) => ({
    game,
    onDelete: (g: Game) => removeGame.mutate(g),
    onToggleFavorite: (g: Game) => favorite.mutate(g),
    onUploadCover: (g: Game, file: File) => cover.mutate({ game: g, file }),
  });


  return (
    <ArcadeShell title="Meus Jogos" subtitle="Escolha um cartucho e aperte start.">
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-60 animate-pulse rounded-lg border border-border bg-card/60" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Erro ao carregar seus jogos.</p>
      ) : !games?.length ? (
        <div className="rounded-lg border border-border bg-card/70 p-10 text-center shadow-cabinet">
          <p className="font-pixel text-xs text-neon">Nenhum cartucho ainda</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Suba a ROM de um jogo que você possui para começar.
          </p>
          <Link
            to="/upload"
            className="font-pixel mt-8 inline-block rounded-md border border-primary bg-primary/15 px-5 py-3 text-[10px] uppercase text-neon-pink shadow-neon"
          >
            Subir ROM
          </Link>
        </div>
      ) : (
        <div className="space-y-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome…"
                aria-label="Buscar jogos por nome"
                className="w-full rounded-md border border-border bg-card/70 py-3 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <select
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              aria-label="Filtrar por console"
              className="rounded-md border border-border bg-card/70 px-3 py-3 text-sm outline-none transition-colors focus:border-primary"
            >
              <option value="all">Todos os consoles</option>
              {availableSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {recent.length ? (
            <section>
              <SectionTitle icon={History} label="Jogados recentemente" />
              <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {recent.map((game) => (
                  <Cartridge key={`recent-${game.id}`} {...cardProps(game)} />
                ))}
              </div>
            </section>
          ) : null}

          {favorites.length ? (
            <section>
              <SectionTitle icon={Star} label="Favoritos" />
              <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {favorites.map((game) => (
                  <Cartridge key={`fav-${game.id}`} {...cardProps(game)} />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionTitle icon={Star} label={`Todos os cartuchos (${filtered.length})`} />
            {filtered.length ? (
              <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((game) => (
                  <Cartridge key={game.id} {...cardProps(game)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum cartucho encontrado com esses filtros.
              </p>
            )}
          </section>
        </div>
      )}
    </ArcadeShell>
  );
}
