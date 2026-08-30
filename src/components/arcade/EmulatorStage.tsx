import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Gauge,
  Maximize,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload as UploadIcon,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { getRomUrl, systemById, type Game } from "@/lib/arcade";
import {
  SAVE_SLOTS,
  clearSlot,
  getState,
  listSlots,
  loadCheats,
  putState,
  saveCheats,
  type Cheat,
  type SlotInfo,
} from "@/lib/save-states";

type GameManager = {
  getState?: () => Uint8Array | Promise<Uint8Array>;
  loadState?: (state: Uint8Array) => void;
  screenshot?: () => Uint8Array | Promise<Uint8Array>;
  restart?: () => void;
  setVolume?: (value: number) => void;
  toggleFastForward?: (value: number) => void;
  setFastForwardRatio?: (value: number) => void;
  toggleSlowMotion?: (value: number) => void;
  setSlowMotionRatio?: (value: number) => void;
  setCheat?: (index: number, enabled: boolean, code: string) => void;
  resetCheat?: () => void;
};

declare global {
  interface Window {
    EJS_player?: string;
    EJS_core?: string;
    EJS_gameUrl?: string;
    EJS_gameName?: string;
    EJS_gameID?: number | string;
    EJS_pathtodata?: string;
    EJS_startOnLoaded?: boolean;
    EJS_threads?: boolean;
    EJS_volume?: number;
    EJS_Buttons?: Record<string, boolean>;
    EJS_cheats?: string[][];
    EJS_defaultOptions?: Record<string, string>;
    EJS_VirtualGamepadSettings?: unknown;
    EJS_emulator?: {
      restart?: () => void;
      toggleFullscreen?: (state: boolean) => void;
      gameManager?: GameManager;
      elements?: { parent?: HTMLElement };
    };
  }
}

const EJS_DATA_PATH = "https://cdn.emulatorjs.org/stable/data/";


const SPEEDS = [
  { label: "0.5x", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "2x", value: 2 },
  { label: "3x", value: 3 },
];

export function EmulatorStage({ game }: { game: Game }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Carregando cartucho…");
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slot, setSlot] = useState<number>(1);
  const [volume, setVolume] = useState(0.8);
  const [speed, setSpeed] = useState(1);
  const [cheats, setCheats] = useState<Cheat[]>([]);
  const [showCheats, setShowCheats] = useState(false);
  const [cheatDesc, setCheatDesc] = useState("");
  const [cheatCode, setCheatCode] = useState("");
  const [isolated, setIsolated] = useState(false);

  useEffect(() => {
    setIsolated(typeof window !== "undefined" && window.crossOriginIsolated === true);
  }, []);


  const system = systemById(game.system);

  useEffect(() => {
    void listSlots(game.id).then(setSlots);
    setCheats(loadCheats(game.id));
  }, [game.id]);

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
        window.EJS_gameID = game.id;
        window.EJS_pathtodata = EJS_DATA_PATH;
        window.EJS_startOnLoaded = true;
        window.EJS_threads = window.crossOriginIsolated === true;
        window.EJS_volume = 0.8;

        window.EJS_cheats = loadCheats(game.id).map((c) => [c.desc, c.code]);
        window.EJS_Buttons = {
          playPause: true,
          restart: true,
          mute: true,
          settings: true,
          fullscreen: true,
          saveState: true,
          loadState: true,
          screenRecord: false,
          gamepad: true,
          cheat: true,
          volume: true,
          saveSavFiles: true,
          loadSavFiles: true,
          quickSave: true,
          quickLoad: true,
          screenshot: true,
          cacheManage: true,
        };
        window.EJS_defaultOptions = { "save-state-slot": "1" };

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
  }, [game.file_path, game.id, game.name, game.system, system?.core]);

  function manager(): GameManager | undefined {
    return window.EJS_emulator?.gameManager;
  }

  function restart() {
    const gm = manager();
    if (gm?.restart) gm.restart();
    else window.EJS_emulator?.restart?.();
  }

  function fullscreen() {
    const target = window.EJS_emulator?.elements?.parent ?? containerRef.current;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void target?.requestFullscreen?.();
  }

  async function saveSlot() {
    try {
      const state = await manager()?.getState?.();
      if (!state) throw new Error("sem estado");
      await putState(game.id, slot, state);
      setSlots(await listSlots(game.id));
      toast.success(`Progresso salvo no slot ${slot}`);
    } catch {
      toast.error("Não foi possível salvar agora — inicie o jogo primeiro.");
    }
  }

  async function loadSlot() {
    try {
      const state = await getState(game.id, slot);
      if (!state) {
        toast.error(`Slot ${slot} está vazio`);
        return;
      }
      manager()?.loadState?.(state);
      toast.success(`Slot ${slot} carregado`);
    } catch {
      toast.error("Não foi possível carregar esse slot");
    }
  }

  async function eraseSlot() {
    await clearSlot(game.id, slot);
    setSlots(await listSlots(game.id));
    toast.success(`Slot ${slot} apagado`);
  }

  async function screenshot() {
    try {
      const png = await manager()?.screenshot?.();
      const canvas = containerRef.current?.querySelector("canvas");
      let blob: Blob | null = null;
      if (png) blob = new Blob([new Uint8Array(png)], { type: "image/png" });
      else if (canvas)
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("sem imagem");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${game.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Screenshot salva");
    } catch {
      toast.error("Não foi possível capturar a tela");
    }
  }

  function changeVolume(value: number) {
    setVolume(value);
    manager()?.setVolume?.(value);
  }

  function changeSpeed(value: number) {
    setSpeed(value);
    const gm = manager();
    if (value < 1) {
      gm?.toggleFastForward?.(0);
      gm?.setSlowMotionRatio?.(1 / value);
      gm?.toggleSlowMotion?.(1);
    } else if (value > 1) {
      gm?.toggleSlowMotion?.(0);
      gm?.setFastForwardRatio?.(value);
      gm?.toggleFastForward?.(1);
    } else {
      gm?.toggleSlowMotion?.(0);
      gm?.toggleFastForward?.(0);
    }
  }

  function persistCheats(next: Cheat[]) {
    setCheats(next);
    saveCheats(game.id, next);
    const gm = manager();
    gm?.resetCheat?.();
    next.forEach((cheat, index) => gm?.setCheat?.(index, cheat.enabled, cheat.code));
  }

  function addCheat() {
    if (!cheatDesc.trim() || !cheatCode.trim()) {
      toast.error("Informe nome e código do cheat");
      return;
    }
    persistCheats([...cheats, { desc: cheatDesc.trim(), code: cheatCode.trim(), enabled: true }]);
    setCheatDesc("");
    setCheatCode("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/80 px-4 py-3 shadow-cabinet">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{game.name}</p>
          <p className="font-pixel text-[9px] uppercase text-muted-foreground">
            {system?.label ?? game.system}
            <span className={isolated ? "ml-2 text-neon" : "ml-2 text-muted-foreground"}>
              {isolated ? "• multi-thread" : "• single-thread"}
            </span>
          </p>

        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HudButton onClick={restart} label="Reiniciar">
            <RotateCcw className="size-4" />
          </HudButton>
          <HudButton onClick={() => void screenshot()} label="Screenshot">
            <Camera className="size-4" />
          </HudButton>
          <HudButton onClick={() => setShowCheats((v) => !v)} label="Cheats">
            <Sparkles className="size-4" />
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

      <div className="grid gap-4 rounded-lg border border-border bg-card/70 p-4 shadow-cabinet sm:grid-cols-3">
        <div className="space-y-2">
          <p className="font-pixel text-[9px] uppercase text-neon">Save states</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Slot de save"
              value={slot}
              onChange={(e) => setSlot(Number(e.target.value))}
              className="rounded-md border border-border bg-input px-2 py-2 text-xs outline-none focus:border-accent"
            >
              {SAVE_SLOTS.map((s) => (
                <option key={s} value={s}>
                  Slot {s}
                  {slots.some((i) => i.slot === s) ? " •" : ""}
                </option>
              ))}
            </select>
            <HudButton onClick={() => void saveSlot()} label="Salvar">
              <Save className="size-4" />
            </HudButton>
            <HudButton onClick={() => void loadSlot()} label="Carregar">
              <UploadIcon className="size-4" />
            </HudButton>
            <HudButton onClick={() => void eraseSlot()} label="Apagar">
              <Trash2 className="size-4" />
            </HudButton>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-pixel text-[9px] uppercase text-neon">
            <Gauge className="mr-1 inline size-3" /> Velocidade
          </p>
          <div className="flex flex-wrap gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => changeSpeed(s.value)}
                className={`rounded-md border px-3 py-2 text-xs transition-colors ${
                  speed === s.value
                    ? "border-primary bg-primary/20 text-neon-pink"
                    : "border-border bg-background/70 text-muted-foreground hover:text-neon"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-pixel block text-[9px] uppercase text-neon" htmlFor="volume">
            <Volume2 className="mr-1 inline size-3" /> Volume
          </label>
          <input
            id="volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {showCheats ? (
        <div className="space-y-4 rounded-lg border border-border bg-card/70 p-4 shadow-cabinet">
          <p className="font-pixel text-[9px] uppercase text-neon">Cheats</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={cheatDesc}
              onChange={(e) => setCheatDesc(e.target.value)}
              placeholder="Nome (ex: vidas infinitas)"
              className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              value={cheatCode}
              onChange={(e) => setCheatCode(e.target.value)}
              placeholder="Código"
              className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm font-mono outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addCheat}
              className="font-pixel rounded-md border border-primary bg-primary/20 px-4 py-2 text-[10px] uppercase text-neon-pink"
            >
              Adicionar
            </button>
          </div>

          {cheats.length ? (
            <ul className="space-y-2">
              {cheats.map((cheat, index) => (
                <li
                  key={`${cheat.desc}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2"
                >
                  <label className="flex min-w-0 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={cheat.enabled}
                      onChange={() =>
                        persistCheats(
                          cheats.map((c, i) => (i === index ? { ...c, enabled: !c.enabled } : c)),
                        )
                      }
                      className="accent-primary"
                    />
                    <span className="truncate">{cheat.desc}</span>
                  </label>
                  <button
                    type="button"
                    aria-label={`Remover cheat ${cheat.desc}`}
                    onClick={() => persistCheats(cheats.filter((_, i) => i !== index))}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum cheat salvo. Códigos ficam guardados neste navegador e são aplicados ao iniciar.
            </p>
          )}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Teclado (setas + Z / X / Enter / Shift), controle USB/Bluetooth conectado ao PC ou celular, e
        controle virtual na tela — o layout muda conforme o console ({system?.short ?? game.system}).
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
