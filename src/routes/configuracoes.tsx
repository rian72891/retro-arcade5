import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Gamepad2, HardDrive, Info, Monitor, Palette, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ArcadeShell, ThemeToggle } from "@/components/arcade/ArcadeFrame";
import { deleteGame, fetchGames, systemLabel, type Game } from "@/lib/arcade";
import {
  PERFORMANCE_PRESET,
  SCALES,
  SHADERS,
  THREAD_MODES,
  isPerformanceMode,
  loadSettings,
  saveSettings,
  type PlayerSettings,
  type ThreadMode,
} from "@/lib/player-settings";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/configuracoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configurações — Fliperama Digital" },
      {
        name: "description",
        content:
          "Ajuste emulação, shaders, resolução, rewind, threads, controles, armazenamento e aparência do seu fliperama.",
      },
      { property: "og:title", content: "Configurações — Fliperama Digital" },
      {
        property: "og:description",
        content: "Painel global de emulação, controles, armazenamento e aparência.",
      },
    ],
  }),
  component: SettingsPage,
});

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Monitor;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/70 p-5 shadow-cabinet">
      <h2 className="font-pixel flex items-center gap-2 text-[10px] uppercase text-neon">
        <Icon className="size-4" /> {title}
      </h2>
      {children}
    </section>
  );
}

function SettingsPage() {
  const [settings, setSettings] = useState<PlayerSettings>(() => loadSettings());
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { data: games } = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const [pads, setPads] = useState<string[]>([]);

  useEffect(() => setSettings(loadSettings()), []);
  useEffect(() => saveSettings(settings), [settings]);

  const update = useCallback(
    <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) =>
      setSettings((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const scanPads = useCallback(() => {
    const list = Array.from(navigator.getGamepads?.() ?? [])
      .filter(Boolean)
      .map((p) => `${p!.id} (${p!.buttons.length} botões)`);
    setPads(list);
    if (!list.length) toast.info("Nenhum controle detectado — pressione um botão do gamepad");
  }, []);

  useEffect(() => {
    const handler = () => scanPads();
    window.addEventListener("gamepadconnected", handler);
    return () => window.removeEventListener("gamepadconnected", handler);
  }, [scanPads]);

  function performanceMode() {
    setSettings((prev) => ({ ...prev, ...PERFORMANCE_PRESET }));
    toast.success("Modo Performance ativado — recarregue o jogo para aplicar");
  }

  function clearLocalCache() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("EJS") || k.startsWith("ejs"))
        .forEach((k) => localStorage.removeItem(k));
      void indexedDB.deleteDatabase("EmulatorJS-cache");
      toast.success("Cache do emulador limpo");
    } catch {
      toast.error("Não foi possível limpar o cache");
    }
  }

  async function removeGameEntry(game: Game) {
    try {
      await deleteGame(game);
      await queryClient.invalidateQueries({ queryKey: ["games"] });
      toast.success("Cartucho removido");
    } catch {
      toast.error("Não foi possível remover");
    }
  }

  return (
    <ArcadeShell
      title="Configurações"
      subtitle="Painel global do fliperama — vale para todos os jogos."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card icon={Monitor} title="Emulação">
          <button
            type="button"
            onClick={performanceMode}
            className={`font-pixel inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-3 text-[10px] uppercase transition-colors ${
              isPerformanceMode(settings)
                ? "border-primary bg-primary/20 text-neon-pink"
                : "border-border bg-background/70 text-muted-foreground hover:text-neon"
            }`}
          >
            <Rocket className="size-4" /> Modo Performance
          </button>
          <p className="text-xs text-muted-foreground">
            Desliga rewind, usa pixel nítido, resolução nativa e single-thread — o cenário mais
            rápido na maioria dos cores.
          </p>

          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Filtro / shader padrão</span>
            <select
              value={settings.shader}
              onChange={(e) => update("shader", e.target.value as PlayerSettings["shader"])}
              className="w-full rounded-md border border-border bg-input px-2 py-2 text-xs outline-none focus:border-accent"
            >
              {SHADERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Resolução interna padrão</span>
            <select
              value={settings.scale}
              onChange={(e) => update("scale", Number(e.target.value))}
              className="w-full rounded-md border border-border bg-input px-2 py-2 text-xs outline-none focus:border-accent"
            >
              {SCALES.map((s) => (
                <option key={s} value={s}>
                  {s}x {s === 1 ? "(nativo)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Multi-thread</span>
            <select
              value={settings.threads}
              onChange={(e) => update("threads", e.target.value as ThreadMode)}
              className="w-full rounded-md border border-border bg-input px-2 py-2 text-xs outline-none focus:border-accent"
            >
              {THREAD_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.hint}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-3 text-xs">
            <input
              type="checkbox"
              checked={settings.rewind}
              onChange={(e) => update("rewind", e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span>
              Rewind por padrão
              <span className="block text-[10px] text-muted-foreground">
                Custa performance: o core grava um snapshot a cada poucos frames.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-xs">
            <input
              type="checkbox"
              checked={settings.showFps}
              onChange={(e) => update("showFps", e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span>Mostrar contador de FPS</span>
          </label>
        </Card>

        <Card icon={Gamepad2} title="Controles">
          <p className="text-xs text-muted-foreground">
            Teclado: setas + Z / X / Enter / Shift. Gamepads USB/Bluetooth são detectados
            automaticamente; o remapeamento fino fica no menu de controles dentro do jogo.
          </p>
          <button
            type="button"
            onClick={scanPads}
            className="font-pixel rounded-md border border-accent bg-accent/10 px-4 py-3 text-[10px] uppercase text-neon"
          >
            Testar gamepads
          </button>
          {pads.length ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {pads.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card icon={HardDrive} title="Armazenamento">
          <button
            type="button"
            onClick={clearLocalCache}
            className="font-pixel rounded-md border border-border bg-background/70 px-4 py-3 text-[10px] uppercase text-muted-foreground transition-colors hover:text-neon"
          >
            Limpar cache do emulador
          </button>
          <div className="space-y-2">
            {(games ?? []).length ? (
              (games ?? []).map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{game.name}</p>
                    <p className="font-pixel text-[9px] uppercase text-muted-foreground">
                      {systemLabel(game.system)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remover ${game.name}`}
                    onClick={() => void removeGameEntry(game)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma ROM salva.{" "}
                <Link to="/upload" className="text-neon">
                  Subir agora
                </Link>
                .
              </p>
            )}
          </div>
        </Card>

        <Card icon={Palette} title="Aparência">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <ThemeToggle />
            <span>Tema atual: {theme === "dark" ? "escuro (neon)" : "claro"}</span>
          </div>
        </Card>

        <Card icon={Info} title="Sobre">
          <p className="text-xs text-muted-foreground">
            Fliperama Digital roda cores do EmulatorJS direto no navegador. Capas reais vêm do
            projeto libretro-thumbnails. Suba apenas ROMs de jogos que você possui legalmente.
          </p>
        </Card>
      </div>
    </ArcadeShell>
  );
}
