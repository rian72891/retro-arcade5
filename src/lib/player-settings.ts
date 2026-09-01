export type ShaderId =
  | "none"
  | "crt-easymode.glslp"
  | "crt-beam.glslp"
  | "crt-aperture.glslp"
  | "crt-mattias.glslp"
  | "crt-yeetron.glslp"
  | "crt-zfast.glslp"
  | "sabr.glslp"
  | "bicubic.glslp"
  | "mix-frames.glslp";

export const SHADERS: { id: ShaderId; label: string }[] = [
  { id: "none", label: "Pixel nítido (sem filtro)" },
  { id: "crt-easymode.glslp", label: "CRT Easymode" },
  { id: "crt-aperture.glslp", label: "CRT Aperture" },
  { id: "crt-beam.glslp", label: "CRT Beam (scanline)" },
  { id: "crt-mattias.glslp", label: "CRT Mattias" },
  { id: "crt-zfast.glslp", label: "CRT rápido (mobile)" },
  { id: "crt-yeetron.glslp", label: "CRT Yeetron" },
  { id: "sabr.glslp", label: "SABR (suavização)" },
  { id: "bicubic.glslp", label: "Bicúbico (suave)" },
  { id: "mix-frames.glslp", label: "Mix frames (motion blur)" },
];

export const SCALES = [1, 2, 3, 4] as const;

/** Modo de multi-thread do emulador. */
export type ThreadMode = "auto" | "on" | "off";

export const THREAD_MODES: { id: ThreadMode; label: string; hint: string }[] = [
  { id: "auto", label: "Automático", hint: "Liga só quando o navegador está isolado (COOP/COEP)" },
  { id: "on", label: "Multi-thread", hint: "Pode ajudar em N64/PS1 em PCs com vários núcleos" },
  { id: "off", label: "Single-thread", hint: "Mais estável e normalmente mais rápido em cores leves" },
];

export type HudPosition = { x: number; y: number };

export type PlayerSettings = {
  showFps: boolean;
  shader: ShaderId;
  scale: number;
  rewind: boolean;
  autoSave: boolean;
  threads: ThreadMode;
  hudScale: number; // 0.8 – 1.4
  hudGap: number; // px
  hudOpacity: number; // 0.3 – 1
  virtualScale: number; // 0.7 – 1.5
  virtualOpacity: number; // 0.2 – 1
  /** Deslocamentos livres (arraste) de cada elemento do HUD, por id. */
  hudPositions: Record<string, HudPosition>;
};

/**
 * Padrões focados em performance: rewind desligado (snapshot por frame é caro),
 * shader "none", resolução nativa e threads em automático.
 */
export const DEFAULT_SETTINGS: PlayerSettings = {
  showFps: false,
  shader: "none",
  scale: 1,
  rewind: false,
  autoSave: true,
  threads: "auto",
  hudScale: 1,
  hudGap: 8,
  hudOpacity: 1,
  virtualScale: 1,
  virtualOpacity: 0.8,
  hudPositions: {},
};

/** Preset "Modo Performance". */
export const PERFORMANCE_PRESET: Pick<
  PlayerSettings,
  "rewind" | "shader" | "scale" | "threads" | "showFps"
> = {
  rewind: false,
  shader: "none",
  scale: 1,
  threads: "off",
  showFps: true,
};

export function isPerformanceMode(settings: PlayerSettings) {
  return (
    !settings.rewind &&
    settings.shader === "none" &&
    settings.scale === 1 &&
    settings.threads === "off"
  );
}

const KEY = "fliperama-player-settings";

export function loadSettings(): PlayerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PlayerSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      hudPositions: parsed.hudPositions ?? {},
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PlayerSettings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/** Resolve se o emulador deve usar threads, dado o modo e o isolamento do navegador. */
export function shouldUseThreads(mode: ThreadMode, isolated: boolean) {
  if (mode === "off") return false;
  if (mode === "on") return isolated;
  return isolated;
}

export const AUTO_SLOT = 0;
