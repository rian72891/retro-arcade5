import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { ArcadeShell } from "@/components/arcade/ArcadeFrame";
import { EmulatorStage } from "@/components/arcade/EmulatorStage";
import { fetchGame } from "@/lib/arcade";

export const Route = createFileRoute("/jogar/$gameId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Jogando — Fliperama Digital" },
      {
        name: "description",
        content: "Rode seu cartucho direto no navegador, com HUD, tela cheia e controles na tela.",
      },
      { property: "og:title", content: "Jogando — Fliperama Digital" },
      { property: "og:description", content: "Emulação retrô direto no navegador." },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { gameId } = Route.useParams();
  const { data: game, isLoading, error } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGame(gameId),
  });

  return (
    <ArcadeShell title="Fliperama">
      {isLoading ? (
        <div className="aspect-video w-full animate-pulse rounded-lg border border-border bg-card/60" />
      ) : error || !game ? (
        <div className="rounded-lg border border-border bg-card/70 p-10 text-center">
          <p className="font-pixel text-xs text-destructive">Cartucho não encontrado</p>
          <Link
            to="/jogos"
            className="font-pixel mt-6 inline-block rounded-md border border-primary bg-primary/15 px-5 py-3 text-[10px] uppercase text-neon-pink"
          >
            Voltar
          </Link>
        </div>
      ) : (
        <EmulatorStage game={game} />
      )}
    </ArcadeShell>
  );
}
