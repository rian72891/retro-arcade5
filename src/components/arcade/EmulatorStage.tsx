import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Gamepad2,
  Gauge,
  Maximize,
  Move,
  Rewind,
  RotateCcw,
  Rocket,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
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
import {
  AUTO_SLOT,
  PERFORMANCE_PRESET,
  SCALES,
  SHADERS,
  THREAD_MODES,
  isPerformanceMode,
  loadSettings,
  saveSettings,
  shouldUseThreads,
  type HudPosition,
  type PlayerSettings,
  type ThreadMode,
} from "@/lib/player-settings";


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
  toggleRewind?: (value: number) => void;
  setRewindGranularity?: (value: number) => void;
  setCheat?: (index: number, enabled: boolean, code: string) => void;
  resetCheat?: () => void;
  getFrameNum?: () => number;
  functions?: Record<string, unknown>;
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
    EJS_rewindEnabled?: boolean;
    EJS_Buttons?: Record<string, boolean>;
    EJS_cheats?: string[][];
    EJS_defaultOptions?: Record<string, string>;
    EJS_VirtualGamepadSettings?: unknown;
    EJS_emulator?: {
      restart?: () => void;
      toggleFullscreen?: (state: boolean) => void;
      gameManager?: GameManager;
      elements?: { parent?: HTMLElement };
      controlMenu?: HTMLElement;
      settingsMenu?: HTMLElement;
      changeSettingOption?: (key: string, value: string) => void;
      getFPS?: () => number;
      fps?: number;
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

/** Per-core internal-resolution / upscaling options exposed by EmulatorJS cores. */
function scaleOptions(core: string, scale: number): Record<string, string> {
  if (scale <= 1) return {};
  switch (core) {
    case "psx":
      return {
        beetle_psx_hw_internal_resolution: `${scale}x`,
        beetle_psx_internal_resolution: `${scale}x`,
        pcsx_rearmed_neon_enhancement_no_main: "enabled",
      };
    case "n64":
      return {
        "mupen64plus-43screensize": `${320 * scale}x${240 * scale}`,
        "mupen64plus-Framebuffer": "enabled",
        "parallel-n64-screensize": `${640 * scale}x${480 * scale}`,
      };
    default:
      return {};
  }
}

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
  const [showHudPanel, setShowHudPanel] = useState(false);
  const [cheatDesc, setCheatDesc] = useState("");
  const [cheatCode, setCheatCode] = useState("");
  const [isolated, setIsolated] = useState(false);
  const [threadsActive, setThreadsActive] = useState(false);
  const [hudEdit, setHudEdit] = useState(false);
  const [fps, setFps] = useState(0);
  const [settings, setSettings] = useState<PlayerSettings>(() => loadSettings());
  const settingsRef = useRef(settings);
  const autoLoaded = useRef(false);


  useEffect(() => {
    setSettings(loadSettings());
    setIsolated(typeof window !== "undefined" && window.crossOriginIsolated === true);
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
  }, [settings]);

  const system = systemById(game.system);
  const core = system?.core ?? game.system;

  const update = useCallback(
    <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) =>
      setSettings((prev) => ({ ...prev, [key]: value })),
    [],
  );

  useEffect(() => {
    void listSlots(game.id).then(setSlots);
    setCheats(loadCheats(game.id));
  }, [game.id]);

  useEffect(() => {
    let cancelled = false;
    let script: HTMLScriptElement | null = null;
    const initial = settingsRef.current;

    async function boot() {
      try {
        const romUrl = await getRomUrl(game.file_path);
        if (cancelled) return;

        window.EJS_player = "#emulator-stage";
        window.EJS_core = core;
        window.EJS_gameUrl = romUrl;
        window.EJS_gameName = game.name;
        window.EJS_gameID = game.id;
        window.EJS_pathtodata = EJS_DATA_PATH;
        window.EJS_startOnLoaded = true;
        const iso = window.crossOriginIsolated === true;
        const useThreads = shouldUseThreads(initial.threads, iso, core);
        window.EJS_threads = useThreads;
        setThreadsActive(useThreads);
        window.EJS_volume = 0.8;
        window.EJS_rewindEnabled = initial.rewind;


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
          rewind: initial.rewind,
        };
        window.EJS_defaultOptions = {
          "save-state-slot": "1",
          shader: initial.shader,
          rewindEnabled: initial.rewind ? "enabled" : "disabled",
          ...scaleOptions(core, initial.scale),
        };

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
  }, [game.file_path, game.id, game.name, core]);

  const manager = useCallback((): GameManager | undefined => window.EJS_emulator?.gameManager, []);

  /** Auto-save: gravar estado no slot automático ao sair. */
  const autoSave = useCallback(async () => {
    if (!settingsRef.current.autoSave) return;
    try {
      const state = await manager()?.getState?.();
      if (state) await putState(game.id, AUTO_SLOT, state);
    } catch {
      /* jogo pode não ter iniciado */
    }
  }, [game.id, manager]);

  useEffect(() => {
    const handler = () => void autoSave();
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      void autoSave();
    };
  }, [autoSave]);

  /** Continuar de onde parou: aplica o estado automático quando o core estiver vivo. */
  useEffect(() => {
    if (status !== "ready" || !settings.autoSave || autoLoaded.current) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      const gm = manager();
      if (!gm?.loadState) return;
      window.clearInterval(timer);
      if (cancelled) return;
      autoLoaded.current = true;
      void getState(game.id, AUTO_SLOT).then((state) => {
        if (!state || cancelled) return;
        try {
          gm.loadState?.(state);
          toast.success("Continuando de onde você parou");
        } catch {
          /* ignore */
        }
      });
    }, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status, settings.autoSave, game.id, manager]);

  /** Contador de FPS: usa o frame count do core quando disponível. */
  useEffect(() => {
    if (!settings.showFps) {
      setFps(0);
      return;
    }
    let lastFrame: number | null = null;
    let lastTime = performance.now();
    let rafFrames = 0;
    let raf = 0;
    const tick = () => {
      rafFrames += 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const interval = window.setInterval(() => {
      const now = performance.now();
      const seconds = (now - lastTime) / 1000;
      const emu = window.EJS_emulator;
      const frame = emu?.getFPS?.() ?? emu?.gameManager?.getFrameNum?.();
      if (typeof frame === "number" && frame > 1000) {
        // frame counter cumulativo
        const value = lastFrame === null ? 0 : (frame - lastFrame) / seconds;
        lastFrame = frame;
        setFps(Math.round(value));
      } else if (typeof frame === "number" && frame > 0) {
        setFps(Math.round(frame));
      } else {
        setFps(Math.round(rafFrames / seconds));
      }
      rafFrames = 0;
      lastTime = now;
    }, 500);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
    };
  }, [settings.showFps]);

  /** Aplica shader/upscaling ao vivo quando possível. */
  useEffect(() => {
    if (status !== "ready") return;
    const emu = window.EJS_emulator;
    try {
      emu?.changeSettingOption?.("shader", settings.shader);
      Object.entries(scaleOptions(core, settings.scale)).forEach(([k, v]) =>
        emu?.changeSettingOption?.(k, v),
      );
    } catch {
      /* algumas opções só valem no próximo boot */
    }
  }, [settings.shader, settings.scale, status, core]);

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

  function rewind() {
    const gm = manager();
    if (!settings.rewind) {
      toast.error("Ative o rewind nas configurações e recarregue o jogo");
      return;
    }
    if (!gm?.toggleRewind) {
      toast.error("Rewind não disponível neste core");
      return;
    }
    gm.toggleRewind(1);
    window.setTimeout(() => gm.toggleRewind?.(0), 3000);
    toast.success("Voltando o tempo…");
  }

  function openControlMapping() {
    const emu = window.EJS_emulator;
    const menu = emu?.controlMenu;
    if (menu) {
      menu.style.display = "";
      menu.classList.remove("ejs_hidden");
      return;
    }
    const parent = emu?.elements?.parent ?? containerRef.current;
    const button = parent?.querySelector<HTMLElement>(
      '[title*="Control" i], [aria-label*="Control" i], .ejs_control_menu_button',
    );
    if (button) button.click();
    else toast.error("Abra o menu do emulador (ícone de controle) para remapear os botões");
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

  const hudStyle = {
    gap: `${settings.hudGap}px`,
    opacity: settings.hudOpacity,
    fontSize: `${settings.hudScale}rem`,
  } as React.CSSProperties;

  const moveHud = useCallback((id: string, pos: HudPosition) => {
    setSettings((prev) => ({ ...prev, hudPositions: { ...prev.hudPositions, [id]: pos } }));
  }, []);

  function resetHudLayout() {
    setSettings((prev) => ({ ...prev, hudPositions: {} }));
    toast.success("Layout do HUD restaurado");
  }

  function performanceMode() {
    setSettings((prev) => ({ ...prev, ...PERFORMANCE_PRESET }));
    toast.success("Modo Performance ativado — recarregue o jogo para aplicar tudo");
  }

  const drag = (id: string) => ({
    dragId: id,
    editing: hudEdit,
    pos: settings.hudPositions[id],
    onMove: moveHud,
  });

  const gamepadPos = settings.hudPositions["virtual-gamepad"];

  return (
    <div className="space-y-4" style={{ fontSize: `${settings.hudScale * 100}%` }}>
      <style>{`
        #emulator-stage .ejs_virtualGamepad_parent {
          opacity: ${settings.virtualOpacity};
          transform: translate(${gamepadPos?.x ?? 0}px, ${gamepadPos?.y ?? 0}px) scale(${settings.virtualScale});
          transform-origin: bottom center;
        }
      `}</style>

      <div
        className="flex flex-wrap items-center justify-between rounded-lg border border-border bg-card/80 px-4 py-3 shadow-cabinet"
        style={hudStyle}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{game.name}</p>
          <p className="font-pixel text-[9px] uppercase text-muted-foreground">
            {system?.label ?? game.system}
            <span className={threadsActive ? "ml-2 text-neon" : "ml-2 text-muted-foreground"}>
              {threadsActive ? "• multi-thread" : "• single-thread"}
            </span>
            {!isolated ? <span className="ml-2 text-muted-foreground">• sem isolamento</span> : null}
            {settings.showFps ? <span className="ml-2 text-neon-pink">• {fps} FPS</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center" style={{ gap: `${settings.hudGap}px` }}>
          <HudButton onClick={restart} label="Reiniciar" {...drag("restart")}>
            <RotateCcw className="size-4" />
          </HudButton>
          <HudButton onClick={rewind} label="Rewind" {...drag("rewind")}>
            <Rewind className="size-4" />
          </HudButton>
          <HudButton onClick={() => void screenshot()} label="Screenshot" {...drag("screenshot")}>
            <Camera className="size-4" />
          </HudButton>
          <HudButton onClick={openControlMapping} label="Controles" {...drag("controls")}>
            <Gamepad2 className="size-4" />
          </HudButton>
          <HudButton onClick={() => setShowCheats((v) => !v)} label="Cheats" {...drag("cheats")}>
            <Sparkles className="size-4" />
          </HudButton>
          <HudButton
            onClick={() => setShowHudPanel((v) => !v)}
            label="Ajustes"
            {...drag("settings")}
          >
            <Settings2 className="size-4" />
          </HudButton>
          <HudButton onClick={fullscreen} label="Tela cheia" {...drag("fullscreen")}>
            <Maximize className="size-4" />
          </HudButton>
          <HudButton
            onClick={() => setHudEdit((v) => !v)}
            label={hudEdit ? "Concluir HUD" : "Editar HUD"}
            active={hudEdit}
          >
            <Move className="size-4" />
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

      {hudEdit ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-accent bg-accent/5 px-4 py-3">
          <p className="flex-1 text-xs text-muted-foreground">
            Modo <strong>editar HUD</strong>: arraste cada botão (e o controle virtual) para onde
            quiser. As posições ficam salvas neste navegador.
          </p>
          <button
            type="button"
            onClick={resetHudLayout}
            className="font-pixel inline-flex items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-2 text-[10px] uppercase text-muted-foreground transition-colors hover:text-neon"
          >
            <Undo2 className="size-4" /> Restaurar padrão
          </button>
          <DragHandle
            label="Controle virtual"
            pos={gamepadPos}
            onMove={(p) => moveHud("virtual-gamepad", p)}
          />
        </div>
      ) : null}


      <div className="relative overflow-hidden rounded-lg border border-border bg-black shadow-neon">
        <div id="emulator-stage" ref={containerRef} className="aspect-video w-full" />
        {settings.showFps && status === "ready" ? (
          <div
            className="font-pixel pointer-events-none absolute left-3 top-3 rounded bg-background/70 px-2 py-1 text-[10px] text-neon"
            style={{ opacity: settings.hudOpacity }}
          >
            {fps} FPS
          </div>
        ) : null}
        {status !== "ready" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="font-pixel text-[10px] uppercase text-neon">{message}</p>
          </div>
        ) : null}
      </div>

      {showHudPanel ? (
        <div className="grid gap-6 rounded-lg border border-border bg-card/70 p-4 shadow-cabinet md:grid-cols-2">
          <div className="space-y-4">
            <p className="font-pixel text-[9px] uppercase text-neon">Vídeo & emulação</p>

            <Toggle
              label="Contador de FPS"
              checked={settings.showFps}
              onChange={(v) => update("showFps", v)}
            />
            <Toggle
              label="Rewind (voltar o tempo)"
              hint="Aplica no próximo carregamento do jogo"
              checked={settings.rewind}
              onChange={(v) => update("rewind", v)}
            />
            <Toggle
              label="Auto-save ao sair / continuar depois"
              checked={settings.autoSave}
              onChange={(v) => update("autoSave", v)}
            />

            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">Filtro / shader</span>
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
              <span className="text-muted-foreground">
                Resolução interna / upscaling ({system?.short ?? core})
              </span>
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
          </div>

          <div className="space-y-4">
            <p className="font-pixel text-[9px] uppercase text-neon">HUD & controles na tela</p>
            <Slider
              label={`Tamanho do HUD (${settings.hudScale.toFixed(2)}x)`}
              min={0.8}
              max={1.4}
              step={0.05}
              value={settings.hudScale}
              onChange={(v) => update("hudScale", v)}
            />
            <Slider
              label={`Espaçamento (${settings.hudGap}px)`}
              min={2}
              max={24}
              step={1}
              value={settings.hudGap}
              onChange={(v) => update("hudGap", v)}
            />
            <Slider
              label={`Transparência do HUD (${Math.round(settings.hudOpacity * 100)}%)`}
              min={0.3}
              max={1}
              step={0.05}
              value={settings.hudOpacity}
              onChange={(v) => update("hudOpacity", v)}
            />
            <Slider
              label={`Tamanho do controle virtual (${settings.virtualScale.toFixed(2)}x)`}
              min={0.7}
              max={1.5}
              step={0.05}
              value={settings.virtualScale}
              onChange={(v) => update("virtualScale", v)}
            />
            <Slider
              label={`Transparência do controle virtual (${Math.round(settings.virtualOpacity * 100)}%)`}
              min={0.2}
              max={1}
              step={0.05}
              value={settings.virtualOpacity}
              onChange={(v) => update("virtualOpacity", v)}
            />
          </div>
        </div>
      ) : null}

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
        Use o botão <strong>Controles</strong> para remapear teclas e botões do gamepad.
      </p>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-primary"
      />
      <span>
        <span className="block">{label}</span>
        {hint ? <span className="block text-[10px] text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

/** Hook de arraste livre: devolve handlers de pointer e o deslocamento atual. */
function useDrag(pos: HudPosition | undefined, onMove: (pos: HudPosition) => void) {
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x: pos?.x ?? 0, y: pos?.y ?? 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    onMove({ x: s.x + (e.clientX - s.px), y: s.y + (e.clientY - s.py) });
  };
  const onPointerUp = () => {
    start.current = null;
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}

/** Alça de arraste usada para elementos que não são botões do HUD (ex: gamepad virtual). */
function DragHandle({
  label,
  pos,
  onMove,
}: {
  label: string;
  pos?: HudPosition | undefined;
  onMove: (pos: HudPosition) => void;
}) {
  const handlers = useDrag(pos, onMove);
  return (
    <span
      {...handlers}
      role="button"
      tabIndex={0}
      aria-label={`Mover ${label}`}
      className="inline-flex cursor-move touch-none select-none items-center gap-2 rounded-md border border-dashed border-accent bg-background/70 px-3 py-2 text-xs text-neon"
    >
      <Move className="size-4" /> {label}
    </span>
  );
}

function HudButton({
  onClick,
  label,
  children,
  active,
  dragId,
  editing,
  pos,
  onMove,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
  dragId?: string;
  editing?: boolean;
  pos?: HudPosition | undefined;
  onMove?: (id: string, pos: HudPosition) => void;
}) {
  const drag = useDrag(pos, (next) => dragId && onMove?.(dragId, next));
  const dragging = Boolean(editing && dragId);
  return (
    <button
      type="button"
      onClick={dragging ? undefined : onClick}
      {...(dragging ? drag : {})}
      aria-label={label}
      title={label}
      style={pos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
        dragging
          ? "cursor-move touch-none select-none border-dashed border-accent bg-accent/10 text-neon"
          : active
            ? "border-primary bg-primary/20 text-neon-pink"
            : "border-border bg-background/70 text-muted-foreground hover:text-neon"
      }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

