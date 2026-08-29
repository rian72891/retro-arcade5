import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ArcadeShell } from "@/components/arcade/ArcadeFrame";
import { Cartridge } from "@/components/arcade/Cartridge";
import { deleteGame, fetchGames, type Game } from "@/lib/arcade";

export const Route = createFileRoute("/jogos")({
  head: () => ({
    meta: [
      { title: "Meus Jogos — Fliperama Digital" },
      {
        name: "description",
        content: "Sua estante de cartuchos: veja e inicie qualquer ROM que você já enviou.",
      },
      { property: "og:title", content: "Meus Jogos — Fliperama Digital" },
      { property: "og:description", content: "Sua estante de cartuchos no Fliperama Digital." },
    ],
  }),
  component: GamesPage,
});

function GamesPage() {
  const queryClient = useQueryClient();
  const { data: games, isLoading, error } = useQuery({ queryKey: ["games"], queryFn: fetchGames });

  const removeGame = useMutation({
    mutationFn: (game: Game) => deleteGame(game),
    onSuccess: () => {
      toast.success("Cartucho removido");
      queryClient.invalidateQueries({ queryKey: ["games"] });
    },
    onError: () => toast.error("Não foi possível remover o cartucho"),
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
        <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {games.map((game) => (
            <Cartridge key={game.id} game={game} onDelete={(g) => removeGame.mutate(g)} />
          ))}
        </div>
      )}
    </ArcadeShell>
  );
}
