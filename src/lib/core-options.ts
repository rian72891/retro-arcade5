import type { PlayerSettings } from "./player-settings";

/**
 * Resolve qual core do EmulatorJS usar. Para N64/PS1 o usuário pode escolher a
 * variante (mais precisa vs. mais leve); os outros sistemas usam o core padrão.
 */
export function resolveCore(baseCore: string, settings: PlayerSettings) {
  if (baseCore === "n64") return settings.n64Core;
  if (baseCore === "psx") return settings.psxCore;
  return baseCore;
}

/**
 * Chaves reais de core option do libretro para resolução interna, multitap e
 * ajustes de performance. Valores inválidos são simplesmente ignorados pelo core.
 */
export function coreOptions(core: string, settings: PlayerSettings): Record<string, string> {
  const scale = Math.max(1, Math.min(4, settings.scale));
  const players = Math.max(1, settings.players);
  const opts: Record<string, string> = {};

  switch (core) {
    case "mupen64plus_next": {
      opts["mupen64plus-43screensize"] = `${320 * scale}x${240 * scale}`;
      opts["mupen64plus-169screensize"] = `${640 * scale}x${360 * scale}`;
      opts["mupen64plus-rdp-plugin"] = "gliden64";
      opts["mupen64plus-EnableFBEmulation"] = scale > 1 ? "True" : "False";
      opts["mupen64plus-EnableLODEmulation"] = "False";
      opts["mupen64plus-EnableCopyColorToRDRAM"] = "Off";
      opts["mupen64plus-EnableCopyDepthToRDRAM"] = "Off";
      opts["mupen64plus-txFilterMode"] = "None";
      break;
    }
    case "parallel_n64": {
      opts["parallel-n64-screensize"] = `${640 * scale}x${480 * scale}`;
      opts["parallel-n64-gfxplugin"] = "auto";
      opts["parallel-n64-gfxplugin-accuracy"] = scale > 1 ? "medium" : "low";
      opts["parallel-n64-framerate"] = "fullspeed";
      opts["parallel-n64-audio-buffer-size"] = "2048";
      break;
    }
    case "mednafen_psx_hw": {
      opts["beetle_psx_hw_internal_resolution"] = scale === 1 ? "1x(native)" : `${scale}x`;
      opts["beetle_psx_hw_renderer"] = "hardware_gl";
      opts["beetle_psx_hw_depth"] = "16bpp(native)";
      opts["beetle_psx_hw_frame_duping"] = "enabled";
      opts["beetle_psx_hw_cpu_freq_scale"] = "100%(native)";
      if (players > 2) opts["beetle_psx_hw_enable_multitap_port1"] = "enabled";
      if (players > 4) opts["beetle_psx_hw_enable_multitap_port2"] = "enabled";
      break;
    }
    case "pcsx_rearmed": {
      opts["pcsx_rearmed_neon_interlace_enable"] = "disabled";
      opts["pcsx_rearmed_neon_enhancement_enable"] = scale > 1 ? "enabled" : "disabled";
      opts["pcsx_rearmed_neon_enhancement_no_main"] = scale > 1 ? "enabled" : "disabled";
      opts["pcsx_rearmed_frameskip"] = "0";
      opts["pcsx_rearmed_dithering"] = "disabled";
      if (players > 2) opts["pcsx_rearmed_multitap1"] = "enabled";
      if (players > 4) opts["pcsx_rearmed_multitap2"] = "enabled";
      break;
    }
    default:
      break;
  }
  return opts;
}

/** Retorna true quando o navegador tem WebGL2 (necessário para os cores 3D). */
export function hasWebGL2() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}
