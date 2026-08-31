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

export type PlayerSettings = {
  showFps: boolean;
  shader: ShaderId;
  scale: number;
  rewind: boolean;
  autoSave: boolean;
  hudScale: number; // 0.8 – 1.4
  hudGap: number; // px
  hudOpacity: number; // 0.3 – 1
  virtualScale: number; // 0.7 – 1.5
  virtualOpacity: number; // 0.2 – 1
};

export const DEFAULT_SETTINGS: PlayerSettings = {
  showFps: false,
  shader: "none",
  scale: 1,
  rewind: true,
  autoSave: true,
  hudScale: 1,
  hudGap: 8,
  hudOpacity: 1,
  virtualScale: 1,
  virtualOpacity: 0.8,
};

const KEY = "fliperama-player-settings";

export function loadSettings(): PlayerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PlayerSettings>) } : DEFAULT_SETTINGS;
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

export const AUTO_SLOT = 0;
